'use client'

import { useEffect, useState } from 'react'

const START_DELAY_MS = 500
const CHAR_INTERVAL_MS = 65

/**
 * 히어로 제목 한 줄을 한 글자씩 타이핑하고, 다 치면 커서를 깜빡인다.
 *
 * - 아직 안 친 글자도 visibility:hidden 으로 자리를 지켜서 타이핑 중에 제목·버튼이 흔들리지 않는다.
 * - 서버 렌더도 0글자부터 시작한다. 완성본을 먼저 그렸다가 하이드레이션 때 지우면 글자가 사라지는 순간이 보인다.
 * - 동작 줄이기 사용자는 globals.css 에서 남은 글자를 보이게 하고 커서를 숨긴다 (타이핑이 돌아도 화면은 그대로).
 */
export default function HeroTypingText({ text }: { text: string }) {
  const [count, setCount] = useState(0)
  const done = count >= text.length

  useEffect(() => {
    let typed = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        typed += 1
        setCount(typed)
        if (typed >= text.length) clearInterval(interval)
      }, CHAR_INTERVAL_MS)
    }, START_DELAY_MS)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [text])

  return (
    <>
      {text.slice(0, count)}
      <span aria-hidden="true" className={done ? 'hero-caret hero-caret-blink' : 'hero-caret'} />
      <span aria-hidden="true" className="hero-typing-rest">{text.slice(count)}</span>
    </>
  )
}
