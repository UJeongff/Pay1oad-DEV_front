'use client'

import Image from 'next/image'
import Link from 'next/link'

const cardBase: React.CSSProperties = {
  background: 'linear-gradient(145deg, #020810 0%, #061535 55%, #0d2460 100%)',
  border: '0.5px solid rgba(191,191,191,0.5)',
  boxShadow: '0 0 10px rgba(28,90,255,0.12)',
  minHeight: '220px',
}

function neonEnter(el: HTMLElement, color: string) {
  el.style.border = `0.5px solid ${color}`
  el.style.boxShadow = `0 0 18px ${color.replace('0.8', '0.55')}, inset 0 0 18px ${color.replace('0.8', '0.08')}`
}

function neonLeave(el: HTMLElement) {
  el.style.border = '0.5px solid rgba(191,191,191,0.5)'
  el.style.boxShadow = '0 0 10px rgba(28,90,255,0.12)'
}

export default function ContactCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* 홈페이지 */}
      <Link
        href="https://www.pay1oad.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col p-8 rounded-3xl transition-all duration-300"
        style={cardBase}
        onMouseEnter={e => neonEnter(e.currentTarget, 'rgba(28,90,255,0.8)')}
        onMouseLeave={e => neonLeave(e.currentTarget)}
      >
        <div className="w-12 h-12 flex items-center justify-start">
          <Image src="/aboutus_web.svg" alt="홈페이지" width={48} height={48} />
        </div>
        <div className="mt-8">
          <p className="text-white font-bold text-xl mb-2">홈페이지</p>
          <p className="text-white/45 text-sm">https://www.pay1oad.com</p>
        </div>
      </Link>

      {/* 블로그 */}
      <div
        className="flex flex-col p-8 rounded-3xl transition-all duration-300 cursor-default"
        style={{ ...cardBase }}
        onMouseEnter={e => neonEnter(e.currentTarget, 'rgba(34,197,94,0.8)')}
        onMouseLeave={e => neonLeave(e.currentTarget)}
      >
        <div className="w-12 h-12 flex items-center justify-start">
          <Image src="/aboutus_blog.svg" alt="블로그" width={48} height={48} />
        </div>
        <div className="mt-8">
          <p className="text-white font-bold text-xl mb-2">블로그</p>
          <p className="text-white/45 text-sm">https://blog.pay1oad.com</p>
        </div>
      </div>

      {/* 인스타그램 */}
      <Link
        href="https://www.instagram.com/pay1oad_gc"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col p-8 rounded-3xl transition-all duration-300"
        style={{ ...cardBase }}
        onMouseEnter={e => neonEnter(e.currentTarget, 'rgba(236,72,153,0.8)')}
        onMouseLeave={e => neonLeave(e.currentTarget)}
      >
        <div className="w-12 h-12 flex items-center justify-start">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" strokeWidth="1.6"/>
            <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.6"/>
            <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
          </svg>
        </div>
        <div className="mt-8">
          <p className="text-white font-bold text-xl mb-2">인스타</p>
          <p className="text-white/45 text-sm">@pay1oad_gc</p>
        </div>
      </Link>

    </div>
  )
}
