import { CATEGORY_LABEL, type PostCategory } from '@/app/lib/postCategory'

// 제목 표지에 번지는 분류 색 (--color-cat-* 와 같은 색의 옅은 버전)
const CATEGORY_TINT: Record<PostCategory, string> = {
  ACTIVITIES: 'rgba(226,154,156,0.30)',
  KNOWLEDGE:  'rgba(134,207,146,0.26)',
  QNA:        'rgba(141,188,228,0.30)',
}

/**
 * 썸네일 없는 글의 표지 (블로그 목록 · 홈 BLOG 가 같이 쓴다).
 * 왼쪽 위에서 분류 색이 은은하게 번지고, 제목을 크게 얹는다.
 * 오른쪽 아래의 용 엠블럼과 왼쪽 위 "PAY1OAD / 분류" 로 빈칸이 아니라 의도한 표지처럼 보이게 한다.
 * 부모는 position: relative 여야 한다.
 */
export default function PostTitleCover({ title, category }: { title: string; category: PostCategory }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{ background: `radial-gradient(120% 120% at 0% 0%, ${CATEGORY_TINT[category]} 0%, transparent 60%), linear-gradient(135deg, #0e1a36 0%, #070f20 100%)` }}
    >
      {/* 용 엠블럼(public/blog_cover_mark.webp)을 마스크로 써서 분류 색을 입힌다 */}
      <div
        className="absolute -right-10 -bottom-12 h-[210px] w-[210px] opacity-[0.22]"
        style={{
          background: `var(--color-cat-${category.toLowerCase()})`,
          WebkitMaskImage: 'url(/blog_cover_mark.webp)',
          maskImage: 'url(/blog_cover_mark.webp)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
      <p className="absolute left-5 top-4 font-mono text-[11px] tracking-[0.14em] text-fg-faint">
        PAY1OAD / {CATEGORY_LABEL[category].toUpperCase()}
      </p>
      <p
        className="absolute left-5 right-14 bottom-[18px] line-clamp-2 text-[21px] font-bold leading-[1.35] tracking-[-0.01em] text-white"
        style={{ wordBreak: 'keep-all' }}
      >
        {title}
      </p>
    </div>
  )
}
