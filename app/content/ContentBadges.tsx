// Content 목록 카드와 상세 정보 카드가 같이 쓰는 표시 (시안 C안)
// - 유형: 아이콘이 달린 칩 (Study = 책, Project = 연필)
// - 공개 범위: 팀 전용일 때만 자물쇠 + "팀 전용" (전체 공개는 표시하지 않는다)

export type ContentType = 'STUDY' | 'PROJECT'

export function TypeChip({ type, className }: { type: ContentType; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold pl-2 pr-2.5 py-[3px] rounded-md ${className}`}>
      {type === 'STUDY' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m14.7 6.3 3 3L9 18H6v-3z"/><path d="M3 21h18"/>
        </svg>
      )}
      {type === 'STUDY' ? 'Study' : 'Project'}
    </span>
  )
}

export function TeamOnlyMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${className}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
      </svg>
      팀 전용
    </span>
  )
}
