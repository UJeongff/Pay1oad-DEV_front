'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export default function GoogleLinkedToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  // 쿼리 파라미터는 최초 렌더 시점에 이미 알 수 있다 — effect에서 켜지 않고 초기값으로 받는다
  const [visible, setVisible] = useState(() => searchParams.get('googleLinked') === 'true')

  useEffect(() => {
    if (!visible) return
    router.replace(pathname)
    const timer = setTimeout(() => setVisible(false), 4000)
    return () => clearTimeout(timer)
  }, [visible, router, pathname])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg"
      style={{ background: 'rgba(28, 90, 255, 0.9)', backdropFilter: 'blur(12px)' }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8" stroke="white" strokeWidth="1.6" />
        <path d="M5.5 9L7.8 11.5L12.5 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Google 계정이 연동되었습니다.
    </div>
  )
}
