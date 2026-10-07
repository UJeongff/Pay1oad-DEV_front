'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import ToastMessage, { useToast } from '@/app/components/ToastMessage'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { ARCHIVE_YEAR_MIN, ARCHIVE_YEAR_MAX } from '@/app/lib/archive'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'
const PAGE_SIZE = 10

type ArchiveItemType = 'BLOG' | 'STUDY' | 'PROJECT'
type Visibility = 'PUBLIC' | 'MEMBER' | 'ADMIN'

interface ArchiveItem {
  id: number
  type: ArchiveItemType
  title: string
  archivedAt: string
  description?: string | null
  visibility?: Visibility
}

interface ArchivePostResponse {
  id: number
  title: string
  archivedAt?: string
}

interface ArchiveContentResponse {
  id: number
  type: 'STUDY' | 'PROJECT'
  title: string
  description?: string | null
  visibility?: Visibility
  archivedAt?: string
}

// 전체 공개는 기본값이라 표시하지 않고, 범위가 좁을 때만 알려 준다
const VISIBILITY_LABEL: Partial<Record<Visibility, string>> = {
  MEMBER: '회원 공개',
  ADMIN: '관리자만',
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
    if (item.type === 'BLOG') map.B.push(item)
    else map.C.push(item)
  }
  return map
}

// 페이지가 많으면 처음·끝·현재 주변만 보이고 나머지는 … 로 줄인다. 예: 1 … 4 5 6 … 12
function pageNumbers(page: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const keep = [1, page - 1, page, page + 1, total].filter(n => n >= 1 && n <= total)
  const sorted = [...new Set(keep)].sort((a, b) => a - b)
  const out: Array<number | 'gap'> = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('gap')
    out.push(n)
  })
  return out
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null

  const arrowClass = 'flex h-7 w-7 items-center justify-center rounded-[5px] text-fg-subtle transition-colors hover:text-white disabled:cursor-default disabled:text-fg-faint'

  return (
    <nav aria-label="페이지" className="mt-5 flex items-center gap-1">
      <button type="button" aria-label="이전 페이지" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className={arrowClass}>
        <svg width="6" height="10" viewBox="0 0 7 12" fill="none">
          <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {pageNumbers(page, total).map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden="true" className="flex h-7 w-5 items-center justify-center text-[13px] text-fg-faint">…</span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`flex h-7 min-w-7 items-center justify-center rounded-[5px] px-1 text-[13px] tabular-nums transition-colors ${
              n === page ? 'bg-white/[0.12] font-bold text-white' : 'text-fg-subtle hover:text-white'
            }`}
          >
            {n}
          </button>
        ),
      )}
      <button type="button" aria-label="다음 페이지" onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total} className={arrowClass}>
        <svg width="6" height="10" viewBox="0 0 7 12" fill="none">
          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
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

  const href = item.type === 'BLOG' ? `/blog/${item.id}` : `/content/${item.id}`
  const visibilityLabel = item.visibility ? VISIBILITY_LABEL[item.visibility] : undefined

  return (
    // 줄 전체가 링크처럼 눌린다: 제목 링크의 ::after 가 줄을 덮고, 메뉴만 그 위(z-10)에 올라온다.
    // hover 바탕(::before)만 양옆으로 12px 넓히고, 구분선은 섹션 선과 같은 폭에 맞춘다
    // 모바일은 두 줄: 제목(최대 두 줄) 아래에 종류·날짜·공개 범위. sm 이상은 예전처럼 한 줄
    <div className="relative flex items-start justify-between gap-3 border-b border-line py-3.5 before:pointer-events-none before:absolute before:inset-y-0 before:-inset-x-3 before:rounded before:transition-colors hover:before:bg-white/[0.03] sm:items-center sm:py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-0.5">
        {/* 제목 링크는 화면 폭마다 하나씩만 보인다(숨은 쪽은 display:none 이라 탭·스크린리더에서 빠진다) */}
        <Link
          href={href}
          className="line-clamp-2 break-keep text-[15px] font-semibold leading-[1.45] text-white/90 transition-colors after:absolute after:inset-0 after:rounded hover:text-white sm:hidden"
        >
          {item.title}
        </Link>
        <div className="hidden min-w-0 items-baseline gap-2 sm:flex">
          <span className="flex-shrink-0 text-[11px] uppercase tracking-wide text-fg-subtle">
            {item.type}
          </span>
          <Link
            href={href}
            className="truncate text-sm font-medium text-fg-muted transition-colors after:absolute after:inset-0 after:rounded hover:text-white"
          >
            {item.title}
          </Link>
        </div>
        {item.description && (
          <p className="truncate text-[13px] text-fg-subtle">{item.description}</p>
        )}
        <div className="flex items-baseline gap-2 text-xs text-fg-subtle sm:hidden">
          {/* 블로그 탭에선 모두 BLOG 라 종류를 생략한다 */}
          {item.type !== 'BLOG' && (
            <>
              <span className="text-[11px] uppercase tracking-wide">{item.type}</span>
              <span aria-hidden="true" className="text-fg-faint">·</span>
            </>
          )}
          <span className="tabular-nums">{formatDate(item.archivedAt)}</span>
          {visibilityLabel && (
            <span className="rounded border border-line px-1.5 py-px text-[11px]">{visibilityLabel}</span>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3">
        {visibilityLabel && (
          <span className="hidden rounded border border-line px-1.5 py-0.5 text-[11px] text-fg-subtle sm:inline">
            {visibilityLabel}
          </span>
        )}
        <span className="hidden text-xs tabular-nums text-fg-subtle sm:inline">
          {formatDate(item.archivedAt)}
        </span>

        {isAdmin && (
          // 줄마다 z-10 이라 아래 줄이 열린 메뉴를 덮는다. 열린 줄만 한 단계 올린다
          <div className={`relative ${menuOpen ? 'z-30' : 'z-10'}`} ref={menuRef}>
            <button
              ref={btnRef}
              type="button"
              aria-label={`${item.title} 메뉴`}
              onClick={() => setMenuOpen(v => !v)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {menuOpen && (
              // 반투명이면 아래 줄의 날짜가 비쳐 보여서 불투명 면(panel)을 쓴다
              <div className="absolute right-0 top-[calc(100%+4px)] z-50 flex min-w-[110px] flex-col gap-1 rounded-lg border border-line bg-panel p-1.5 shadow-pop">
                <button
                  type="button"
                  className="w-full rounded-md bg-surface px-3 py-[7px] text-left text-xs font-medium text-fg-muted transition-colors hover:bg-surface-raised hover:text-white"
                  onClick={() => {
                    setMenuOpen(false)
                    const target = item.type === 'BLOG' ? '블로그' : '콘텐츠'
                    if (!window.confirm(target + ' 목록으로 복원하시겠습니까?')) return
                    onRestore(item)
                  }}
                >
                  {'복원하기'}
                </button>
                <button
                  type="button"
                  className="w-full rounded-md bg-surface px-3 py-[7px] text-left text-xs font-medium text-danger transition-colors hover:bg-surface-raised"
                  onClick={() => {
                    setMenuOpen(false)
                    if (!window.confirm('영구 삭제하시겠습니까?')) return
                    onDelete(item)
                  }}
                >
                  {'삭제하기'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 연도 탭 머리. 예전엔 1440×116 SVG 하나를 가로로만 늘려서 좁은 화면에서 탭이 찌그러지고 연도가 탭 밖으로 넘쳤다.
// 이제 왼쪽 탭 조각은 비율을 지킨 채 높이(--tab-h)만 따라가고, 오른쪽은 같은 색 막대가 화면 끝까지 이어진다.
// 모바일 80px, sm 이상 116px. 아래 calc 의 470·116·56.376 은 탭 조각 viewBox 의 폭·높이·막대 높이
function YearTabHeader({ year }: { year: string }) {
  const barHeight = 'calc(var(--tab-h) * 56.376 / 116)'

  return (
    <div className="relative [--tab-h:80px] sm:[--tab-h:116px]" style={{ height: 'var(--tab-h)' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 470 116"
        fill="none"
        aria-hidden="true"
        className="absolute left-0 top-0 block"
        style={{ height: 'var(--tab-h)', width: 'calc(var(--tab-h) * 470 / 116)' }}
      >
        <defs>
          <linearGradient id="archive-tab-fill" x1="0" y1="54.73" x2="0" y2="119.76" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0433B2" />
            <stop offset="1" stopColor="#002589" />
          </linearGradient>
        </defs>
        <path
          d="M0 116H470V59.624H460.851C431.453 59.624 403.543 46.6879 384.543 24.2547L381.974 21.2216C370.574 7.76165 353.828 0 336.189 0H73.4466C45.1808 0 20.7483 19.7279 14.7933 47.3592L0 116Z"
          fill="url(#archive-tab-fill)"
        />
      </svg>
      {/* 탭 조각에 1px 겹쳐서 이음새가 보이지 않게. 색은 탭 그라데이션의 같은 높이 값 */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0"
        style={{
          left: 'calc(var(--tab-h) * 470 / 116 - 1px)',
          height: barHeight,
          borderTopRightRadius: barHeight,
          background: 'linear-gradient(#0432AF, #00268B)',
        }}
      />

      <div className="absolute inset-y-0 flex flex-col justify-center" style={{ left: 'calc(var(--tab-h) * 80 / 116)' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="mb-1" aria-hidden="true">
          <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
        <h1
          className="whitespace-nowrap font-black leading-none text-white"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif", letterSpacing: '0.02em' }}
        >
          {year}
        </h1>
      </div>

      {/* 현재 위치를 터미널 경로처럼 보여준다 (블로그의 ~/blog/write 와 같은 형식) */}
      <nav
        aria-label="현재 위치"
        className="absolute bottom-0 right-0 flex items-center pr-5 font-mono text-[13px] tracking-[0.02em] sm:pr-10 lg:pr-20"
        style={{ height: barHeight }}
      >
        <span className="text-fg-faint">~/</span>
        <Link href="/archive" className="text-fg-subtle transition-colors hover:text-white">archive</Link>
        <span className="text-fg-faint">/</span>
        <span aria-current="page" className="text-white">{year}</span>
      </nav>
    </div>
  )
}

const SECTION_LABEL: Record<'B' | 'C', string> = { B: '블로그', C: '콘텐츠' }

export default function ArchiveYearPage() {
  const params = useParams()
  const year = params?.year as string
  const { user } = useAuthContext()
  const isAdmin = user?.role === 'ADMIN'
  const { toast, showToast, clearToast } = useToast()

  const [items, setItems] = useState<ArchiveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pageB, setPageB] = useState(1)
  const [pageC, setPageC] = useState(1)
  const [mobileTab, setMobileTab] = useState<'B' | 'C'>('B')
  const router = useRouter()

  useEffect(() => {
    const yearNum = Number(year)
    if (!year || !/^\d{4}$/.test(year) || yearNum < ARCHIVE_YEAR_MIN || yearNum > ARCHIVE_YEAR_MAX) {
      router.replace('/archive')
      return
    }

    async function fetchArchives() {
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/archive/${year}`, { cache: 'no-store' })
        if (!res.ok) {
          router.replace('/archive')
          return
        }

        const json = await res.json()
        const data = json?.data ?? {}
        const posts: ArchivePostResponse[] = Array.isArray(data?.posts) ? data.posts : []
        const contents: ArchiveContentResponse[] = Array.isArray(data?.contents) ? data.contents : []

        const postItems: ArchiveItem[] = posts.map(p => ({
          id: Number(p.id),
          type: 'BLOG',
          title: String(p.title ?? ''),
          archivedAt: String(p.archivedAt ?? `${year}-01-01`),
        }))
        const contentItems: ArchiveItem[] = contents.map(c => ({
          id: Number(c.id),
          type: c.type === 'PROJECT' ? 'PROJECT' : 'STUDY',
          title: String(c.title ?? ''),
          description: c.description ?? null,
          visibility: c.visibility,
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
  }, [year, router])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(item => {
      if (q && !item.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search])

  const grouped = useMemo(() => groupByType(filtered), [filtered])

  useEffect(() => {
    setPageB(1)
    setPageC(1)
  }, [search])

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
      else showToast('복원하지 못했습니다.')
    } catch {
      showToast('복원하지 못했습니다.')
    }
  }

  const handleDelete = async (item: ArchiveItem) => {
    try {
      const url = item.type === 'BLOG'
        ? `${API_URL}/v1/admin/posts/${item.id}`
        : `${API_URL}/v1/contents/${item.id}`
      const res = await fetchWithAuth(url, { method: 'DELETE' })
      if (res.ok) setItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)))
      else showToast('삭제하지 못했습니다.')
    } catch {
      showToast('삭제하지 못했습니다.')
    }
  }

  const sections: Array<{ key: 'B' | 'C'; items: ArchiveItem[]; page: number; totalPages: number; setPage: (p: number) => void }> = [
    { key: 'B', items: pageItemsB, page: pageB, totalPages: totalPagesB, setPage: setPageB },
    { key: 'C', items: pageItemsC, page: pageC, totalPages: totalPagesC, setPage: setPageC },
  ]

  return (
    // 배경은 목록 페이지와 같은 사이트 기본 네이비, 본문 영역은 목록과 같은 옅은 파랑
    <main className="relative min-h-screen select-none bg-background">
      <div className="pt-40">
        <YearTabHeader year={year} />
      </div>

      <section className="relative pb-32" style={{ background: 'rgba(0, 65, 239, 0.05)' }}>
        <div className="max-w-6xl mx-auto px-[5vw] pt-8">
          <div className="flex justify-end mb-8">
            <div
              className="flex items-center gap-2 rounded border border-line bg-surface-raised px-4 py-2"
              style={{ width: 'clamp(200px, 30vw, 320px)' }}
            >
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="제목 검색"
                aria-label="제목 검색"
                maxLength={50}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-fg-faint"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <path d="M16.5 16.5L21 21" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {loading ? (
            <p className="text-fg-subtle text-sm text-center py-20">불러오는 중...</p>
          ) : (
            <>
            {/* 모바일(sm 미만)은 B/C 칸 대신 탭으로 한 종류씩 보여준다. 숫자는 검색 결과 기준 */}
            <div role="tablist" aria-label="종류" className="-mt-2 mb-1 flex border-b border-line sm:hidden">
              {sections.map(({ key }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`archive-tab-${key}`}
                  aria-selected={mobileTab === key}
                  aria-controls={`archive-panel-${key}`}
                  onClick={() => setMobileTab(key)}
                  className={`-mb-px flex h-12 flex-1 items-baseline justify-center gap-2 border-b-2 pt-3.5 text-[15px] font-semibold transition-colors ${
                    mobileTab === key ? 'border-brand text-white' : 'border-transparent text-fg-subtle hover:text-white'
                  }`}
                >
                  {SECTION_LABEL[key]}
                  <span className="text-[13px] font-medium tabular-nums text-fg-subtle">{grouped[key].length}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-10">
              {sections.map(({ key, items: sectionItems, page, totalPages, setPage }) => (
                <section
                  key={key}
                  id={`archive-panel-${key}`}
                  aria-label={SECTION_LABEL[key]}
                  className={`${mobileTab === key ? 'flex' : 'hidden sm:flex'} gap-8 sm:border-t sm:border-line-strong sm:pt-6`}
                >
                  <div className="hidden flex-shrink-0 w-16 sm:block">
                    <span
                      className="block text-white font-black leading-none"
                      style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif", opacity: 0.9 }}
                    >
                      {key}
                    </span>
                    <span className="mt-2 block text-[13px] tabular-nums text-fg-subtle">
                      {grouped[key].length}개
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col min-w-0">
                    {grouped[key].length === 0 ? (
                      <span className="border-b border-line py-3 text-sm text-fg-subtle">
                        {search.trim() ? '검색 결과가 없습니다.' : '보관된 항목이 없습니다.'}
                      </span>
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
                </section>
              ))}
            </div>
            </>
          )}
        </div>
      </section>

      <HomeFooter />

      {toast && <ToastMessage key={toast.id} toast={toast} onDone={clearToast} />}
    </main>
  )
}
