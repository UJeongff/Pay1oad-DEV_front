'use client'

import { useRef, useState } from 'react'

interface BlogEditorToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  onContentChange: () => void
}

export function BlogEditorToolbar({ editorRef, onContentChange }: BlogEditorToolbarProps) {
  const [showLangInput, setShowLangInput] = useState(false)
  const [codeBlockLang, setCodeBlockLang] = useState('')
  const savedRangeRef = useRef<Range | null>(null)
  const langInputRef = useRef<HTMLInputElement>(null)

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

  const btn = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '28px', height: '28px', padding: '0 6px', borderRadius: '4px',
    background: active ? 'rgba(28,90,255,0.3)' : 'transparent',
    border: '1px solid transparent',
    color: active ? '#7aa3ff' : 'rgba(255,255,255,0.55)',
    fontSize: '12px', fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.15s',
    fontFamily: 'monospace',
  })

  const sep = (
    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
  )

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap',
        padding: '6px 8px', borderRadius: '6px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button onMouseDown={e => { e.preventDefault(); exec('bold') }} style={btn()} title="굵게"><b>B</b></button>
        <button onMouseDown={e => { e.preventDefault(); exec('italic') }} style={btn()} title="기울임"><i style={{ fontFamily: 'serif' }}>I</i></button>
        <button onMouseDown={e => { e.preventDefault(); exec('underline') }} style={btn()} title="밑줄"><u>U</u></button>
        {sep}
        <button onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h1') }} style={btn()} title="제목 1">H1</button>
        <button onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'h2') }} style={btn()} title="제목 2">H2</button>
        {sep}
        <button onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }} style={btn()} title="글머리 기호">•—</button>
        <button onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }} style={btn()} title="번호 목록">1.</button>
        {sep}
        <button onClick={handleCodeBlockClick} style={btn(showLangInput)} title="코드 블록">{`</>`}</button>
        <button onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'blockquote') }} style={btn()} title="인용">&ldquo;</button>
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
    </div>
  )
}
