import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { AuthShell, PRIMARY_BUTTON } from '@/app/components/AuthForm'

// 회원가입 · 이메일 인증 화면과 같은 바탕과 카드를 써서 흐름이 끊기지 않게 한다
export default function RegisterPendingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#040d1f]">
      <AuthShell size="narrow">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-status-soon/35 bg-status-soon/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-status-soon" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <p className="mb-2 font-mono text-xs tracking-[0.2em] text-status-soon-text">PENDING</p>
          <h1 className="mb-4 text-2xl font-bold text-white sm:text-[28px]">관리자 승인 대기 중</h1>
          <p className="mb-7 text-sm leading-7 text-fg-subtle sm:text-[15px]">
            회원가입이 접수되었습니다.<br />
            동아리 운영진의 승인이 완료되면 이메일로 알려드립니다.<br />
            <span className="text-xs text-fg-faint">(보통 1~2일 내 처리됩니다)</span>
          </p>

          <div className="mb-7 flex w-full items-start gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] p-4 text-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-[#8DB0FF]" aria-hidden="true">
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="M10.7 12.3 21 2M16 7l3 3M18.5 4.5l2 2" />
            </svg>
            <div className="text-xs leading-relaxed text-fg-subtle">
              <p className="mb-1 text-[13px] font-semibold text-[#8DB0FF]">빠른 가입을 원하시나요?</p>
              운영진에게 받은 <strong className="font-semibold text-white">초대 링크</strong>로 가입하면 별도 승인 없이 바로 활동할 수 있어요.
            </div>
          </div>

          <Link href="/" className={PRIMARY_BUTTON}>
            홈으로 돌아가기
          </Link>
        </div>
      </AuthShell>

      <HomeFooter />
    </main>
  )
}
