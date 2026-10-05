'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useRevealOnce } from '@/app/components/Reveal'

/**
 * 화면에 들어오면 파란 막대가 왼쪽에서 오른쪽으로 지나가며 제목을 드러낸다 (한 번만).
 * 글자는 clip-path 로 가려 두었다가 막대와 같은 속도로 연다. 막대 움직임은 globals.css 의 .heading-wipe-bar.
 * 동작 줄이기 사용자는 막대 없이 바로 나타난다.
 */
export default function WipeHeading({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const { ref, revealed } = useRevealOnce<HTMLHeadingElement>(0.6)

  return (
    <h2 ref={ref} className={`relative inline-block ${className}`} style={style}>
      <span
        className="inline-block transition-[clip-path] duration-[800ms] delay-200 ease-[cubic-bezier(.7,0,.2,1)] motion-reduce:transition-none"
        style={{ clipPath: revealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }}
      >
        {children}
      </span>
      <span aria-hidden="true" className={`heading-wipe-bar ${revealed ? 'is-on' : ''}`} />
    </h2>
  )
}
