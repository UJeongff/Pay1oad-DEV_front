import Link from 'next/link'
import ScrollArrow from '@/app/components/ScrollArrow'
import HomePosts from '@/app/components/HomePosts'
import HomeFaq from '@/app/components/HomeFaq'
import HomeFooter from '@/app/components/HomeFooter'
import StatCounters from '@/app/components/StatCounters'
import ActivityFields from '@/app/components/ActivityFields'
import HeroTypingText from '@/app/components/HeroTypingText'
import SectionLabel from '@/app/components/SectionLabel'
import Reveal from '@/app/components/Reveal'

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

const stats = [
  { value: '24+', label: '참가 대회', sub: '국내외 CTF 대회 참가' },
  { value: '12+', label: '수상 실적', sub: '입상 및 CVE 획득 기록' },
  { value: '70+', label: '팀원', sub: '활동 중인 멤버' },
]

export default async function Home() {
  const recruitment = await getActiveRecruitment()

  // 히어로 버튼: 모집 기간엔 지원서로, 평소엔 About Us 로 보낸다.
  // - ACTIVE: systemctl 의 active 처럼 초록, 점은 고정
  // - RECRUITING: 파란 글로우의 보색인 앰버로 눈에 띄게, 점이 퍼지는 펄스(live-dot)로 "지금 열려 있음"을 강조
  const cta = recruitment
    ? {
        href: recruitment.applyUrl ?? '/recruitment',
        status: 'RECRUITING',
        label: recruitment.generation ? `${recruitment.generation}기 지원하기` : `${recruitment.title} 지원하기`,
        statusClass: 'text-[#FCD34D]',
        dotClass: 'live-dot bg-[#FBBF24] shadow-[0_0_8px_rgba(251,191,36,0.8)]',
      }
    : {
        href: '/about',
        status: 'ACTIVE',
        label: '둘러보기',
        statusClass: 'text-[#86EFAC]',
        dotClass: 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.8)]',
      }

  return (
    <main className="relative select-none overflow-x-hidden">
      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden flex flex-col">

        {/* Background image — 원본 PNG(2.1MB)를 화질 차이 없이 AVIF(188KB)로 변환했다.
            CSS image-set 은 빌드 때 WebP 폴백이 지워져 구형 Safari 에서 배경이 사라지므로
            <picture> 로 포맷을 고르게 한다. cover + center top 은 기존 background 지정과 같다. */}
        <picture className="absolute inset-0">
          <source srcSet="/home_background.avif" type="image/avif" />
          <img
            src="/home_background.webp"
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="h-full w-full object-cover object-top"
          />
        </picture>

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
            <p className="text-fg-subtle text-sm font-medium tracking-[0.22em] mb-3 uppercase">
              Pay1oad | HACKING &amp; SECURITY
            </p>

            {/* 마지막 줄은 타이핑 중에 일부가 숨겨지므로, 스크린리더에는 제목 전체를 라벨로 준다 */}
            <h1
              aria-label="Gachon Univ. No.1 Information Security Club"
              className="leading-[1.0] uppercase"
              style={{
                fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                fontWeight: 400,
                letterSpacing: '0.05em',
                textShadow: '0 0 10px rgba(255,255,255,0.2), 0 0 20px rgba(80,140,255,0.3)',
              }}
            >
              <span className="block text-white" style={{ fontSize: 'clamp(1.5rem, 6vw, 5.2rem)' }}>
                GACHON UNIV.
              </span>

              <span
                className="flex items-center flex-wrap gap-x-3 gap-y-2"
                style={{ fontSize: 'clamp(1.5rem, 6vw, 5.2rem)', marginTop: '0.04em' }}
              >
                <span
                  className="inline-flex items-center flex-shrink-0 text-white px-3 sm:px-4"
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
                style={{ fontSize: 'clamp(1.5rem, 6vw, 5.2rem)', marginTop: '0.04em', whiteSpace: 'pre-wrap' }}
              >
                <HeroTypingText text="SECURITY CLUB" />
              </span>
            </h1>

            {/* 상태 + 행동을 한 버튼에 담는다 (systemctl status 의 상태 표기를 빌렸다)
                - 모집 기간: ● RECRUITING | N기 지원하기 → 지원서
                - 평소:     ● ACTIVE     | 둘러보기     → About Us */}
            <div className="mt-10">
              <Link
                href={cta.href}
                className="group inline-flex flex-wrap items-center border border-fg-muted bg-[#040d1f]/35 backdrop-blur-sm text-white rounded-full text-sm hover-brand transition-all duration-200"
              >
                <span className={`inline-flex items-center gap-2.5 py-3.5 pl-[22px] pr-5 font-mono text-[13px] font-medium tracking-[0.04em] group-hover:text-white transition-colors duration-200 ${cta.statusClass}`}>
                  <span aria-hidden="true" className={`w-2 h-2 rounded-full ${cta.dotClass}`} />
                  {cta.status}
                </span>
                <span aria-hidden="true" className="w-px h-[18px] bg-line-strong" />
                <span className="inline-flex items-center gap-2.5 py-3.5 pl-5 pr-[26px] font-bold tracking-[0.05em]">
                  {cta.label}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M2.5 8H13.5M13.5 8L8 2.5M13.5 8L8 13.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </div>
          </div>

          <div className="flex justify-center pb-2">
            <ScrollArrow />
          </div>
        </div>

        {/* Bottom fade into next section — 히어로 좌우와 같은 네이비로 녹여서 경계를 없앤다 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, #040d1f)',
          }}
        />
      </section>

      {/* ── 아래 섹션 전체 배경: 히어로 네이비에서 시작해 페이지 끝으로 갈수록 회색 검정으로.
            한 방향으로만 바뀌어서 중간에 톤이 꺾이지 않는다 ── */}
      <div style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #0F0F0F 100%)' }}>

      {/* ── About Us Section ─────────────────────────── */}
      <section className="py-28 px-[5vw]">
        <div className="max-w-2xl mx-auto text-center">

          {/* 라벨 → 본문 순서로 떠오른다 */}
          <Reveal>
            <SectionLabel label="About us" className="mb-6" />
          </Reveal>

          {/* Body */}
          <Reveal delay={100}>
            <p className="text-fg-muted text-base leading-[1.9] tracking-wide">
              Pay1oad는 정보보호 전문가를 꿈꾸는 사람들이 함께 모여 성장하는 공간입니다.<br />
              CTF, 보안 프로젝트, 세미나, 스터디 등 다양한 활동을 통해 실력을 쌓아갑니다.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Stats & Fields Section ───────────────────── */}
      <section className="pb-28 px-[5vw]">
        <div className="max-w-5xl mx-auto">

          {/* Stats cards — 화면에 들어오면 숫자가 빠르게 올라가 멈춘다 */}
          <StatCounters stats={stats} />

          {/* Activity fields — 누르면 설명이 펼쳐진다 */}
          <ActivityFields />
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
