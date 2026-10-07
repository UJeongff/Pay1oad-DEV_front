import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { AuthShell, PRIMARY_BUTTON } from '@/app/components/AuthForm'

// 회원가입 · 이메일 인증 화면과 같은 바탕과 카드를 써서 흐름이 끊기지 않게 한다.
// 진행 상태는 터미널 출력처럼: 끝난 단계는 줄 끝 ✓, 기다리는 단계는 줄 끝 로딩 도형.
export default function RegisterPendingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#040d1f]">
      <AuthShell size="narrow">
        <h1 className="mb-6 text-[28px] font-bold tracking-[-0.01em] text-white">승인 대기 중</h1>

        <div className="mb-6 rounded-xl border border-line bg-[rgb(2_6_18/0.75)] px-[18px] pt-4 pb-5 font-mono text-[13px] leading-loose text-fg-muted">
          <p className="sr-only">
            이메일 인증이 완료되었고, 운영진 승인을 기다리고 있습니다. 보통 1~2일 걸리며 승인되면 메일로 알려드립니다.
          </p>
          <div aria-hidden="true">
            <div className="mb-2.5 flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-white/15" />
              <span className="h-2 w-2 rounded-full bg-white/15" />
              <span className="h-2 w-2 rounded-full bg-white/15" />
            </div>
            <div><span className="text-[#6E95FF]">$</span> pay1oad signup --status</div>
            <div className="flex justify-between gap-3">
              <span>email verified</span>
              <span className="text-status-live-text">✓</span>
            </div>
            <div className="flex justify-between gap-3 text-status-soon-text">
              <span>waiting for approval</span>
              <span className="term-spin" />
            </div>
            <div className="text-fg-faint"># 보통 1~2일 · 승인되면 메일로 알려드려요</div>
            <div><span className="text-[#6E95FF]">$</span> <span className="term-cursor bg-status-live-text" /></div>
          </div>
        </div>

        <p className="mb-7 text-[13px] leading-relaxed text-fg-subtle">
          메일이 안 오면 스팸함을 확인하거나 운영진에게 문의해 주세요.
        </p>

        <Link href="/" className={PRIMARY_BUTTON}>
          홈으로 돌아가기
        </Link>
      </AuthShell>

      <HomeFooter />
    </main>
  )
}
