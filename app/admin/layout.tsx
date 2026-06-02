'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'
const NAVBAR_HEIGHT = 68 // Navbar.tsx의 py-3 + 로고 44px 기준

const NAV = [
  {
    href: '/admin/users',
    label: '회원 관리',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M2 21c0-5 4-8 10-8s10 3 10 8" />
      </svg>
    ),
  },
  {
    href: '/admin/approvals',
    label: '가입 승인',
    badgeKey: 'pending' as const,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  {
    href: '/admin/invites',
    label: '초대 코드',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    href: '/admin/notices',
    label: '공지 관리',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
  },
  {
    href: '/admin/recruitment',
    label: '지원하기 관리',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
  },
  {
    href: '/admin/history',
    label: 'History 관리',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: '/admin/ctf',
    label: 'CTF 관리',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: '/admin/archive',
    label: 'Archive 관리',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="4" rx="1" />
        <path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState<number>(0)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (loading || !user || user.role !== 'ADMIN') return
    let cancelled = false
    const fetchCount = async () => {
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/admin/approvals/pending/count`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setPendingCount(json?.data?.count ?? 0)
      } catch {}
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30_000) // 30초마다 갱신
    return () => { cancelled = true; clearInterval(interval) }
  }, [loading, user, pathname])

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ minHeight: '100vh', background: '#040d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>불러오는 중...</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#040d1f', display: 'flex', paddingTop: NAVBAR_HEIGHT }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 16px',
        position: 'sticky',
        top: NAVBAR_HEIGHT,
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', textDecoration: 'none' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
          }}>
            Pay1oad
          </span>
          <span style={{
            fontSize: '10px', padding: '1px 7px', borderRadius: '4px',
            background: 'rgba(28,90,255,0.25)', color: '#7aa3ff',
            border: '1px solid rgba(28,90,255,0.4)', fontWeight: 700, letterSpacing: '0.1em',
          }}>
            ADMIN
          </span>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV.map((item) => {
            const { href, label, icon } = item
            const badgeKey = 'badgeKey' in item ? item.badgeKey : undefined
            const active = pathname.startsWith(href)
            const badgeValue = badgeKey === 'pending' && pendingCount > 0 ? pendingCount : 0
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px',
                  textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(28,90,255,0.2)' : 'transparent',
                  border: active ? '1px solid rgba(28,90,255,0.35)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ color: active ? '#7aa3ff' : 'rgba(255,255,255,0.3)' }}>{icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {badgeValue > 0 && (
                  <span style={{
                    minWidth: '20px', height: '18px', padding: '0 6px',
                    borderRadius: '9px', fontSize: '11px', fontWeight: 700,
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 0 1px rgba(239,68,68,0.25)',
                  }}>
                    {badgeValue > 99 ? '99+' : badgeValue}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div style={{
          marginTop: 'auto', padding: '12px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>관리자</p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{user.nickname}</p>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '36px 40px' }}>
        {children}
      </main>
    </div>
  )
}
