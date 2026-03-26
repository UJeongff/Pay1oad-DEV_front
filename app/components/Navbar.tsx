'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-3 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(4, 13, 31, 0.75)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex-shrink-0">
        <Image
          src="/main_logo.png"
          alt="Pay1oad"
          width={130}
          height={44}
          priority
        />
      </Link>

      {/* Nav Links */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-9">
        {navLinks.filter((link) => link.href !== '/content' || !!user).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-light tracking-widest transition-colors ${
              pathname === link.href
                ? 'text-white'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* User */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {user ? (
          <>
            <NotificationBell />
            <Link
              href="/mypage"
              className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all"
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
            href="/login"
            className="flex items-center gap-2 text-sm font-light tracking-widest text-white hover:text-blue-300 transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full border border-white/60 flex-shrink-0" />
            LOGIN
          </Link>
        )}
      </div>
    </nav>
  )
}
