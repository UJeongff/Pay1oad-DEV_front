'use client'

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DOMPurify from 'dompurify'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { BlogEditorToolbar } from '@/app/components/BlogEditorToolbar'

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onanimationend', 'onanimationstart', 'onanimationiteration', 'formaction'],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'meta', 'link', 'style'],
}

const sanitizeHtml = (html: string): string => DOMPurify.sanitize(html, SANITIZE_CONFIG) as unknown as string

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

// 분류 색은 목록과 같은 점 색(globals.css 의 --color-cat-*)
const CATEGORY_OPTIONS = [
  { value: 'ACTIVITIES', label: 'Activities', text: 'text-cat-activities', dot: 'bg-cat-activities shadow-[0_0_8px_var(--color-cat-activities)]' },
  { value: 'KNOWLEDGE', label: 'Knowledge', text: 'text-cat-knowledge', dot: 'bg-cat-knowledge shadow-[0_0_8px_var(--color-cat-knowledge)]' },
  { value: 'QNA', label: 'QnA', text: 'text-cat-qna', dot: 'bg-cat-qna shadow-[0_0_8px_var(--color-cat-qna)]' },
] as const

type Category = typeof CATEGORY_OPTIONS[number]['value']

function formatDate(d: Date) {
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/** 메타 줄 드롭다운: 버튼 바로 아래로 열려서 좁은 화면에서도 옆으로 넘치지 않는다 */
function Menu({ children }: { children: ReactNode }) {
  return (
    <div role="listbox" className="absolute left-0 top-[calc(100%+6px)] z-50 flex min-w-[130px] flex-col gap-1 rounded-lg border border-line bg-[#0b1324] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      {children}
    </div>
  )
}

function MenuItem({ children, selected, onClick }: { children: ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`w-full rounded-md px-3 py-2 text-left text-xs font-medium text-fg-muted transition-colors hover:bg-surface-raised hover:text-white ${selected ? 'bg-surface-raised text-white' : ''}`}
    >
      {children}
    </button>
  )
}

export default function BlogWritePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=%2Fblog%2Fwrite')
    }
  }, [authLoading, user, router])

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
  const [toast, setToast] = useState<string | null>(null)
  const [fileDragOver, setFileDragOver] = useState(false)

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

  // 대표 이미지 미리보기: 등록 때와 같은 규칙(본문 첫 이미지 → 없으면 첨부한 첫 이미지)
  const firstInlineImg = useMemo(() => content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null, [content])
  const firstAttachedImage = attachedFiles.find(f => f.type.startsWith('image/'))
  const attachedPreview = useMemo(() => (firstAttachedImage ? URL.createObjectURL(firstAttachedImage) : null), [firstAttachedImage])
  useEffect(() => () => { if (attachedPreview) URL.revokeObjectURL(attachedPreview) }, [attachedPreview])
  const thumbPreview = firstInlineImg ?? attachedPreview

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

  // contentEditable 에디터 — 이미지/파일 드롭/붙여넣기 처리
  const insertImageAsBase64 = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      document.execCommand('insertImage', false, reader.result as string)
      if (editorRef.current) setContent(editorRef.current.innerHTML)
    }
    reader.readAsDataURL(file)
  }

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items)
    const fileItems = items.filter(item => item.kind === 'file')
    if (fileItems.length === 0) return

    e.preventDefault()
    const otherFiles: File[] = []

    fileItems.forEach(item => {
      const file = item.getAsFile()
      if (!file) return
      if (item.type.startsWith('image/')) {
        insertImageAsBase64(file)
      } else {
        otherFiles.push(file)
      }
    })

    if (otherFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...otherFiles])
    }
  }

  const handleEditorDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const otherFiles = files.filter(f => !f.type.startsWith('image/'))

    imageFiles.forEach(file => insertImageAsBase64(file))
    if (otherFiles.length > 0) setAttachedFiles(prev => [...prev, ...otherFiles])
  }

  const handleEditorInput = () => {
    if (editorRef.current) setContent(editorRef.current.innerHTML)
  }

  // base64 data URL을 Blob으로 변환
  function dataURLtoBlob(dataURL: string): Blob {
    const [header, data] = dataURL.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
    const binary = atob(data)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
    return new Blob([array], { type: mime })
  }

  // 제출 — 2단계: 게시글 생성 → 이미지 업로드 → content URL 교체
  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    const rawContent = editorRef.current?.innerHTML ?? content
    if (!rawContent.trim() && !editorRef.current?.textContent?.trim()) {
      setError('본문을 입력해주세요.'); return
    }
    setError(null)
    setSubmitting(true)
    try {
      // 1. content에서 base64 이미지를 추출하고 placeholder로 교체
      const parser = new DOMParser()
      const doc = parser.parseFromString(rawContent, 'text/html')
      const base64Imgs = Array.from(doc.querySelectorAll('img[src^="data:"]'))
      const pendingFiles: File[] = []

      base64Imgs.forEach((img, idx) => {
        const src = img.getAttribute('src')!
        const blob = dataURLtoBlob(src)
        const ext = blob.type.split('/')[1] ?? 'png'
        pendingFiles.push(new File([blob], `image_${idx}.${ext}`, { type: blob.type }))
        img.setAttribute('src', `__IMG_PLACEHOLDER_${idx}__`)
      })

      const placeholderContent = sanitizeHtml(doc.body.innerHTML)

      // 2. 게시글 생성
      const res = await fetchWithAuth(`${API_URL}/v1/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          content: placeholderContent,
          visibility,
          authorDisplay,
          publish: true,
        }),
      })
      if (!res.ok) throw new Error('게시글 등록에 실패했습니다.')
      const json = await res.json()
      const postId: number = json.data.id

      // 3. 에디터 이미지 업로드 및 URL 교체
      let finalContent = placeholderContent
      for (let i = 0; i < pendingFiles.length; i++) {
        try {
          const fd = new FormData()
          fd.append('file', pendingFiles[i])
          const fileRes = await fetchWithAuth(`${API_URL}/v1/posts/${postId}/files`, {
            method: 'POST',
            body: fd,
          })
          if (fileRes.ok) {
            const fileJson = await fileRes.json()
            const fileUrl: string = fileJson.data.fileUrl
            const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`
            finalContent = finalContent.replace(`__IMG_PLACEHOLDER_${i}__`, fullUrl)
          }
        } catch {
          // 이미지 업로드 실패 시 placeholder 제거
          finalContent = finalContent.replace(`__IMG_PLACEHOLDER_${i}__`, '')
        }
      }

      // 4. 첨부파일 업로드 (첫 번째 이미지 URL 수집)
      let firstAttachedImageUrl: string | null = null
      const failedFiles: string[] = []
      for (const file of attachedFiles) {
        try {
          const fd = new FormData()
          fd.append('file', file)
          const fileRes = await fetchWithAuth(`${API_URL}/v1/posts/${postId}/files`, {
            method: 'POST',
            body: fd,
          })
          if (!fileRes.ok) {
            const errJson = await fileRes.json().catch(() => ({}))
            failedFiles.push(`${file.name} (${errJson?.message ?? '업로드 실패'})`)
          } else if (!firstAttachedImageUrl && file.type.startsWith('image/')) {
            const fileJson = await fileRes.json()
            const url: string = fileJson.data.fileUrl
            firstAttachedImageUrl = url.startsWith('http') ? url : `${API_URL}${url}`
          }
        } catch {
          failedFiles.push(`${file.name} (네트워크 오류)`)
        }
      }
      if (failedFiles.length > 0) {
        setError(`일부 파일 업로드 실패: ${failedFiles.join(', ')}`)
        setSubmitting(false)
        return
      }

      // 5. content 업데이트 및 썸네일 설정
      const firstInlineImgMatch = finalContent.match(/<img[^>]+src=["']([^"']+)["']/i)
      const thumbnailUrl = firstInlineImgMatch ? firstInlineImgMatch[1] : firstAttachedImageUrl

      if (pendingFiles.length > 0 || thumbnailUrl) {
        try {
          await fetchWithAuth(`${API_URL}/v1/posts/${postId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              content: finalContent,
              category,
              visibility,
              authorDisplay,
              ...(thumbnailUrl ? { thumbnailUrl } : {}),
            }),
          })
        } catch {
          // content 업데이트 실패해도 게시글은 생성됐으므로 이동
        }
      }

      setToast('게시글이 등록되었습니다.')
      setTimeout(() => router.push(`/blog/${postId}`), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '11px 24px', borderRadius: '8px',
          background: 'rgba(0, 65, 239, 0.95)',
          border: '1px solid rgba(28,90,255,0.6)',
          color: '#fff', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
        }}>
          ✓&nbsp;{toast}
        </div>
      )}

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
      <div className="w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 gap-1.5 text-[13px] mt-40 rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
      >
        {/* 현재 위치를 터미널 경로처럼 보여준다. 상위 경로(blog)는 눌러서 이동 */}
        <nav aria-label="현재 위치" className="font-mono tracking-[0.02em]">
          <span className="text-fg-faint">~/</span>
          <Link href="/blog" className="text-fg-subtle transition-colors hover:text-white">blog</Link>
          <span className="text-fg-faint">/</span>
          <span aria-current="page" className="text-white">write</span>
        </nav>
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

        {/* Meta rows — 모든 줄이 [라벨 72px | 값] 같은 칸에 맞춰 선다 */}
        <dl className="flex flex-col">

          {/* Category */}
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <dt className="w-[72px] shrink-0 text-[13px] text-fg-subtle">분류</dt>
            <dd ref={categoryRef} className="relative">
              <button
                type="button"
                onClick={() => setCategoryOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={categoryOpen}
                className={`flex items-center gap-2 rounded-full border border-line-strong px-4 py-1.5 text-[13px] hover:border-fg-faint transition-colors ${CATEGORY_OPTIONS.find(o => o.value === category)?.text}`}
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CATEGORY_OPTIONS.find(o => o.value === category)?.dot}`} />
                {selectedLabel}
                <ChevronDown />
              </button>
              {categoryOpen && (
                <Menu>
                  {CATEGORY_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} selected={category === opt.value}
                      onClick={() => { setCategory(opt.value); setCategoryOpen(false) }}>
                      <span className={`inline-flex items-center gap-2 ${opt.text}`}>
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />
                        {opt.label}
                      </span>
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </dd>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <dt className="w-[72px] shrink-0 text-[13px] text-fg-subtle">공개 범위</dt>
            <dd ref={visibilityRef} className="relative">
              <button
                type="button"
                onClick={() => setVisibilityOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={visibilityOpen}
                className="flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-1.5 text-[13px] text-fg-muted hover:border-fg-faint transition-colors"
              >
                {visibility === 'PUBLIC' ? '전체 공개' : '멤버 공개'}
                <ChevronDown />
              </button>
              {visibilityOpen && (
                <Menu>
                  {(['PUBLIC', 'MEMBER'] as const).map(v => (
                    <MenuItem key={v} selected={visibility === v}
                      onClick={() => { setVisibility(v); setVisibilityOpen(false) }}>
                      {v === 'PUBLIC' ? '전체 공개' : '멤버 공개'}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </dd>
          </div>

          {/* Author */}
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <dt className="w-[72px] shrink-0 text-[13px] text-fg-subtle">작성자</dt>
            <dd className="text-fg-muted">{user?.nickname ?? '—'}</dd>
          </div>

          {/* Date */}
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <dt className="w-[72px] shrink-0 text-[13px] text-fg-subtle">작성일</dt>
            <dd className="text-fg-muted">{today}</dd>
          </div>

          {/* File attachment — 박스 하나로 클릭·끌어다 놓기 모두 받는다 */}
          <div className="flex flex-col gap-2.5 py-2.5 text-sm sm:flex-row sm:items-start sm:gap-3">
            <dt className="w-[72px] shrink-0 text-[13px] text-fg-subtle sm:pt-3.5">파일첨부</dt>
            <dd className="flex-1 min-w-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setFileDragOver(true) }}
                onDragLeave={() => setFileDragOver(false)}
                onDrop={e => {
                  e.preventDefault()
                  setFileDragOver(false)
                  const dropped = Array.from(e.dataTransfer.files)
                  if (dropped.length > 0) setAttachedFiles(prev => [...prev, ...dropped])
                }}
                className={`w-full flex items-center gap-2.5 rounded-lg border border-dashed px-4 py-3.5 text-left text-[13px] transition-colors ${
                  fileDragOver
                    ? 'border-[#1C5AFF] bg-[#1C5AFF]/10 text-white'
                    : 'border-line-strong bg-surface text-fg-subtle hover:border-fg-faint hover:text-fg-muted'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <span>{fileDragOver ? '여기에 놓으면 첨부됩니다' : '첨부할 파일을 선택하세요'}</span>
                {!fileDragOver && <span className="ml-auto hidden text-xs text-fg-faint sm:inline">또는 끌어다 놓기</span>}
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

              {/* Attached file list */}
              {attachedFiles.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {attachedFiles.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3 rounded-md bg-surface-raised px-3 py-1.5 text-[13px] text-fg-muted">
                      <span className="truncate">{file.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} aria-label={`${file.name} 첨부 취소`}
                        className="shrink-0 text-base leading-none text-fg-faint hover:text-white">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>

        {/* ── Content editor — 도구 막대 아래에 테두리 있는 입력 칸을 두어 어디에 쓰는지 바로 보인다 ── */}
        <div className="mt-8">
          <BlogEditorToolbar editorRef={editorRef} onContentChange={() => { if (editorRef.current) setContent(editorRef.current.innerHTML) }} />

          <div className="relative rounded-xl border border-line bg-surface transition-colors focus-within:border-[#1C5AFF]/60">
            <div
              ref={editorRef}
              className="rich-editor select-text"
              contentEditable
              suppressContentEditableWarning
              aria-label="본문"
              onInput={handleEditorInput}
              onPaste={handleEditorPaste}
              onDrop={handleEditorDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                minHeight: '320px',
                padding: '20px 22px',
                outline: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '15px',
                lineHeight: 1.75,
                caretColor: '#1C5AFF',
              }}
            />
            {/* Placeholder */}
            {(!editorRef.current || !editorRef.current.textContent?.trim()) && !content.includes('<img') && (
              <div className="pointer-events-none absolute left-[22px] top-5 select-none text-[15px] leading-[1.75] text-fg-faint">
                <p>본문을 작성해 보세요.</p>
                <p className="mt-1 text-[13px]">이미지는 끌어다 놓거나 복사해 붙여넣으면 본문에 들어갑니다.</p>
              </div>
            )}
          </div>

          {/* 대표 이미지(목록 썸네일) — 정해지는 규칙과 지금 무엇이 쓰일지 보여준다 */}
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
            <div className="relative h-11 w-[70px] shrink-0 overflow-hidden rounded-md bg-surface-raised">
              {thumbPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="absolute inset-0 m-auto text-fg-faint">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                </svg>
              )}
            </div>
            <div className="min-w-0 text-[13px] leading-relaxed">
              <p className="font-medium text-fg-muted">
                대표 이미지 · {firstInlineImg ? '본문에 넣은 첫 번째 이미지' : attachedPreview ? '파일첨부로 올린 이미지' : '아직 없음 (기본 이미지로 표시)'}
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-[13px] text-[#FF6060]">{error}</p>
        )}

        {/* ── Action buttons — 본문 바로 아래 ── */}
        <div className="mt-6 mb-12 flex justify-end gap-2.5">
          <Link
            href="/blog"
            className="inline-flex items-center rounded-lg border border-line-strong px-6 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:border-fg-subtle hover:text-white"
          >
            취소
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-[#1C5AFF] px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1749D6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </div>

      <HomeFooter />
    </main>
  )
}
