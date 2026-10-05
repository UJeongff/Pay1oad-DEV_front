'use client'

import { useState, useEffect } from 'react'
import { useRevealOnce } from '@/app/components/Reveal'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

type HistoryCategory = 'SELECTION' | 'EDUCATION' | 'PRESENTATION' | 'ACHIEVEMENT'

interface HistoryItemDto {
  id: number
  year: number
  category: HistoryCategory
  summary: string
  detail: string
  displayOrder: number
}

const CATEGORY_TO_KO: Record<HistoryCategory, '선정' | '교육' | '발표' | '성과'> = {
  SELECTION: '선정',
  EDUCATION: '교육',
  PRESENTATION: '발표',
  ACHIEVEMENT: '성과',
}

type HistoryItem = {
  summary: string
  detail: string
}

type YearData = {
  선정: HistoryItem[]
  교육: HistoryItem[]
  발표: HistoryItem[]
  성과: HistoryItem[]
}

const EMPTY_YEAR: YearData = {
  선정: [{ summary: '-', detail: '-' }],
  교육: [{ summary: '-', detail: '-' }],
  발표: [{ summary: '-', detail: '-' }],
  성과: [{ summary: '-', detail: '-' }],
}

// API 응답 → 연도/카테고리별 그룹핑 + 빈 카테고리 placeholder
function groupByYear(items: HistoryItemDto[]): { years: number[]; data: Record<number, YearData> } {
  const data: Record<number, YearData> = {}
  for (const it of items) {
    if (!data[it.year]) {
      data[it.year] = { 선정: [], 교육: [], 발표: [], 성과: [] }
    }
    const koCat = CATEGORY_TO_KO[it.category]
    if (koCat) data[it.year][koCat].push({ summary: it.summary, detail: it.detail })
  }
  for (const y of Object.keys(data)) {
    const yd = data[Number(y)]
    for (const c of ['선정', '교육', '발표', '성과'] as const) {
      if (yd[c].length === 0) yd[c] = [{ summary: '-', detail: '-' }]
    }
  }
  const years = Object.keys(data).map(Number).sort((a, b) => a - b)
  return { years, data }
}

// 2×2 로 놓였을 때 바깥 모서리만 둥글다. 한 줄로 쌓이는 모바일에선 맨 위·맨 아래 카드만 둥글게
const cardStyles: { gradient: string; rounded: string }[] = [
  { gradient: 'linear-gradient(to left,   #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-t-2xl sm:rounded-tr-none' },
  { gradient: 'linear-gradient(to top,    #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'sm:rounded-tr-2xl' },
  { gradient: 'linear-gradient(to bottom, #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'sm:rounded-bl-2xl' },
  { gradient: 'linear-gradient(to right,  #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-b-2xl sm:rounded-bl-none' },
]

const cardTitles: (keyof YearData)[] = ['선정', '교육', '발표', '성과']

function HistoryTitle() {
  return (
    <div className="flex justify-center mb-12">
      <span className="border border-line-strong text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
        HISTORY
      </span>
    </div>
  )
}

/**
 * 연도 타임라인. 화면에 들어오면 선이 왼쪽부터 그어지고 연도 점이 차례로 튀어나온 뒤,
 * 첫 해부터 선택한 해까지 파란 진행선이 차오른다. 연도를 바꾸면 진행선이 따라 늘고 준다.
 * 데이터가 온 뒤에만 그려지는 컴포넌트라, 등장 감지(useRevealOnce)가 실제 타임라인을 본다.
 */
function YearTimeline({
  years,
  selectedYear,
  onSelect,
}: {
  years: number[]
  selectedYear: number
  onSelect: (year: number) => void
}) {
  const { ref, revealed } = useRevealOnce<HTMLDivElement>(0.4)
  const idx = years.indexOf(selectedYear)
  const progress = years.length > 1 ? idx / (years.length - 1) : 0
  const drawn = revealed ? 'scale-x-100' : 'scale-x-0'

  return (
    <div ref={ref} className="relative px-2">

      {/* 수평선 — 왼쪽부터 그어진다 */}
      <div className={`absolute top-[9px] left-0 right-0 h-px bg-line-strong origin-left transition-transform duration-[900ms] ease-out motion-reduce:transition-none ${drawn}`} />

      {/* 진행선 — 버튼 폭(w-12)이 모두 같아서 첫 버튼 중심(px-2 + 24px)부터 선택한 버튼 중심까지 계산할 수 있다.
          처음엔 수평선이 반쯤 그어진 뒤(0.5초) 차오르고, 이후 연도를 바꾸면 폭만 바뀐다 */}
      <div
        aria-hidden="true"
        className={`absolute top-[9px] h-px bg-[#1C5AFF] shadow-[0_0_8px_rgba(28,90,255,0.8)] origin-left motion-reduce:transition-none ${drawn}`}
        style={{
          left: 'calc(0.5rem + 24px)',
          width: `calc((100% - 1rem - 48px) * ${progress})`,
          transition: 'width 400ms ease, scale 700ms ease-out 500ms',
        }}
      />

      {/* 연도 버튼들 */}
      <div className="relative flex items-start justify-between">
        {years.map((year, i) => {
          const isActive = selectedYear === year
          return (
            <button
              key={year}
              type="button"
              onClick={() => onSelect(year)}
              aria-pressed={isActive}
              className="w-12 flex flex-col items-center gap-2.5 group"
            >
              {/* 점·별은 선을 따라 차례로 튀어나온다 */}
              <span
                aria-hidden="true"
                className={`flex h-[18px] items-start justify-center transition-[scale,opacity] duration-400 ease-[cubic-bezier(.3,1.6,.6,1)] motion-reduce:transition-none ${
                  revealed ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`}
                style={{ transitionDelay: `${150 + i * 120}ms` }}
              >
                {isActive ? (
                  // 선택이 바뀌면 새로 그려지면서 별이 돌며 나타난다
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="history-star-in">
                    <path
                      d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
                      stroke="#1C5AFF"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <span className="w-[9px] h-[9px] rounded-full bg-fg-faint mt-[4.5px] group-hover:bg-fg-subtle transition-colors" />
                )}
              </span>
              <span
                className={`text-sm transition-colors ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-fg-faint group-hover:text-fg-muted font-medium'
                }`}
              >
                {year}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const CATEGORY_EN: Record<keyof YearData, string> = {
  선정: 'SELECTION',
  교육: 'EDUCATION',
  발표: 'PRESENTATION',
  성과: 'ACHIEVEMENT',
}

/**
 * 분류 하나의 카드. 제목 옆에 개수 배지, 항목은 얇은 선으로 나눈 요약 목록이고
 * 상세가 있는 항목은 눌러서 펼친다 (한 번에 하나). 넘치면 카드 안에서 스크롤하고,
 * 아래 끝을 흐리게 해 더 있다는 걸 알린다 (globals.css 의 .history-scroll / .history-fade).
 * 연도가 바뀌면 부모가 key 를 바꿔 새로 그리므로 펼친 항목도 닫힌다.
 */
function HistoryCard({
  year,
  title,
  items,
  style,
}: {
  year: number
  title: keyof YearData
  items: HistoryItem[]
  style: { gradient: string; rounded: string }
}) {
  const [open, setOpen] = useState<number | null>(null)
  // 빈 분류는 '-' 한 줄로 채워져 온다 (groupByYear)
  const real = items.filter((it) => it.summary !== '-')
  const hasDetail = (it: HistoryItem) => !!it.detail && it.detail !== '-' && it.detail !== it.summary

  return (
    <div
      className={`flex flex-col h-52 p-4 ${style.rounded}`}
      style={{ background: style.gradient }}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-white/15">
        <h3 className="flex items-baseline gap-2">
          <span className="text-white font-bold text-[15px]">{title}</span>
          <span className="text-fg-faint text-[11px] tracking-[0.12em]" style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>
            {CATEGORY_EN[title]}
          </span>
        </h3>
        <span
          className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-fg-muted tabular-nums"
          style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
          aria-label={`${real.length}건`}
        >
          {String(real.length).padStart(2, '0')}
        </span>
      </div>

      <ul className="history-scroll history-fade flex-1 min-h-0 overflow-y-auto pr-2" aria-label={`${year}년 ${title}`}>
        {real.length === 0 && <li className="pt-3 text-fg-faint text-sm">기록 없음</li>}
        {real.map((item, j) => {
          const expandable = hasDetail(item)
          const isOpen = open === j
          const detailId = `history-${year}-${title}-${j}`
          return (
            <li key={j} className="border-b border-white/8" style={{ wordBreak: 'keep-all' }}>
              {expandable ? (
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : j)}
                  aria-expanded={isOpen}
                  aria-controls={detailId}
                  className="w-full flex items-center justify-between gap-3 py-2.5 text-left text-white text-sm font-semibold hover:text-[#C9D7FF] transition-colors cursor-pointer"
                >
                  <span>{item.summary}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className={`flex-shrink-0 text-fg-subtle transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : (
                <p className="py-2.5 text-white text-sm font-semibold">{item.summary}</p>
              )}
              {expandable && isOpen && (
                <p id={detailId} className="pb-2.5 -mt-0.5 text-fg-muted text-[13px] leading-relaxed">
                  {item.detail}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function HistorySection() {
  const [years, setYears] = useState<number[]>([])
  const [yearData, setYearData] = useState<Record<number, YearData>>({})
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // ── 데이터 로드 ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    fetch(`${API_URL}/v1/about/history`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (cancelled) return
        const items: HistoryItemDto[] = j?.data ?? []
        const { years: ys, data } = groupByYear(items)
        setYears(ys)
        setYearData(data)
        if (ys.length > 0) setSelectedYear(ys[ys.length - 1]) // 최신 연도 기본 선택
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // ── 렌더 가드 ─────────────────────────────────────────
  if (loading || years.length === 0 || selectedYear == null) {
    return (
      <section className="pb-28 px-[5vw]">
        <div className="max-w-3xl mx-auto">
          <HistoryTitle />
          <p className="text-center text-fg-faint text-sm py-16">
            {loading ? '불러오는 중...' : '등록된 히스토리가 없습니다.'}
          </p>
        </div>
      </section>
    )
  }

  const data = yearData[selectedYear] ?? EMPTY_YEAR

  return (
    <section className="pb-28 px-[5vw]">
      <div className="max-w-3xl mx-auto">

        <HistoryTitle />

        <YearTimeline years={years} selectedYear={selectedYear} onSelect={setSelectedYear} />

        {/* 카드 그리드 — 2×2, 좁은 화면에선 한 줄에 하나씩. 카드 사이 간격(gap-2)은 그대로 두고 전체 폭만 줄였다 */}
        <div className="mt-12 max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cardTitles.map((title, i) => (
            <HistoryCard
              key={`${selectedYear}-${title}`}
              year={selectedYear}
              title={title}
              items={data[title]}
              style={cardStyles[i]}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
