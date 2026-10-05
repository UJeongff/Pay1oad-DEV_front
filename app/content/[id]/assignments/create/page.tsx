'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

/** datetime-local 기본값 — 일주일 뒤 23:59 */
function defaultDueAt() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(23, 59, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 팀장/관리자의 과제 생성.
 *
 * 과제(공지)는 팀장만 만든다. 팀원의 제출은 과제 상세 페이지의 팝업에서
 * POST /assignments/{id}/submissions 로 따로 올라간다.
 */
export default function AssignmentCreatePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthContext()
  const contentId = params.id as string

  const [contentTitle, setContentTitle] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState(defaultDueAt())
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => setContentTitle(json?.data?.title ?? ''))
      .catch(() => {})
  }, [contentId])

  const handleSubmit = async () => {
    if (!title.trim()) return setError('과제 제목을 입력해주세요.')
    if (!dueAt) return setError('마감일을 선택해주세요.')

    setError(null)
    setSubmitting(true)
    try {
      // 첨부 파일을 함께 보내야 하므로 multipart 로 보낸다
      const formData = new FormData()
      formData.append('title', title.trim())
      if (description.trim()) formData.append('description', description.trim())
      // 서버는 초 단위까지 받는다
      formData.append('dueAt', `${dueAt}:00`)
      attachedFiles.forEach(file => formData.append('files', file))

      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        // 서버가 필드별로 이유를 알려주면 그걸 그대로 보여준다
        setError(json?.errors?.[0]?.message ?? json?.message ?? `과제 생성에 실패했습니다. (HTTP ${res.status})`)
        return
      }

      const json = await res.json().catch(() => null)
      const id = json?.data?.id
      router.push(id ? `/content/${contentId}/assignments/${id}` : `/content/${contentId}`)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #0E1427 100%)' }}>
      <div className="relative max-w-5xl mx-auto px-[5vw] pt-36 pb-24">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <Link href="/content" style={{ color: 'inherit', textDecoration: 'none' }}>Content</Link>
          <span>›</span>
          <Link href={`/content/${contentId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contentTitle || '...'}</Link>
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>과제 생성</span>
        </div>

        <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="과제 제목"
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.1rem)', fontWeight: 900 }}
            />
            {error && <p style={{ margin: '12px 0 0', color: '#f87171', fontSize: '12px' }}>{error}</p>}
          </div>

          <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>과제 설명</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={10}
              placeholder="무엇을 언제까지 어떻게 제출해야 하는지 적어주세요."
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px', color: '#fff' }}
            />
          </div>

          <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>마감일</p>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', colorScheme: 'dark' }}
            />
            <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>
              마감일이 지난 뒤 들어온 제출물은 팀장이 &lsquo;세모&rsquo;로 채점할 수 있습니다.
            </p>
          </div>

          <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>첨부 파일</p>
              <label style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '12px' }}>
                파일 선택
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => {
                    const picked = Array.from(e.currentTarget.files ?? [])
                    if (picked.length) setAttachedFiles(prev => [...prev, ...picked])
                    e.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
            {attachedFiles.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {attachedFiles.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
                    style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', padding: '5px 10px', borderRadius: '999px', background: 'rgba(28,90,255,0.12)', color: '#a9c5ff', fontSize: '12px' }}
                  >
                    {file.name}
                    <button
                      type="button"
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                      style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>선택된 파일이 없습니다.</p>
            )}
          </div>

          <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Link href={`/content/${contentId}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>취소</Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? '생성 중...' : '과제 생성하기'}
            </button>
          </div>
        </div>
      </div>
      <HomeFooter />
    </main>
  )
}
