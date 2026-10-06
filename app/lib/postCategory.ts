// 블로그 글 분류 표시를 블로그 목록·마이페이지가 같이 쓴다

export type PostCategory = 'KNOWLEDGE' | 'QNA' | 'ACTIVITIES'

export const CATEGORY_LABEL: Record<PostCategory, string> = {
  KNOWLEDGE: 'Knowledge',
  QNA: 'QnA',
  ACTIVITIES: 'Activities',
}

// 분류 표시: 홈 히어로의 ● ACTIVE 처럼 같은 색의 빛나는 점 + 글자 (globals.css 의 --color-cat-*)
export const CATEGORY_STYLE: Record<PostCategory, { text: string; dot: string }> = {
  ACTIVITIES: { text: 'text-cat-activities', dot: 'bg-cat-activities shadow-[0_0_8px_var(--color-cat-activities)]' },
  KNOWLEDGE:  { text: 'text-cat-knowledge',  dot: 'bg-cat-knowledge shadow-[0_0_8px_var(--color-cat-knowledge)]' },
  QNA:        { text: 'text-cat-qna',        dot: 'bg-cat-qna shadow-[0_0_8px_var(--color-cat-qna)]' },
}

// 사이트 공통 날짜 표기: 2026.10.07
export function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
