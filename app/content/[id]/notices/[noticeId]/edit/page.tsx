'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'
const NOTICE_MAX_CHARS = 200

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function NoticeEditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const contentId = params.id as string
  const noticeId = params.noticeId as string

  const [contentTitle, setContentTitle] = useState('')
  const [title, setTitle] = useState('')
  const [noticeText, setNoticeText] = useState('')
  const [startAt, setStartAt] = useState(toIsoDate(new Date()))
  const [endAt, setEndAt] = useState(toIsoDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setContentTitle(json.data?.title ?? json.title ?? '') })
      .catch(() => {})
  }, [contentId])

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices/${noticeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const notice = json?.data ?? json
        if (!notice) return
        setTitle(notice.title ?? '')
        setNoticeText(notice.content ?? '')
        if (notice.startAt) setStartAt(notice.startAt.slice(0, 10))
        if (notice.endAt) setEndAt(notice.endAt.slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contentId, noticeId])

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (!noticeText.trim()) { setError('본문을 입력해주세요.'); return }
    if (noticeText.length > NOTICE_MAX_CHARS) { setError(`글자 수 제한(${NOTICE_MAX_CHARS}자)을 초과했습니다.`); return }
    if (!startAt) { setError('시작 날짜를 선택해주세요.'); return }
    if (!endAt) { setError('종료 날짜를 선택해주세요.'); return }
    if (endAt < startAt) { setError('종료 날짜는 시작 날짜 이후여야 합니다.'); return }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices/${noticeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: noticeText, startAt, endAt }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? '공지 수정에 실패했습니다.')
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

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#040d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>불러오는 중...</span>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>
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
        <span style={{ color: '#fff' }}>공지 수정하기</span>
      </div>

      <div className="relative max-w-4xl mx-auto px-[5vw] py-12">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(28,90,255,0.15)', border: '1px solid rgba(28,90,255,0.35)', color: '#91CDFF', fontSize: '12px', fontWeight: 600 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          공지
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>공지 수정하기</p>

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

        <div>
          <div style={rowStyle}>
            <span style={labelStyle}>작성자</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>{user?.name ?? user?.nickname ?? '—'}</span>
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>시작 날짜</span>
            <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
            <input
              type="date"
              value={startAt}
              onChange={e => setStartAt(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '14px', colorScheme: 'dark', cursor: 'pointer' }}
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
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '14px', colorScheme: 'dark', cursor: 'pointer' }}
            />
          </div>
        </div>

        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.12)', margin: '16px 0' }} />

        <div style={{ marginTop: '20px', minHeight: '320px', padding: '20px 0', position: 'relative' }}>
          <textarea
            value={noticeText}
            onChange={e => { if (e.target.value.length <= NOTICE_MAX_CHARS) setNoticeText(e.target.value) }}
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

        {error && <p style={{ color: '#FF6060', fontSize: '13px', marginTop: '12px' }}>{error}</p>}

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
            {submitting ? '수정 중...' : '수정하기'}
          </button>
        </div>
      </div>

      <HomeFooter />
    </main>
  )
}
