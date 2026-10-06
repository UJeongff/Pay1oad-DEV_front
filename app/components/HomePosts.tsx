'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import SectionLabel from '@/app/components/SectionLabel'
import Reveal from '@/app/components/Reveal'
import PostTitleCover from '@/app/components/PostTitleCover'

interface Post {
  id: number
  title: string
  category: 'KNOWLEDGE' | 'QNA' | 'ACTIVITIES'
  authorName: string
  publishedAt: string
  createdAt?: string
  summary?: string
  thumbnailUrl?: string
  likeCount?: number
  isFeatured?: boolean
  featuredAt?: string | null
}

const CATEGORY_LABEL: Record<Post['category'], string> = {
  KNOWLEDGE: '지식',
  QNA: 'Q&A',
  ACTIVITIES: '활동',
}

// 분류 표시: 블로그 목록과 같은 빛나는 점 + 같은 색 글자 (globals.css 의 --color-cat-*)
const CATEGORY_STYLE: Record<Post['category'], { text: string; dot: string }> = {
  ACTIVITIES: { text: 'text-cat-activities', dot: 'bg-cat-activities shadow-[0_0_8px_var(--color-cat-activities)]' },
  KNOWLEDGE:  { text: 'text-cat-knowledge',  dot: 'bg-cat-knowledge shadow-[0_0_8px_var(--color-cat-knowledge)]' },
  QNA:        { text: 'text-cat-qna',        dot: 'bg-cat-qna shadow-[0_0_8px_var(--color-cat-qna)]' },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'
const FALLBACK_IMAGE = '/logo_blur.png'

function toFullUrl(url: string | null | undefined): string {
  if (!url) return FALLBACK_IMAGE
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${API_URL}${url}`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

const CARD_COUNT = 3

/** 실제 카드와 같은 골격(16:10 썸네일 + 본문 줄)이라 로딩이 끝나도 레이아웃이 튀지 않는다. */
function PostCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-full rounded-2xl overflow-hidden flex flex-col bg-surface border border-line motion-safe:animate-pulse"
    >
      <div className="w-full aspect-[16/10] bg-surface-raised" />
      <div className="p-5 flex flex-col gap-3">
        <div className="h-3 w-10 rounded bg-line" />
        <div className="h-4 w-4/5 rounded bg-line" />
        <div className="h-3 w-full rounded bg-surface-raised" />
        <div className="h-3 w-2/3 rounded bg-surface-raised" />
        <div className="h-3 w-1/3 rounded bg-surface-raised mt-2" />
      </div>
    </div>
  )
}

export default function HomePosts() {
  // null = 아직 불러오는 중. 가짜 글을 먼저 보여주면 실제 글로 바뀌는 순간이 그대로 노출된다.
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/v1/posts?page=0&size=20&sort=createdAt,desc`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: Post[] = Array.isArray(data?.data?.content) ? data.data.content : []
        if (list.length > 0) {
          let pinTimes: Record<number, number> = {}
          try { pinTimes = JSON.parse(localStorage.getItem('pinTimes') ?? '{}') } catch {}
          const sorted = [...list].sort((a, b) => {
            const pinDiff = (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)
            if (pinDiff !== 0) return pinDiff
            if (a.isFeatured && b.isFeatured) {
              const aPin = pinTimes[a.id] ?? (a.featuredAt ? new Date(a.featuredAt).getTime() : 0)
              const bPin = pinTimes[b.id] ?? (b.featuredAt ? new Date(b.featuredAt).getTime() : 0)
              if (bPin !== aPin) return bPin - aPin
            }
            return new Date(b.createdAt ?? b.publishedAt).getTime() - new Date(a.createdAt ?? a.publishedAt).getTime()
          })
          setPosts(sorted.slice(0, CARD_COUNT))
        } else {
          setPosts([])
        }
      })
      .catch(() => setPosts([]))
  }, [])

  return (
    <section className="pt-20 pb-20 px-[5vw]">
      <div className="max-w-5xl mx-auto">

        {/* Header — 라벨은 가운데, 더보기 링크는 오른쪽. 모바일에선 라벨 아래 오른쪽으로 내려간다 */}
        <Reveal className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 mb-7">
          <span className="hidden sm:block" />
          <SectionLabel label="Blog" />
          <Link
            href="/blog"
            className="justify-self-end flex items-center gap-1 whitespace-nowrap text-sm text-fg-subtle hover:text-white transition-colors"
          >
            게시글 더 보러가기
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </Reveal>

        {/* Cards — 카드마다 Reveal 로 감싸 차례로 등장시킨다. 감싸는 div 에서만 움직이므로 카드 hover 효과는 그대로다 */}
        {posts !== null && posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-fg-subtle">아직 게시글이 없습니다.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {posts === null && Array.from({ length: CARD_COUNT }, (_, i) => (
            <Reveal key={i} delay={(i + 1) * 90} className="h-full"><PostCardSkeleton /></Reveal>
          ))}
          {posts?.map((post, i) => {
            const isHovered = hoveredId === post.id
            const isDimmed = hoveredId !== null && !isHovered

            return (
              <Reveal key={post.id} delay={(i + 1) * 90} className="h-full">
              <Link
                href={`/blog/${post.id}`}
                className="h-full rounded-2xl overflow-hidden flex flex-col cursor-pointer bg-surface border border-line"
                style={{
                  transition: 'transform 0.3s ease, filter 0.3s ease, opacity 0.3s ease',
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  filter: isDimmed ? 'grayscale(0.7) brightness(0.5)' : 'none',
                  opacity: isDimmed ? 0.6 : 1,
                }}
                onMouseEnter={() => setHoveredId(post.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Thumbnail */}
                {(() => {
                  const thumb = toFullUrl(post.thumbnailUrl)
                  const isFallback = thumb === FALLBACK_IMAGE
                  return (
                    <div className="w-full aspect-[16/10] flex-shrink-0 relative overflow-hidden">
                      {/* 썸네일 없는 글은 블로그 목록과 같은 제목 표지 */}
                      {isFallback ? (
                        <PostTitleCover title={post.title} category={post.category} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={post.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      {post.isFeatured && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Image src="/pin.svg" alt="pinned" width={14} height={14} />
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Body */}
                <div className="p-5 flex flex-col gap-2">
                  <span className={`inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase ${CATEGORY_STYLE[post.category].text}`}>
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CATEGORY_STYLE[post.category].dot}`} />
                    {CATEGORY_LABEL[post.category]}
                  </span>
                  <p className="text-white font-semibold text-base leading-snug line-clamp-2">
                    {post.title}
                  </p>
                  {post.summary && stripHtml(post.summary) && (
                    <p className="text-fg-subtle text-sm leading-relaxed line-clamp-3">
                      {stripHtml(post.summary)}
                    </p>
                  )}
                  <p className="text-fg-subtle text-xs mt-auto pt-2" suppressHydrationWarning>
                    {post.authorName} · {new Date(post.publishedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </Link>
              </Reveal>
            )
          })}
        </div>
        )}

      </div>
    </section>
  )
}
