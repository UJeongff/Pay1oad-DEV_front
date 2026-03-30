'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { useAuthContext } from '@/app/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const PAGE_SIZE = 10

type ArchiveItemType = 'BLOG' | 'STUDY' | 'PROJECT'

interface ArchiveItem {
  id: number
  type: ArchiveItemType
  title: string
  archivedAt: string
  isPublic?: boolean
}

interface ArchivePostResponse {
  id: number
  title: string
  archivedAt?: string
  isPublic?: boolean
}

interface ArchiveContentResponse {
  id: number
  type: 'STUDY' | 'PROJECT'
  title: string
  archivedAt?: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function groupByType(items: ArchiveItem[]): Record<'B' | 'C', ArchiveItem[]> {
  const map: Record<'B' | 'C', ArchiveItem[]> = { B: [], C: [] }
  for (const item of items) {
    if (item.type === 'BLOG') map['B'].push(item)
    else map['C'].push(item)
  }
  return map
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '20px' }}>
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: page === 1 ? 'default' : 'pointer', color: page === 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', borderRadius: '5px' }}
      >
        <svg width="6" height="10" viewBox="0 0 7 12" fill="none">
          <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n === page ? 'rgba(255,255,255,0.12)' : 'transparent', border: 'none', cursor: 'pointer', color: n === page ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: n === page ? 700 : 400, borderRadius: '5px', transition: 'background 0.15s, color 0.15s' }}
          onMouseEnter={e => { if (n !== page) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
          onMouseLeave={e => { if (n !== page) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
        >
          {n}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: page === total ? 'default' : 'pointer', color: page === total ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', borderRadius: '5px' }}
      >
        <svg width="6" height="10" viewBox="0 0 7 12" fill="none">
          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

function ItemRow({
  item,
  isAdmin,
  onRestore,
  onDelete,
}: {
  item: ArchiveItem
  isAdmin: boolean
  onRestore: (item: ArchiveItem) => void
  onDelete: (item: ArchiveItem) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setMenuOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      className="flex items-center justify-between py-3 group hover:bg-white/[0.03] -mx-3 px-3 rounded transition-colors"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-white/45 text-[11px] uppercase tracking-wide flex-shrink-0">
          {item.type}
        </span>
        {item.type === 'BLOG' ? (
          <Link
            href={`/blog/${item.id}`}
            className="text-white/85 text-sm font-medium truncate hover:text-white transition-colors"
            style={{ textDecoration: 'none' }}
          >
            {item.title}
          </Link>
        ) : (
          <Link
            href={`/content/${item.id}`}
            className="text-white/85 text-sm font-medium truncate hover:text-white transition-colors"
            style={{ textDecoration: 'none' }}
          >
            {item.title}
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-white/35 text-xs tabular-nums">
          {formatDate(item.archivedAt)}
        </span>

        {isAdmin && (
          <div className="relative" ref={menuRef as React.RefObject<HTMLDivElement>}>
            <button
              ref={btnRef}
              onClick={() => setMenuOpen(v => !v)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>

            {menuOpen && (
              <div
                style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 50, minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', borderRadius: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                <button
                  style={{ background: 'rgba(36,36,36,0.8)', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 500, padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', width: '100%' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                  onClick={async () => {
                    setMenuOpen(false)
                    const target = item.type === 'BLOG' ? '블로그' : '콘텐츠'
                    if (!window.confirm(`${target} 목록으로 복원하시겠습니까?`)) return
                    onRestore(item)
                  }}
                >
                  복원하기
                </button>
                <button
                  style={{ background: 'rgba(36,36,36,0.8)', border: 'none', color: '#f87171', fontSize: '12px', fontWeight: 500, padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', width: '100%' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                  onClick={async () => {
                    setMenuOpen(false)
                    if (!window.confirm('영구 삭제하시겠습니까?')) return
                    onDelete(item)
                  }}
                >
                  삭제하기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ArchiveYearPage() {
  const params = useParams()
  const year = params?.year as string
  const { user } = useAuthContext()
  const isAdmin = user?.role === 'ADMIN'

  const [items, setItems] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pageB, setPageB] = useState(1)
  const [pageC, setPageC] = useState(1)

  useEffect(() => {
    async function fetchArchives() {
      try {
        const res = await fetch(`${API_URL}/v1/archive/${year}`, { cache: 'no-store', credentials: 'include' })
        if (!res.ok) { setItems([]); return }

        const json = await res.json()
        const data = json?.data ?? {}
        const posts: ArchivePostResponse[] = Array.isArray(data?.posts) ? data.posts : []
        const contents: ArchiveContentResponse[] = Array.isArray(data?.contents) ? data.contents : []

        const postItems: ArchiveItem[] = posts.map(p => ({
          id: Number(p.id), type: 'BLOG',
          title: String(p.title ?? ''),
          archivedAt: String(p.archivedAt ?? `${year}-01-01`),
          isPublic: p.isPublic,
        }))
        const contentItems: ArchiveItem[] = contents.map(c => ({
          id: Number(c.id), type: c.type === 'PROJECT' ? 'PROJECT' : 'STUDY',
          title: String(c.title ?? ''),
          archivedAt: String(c.archivedAt ?? `${year}-01-01`),
        }))

        setItems([...postItems, ...contentItems].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt)))
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchArchives()
  }, [year])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(item => {
      // 비로그인 사용자는 BLOG 중 isPublic이 명시적으로 false인 것은 제외
      if (!user && item.type === 'BLOG' && item.isPublic === false) return false
      if (q && !item.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, user])

  const grouped = useMemo(() => groupByType(filtered), [filtered])

  // 검색 시 페이지 리셋
  useEffect(() => { setPageB(1); setPageC(1) }, [search])

  const totalPagesB = Math.max(1, Math.ceil(grouped.B.length / PAGE_SIZE))
  const totalPagesC = Math.max(1, Math.ceil(grouped.C.length / PAGE_SIZE))
  const pageItemsB = grouped.B.slice((pageB - 1) * PAGE_SIZE, pageB * PAGE_SIZE)
  const pageItemsC = grouped.C.slice((pageC - 1) * PAGE_SIZE, pageC * PAGE_SIZE)

  const handleRestore = async (item: ArchiveItem) => {
    try {
      const url = item.type === 'BLOG'
        ? `${API_URL}/v1/admin/posts/${item.id}/unarchive`
        : `${API_URL}/v1/admin/contents/${item.id}/unarchive`
      const res = await fetchWithAuth(url, { method: 'PATCH' })
      if (res.ok) setItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)))
    } catch {}
  }

  const handleDelete = async (item: ArchiveItem) => {
    try {
      const url = item.type === 'BLOG'
        ? `${API_URL}/v1/admin/posts/${item.id}`
        : `${API_URL}/v1/contents/${item.id}`
      const res = await fetchWithAuth(url, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)))
    } catch {}
  }

  const sections: Array<{ key: 'B' | 'C'; items: ArchiveItem[]; page: number; totalPages: number; setPage: (p: number) => void }> = [
    { key: 'B', items: pageItemsB, page: pageB, totalPages: totalPagesB, setPage: setPageB },
    { key: 'C', items: pageItemsC, page: pageC, totalPages: totalPagesC, setPage: setPageC },
  ]

  return (
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #0F1425, #0D193B)' }}>
      <div className="pt-40">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 116"
            fill="none"
            style={{ display: 'block', width: '100%', height: '116px' }}
            preserveAspectRatio="none"
          >
            <path
              d="M0 116H1440C1440 84.8644 1414.76 59.624 1383.62 59.624H460.851C431.453 59.624 403.543 46.6879 384.543 24.2547L381.974 21.2216C370.574 7.76165 353.828 0 336.189 0H73.4466C45.1808 0 20.7483 19.7279 14.7933 47.3592L0 116Z"
              fill="url(#paint0_linear_251_98)"
            />
            <defs>
              <linearGradient id="paint0_linear_251_98" x1="817" y1="54.7301" x2="817" y2="119.76" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0433B2" />
                <stop offset="1" stopColor="#002589" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0">
            <div
              className="absolute flex flex-col justify-center h-full pl-2 sm:pl-4 lg:pl-8"
              style={{ left: '6%', width: '23.3%' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="mb-1">
                <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
              <h1
                className="text-white font-black leading-none"
                style={{ fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)', fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif", letterSpacing: '0.02em' }}
              >
                {year}
              </h1>
            </div>

            <nav
              className="absolute right-0 flex items-center gap-1.5 text-white/70 text-sm pr-[5vw]"
              style={{ top: '51.4%', height: '48.6%' }}
            >
              <Link href="/archive" className="hover:text-white transition-colors">Archive</Link>
              <span className="text-white/40">/</span>
              <span className="text-white">{year}</span>
            </nav>
          </div>
        </div>
      </div>

      <section className="relative pb-32">
        <div className="max-w-6xl mx-auto px-[5vw] pt-8">
          <div className="flex justify-end mb-8">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', width: 'clamp(200px, 30vw, 320px)' }}
            >
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {loading ? (
            <p className="text-white/30 text-sm text-center py-20">Loading...</p>
          ) : (
            <div className="flex flex-col gap-10">
              {sections.map(({ key, items: sectionItems, page, totalPages, setPage }) => (
                <div
                  key={key}
                  className="flex gap-8"
                  style={{ borderTop: '2px solid rgba(255,255,255,0.85)', paddingTop: '24px' }}
                >
                  <div className="flex-shrink-0 w-16">
                    <span
                      className="text-white font-black leading-none"
                      style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif", opacity: 0.9 }}
                    >
                      {key}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col">
                    {grouped[key].length === 0 ? (
                      <span className="text-white/20 text-sm py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>—</span>
                    ) : (
                      <>
                        {sectionItems.map(item => (
                          <ItemRow
                            key={`${item.type}-${item.id}`}
                            item={item}
                            isAdmin={isAdmin}
                            onRestore={handleRestore}
                            onDelete={handleDelete}
                          />
                        ))}
                        <Pagination page={page} total={totalPages} onChange={setPage} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <HomeFooter />
    </main>
  )
}
