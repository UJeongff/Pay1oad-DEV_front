'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import { SimpleYjsProvider } from '@/app/lib/SimpleYjsProvider'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { useAuthContext } from '@/app/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'
const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? 'wss://api.pay1oad.xyz')

function encodeBodyJson(html: string): string {
  const jsonStr = JSON.stringify({ body: html })
  const bytes = new TextEncoder().encode(jsonStr)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

interface DocCollabEditorProps {
  contentId: string
  docId: string
  initialTitle: string
  initialHtml: string
  onBack: () => void
}

export default function DocCollabEditor({
  contentId,
  docId,
  initialTitle,
  initialHtml,
  onBack,
}: DocCollabEditorProps) {
  const { user } = useAuthContext()
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<SimpleYjsProvider | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [connected, setConnected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const contentInitialized = useRef(false)

  // Y.Doc + Awareness 초기화 (한 번만)
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc()
  }
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null)
  if (!awarenessRef.current && ydocRef.current) {
    awarenessRef.current = new awarenessProtocol.Awareness(ydocRef.current)
  }

  const editor = useEditor({
    extensions: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      StarterKit.configure({ history: false } as any), // Yjs가 undo/redo 관리
      Collaboration.configure({ document: ydocRef.current }),
    ],
    editorProps: {
      attributes: {
        style: 'min-height: 280px; outline: none; color: rgba(255,255,255,0.85); font-size: 15px; line-height: 1.75; caret-color: #1C5AFF;',
      },
    },
    immediatelyRender: false,
  })

  // 초기 제목 동기화 (비동기로 로드된 경우 대비)
  useEffect(() => {
    if (initialTitle) setTitle(initialTitle)
  }, [initialTitle])

  // 초기 HTML 콘텐츠 로드 (에디터 준비 후)
  useEffect(() => {
    if (!editor || contentInitialized.current) return
    if (initialHtml) {
      editor.commands.setContent(initialHtml)
    }
    contentInitialized.current = true
  }, [editor, initialHtml])

  // WS 프로바이더 연결
  useEffect(() => {
    if (!ydocRef.current || !awarenessRef.current) return

    const connectWs = async () => {
      try {
        // ws-token 발급 (30초 유효)
        const res = await fetchWithAuth(`${API_URL}/v1/auth/ws-token`)
        const token: string = res.ok ? (await res.json()).data ?? '' : ''
        const wsUrl = `${WS_URL}/ws/docs/${docId}${token ? `?token=${token}` : ''}`
        const provider = new SimpleYjsProvider(wsUrl, ydocRef.current!, awarenessRef.current!)
        provider.onConnect = () => setConnected(true)
        provider.onDisconnect = () => setConnected(false)
        providerRef.current = provider
      } catch {
        console.warn('[DocCollabEditor] WS 연결 실패 - 오프라인 모드')
      }
    }

    connectWs()
    return () => {
      providerRef.current?.destroy()
      providerRef.current = null
    }
  }, [docId])

  // HTTP PATCH로 저장
  const saveDoc = useCallback(async (silent = false) => {
    if (!editor) return
    if (!silent) setSaving(true)
    setError(null)
    try {
      const html = editor.getHTML()
      const bodyJson = encodeBodyJson(html)
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), bodyJson }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? '저장에 실패했습니다.')
      }
      setLastSaved(new Date())
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : '저장 오류')
    } finally {
      if (!silent) setSaving(false)
    }
  }, [editor, contentId, docId, title])

  // 30초 자동 저장
  useEffect(() => {
    const interval = setInterval(() => {
      if (editor && editor.getText().trim()) {
        saveDoc(true)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [editor, saveDoc])

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 0', fontSize: '14px', color: 'rgba(255,255,255,0.7)',
  }
  const labelStyle: React.CSSProperties = {
    width: '72px', flexShrink: 0, color: 'rgba(255,255,255,0.45)', fontSize: '13px',
  }

  return (
    <div>
      {/* 연결 상태 배지 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600,
          background: connected ? 'rgba(116,255,137,0.08)' : 'rgba(255,255,255,0.04)',
          color: connected ? '#74FF89' : 'rgba(255,255,255,0.3)',
          border: `1px solid ${connected ? 'rgba(116,255,137,0.25)' : 'rgba(255,255,255,0.1)'}`,
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: connected ? '#74FF89' : 'rgba(255,255,255,0.3)',
          }} />
          {connected ? '실시간 연결됨' : '오프라인'}
        </span>
        {lastSaved && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
            자동 저장: {lastSaved.getHours().toString().padStart(2, '0')}:{lastSaved.getMinutes().toString().padStart(2, '0')}
          </span>
        )}
      </div>

      {/* 제목 */}
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="제목"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#fff',
          fontSize: '28px',
          fontWeight: 700,
          marginBottom: '28px',
          caretColor: '#1C5AFF',
        }}
      />

      {/* 메타 */}
      <div style={rowStyle}>
        <span style={labelStyle}>편집 모드</span>
        <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>공동 편집</span>
      </div>

      {/* 구분선 */}
      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.12)', margin: '16px 0' }} />

      {/* Tiptap 에디터 */}
      <div style={{ marginTop: '20px', minHeight: '320px', padding: '20px 0', position: 'relative' }}>
        {/* 툴바 */}
        {editor && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'B', title: '굵게', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
              { label: 'I', title: '기울임', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
              { label: 'S', title: '취소선', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
              { label: 'H1', title: '제목1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
              { label: 'H2', title: '제목2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
              { label: '• 목록', title: '불릿 목록', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
              { label: '1. 목록', title: '번호 목록', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
              { label: '코드', title: '코드블록', action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.action}
                title={btn.title}
                style={{
                  padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 600,
                  border: `1px solid ${btn.active ? 'rgba(28,90,255,0.6)' : 'rgba(255,255,255,0.12)'}`,
                  background: btn.active ? 'rgba(28,90,255,0.25)' : 'rgba(255,255,255,0.04)',
                  color: btn.active ? '#91CDFF' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}

        {/* 에디터 영역 */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px', minHeight: '280px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {error && <p style={{ color: '#FF6060', fontSize: '13px', marginTop: '12px' }}>{error}</p>}

      {/* 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', marginBottom: '48px' }}>
        <button
          onClick={onBack}
          style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
        >
          취소
        </button>
        <button
          onClick={() => saveDoc(false)}
          disabled={saving}
          style={{ padding: '10px 28px', borderRadius: '8px', border: '0.734px solid rgba(0,65,239,0.6)', background: 'rgba(0,65,239,0.4)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  )
}
