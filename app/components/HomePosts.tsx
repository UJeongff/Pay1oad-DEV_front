'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Post {
  id: number
  title: string
  category: 'KNOWLEDGE' | 'QNA' | 'ACTIVITIES'
  author: string
  createdAt: string
  summary?: string
  thumbnailUrl?: string
}

const CATEGORY_LABEL: Record<Post['category'], string> = {
  KNOWLEDGE: '지식',
  QNA: 'Q&A',
  ACTIVITIES: '활동',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const FALLBACK_IMAGES = [
  '/blog/blog1.jpg',
  '/blog/blog2.jpg',
  '/blog/blog3.jpg',
]

const PLACEHOLDER_POSTS: Post[] = [
  { id: 1, title: '게시글 제목', category: 'ACTIVITIES', author: 'Pay1oad', createdAt: new Date().toISOString() },
  { id: 2, title: '게시글 제목', category: 'KNOWLEDGE', author: 'Pay1oad', createdAt: new Date().toISOString() },
  { id: 3, title: '게시글 제목', category: 'QNA',        author: 'Pay1oad', createdAt: new Date().toISOString() },
]

export default function HomePosts() {
  const [posts, setPosts] = useState<Post[]>(PLACEHOLDER_POSTS)
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/v1/posts`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const raw = data?.data ?? data?.content ?? data
        const list: Post[] = Array.isArray(raw) ? raw : []
        if (list.length > 0) setPosts(list.slice(0, 3))
      })
      .catch(() => {})
  }, [])

  return (
    <section className="bg-[#040d1f] pt-20 pb-20 px-[5vw]">
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
                <div
                  className="w-full aspect-[16/10] flex-shrink-0"
                  style={{
                    background: `url(${post.thumbnailUrl ?? FALLBACK_IMAGES[posts.indexOf(post) % FALLBACK_IMAGES.length]}) center/cover no-repeat`,
                  }}
                />

                {/* Body */}
                <div className="p-5 flex flex-col gap-2">
                  <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#1C5AFF' }}>
                    {CATEGORY_LABEL[post.category]}
                  </span>
                  <p className="text-white font-semibold text-base leading-snug line-clamp-2">
                    {post.title}
                  </p>
                  {post.summary && (
                    <p className="text-white/45 text-sm leading-relaxed line-clamp-3">
                      {post.summary}
                    </p>
                  )}
                  <p className="text-white/30 text-xs mt-auto pt-2" suppressHydrationWarning>
                    {post.author} · {new Date(post.createdAt).toLocaleDateString('ko-KR')}
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
