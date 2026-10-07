'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { TypeChip, TeamOnlyMark } from '@/app/content/ContentBadges'

interface Content {
  id: number
  title: string
  type: 'STUDY' | 'PROJECT'
  memberCount: number
  description?: string
  visibility?: 'MEMBER' | 'TEAM'
  isMember?: boolean
  leaderName?: string
  createdAt: string
  isLeader?: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'
const PAGE_SIZE = 10

// 카드 바탕 세 가지: 파랑 / 흰색 / 회색 (벤토 리듬은 이 세 가지 면의 교차로 만든다)
type Variant = 'blue' | 'white' | 'gray'

// 큰 화면(3열)에서만 자리를 고정해 벤토 배치를 만든다. 1·2열에서는 순서대로 흐른다.
// Tailwind 가 클래스를 찾을 수 있게 문자열을 그대로 적어 둔다
const SLOTS: Array<{ place: string; span: number; variant: Variant }> = [
  { place: 'lg:col-start-1 lg:row-start-1 lg:row-span-2', span: 2, variant: 'blue' },
  { place: 'lg:col-start-2 lg:row-start-1', span: 1, variant: 'white' },
  { place: 'lg:col-start-3 lg:row-start-1', span: 1, variant: 'gray' },
  { place: 'lg:col-start-2 lg:row-start-2', span: 1, variant: 'gray' },
  { place: 'lg:col-start-3 lg:row-start-2', span: 1, variant: 'white' },
  { place: 'lg:col-start-1 lg:row-start-3', span: 1, variant: 'gray' },
  { place: 'lg:col-start-2 lg:row-start-3', span: 1, variant: 'white' },
  { place: 'lg:col-start-1 lg:row-start-4', span: 1, variant: 'white' },
  { place: 'lg:col-start-2 lg:row-start-4', span: 1, variant: 'gray' },
  { place: 'lg:col-start-3 lg:row-start-3 lg:row-span-2', span: 2, variant: 'blue' },
]

const VS: Record<Variant, { card: string; title: string; text: string; meta: string; badge: string }> = {
  blue: {
    card: 'bg-[#1C5AFF]',
    title: 'text-white',
    text: 'text-[rgba(255,255,255,0.78)]',
    meta: 'text-[rgba(255,255,255,0.78)] opacity-50',
    badge: 'bg-[rgba(255,255,255,0.18)] text-white',
  },
  white: {
    card: 'bg-[rgba(255,255,255,0.95)]',
    title: 'text-[#1C5AFF]',
    text: 'text-[#2a2a3a]',
    meta: 'text-[#2a2a3a] opacity-50',
    badge: 'bg-[rgba(28,90,255,0.1)] text-[#1C5AFF]',
  },
  gray: {
    card: 'bg-[rgba(45,45,62,0.96)]',
    title: 'text-white',
    text: 'text-[rgba(255,255,255,0.62)]',
    meta: 'text-[rgba(255,255,255,0.62)] opacity-50',
    badge: 'bg-[rgba(255,255,255,0.1)] text-white',
  },
}

function ContentCardMenu({
  content,
  isAdmin,
  onDeleted,
  onArchived,
}: {
  content: Content
  isAdmin: boolean
  onDeleted: (id: number) => void
  onArchived: (id: number) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onScroll = () => setOpen(false)
    window.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.right - 120 })
    setOpen(v => !v)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    router.push(`/content/${content.id}/edit`)
  }

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    const year = new Date(content.createdAt).getFullYear()
    try {
      const yearsRes = await fetchWithAuth(`${API_URL}/v1/archive/years`, { cache: 'no-store' })
      const yearsJson = yearsRes.ok ? await yearsRes.json() : {}
      const availableYears: number[] = Array.isArray(yearsJson?.data) ? yearsJson.data : []
      if (!availableYears.includes(year)) {
        window.alert(`${year}년 아카이브 폴더가 없습니다.\nArchive 페이지에서 먼저 폴더를 생성해주세요.`)
        return
      }
      if (!window.confirm(`"${content.title}"을(를) 보관하시겠습니까?\n아카이브에 ${year}년 기록으로 이동합니다.`)) return
      const res = await fetchWithAuth(`${API_URL}/v1/admin/contents/${content.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })
      if (res.ok) {
        onArchived(content.id)
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json?.message ?? '보관에 실패했습니다.')
      }
    } catch {
      alert('보관 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    if (!window.confirm(`"${content.title}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${content.id}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted(content.id)
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json?.message ?? '삭제에 실패했습니다.')
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="메뉴"
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '5px 6px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', zIndex: 1, transition: 'background 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.25)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <div ref={menuRef} className="popup-menu" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, minWidth: '120px' }}>
          <button className="popup-menu-item" onClick={handleEdit}>수정하기</button>
          {isAdmin && (<button className="popup-menu-item is-accent" onClick={handleArchive}>보관하기</button>)}
          <button className="popup-menu-item is-danger" onClick={handleDelete}>삭제하기</button>
        </div>,
        document.body
      )}
    </>
  )
}

function ContentCard({
  content,
  slot,
  isAdmin,
  onDeleted,
  onArchived,
}: {
  content: Content
  slot: typeof SLOTS[number]
  isAdmin: boolean
  onDeleted: (id: number) => void
  onArchived: (id: number) => void
}) {
  const vs = VS[slot.variant]
  const isBlue = slot.variant === 'blue'
  const hasMenu = isAdmin || !!content.isLeader
  const teamOnly = content.visibility !== 'MEMBER'

  return (
    <div className={`relative ${slot.place}`}>
      <Link
        href={`/content/${content.id}`}
        className={`relative flex flex-col h-full min-h-[200px] rounded-xl overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)] focus-visible:-translate-y-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft ${isBlue ? 'p-6' : 'p-5'} ${vs.card}`}
      >
        {/* 팀 전용은 카드 오른쪽 위에. ⋮ 메뉴가 있으면 그 왼쪽으로 비켜 선다 */}
        {teamOnly && <TeamOnlyMark className={`absolute top-3.5 ${hasMenu ? 'right-12' : 'right-3.5'} opacity-80 pointer-events-none ${vs.title}`} />}
        {/* 제목은 사용자가 쓴 한글이 대부분이라 영문 전용 Archivo Black 대신 Pretendard 굵게 */}
        <h3
          className={`font-black leading-[1.2] tracking-[-0.01em] break-keep ${isBlue ? 'text-[1.45rem] flex-1' : 'text-[1.2rem] mb-auto pb-3'} ${teamOnly ? (hasMenu ? 'pr-28' : 'pr-16') : hasMenu ? 'pr-7' : ''} ${vs.title}`}
        >
          {content.title}
        </h3>

        <div>
          <div className={`flex gap-1.5 flex-wrap ${content.description ? 'mb-2.5' : ''}`}>
            <TypeChip type={content.type} className={vs.badge} />
          </div>
          {content.description && (
            <p className={`text-xs leading-[1.65] ${slot.span === 2 ? 'line-clamp-6' : 'line-clamp-3'} ${vs.text}`}>
              {content.description}
            </p>
          )}
          <p className={`text-[11px] mt-2 ${vs.meta}`}>
            참여인원 {content.memberCount ?? 0}명
          </p>
        </div>
      </Link>
      {hasMenu && <ContentCardMenu content={content} isAdmin={isAdmin} onDeleted={onDeleted} onArchived={onArchived} />}
    </div>
  )
}

function PlaceholderCard({ slot }: { slot: typeof SLOTS[number] }) {
  return (
    <Link
      href="/content/create"
      className={`flex flex-col items-center justify-center min-h-[200px] rounded-xl border-[1.5px] border-dashed border-line-strong bg-surface transition-colors hover:border-fg-faint hover:bg-surface-raised focus-visible:outline-none focus-visible:border-brand-soft ${slot.place}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-fg-subtle mb-2.5" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <p className="text-fg-muted text-[13px] font-semibold mb-1">페이지 생성하기</p>
      <p className="text-fg-subtle text-[11px]">페이지를 생성한 사람이 팀장이 됩니다.</p>
    </Link>
  )
}

const PAGE_BUTTON = 'w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors'

export default function ContentPage() {
  const { user, loading } = useAuthContext()
  const [allContents, setAllContents] = useState<Content[]>([])
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (loading) return

    async function load() {
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/contents`)
        if (!res.ok) return
        const data = await res.json()
        const list = data.data ?? data.content ?? data
        const arr: Content[] = Array.isArray(list) ? list : []
        arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setAllContents(arr)
      } catch {
        setAllContents([])
      }
    }

    load()
  }, [loading, user?.id, user?.role])

  const handleDeleted = (id: number) => {
    setAllContents(prev => prev.filter(c => c.id !== id))
  }

  const handleArchived = (id: number) => {
    setAllContents(prev => prev.filter(c => c.id !== id))
  }

  const isAdmin = user?.role === 'ADMIN'
  const visibleContents = allContents
  const totalPages = Math.max(1, Math.ceil(visibleContents.length / PAGE_SIZE))
  const pageContents = visibleContents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const createSlot = pageContents.length < PAGE_SIZE ? SLOTS[pageContents.length] : null

  return (
    // 홈과 같은 흐름: 위는 네이비, 아래로 갈수록 회색 검정
    <main className="relative min-h-screen" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #040d1f 50vh, #0F0F0F 100%)' }}>
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

      <section className="relative flex flex-col items-center justify-center text-center pt-46 pb-25 px-6">
        <div className="relative z-10 flex flex-col items-start mb-5">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="mb-2 ml-1" aria-hidden="true">
            <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="#1C5AFF" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
          <h1 className="text-white font-black uppercase" style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif", letterSpacing: '0.04em' }}>
            CONTENT
          </h1>
        </div>
        <p className="relative z-10 text-fg-muted font-medium mb-3" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
          프로젝트와 스터디를 통해 배우고 성장하는 공간입니다.
        </p>
        <p className="relative z-10 text-fg-subtle text-sm leading-relaxed">
          각 프로젝트 진행 과정과 결과를 공유하고,<br />
          스터디 자료와 인사이트를 나누며 함께 발전해 보세요.
        </p>
      </section>

      <section className="relative pb-20">
        <div className="relative max-w-5xl mx-auto px-[5vw]">
          {/* 생성은 목록 끝의 "페이지 생성하기" 카드로 한다 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:auto-rows-[220px]">
            {pageContents.map((content, i) => (
              <ContentCard key={content.id} content={content} slot={SLOTS[i]} isAdmin={isAdmin} onDeleted={handleDeleted} onArchived={handleArchived} />
            ))}
            {createSlot && <PlaceholderCard slot={createSlot} />}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-12">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="이전 페이지"
                className={`${PAGE_BUTTON} text-fg-subtle hover:text-white disabled:text-fg-faint disabled:cursor-default`}
              >
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
                  <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={`${PAGE_BUTTON} ${n === page ? 'bg-surface-raised text-white font-bold' : 'text-fg-subtle hover:text-white'}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="다음 페이지"
                className={`${PAGE_BUTTON} text-fg-subtle hover:text-white disabled:text-fg-faint disabled:cursor-default`}
              >
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
                  <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      <HomeFooter />
    </main>
  )
}
