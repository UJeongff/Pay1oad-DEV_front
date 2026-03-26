import Image from 'next/image'
import Link from 'next/link'

const socials = [
  {
    name: 'Discord',
    href: '#',
    icon: <Image src="/discord.png" alt="Discord" width={33} height={33} className="opacity-60 hover:opacity-100 transition-opacity" />,
  },
  {
    name: 'GitHub',
    href: '#',
    icon: <Image src="/github.png" alt="GitHub" width={30} height={30} className="opacity-60 hover:opacity-100 transition-opacity" />,
  },
  {
    name: 'Instagram',
    href: '#',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-60 hover:opacity-100 transition-opacity">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="white" />
      </svg>
    ),
  },
  {
    name: 'Facebook',
    href: '#',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-60 hover:opacity-100 transition-opacity">
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
  {
    name: 'Blog',
    href: '#',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="opacity-60 hover:opacity-100 transition-opacity">
        <path
          d="M4 4h16v16H4z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 9h8M8 13h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function HomeFooter() {
  return (
    <footer
      className="px-[5vw] py-8"
      style={{
        background: 'transparent',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/">
          <Image src="/main_logo.png" alt="Pay1oad" width={110} height={38} />
        </Link>

        {/* Right: socials + copyright */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-5">
            {socials.map((s) => (
              <Link key={s.name} href={s.href} aria-label={s.name}>
                {s.icon}
              </Link>
            ))}
          </div>
          <p className="text-white/30 text-xs">© 2026. Pay1oad All rights reserved.</p>
        </div>

      </div>
    </footer>
  )
}
