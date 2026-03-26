'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function PortraitRightsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/login_background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen pt-20 pb-16 px-[8.5vw]">

        <div
          className="w-full flex flex-col py-12 px-12 relative overflow-hidden"
          style={{
            maxWidth: '860px',
            background: 'rgba(0,0,0,0.50)',
            backdropFilter: 'blur(29.1px)',
            WebkitBackdropFilter: 'blur(29.1px)',
            borderRadius: '40px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Logo watermark */}
          <Image
            src="/logo.png"
            alt=""
            width={420}
            height={436}
            className="select-none pointer-events-none absolute"
            style={{ opacity: 0.03, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          />

          {/* Header */}
          <div className="mb-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-white/40 text-xs hover:text-white/70 transition-colors mb-6"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              돌아가기
            </Link>
            <h1 className="text-white text-3xl font-bold mb-2">초상권 동의</h1>
            <p className="text-white/40 text-sm">Pay1oad 동아리 초상권 사용에 관한 동의 내용입니다.</p>
          </div>

          {/* Divider */}
          <div className="h-px w-full mb-8" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Content sections */}
          <div className="flex flex-col gap-6 text-sm leading-relaxed">

            <Section title="초상권의 사용 목적">
              동아리 홍보 자료 제작(인스타그램 등) 및 내부 노션(또는 홈페이지, 카톡방)에 활동 기록
            </Section>

            <Section title="초상권의 사용처">
              인스타그램 등 SNS 홍보 자료 업로드 및 외부 홍보자료 배포, 노션과 홈페이지, 카톡방 등에 활동 기록 업로드
            </Section>

            <Section title="초상권의 보유 및 이용 기간">
              동아리 소속 기간 중 보유 및 이용 (소속 기간 중 촬영된 경우 중도 탈퇴 하더라도 당해년도 이용 가능)
            </Section>

            <Section title="사진 저작물에 대한 편집">
              인격을 침해하지 않는 범위 내에서만 저작물에 대한 편집을 할 수 있음에 동의
            </Section>

            <Section title="사진 저작물에 대한 소유권 및 저작권">
              소유권 및 저작권이 Pay1oad에 있음에 동의
            </Section>

            {/* Notice box */}
            <div
              className="rounded-xl p-5 mt-2"
              style={{ background: 'rgba(0,65,239,0.10)', border: '1px solid rgba(0,65,239,0.25)' }}
            >
              <p className="text-white/70 text-xs leading-6">
                다만 본 초상권 사용 동의에 대하여 동의일로부터 동아리 소속 종료 이전까지(단, 탈퇴하더라도 당해년도는 이용 가능),
                그 후 언제든지 철회할 수 있으며, 철회하고자 하는 사실을 Pay1oad 운영진에 알림으로 인해 본 동의서의 효력은 상실되며
                철회 이전의 초상권 이용에 대해서는 효력은 유지됩니다.
              </p>
              <p className="text-white/70 text-xs leading-6 mt-3">
                동의와 별도로, Pay1oad는 개인의 초상권 보호를 위해 외부에 공유되기 이전에 개인의 얼굴이 포함된 사진 등을
                동아리 내부에서 검토하는 등 노력을 다하겠습니다.
              </p>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-10 flex justify-end">
            <Link
              href="/register"
              style={{
                height: '42px',
                background: '#0041EF',
                borderRadius: '3.56px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                padding: '0 28px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              확인했습니다
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-white/90 font-semibold text-sm before:content-['◦'] before:mr-2 before:text-blue-400">
        {title}
      </span>
      <p className="text-white/55 text-sm pl-4 leading-6">{children}</p>
    </div>
  )
}
