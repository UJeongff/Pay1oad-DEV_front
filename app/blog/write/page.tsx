'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const CATEGORY_OPTIONS = [
  { value: 'ACTIVITIES', label: 'Activities', color: '#4ade80' },
  { value: 'KNOWLEDGE', label: 'Knowledge', color: '#60a5fa' },
  { value: 'QNA', label: 'QnA', color: '#f87171' },
] as const

type Category = typeof CATEGORY_OPTIONS[number]['value']

function formatDate(d: Date) {
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

export default function BlogWritePage() {
  const router = useRouter()
  const { user } = useAuthContext()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('ACTIVITIES')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'MEMBER'>('PUBLIC')
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [authorDisplay] = useState<'NICKNAME' | 'ANONYMOUS'>('NICKNAME')
  const [content, setContent] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryRef = useRef<HTMLDivElement>(null)
  const visibilityRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const today = formatDate(new Date())

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false)
      if (visibilityRef.current && !visibilityRef.current.contains(e.target as Node)) setVisibilityOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  const selectedLabel = CATEGORY_OPTIONS.find(o => o.value === category)?.label ?? category

  // 파일 첨부
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  // contentEditable 에디터 — 이미지 드롭/붙여넣기 처리
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (!file) return
      const url = URL.createObjectURL(file)
      document.execCommand('insertImage', false, url)
      setAttachedFiles(prev => [...prev, file])
    }
  }

  const handleEditorDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    files.forEach(file => {
      const url = URL.createObjectURL(file)
      document.execCommand('insertImage', false, url)
    })
    setAttachedFiles(prev => [...prev, ...files])
  }

  const handleEditorInput = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML)
  }

  // 제출
  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (!content.trim() && editorRef.current && !editorRef.current.textContent?.trim()) {
      setError('본문을 입력해주세요.'); return
    }
    setError(null)
    setSubmitting(true)
    try {
      const body = {
        title: title.trim(),
        category,
        content: editorRef.current?.innerHTML ?? content,
        visibility,
        authorDisplay,
        publish: true,
      }
      const res = await fetchWithAuth(`${API_URL}/v1/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('게시글 등록에 실패했습니다.')
      router.push('/blog')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
  }

  const labelStyle: React.CSSProperties = {
    width: '72px',
    flexShrink: 0,
    color: 'rgba(255,255,255,0.45)',
    fontSize: '13px',
  }

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>

      {/* Background */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '60vh',
          backgroundImage: 'url(/background.png)',
          backgroundSize: '130%',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 80%)',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 80%)',
        }}
      />

      {/* ── Breadcrumb bar ──────────────────────────── */}
      <div
        style={{
          width: '100%',
          background: '#0E121D',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 80px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)',
          paddingTop: '80px',
        }}
      >
        <Link href="/blog" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >Blog</Link>
        <span>&gt;</span>
        <span style={{ color: 'rgba(255,255,255,0.8)' }}>게시글 작성하기</span>
      </div>

      {/* ── Section Header ──────────────────────────── */}
      <div
        style={{
          width: '100%', height: '49px',
          background: 'rgba(0, 65, 239, 0.4)',
          borderRadius: '100px 100px 0 0',
          display: 'flex', alignItems: 'center', padding: '0 80px',
        }}
      >
        <div className="flex items-center gap-2 flex-1 text-sm font-medium tracking-widest">
          <Link href="/blog" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
          >Blog</Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
          <span className="text-white">게시글 작성하기</span>
        </div>
      </div>

      {/* ── Write form ──────────────────────────────── */}
      <div className="relative max-w-4xl mx-auto px-[5vw] py-12">

        {/* Section label */}
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
          게시글 작성하기
        </p>

        {/* Title input */}
        <input
          type="text"
          placeholder="게시글 제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
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

        {/* Meta rows */}
        <div>

          {/* Category */}
          <div style={rowStyle}>
            <div ref={categoryRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setCategoryOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px', padding: '6px 16px',
                  color: CATEGORY_OPTIONS.find(o => o.value === category)?.color ?? 'rgba(255,255,255,0.8)',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                {selectedLabel}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4L6 8L10 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {categoryOpen && (
                <div
                  className="absolute right-0 z-50 flex flex-col gap-1 p-1.5 rounded-lg min-w-[120px]"
                  style={{
                    top: 'calc(100% + 6px)',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setCategory(opt.value); setCategoryOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors"
                      style={{ background: 'rgba(36,36,36,0.8)', color: opt.color }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div style={rowStyle}>
            <span style={labelStyle}>공개 범위</span>
            <div ref={visibilityRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setVisibilityOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '5px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', cursor: 'pointer' }}
              >
                {visibility === 'PUBLIC' ? '전체 공개' : '멤버 공개'}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4L6 8L10 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {visibilityOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, minWidth: '120px', padding: '6px', borderRadius: '8px', background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {(['PUBLIC', 'MEMBER'] as const).map(v => (
                    <button key={v} onClick={() => { setVisibility(v); setVisibilityOpen(false) }}
                      style={{ background: v === visibility ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: v === visibility ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '13px', padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '5px', width: '100%' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
                      onMouseLeave={e => { if (v !== visibility) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      {v === 'PUBLIC' ? '전체 공개' : '멤버 공개'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Author */}
          <div style={rowStyle}>
            <span style={labelStyle}>작성자</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              {user?.nickname ?? '—'}
            </span>
          </div>

          {/* Date */}
          <div style={rowStyle}>
            <span style={labelStyle}>작성일</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{today}</span>
          </div>

          {/* File attachment */}
          <div style={{ ...rowStyle, alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={labelStyle}>파일첨부</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '13px', padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* File input area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: '14px 16px',
                borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.3)', fontSize: '13px', cursor: 'pointer',
              }}
            >
              첨부할 파일을 선택하세요
            </div>

            {/* Attached file list */}
            {attachedFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                {attachedFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)', fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    <span>{file.name}</span>
                    <button
                      onClick={() => removeFile(idx)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Content editor ─────────────────────────── */}
        <div
          style={{
            marginTop: '20px',
            minHeight: '320px',
            padding: '20px 0',
            position: 'relative',
          }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onPaste={handleEditorPaste}
            onDrop={handleEditorDrop}
            onDragOver={e => e.preventDefault()}
            style={{
              minHeight: '280px',
              outline: 'none',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '15px',
              lineHeight: 1.75,
              caretColor: '#1C5AFF',
            }}
          />
          {/* Placeholder */}
          {(!editorRef.current || !editorRef.current.textContent?.trim()) && (
            <div
              style={{
                position: 'absolute', top: '20px', left: '20px',
                color: 'rgba(255,255,255,0.2)', fontSize: '15px', lineHeight: 1.75,
                pointerEvents: 'none', userSelect: 'none',
              }}
            >
              <p>본문을 작성해 보세요.</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>*이미지는 드롭 다운/ 복사 붙여넣기로 첨부할 수 있습니다.</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: '#FF6060', fontSize: '13px', marginTop: '12px' }}>{error}</p>
        )}

        {/* ── Action buttons ──────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', marginBottom: '48px' }}>
          <Link
            href="/blog"
            style={{
              padding: '10px 24px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
              color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500,
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'
              ;(e.currentTarget as HTMLElement).style.color = '#fff'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'
            }}
          >
            취소
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '10px 28px', borderRadius: '8px',
              border: '0.734px solid #000',
              background: 'linear-gradient(180deg, #0041EF -3.75%, #02174E 100%)',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </div>

      <HomeFooter />
    </main>
  )
}
