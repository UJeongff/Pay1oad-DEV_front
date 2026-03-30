'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export default function AssignmentCreatePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthContext()
  const contentId = params.id as string

  const [contentTitle, setContentTitle] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setContentTitle(json.data?.title ?? '') })
      .catch(() => {})
  }, [contentId])

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    setError(null)
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { title: title.trim() }
      if (description.trim()) body.description = description.trim()
      if (dueAt) body.dueAt = new Date(dueAt).toISOString().replace('Z', '')

      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.message ?? '생성에 실패했습니다.')
        return
      }
      router.push(`/content/${contentId}`)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #0E1427 100%)' }}>
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '100vh',
          backgroundImage: 'url(/background.png)',
          backgroundSize: '130%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-[5vw] pt-36 pb-24">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
            <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="#1C5AFF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <Link href="/content" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Content</Link>
          <span>›</span>
          <Link href={`/content/${contentId}`} style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{contentTitle || '...'}</Link>
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>과제 출제</span>
        </div>

        <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          {/* Title */}
          <div className="px-5 sm:px-8 lg:px-10 pt-8 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="과제 제목"
              maxLength={80}
              style={{
                background: 'transparent', border: 'none', outline: 'none', color: '#fff',
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '0.03em',
                fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                lineHeight: 1.15, width: '100%', caretColor: '#1C5AFF',
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            />
            {error && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px' }}>{error}</p>}
          </div>

          {/* Description */}
          <div className="px-5 sm:px-8 lg:px-10 py-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.06em' }}>과제 설명</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="과제에 대한 설명을 입력해주세요."
              rows={5}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '10px', padding: '14px 16px', color: 'rgba(255,255,255,0.85)',
                fontSize: '13px', lineHeight: 1.7, resize: 'none', outline: 'none',
                caretColor: '#1C5AFF', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(28,90,255,0.5)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
            />
          </div>

          {/* Due date */}
          <div className="px-5 sm:px-8 lg:px-10 py-6 flex flex-wrap items-center gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', margin: 0, whiteSpace: 'nowrap' }}>마감일 (선택)</p>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '8px', padding: '8px 12px', color: dueAt ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                fontSize: '13px', outline: 'none', colorScheme: 'dark',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(28,90,255,0.5)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
            />
          </div>

          {/* Actions */}
          <div className="px-5 sm:px-8 lg:px-10 py-5 flex justify-end gap-2.5">
            <Link
              href={`/content/${contentId}`}
              style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              취소
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', background: submitting ? 'rgba(28,90,255,0.5)' : '#1C5AFF', color: '#fff', cursor: submitting ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting ? '출제 중...' : '과제 출제하기'}
            </button>
          </div>
        </div>
      </div>

      <HomeFooter />
    </main>
  )
}
