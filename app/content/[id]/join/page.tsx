'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { isNumericId } from '@/app/lib/isNumericId'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

type JoinState = 'ready' | 'joining' | 'success' | 'error'

export default function ContentInviteJoinPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const contentId = params.id as string
  const token = searchParams.get('token') ?? ''
  const validId = isNumericId(contentId)

  // 링크만 열어도 가입되지 않도록 사용자가 버튼을 눌러야 참여한다
  const initialError = !validId ? 'Invalid invite link.' : !token ? 'Invite token is missing.' : null
  const [state, setState] = useState<JoinState>(initialError ? 'error' : 'ready')
  const [message, setMessage] = useState(initialError ?? '초대받은 콘텐츠에 참여하려면 아래 버튼을 눌러주세요.')

  async function joinByInviteLink() {
    if (!validId || !token) return
    setState('joining')
    setMessage('Joining content...')

    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${contentId}/members/join?token=${encodeURIComponent(token)}`,
        { method: 'POST' },
      )

      if (res.ok) {
        setState('success')
        setMessage('Joined successfully. Moving to the content page...')
        window.setTimeout(() => {
          router.replace(`/content/${contentId}`)
        }, 900)
        return
      }

      const json = await res.json().catch(() => null)
      const code = json?.code ?? json?.errorCode ?? ''

      if (res.status === 401 || res.status === 403) {
        setMessage('Login is required. Moving to login...')
        router.replace(`/login?next=${encodeURIComponent(`/content/${contentId}/join?token=${token}`)}`)
        return
      }

      if (code === 'ALREADY_MEMBER') {
        setState('success')
        setMessage('You are already a member. Moving to the content page...')
        window.setTimeout(() => {
          router.replace(`/content/${contentId}`)
        }, 900)
        return
      }

      setState('error')
      setMessage(json?.message ?? 'Failed to join with this invite link.')
    } catch {
      setState('error')
      setMessage('Unable to reach the server right now.')
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '18px',
          padding: '32px 28px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          color: '#fff',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(145,205,255,0.8)',
          }}
        >
          Invite Link
        </p>
        <h1
          style={{
            margin: '12px 0 10px',
            fontSize: '28px',
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {state === 'success' ? 'Access ready' : state === 'error' ? 'Join failed' : state === 'ready' ? 'Join content' : 'Checking invite'}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: '15px',
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          {message}
        </p>

        {state === 'joining' && (
          <div
            style={{
              marginTop: '22px',
              width: '28px',
              height: '28px',
              borderRadius: '999px',
              border: '2px solid rgba(255,255,255,0.14)',
              borderTopColor: '#1C5AFF',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}

        {state === 'ready' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={joinByInviteLink}
              style={{
                padding: '11px 18px',
                borderRadius: '10px',
                border: 'none',
                background: '#1C5AFF',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              참여하기
            </button>
          </div>
        )}

        {state === 'error' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => router.replace(validId ? `/content/${contentId}` : '/content')}
              style={{
                padding: '11px 18px',
                borderRadius: '10px',
                border: 'none',
                background: '#1C5AFF',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Go to content
            </button>
            <Link
              href="/content"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '11px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'rgba(255,255,255,0.82)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Back to list
            </Link>
          </div>
        )}
      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </main>
  )
}
