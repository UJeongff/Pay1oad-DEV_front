'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'

interface ArchiveItem {
  id: number
  title: string
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const PLACEHOLDER_ITEMS: ArchiveItem[] = [
  { id: -1, title: 'Bitcoin Wallet Analysis', createdAt: '2025-03-02T00:00:00Z' },
  { id: -2, title: 'Buffer Overflow Basics', createdAt: '2025-03-02T00:00:00Z' },
  { id: -3, title: 'Bypass Techniques', createdAt: '2025-03-02T00:00:00Z' },
  { id: -4, title: 'CTF Write-up 2024', createdAt: '2025-03-02T00:00:00Z' },
  { id: -5, title: 'Code Injection Study', createdAt: '2025-03-02T00:00:00Z' },
  { id: -6, title: 'Cryptography Basics', createdAt: '2025-03-02T00:00:00Z' },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function groupByLetter(items: ArchiveItem[]): Record<string, ArchiveItem[]> {
  const map: Record<string, ArchiveItem[]> = {}
  for (const item of items) {
    const letter = item.title.charAt(0).toUpperCase()
    if (!map[letter]) map[letter] = []
    map[letter].push(item)
  }
  return map
}

export default function ArchiveYearPage() {
  const params = useParams()
  const router = useRouter()
  const year = params?.year as string

  const [items, setItems] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchArchives() {
      try {
        const res = await fetch(`${API_URL}/v1/archives?year=${year}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!res.ok) { setItems(PLACEHOLDER_ITEMS); return }
        const data = await res.json()
        const list = data.data ?? data.content ?? data
        const parsed = Array.isArray(list) ? list : []
        setItems(parsed.length > 0 ? parsed : PLACEHOLDER_ITEMS)
      } catch {
        setItems(PLACEHOLDER_ITEMS)
      } finally {
        setLoading(false)
      }
    }
    fetchArchives()
  }, [year])

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(item => item.title.toLowerCase().includes(q))
  }, [items, search])

  const grouped = useMemo(() => groupByLetter(filtered), [filtered])
  const letters = Object.keys(grouped).sort()

  return (
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #0F1425, #0D193B)' }}>

      {/* ── Folder Banner ───────────────────────────── */}
      {/* SVG: 1440×116, body starts at y≈59.6 (51.4% of height) */}
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
            {/* Left: asterisk + year — in tall portion (x=0~336 of 1440 = 23.3%) */}
            <div
              className="absolute flex flex-col justify-center h-full pl-8"
              style={{ left: '6%', width: '23.3%' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="mb-1">
                <path
                  d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
                  stroke="white"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
              <h1
                className="text-white font-black leading-none"
                style={{
                  fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)',
                  fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                  letterSpacing: '0.02em',
                }}
              >
                {year}
              </h1>
            </div>

            {/* Right: breadcrumb — in body portion (top 51.4% ~ 100%) */}
            <nav
              className="absolute right-0 flex items-center gap-1.5 text-white/70 text-sm pr-[5vw]"
              style={{ top: '51.4%', height: '48.6%' }}
            >
              <Link href="/archive" className="hover:text-white transition-colors">Archive</Link>
              <span className="text-white/40">›</span>
              <span className="text-white">{year}</span>
            </nav>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <section className="relative pb-32">
        <div className="max-w-6xl mx-auto px-[5vw] pt-8">

          {/* Search bar */}
          <div className="flex justify-end mb-8">
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
                placeholder="검색어를 입력하세요"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-white/30 text-sm text-center py-20">불러오는 중...</p>
          ) : letters.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-20">
              {search ? '검색 결과가 없습니다.' : '아카이브 항목이 없습니다.'}
            </p>
          ) : (
            <div className="flex flex-col gap-10">
              {letters.map(letter => (
                <div
                  key={letter}
                  className="flex gap-8"
                  style={{ borderTop: '2px solid rgba(255,255,255,0.85)', paddingTop: '24px' }}
                >
                  {/* Letter */}
                  <div className="flex-shrink-0 w-16">
                    <span
                      className="text-white font-black leading-none"
                      style={{
                        fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                        fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                        opacity: 0.9,
                      }}
                    >
                      {letter}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="flex-1 flex flex-col">
                    {grouped[letter].map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-3 group cursor-pointer hover:bg-white/[0.03] -mx-3 px-3 rounded transition-colors"
                        style={{
                          borderBottom: idx < grouped[letter].length - 1
                            ? '1px solid rgba(255,255,255,0.05)'
                            : 'none',
                        }}
                        onClick={() => router.push(`/archive/${year}/${item.id}`)}
                      >
                        <span className="text-white/85 text-sm font-medium group-hover:text-white transition-colors">
                          {item.title}
                        </span>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-white/35 text-xs tabular-nums">
                            {formatDate(item.createdAt)}
                          </span>

                          {/* Three-dot menu */}
                          <div className="relative">
                            <button
                              className="flex flex-col gap-[3.5px] items-center p-1.5 rounded hover:bg-white/10 transition-all"
                              onClick={e => {
                                e.stopPropagation()
                                setOpenMenuId(openMenuId === item.id ? null : item.id)
                              }}
                            >
                              {[0, 1, 2].map(i => (
                                <span key={i} className="block rounded-full bg-white/50" style={{ width: '3px', height: '3px' }} />
                              ))}
                            </button>

                            {openMenuId === item.id && (
                              <div
                                className="absolute right-0 top-8 z-50 flex flex-col gap-1 p-1.5 rounded-lg min-w-[120px]"
                                style={{
                                  background: 'rgba(0,0,0,0.6)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                                }}
                                onClick={e => e.stopPropagation()}
                              >
                                <button
                                  className="w-full text-left px-3 py-2 text-xs font-medium text-white rounded-md transition-colors"
                                  style={{ background: 'rgba(36,36,36,0.8)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(36,36,36,1)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(36,36,36,0.8)')}
                                  onClick={() => { router.push(`/archive/${year}/${item.id}`); setOpenMenuId(null) }}
                                >
                                  수정하기
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors"
                                  style={{ background: 'rgba(36,36,36,0.8)', color: '#f87171' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(36,36,36,1)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(36,36,36,0.8)')}
                                  onClick={() => { setOpenMenuId(null) }}
                                >
                                  삭제하기
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <HomeFooter />
    </main>
  )
}
