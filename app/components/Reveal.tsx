'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/** 요소가 화면에 들어오면 한 번 true 가 된다 (다시 나가도 false 로 돌아가지 않는다). */
export function useRevealOnce<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, revealed }
}

/**
 * 홈 섹션 공통 등장 연출: 16px 아래에서 0.5초 동안 떠오른다.
 * Tailwind v4 의 translate-y-* 는 transform 이 아니라 translate 속성을 쓰므로 전환 대상도 translate 로 잡는다.
 * 동작 줄이기 사용자는 전환 없이 바로 나타난다.
 */
export function revealClass(revealed: boolean) {
  return `transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none ${
    revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
  }`
}

/**
 * 화면에 들어오면 onClass 를 붙이기만 한다. 움직임은 그 클래스를 받는 CSS 가 맡는다
 * (예: About 목표 아이콘 선 그리기 — globals.css 의 .goal-draw).
 */
export function RevealToggle({
  children,
  className = '',
  onClass,
  threshold = 0.3,
}: {
  children: ReactNode
  className?: string
  onClass: string
  threshold?: number
}) {
  const { ref, revealed } = useRevealOnce<HTMLDivElement>(threshold)
  return (
    <div ref={ref} className={`${className} ${revealed ? onClass : ''}`}>
      {children}
    </div>
  )
}

/** 감싼 내용을 화면에 들어올 때 떠오르게 한다. 목록은 항목마다 delay 를 조금씩 늘려 차례로 등장시킨다. */
export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const { ref, revealed } = useRevealOnce<HTMLDivElement>()
  return (
    <div ref={ref} className={`${revealClass(revealed)} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}
