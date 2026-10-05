import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'

/** 카드마다 네온 색만 다르다 — 실제 hover·포커스 효과는 globals.css 의 .contact-card */
const neon = (rgb: string) => ({ '--neon': rgb }) as CSSProperties

const cardClass = 'contact-card flex items-center gap-4 px-6 py-5 rounded-[20px] text-left'

/** 바깥으로 나가는 링크 표시 */
const ExternalIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="flex-shrink-0 text-fg-subtle">
    <path d="M5 11 11 5M6 5h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function CardText({ name, handle }: { name: string; handle?: string }) {
  return (
    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
      <span className="text-white font-bold text-[17px]">{name}</span>
      {handle && <span className="text-fg-subtle text-sm truncate">{handle}</span>}
    </span>
  )
}

export default function ContactCards() {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* 홈페이지 */}
      <Link
        href="https://pay1oad.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
        style={neon('28 90 255')}
      >
        <Image src="/aboutus_web.svg" alt="" width={40} height={40} className="flex-shrink-0" />
        <CardText name="홈페이지" handle="pay1oad.com" />
        <ExternalIcon />
      </Link>

      {/* 블로그 — 아직 블로그가 없어 링크를 걸지 않는다 */}
      <div className={`${cardClass} cursor-default`} style={neon('34 197 94')}>
        <Image src="/aboutus_blog.svg" alt="" width={40} height={40} className="flex-shrink-0" />
        <CardText name="블로그" />
      </div>

      {/* 인스타그램 */}
      <Link
        href="https://www.instagram.com/pay1oad_gc"
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
        style={neon('236 72 153')}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="flex-shrink-0">
          <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" strokeWidth="1.6"/>
          <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.6"/>
          <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
        </svg>
        <CardText name="인스타" handle="@pay1oad_gc" />
        <ExternalIcon />
      </Link>

    </div>
  )
}
