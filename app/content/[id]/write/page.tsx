'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'
const NOTICE_MAX_CHARS = 200

function formatDate(d: Date) {
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function encodeBodyJson(html: string) {
  const jsonStr = JSON.stringify({ body: html })
  const bytes = new TextEncoder().encode(jsonStr)
  const binary = String.fromCharCode(...Array.from(bytes))
  return btoa(binary)
}

interface ApiErrorResponse {
  message?: string
  errors?: Array<{ field?: string; message?: string }>
}

interface NoticeMember {
  userId: number
  name: string
  nickname?: string
  role?: string
}

function getApiErrorMessage(payload: ApiErrorResponse | null | undefined, fallback: string) {
  const fieldMessage = payload?.errors?.find(error => error?.message)?.message
  return fieldMessage ?? payload?.message ?? fallback
}
function dataURLtoBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(data)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
  return new Blob([array], { type: mime })
}

export default function ContentWritePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user } = useAuthContext()

  const contentId = params.id as string
  const isNotice = searchParams.get('notice') === 'true'
  const docId = searchParams.get('docId')
  const docType = searchParams.get('type')?.toUpperCase() ?? 'POST'
  const isEdit = !!docId

  const [contentTitle, setContentTitle] = useState('')
  const [canManageNotice, setCanManageNotice] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [title, setTitle] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [noticeText, setNoticeText] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedPostId, setSavedPostId] = useState<number | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 공지 전용 상태
  const defaultStart = toIsoDate(new Date())
  const defaultEnd = toIsoDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  const [startAt, setStartAt] = useState(defaultStart)
  const [endAt, setEndAt] = useState(defaultEnd)
  const [members, setMembers] = useState<NoticeMember[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]) // 빈 배열 = 전체

  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const today = formatDate(new Date())

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const data = json?.data ?? json
        if (!data) return
        setContentTitle(data.title ?? '')
        setCanManageNotice(user?.role === 'ADMIN' || !!data.isLeader)
        setIsMember(!!data.isMember || !!data.isLeader || user?.role === 'ADMIN')
      })
      .catch(() => {})
  }, [contentId, user?.role])

  // 수정 모드: 기존 doc 데이터 불러오기
  useEffect(() => {
    if (!docId) return
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const doc = json?.data ?? json
        if (!doc) return
        setTitle(doc.title ?? '')
        // bodyJson 디코딩: base64(UTF-8(JSON({body: html})))
        if (doc.bodyJson) {
          try {
            const bin = atob(doc.bodyJson)
            const bytes = new Uint8Array(bin.length)
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
            const state = JSON.parse(new TextDecoder().decode(bytes))
            const html = typeof state.body === 'string' ? state.body : ''
            setBodyHtml(html)
            if (editorRef.current) editorRef.current.innerHTML = html
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
  }, [contentId, docId])

  // 공지 작성 시 멤버 목록 로드
  useEffect(() => {
    if (!isNotice) return
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/members`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const list: NoticeMember[] = json?.data ?? []
        setMembers(list.filter(m => m.role !== 'team_leader'))
      })
      .catch(() => {})
  }, [contentId, isNotice])

  const toggleRecipient = (userId: number) => {
    setSelectedRecipients(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const selectAllRecipients = () => {
    setSelectedRecipients(members.map(m => m.userId))
  }

  // ── 파일 첨부 (게시글 전용) ────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  // ── 에디터 이미지 처리 (게시글 전용) ──────────────────────────────────────

  const insertImageAsBase64 = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      document.execCommand('insertImage', false, reader.result as string)
      if (editorRef.current) setBodyHtml(editorRef.current.innerHTML)
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
      if (item.type.startsWith('image/')) insertImageAsBase64(file)
      else otherFiles.push(file)
    })
    if (otherFiles.length > 0) setAttachedFiles(prev => [...prev, ...otherFiles])
  }

  const handleEditorDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    files.filter(f => f.type.startsWith('image/')).forEach(f => insertImageAsBase64(f))
    const others = files.filter(f => !f.type.startsWith('image/'))
    if (others.length > 0) setAttachedFiles(prev => [...prev, ...others])
  }

  // ── 임시 저장 (게시글 전용) ────────────────────────────────────────────────

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim() || saving) return
    const rawContent = editorRef.current?.innerHTML ?? bodyHtml
    setSaving(true)
    try {
      if (savedPostId) {
        // 기존 임시저장 업데이트
        await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/posts/${savedPostId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), content: rawContent, isNotice: false, docType }),
        })
      } else {
        // 새 임시저장
        const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), content: rawContent, isNotice: false, isDraft: true, docType }),
        })
        if (res.ok) {
          const json = await res.json()
          setSavedPostId(json.data?.id ?? json.id ?? null)
        }
      }
      setLastSaved(new Date())
    } catch {
    } finally {
      setSaving(false)
    }
  }, [title, bodyHtml, saving, savedPostId, contentId])

  // 30초마다 자동 저장 (게시글 전용, 제목이 있을 때, 수정 모드 제외)
  useEffect(() => {
    if (isNotice || isEdit) return
    const interval = setInterval(() => {
      if (title.trim() && (editorRef.current?.textContent?.trim())) {
        handleSaveDraft()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [isNotice, title, handleSaveDraft])

  // ── 제출 ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (isNotice && !canManageNotice) { setError('공지 작성 권한이 없습니다.'); return }
    if (!isNotice && !isEdit && !isMember) { setError('게시글 작성 권한이 없습니다. 팀에 가입해주세요.'); return }
    if (isNotice) {
      if (!noticeText.trim()) { setError('본문을 입력해주세요.'); return }
      if (noticeText.length > NOTICE_MAX_CHARS) { setError(`글자 수 제한(${NOTICE_MAX_CHARS}자)을 초과했습니다.`); return }
      if (!startAt) { setError('시작 날짜를 선택해주세요.'); return }
      if (!endAt) { setError('종료 날짜를 선택해주세요.'); return }
      if (endAt < startAt) { setError('종료 날짜는 시작 날짜 이후여야 합니다.'); return }
    } else {
      if (!editorRef.current?.textContent?.trim()) { setError('본문을 입력해주세요.'); return }
    }
    setError(null)
    setSubmitting(true)
    try {
      if (isNotice) {
        // ── 공지 전용 API ──────────────────────────
        const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: noticeText,
            startAt,
            endAt,
            recipientIds: selectedRecipients.length > 0 ? selectedRecipients : null,
          }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => null) as ApiErrorResponse | null
          throw new Error(getApiErrorMessage(json, '공지 등록에 실패했습니다.'))
        }
        router.push(`/content/${contentId}`)
        return
      }

      // ── 수정 모드: 기존 doc PATCH ──────────────
      if (isEdit && docId) {
        const html = editorRef.current?.innerHTML ?? bodyHtml
        const jsonStr = JSON.stringify({ body: html })
        const bytes = new TextEncoder().encode(jsonStr)
        const binary = String.fromCharCode(...Array.from(bytes))
        const encodedBodyJson = btoa(binary)
        const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), bodyJson: encodedBodyJson }),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => null) as ApiErrorResponse | null
          throw new Error(getApiErrorMessage(json, '수정에 실패했습니다.'))
        }
        router.push(`/content/${contentId}`)
        return
      }

      // ── 일반 게시글 ────────────────────────────
      const rawContent = editorRef.current?.innerHTML ?? bodyHtml
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
      const placeholderContent = doc.body.innerHTML

      const createRes = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          docType,
          bodyJson: encodeBodyJson(placeholderContent),
        }),
      })
      if (!createRes.ok) {
        const json = await createRes.json().catch(() => null) as ApiErrorResponse | null
        throw new Error(getApiErrorMessage(json, '게시글 등록에 실패했습니다.'))
      }
      const createJson = await createRes.json()
      const docRes = createJson?.data ?? createJson
      const createdDocId = docRes?.id
      if (!createdDocId) {
        throw new Error('생성된 문서 ID를 확인할 수 없습니다.')
      }
      let finalContent = placeholderContent
      for (let i = 0; i < pendingFiles.length; i++) {
        const fd = new FormData()
        fd.append('file', pendingFiles[i])
        const fileRes = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${createdDocId}/files`, {
          method: 'POST',
          body: fd,
        })
        if (fileRes.ok) {
          const fileJson = await fileRes.json()
          const fileUrl: string = fileJson.data?.fileUrl ?? fileJson.fileUrl ?? ''
          const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_URL}${fileUrl}`
          finalContent = finalContent.replace(`__IMG_PLACEHOLDER_${i}__`, fullUrl)
        }
      }

      for (const file of attachedFiles) {
        const fd = new FormData()
        fd.append('file', file)
        await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${createdDocId}/files`, {
          method: 'POST',
          body: fd,
        })
      }

      if (pendingFiles.length > 0) {
        await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${createdDocId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), bodyJson: encodeBodyJson(finalContent) }),
        })
      }

      router.push(`/content/${contentId}`)
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
        className="w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 gap-1.5 text-[13px] mt-40 rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
      >
        <Link href="/content" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          Content
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <Link href={`/content/${contentId}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          {contentTitle || '...'}
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <span style={{ color: '#fff' }}>{isNotice ? '공지 작성하기' : isEdit ? '게시글 수정하기' : docType === 'REPORT' ? '보고서 작성하기' : '게시글 작성하기'}</span>
      </div>

      {/* ── Write form ──────────────────────────────── */}
      <div className="relative max-w-4xl mx-auto px-[5vw] py-12">

        {/* Notice badge */}
        {isNotice && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(28,90,255,0.15)', border: '1px solid rgba(28,90,255,0.35)', color: '#91CDFF', fontSize: '12px', fontWeight: 600 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            공지
          </div>
        )}

        {/* Section label */}
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
          {isNotice ? '공지 작성하기' : isEdit ? '게시글 수정하기' : docType === 'REPORT' ? '보고서 작성하기' : '게시글 작성하기'}
        </p>

        {/* Title input */}
        <input
          type="text"
          placeholder="제목"
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
          {/* Author */}
          <div style={rowStyle}>
            <span style={labelStyle}>작성자</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{user?.name ?? user?.nickname ?? '—'}</span>
          </div>

          {/* Date */}
          <div style={rowStyle}>
            <span style={labelStyle}>작성일</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{today}</span>
          </div>

          {/* 공지 전용: 날짜 + 수신자 */}
          {isNotice && (
            <>
              <div style={rowStyle}>
                <span style={labelStyle}>시작 날짜</span>
                <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <input
                  type="date"
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'rgba(255,255,255,0.7)', fontSize: '14px',
                    colorScheme: 'dark', cursor: 'pointer',
                  }}
                />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>종료 날짜</span>
                <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <input
                  type="date"
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
                  min={startAt}
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'rgba(255,255,255,0.7)', fontSize: '14px',
                    colorScheme: 'dark', cursor: 'pointer',
                  }}
                />
              </div>

              {/* 수신자 선택 */}
              <div style={{ ...rowStyle, alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={labelStyle}>알림 수신</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                    {selectedRecipients.length === 0
                      ? '전체 팀원'
                      : `${selectedRecipients.length}명 선택됨`}
                  </span>
                  {/* 전체 선택 */}
                  {members.length > 0 && selectedRecipients.length < members.length && (
                    <button
                      onClick={selectAllRecipients}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#91CDFF', fontSize: '12px', padding: 0 }}
                    >
                      전체 선택
                    </button>
                  )}
                  {selectedRecipients.length > 0 && (
                    <button
                      onClick={() => setSelectedRecipients([])}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '12px', padding: 0 }}
                    >
                      전체 해제
                    </button>
                  )}
                </div>
                {members.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {members.map(m => {
                      const selected = selectedRecipients.includes(m.userId)
                      return (
                        <button
                          key={m.userId}
                          onClick={() => toggleRecipient(m.userId)}
                          style={{
                            padding: '4px 12px', borderRadius: '100px', fontSize: '12px', cursor: 'pointer',
                            border: `1px solid ${selected ? 'rgba(28,90,255,0.6)' : 'rgba(255,255,255,0.15)'}`,
                            background: selected ? 'rgba(28,90,255,0.2)' : 'transparent',
                            color: selected ? '#91CDFF' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {m.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                  선택하지 않으면 전체 팀원에게 알림이 전송됩니다.
                </p>
              </div>
            </>
          )}

          {/* 파일 첨부 (게시글 전용) */}
          {!isNotice && (
            <div style={{ ...rowStyle, alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={labelStyle}>파일첨부</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileChange} />
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', fontSize: '13px', cursor: 'pointer' }}
              >
                첨부할 파일을 선택하세요
              </div>

              {attachedFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                      <span>{file.name}</span>
                      <button onClick={() => removeFile(idx)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.12)', margin: '16px 0' }} />

        {/* Content editor */}
        {isNotice ? (
          /* 공지: 순수 텍스트만 */
          <div style={{ marginTop: '20px', minHeight: '320px', padding: '20px 0', position: 'relative' }}>
            <textarea
              value={noticeText}
              onChange={e => {
                if (e.target.value.length <= NOTICE_MAX_CHARS) setNoticeText(e.target.value)
              }}
              placeholder="본문을 작성해 보세요."
              style={{
                width: '100%',
                minHeight: '280px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '15px',
                lineHeight: 1.75,
                caretColor: '#1C5AFF',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <span style={{
                fontSize: '12px',
                color: noticeText.length > NOTICE_MAX_CHARS * 0.9
                  ? (noticeText.length >= NOTICE_MAX_CHARS ? '#f87171' : '#FFD700')
                  : 'rgba(255,255,255,0.25)',
              }}>
                {noticeText.length} / {NOTICE_MAX_CHARS}
              </span>
            </div>
          </div>
        ) : (
          /* 게시글: 리치 에디터 (이미지 지원) */
          <div style={{ marginTop: '20px', minHeight: '320px', padding: '20px 0', position: 'relative' }}>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => { if (editorRef.current) setBodyHtml(editorRef.current.innerHTML) }}
              onPaste={handleEditorPaste}
              onDrop={handleEditorDrop}
              onDragOver={e => e.preventDefault()}
              style={{ minHeight: '280px', outline: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '15px', lineHeight: 1.75, caretColor: '#1C5AFF' }}
            />
            {(!editorRef.current || !editorRef.current.textContent?.trim()) && (
              <div style={{ position: 'absolute', top: '20px', left: '0', color: 'rgba(255,255,255,0.2)', fontSize: '15px', lineHeight: 1.75, pointerEvents: 'none', userSelect: 'none' }}>
                <p>본문을 작성해 보세요.</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>*이미지는 드롭다운 / 복사 붙여넣기로 첨부할 수 있습니다.</p>
              </div>
            )}
            {/* 자동 저장 상태 */}
            {lastSaved && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                  마지막 임시 저장: {formatDate(lastSaved)} {lastSaved.getHours().toString().padStart(2,'0')}:{lastSaved.getMinutes().toString().padStart(2,'0')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p style={{ color: '#FF6060', fontSize: '13px', marginTop: '12px' }}>{error}</p>}

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', marginBottom: '48px' }}>
          <Link
            href={`/content/${contentId}`}
            style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.5)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
          >
            취소
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '10px 28px', borderRadius: '8px', border: '0.734px solid rgba(0, 65, 239, 0.6)', background: 'rgba(0, 65, 239, 0.4)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? (isEdit ? '수정 중...' : '등록 중...') : (isEdit ? '수정하기' : '등록하기')}
          </button>
        </div>
      </div>

      <HomeFooter />
    </main>
  )
}
