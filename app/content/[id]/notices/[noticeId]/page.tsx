'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface NoticeDetail {
  id: number
  title: string
  content: string
  authorName?: string | null
  createdAt: string
  startAt?: string | null
  endAt?: string | null
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

export default function NoticeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const contentId = params.id as string
  const noticeId = params.noticeId as string

  const [contentTitle, setContentTitle] = useState('')
  const [notice, setNotice] = useState<NoticeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (json) setContentTitle(json.data?.title ?? json.title ?? '')
      })
      .catch(() => {})
  }, [contentId])

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices/${noticeId}`)
      .then(async r => {
        if (!r.ok) throw new Error('공지를 불러오지 못했습니다.')
        return r.json()
      })
      .then(json => {
        setNotice(json?.data ?? json)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      })
      .finally(() => setLoading(false))
  }, [contentId, noticeId])

  const canEdit = user?.role === 'ADMIN'

  return (
    <main className="relative min-h-screen" style={{ background: '#040d1f' }}>
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
        <Link href="/content" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
          Content
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <Link href={`/content/${contentId}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
          {contentTitle || '...'}
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <span style={{ color: '#fff' }}>{notice?.title ?? '...'}</span>

        {canEdit && notice && (
          <div style={{ marginLeft: 'auto' }}>
            <Link
              href={`/content/${contentId}/notices/${noticeId}/edit`}
              style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none' }}
            >
              수정하기
            </Link>
          </div>
        )}
      </div>

      <div className="relative max-w-4xl mx-auto px-[5vw] py-12">
        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', textAlign: 'center', paddingTop: '80px' }}>
            불러오는 중...
          </p>
        )}

        {error && (
          <p style={{ color: '#FF6060', fontSize: '14px', textAlign: 'center', paddingTop: '80px' }}>
            {error}
          </p>
        )}

        {!loading && !error && notice && (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(28,90,255,0.15)', border: '1px solid rgba(28,90,255,0.35)', color: '#91CDFF', fontSize: '12px', fontWeight: 600 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              공지
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '24px', lineHeight: 1.3 }}>
              {notice.title}
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: '작성자', value: notice.authorName || '-' },
                { label: '작성일', value: formatDate(notice.createdAt) },
                ...(notice.startAt ? [{ label: '시작일', value: formatDate(notice.startAt) }] : []),
                ...(notice.endAt ? [{ label: '종료일', value: formatDate(notice.endAt) }] : []),
              ].map(row => (
                <div key={`${row.label}-${row.value}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', fontSize: '14px' }}>
                  <span style={{ width: '72px', flexShrink: 0, color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{row.label}</span>
                  <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.65)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

            <div style={{ minHeight: '240px', color: 'rgba(255,255,255,0.8)', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {notice.content?.trim() || '내용이 없습니다.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px', marginBottom: '48px' }}>
              <button
                onClick={() => router.back()}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '13px', cursor: 'pointer' }}
              >
                목록으로
              </button>
              {canEdit && (
                <Link
                  href={`/content/${contentId}/notices/${noticeId}/edit`}
                  style={{ padding: '9px 22px', borderRadius: '8px', border: '0.734px solid rgba(0, 65, 239, 0.6)', background: 'rgba(0, 65, 239, 0.35)', color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                >
                  수정하기
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <HomeFooter />
    </main>
  )
}
