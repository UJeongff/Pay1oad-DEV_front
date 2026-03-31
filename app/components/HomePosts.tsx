'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

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

const CATEGORY_COLOR: Record<Post['category'], string> = {
  ACTIVITIES: '#FF9193',
  KNOWLEDGE:  '#74FF89',
  QNA:        '#91CDFF',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'
const FALLBACK_IMAGE = '/logo_blur.png'

function toFullUrl(url: string | null | undefined): string {
  if (!url) return FALLBACK_IMAGE
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${API_URL}${url}`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

const PLACEHOLDER_POSTS: Post[] = [
  { id: 1, title: '게시글 제목', category: 'ACTIVITIES', authorName: 'Pay1oad', publishedAt: new Date().toISOString() },
  { id: 2, title: '게시글 제목', category: 'KNOWLEDGE', authorName: 'Pay1oad', publishedAt: new Date().toISOString() },
  { id: 3, title: '게시글 제목', category: 'QNA',        authorName: 'Pay1oad', publishedAt: new Date().toISOString() },
]

export default function HomePosts() {
  const [posts, setPosts] = useState<Post[]>(PLACEHOLDER_POSTS)
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
          setPosts(sorted.slice(0, 3))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <section className="pt-20 pb-20 px-[5vw]">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-end mb-6">
          <Link
            href="/blog"
            className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
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
        </div>

        {/* Cards */}
        <div className="grid grid-cols-3 gap-5">
          {posts.map((post) => {
            const isHovered = hoveredId === post.id
            const isDimmed = hoveredId !== null && !isHovered

            return (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="rounded-2xl overflow-hidden flex flex-col cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
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
                    <div
                      className="w-full aspect-[16/10] flex-shrink-0 relative overflow-hidden"
                      style={{ background: isFallback ? 'rgba(20,25,45,0.8)' : undefined }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt={post.title}
                        style={{
                          position: 'absolute', inset: 0, width: '100%', height: '100%',
                          objectFit: isFallback ? 'contain' : 'cover',
                          padding: isFallback ? '10%' : undefined,
                          opacity: isFallback ? 0.5 : 1,
                        }}
                      />
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
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: CATEGORY_COLOR[post.category] }}>
                    {CATEGORY_LABEL[post.category]}
                  </span>
                  <p className="text-white font-semibold text-base leading-snug line-clamp-2">
                    {post.title}
                  </p>
                  {post.summary && stripHtml(post.summary) && (
                    <p className="text-white/45 text-sm leading-relaxed line-clamp-3">
                      {stripHtml(post.summary)}
                    </p>
                  )}
                  <p className="text-white/30 text-xs mt-auto pt-2" suppressHydrationWarning>
                    {post.authorName} · {new Date(post.publishedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </section>
  )
}
