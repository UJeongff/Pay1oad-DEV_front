/**
 * 홈 섹션 제목: 브랜드 * 아이콘 + 영문 대문자 라벨.
 * About · Fields · Blog · FAQ 가 모두 이 컴포넌트를 써서 크기·굵기·간격이 같다.
 */
export default function SectionLabel({ label, className = '' }: { label: string; className?: string }) {
  return (
    <h2 className={`flex items-center justify-center gap-2 ${className}`}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
          stroke="#1C5AFF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-white text-base font-bold tracking-widest uppercase">{label}</span>
    </h2>
  )
}
