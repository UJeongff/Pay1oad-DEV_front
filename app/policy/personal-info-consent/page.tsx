import Image from 'next/image'
import Link from 'next/link'

export default function PersonalInfoConsentPage() {
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
            <h1 className="text-white text-3xl font-bold mb-2">개인정보 수집 및 이용 동의</h1>
            <p className="text-white/40 text-sm">Pay1oad 회원을 위한 개인정보 수집 및 이용 동의서입니다.</p>
          </div>

          {/* Divider */}
          <div className="h-px w-full mb-8" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Intro */}
          <p className="text-white/60 text-sm leading-7 mb-8">
            가천대학교 No.1 정보보호동아리 Pay1oad은(는) &ldquo;개인정보 보호법&rdquo;에 따라 아래와 같이 수집하는 개인정보의 항목,
            수집 및 이용 목적, 보유 및 이용 기간을 안내드리고 동의를 받고자 합니다.
          </p>

          {/* Section title */}
          <p className="text-white/80 text-sm font-semibold mb-4">■ 개인정보 수집·이용 내역</p>

          {/* Table */}
          <div className="w-full overflow-x-auto mb-8">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '580px' }}>
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
                {/* 회원가입 및 관리 */}
                <tr>
                  <td className="text-white/80 font-medium py-4 px-3 align-top text-center" style={{ border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                    회원가입 및 관리
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['본인 식별·인증', '회원자격 유지·관리', '각종 고지·통지사항 전달']} />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ItemGroup
                      required="이름, 생년월일, 나이, 휴대전화번호, 이메일주소, 닉네임, 프로필 사진, 아이디, 소속 정보(학과, 학번)"
                      optional="카카오톡 ID, 디스코드 ID, 노션 ID(이메일), 병역 정보(군필, 군휴학 여부)"
                    />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['회원 탈퇴일로부터 2년']} />
                  </td>
                </tr>

                {/* 홍보 및 마케팅 1 */}
                <tr>
                  <td className="text-white/80 font-medium py-4 px-3 align-top text-center" style={{ border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                    홍보 및 마케팅
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['행사 및 이벤트 안내', '뉴스레터 발행']} />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ItemGroup
                      required="휴대전화번호, 관심분야"
                      optional="알게된 경로"
                    />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['회원 탈퇴 시까지']} />
                  </td>
                </tr>

                {/* 홍보 및 마케팅 2 */}
                <tr>
                  <td className="text-white/80 font-medium py-4 px-3 align-top text-center" style={{ border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                    홍보 및 마케팅
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['행사 및 이벤트 안내', 'SNS 등 매체 홍보', '동아리 활동 관리', '동아리 실적 관리', '동아리 지원 사업']} />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ItemGroup
                      required="이름, 소속 정보, 활동 사진 및 영상, 활동 내용"
                      optional="실적, 활동 내역, 활동 증빙 서류"
                    />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['회원 탈퇴 시까지', '파기 요청 시까지']} />
                  </td>
                </tr>

                {/* 고객 상담 및 문의 */}
                <tr>
                  <td className="text-white/80 font-medium py-4 px-3 align-top text-center" style={{ border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
                    고객 상담 및 문의
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['문의 접수 및 처리 이력관리']} />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <ItemGroup
                      required="이름, 휴대전화번호, 문의 내용, 상담 내역, 서비스 이용 내역"
                      optional="소속 정보"
                    />
                  </td>
                  <td className="text-white/55 py-4 px-3 align-top" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <BulletList items={['법정 의무 보유기간 만료 시까지', '처리 완료 시까지']} />
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
              정보주체는 위와 같이 개인정보를 처리하는 것에 대한 동의를 거부할 권리가 있습니다.
            </p>
            <p className="text-white/60 text-xs leading-6">
              그러나 동의를 거부할 경우 회원 가입 및 활동 또는 특정 정보가 필요한 활동 및 혜택 제공이 제한될 수 있습니다.
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

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item} className="flex gap-1.5 items-start">
          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function ItemGroup({ required, optional }: { required: string; optional: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <span className="text-white/70 font-medium">필수: </span>
        {required}
      </div>
      <div>
        <span className="text-white/50 font-medium">선택: </span>
        {optional}
      </div>
    </div>
  )
}
