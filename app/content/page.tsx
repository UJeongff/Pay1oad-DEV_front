'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

interface Content {
  id: number
  title: string
  type: 'STUDY' | 'PROJECT'
  memberCount: number
  description?: string
  visibility?: 'MEMBER' | 'TEAM'
  isMember?: boolean
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const PAGE_SIZE = 10

type Variant = 'blue' | 'white' | 'gray'

// 10-slot grid layout: col(1-3), row(1-4), rowSpan, visual variant
const SLOTS: Array<{ col: number; row: number; span: number; variant: Variant }> = [
  { col: 1, row: 1, span: 2, variant: 'blue'  }, // 0 — blue tall, left
  { col: 2, row: 1, span: 1, variant: 'white' }, // 1
  { col: 3, row: 1, span: 1, variant: 'gray'  }, // 2
  { col: 2, row: 2, span: 1, variant: 'white' }, // 3
  { col: 3, row: 2, span: 1, variant: 'gray'  }, // 4
  { col: 1, row: 3, span: 1, variant: 'gray'  }, // 5
  { col: 2, row: 3, span: 1, variant: 'white' }, // 6
  { col: 3, row: 3, span: 2, variant: 'blue'  }, // 7 — blue tall, right
  { col: 1, row: 4, span: 1, variant: 'white' }, // 8
  { col: 2, row: 4, span: 1, variant: 'white' }, // 9
]

const VS = {
  blue:  { bg: '#1C5AFF',                 title: '#fff',    text: 'rgba(255,255,255,0.78)', badgeBg: 'rgba(255,255,255,0.18)', badgeBorder: 'rgba(255,255,255,0.28)', badgeColor: '#fff' },
  white: { bg: 'rgba(255,255,255,0.95)',   title: '#1C5AFF', text: '#2a2a3a',               badgeBg: 'rgba(0,0,0,0.06)',       badgeBorder: 'rgba(0,0,0,0.12)',       badgeColor: '#333' },
  gray:  { bg: 'rgba(45,45,62,0.96)',      title: '#fff',    text: 'rgba(255,255,255,0.62)', badgeBg: 'rgba(255,255,255,0.1)',  badgeBorder: 'rgba(255,255,255,0.16)', badgeColor: 'rgba(255,255,255,0.85)' },
}

function gridPos(s: typeof SLOTS[number]): React.CSSProperties {
  return {
    gridColumn: s.col,
    gridRow: s.span > 1 ? `${s.row} / span ${s.span}` : s.row,
  }
}

function Badge({ label, icon, vs }: { label: string; icon?: React.ReactNode; vs: typeof VS[Variant] }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: 600, padding: '3px 10px',
      borderRadius: '100px', background: vs.badgeBg, color: vs.badgeColor,
      border: `1px solid ${vs.badgeBorder}`,
    }}>
      {icon}{label}
    </span>
  )
}

const PersonIcon = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

// ── Admin 3-dot menu for ContentCard ──────────────────────────────────────────

function ContentCardMenu({
  content,
  onDeleted,
  onArchived,
}: {
  content: Content
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
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
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
    if (!window.confirm(`"${content.title}"을(를) 보관하시겠습니까?\n아카이브의 ${new Date(content.createdAt).getFullYear()}년 폴더에 저장됩니다.`)) return
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${content.id}/archive`, { method: 'POST' })
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

  const itemStyle: React.CSSProperties = {
    background: 'rgba(36,36,36,0.8)',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    padding: '7px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: '6px',
    width: '100%',
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="메뉴"
        style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: '6px',
          cursor: 'pointer', padding: '5px 6px', color: 'rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', zIndex: 1,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.25)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
            minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '4px',
            padding: '6px', borderRadius: '8px',
            background: 'rgba(8,12,28,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <button
            style={{ ...itemStyle, color: 'rgba(255,255,255,0.82)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
            onClick={handleEdit}
          >
            수정하기
          </button>
          <button
            style={{ ...itemStyle, color: '#91CDFF' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
            onClick={handleArchive}
          >
            보관하기
          </button>
          <button
            style={{ ...itemStyle, color: '#f87171' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
            onClick={handleDelete}
          >
            삭제하기
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

// ── ContentCard ───────────────────────────────────────────────────────────────

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

  return (
    <div
      style={{
        ...gridPos(slot),
        position: 'relative',
      }}
    >
      <Link
        href={`/content/${content.id}`}
        style={{
          display: 'flex', flexDirection: 'column',
          height: '100%',
          borderRadius: '16px',
          padding: isBlue ? '24px' : '20px',
          background: vs.bg,
          textDecoration: 'none',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(-3px)'
          el.style.boxShadow = '0 16px 48px rgba(0,0,0,0.35)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}
      >
        <h3 style={{
          color: vs.title,
          fontSize: isBlue ? '1.4rem' : '1.2rem',
          fontWeight: 900,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          lineHeight: 1.15,
          fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
          flex: isBlue ? 1 : undefined,
          marginBottom: isBlue ? 0 : 'auto',
          paddingBottom: isBlue ? 0 : '12px',
          paddingRight: isAdmin ? '28px' : 0,
        }}>
          {content.title}
        </h3>

        <div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: content.description ? '10px' : 0 }}>
            <Badge label={content.type === 'STUDY' ? 'Study' : 'Project'} vs={vs} />
            <Badge label={content.visibility === 'MEMBER' ? 'All Member' : 'Only Team'} icon={PersonIcon} vs={vs} />
          </div>
          {content.description && (
            <p style={{
              color: vs.text, fontSize: '12px', lineHeight: 1.65,
              display: '-webkit-box', WebkitLineClamp: slot.span === 2 ? 6 : 3,
              WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
            }}>
              {content.description}
            </p>
          )}
        </div>
      </Link>
      {isAdmin && (
        <ContentCardMenu content={content} onDeleted={onDeleted} onArchived={onArchived} />
      )}
    </div>
  )
}

function PlaceholderCard({ slot }: { slot: typeof SLOTS[number] }) {
  return (
    <Link
      href="/content/create"
      style={{
        ...gridPos(slot),
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: '16px',
        border: '1.5px dashed rgba(255,255,255,0.18)',
        background: 'rgba(255,255,255,0.02)',
        textDecoration: 'none', cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.35)'
        el.style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(255,255,255,0.18)'
        el.style.background = 'rgba(255,255,255,0.02)'
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
        페이지 생성하기
      </p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px' }}>
        페이지를 생성한 사람이 팀장됩니다.
      </p>
    </Link>
  )
}

export default function ContentPage() {
  const { user } = useAuthContext()
  const [allContents, setAllContents] = useState<Content[]>([])
  const [page, setPage] = useState(1)
  const [createHovered, setCreateHovered] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/contents`)
        if (!res.ok) return
        const data = await res.json()
        const list = data.data ?? data.content ?? data
        const arr: Content[] = Array.isArray(list) ? list : []
        // 오래된순 정렬 (createdAt 오름차순)
        arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        setAllContents(arr)
      } catch {
        setAllContents([])
      }
    }
    load()
  }, [])

  const handleDeleted = (id: number) => {
    setAllContents(prev => prev.filter(c => c.id !== id))
  }

  const handleArchived = (id: number) => {
    setAllContents(prev => prev.filter(c => c.id !== id))
  }

  const isAdmin = user?.role === 'ADMIN'
  const visibleContents = allContents.filter(c =>
    isAdmin || c.visibility !== 'TEAM' || c.isMember
  )
  const totalPages = Math.max(1, Math.ceil(visibleContents.length / PAGE_SIZE))
  const pageContents = visibleContents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const createSlot = pageContents.length < PAGE_SIZE ? SLOTS[pageContents.length] : null

  return (
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #0E1427 100%)' }}>

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
            <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="#1C5AFF" strokeWidth="2.8" strokeLinecap="round" />
          </svg>
          <h1
            className="text-white font-black uppercase"
            style={{
              fontSize: 'clamp(3.5rem, 8vw, 6rem)',
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            CONTENT
          </h1>
        </div>
        <p className="relative z-10 text-white/75 font-medium mb-3" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
          프로젝트와 스터디를 통해 배우고 성장하는 공간입니다.
        </p>
        <p className="relative z-10 text-white/40 text-sm leading-relaxed">
          팀 프로젝트 진행 과정과 결과를 공유하고,<br />
          스터디 자료와 인사이트를 나누며 함께 발전해 보세요!
        </p>
      </section>

      {/* ── Card Grid ───────────────────────────────── */}
      <section className="relative pb-20">
        <div className="max-w-5xl mx-auto px-[5vw]">

          {/* 페이지 생성하기 버튼 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Link
              href="/content/create"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '8px',
                border: '1.5px dashed rgba(255,255,255,0.3)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px', fontWeight: 500, textDecoration: 'none',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.55)'
                el.style.color = '#fff'
                setCreateHovered(true)
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.3)'
                el.style.color = 'rgba(255,255,255,0.6)'
                setCreateHovered(false)
              }}
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              페이지 생성하기
              {createHovered && (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, fontSize: '13px' }}>
                  페이지를 생성한 사람이 팀장이 됩니다.
                </span>
              )}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[220px]">
            {pageContents.map((content, i) => (
              <ContentCard
                key={content.id}
                content={content}
                slot={SLOTS[i]}
                isAdmin={isAdmin}
                onDeleted={handleDeleted}
                onArchived={handleArchived}
              />
            ))}
            {createSlot && <PlaceholderCard slot={createSlot} />}
          </div>

          {/* ── Pagination ──────────────────────────── */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '48px' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', borderRadius: '6px' }}
              >
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                  <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  style={{
                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: n === page ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: n === page ? '#fff' : 'rgba(255,255,255,0.45)',
                    fontSize: '14px', fontWeight: n === page ? 700 : 400,
                    borderRadius: '6px', transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (n !== page) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
                  onMouseLeave={e => { if (n !== page) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', color: page === totalPages ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', borderRadius: '6px' }}
              >
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
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
