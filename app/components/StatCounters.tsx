'use client'

import { useEffect, useRef, useState } from 'react'
import Reveal from '@/app/components/Reveal'

export type Stat = { value: string; label: string; sub: string }

/** '24+' → { target: 24, suffix: '+' }. 숫자가 아니면 target 이 null 이고 원문을 그대로 쓴다. */
function parse(value: string): { target: number | null; suffix: string } {
  const m = value.match(/^(\d+)(.*)$/)
  return m ? { target: Number(m[1]), suffix: m[2] } : { target: null, suffix: '' }
}

const DURATION_MS = 900

/** 빠르게 치솟다가 목표 근처에서 급격히 감속 — 카운터가 "멈춰 서는" 느낌을 만든다. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)

export default function StatCounters({ stats }: { stats: Stat[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)   // 0 → 1
  const startedRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let raf = 0

    const run = () => {
      const started = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - started) / DURATION_MS, 1)
        setProgress(t)
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    // 화면에 들어왔을 때 시작한다 — 스크롤해서 내려오기 전에 끝나 있으면 볼 수가 없다
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting) && !startedRef.current) {
          startedRef.current = true
          io.disconnect()
          // 애니메이션을 원치 않는 사용자에겐 최종 숫자를 바로 보여준다
          if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setProgress(1)
          else run()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)

    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [])

  const eased = easeOut(progress)

  return (
    // 카드 3장 대신 구분선으로 나뉜 패널 하나 — 모바일에선 세로로 쌓이며 구분선도 가로로 바뀐다
    <div
      ref={containerRef}
      className="grid grid-cols-1 sm:grid-cols-3 mb-30 mt-5 rounded-2xl border border-line bg-surface overflow-hidden divide-y divide-line sm:divide-y-0 sm:divide-x"
    >
      {stats.map((s, i) => {
        const { target, suffix } = parse(s.value)
        const shown = target === null
          ? s.value
          : `${Math.round(target * eased)}${suffix}`

        return (
          <Reveal key={s.label} delay={i * 90} className="px-8 py-10 text-center">
            <p
              className="font-bold mb-2"
              style={{
                fontSize: 'clamp(2.4rem, 4vw, 3.5rem)',
                color: '#1C5AFF',
                // 자릿수가 바뀔 때 폭이 출렁이지 않도록 숫자 글리프 폭을 고정한다
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {shown}
            </p>
            <p className="text-white text-lg font-semibold mb-1">{s.label}</p>
            <p className="text-fg-subtle text-sm">{s.sub}</p>
          </Reveal>
        )
      })}
    </div>
  )
}
