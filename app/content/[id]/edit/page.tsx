'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

type ContentVisibility = 'TEAM' | 'MEMBER'

/**
 * content 정보 수정 (팀장/관리자).
 *
 * 타입(STUDY/PROJECT)은 바꾸지 않는다 — 서버의 수정 API 도 받지 않고,
 * 도중에 바뀌면 이미 쌓인 과제·보고서의 의미가 흔들린다.
 */
export default function ContentEditPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthContext()
  const contentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<ContentVisibility>('TEAM')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [type, setType] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled) return
        const d = json?.data
        if (!d) { setLoading(false); return }
        setTitle(d.title ?? '')
        setDescription(d.description ?? '')
        setVisibility(d.visibility === 'MEMBER' ? 'MEMBER' : 'TEAM')
        setThumbnailUrl(d.thumbnailUrl ?? null)
        setType(d.type ?? '')
        // 수정은 팀장/관리자만 — 서버도 같은 규칙으로 막지만 화면을 먼저 정리한다
        setAllowed(!!d.isLeader || user?.role === 'ADMIN')
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [contentId, user])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          // 서버가 받은 값으로 덮어쓰므로 기존 썸네일을 그대로 되돌려 보낸다
          thumbnailUrl,
          visibility,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.errors?.[0]?.message ?? json?.message ?? `수정에 실패했습니다. (HTTP ${res.status})`)
        return
      }
      router.push(`/content/${contentId}`)
      router.refresh()
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  const shell = (inner: React.ReactNode) => (
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #0E1427 100%)' }}>
      <div className="relative max-w-3xl mx-auto px-[5vw] pt-36 pb-24">{inner}</div>
      <HomeFooter />
    </main>
  )

  if (loading) return shell(<p style={{ color: 'rgba(255,255,255,0.4)' }}>불러오는 중...</p>)

  if (!allowed) {
    return shell(
      <div>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>수정 권한이 없습니다.</p>
        <Link href={`/content/${contentId}`} style={{ color: '#91CDFF' }}>돌아가기</Link>
      </div>,
    )
  }

  return shell(
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
        <Link href="/content" style={{ color: 'inherit', textDecoration: 'none' }}>Content</Link>
        <span>›</span>
        <Link href={`/content/${contentId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{title || '...'}</Link>
        <span>›</span>
        <span style={{ color: 'rgba(255,255,255,0.75)' }}>수정</span>
      </div>

      <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900 }}
          />
          {error && <p style={{ margin: '12px 0 0', color: '#f87171', fontSize: '12px' }}>{error}</p>}
        </div>

        <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>설명</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={6}
            placeholder="어떤 스터디/프로젝트인지 적어주세요."
            style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px', color: '#fff' }}
          />
        </div>

        <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>공개 범위</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {([['TEAM', 'Only Team'], ['MEMBER', 'Public']] as [ContentVisibility, string][]).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setVisibility(val)}
                style={{
                  padding: '7px 18px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: visibility === val ? '1px solid rgba(28,90,255,0.7)' : '1px solid rgba(255,255,255,0.15)',
                  background: visibility === val ? 'rgba(28,90,255,0.18)' : 'rgba(255,255,255,0.05)',
                  color: visibility === val ? '#7ba8ff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.38)', fontSize: '12px', lineHeight: 1.6 }}>
            {visibility === 'TEAM'
              ? '초대된 팀원과 관리자만 내용을 볼 수 있습니다.'
              : '로그인한 회원이면 누구나 내용을 볼 수 있습니다.'}
          </p>
        </div>

        <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>타입</p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>
            {type || '-'} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>(생성 후에는 바꿀 수 없습니다)</span>
          </p>
        </div>

        <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Link
            href={`/content/${contentId}`}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
          >
            취소
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </div>
    </>,
  )
}
