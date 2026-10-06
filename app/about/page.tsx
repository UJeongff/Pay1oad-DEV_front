import Image from 'next/image'
import type { CSSProperties } from 'react'
import HistorySection from '@/app/components/HistorySection'
import ContactCards from '@/app/components/ContactCards'
import RulesSection from '@/app/components/RulesSection'
import HomeFooter from '@/app/components/HomeFooter'
import AboutIntro from '@/app/components/AboutIntro'
import { RevealToggle } from '@/app/components/Reveal'
import WipeHeading from '@/app/components/WipeHeading'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

interface Recruitment {
  id: number
  title: string
  applyUrl: string | null
  startAt: string
  endAt: string
  isActive: boolean
  status?: 'RECRUITING' | 'UPCOMING' | 'CLOSED'
  generation?: number
}

async function getActiveRecruitment(): Promise<Recruitment | null> {
  try {
    const res = await fetch(`${API_URL}/v1/admin/recruitment`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const list: Recruitment[] = data.data ?? data
    const now = new Date()
    return list.find((r) =>
      (r.status === 'RECRUITING' || (!r.status && r.isActive)) &&
      new Date(r.startAt) <= now && now <= new Date(r.endAt)
    ) ?? null
  } catch {
    return null
  }
}

/** 목표 아이콘을 0.15초 간격으로 차례로 그린다 */
const drawDelay = (i: number) => ({ '--draw-delay': `${i * 150}ms` }) as CSSProperties

export default async function AboutPage() {
  const recruitment = await getActiveRecruitment()
  return (
    <main className="relative select-none" style={{ background: 'linear-gradient(to bottom, #0F0F0F, #0B101E)' }}>

      {/* ── Hero Section ──────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden min-h-[480px] h-[75vh]">

        {/* Background Image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/aboutus.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Dark Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0, 0, 0, 0.55)' }}
        />

        {/* Center Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <Image
            src="/main_logo.png"
            alt="Pay1oad"
            width={300}
            height={300}
            className="mb-8 drop-shadow-2xl"
            priority
          />
          <h1
            className="text-white font-bold mb-3"
            style={{
              fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
              letterSpacing: '0.04em',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            가천대학교 No.1 정보보호동아리, Pay1oad
          </h1>
          <p
            className="text-fg-subtle leading-relaxed text-sm sm:text-base"
            style={{ maxWidth: '640px', wordBreak: 'keep-all' }}
          >
            우리는 정보보호 전문가를 꿈꾸는 사람들과 함께 모여 실력을 갈고닦는 공간입니다.
            <br></br>
            CTF, 보안 프로젝트, 세미나, 스터디 등 다양한 활동을 통해 실력을 쌓아갑니다.
          </p>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #0F0F0F)' }}
        />
      </section>

      {/* ── About Section: 이름 유래 사전 카드 + 소개 ─────── */}
      <AboutIntro applyUrl={recruitment?.applyUrl ?? null} />

      {/* ── Our Goal Section ──────────────────────────── */}
      <section className="relative pb-40 px-[5vw] overflow-hidden">
        {/* Circular glow background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/aboutus_background.png)',
            backgroundSize: '70%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 30%, transparent 75%)',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto">

          {/* Title */}
          <div className="flex justify-center mb-12">
            <span className="border border-line-strong text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
              OUR GOAL
            </span>
          </div>

          {/* 화면에 들어오면 아이콘이 펜으로 그리듯 차례로 그려진다 (globals.css 의 .goal-draw) */}
          <RevealToggle className="goal-draw" onClass="is-drawn" threshold={0.5}>
          {/* Top row: 3 goals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true" className="mb-5 opacity-90" style={drawDelay(0)}>
                <circle className="fill-in" cx="26" cy="26" r="4" fill="white"/>
                <circle className="fill-in" cx="8"  cy="14" r="3" fill="white"/>
                <circle className="fill-in" cx="44" cy="14" r="3" fill="white"/>
                <circle className="fill-in" cx="8"  cy="38" r="3" fill="white"/>
                <circle className="fill-in" cx="44" cy="38" r="3" fill="white"/>
                <circle className="fill-in" cx="26" cy="6"  r="3" fill="white"/>
                <circle className="fill-in" cx="26" cy="46" r="3" fill="white"/>
                <line pathLength="100" x1="26" y1="26" x2="8"  y2="14" stroke="white" strokeWidth="1.5"/>
                <line pathLength="100" x1="26" y1="26" x2="44" y2="14" stroke="white" strokeWidth="1.5"/>
                <line pathLength="100" x1="26" y1="26" x2="8"  y2="38" stroke="white" strokeWidth="1.5"/>
                <line pathLength="100" x1="26" y1="26" x2="44" y2="38" stroke="white" strokeWidth="1.5"/>
                <line pathLength="100" x1="26" y1="26" x2="26" y2="6"  stroke="white" strokeWidth="1.5"/>
                <line pathLength="100" x1="26" y1="26" x2="26" y2="46" stroke="white" strokeWidth="1.5"/>
              </svg>
              <p className="text-fg-muted text-base leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                가천대학교 내 정보보안<br />
                지식 교류의 <strong className="text-white font-semibold">중심</strong>이 되는 것
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true" className="mb-5 opacity-90" style={drawDelay(1)}>
                <rect pathLength="100" x="8" y="6" width="36" height="28" rx="2" stroke="white" strokeWidth="2" fill="none"/>
                <line pathLength="100" x1="26" y1="34" x2="26" y2="44" stroke="white" strokeWidth="2"/>
                <line pathLength="100" x1="16" y1="44" x2="36" y2="44" stroke="white" strokeWidth="2"/>
                <line pathLength="100" x1="14" y1="20" x2="26" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line pathLength="100" x1="26" y1="12" x2="38" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle pathLength="100" cx="26" cy="23" r="4" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
              <p className="text-fg-muted text-base leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                단계별 보안 커리큘럼을 통해<br />
                <strong className="text-white font-semibold">체계적인 학습</strong> 제공
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true" className="mb-5 opacity-90" style={drawDelay(2)}>
                <path pathLength="100" d="M8 10 C8 10 18 8 26 14 C34 8 44 10 44 10 L44 40 C44 40 34 38 26 44 C18 38 8 40 8 40 Z" stroke="white" strokeWidth="2" fill="none"/>
                <line pathLength="100" x1="26" y1="14" x2="26" y2="44" stroke="white" strokeWidth="2"/>
              </svg>
              <p className="text-fg-muted text-base leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                <strong className="text-white font-semibold">세미나·컨퍼런스</strong>를 통한<br />
                활발한 지식 공유
              </p>
            </div>
          </div>

          {/* Bottom row: 2 goals centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-2xl mx-auto">

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true" className="mb-5 opacity-90" style={drawDelay(3)}>
                <path pathLength="100" d="M16 6 H36 C36 6 40 18 26 24 C12 18 16 6 16 6Z" stroke="white" strokeWidth="2" fill="none"/>
                <line pathLength="100" x1="26" y1="24" x2="26" y2="36" stroke="white" strokeWidth="2"/>
                <line pathLength="100" x1="16" y1="36" x2="36" y2="36" stroke="white" strokeWidth="2"/>
                <rect pathLength="100" x="12" y="36" width="28" height="6" rx="2" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
              <p className="text-fg-muted text-base leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                팀 단위의 CTF 및<br />
                각종 대회 출전으로 <strong className="text-white font-semibold">실전 경험 축적</strong>
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true" className="mb-5 opacity-90" style={drawDelay(4)}>
                <circle pathLength="100" cx="18" cy="16" r="7" stroke="white" strokeWidth="2" fill="none"/>
                <circle pathLength="100" cx="34" cy="16" r="7" stroke="white" strokeWidth="2" fill="none"/>
                <path pathLength="100" d="M6 44 C6 34 12 30 18 30 C22 30 25 32 26 33" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <path pathLength="100" d="M46 44 C46 34 40 30 34 30 C30 30 27 32 26 33" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              <p className="text-fg-muted text-base leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                <strong className="text-white font-semibold">선후배 간 네트워크 구축</strong>으로<br />
                장기적인 성장 기반 마련
              </p>
            </div>

          </div>
          </RevealToggle>

        </div>
      </section>

      {/* ── History Section ────────────────────────────── */}
      <HistorySection />

      {/* ── Rules Section ───────────────────────────────── */}
      <RulesSection />

      {/* ── Contact Section: 태그라인을 제목으로 올려 페이지를 닫는다 ─── */}
      <section className="pb-40 px-[5vw]">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <span className="mb-6 border border-line-strong text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
            CONTACT
          </span>
          {/* 화면에 들어오면 파란 막대가 지나가며 제목이 열린다 */}
          <WipeHeading
            className="mb-4 text-white leading-[1.1] tracking-[0.01em]"
            style={{
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(1.9rem, 4vw, 3.25rem)',
            }}
          >
            Together, We Are Pay1oad.
          </WipeHeading>
          <p className="mb-12 text-fg-subtle text-base leading-[1.8]" style={{ wordBreak: 'keep-all' }}>
            보안을 배우고, 실무를 경험하며, 함께 성장하는 공간.<br />
            궁금한 점이나 협업·행사 제안은 아래 채널로 언제든 연락해 주세요.
          </p>
          <ContactCards />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <HomeFooter />

    </main>
  )
}
