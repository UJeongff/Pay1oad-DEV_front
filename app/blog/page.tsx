'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  featuredAt?: string | null // 고정된 시각
  publishedAt: string | null
  createdAt: string
  thumbnailUrl?: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'
const PAGE_SIZE = 9

const FALLBACK_IMAGE = '/logo_blur.png'

function toFullUrl(url: string | null | undefined): string {
  if (!url) return FALLBACK_IMAGE
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${API_URL}${url}`
}

const CATEGORY_LABEL: Record<Post['category'], string> = {
  KNOWLEDGE: 'Knowledge',
  QNA: 'QnA',
  ACTIVITIES: 'Activities',
}

const CATEGORY_COLOR: Record<Post['category'], { border: string; text: string; bg: string }> = {
  ACTIVITIES: { border: '#FF9193', text: '#FF9193', bg: 'rgba(255,145,147,0.08)' },
  KNOWLEDGE:  { border: '#74FF89', text: '#74FF89', bg: 'rgba(116,255,137,0.08)' },
  QNA:        { border: '#91CDFF', text: '#91CDFF', bg: 'rgba(145,205,255,0.08)' },
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

const PIN_TIMES_KEY = 'pinTimes'

function getPinTimes(): Record<number, number> {
  try { return JSON.parse(localStorage.getItem(PIN_TIMES_KEY) ?? '{}') } catch { return {} }
}

function setPinTime(postId: number, time: number | null) {
  const stored = getPinTimes()
  if (time === null) delete stored[postId]
  else stored[postId] = time
  localStorage.setItem(PIN_TIMES_KEY, JSON.stringify(stored))
}

function sortPosts(list: Post[], sortOption: SortOption): Post[] {
  const pinTimes = getPinTimes()
  return [...list].sort((a, b) => {
    // 1) 고정 여부 (고정 우선)
    const pinDiff = (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)
    if (pinDiff !== 0) return pinDiff
    // 2) 둘 다 고정된 경우 → 핀한 시각 내림차순 (최근 pin이 앞)
    if (a.isFeatured && b.isFeatured) {
      const aPin = pinTimes[a.id] ?? (a.featuredAt ? new Date(a.featuredAt).getTime() : 0)
      const bPin = pinTimes[b.id] ?? (b.featuredAt ? new Date(b.featuredAt).getTime() : 0)
      if (bPin !== aPin) return bPin - aPin
    }
    // 3) 나머지는 선택한 정렬 기준
    return sortOption === '인기순'
      ? b.likeCount - a.likeCount
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export default function BlogPage() {
  const { user } = useAuthContext()
  const [posts, setPosts] = useState<Post[]>([])
  const [canWrite, setCanWrite] = useState(false)
  const [sort, setSort] = useState<SortOption>('최신순')

  const handlePinToggle = (postId: number, newIsFeatured: boolean) => {
    const now = Date.now()
    setPinTime(postId, newIsFeatured ? now : null)
    setPosts(prev => {
      const updated = prev.map(p =>
        p.id === postId ? { ...p, isFeatured: newIsFeatured } : p
      )
      return sortPosts(updated, sort)
    })
  }

  const handleDelete = (postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState<Post['category'] | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [openSort, setOpenSort] = useState(false)
  const [openFilter, setOpenFilter] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const sortRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  // 글쓰기 권한 확인 (로그인 시에만)
  useEffect(() => {
    if (!user) { setCanWrite(false); return }
    fetchWithAuth(`${API_URL}/v1/posts/can-write`)
      .then(res => res.ok ? res.json() : null)
      .then(json => setCanWrite(json?.data ?? false))
      .catch(() => setCanWrite(false))
  }, [user])

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(timer)
  }, [search])

  // 카테고리/정렬/검색 변경 시 첫 페이지로 리셋
  useEffect(() => { setPage(1) }, [category, sort, debouncedSearch])

  // 서버사이드 페이지네이션 + 카테고리 필터 + 키워드 검색
  useEffect(() => {
    async function fetchPosts() {
      try {
        const params = new URLSearchParams({
          page: String(page - 1),  // 백엔드는 0-indexed
          size: String(PAGE_SIZE),
        })
        if (category !== 'ALL') params.set('category', category)
        if (debouncedSearch.trim()) params.set('keyword', debouncedSearch.trim())

        const res = await fetchWithAuth(`${API_URL}/v1/posts?${params}`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()

        // ApiResponse<Page<PostSummaryResponse>>
        // json.data = Page 객체 { content: [...], totalPages: N, ... }
        const pageData = json.data
        const list: Post[] = pageData?.content ?? []

        const sorted = sortPosts(list, sort)

        setPosts(sorted)
        setTotalPages(Math.max(1, pageData?.totalPages ?? 1))
      } catch {
        setPosts([])
      }
    }
    fetchPosts()
  }, [page, category, sort, debouncedSearch])

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
      <div className="w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
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
        <div className="max-w-6xl mx-auto px-[vw]">
          {/* 검색 + 작성하기 */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 mt-[-5px] mb-[30px]">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                width: 'clamp(200px, 30vw, 320px)',
              }}
            >
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title"
                maxLength={50}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            {canWrite && (
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
            )}
          </div>
          {posts.length === 0 ? (
            <p className="text-white/40 text-center py-20">게시글이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  thumb={toFullUrl(post.thumbnailUrl)}
                  color={CATEGORY_COLOR[post.category]}
                  user={user}
                  onPinToggle={handlePinToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* ── Bottom bar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '48px', marginBottom: '48px', gap: '20px' }}>
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
  post, thumb, color, user, onPinToggle, onDelete,
}: {
  post: Post
  thumb: string
  color: { border: string; text: string; bg: string }
  user: import('@/app/context/AuthContext').AuthUser | null
  onPinToggle: (postId: number, newIsFeatured: boolean) => void
  onDelete: (postId: number) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const isAdmin = user?.role === 'ADMIN'
  // authorName은 서버 정책으로 변환된 이름이므로 nickname으로 비교 (KNOWLEDGE/QNA 한정)
  const isOwner = user != null && post.authorName === user.nickname
  const menuItems = isAdmin
    ? [post.isFeatured ? '해제하기' : '고정하기', '보관하기', '삭제하기']
    : isOwner
    ? ['수정하기', '삭제하기']
    : null

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onScroll = () => setMenuOpen(false)
    window.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.top, left: rect.right + 6 })
    setMenuOpen(v => !v)
  }

  return (
    <Link
      href={`/blog/${post.id}`}
      style={{ display: 'block', borderRadius: '16px', overflow: 'hidden', background: 'rgba(52,52,52,0.4)', border: '1px solid rgba(255,255,255,0.08)', transition: 'transform 0.2s, border-color 0.2s', cursor: 'pointer', textDecoration: 'none' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', overflow: 'hidden', background: thumb === FALLBACK_IMAGE ? 'rgba(20,25,45,0.8)' : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt={post.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: thumb === FALLBACK_IMAGE ? 'contain' : 'cover', padding: thumb === FALLBACK_IMAGE ? '10%' : undefined, opacity: thumb === FALLBACK_IMAGE ? 0.5 : 1 }} />
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
            <div style={{ flexShrink: 0 }} onClick={e => e.preventDefault()}>
              <button ref={btnRef} onClick={handleMenuToggle}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
              {menuOpen && typeof window !== 'undefined' && createPortal(
                <div ref={menuRef} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999, minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  {menuItems.map(item => (
                    <button key={item}
                      style={{ background: 'rgba(36,36,36,0.8)', border: 'none', color: item === '삭제하기' ? '#f87171' : 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 500, padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', width: '100%' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                      onClick={async e => {
                        e.preventDefault()
                        setMenuOpen(false)
                        if (item === '고정하기' || item === '해제하기') {
                          try {
                            const res = await fetchWithAuth(`${API_URL}/v1/admin/posts/${post.id}/pin`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ rank: 1 }),
                            })
                            if (res.ok) onPinToggle(post.id, !post.isFeatured)
                          } catch {}
                        } else if (item === '보관하기') {
                          const postYear = new Date(post.publishedAt ?? post.createdAt).getFullYear()
                          try {
                            const yearsRes = await fetchWithAuth(`${API_URL}/v1/archive/years`, { cache: 'no-store' })
                            const yearsJson = yearsRes.ok ? await yearsRes.json() : {}
                            const availableYears: number[] = Array.isArray(yearsJson?.data) ? yearsJson.data : []
                            if (!availableYears.includes(postYear)) {
                              window.alert(`${postYear}년 아카이브 폴더가 없습니다.\nArchive 페이지에서 먼저 폴더를 생성해주세요.`)
                              return
                            }
                            if (!window.confirm(`이 게시글을 ${postYear}년 아카이브로 보관하시겠습니까?`)) return
                            const res = await fetchWithAuth(`${API_URL}/v1/admin/posts/${post.id}/archive`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ year: postYear }),
                            })
                            if (res.ok) onDelete(post.id)
                          } catch {}
                        } else if (item === '삭제하기') {
                          if (!window.confirm('게시글을 삭제하시겠습니까?')) return
                          try {
                            const url = isAdmin
                              ? `${API_URL}/v1/admin/posts/${post.id}`
                              : `${API_URL}/v1/posts/${post.id}`
                            const res = await fetchWithAuth(url, { method: 'DELETE' })
                            if (res.ok) onDelete(post.id)
                          } catch {}
                        }
                      }}>
                      {item}
                    </button>
                  ))}
                </div>,
                document.body
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
