import Image from 'next/image'
import Link from 'next/link'

// 푸터는 모든 페이지가 이 컴포넌트 하나를 쓴다
const socials = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/pay1oad_gc',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-60 hover:opacity-100 transition-opacity">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="white" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/Pay1oad.Gachon/?locale=ko_KR',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-60 hover:opacity-100 transition-opacity">
        <path
          d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function HomeFooter() {
  return (
    <footer className="px-[5vw] py-8 border-t border-line">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/">
          <Image src="/main_logo.png" alt="Pay1oad" width={110} height={38} />
        </Link>

        {/* Right: socials + copyright */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-5">
            {socials.map((s) => (
              <Link key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name}>
                {s.icon}
              </Link>
            ))}
          </div>
          <p className="text-fg-subtle text-xs">© 2026. Pay1oad All rights reserved.</p>
        </div>

      </div>
    </footer>
  )
}
