import Link from 'next/link'
import ScrollArrow from '@/app/components/ScrollArrow'
import HomePosts from '@/app/components/HomePosts'
import HomeFaq from '@/app/components/HomeFaq'
import HomeFooter from '@/app/components/HomeFooter'
import { Suspense } from 'react'
import GoogleLinkedToast from '@/app/components/GoogleLinkedToast'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Recruitment {
  id: number
  title: string
  applyUrl: string | null
  startAt: string
  endAt: string
  isActive: boolean
}

async function getActiveRecruitment(): Promise<Recruitment | null> {
  try {
    const res = await fetch(`${API_URL}/v1/admin/recruitment`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const list: Recruitment[] = data.data ?? data
    const now = new Date()
    return list.find((r) => r.isActive && new Date(r.startAt) <= now && now <= new Date(r.endAt)) ?? null
  } catch {
    return null
  }
}

const stats = [
  { value: '24+', label: '참가 대회', sub: '국내외 CTF 대회 참가' },
  { value: '12+', label: '수상 실적', sub: '입상 및 CVE 획득 기록' },
  { value: '70+', label: '팀원', sub: '활동 중인 멤버' },
]

const fields = [
  'Web Hacking', 'Pwnable', 'Reverse Engineering', 'Cryptography',
  'Forensics', 'Development',
]

export default async function Home() {
  const recruitment = await getActiveRecruitment()
  return (
    <main className="relative select-none">
      <Suspense>
        <GoogleLinkedToast />
      </Suspense>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden flex flex-col">

        {/* Background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/home_background.png)',
            backgroundSize: '130%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Edge gradient overlays — fade image into page background on all sides */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            linear-gradient(to right,  #040d1f 0%, transparent 18%, transparent 82%, #040d1f 100%),
            linear-gradient(to bottom, #040d1f 0%, transparent 15%, transparent 80%, #040d1f 100%)
          `,
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col min-h-screen px-[5vw] pt-28 pb-10">

          <div className="flex-1 flex flex-col justify-center">
            <p className="text-white/60 text-sm font-medium tracking-[0.22em] mb-3 uppercase">
              Pay1oad | HACKING &amp; SECURITY
            </p>

            <h1
              className="leading-[1.0] uppercase"
              style={{
                fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                fontWeight: 400,
                letterSpacing: '0.05em',
                textShadow: '0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(80,140,255,0.3)',
              }}
            >
              <span className="block text-white" style={{ fontSize: 'clamp(2rem, 4.8vw, 5.2rem)' }}>
                GACHON UNIV.
              </span>

              <span
                className="flex items-center gap-3"
                style={{ fontSize: 'clamp(2rem, 4.8vw, 5.2rem)', marginTop: '0.04em' }}
              >
                <span
                  className="inline-flex items-center flex-shrink-0 text-white px-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(80,120,255,0.55) 0%, rgba(40,80,220,0.45) 100%)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '16px',
                    lineHeight: '1.1',
                    paddingTop: '0.05em',
                    paddingBottom: '0.05em',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(30,60,200,0.35), 0 2px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  NO.1
                </span>
                <span className="text-white">INFORMATION</span>
              </span>

              <span
                className="block text-white"
                style={{ fontSize: 'clamp(2rem, 4.8vw, 5.2rem)', marginTop: '0.04em' }}
              >
                SECURITY CLUB
              </span>
            </h1>

            {recruitment && (
              <div className="mt-10">
                <Link
                  href={recruitment.applyUrl ?? '/recruitment'}
                  className="inline-flex items-center gap-3 border border-white/80 text-white rounded-full px-7 py-3.5 text-sm font-semibold tracking-wider hover-brand transition-all duration-200"
                >
                  {recruitment.title} 지원하러가기
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2.5 8H13.5M13.5 8L8 2.5M13.5 8L8 13.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          <div className="flex justify-center pb-2">
            <ScrollArrow />
          </div>
        </div>

        {/* Bottom fade into next section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, #0F0F0F)',
          }}
        />
      </section>

      {/* ── Gradient background wrapper (About + Stats) ── */}
      <div style={{ background: 'linear-gradient(to bottom, #0F0F0F 0%, #0E1323 100%)' }}>

      {/* ── About Us Section ─────────────────────────── */}
      <section className="py-28 px-[5vw]">
        <div className="max-w-2xl mx-auto text-center">

          {/* Label */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
                stroke="#1C5AFF"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-white text-base font-bold tracking-widest uppercase">
              About us
            </span>
          </div>

          {/* Body */}
          <p className="text-white/80 text-base leading-[1.9] tracking-wide">
            Pay1oad는 정보보호 전문가를 꿈꾸는 사람들이 함께 모여 성장하는 공간입니다.<br />
            CTF, 보안 프로젝트, 세미나, 스터디 등 다양한 활동을 통해 실력을 쌓아갑니다.
          </p>
        </div>
      </section>

      {/* ── Stats & Fields Section ───────────────────── */}
      <section className="pb-28 px-[5vw]">
        <div className="max-w-5xl mx-auto">

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-30 mt-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 px-8 py-10 text-center transition-all duration-200 hover-brand cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <p
                  className="font-bold mb-2"
                  style={{ fontSize: 'clamp(2.4rem, 4vw, 3.5rem)', color: '#1C5AFF' }}
                >
                  {s.value}
                </p>
                <p className="text-white text-lg font-semibold mb-1">{s.label}</p>
                <p className="text-white/40 text-sm">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Activity fields */}
          <div className="mt-25">
            <h3 className="text-xl font-bold mb-6" style={{ color: '#1C5AFF' }}>
              주요 활동 분야
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {fields.map((f) => (
                <span
                  key={f}
                  className="border border-white/15 text-white/75 text-sm rounded-xl py-2.5 text-center transition-all duration-200 hover-brand cursor-default"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Posts Section ────────────────────────────── */}
      <HomePosts />

      {/* ── FAQ Section ──────────────────────────────── */}
      <HomeFaq />

      {/* ── Footer ───────────────────────────────────── */}
      <HomeFooter />

      </div>{/* ── end gradient wrapper ── */}

    </main>
  )
}
