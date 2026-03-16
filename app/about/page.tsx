import Image from 'next/image'
import Link from 'next/link'
import HistorySection from '@/app/components/HistorySection'

export default function AboutPage() {
  return (
    <main className="relative select-none">

      {/* ── Hero Section ──────────────────────────────── */}
      <section className="relative flex items-center justify-center overflow-hidden" style={{ height: '75vh', minHeight: '480px' }}>

        {/* Background Image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/aboutus.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Dark Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(4, 13, 31, 0.6)' }}
        />

        {/* Center Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <Image
            src="/main_logo.png"
            alt="Pay1oad"
            width={300}
            height={300}
            className="mb-8 drop-shadow-2xl"
            priority
          />
          <h1
            className="text-white font-bold mb-3"
            style={{
              fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
              letterSpacing: '0.04em',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            가천대학교 No.1 정보보호동아리, Pay1oad
          </h1>
          <p
            className="text-white/60 leading-relaxed"
            style={{ fontSize: 'clamp(0.8rem, 1.2vw, 0.95rem)', maxWidth: '640px', wordBreak: 'keep-all' }}
          >
            우리는 정보보호 전문가를 꿈꾸는 사람들과 함께 모여 실력을 갈고닦는 공간입니다.
            <br></br>
            CTF, 보안 프로젝트, 세미나, 스터디 등 다양한 활동을 통해 실력을 쌓아갑니다.
          </p>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #040d1f)' }}
        />
      </section>

      {/* ── About Section ─────────────────────────────── */}
      <section className="bg-[#040d1f] py-32 px-[5vw]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-start">

          {/* Left: Title */}
          <div>
            {/* Asterisk icon */}
            <svg
              width="30"
              height="30"
              viewBox="0 0 20 20"
              fill="none"
              className="mb-6"
            >
              <path
                d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
                stroke="#1C5AFF"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>

            <h2
              className="text-white font-black leading-none uppercase"
              style={{
                fontSize: 'clamp(3rem, 5.5vw, 4.8rem)',
                fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                letterSpacing: '0.02em',
              }}
            >
              ABOUT
              <br />
              US
            </h2>
          </div>

          {/* Right: Content */}
          <div className="flex flex-col justify-start">
            <p className="text-white/70 text-sm leading-[1.9] mb-5">
              Payload는 컴퓨터 용어로, 전송되는 실제 데이터를 의미합니다. 
              해킹 세계에서는 공격자가 의도한 코드를 담은 페이로드(Payload)가 핵심이 되기도 하죠.
            </p>
            <p className="text-white/70 text-sm leading-[1.9] mb-10">
              우리는 그 기술적 상징성에 &apos;가천대학교 No.1 정보보호 동아리&apos;라는 의미를 더해 Pay1oad라는 이름을 만들었습니다.
              즉, 단순한 데이터가 아닌 — 가장 강력한 지식과 열정을 전달하는 동아리라는 뜻입니다.

            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 border border-white/30 text-white/90 text-sm rounded-full px-6 py-2.5 hover:border-blue-500 hover:bg-blue-600/20 transition-all duration-200"
              >
                함께 성장하러 가기
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2.5 8H13.5M13.5 8L8 2.5M13.5 8L8 13.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 border border-white/30 text-white/90 text-sm rounded-full px-6 py-2.5 hover:border-blue-500 hover:bg-blue-600/20 transition-all duration-200"
              >
                활동 둘러보기
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2.5 8H13.5M13.5 8L8 2.5M13.5 8L8 13.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── Our Goal Section ──────────────────────────── */}
      <section className="bg-[#040d1f] pb-32 px-[5vw]">
        <div className="max-w-4xl mx-auto">

          {/* Title */}
          <h2
            className="text-center text-white font-bold mb-20"
            style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)', letterSpacing: '0.25em' }}
          >
            [ OUR GOAL ]
          </h2>

          {/* Top row: 3 goals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className="mb-5 opacity-90">
                <circle cx="26" cy="26" r="4" fill="white"/>
                <circle cx="8"  cy="14" r="3" fill="white"/>
                <circle cx="44" cy="14" r="3" fill="white"/>
                <circle cx="8"  cy="38" r="3" fill="white"/>
                <circle cx="44" cy="38" r="3" fill="white"/>
                <circle cx="26" cy="6"  r="3" fill="white"/>
                <circle cx="26" cy="46" r="3" fill="white"/>
                <line x1="26" y1="26" x2="8"  y2="14" stroke="white" strokeWidth="1.5"/>
                <line x1="26" y1="26" x2="44" y2="14" stroke="white" strokeWidth="1.5"/>
                <line x1="26" y1="26" x2="8"  y2="38" stroke="white" strokeWidth="1.5"/>
                <line x1="26" y1="26" x2="44" y2="38" stroke="white" strokeWidth="1.5"/>
                <line x1="26" y1="26" x2="26" y2="6"  stroke="white" strokeWidth="1.5"/>
                <line x1="26" y1="26" x2="26" y2="46" stroke="white" strokeWidth="1.5"/>
              </svg>
              <p className="text-white/75 text-sm leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                가천대학교 내 정보보안<br />
                지식 교류의 <strong className="text-white font-semibold">중심</strong>이 되는 것
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className="mb-5 opacity-90">
                <rect x="8" y="6" width="36" height="28" rx="2" stroke="white" strokeWidth="2" fill="none"/>
                <line x1="26" y1="34" x2="26" y2="44" stroke="white" strokeWidth="2"/>
                <line x1="16" y1="44" x2="36" y2="44" stroke="white" strokeWidth="2"/>
                <line x1="14" y1="20" x2="26" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="26" y1="12" x2="38" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="26" cy="23" r="4" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
              <p className="text-white/75 text-sm leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                단계별 보안 커리큘럼을 통해<br />
                <strong className="text-white font-semibold">체계적인 학습</strong> 제공
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className="mb-5 opacity-90">
                <path d="M8 10 C8 10 18 8 26 14 C34 8 44 10 44 10 L44 40 C44 40 34 38 26 44 C18 38 8 40 8 40 Z" stroke="white" strokeWidth="2" fill="none"/>
                <line x1="26" y1="14" x2="26" y2="44" stroke="white" strokeWidth="2"/>
              </svg>
              <p className="text-white/75 text-sm leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                <strong className="text-white font-semibold">세미나·컨퍼런스</strong>를 통한<br />
                활발한 지식 공유
              </p>
            </div>
          </div>

          {/* Bottom row: 2 goals centered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-2xl mx-auto">

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className="mb-5 opacity-90">
                <path d="M16 6 H36 C36 6 40 18 26 24 C12 18 16 6 16 6Z" stroke="white" strokeWidth="2" fill="none"/>
                <line x1="26" y1="24" x2="26" y2="36" stroke="white" strokeWidth="2"/>
                <line x1="16" y1="36" x2="36" y2="36" stroke="white" strokeWidth="2"/>
                <rect x="12" y="36" width="28" height="6" rx="2" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
              <p className="text-white/75 text-sm leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                팀 단위의 CTF 및<br />
                각종 대회 출전으로 <strong className="text-white font-semibold">실전 경험 축적</strong>
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" className="mb-5 opacity-90">
                <circle cx="18" cy="16" r="7" stroke="white" strokeWidth="2" fill="none"/>
                <circle cx="34" cy="16" r="7" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M6 44 C6 34 12 30 18 30 C22 30 25 32 26 33" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <path d="M46 44 C46 34 40 30 34 30 C30 30 27 32 26 33" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
              <p className="text-white/75 text-sm leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                <strong className="text-white font-semibold">선후배 간 네트워크 구축</strong>으로<br />
                장기적인 성장 기반 마련
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── History Section ────────────────────────────── */}
      <HistorySection />

    </main>
  )
}
