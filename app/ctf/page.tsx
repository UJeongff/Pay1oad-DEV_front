'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import HomeFooter from '@/app/components/HomeFooter'

interface CtfEvent {
  id: number
  title: string
  image: string
  status: 'ongoing' | 'upcoming' | 'ended'
  startDate: string
  endDate: string
  participants: number
  link?: string
}

const CTF_EVENTS: CtfEvent[] = [
  {
    id: 1,
    title: '2025 S-개발자 3기 교육생 모집',
    image: '/ctf1.jpg',
    status: 'ongoing',
    startDate: '2026.03.02',
    endDate: '2026.03.22',
    participants: 16,
  },
  {
    id: 2,
    title: 'KNIGHTS 나이츠 모집공고',
    image: '/ctf2.jpg',
    status: 'ongoing',
    startDate: '2026.03.02',
    endDate: '2026.03.19',
    participants: 16,
  },
  {
    id: 3,
    title: 'ENKI REDTEAM CTF\n2026 엔키파이어드랫 채용 연계형 해킹대회',
    image: '/ctf3.jpg',
    status: 'upcoming',
    startDate: '2026.03.02',
    endDate: '2026.03.22',
    participants: 14,
  },
  {
    id: 4,
    title: '2025 S-개발자 3기 교육생 모집',
    image: '/ctf1.jpg',
    status: 'ended',
    startDate: '2026.02.01',
    endDate: '2026.02.28',
    participants: 21,
  },
  {
    id: 5,
    title: 'KNIGHTS 나이츠 모집공고',
    image: '/ctf2.jpg',
    status: 'ended',
    startDate: '2026.01.15',
    endDate: '2026.02.10',
    participants: 9,
  },
]

const STATUS_LABEL: Record<CtfEvent['status'], string> = {
  ongoing: '진행중',
  upcoming: '진행예정',
  ended: '종료',
}

// 진행중: #0041EF 70%, 진행예정: #949494 70%
const STATUS_STYLE: Record<CtfEvent['status'], React.CSSProperties> = {
  ongoing: {
    background: 'rgba(0, 65, 239, 0.7)',
    color: '#ffffff',
    border: 'none',
  },
  upcoming: {
    background: 'rgba(148, 148, 148, 0.7)',
    color: '#ffffff',
    border: 'none',
  },
  ended: {
    background: 'rgba(60, 60, 60, 0.7)',
    color: '#aaaaaa',
    border: 'none',
  },
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function CtfCard({ event }: { event: CtfEvent }) {
  return (
    <div
      className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: event.status === 'ongoing' ? 1 : 0.5,
      }}
    >
      {/* Image */}
      <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Status badge */}
        <span
          className="absolute top-3 left-3 text-xs font-semibold tracking-wider px-3 py-1 rounded-sm"
          style={STATUS_STYLE[event.status]}
        >
          {STATUS_LABEL[event.status]}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        <h3
          className="text-white text-sm font-semibold leading-snug"
          style={{ wordBreak: 'keep-all', whiteSpace: 'pre-line' }}
        >
          {event.title}
        </h3>

        <div className="flex flex-col gap-3 mt-auto">
          <div className="grid grid-cols-2 gap-y-1.5">
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <CalendarIcon />
              <span>Start Date</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <CalendarIcon />
              <span>End Date</span>
            </div>
            <span className="text-white/70 text-xs pl-[18px]">{event.startDate}</span>
            <span className="text-white/70 text-xs pl-[18px]">{event.endDate}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 text-xs text-white/50 whitespace-nowrap">
              <PersonIcon />
              <span>참여인원</span>
              <span className="font-semibold" style={{ color: '#4d7cff' }}>{event.participants}명</span>
            </div>

            <button
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0"
              style={{
                color: '#ffffff',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
              }}
              onClick={() => event.link && window.open(event.link, '_blank')}
            >
              자세히 알아보기
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M7.5 4L13 10L7.5 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CTFPage() {
  const [index, setIndex] = useState(0)
  const total = CTF_EVENTS.length
  const perPage = 3
  const maxIndex = Math.max(0, total - perPage)
  const wheelAccum = useRef(0)

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex(i => Math.min(maxIndex, i + 1)), [maxIndex])

  const visible = CTF_EVENTS.slice(index, index + perPage)

  // 트랙패드/마우스휠 스크롤로 캐러셀 이동
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // 수평 스크롤만 처리
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    wheelAccum.current += e.deltaX
    if (wheelAccum.current > 80) {
      wheelAccum.current = 0
      next()
    } else if (wheelAccum.current < -80) {
      wheelAccum.current = 0
      prev()
    }
  }, [next, prev])

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>

      {/* Background image — main 레벨에서 상단 고정 */}
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

      {/* ── Hero ──────────────────────────────────────── */}
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
            CTF
          </h1>
        </div>

        <p
          className="relative z-10 text-white/75 font-medium mb-3"
          style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}
        >
          동아리내의 대회 소식들을 공유하는 페이지입니다.
        </p>
        <p
          className="relative z-10 text-white/40 text-sm leading-relaxed"
        >
          다양한 보안 및 개발 대회 소식을 실시간으로 공유하고 함께 도전하는 공간입니다.<br />
          팀원을 모집하거나 기출 문제를 나누며 함께 성장해 보세요!
        </p>
      </section>

      {/* ── Events Carousel ───────────────────────────── */}
      <section className="pb-32">
        <div className="max-w-5xl mx-auto px-[5vw]">

          {/* Dot indicators */}
          {maxIndex > 0 && (
            <div className="flex justify-center gap-2 mb-8">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === index ? '20px' : '6px',
                    height: '6px',
                    background: i === index ? '#1C5AFF' : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
          )}

        </div>

        {/* Cards + side arrows */}
        <div className="relative max-w-5xl mx-auto px-[5vw]" onWheel={handleWheel}>

          {/* Left arrow — 카드 영역 좌측에 겹침 */}
          <button
            onClick={prev}
            disabled={index === 0}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              background: 'rgba(4,13,31,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: index === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 4L7 10L12.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Right arrow — 카드 영역 우측에 겹침 */}
          <button
            onClick={next}
            disabled={index >= maxIndex}
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              background: 'rgba(4,13,31,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: index >= maxIndex ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
              cursor: index >= maxIndex ? 'not-allowed' : 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 4L13 10L7.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Cards */}
          <div className="flex gap-6">
            {visible.map(event => (
              <CtfCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <HomeFooter />
    </main>
  )
}
