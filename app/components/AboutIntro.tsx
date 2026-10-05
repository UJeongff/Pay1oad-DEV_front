'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRevealOnce } from '@/app/components/Reveal'

const NAME = 'pay1oad'
/** 디코드 중에 잠깐 보이는 글자. 폭이 너무 넓은 글자(m, w 등)는 옆 글자를 덮어서 뺐다 */
const SCRAMBLE_POOL = 'abcdeghknopqsuvxyz0123456789'
const TICK_MS = 45
const TICKS_PER_CHAR = 3

const randomChar = () => SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]

/**
 * 사전 카드의 "pay1oad" — 화면에 들어오면 글자가 섞이다가 앞에서부터 하나씩 풀린다.
 * 풀리기 전 자리에도 정답 글자를 투명하게 깔아 두어 디코드 중에 폭이 흔들리지 않는다.
 * 처음 그릴 땐 완성된 이름이라, 스크립트가 늦거나 동작 줄이기를 켠 사용자도 그대로 읽힌다.
 */
function DecodedName() {
  const { ref, revealed } = useRevealOnce<HTMLParagraphElement>(0.6)
  // settled: 앞에서부터 풀린 글자 수, scrambled: 아직 안 풀린 자리에 보일 글자들
  const [settled, setSettled] = useState(NAME.length)
  const [scrambled, setScrambled] = useState<string[]>([])

  useEffect(() => {
    if (!revealed) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let tick = 0
    const timer = setInterval(() => {
      tick += 1
      const done = Math.floor(tick / TICKS_PER_CHAR)
      setSettled(done)
      setScrambled(Array.from(NAME, randomChar))
      if (done >= NAME.length) clearInterval(timer)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [revealed])

  return (
    <p
      ref={ref}
      className="text-[44px] leading-none tracking-[0.02em]"
      style={{ fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif" }}
    >
      <span className="sr-only">{NAME}</span>
      <span aria-hidden="true">
        {Array.from(NAME, (ch, i) => {
          const isSettled = i < settled
          const isOne = ch === '1'
          return (
            <span key={i} className="relative inline-block">
              <span
                className={isSettled ? (isOne ? 'text-[#6E95FF]' : '') : 'invisible'}
                style={isSettled && isOne ? { textShadow: '0 0 16px rgba(110,149,255,0.6)' } : undefined}
              >
                {ch}
              </span>
              {!isSettled && (
                <span className="absolute inset-0 text-center text-fg-faint">{scrambled[i] ?? ch}</span>
              )}
            </span>
          )
        })}
      </span>
    </p>
  )
}

const ArrowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 8H13.5M13.5 8L8 2.5M13.5 8L8 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * About 소개: 왼쪽은 이름 유래를 보여주는 사전 카드(payload → pay1oad), 오른쪽은 제목·본문·버튼.
 * applyUrl 이 있을 때만 지원 버튼이 눌린다 (모집 기간이 아니거나 링크가 비어 있으면 비활성).
 */
export default function AboutIntro({ applyUrl }: { applyUrl: string | null }) {
  const archivo = { fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif" }

  return (
    <section className="py-28 px-[5vw]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-18 items-center">

        {/* 사전 카드 */}
        <div className="rounded-[20px] border border-line bg-surface p-8 sm:p-10 flex flex-col gap-3.5">
          {/* 사전 표제어처럼: 읽는 법 · 품사 */}
          <p className="text-fg-faint text-[13px] tracking-wide">페이로드 · 명사</p>
          <p className="text-[44px] leading-none tracking-[0.02em] text-fg-subtle" style={archivo}>payload</p>
          <p className="text-fg-muted text-base leading-[1.8]" style={{ wordBreak: 'keep-all' }}>
            전송되는 실제 데이터. 해킹에서는 공격자가 의도한 코드를 담은 핵심이 되기도 합니다.
          </p>
          <div aria-hidden="true" className="h-px bg-line my-3.5" />
          <DecodedName />
          <p className="text-fg-muted text-base leading-[1.8]" style={{ wordBreak: 'keep-all' }}>
            ‘l’ 자리에 ‘1’ — 가천대학교 No.1 정보보호 동아리라는 뜻을 더했습니다.
          </p>
        </div>

        {/* 제목 · 본문 · 버튼 */}
        <div className="flex flex-col items-start gap-6">
          <span className="border border-line-strong text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
            ABOUT US
          </span>
          <h2
            className="text-white font-bold leading-[1.4] tracking-[-0.01em]"
            style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)', wordBreak: 'keep-all' }}
          >
            단순한 데이터가 아닌,<br />
            가장 강력한 지식과 열정을 전달하는 동아리
          </h2>
          <p className="text-fg-muted text-base leading-[1.9]" style={{ wordBreak: 'keep-all' }}>
            우리는 정보보호 전문가를 꿈꾸는 사람들과 함께 모여 실력을 갈고닦는 공간입니다.
            CTF, 보안 프로젝트, 세미나, 스터디 등 다양한 활동을 통해 실력을 쌓아갑니다.
          </p>

          <div className="flex flex-wrap gap-3 mt-2">
            {applyUrl ? (
              <Link
                href={applyUrl}
                className="inline-flex items-center gap-2 border border-line-strong text-white text-sm rounded-full px-6 py-2.5 hover:border-blue-500 hover:bg-blue-600/20 transition-all duration-200"
              >
                함께 성장하러 가기
                <ArrowIcon />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 border border-line text-fg-faint text-sm rounded-full px-6 py-2.5 cursor-not-allowed">
                함께 성장하러 가기
                <ArrowIcon />
              </span>
            )}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 border border-line-strong text-white text-sm rounded-full px-6 py-2.5 hover:border-blue-500 hover:bg-blue-600/20 transition-all duration-200"
            >
              활동 둘러보기
              <ArrowIcon />
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}
