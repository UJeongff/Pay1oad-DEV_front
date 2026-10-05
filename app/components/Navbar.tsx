'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import { useEffect, useState } from 'react'
import { usePendingApprovals } from '@/app/lib/usePendingApprovals'
import NotificationBell from '@/app/components/NotificationBell'

const navLinks = [
  { label: 'ABOUT US', href: '/about' },
  { label: 'BLOG', href: '/blog' },
  { label: 'CONTENT', href: '/content' },
  { label: 'CTF', href: '/ctf' },
  { label: 'ARCHIVE', href: '/archive' },
]

export default function Navbar() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // 승인 대기자가 있으면 콘솔 버튼에 숫자를 띄운다 — 관리자 페이지에 들어가 봐야 아는 건 늦다
  const pendingApprovals = usePendingApprovals(user?.role === 'ADMIN')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 라우트 변경 시 모바일 메뉴 닫기 (렌더 중 이전 값과 비교해 조정)
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMobileOpen(false)
  }

  // /admin 경로는 사이드바 영역과 겹치므로 항상 불투명
  const forceSolid = scrolled || mobileOpen || pathname.startsWith('/admin')
  const navBg = forceSolid ? 'rgba(4, 13, 31, 0.95)' : 'transparent'
  const navBlur = forceSolid ? 'blur(16px)' : 'none'
  // 테두리 값은 globals.css 의 --color-line(흰색 10%)과 같다
  const navBorder = forceSolid ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'

  const visibleLinks = navLinks.filter((link) => link.href !== '/content' || !!user)

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: navBg,
        backdropFilter: navBlur,
        WebkitBackdropFilter: navBlur,
        borderBottom: navBorder,
      }}
    >
      {/* ── 상단 바 ──
          데스크톱은 [로고 | 메뉴 | 오른쪽] 3칸 그리드. 양옆 칸을 같은 1fr 로 두어
          오른쪽 영역(관리자 CONSOLE 등)이 넓어져도 메뉴가 화면 정가운데에 남는다.
          메뉴 칸은 minmax(0, max-content) 라 공간이 모자랄 때만 줄어든다. */}
      <div className="flex items-center justify-between md:grid md:grid-cols-[1fr_minmax(0,max-content)_1fr] px-6 md:px-10 py-3">

        {/* Logo */}
        <Link href="/" className="flex-shrink-0 justify-self-start">
          <Image
            src="/main_logo.png"
            alt="Pay1oad"
            width={130}
            height={44}
            priority
          />
        </Link>

        {/* Nav Links — 데스크톱 */}
        <div className="hidden md:flex justify-center items-center gap-7 min-w-0 mx-4 overflow-hidden">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-light tracking-widest transition-colors ${
                pathname === link.href
                  ? 'text-white'
                  : 'text-fg-subtle hover:text-fg-muted'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* 오른쪽 영역 */}
        <div className="flex-shrink-0 justify-self-end flex items-center gap-2">
          {/* User — 데스크톱 */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 px-3 py-2 rounded-full border transition-all"
                    style={{
                      borderColor: 'rgba(245,158,11,0.4)',
                      background: 'rgba(245,158,11,0.08)',
                      color: '#fbbf24',
                    }}
                    title="관리자 콘솔"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" />
                    </svg>
                    <span className="text-xs font-bold tracking-wider">CONSOLE</span>
                    {pendingApprovals > 0 && (
                      <span
                        className="flex items-center justify-center text-[10px] font-bold rounded-full"
                        style={{
                          minWidth: '18px', height: '18px', padding: '0 5px',
                          background: '#ef4444', color: '#fff',
                        }}
                        title={`승인 대기 ${pendingApprovals}명`}
                        aria-label={`승인 대기 ${pendingApprovals}명`}
                      >
                        {pendingApprovals > 99 ? '99+' : pendingApprovals}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  href="/mypage"
                  className="flex items-center gap-3 px-4 py-2 rounded-full border border-line-strong hover:border-fg-faint hover:bg-surface-raised transition-all"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={user.role === 'ADMIN' ? {
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      boxShadow: '0 0 6px rgba(245,158,11,0.8)',
                    } : {
                      background: 'linear-gradient(135deg, #4ade80, #16a34a)',
                      boxShadow: '0 0 6px rgba(74,222,128,0.8)',
                    }}
                  />
                  <span className="text-sm font-semibold tracking-widest text-white">
                    {user.nickname} {user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'}
                  </span>
                </Link>
              </>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="flex items-center gap-2 text-sm font-light tracking-widest text-white hover:text-blue-300 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full border border-fg-subtle flex-shrink-0" />
                LOGIN
              </Link>
            )}
          </div>

          {/* 햄버거 버튼 — 모바일 */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="메뉴"
          >
            <span
              className="block h-px w-6 bg-white transition-all duration-300 origin-center"
              style={{ transform: mobileOpen ? 'translateY(4px) rotate(45deg)' : 'none' }}
            />
            <span
              className="block h-px w-6 bg-white transition-all duration-300"
              style={{ opacity: mobileOpen ? 0 : 1 }}
            />
            <span
              className="block h-px w-6 bg-white transition-all duration-300 origin-center"
              style={{ transform: mobileOpen ? 'translateY(-4px) rotate(-45deg)' : 'none' }}
            />
          </button>
        </div>
      </div>

      {/* ── 모바일 드롭다운 메뉴 ── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: mobileOpen ? '400px' : '0' }}
      >
        <div className="flex flex-col px-6 pb-5 pt-1 gap-1 border-t border-line">
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`py-3 text-sm font-light tracking-widest transition-colors border-b border-line ${
                pathname === link.href ? 'text-white' : 'text-fg-subtle hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* 모바일 유저 영역 */}
          <div className="pt-3">
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 py-3 mb-1 border-b border-line"
                style={{ color: '#fbbf24' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" />
                </svg>
                <span className="text-xs font-bold tracking-wider">CONSOLE — 관리자 콘솔</span>
                {pendingApprovals > 0 && (
                  <span
                    className="flex items-center justify-center text-[10px] font-bold rounded-full"
                    style={{
                      minWidth: '18px', height: '18px', padding: '0 5px',
                      background: '#ef4444', color: '#fff',
                    }}
                    aria-label={`승인 대기 ${pendingApprovals}명`}
                  >
                    {pendingApprovals > 99 ? '99+' : pendingApprovals}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/mypage"
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={user.role === 'ADMIN' ? {
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      boxShadow: '0 0 6px rgba(245,158,11,0.8)',
                    } : {
                      background: 'linear-gradient(135deg, #4ade80, #16a34a)',
                      boxShadow: '0 0 6px rgba(74,222,128,0.8)',
                    }}
                  />
                  <span className="text-sm font-semibold tracking-widest text-white">
                    {user.nickname} {user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'}
                  </span>
                </Link>
                <NotificationBell />
              </div>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="flex items-center gap-2 text-sm font-light tracking-widest text-fg-muted hover:text-white transition-colors py-2"
              >
                <span className="w-2.5 h-2.5 rounded-full border border-fg-subtle flex-shrink-0" />
                LOGIN
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
