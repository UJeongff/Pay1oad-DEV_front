import Image from 'next/image'
import Link from 'next/link'

export default function MarketingConsentPage() {
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
          className="w-full flex flex-col py-12 px-6 sm:px-10 lg:px-12 relative overflow-hidden"
          style={{
            maxWidth: '900px',
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
            <h1 className="text-white text-3xl font-bold mb-2">마케팅 및 광고성 정보 수신 동의</h1>
            <p className="text-white/40 text-sm">Pay1oad 회원을 위한 마케팅 및 광고성 정보 수신 동의서입니다.</p>
          </div>

          {/* Divider */}
          <div className="h-px w-full mb-8" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Intro */}
          <div className="flex flex-col gap-4 mb-8">
            <p className="text-white/60 text-sm leading-7">
              가천대학교 No.1 정보보호동아리 Pay1oad은(는) 아래와 같이 마케팅 및 광고성 정보 수신을 위해 개인정보 수집 및 이용에
              관한 사항을 안내드리고 동의를 받고자 합니다.
            </p>
            <p className="text-white/60 text-sm leading-7 underline underline-offset-2 decoration-white/30">
              가천대학교 No.1 정보보호동아리 Pay1oad은(는) 상품이나 서비스의 홍보 또는 판매 권유 등을 위해 해당 개인정보를
              이용하여 정보주체에게 연락할 수 있습니다.
            </p>
          </div>

          {/* Section title */}
          <p className="text-white/80 text-sm font-semibold mb-4">■ 개인정보 수집·이용 내역</p>

          {/* Table */}
          <div className="w-full overflow-x-auto mb-8">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '520px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['구분(업무명)', '처리 목적', '항목', '보유 및 이용기간'].map((h) => (
                    <th
                      key={h}
                      className="text-white/70 font-semibold text-center py-3 px-3"
                      style={{ border: '1px solid rgba(255,255,255,0.10)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-white/80 font-medium py-4 px-3 align-top text-center" style={{ border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                    홍보 및 마케팅
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ul className="flex flex-col gap-1">
                      {['행사 및 이벤트 안내', '뉴스레터 발행'].map((item) => (
                        <li key={item} className="flex gap-1.5 items-start">
                          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex flex-col gap-2">
                      <div>
                        <span className="text-white/70 font-medium">필수: </span>
                        휴대전화번호, 관심분야
                      </div>
                      <div>
                        <span className="text-white/50 font-medium">선택: </span>
                        알게된 경로
                      </div>
                    </div>
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ul className="flex flex-col gap-1">
                      <li className="flex gap-1.5 items-start">
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        <span>회원 탈퇴 시까지</span>
                      </li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notice box */}
          <div
            className="rounded-xl p-5 mb-8"
            style={{ background: 'rgba(0,65,239,0.10)', border: '1px solid rgba(0,65,239,0.25)' }}
          >
            <p className="text-white/70 text-xs leading-6">
              정보주체는 위와 같이 선택목적을 위해 개인정보를 처리하는 것에 대한 동의를 거부할 권리가 있습니다.
            </p>
            <p className="text-white/60 text-xs leading-6">
              그러나 동의를 거부할 경우 동아리 주요 행사 및 소식(혜택 포함) 알림 및 활동 자료가 필요한 동아리 활동 참여 등이 제한될 수 있습니다.
            </p>
          </div>

          {/* Signature line */}
          <p className="text-white/55 text-sm leading-7 mb-8">
            이에 본인은 가천대학교 No.1 정보보호동아리 Pay1oad이(가) 위와 같이 개인정보를 수집 및 이용하는데 동의합니다.
          </p>

          <p className="text-white/40 text-sm text-center font-medium">
            가천대학교 No.1 정보보호동아리 Pay1oad 귀중
          </p>

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
