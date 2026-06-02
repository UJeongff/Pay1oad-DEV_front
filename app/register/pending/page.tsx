'use client'

import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'

export default function RegisterPendingPage() {
  return (
    <main className="relative min-h-screen flex flex-col" style={{ background: '#040d1f' }}>
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '60vh',
          backgroundImage: 'url(/background.png)',
          backgroundSize: '130%',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 80%)',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 80%)',
        }}
      />

      <div className="flex-1 flex items-center justify-center px-6 py-32">
        <div
          style={{
            maxWidth: '480px', width: '100%', padding: '40px 32px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px', height: '64px', margin: '0 auto 20px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.35)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
            관리자 승인 대기 중
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '24px' }}>
            회원가입이 접수되었습니다.<br />
            동아리 운영진의 승인이 완료되면 이메일로 알려드립니다.<br />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              (보통 1~2일 내 처리됩니다)
            </span>
          </p>

          <div
            style={{
              padding: '14px 16px', marginBottom: '24px', borderRadius: '8px',
              background: 'rgba(28,90,255,0.06)', border: '1px solid rgba(28,90,255,0.2)',
              fontSize: '12px', color: 'rgba(255,255,255,0.55)', textAlign: 'left', lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#7aa3ff', display: 'block', marginBottom: '4px' }}>💡 빠른 가입을 원하시나요?</strong>
            운영진에게 받은 <strong style={{ color: '#fff' }}>초대 링크</strong>로 가입하면 별도 승인 없이 바로 활동할 수 있어요.
          </div>

          <Link
            href="/"
            style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: '8px',
              background: 'rgba(0,65,239,0.85)', color: '#fff',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none',
              transition: 'background 0.15s',
            }}
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>

      <HomeFooter />
    </main>
  )
}
