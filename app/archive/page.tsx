'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'

const ARCHIVE_YEARS = [2018, 2022, 2023, 2024, 2025]

function FolderIcon({ year, onNavigate, menuOpen, onMenuToggle }: {
  year: number
  onNavigate: () => void
  menuOpen: boolean
  onMenuToggle: () => void
}) {
  const gradFillId = `fg-fill-${year}`
  const gradStrokeId = `fg-stroke-${year}`

  return (
    <div
      className="relative group cursor-pointer select-none transition-transform duration-300 hover:scale-[1.03] mx-auto"
      style={{ width: '220px', height: '175px' }}
      onClick={onNavigate}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="282" height="226" viewBox="0 0 282 226" fill="none"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id={gradFillId} x1="141" y1="-8.44531" x2="141" y2="225.086" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0041EF"/>
            <stop offset="1" stopColor="#02174E"/>
          </linearGradient>
          <linearGradient id={gradStrokeId} x1="267.312" y1="19.8281" x2="2.79213e-05" y2="243.813" gradientUnits="userSpaceOnUse">
            <stop/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1"/>
          </linearGradient>
        </defs>
        <path d="M0 14.6875C0 6.57581 6.57582 0 14.6875 0H84.3267C89.2248 0 93.8005 2.44165 96.5274 6.51041L104.388 18.2396C111.206 28.4115 122.645 34.5156 134.89 34.5156H233.531H267.312C275.424 34.5156 282 41.0914 282 49.2031V210.398C282 218.51 275.424 225.086 267.312 225.086H14.6875C6.57581 225.086 0 218.51 0 210.398V14.6875Z" fill={`url(#${gradFillId})`}/>
        <path d="M14.6875 0.367188H84.3271C89.1026 0.367339 93.564 2.74793 96.2227 6.71484L104.083 18.4443C110.969 28.718 122.523 34.8828 134.891 34.8828H267.312C275.221 34.8828 281.633 41.2942 281.633 49.2031V210.398C281.633 218.307 275.221 224.719 267.312 224.719H14.6875C6.77861 224.719 0.367188 218.307 0.367188 210.398V14.6875C0.367188 6.77861 6.77861 0.367188 14.6875 0.367188Z" stroke={`url(#${gradStrokeId})`} strokeOpacity="0.5" strokeWidth="0.734375"/>
      </svg>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '20px 20px 24px' }}>
        {/* Top: three-dot menu */}
        <div className="relative flex justify-end" style={{ paddingTop: '25px' }}>
          <button
            onClick={e => { e.stopPropagation(); onMenuToggle() }}
            style={{ width: '16px', height: '16px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11.8917" cy="4.42536" r="1.75886" fill="white"/>
              <circle cx="11.8917" cy="12.1112" r="1.75886" fill="white"/>
              <circle cx="11.8917" cy="19.7969" r="1.75886" fill="white"/>
            </svg>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-6 z-50 flex flex-col gap-1 p-1.5 rounded-lg min-w-[120px]"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-2 text-xs font-medium text-white rounded-md transition-colors"
                style={{ background: 'rgba(36,36,36,0.8)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(36,36,36,1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(36,36,36,0.8)')}
                onClick={() => onMenuToggle()}
              >
                수정하기
              </button>
              <button
                className="w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors"
                style={{ background: 'rgba(36,36,36,0.8)', color: '#f87171' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(36,36,36,1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(36,36,36,0.8)')}
                onClick={() => onMenuToggle()}
              >
                삭제하기
              </button>
            </div>
          )}
        </div>

        {/* Bottom: Archive label + year */}
        <div className="flex flex-col">
          <span
            style={{
              color: '#FFF',
              fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
              fontSize: '12px',
              fontWeight: 200,
              lineHeight: '150%',
              letterSpacing: '-0.32px',
            }}
          >
            Archive
          </span>
          <p
            style={{
              color: '#FFF',
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              fontSize: '30px',
              fontWeight: 400,
              lineHeight: '150%',
              letterSpacing: '-0.8px',
              margin: 0,
            }}
          >
            {year}
          </p>
        </div>
      </div>
    </div>
  )
}

function AddFolderCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="relative group cursor-pointer select-none mx-auto transition-transform duration-300 hover:scale-[1.03]"
      onClick={onClick}
      style={{ width: '220px', height: '175px' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="282" height="226" viewBox="0 0 282 226" fill="none"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <path
          d="M0 14.6875C0 6.57581 6.57582 0 14.6875 0H84.3267C89.2248 0 93.8005 2.44165 96.5274 6.51041L104.388 18.2396C111.206 28.4115 122.645 34.5156 134.89 34.5156H233.531H267.312C275.424 34.5156 282 41.0914 282 49.2031V210.398C282 218.51 275.424 225.086 267.312 225.086H14.6875C6.57581 225.086 0 218.51 0 210.398V14.6875Z"
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          strokeDasharray="10 6"
          className="group-hover:stroke-white/40 transition-all"
        />
        {/* + icon inside SVG, centered in the body area */}
        <text
          x="141"
          y="130"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize="48"
          fontWeight="100"
          className="group-hover:fill-white/55 transition-all"
        >
          +
        </text>
      </svg>
    </div>
  )
}

export default function ArchivePage() {
  const { user } = useAuthContext()
  const router = useRouter()
  const isAdmin = user?.role === 'ADMIN'
  const [openMenuYear, setOpenMenuYear] = useState<number | null>(null)

  useEffect(() => {
    const handler = () => setOpenMenuYear(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>

      {/* Background */}
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

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center pt-46 pb-25 px-6">

        {/* Asterisk + Title */}
        <div className="relative z-10 flex flex-col items-start mb-5">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="mb-2 ml-1">
            <path
              d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
              stroke="#1C5AFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
          <h1
            className="text-white font-black uppercase"
            style={{
              fontSize: 'clamp(3.5rem, 8vw, 6rem)',
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            ARCHIVE
          </h1>
        </div>

        <p
          className="relative z-10 text-white/75 font-medium mb-3"
          style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}
        >
          지난 활동들을 보관하는 공간입니다.
        </p>
        <p className="relative z-10 text-white/40 text-sm leading-relaxed">
          * 타인에 대한 비방, 욕설, 저작권 침해 등 부적절한 내용을 포함한 게시물은<br />
          서비스 운영 원칙에 따라 사전 고지 없이 삭제될 수 있습니다.
        </p>
      </section>

      {/* ── Section Header ──────────────────────────── */}
      <div
        style={{
          width: '100%',
          height: '49px',
          background: 'rgba(0, 65, 239, 0.4)',
          borderRadius: '100px 100px 0 0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 0 0 80px',
        }}
      >
        <span className="text-white text-sm font-medium tracking-widest">Archive</span>
      </div>

      {/* ── Folder Grid ─────────────────────────────── */}
      <section
        className="relative py-12 pb-32"
        style={{ background: 'rgba(0, 65, 239, 0.05)' }}
      >
        <div className="max-w-5xl mx-auto px-[5vw]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-5">
            {ARCHIVE_YEARS.map(year => (
              <div key={year} className="flex justify-center">
                <FolderIcon
                  year={year}
                  onNavigate={() => router.push(`/archive/${year}`)}
                  menuOpen={openMenuYear === year}
                  onMenuToggle={() => setOpenMenuYear(openMenuYear === year ? null : year)}
                />
              </div>
            ))}

            {/* Add new archive (admin only) */}
            {isAdmin && (
              <div className="flex justify-center">
                <AddFolderCard onClick={() => router.push('/archive/new')} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <HomeFooter />
    </main>
  )
}
