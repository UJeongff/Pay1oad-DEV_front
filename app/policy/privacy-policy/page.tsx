import Image from 'next/image'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/login_background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen pt-20 pb-16 px-[8.5vw]">
        <div
          className="w-full flex flex-col py-12 px-6 sm:px-10 lg:px-12 relative overflow-hidden"
          style={{
            maxWidth: '960px',
            background: 'rgba(0,0,0,0.50)',
            backdropFilter: 'blur(29.1px)',
            WebkitBackdropFilter: 'blur(29.1px)',
            borderRadius: '40px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
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
            <h1 className="text-white text-3xl font-bold mb-2">개인정보 처리방침</h1>
            <p className="text-white/40 text-sm">가천대학교 정보보호동아리 Pay1oad 개인정보 처리방침</p>
          </div>

          <div className="h-px w-full mb-8" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* 적용 일자 */}
          <p className="text-white/40 text-xs text-right mb-6">적용 일자: 2026-02-23</p>

          {/* Intro */}
          <p className="text-white/60 text-sm leading-7 mb-10">
            Pay1oad(페이로드, 이하 &ldquo;동아리&rdquo;)은 가천대학교 정보보호동아리 Pay1oad를 제공함에 있어 정보주체의 자유와 권리 보호를 위해
            「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다.
            이에 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을
            신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립공개합니다.
          </p>

          {/* 주요 개인정보 처리 표시 */}
          <div
            className="rounded-2xl p-6 mb-10"
            style={{ background: 'rgba(0,65,239,0.08)', border: '1px solid rgba(0,65,239,0.20)' }}
          >
            <p className="text-white/80 text-sm font-semibold text-center mb-1">주요 개인정보 처리 표시</p>
            <p className="text-white/40 text-xs text-center mb-6">기호에 마우스 커서를 대시면 세부 사항을 확인할 수 있습니다.</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {[
                { icon: '👤', label: '일반 개인정보 수집' },
                { icon: '🎯', label: '개인정보 처리목적' },
                { icon: '🗓️', label: '개인정보 보유기간' },
                { icon: '🤝', label: '개인정보 제공' },
                { icon: '🔄', label: '처리 위탁' },
                { icon: '📞', label: '고충처리부서' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,65,239,0.30)' }}
                  >
                    {icon}
                  </div>
                  <span className="text-white/55 text-xs text-center leading-4">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 목차 */}
          <div
            className="rounded-2xl p-6 mb-10"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-white/80 text-sm font-semibold text-center mb-4">목차</p>
            <ol className="flex flex-col gap-2">
              {[
                '개인정보의 처리목적, 수집 항목, 보유 및 이용기간',
                '개인정보의 제3자 제공',
                '개인정보 처리 업무의 위탁',
                '개인정보의 파기 및 절차',
                '정보주체와 법정대리인의 권리·의무 및 행사방법',
                '개인정보의 안전성 확보조치',
                '개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항',
                '행태정보의 수집·이용 및 거부 등에 관한 사항',
                '개인정보 보호책임자 및 개인정보 열람청구',
                '권익침해 구제 방법',
              ].map((item, i) => (
                <li key={i} className="flex gap-2 text-white/55 text-sm">
                  <span className="text-blue-400 shrink-0">■</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          {/* Section 1 */}
          <SectionTitle>개인정보의 처리목적, 수집 항목, 보유 및 이용기간</SectionTitle>
          <div className="flex flex-col gap-3 mb-4 text-white/60 text-sm leading-7">
            <p>① 회사가 처리하고 있는 개인정보의 항목과 목적 및 보유기간은 아래와 같습니다.</p>
            <p>• 회사가 정보주체의 동의를 받고 처리하고 있는 개인정보의 항목과 목적, 보유기간 및 법적 근거는 아래와 같습니다.</p>
          </div>

          <div className="w-full overflow-x-auto mb-6">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '640px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['구분(업무명)', '처리 목적', '개인정보의 항목', '처리 및 보유기간'].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td center nowrap>회원가입 및 관리</Td>
                  <Td><BulletList items={['본인 식별·인증', '회원자격 유지·관리', '각종 고지·통지사항 전달']} /></Td>
                  <Td><ItemGroup required="이름, 생년월일, 나이, 휴대전화번호, 이메일주소, 닉네임, 프로필 사진, 아이디, 소속 정보(학과, 학번)" optional="카카오톡 ID, 디스코드 ID, 노션 ID(이메일), 병역 정보(군필, 군휴학 여부)" /></Td>
                  <Td><BulletList items={['회원 탈퇴일로부터 2년']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>홍보 및 마케팅</Td>
                  <Td><BulletList items={['행사 및 이벤트 안내', '뉴스레터 발행']} /></Td>
                  <Td><ItemGroup required="휴대전화번호, 관심분야" optional="알게된 경로" /></Td>
                  <Td><BulletList items={['회원 탈퇴 시까지']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>홍보 및 마케팅</Td>
                  <Td><BulletList items={['행사 및 이벤트 안내', 'SNS 등 매체 홍보', '동아리 활동 관리', '동아리 실적 관리', '동아리 지원 사업']} /></Td>
                  <Td><ItemGroup required="이름, 소속 정보, 활동 사진 및 영상, 활동 내용" optional="실적, 활동 내역, 활동 증빙 서류" /></Td>
                  <Td><BulletList items={['회원 탈퇴 시까지', '파기 요청 시까지']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>고객 상담 및 문의</Td>
                  <Td><BulletList items={['문의 접수 및 처리 이력관리']} /></Td>
                  <Td><ItemGroup required="이름, 휴대전화번호, 문의 내용, 상담 내역, 서비스 이용 내역" optional="소속 정보" /></Td>
                  <Td><BulletList items={['법정 의무 보유기간 만료 시까지', '처리 완료 시까지']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>회원가입 및 관리</Td>
                  <Td><BulletList items={['신규 회원 지원 및 면접 관리']} /></Td>
                  <Td><ItemGroup required="이름, 휴대전화번호, 이메일주소, 소속(기관명), 닉네임, 학번, 소속 학과, 학년" optional="휴학 관련 정보" /></Td>
                  <Td><BulletList items={['파기 요청 시까지', '회원 탈퇴일로부터 3년']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>KUCIS 지원사업</Td>
                  <Td><BulletList items={['KUCIS 지원사업을 통한 동아리/동아리원 지원']} /></Td>
                  <Td><ItemGroup required="이름, 학번, 전공, 이메일, 휴대전화 번호" optional="군필여부" /></Td>
                  <Td><BulletList items={['동아리지원사업 선정일로부터 1년']} /></Td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 mb-10 text-white/55 text-sm leading-7">
            <p>② 처리하고 있는 개인정보는 상기의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
            <p>③ 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다. 다만, 다음의 사유에 해당하는 경우에는 해당 사유 종료시까지 처리·보유합니다.</p>
            <div className="pl-4 flex flex-col gap-1 text-white/45 text-xs leading-6">
              <p>1) 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우에는 해당 수사·조사 종료 시까지</p>
              <p>2) 홈페이지 이용에 따른 채권·채무관계 잔존 시에는 해당 채권·채무관계 정산 시까지</p>
              <p>3) 관련 법령에 따른 의무 보유기간에 해당 시에는 해당 기간 종료 시까지</p>
              <ul className="pl-2 flex flex-col gap-0.5 mt-1">
                {[
                  '통신비밀보호법 : 웹사이트 방문 기록 등의 통신사실확인자료(3개월)',
                  '전자상거래법 : 계약 또는 청약철회 등에 관한 기록(5년)',
                  '전자상거래법 : 대금결제 및 재화 등의 공급에 관한 기록(5년)',
                  '전자상거래법 : 소비자의 불만 또는 분쟁처리에 관한 기록(3년)',
                  '전자상거래법 : 표시·광고에 관한 기록(6개월)',
                  '정보통신망법 : 본인확인에 관한 기록(6개월)',
                ].map((item) => (
                  <li key={item} className="flex gap-1.5"><span className="text-blue-400 shrink-0">•</span>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <SectionTitle>개인정보의 제3자 제공</SectionTitle>
          <div className="flex flex-col gap-3 mb-4 text-white/55 text-sm leading-7">
            <p>① 회사는 정보주체의 개인정보를 개인정보의 처리 목적에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공하고 그 이외에는 정보주체의 개인정보를 제3자에게 제공하지 않습니다.</p>
            <p>② 회사는 다음과 같이 재난, 감염병, 급박한 생명·신체 위협을 초래하는 사건·사고, 급박한 재산 손실 등의 긴급상황이 발생하는 경우 정보주체의 동의 없이 관계기관에 개인정보를 제공할 수 있습니다. 이 경우 회사는 근거법령에 의거하여 필요한 최소한의 개인정보만을 제공하며, 목적과 다르게 제공하지 않겠습니다.</p>
            <p>③ 회사는 원활한 서비스 제공을 위해 다음의 경우 정보주체의 동의를 얻어 필요 최소한의 범위로만 제공합니다.</p>
          </div>

          <div className="w-full overflow-x-auto mb-10">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '580px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['제공받는 자', '제공받는 자의 목적', '제공항목', '보유 및 이용기간'].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td center nowrap>KUCIS</Td>
                  <Td><BulletList items={['동아리 지원 사업', 'KUCIS 대한정보보호동아리연합회 지원']} /></Td>
                  <Td>활동 증빙 서류, 활동 사진 및 영상, 활동 내용, 활동 내역, 생년월일, 소속 정보(학과, 학번), 소속 정보, 실적, 이름, 이메일주소, 병역 정보(군필, 군휴학 여부)</Td>
                  <Td><BulletList items={['계약 종료 시까지']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>한국정보보호산업협회 (KISIA)</Td>
                  <Td><BulletList items={['본인 확인 절차 및 동아리 운영에 필요한 공지사항, 자료 발송, 서비스정보의 제공 등']} /></Td>
                  <Td>이름, 소속 정보(학과, 학번), 학년, 휴대전화번호, 이메일 주소</Td>
                  <Td><BulletList items={['동아리 소속 기간까지']} /></Td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3 */}
          <SectionTitle>개인정보 처리 업무의 위탁</SectionTitle>
          <p className="text-white/55 text-sm leading-7 mb-4">① 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>

          <div className="w-full overflow-x-auto mb-6">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '480px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['위탁받는 자(수탁자)', '위탁 업무'].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td center nowrap>Google LLC</Td>
                  <Td><BulletList items={['GCP(Google Cloud Platform)를 통한 서비스 운영 환경 제공', '데이터 보관']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>Notion Labs, Inc.</Td>
                  <Td><BulletList items={['활동 인프라 제공']} /></Td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 mb-6 text-white/55 text-sm leading-7">
            <p>② 회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>
            <p>③ 「개인정보 보호법」 제26조제6항에 따라 수탁자가 동사의 개인정보 처리 업무를 재위탁하는 경우 회사의 동의를 받고 있으며, 본 개인정보 처리방침을 통하여 재수탁자와 재수탁하는 업무의 내용을공개하고 있습니다.</p>
            <p>④ 위탁업무의 내용이나 수탁자가 변경될 경우에는 지체없이 본 개인정보 처리방침을 통하여 공개하도록 하겠습니다.</p>
            <p>⑤ 개인정보 처리 업무를 국외에 위탁하는 경우는 아래의 &ldquo;개인정보의 국외 이전&rdquo;에서 안내하고 있습니다.</p>
          </div>

          {/* 국외 이전 */}
          <p className="text-white/70 text-sm font-semibold mb-3">■ 개인정보의 국외 이전</p>
          <p className="text-white/55 text-sm leading-7 mb-4">
            회사는 서비스 이용자로부터 수집한 개인정보를 아래와 같이 국외에 이전하고 있으며, 개인정보 보호법 제28조의8제2항에 따라 국외이전에 대해 다음과 같이 안내합니다.
            본 개인정보의 국외 처리위탁 및 보관은 개인정보 보호법 제28조의8제1항제3호에 근거하고 있습니다.
          </p>

          <div className="w-full overflow-x-auto mb-10">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '720px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['위탁받는 자(수탁자)', '국가', '위치(주소)', '일시 및 방법', '위탁항목', '보유 및 이용기간'].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td center nowrap>Google LLC</Td>
                  <Td center>미국</Td>
                  <Td>1600 Amphitheatre Parkway Mountain View, CA 94043, USA</Td>
                  <Td><BulletList items={['서비스 이용 시점에 서버를 통해 전송']} /></Td>
                  <Td>관심분야, 나이, 노션 ID(이메일), 닉네임, 디스코드 ID, 문의 내용, 상담 내역, 서비스 이용 내역, 소속 정보, 소속 정보(학과, 학번), 실적, 아이디, 알게된 경로, 이름, 이메일주소, 카카오톡 ID, 프로필 사진, 활동 내역, 활동 내용, 활동 사진 및 영상, 활동 증빙 서류, 휴대전화번호, 병역 정보(군필, 군휴학 여부)</Td>
                  <Td><BulletList items={['위탁 계약 종료 시까지', '파기 요청 시까지', '회원 탈퇴 시까지']} /></Td>
                </tr>
                <tr>
                  <Td center nowrap>Notion Labs, Inc.</Td>
                  <Td center>United States</Td>
                  <Td>2300 Harrison Street, San Francisco, CA 94110, United States</Td>
                  <Td><BulletList items={['서비스 이용시 데이터 입력']} /></Td>
                  <Td>관심분야, 노션 ID(이메일), 닉네임, 문의 내용, 상담 내역, 서비스 이용 내역, 소속 정보, 소속 정보(학과, 학번), 실적, 알게된 경로, 이름, 이메일주소, 프로필 사진, 활동 내역, 활동 내용, 활동 사진 및 영상, 활동 증빙 서류</Td>
                  <Td><BulletList items={['회원 탈퇴시까지']} /></Td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-white/55 text-sm leading-7 mb-10">
            • 개인정보의 이전을 거부하는 방법, 절차 및 거부의 효과 : 정보주체는 개인정보담당자 및 운영진에게 요청함으로써 개인정보의 국외이전을 거부할 수 있습니다. 다만, 개인정보 국외이전을 거부하실 경우 동아리 관련 지원이 불가할 수 있습니다.
          </p>

          {/* Section 4 */}
          <SectionTitle>개인정보의 파기 및 절차</SectionTitle>
          <div className="flex flex-col gap-3 mb-10 text-white/55 text-sm leading-7">
            <p>① 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</p>
            <p>② 정보주체로부터 동의받은 개인정보 보유기간이 경과하거나 처리목적이 달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나 보관장소를 달리하여 보존합니다.</p>
            <p>③ 개인정보 파기의 절차 및 방법은 다음과 같습니다.</p>
            <ul className="pl-4 flex flex-col gap-1.5 text-white/45 text-xs leading-6">
              <li><span className="text-white/55 font-medium">파기절차 : </span>회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
              <li><span className="text-white/55 font-medium">파기방법 : </span>회사는 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 파기하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <SectionTitle>정보주체와 법정대리인의 권리·의무 및 행사방법</SectionTitle>
          <div className="flex flex-col gap-3 mb-10 text-white/55 text-sm leading-7">
            <p>① 정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</p>
            <p>② 권리 행사는 회사에 대해 「개인정보 보호법」 시행령 제41조 제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며, 회사는 이에 대해 지체없이 조치하겠습니다.</p>
            <p>③ 권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수도 있습니다. 이 경우 &ldquo;개인정보 처리 방법에 관한 고시(제 2023-12호)&rdquo; 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.</p>
            <p>④ 개인정보 열람 및 처리정지 요구는 「개인정보 보호법」 제35조 제4항, 제37조 제2항에 의하여 정보주체의 권리가 제한 될 수 있습니다.</p>
            <p>⑤ 개인정보의 정정 및 삭제 요구는 다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 그 삭제를 요구할 수 없습니다.</p>
            <p>⑥ 회사는 정보주체 권리에 따른 열람의 요구, 정정·삭제의 요구, 처리 정지의 요구 시 열람 등 요구를 한 자가 본인이거나 정당한 대리인지를 확인합니다.</p>
          </div>

          {/* Section 6 */}
          <SectionTitle>개인정보의 안전성 확보조치</SectionTitle>
          <div className="flex flex-col gap-3 mb-10 text-white/55 text-sm leading-7">
            <p>① 회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <div className="pl-4 flex flex-col gap-1 text-white/45 text-xs leading-6">
              <p>1) 관리적 조치 : 내부관리계획 수립·시행, 전담조직 운영, 정기적 직원 교육</p>
              <p>2) 기술적 조치 : 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 개인정보의 암호화, 보안프로그램 설치 및 갱신</p>
            </div>
          </div>

          {/* Section 7 */}
          <SectionTitle>개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항</SectionTitle>
          <div className="flex flex-col gap-3 mb-10 text-white/55 text-sm leading-7">
            <p>① 회사는 아래의 목적으로 &ldquo;쿠키(cookie)&rdquo;를 사용합니다. 쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 컴퓨터 브라우저 또는 모바일 애플리케이션에게 보내는 소량의 정보로, 이용자의 컴퓨터 내부 하드디스크 또는 모바일 기기에 저장됩니다.</p>
            <div className="pl-4 flex flex-col gap-1 text-white/45 text-xs leading-6">
              <p>1) 쿠키의 사용 목적: 로그인 상태 유지, 이용자의 환경설정 유지, 이용자의 서비스 이용 통계 분석을 통한 서비스 개선, 서비스 편의기능 제공</p>
              <p>2) 쿠키 저장 거부 시 불이익: 로그인이 필요한 일부 서비스 이용에 어려움이 있을 수 있습니다. 맞춤형 서비스 이용에 어려움이 있을 수 있습니다. 이용자에게 최적화된 서비스 제공과 정보 제공에 어려움이 있을 수 있습니다.</p>
              <p>3) 쿠키의 설치·운영 및 거부: 브라우저나 앱의 종류에 따라 아래의 방법으로 쿠키의 저장을 거부할 수 있습니다.</p>
              <ul className="pl-2 flex flex-col gap-0.5 mt-1">
                {[
                  'Chrome을 사용하는 경우 쿠키 설정 방법 보기',
                  'Microsoft Edge를 사용하는 경우 쿠키 설정 방법 보기',
                  'Safari를 사용하는 경우 쿠키 설정 방법 보기',
                  'Chrome App을 사용하는 경우 쿠키 설정 방법 보기',
                  'Safari App을 사용하는 경우 쿠키 설정 방법 보기',
                  'Naver App을 사용하는 경우 쿠키 설정 방법: 설정 > 인터넷 사용 기록 > 쿠키 삭제',
                ].map((item) => (
                  <li key={item} className="flex gap-1.5"><span className="text-blue-400 shrink-0">•</span>{item}</li>
                ))}
              </ul>
            </div>
            <p>② 회사는 이용자에게 더 나은 이용 경험을 제공하기 위하여, 홈페이지/앱 접속 시 자동으로 방문기록과 접속 수단에 관한 정보를 수집하여 분석하는 &ldquo;웹 로그 분석 도구&rdquo;를 사용합니다. 경우에 따라 회사는 웹 로그 분석 업무를 타사에 위탁하며, 그 과정에서 수집된 정보가 국외로 이전될 수 있습니다. 이에 관한 내용은 &ldquo;개인정보 처리의 위탁&rdquo; 부분에서 확인하실 수 있습니다.</p>
            <div className="pl-4 flex flex-col gap-1 text-white/45 text-xs leading-6">
              <p>1) 웹 로그 분석 도구의 사용 목적: 이용자의 서비스 이용 통계 분석을 통한 서비스 개선</p>
              <p>2) 웹 로그 분석 도구의 거부·차단 방법</p>
              <ul className="pl-2 mt-0.5">
                <li className="flex gap-1.5"><span className="text-blue-400 shrink-0">•</span>[Google Analytics] 보기</li>
              </ul>
              <p>3) 거부 시 불이익: 서비스 이용에 불이익은 없습니다. 다만, 서비스 개선을 위한 통계 분석에 영향을 끼칠 수 있습니다.</p>
            </div>
          </div>

          {/* Section 8 */}
          <SectionTitle>행태정보의 수집·이용 및 거부 등에 관한 사항</SectionTitle>
          <p className="text-white/55 text-sm leading-7 mb-10">
            회사는 온라인 맞춤형 광고 등을 위한 행태정보를 수집·이용·제공하지 않습니다.
          </p>

          {/* Section 9 */}
          <SectionTitle>개인정보 보호책임자 및 개인정보 열람청구</SectionTitle>
          <div className="flex flex-col gap-3 mb-4 text-white/55 text-sm leading-7">
            <p>① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다.</p>
            <p>② 정보주체는 「개인정보 보호법」 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보주체의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.</p>
          </div>

          <div className="w-full overflow-x-auto mb-6">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '480px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['구분', '담당자', '연락처'].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td center nowrap>개인정보 보호책임자</Td>
                  <Td>직책/직위: 회장<br />성명: 채주원</Td>
                  <Td>pay1oad.gachon@gmail.com</Td>
                </tr>
                <tr>
                  <Td center nowrap>개인정보 담당부서</Td>
                  <Td>부서명: Pay1oad 운영진 / 인사총무팀</Td>
                  <Td>pay1oad.gachon@gmail.com</Td>
                </tr>
                <tr>
                  <Td center nowrap>개인정보 열람청구</Td>
                  <Td>부서명: Pay1oad 운영진<br />담당자 성명: 채주원</Td>
                  <Td>pay1oad.gachon@gmail.com</Td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-white/55 text-sm leading-7 mb-10">
            ③ 정보주체는 회사의 서비스(또는 사업)을 이용하시면서 발생한 모든 개인정보보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의할 수 있습니다. 회사는 정보주체의 문의에 대해 지체없이 답변 및 처리해 드릴 것입니다.
          </p>

          {/* Section 10 */}
          <SectionTitle>권익침해 구제 방법</SectionTitle>
          <div className="flex flex-col gap-3 mb-10 text-white/55 text-sm leading-7">
            <p>① 회사는 정보주체의 개인정보자기결정권을 보장하고, 개인정보침해로 인한 상담 및 피해 구제를 위해 노력하고 있으며, 신고나 상담이 필요한 경우 담당부서로 연락해 주시기 바랍니다.</p>
            <p>② 정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의 신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.</p>
            <ul className="pl-2 flex flex-col gap-1 text-white/45 text-xs leading-6">
              {[
                '개인정보분쟁조정위원회 : (국번없이) 1833-6972 (www.kopico.go.kr)',
                '개인정보침해신고센터 : (국번없이) 118 (privacy.kisa.or.kr)',
                '대검찰청 : (국번없이) 1301 (www.spo.go.kr)',
                '경찰청 : (국번없이) 182 (ecrm.cyber.go.kr)',
              ].map((item) => (
                <li key={item} className="flex gap-1.5"><span className="text-blue-400 shrink-0">•</span>{item}</li>
              ))}
            </ul>
            <p>③ 「개인정보 보호법」 제35조(개인정보의 열람), 제36조(개인정보의 정정·삭제), 제37조(개인정보의 처리정지 등)의 규정에 의한 요구에 대하여 공공기관의 장이 행한 처분 또는 부작위로 인하여 권리 또는 이익의 침해를 받은 자는 행정심판법이 정하는 바에 따라 행정심판을 청구할 수 있다.</p>
            <ul className="pl-2 flex flex-col gap-1 text-white/45 text-xs leading-6">
              <li className="flex gap-1.5"><span className="text-blue-400 shrink-0">•</span>중앙행정심판위원회 : (국번없이) 110 (www.simpan.go.kr)</li>
            </ul>
          </div>

          {/* 처리방침 변경 */}
          <div
            className="rounded-xl p-5 mb-8"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-white/70 text-sm font-semibold mb-3">■ 개인정보 처리방침의 변경에 관한 사항</p>
            <div className="flex flex-col gap-2 text-white/55 text-xs leading-6">
              <p>① 본 방침은 2026년 02월 23일부터 시행됩니다.</p>
              <p>② 이전의 개인정보 처리방침은 아래에서 확인할 수 있습니다.</p>
              <ul className="pl-2">
                <li className="flex gap-1.5"><span className="text-blue-400 shrink-0">•</span>2025년 02월 11일</li>
              </ul>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-4 flex justify-end">
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-white/80 text-sm font-semibold mb-4 mt-2">
      <span className="text-blue-400 mr-2">■</span>{children}
    </p>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-white/70 font-semibold text-center py-3 px-3"
      style={{ border: '1px solid rgba(255,255,255,0.10)' }}
    >
      {children}
    </th>
  )
}

function Td({ children, center, nowrap }: { children: React.ReactNode; center?: boolean; nowrap?: boolean }) {
  return (
    <td
      className={`text-white/55 py-4 px-3 align-top${center ? ' text-center' : ''}`}
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        whiteSpace: nowrap ? 'nowrap' : undefined,
      }}
    >
      {children}
    </td>
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
      <div><span className="text-white/70 font-medium">필수: </span>{required}</div>
      <div><span className="text-white/50 font-medium">선택: </span>{optional}</div>
    </div>
  )
}
