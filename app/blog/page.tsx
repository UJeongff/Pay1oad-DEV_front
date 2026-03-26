'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

// PostSummaryResponse 필드와 일치
interface Post {
  id: number
  title: string
  category: 'KNOWLEDGE' | 'QNA' | 'ACTIVITIES'
  authorName: string       // 서버에서 표시 정책 적용된 이름
  likeCount: number
  commentCount: number
  isFeatured: boolean      // 고정 여부
  publishedAt: string | null
  createdAt: string
  thumbnail?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const PAGE_SIZE = 9

const FALLBACK_IMAGES = ['/blog/blog1.jpg', '/blog/blog2.jpg', '/blog/blog3.jpg']

const CATEGORY_LABEL: Record<Post['category'], string> = {
  KNOWLEDGE: 'Knowledge',
  QNA: 'QnA',
  ACTIVITIES: 'Activities',
}

const CATEGORY_COLOR: Record<Post['category'], { border: string; text: string; bg: string }> = {
  ACTIVITIES: { border: '#FF4D4D', text: '#FF4D4D', bg: 'rgba(255,77,77,0.08)' },
  KNOWLEDGE:  { border: '#00C96F', text: '#00C96F', bg: 'rgba(0,201,111,0.08)' },
  QNA:        { border: '#1C5AFF', text: '#1C5AFF', bg: 'rgba(28,90,255,0.08)' },
}

const SORT_OPTIONS = ['최신순', '인기순'] as const
type SortOption = typeof SORT_OPTIONS[number]

const CATEGORY_OPTIONS: Array<{ value: Post['category'] | 'ALL'; label: string }> = [
  { value: 'ALL',        label: 'All' },
  { value: 'ACTIVITIES', label: 'Activities' },
  { value: 'KNOWLEDGE',  label: 'Knowledge' },
  { value: 'QNA',        label: 'QnA' },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function BlogPage() {
  const { user } = useAuthContext()
  const [posts, setPosts] = useState<Post[]>([])
  const [sort, setSort] = useState<SortOption>('최신순')
  const [category, setCategory] = useState<Post['category'] | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [openSort, setOpenSort] = useState(false)
  const [openFilter, setOpenFilter] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  // 카테고리/정렬 변경 시 첫 페이지로 리셋
  useEffect(() => { setPage(1) }, [category, sort])

  // 서버사이드 페이지네이션 + 카테고리 필터
  useEffect(() => {
    async function fetchPosts() {
      try {
        const params = new URLSearchParams({
          page: String(page - 1),  // 백엔드는 0-indexed
          size: String(PAGE_SIZE),
        })
        if (category !== 'ALL') params.set('category', category)

        const res = await fetchWithAuth(`${API_URL}/v1/posts?${params}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()

        // ApiResponse<Page<PostSummaryResponse>>
        // json.data = Page 객체 { content: [...], totalPages: N, ... }
        const pageData = json.data
        const list: Post[] = pageData?.content ?? []

        // 클라이언트 정렬 (인기순 = likeCount 내림차순, 최신순 = createdAt 내림차순)
        const sorted = sort === '인기순'
          ? [...list].sort((a, b) => b.likeCount - a.likeCount)
          : [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setPosts(sorted)
        setTotalPages(Math.max(1, pageData?.totalPages ?? 1))
      } catch {
        setPosts([])
      }
    }
    fetchPosts()
  }, [page, category, sort])

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setOpenSort(false)
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setOpenFilter(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    zIndex: 50,
    minWidth: '130px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '6px',
    borderRadius: '5px',
    background: 'rgba(0, 0, 0, 0.50)',
    backdropFilter: 'blur(2.25px)',
  }

  const dropdownItemStyle = (active: boolean, hovered: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '6px 16px',
    fontSize: '14px',
    color: active || hovered ? '#fff' : 'rgba(255,255,255,0.65)',
    background: active || hovered ? 'rgba(255,255,255,0.12)' : 'rgba(0, 0, 0, 0.50)',
    backdropFilter: 'blur(2.25px)',
    borderRadius: '5px',
    cursor: 'pointer',
    border: 'none',
  })

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>

      {/* Background */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '100vh',
          backgroundImage: 'url(/background.png)',
          backgroundSize: '130%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
        }}
      />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center pt-46 pb-25 px-6">
        <div className="relative z-10 flex flex-col items-start mb-5">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="mb-2 ml-1">
            <path
              d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
              stroke="#1C5AFF" strokeWidth="2.8" strokeLinecap="round"
            />
          </svg>
          <h1
            className="text-white font-black uppercase"
            style={{
              fontSize: 'clamp(3.5rem, 8vw, 6rem)',
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            BLOG
          </h1>
        </div>
        <p className="relative z-10 text-white/75 font-medium mb-3" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
          동아리 활동 게시물, 지식글, 정보 공유글을 게시하는 공간입니다.
        </p>
        <p className="relative z-10 text-white/40 text-sm leading-relaxed">
          * 타인에 대한 비방, 욕설, 저작권 침해 등 부적절한 내용을 포함한 게시물은<br />
          서비스 운영 원칙에 따라 사전 고지 없이 삭제될 수 있습니다.
        </p>
      </section>

      {/* ── Section Header ──────────────────────────── */}
      <div
        style={{
          width: '100%', height: '49px',
          background: 'rgba(0, 65, 239, 0.4)',
          borderRadius: '100px 100px 0 0',
          display: 'flex', alignItems: 'center', padding: '0 80px',
        }}
      >
        <span className="text-white text-sm font-medium tracking-widest flex-1">Blog</span>
        <div className="flex items-center gap-3">

          {/* Sort dropdown */}
          <div ref={sortRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setOpenSort(v => !v); setOpenFilter(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '14px', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {sort}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4L6 8L10 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {openSort && (
              <div style={dropdownStyle}>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt} style={dropdownItemStyle(sort === opt, hoveredItem === `sort-${opt}`)}
                    onMouseEnter={() => setHoveredItem(`sort-${opt}`)} onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => { setSort(opt); setOpenSort(false) }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category filter */}
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => { setOpenFilter(v => !v); setOpenSort(false) }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: openFilter ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}
            >
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                <path d="M1 1H17M4 7H14M7 13H11" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            {openFilter && (
              <div style={dropdownStyle}>
                {CATEGORY_OPTIONS.map(opt => (
                  <button key={opt.value} style={dropdownItemStyle(category === opt.value, hoveredItem === `cat-${opt.value}`)}
                    onMouseEnter={() => setHoveredItem(`cat-${opt.value}`)} onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => { setCategory(opt.value); setOpenFilter(false) }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Card Grid ───────────────────────────────── */}
      <section className="relative py-10" style={{ background: 'rgba(0, 65, 239, 0.05)' }}>
        <div className="max-w-6xl mx-auto px-[5vw]">
          {posts.length === 0 ? (
            <p className="text-white/40 text-center py-20">게시글이 없습니다.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {posts.map((post, idx) => (
                <PostCard
                  key={post.id}
                  post={post}
                  thumb={post.thumbnail ?? FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                  color={CATEGORY_COLOR[post.category]}
                  user={user}
                />
              ))}
            </div>
          )}

          {/* ── Bottom bar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '48px', marginBottom: '48px', gap: '20px' }}>
            {/* 작성하기 */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                href="/blog/write"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.6)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                작성하기
              </Link>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', borderRadius: '6px' }}>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n === page ? 'rgba(255,255,255,0.12)' : 'transparent', border: 'none', cursor: 'pointer', color: n === page ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: '14px', fontWeight: n === page ? 700 : 400, borderRadius: '6px', transition: 'background 0.15s, color 0.15s' }}
                  onMouseEnter={e => { if (n !== page) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
                  onMouseLeave={e => { if (n !== page) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', borderRadius: '6px' }}>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </main>
  )
}

function PostCard({
  post, thumb, color, user,
}: {
  post: Post
  thumb: string
  color: { border: string; text: string; bg: string }
  user: import('@/app/context/AuthContext').AuthUser | null
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'ADMIN'
  // authorName은 서버 정책으로 변환된 이름이므로 nickname으로 비교 (KNOWLEDGE/QNA 한정)
  const isOwner = user != null && post.authorName === user.nickname
  const menuItems = isAdmin
    ? ['고정하기', '삭제하기']
    : isOwner
    ? ['수정하기', '삭제하기']
    : null

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  return (
    <Link
      href={`/blog/${post.id}`}
      style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', background: 'rgba(52,52,52,0.4)', border: '1px solid rgba(255,255,255,0.08)', transition: 'transform 0.2s, border-color 0.2s', cursor: 'pointer', textDecoration: 'none' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', overflow: 'hidden' }}>
        <Image src={thumb} alt={post.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 1200px) 33vw, 380px" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(10,15,30,0.6) 100%)' }} />
        {post.isFeatured && (
          <div style={{ position: 'absolute', top: '12px', right: '12px', width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/pin.svg" alt="pinned" width={16} height={16} />
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 14px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, lineHeight: 1.35, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {post.title}
          </h3>
          {menuItems && (
            <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.preventDefault()}>
              <button onClick={e => { e.preventDefault(); setMenuOpen(v => !v) }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
              {menuOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 60, minWidth: '110px', padding: '6px', borderRadius: '8px', background: 'rgba(10,15,30,0.92)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {menuItems.map(item => (
                    <button key={item}
                      style={{ background: 'transparent', border: 'none', color: item === '삭제하기' ? 'rgba(255,100,100,0.9)' : 'rgba(255,255,255,0.8)', fontSize: '13px', padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '5px', width: '100%' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      onClick={e => { e.preventDefault(); setMenuOpen(false) }}>
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date */}
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '14px' }}>
          {formatDate(post.publishedAt ?? post.createdAt)}
        </p>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: color.text, border: `1px solid ${color.border}`, background: color.bg, borderRadius: '100px', padding: '3px 12px' }}>
            {CATEGORY_LABEL[post.category]}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {post.commentCount}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {post.likeCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
