'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthContext } from '@/app/context/AuthContext'

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

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.replace('/')
    }
  }, [loading, user, router])

  if (loading || !user || user.role !== 'ADMIN') {
    return (
      <div style={{ minHeight: '100vh', background: '#040d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>불러오는 중...</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#040d1f', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 16px',
        position: 'sticky',
        top: 0,
        height: '100vh',
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
          {NAV.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href)
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
                {label}
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
