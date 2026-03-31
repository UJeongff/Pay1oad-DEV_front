import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'

export class SimpleYjsProvider {
  private ws: WebSocket | null = null
  private destroyed = false
  private updateHandler: (update: Uint8Array, origin: unknown) => void
  private awarenessHandler: (changed: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => void
  public awareness: awarenessProtocol.Awareness
  public connected = false
  public onConnect: (() => void) | null = null
  public onDisconnect: (() => void) | null = null

  constructor(
    private url: string,
    public readonly ydoc: Y.Doc,
    awareness: awarenessProtocol.Awareness,
  ) {
    this.awareness = awareness

    this.updateHandler = (update, origin) => {
      if (origin === this) return
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(update)
      }
    }
    this.ydoc.on('update', this.updateHandler)

    this.awarenessHandler = ({ added, updated, removed }) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return
      const changedClients = [...added, ...updated, ...removed]
      const encoded = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      // base64 텍스트 프레임으로 전송 (Yjs binary와 채널 분리)
      const base64 = btoa(String.fromCharCode(...encoded))
      this.ws.send(base64)
    }
    this.awareness.on('update', this.awarenessHandler)

    this.connect()
  }

  private connect() {
    if (this.destroyed) return
    const ws = new WebSocket(this.url)
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    ws.onopen = () => {
      this.connected = true
      // 현재 전체 Yjs 상태 전송
      const fullState = Y.encodeStateAsUpdate(this.ydoc)
      if (fullState.length > 2) ws.send(fullState)
      // 내 awareness 상태 전송
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.ydoc.clientID])
      const base64 = btoa(String.fromCharCode(...awarenessUpdate))
      ws.send(base64)
      this.onConnect?.()
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          // Awareness 텍스트 프레임 (base64)
          const binary = atob(event.data)
          const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
          awarenessProtocol.applyAwarenessUpdate(this.awareness, bytes, 'remote')
        } else {
          // Yjs binary 업데이트
          const update = new Uint8Array(event.data as ArrayBuffer)
          Y.applyUpdate(this.ydoc, update, this)
        }
      } catch {
        // 포맷 불일치 무시
      }
    }

    ws.onclose = () => {
      this.connected = false
      awarenessProtocol.removeAwarenessStates(this.awareness, [this.ydoc.clientID], 'disconnect')
      this.onDisconnect?.()
    }

    ws.onerror = (e) => {
      console.warn('[YjsWS] 연결 오류', e)
    }
  }

  destroy() {
    this.destroyed = true
    this.ydoc.off('update', this.updateHandler)
    this.awareness.off('update', this.awarenessHandler)
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.ydoc.clientID], 'destroy')
    this.ws?.close()
    this.ws = null
  }
}
