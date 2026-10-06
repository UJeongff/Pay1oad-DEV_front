'use client'

import { useRef, useState } from 'react'

interface BlogEditorToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  onContentChange: () => void
}

const DANGEROUS_SCHEME = /^(javascript|data|vbscript):/i
const SAFE_PREFIX = /^(https?:\/\/|mailto:|tel:|\/|#)/i

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (DANGEROUS_SCHEME.test(trimmed)) return ''
  if (SAFE_PREFIX.test(trimmed)) return trimmed
  // bare domain → assume https
  return `https://${trimmed}`
}

// 도구 버튼: 32px 정사각, 아이콘은 같은 굵기의 선 아이콘. 누르는 동안 본문 선택이 풀리지 않게 mousedown 에서 처리한다
function ToolButton({ label, active = false, onMouseDown, onClick, children }: {
  label: string
  active?: boolean
  onMouseDown?: (e: React.MouseEvent) => void
  onClick?: (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      onMouseDown={onMouseDown}
      onClick={onClick}
      className={`flex h-8 w-7 sm:w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
        active ? 'bg-[#1C5AFF]/25 text-[#9DB8FF]' : 'text-fg-subtle hover:bg-surface-raised hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function BlogEditorToolbar({ editorRef, onContentChange }: BlogEditorToolbarProps) {
  const [showLangInput, setShowLangInput] = useState(false)
  const [codeBlockLang, setCodeBlockLang] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [hadSelection, setHadSelection] = useState(false)
  const savedRangeRef = useRef<Range | null>(null)
  const langInputRef = useRef<HTMLInputElement>(null)
  const linkUrlRef = useRef<HTMLInputElement>(null)

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg ?? undefined)
    editorRef.current?.focus()
    onContentChange()
  }

  const insertCodeBlock = () => {
    setShowLangInput(false)
    if (!editorRef.current) return
    const lang = codeBlockLang.trim()
    setCodeBlockLang('')

    if (savedRangeRef.current) {
      const sel = window.getSelection()
      if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current) }
    }

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const selectedText = range.toString()

    const pre = document.createElement('pre')
    if (lang) pre.setAttribute('data-lang', lang)
    const code = document.createElement('code')
    if (lang) code.className = `language-${lang}`
    code.textContent = selectedText || '// 여기에 코드를 입력하세요'
    pre.appendChild(code)

    range.deleteContents()
    range.insertNode(pre)

    // Insert empty paragraph after the code block
    const p = document.createElement('p')
    p.innerHTML = '<br>'
    pre.after(p)

    const newRange = document.createRange()
    newRange.setStart(code, 0)
    newRange.setEnd(code, code.childNodes.length)
    sel.removeAllRanges()
    sel.addRange(newRange)

    editorRef.current.focus()
    onContentChange()
  }

  const handleCodeBlockClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
    }
    setShowLangInput(v => !v)
    if (!showLangInput) setTimeout(() => langInputRef.current?.focus(), 50)
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      savedRangeRef.current = range.cloneRange()
      const selected = sel.toString()
      setHadSelection(selected.length > 0)
      setLinkText(selected)
    } else {
      savedRangeRef.current = null
      setHadSelection(false)
      setLinkText('')
    }
    setShowLinkInput(v => !v)
    if (!showLinkInput) setTimeout(() => linkUrlRef.current?.focus(), 50)
  }

  const insertLink = () => {
    const url = normalizeUrl(linkUrl)
    setShowLinkInput(false)
    setLinkUrl('')
    const displayText = linkText
    setLinkText('')
    if (!url || !editorRef.current) return

    if (savedRangeRef.current) {
      const sel = window.getSelection()
      if (sel) { sel.removeAllRanges(); sel.addRange(savedRangeRef.current) }
    }
    editorRef.current.focus()

    const sel = window.getSelection()
    const a = document.createElement('a')
    a.href = url
    a.textContent = (displayText.trim() || url)
    if (/^https?:\/\//i.test(url)) {
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
    }

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(a)
      const after = document.createRange()
      after.setStartAfter(a)
      after.collapse(true)
      sel.removeAllRanges()
      sel.addRange(after)
    } else {
      editorRef.current.appendChild(a)
    }

    onContentChange()
  }

  const run = (command: string, arg?: string) => (e: React.MouseEvent) => { e.preventDefault(); exec(command, arg) }

  const icon = (d: React.ReactNode) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  )

  const sep = <div aria-hidden="true" className="mx-0.5 sm:mx-1 h-4 w-px shrink-0 bg-line" />

  return (
    <div className="mb-2">
      {/* 휴대폰 폭(390px)에서도 한 줄에 다 들어가게 버튼 폭을 줄이고, 더 좁으면 줄바꿈 대신 가로로 밀어서 본다 */}
      <div
        role="toolbar"
        aria-label="본문 서식"
        className="flex items-center gap-0 sm:gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface px-1 sm:px-1.5 py-1 [scrollbar-width:none]"
      >
        <ToolButton label="굵게" onMouseDown={run('bold')}>{icon(<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />)}</ToolButton>
        <ToolButton label="기울임" onMouseDown={run('italic')}>{icon(<path d="M19 4h-9M14 20H5M15 4 9 20" />)}</ToolButton>
        <ToolButton label="밑줄" onMouseDown={run('underline')}>{icon(<path d="M6 4v6a6 6 0 0 0 12 0V4M4 20h16" />)}</ToolButton>
        {sep}
        <ToolButton label="제목 1" onMouseDown={run('formatBlock', 'h1')}>{icon(<path d="M4 12h8M4 18V6M12 18V6M17 12l3-2v8" />)}</ToolButton>
        <ToolButton label="제목 2" onMouseDown={run('formatBlock', 'h2')}>{icon(<path d="M4 12h8M4 18V6M12 18V6M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />)}</ToolButton>
        {sep}
        <ToolButton label="글머리 기호" onMouseDown={run('insertUnorderedList')}>{icon(<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />)}</ToolButton>
        <ToolButton label="번호 목록" onMouseDown={run('insertOrderedList')}>{icon(<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />)}</ToolButton>
        {sep}
        <ToolButton label="코드 블록" active={showLangInput} onClick={handleCodeBlockClick}>{icon(<path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />)}</ToolButton>
        <ToolButton label="인용" onMouseDown={run('formatBlock', 'blockquote')}>{icon(<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />)}</ToolButton>
        <ToolButton label="링크 삽입" active={showLinkInput} onMouseDown={handleLinkClick}>{icon(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>)}</ToolButton>
      </div>

      {showLangInput && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', marginTop: '4px', borderRadius: '6px',
          background: 'rgba(28,90,255,0.08)', border: '1px solid rgba(28,90,255,0.25)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', whiteSpace: 'nowrap' }}>언어:</span>
          <input
            ref={langInputRef}
            type="text"
            value={codeBlockLang}
            onChange={e => setCodeBlockLang(e.target.value)}
            placeholder="javascript, python, sql ..."
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); insertCodeBlock() }
              if (e.key === 'Escape') { setShowLangInput(false); setCodeBlockLang('') }
            }}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: '13px', caretColor: '#1C5AFF',
            }}
          />
          <button
            onClick={insertCodeBlock}
            style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(28,90,255,0.4)', border: '1px solid rgba(28,90,255,0.6)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
          >
            삽입
          </button>
          <button
            onClick={() => { setShowLangInput(false); setCodeBlockLang('') }}
            style={{ padding: '4px 8px', borderRadius: '4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {showLinkInput && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          padding: '8px 10px', marginTop: '4px', borderRadius: '6px',
          background: 'rgba(28,90,255,0.08)', border: '1px solid rgba(28,90,255,0.25)',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', whiteSpace: 'nowrap' }}>URL:</span>
          <input
            ref={linkUrlRef}
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); insertLink() }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); setLinkText('') }
            }}
            style={{
              flex: 1, minWidth: '180px', background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: '13px', caretColor: '#1C5AFF',
            }}
          />
          {!hadSelection && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', whiteSpace: 'nowrap' }}>표시:</span>
              <input
                type="text"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                placeholder="(비우면 URL 그대로)"
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); insertLink() }
                  if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); setLinkText('') }
                }}
                style={{
                  flex: 1, minWidth: '120px', background: 'transparent', border: 'none', outline: 'none',
                  color: '#fff', fontSize: '13px', caretColor: '#1C5AFF',
                }}
              />
            </>
          )}
          <button
            onClick={insertLink}
            style={{ padding: '4px 12px', borderRadius: '4px', background: 'rgba(28,90,255,0.4)', border: '1px solid rgba(28,90,255,0.6)', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
          >
            삽입
          </button>
          <button
            onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkText('') }}
            style={{ padding: '4px 8px', borderRadius: '4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
