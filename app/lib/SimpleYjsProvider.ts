import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'

export type ProviderStatus = 'connecting' | 'connected' | 'offline'

export interface SimpleYjsProviderOptions {
  /** 접속할 때마다 호출된다. ws 토큰이 30초짜리라 재연결 때마다 새로 받아야 한다. */
  urlFactory: () => Promise<string>
  ydoc: Y.Doc
  awareness: awarenessProtocol.Awareness
  onStatus?: (status: ProviderStatus) => void
  /**
   * 서버가 이 클라이언트에게 초기 시딩을 맡겼을 때 호출된다.
   * 문서 로그가 비어 있을 때 서버가 딱 한 명에게만 준다 — 모두가 시딩하면 본문이 중복된다.
   */
  onSeedRequest?: () => void
  /** 서버 로그 재생이 끝난 시점 (재생된 업데이트 수) */
  onSynced?: (replayed: number) => void
  /** 서버가 이 문서의 실시간 편집을 끝냈을 때 (보고서 제출 등). 재연결하지 않는다. */
  onSessionEnded?: () => void
}

/** 여러 업데이트를 한 프레임으로 합치는 창. 짧게 잡아 체감 지연을 유지하면서 로그 행 수를 줄인다. */
const COALESCE_MS = 100
const HEARTBEAT_MS = 25_000
const MAX_BACKOFF_MS = 15_000
/** 서버가 "이 문서는 더 이상 실시간 편집 대상이 아니다"라고 알리는 종료 코드 */
const CLOSE_SESSION_ENDED = 4001

function toBase64(bytes: Uint8Array): string {
  // String.fromCharCode(...bytes)는 배열이 크면 스택이 터진다 — 청크로 나눠 처리
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * y-websocket 대체 프로바이더.
 *
 * 프레임 규약 (서버 YjsWebSocketHandler와 짝)
 * - 바이너리        : Yjs 업데이트
 * - 텍스트 `{`시작  : 제어 메시지 JSON (init / compact / pong / ping / snapshot)
 * - 텍스트 그 외    : Awareness base64
 */
export class SimpleYjsProvider {
  private ws: WebSocket | null = null
  private destroyed = false
  private synced = false
  private attempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private pending: Uint8Array[] = []

  private readonly updateHandler: (update: Uint8Array, origin: unknown) => void
  private readonly awarenessHandler: (
    changed: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => void

  public readonly ydoc: Y.Doc
  public readonly awareness: awarenessProtocol.Awareness

  constructor(private readonly options: SimpleYjsProviderOptions) {
    this.ydoc = options.ydoc
    this.awareness = options.awareness

    this.updateHandler = (update, origin) => {
      if (origin === this) return // 서버에서 받아 적용한 것 → 되돌려 보내지 않음
      this.enqueue(update)
    }
    this.ydoc.on('update', this.updateHandler)

    this.awarenessHandler = ({ added, updated, removed }, origin) => {
      if (origin === 'remote') return // 남의 커서를 다시 중계하지 않음
      const changedClients = [...added, ...updated, ...removed]
      if (changedClients.length === 0) return
      this.sendAwareness(changedClients)
    }
    this.awareness.on('update', this.awarenessHandler)

    void this.connect()
  }

  // =============================================
  // 연결
  // =============================================

  private async connect() {
    if (this.destroyed) return

    this.options.onStatus?.('connecting')

    let url: string
    try {
      url = await this.options.urlFactory()
    } catch {
      this.scheduleReconnect()
      return
    }
    if (this.destroyed) return

    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    ws.binaryType = 'arraybuffer'
    this.ws = ws
    this.synced = false

    ws.onmessage = (event: MessageEvent) => this.handleMessage(event)

    ws.onclose = (event) => {
      if (this.ws === ws) this.ws = null
      this.stopHeartbeat()
      this.synced = false
      awarenessProtocol.removeAwarenessStates(this.awareness, [this.ydoc.clientID], 'disconnect')

      if (event.code === CLOSE_SESSION_ENDED) {
        // 재연결해봐야 서버가 거절한다
        this.destroyed = true
        this.options.onStatus?.('offline')
        this.options.onSessionEnded?.()
        return
      }

      this.options.onStatus?.('offline')
      this.scheduleReconnect()
    }

    ws.onerror = () => {
      // onclose가 뒤따르므로 여기서는 재연결을 걸지 않는다 (중복 예약 방지)
    }
  }

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimer) return
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempt) + Math.random() * 500
    this.attempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, delay)
  }

  // =============================================
  // 수신
  // =============================================

  private handleMessage(event: MessageEvent) {
    try {
      if (typeof event.data !== 'string') {
        Y.applyUpdate(this.ydoc, new Uint8Array(event.data as ArrayBuffer), this)
        return
      }
      if (event.data.charAt(0) === '{') {
        this.handleControl(event.data)
        return
      }
      awarenessProtocol.applyAwarenessUpdate(this.awareness, fromBase64(event.data), 'remote')
    } catch (e) {
      console.warn('[YjsWS] 메시지 처리 실패', e)
    }
  }

  private handleControl(raw: string) {
    let message: { type?: string; seed?: boolean; replayed?: number; seq?: number; clientId?: number }
    try {
      message = JSON.parse(raw)
    } catch {
      return
    }

    switch (message.type) {
      case 'init':
        this.onInit(message.seed === true, message.replayed ?? 0)
        break
      case 'compact':
        this.sendSnapshot(message.seq ?? 0)
        break
      case 'peerLeft':
        // 끊긴 편집자의 커서를 지운다 (본인은 알릴 기회가 없어서 서버가 대신 알려준다)
        if (message.clientId) {
          awarenessProtocol.removeAwarenessStates(this.awareness, [message.clientId], 'remote')
        }
        break
      default:
        break
    }
  }

  /**
   * 서버가 로그 재생을 끝냈다는 신호. 이 시점에 로컬 상태를 올려보내고 편집을 시작한다.
   * 재생 프레임들이 이 메시지보다 먼저 도착하는 것은 WebSocket의 순서 보장으로 확실하다.
   */
  private onInit(seed: boolean, replayed: number) {
    this.attempt = 0
    this.synced = true
    this.options.onStatus?.('connected')

    // 퇴장 시 서버가 내 커서를 대신 지워줄 수 있도록 clientID를 알려둔다
    this.ws?.send(JSON.stringify({ type: 'hello', clientId: this.ydoc.clientID }))

    if (seed) {
      this.options.onSeedRequest?.()
    }

    // 오프라인 중 편집분이나 재연결 전 상태를 서버에 반영 (Yjs는 멱등이라 중복 적용해도 안전)
    const localState = Y.encodeStateAsUpdate(this.ydoc)
    if (localState.length > 2) {
      this.sendBinary(localState)
    }

    const clients = [...this.awareness.getStates().keys()]
    if (clients.length > 0) this.sendAwareness(clients)

    this.startHeartbeat()
    this.options.onSynced?.(replayed)
  }

  /** 서버 요청으로 전체 상태를 올려 로그를 압축시킨다. seq는 서버가 준 값을 그대로 되돌려준다. */
  private sendSnapshot(seq: number) {
    if (seq <= 0 || this.ws?.readyState !== WebSocket.OPEN) return
    this.flush()
    const snapshot = Y.encodeStateAsUpdate(this.ydoc)
    this.ws.send(JSON.stringify({ type: 'snapshot', seq, payload: toBase64(snapshot) }))
  }

  // =============================================
  // 송신
  // =============================================

  private enqueue(update: Uint8Array) {
    this.pending.push(update)
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flush()
    }, COALESCE_MS)
  }

  private flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.pending.length === 0) return

    // 끊겨 있으면 버린다 — 재연결 시 전체 상태를 다시 올리므로 유실되지 않는다
    if (!this.synced || this.ws?.readyState !== WebSocket.OPEN) {
      this.pending = []
      return
    }

    const merged = this.pending.length === 1 ? this.pending[0] : Y.mergeUpdates(this.pending)
    this.pending = []
    this.sendBinary(merged)
  }

  private sendBinary(payload: Uint8Array) {
    if (this.ws?.readyState !== WebSocket.OPEN) return
    this.ws.send(payload)
  }

  private sendAwareness(clients: number[]) {
    if (!this.synced || this.ws?.readyState !== WebSocket.OPEN) return
    const encoded = awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients)
    this.ws.send(toBase64(encoded))
  }

  // =============================================
  // 유휴 커넥션 유지
  // =============================================

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, HEARTBEAT_MS)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // =============================================

  destroy() {
    this.destroyed = true
    this.flush()
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ydoc.off('update', this.updateHandler)
    this.awareness.off('update', this.awarenessHandler)
    awarenessProtocol.removeAwarenessStates(this.awareness, [this.ydoc.clientID], 'destroy')

    const ws = this.ws
    this.ws = null
    if (ws) {
      ws.onclose = null
      ws.close()
    }
  }
}
