'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { usePendingApprovals } from '@/app/lib/usePendingApprovals'
import { API_URL, Dot, TermSpin } from './_components/AdminUI'

// 터미널 콘솔: 사이드바는 ~/admin/ 아래 폴더 목록, 맨 아래는 편집기 상태 줄처럼 "누구로 · 사이트로 · 로그아웃".
// 좁은 화면에선 사이드바 대신 가로로 넘기는 탭.
const NAV = [
  { slug: 'users', label: '회원 관리' },
  { slug: 'approvals', label: '가입 승인', badge: true },
  { slug: 'invites', label: '초대 코드' },
  { slug: 'notices', label: '공지 관리' },
  { slug: 'recruitment', label: '모집 공고' },
  { slug: 'history', label: '연혁' },
  { slug: 'ctf', label: 'CTF' },
  { slug: 'archive', label: '아카이브' },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, clearUser } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = !loading && user?.role === 'ADMIN'
  // 승인 화면에서 처리하면 notifyPendingApprovalsChanged() 로 바로 다시 읽는다
  const pending = usePendingApprovals(isAdmin)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) router.replace('/')
  }, [loading, user, router])

  async function logout() {
    setLoggingOut(true)
    try {
      await fetchWithAuth(`${API_URL}/v1/auth/logout`, { method: 'POST' }).catch(() => {})
    } finally {
      clearUser()
      router.push('/')
    }
  }

  if (!isAdmin || !user) {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center bg-[#040d1f] font-mono text-[13px] text-fg-subtle">
        <span><span className="text-brand-soft">$</span> auth check <TermSpin className="text-status-soon-text" /></span>
      </div>
    )
  }

  const isActive = (slug: string) => pathname === `/admin/${slug}` || pathname.startsWith(`/admin/${slug}/`)

  return (
    <div className="min-h-screen bg-[#040d1f] pt-[90px] pb-[30px]">
      {/* 모바일: 가로 탭 */}
      <nav aria-label="관리 메뉴" className="sticky top-[90px] z-20 flex gap-1.5 overflow-x-auto border-b border-line bg-[#030a19] px-3.5 py-3 font-mono text-xs [scrollbar-width:none] md:hidden">
        {NAV.map((n) => {
          const on = isActive(n.slug)
          return (
            <Link
              key={n.slug}
              href={`/admin/${n.slug}`}
              aria-current={on ? 'page' : undefined}
              aria-label={n.label}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${on ? 'bg-brand/14 text-white' : 'text-fg-subtle'}`}
            >
              {n.slug}/
              {'badge' in n && pending > 0 && <span className="flex items-center gap-1 text-status-soon-text"><Dot tone="soon" />{pending > 99 ? '99+' : pending}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="flex">
        {/* 데스크톱: 폴더식 사이드바 */}
        <aside className="sticky top-[90px] hidden h-[calc(100vh-120px)] w-[200px] shrink-0 border-r border-line bg-[#030a19] px-3 py-5 font-mono text-[13px] md:block">
          <p className="mb-3 ml-2 text-[11px] tracking-[0.14em] text-fg-faint">~/admin/</p>
          <nav aria-label="관리 메뉴" className="flex flex-col gap-0.5">
            {NAV.map((n) => {
              const on = isActive(n.slug)
              return (
                <Link
                  key={n.slug}
                  href={`/admin/${n.slug}`}
                  aria-current={on ? 'page' : undefined}
                  aria-label={n.label}
                  title={n.label}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on ? 'bg-brand/14 text-white' : 'text-fg-subtle hover:bg-surface hover:text-white'}`}
                >
                  <span><span aria-hidden="true" className={on ? 'text-brand-soft' : 'invisible'}>› </span>{n.slug}/</span>
                  {'badge' in n && pending > 0 && (
                    <span className="flex items-center gap-1.5 text-status-soon-text"><Dot tone="soon" />{pending > 99 ? '99+' : pending}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-7 md:py-[26px]">{children}</main>
      </div>

      {/* 하단 상태 줄 */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex h-[30px] items-center justify-between gap-3 border-t border-line bg-[#030a19] px-4 font-mono text-[11px] text-fg-subtle">
        <span className="flex min-w-0 items-center gap-2 truncate">
          <Dot tone="live" />
          <span className="truncate">{user.nickname}@pay1oad · ADMIN</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <Link href="/" className="transition-colors hover:text-white">사이트로 ↗</Link>
          <span aria-hidden="true" className="text-fg-faint">·</span>
          <button type="button" onClick={logout} disabled={loggingOut} className="cursor-pointer transition-colors hover:text-white disabled:opacity-50">
            {loggingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
        </span>
      </div>
    </div>
  )
}
