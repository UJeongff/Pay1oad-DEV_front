'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension, InputRule } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
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

// Minimal markdown-to-HTML converter for paste support
function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const codeLang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      out.push(`<pre><code${codeLang ? ` class="language-${codeLang}"` : ''}>${codeLines.join('\n')}</code></pre>`)
      i++
      continue
    }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (hMatch) {
      const level = hMatch[1].length
      out.push(`<h${level}>${inlineMarkdown(hMatch[2])}</h${level}>`)
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      out.push('<hr />')
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const bqLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2))
        i++
      }
      out.push(`<blockquote>${inlineMarkdown(bqLines.join(' '))}</blockquote>`)
      continue
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^[-*+]\s/, ''))}</li>`)
        i++
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\d+\.\s/, ''))}</li>`)
        i++
      }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      out.push('<br />')
      i++
      continue
    }

    // Paragraph
    out.push(`<p>${inlineMarkdown(line)}</p>`)
    i++
  }

  return out.join('')
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

// Detects if text looks like markdown (has recognizable block-level syntax)
function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|^\*{1,2}[^*]|^-\s|^>\s|\*\*.+\*\*|\[.+\]\(.+\)|^```/.test(text)
}

// [text](url) → link input rule
const MarkdownLinkRule = Extension.create({
  name: 'markdownLinkRule',
  addInputRules() {
    return [
      new InputRule({
        find: /\[([^\]]+)\]\(([^)\s]+)\)$/,
        handler: ({ state, range, match, chain }) => {
          const text = match[1]
          const href = match[2]
          if (!text || !href) return null
          const linkType = state.schema.marks['link']
          if (!linkType) return null
          chain()
            .deleteRange(range)
            .insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] })
            .run()
          return null
        },
      }),
    ]
  },
})

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
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const contentInitialized = useRef(false)

  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc()
  }
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null)
  if (!awarenessRef.current && ydocRef.current) {
    awarenessRef.current = new awarenessProtocol.Awareness(ydocRef.current)
  }

  const CURSOR_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#A29BFE', '#74FF89', '#FF9F43', '#54A0FF', '#FF6EB4']
  const cursorColor = CURSOR_COLORS[(user?.id ?? 0) % CURSOR_COLORS.length]

  useEffect(() => {
    if (!awarenessRef.current || !user) return
    awarenessRef.current.setLocalStateField('user', {
      name: user.nickname ?? user.name ?? '익명',
      color: cursorColor,
    })
  }, [user, cursorColor])

  const editor = useEditor({
    extensions: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      StarterKit.configure({ history: false } as any),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          style: 'color: #54A0FF; text-decoration: underline; cursor: pointer;',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      MarkdownLinkRule,
      Collaboration.configure({ document: ydocRef.current }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CollaborationCursor.configure({ provider: { awareness: awarenessRef.current } as any }),
    ],
    editorProps: {
      attributes: {
        style: 'min-height: 280px; outline: none; color: rgba(255,255,255,0.85); font-size: 15px; line-height: 1.75; caret-color: #1C5AFF;',
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (!text || !looksLikeMarkdown(text)) return false
        // Convert markdown to HTML and insert
        const html = markdownToHtml(text)
        editor?.chain().focus().insertContent(html).run()
        return true
      },
      handleKeyDown: (_view, event) => {
        // Mod+K → open link input
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault()
          const { from, to } = editor?.state.selection ?? { from: 0, to: 0 }
          if (from !== to) {
            setShowLinkInput(true)
            setLinkUrl(editor?.getAttributes('link').href ?? '')
          }
          return true
        }
        return false
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    if (!editor || contentInitialized.current) return
    if (initialHtml) {
      editor.commands.setContent(initialHtml)
    }
    contentInitialized.current = true
  }, [editor, initialHtml])

  useEffect(() => {
    if (!ydocRef.current || !awarenessRef.current) return

    const connectWs = async () => {
      try {
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
      if (!silent) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      }
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : '저장 오류')
    } finally {
      if (!silent) setSaving(false)
    }
  }, [editor, contentId, docId, title])

  useEffect(() => {
    const interval = setInterval(() => {
      if (editor && editor.getText().trim()) {
        saveDoc(true)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [editor, saveDoc])

  const applyLink = () => {
    if (!editor) return
    const href = linkUrl.trim()
    if (!href) {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: href.startsWith('http') ? href : `https://${href}` }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 0', fontSize: '14px', color: 'rgba(255,255,255,0.7)',
  }
  const labelStyle: React.CSSProperties = {
    width: '72px', flexShrink: 0, color: 'rgba(255,255,255,0.45)', fontSize: '13px',
  }

  const toolbarButtons = editor ? [
    { label: 'B', title: '굵게 (Ctrl+B)', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
    { label: 'I', title: '기울임 (Ctrl+I)', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
    { label: 'S', title: '취소선', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    { label: 'H1', title: '제목1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { label: 'H2', title: '제목2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { label: '• 목록', title: '불릿 목록', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
    { label: '1. 목록', title: '번호 목록', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
    { label: '코드', title: '코드블록', action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock') },
    { label: '링크', title: '링크 삽입 (Ctrl+K) — 텍스트 선택 후 클릭', action: () => { setShowLinkInput(v => !v); setLinkUrl(editor.getAttributes('link').href ?? '') }, active: editor.isActive('link') },
  ] : []

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
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {toolbarButtons.map(btn => (
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

            {/* 마크다운 단축키 힌트 */}
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap' }}>
              ** bold **, * italic *, ## 제목, - 목록, [텍스트](url)
            </span>
          </div>
        )}

        {/* 링크 입력 패널 */}
        {showLinkInput && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
            marginBottom: '12px', padding: '10px 14px',
            background: 'rgba(28,90,255,0.1)', borderRadius: '8px',
            border: '1px solid rgba(28,90,255,0.3)',
          }}>
            <input
              autoFocus
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') applyLink()
                if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') }
              }}
              placeholder="https://..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: '13px',
              }}
            />
            <button onClick={applyLink} style={{ padding: '4px 12px', borderRadius: '5px', background: '#1C5AFF', border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>적용</button>
            {editor?.isActive('link') && (
              <button
                onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false) }}
                style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff9a9a', fontSize: '12px', cursor: 'pointer' }}
              >
                링크 제거
              </button>
            )}
            <button onClick={() => { setShowLinkInput(false); setLinkUrl('') }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* 에디터 영역 */}
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px', minHeight: '280px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {error && <p style={{ color: '#FF6060', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
      {saveSuccess && <p style={{ color: '#74FF89', fontSize: '13px', marginTop: '12px' }}>저장되었습니다.</p>}

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
