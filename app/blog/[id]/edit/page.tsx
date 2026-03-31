'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

const CATEGORY_OPTIONS = [
  { value: 'ACTIVITIES', label: 'Activities', color: '#FF9193' },
  { value: 'KNOWLEDGE', label: 'Knowledge', color: '#74FF89' },
  { value: 'QNA', label: 'QnA', color: '#91CDFF' },
] as const

type Category = typeof CATEGORY_OPTIONS[number]['value']

interface PostFile {
  id: number
  fileUrl: string
  fileName: string
  mimeType: string
}

interface PostDetail {
  id: number
  title: string
  content: string
  category: string
  visibility: string
  authorDisplay: string
  authorName: string
  authorId: number
  publishedAt: string | null
  createdAt: string
  files: PostFile[]
}

function formatDate(d: Date) {
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

function dataURLtoBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(data)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}

export default function BlogEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthContext()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [forbidden, setForbidden] = useState(false)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('ACTIVITIES')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'MEMBER'>('PUBLIC')
  const [visibilityOpen, setVisibilityOpen] = useState(false)
  const [authorDisplay, setAuthorDisplay] = useState<'NICKNAME' | 'ANONYMOUS'>('NICKNAME')
  const [existingFiles, setExistingFiles] = useState<PostFile[]>([])
  const [deletedFileIds, setDeletedFileIds] = useState<number[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalAuthorId, setOriginalAuthorId] = useState<number | null>(null)

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

  // 기존 게시글 데이터 로드
  const loadPost = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) { setNotFound(true); return }
      const json = await res.json()
      const post: PostDetail = json.data

      setOriginalAuthorId(post.authorId)
      setTitle(post.title)
      setCategory((post.category as Category) ?? 'ACTIVITIES')
      setVisibility((post.visibility as 'PUBLIC' | 'MEMBER') ?? 'PUBLIC')
      setAuthorDisplay((post.authorDisplay as 'NICKNAME' | 'ANONYMOUS') ?? 'NICKNAME')
      setExistingFiles(post.files ?? [])

      if (editorRef.current) {
        editorRef.current.innerHTML = post.content ?? ''
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadPost()
  }, [loadPost])

  // 권한 체크: 로드 후 본인 여부 확인
  useEffect(() => {
    if (!loading && originalAuthorId !== null && user !== null) {
      if (user.id !== originalAuthorId && user.role !== 'ADMIN') {
        setForbidden(true)
      }
    }
  }, [loading, originalAuthorId, user])

  // 에디터 콘텐츠를 상태에 초기화
  useEffect(() => {
    if (!loading && editorRef.current) {
      // 이미 innerHTML이 loadPost에서 설정됨
    }
  }, [loading])

  const selectedLabel = CATEGORY_OPTIONS.find(o => o.value === category)?.label ?? category

  // 파일 첨부
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setNewFiles(prev => [...prev, ...Array.from(e.target.files!)])
    e.target.value = ''
  }

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const removeExistingFile = (fileId: number) => {
    setDeletedFileIds(prev => [...prev, fileId])
    setExistingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // 이미지 base64 삽입
  const insertImageAsBase64 = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      document.execCommand('insertImage', false, reader.result as string)
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
    if (otherFiles.length > 0) setNewFiles(prev => [...prev, ...otherFiles])
  }

  const handleEditorDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    const otherFiles = files.filter(f => !f.type.startsWith('image/'))
    imageFiles.forEach(file => insertImageAsBase64(file))
    if (otherFiles.length > 0) setNewFiles(prev => [...prev, ...otherFiles])
  }

  // 수정 제출
  const handleSubmit = async () => {
    const rawContent = editorRef.current?.innerHTML ?? ''
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (!rawContent.trim() && !editorRef.current?.textContent?.trim()) {
      setError('본문을 입력해주세요.'); return
    }
    setError(null)
    setSubmitting(true)

    try {
      // 1. 삭제할 기존 파일 제거
      for (const fileId of deletedFileIds) {
        await fetchWithAuth(`${API_URL}/v1/posts/${id}/files/${fileId}`, { method: 'DELETE' })
      }

      // 2. content에서 base64 이미지를 추출하고 placeholder로 교체
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

      let finalContent = doc.body.innerHTML

      // 3. 새로운 에디터 이미지 업로드 및 URL 교체
      for (let i = 0; i < pendingFiles.length; i++) {
        const fd = new FormData()
        fd.append('file', pendingFiles[i])
        const fileRes = await fetchWithAuth(`${API_URL}/v1/posts/${id}/files`, {
          method: 'POST',
          body: fd,
        })
        if (fileRes.ok) {
          const fileJson = await fileRes.json()
          const fileUrl: string = fileJson.data.fileUrl
          const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`
          finalContent = finalContent.replace(`__IMG_PLACEHOLDER_${i}__`, fullUrl)
        }
      }

      // 4. 새 첨부파일 업로드
      for (const file of newFiles) {
        const fd = new FormData()
        fd.append('file', file)
        await fetchWithAuth(`${API_URL}/v1/posts/${id}/files`, {
          method: 'POST',
          body: fd,
        })
      }

      // 5. 게시글 수정
      const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: finalContent,
          category,
          visibility,
          authorDisplay,
        }),
      })

      if (!res.ok) throw new Error('게시글 수정에 실패했습니다.')

      router.push(`/blog/${id}`)
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

  // 로딩 상태
  if (loading) {
    return (
      <main className="relative min-h-screen" style={{ background: '#040d1f' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>불러오는 중...</p>
        </div>
      </main>
    )
  }

  // 404
  if (notFound) {
    return (
      <main className="relative min-h-screen" style={{ background: '#040d1f' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>게시글을 찾을 수 없습니다.</p>
          <Link href="/blog" style={{ color: '#1C5AFF', fontSize: '14px' }}>블로그로 돌아가기</Link>
        </div>
      </main>
    )
  }

  // 권한 없음
  if (forbidden) {
    return (
      <main className="relative min-h-screen" style={{ background: '#040d1f' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>수정 권한이 없습니다.</p>
          <Link href={`/blog/${id}`} style={{ color: '#1C5AFF', fontSize: '14px' }}>게시글로 돌아가기</Link>
        </div>
      </main>
    )
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
        className="w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 gap-1.5 text-[13px] mt-40 rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
      >
        <Link href="/blog" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >Blog</Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <Link href={`/blog/${id}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >게시글</Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <span style={{ color: '#fff' }}>수정하기</span>
      </div>

      {/* ── Edit form ───────────────────────────────── */}
      <div className="relative max-w-4xl mx-auto px-[5vw] py-12">

        {/* Section label */}
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
          게시글 수정하기
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
                  className="absolute z-50 flex flex-col gap-1 p-1.5 rounded-lg min-w-[120px]"
                  style={{
                    top: '0',
                    left: 'calc(100% + 6px)',
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
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px', padding: '6px 16px',
                  color: 'rgba(255,255,255,0.8)', fontSize: '13px', cursor: 'pointer',
                }}
              >
                {visibility === 'PUBLIC' ? '전체 공개' : '멤버 공개'}
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4L6 8L10 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {visibilityOpen && (
                <div
                  className="absolute z-50 flex flex-col gap-1 p-1.5 rounded-lg min-w-[120px]"
                  style={{
                    top: '0',
                    left: 'calc(100% + 6px)',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}
                >
                  {(['PUBLIC', 'MEMBER'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => { setVisibility(v); setVisibilityOpen(false) }}
                      className="w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors"
                      style={{ background: 'rgba(36,36,36,0.8)', color: 'rgba(255,255,255,0.8)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                    >
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

            {/* Existing files */}
            {existingFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                {existingFiles.map(file => (
                  <div key={file.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)', fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>기존</span>
                      {file.fileName}
                    </span>
                    <button
                      onClick={() => removeExistingFile(file.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {/* New files */}
            {newFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                {newFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)', fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#74FF89' }}>신규</span>
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeNewFile(idx)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────── */}
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.12)', margin: '16px 0' }} />

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
          {/* Placeholder — editorRef가 비어 있을 때만 표시 */}
          {!loading && editorRef.current && !editorRef.current.textContent?.trim() && (
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
            href={`/blog/${id}`}
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
              border: '0.734px solid rgba(0, 65, 239, 0.6)',
              background: 'rgba(0, 65, 239, 0.4)',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '수정 중...' : '수정하기'}
          </button>
        </div>
      </div>

      <HomeFooter />
    </main>
  )
}
