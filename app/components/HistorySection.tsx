'use client'

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

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

const cardStyles: { gradient: string; rounded: string }[] = [
  { gradient: 'linear-gradient(to left,   #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-tl-2xl' },
  { gradient: 'linear-gradient(to top,    #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-tr-2xl' },
  { gradient: 'linear-gradient(to bottom, #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-bl-2xl' },
  { gradient: 'linear-gradient(to right,  #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-br-2xl' },
]

const cardTitles: (keyof YearData)[] = ['선정', '교육', '발표', '성과']

export default function HistorySection() {
  const [years, setYears] = useState<number[]>([])
  const [yearData, setYearData] = useState<Record<number, YearData>>({})
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [lineX, setLineX] = useState(0)
  const [cardMargin, setCardMargin] = useState(0)
  const [cardHeight, setCardHeight] = useState(0)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)

  const yearRefs = useRef<(HTMLButtonElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const cardGridRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

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

  // ── 레이아웃 계산 (연도 선택 시) ───────────────────────
  const updateLayout = useCallback(() => {
    if (selectedYear == null) return
    const idx = years.indexOf(selectedYear)
    const btn = yearRefs.current[idx]
    const container = containerRef.current
    const cardGrid = cardGridRef.current
    if (!btn || !container || !cardGrid) return

    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const btnCenterX = btnRect.left + btnRect.width / 2 - containerRect.left

    setLineX(btnCenterX)

    const cardWidth = cardGrid.offsetWidth
    const containerWidth = containerRect.width
    const desired = btnCenterX - cardWidth / 2
    const clamped = Math.max(0, Math.min(desired, containerWidth - cardWidth))
    setCardMargin(clamped)

    cardRefs.current.forEach((card) => {
      if (card) card.style.minHeight = ''
    })

    const heights = cardRefs.current
      .map((card) => card?.offsetHeight ?? 0)
      .filter((height) => height > 0)

    setCardHeight(heights.length > 0 ? Math.max(...heights) : 0)
    setReady(true)
  }, [selectedYear, years])

  useLayoutEffect(() => {
    updateLayout()
  }, [updateLayout])

  useEffect(() => {
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [updateLayout])

  // ── 렌더 가드 ─────────────────────────────────────────
  if (loading) {
    return (
      <section className="pb-32 px-[5vw]">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-16">
            <span className="border border-white/30 text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
              HISTORY
            </span>
          </div>
          <p className="text-center text-white/30 text-sm py-16">불러오는 중...</p>
        </div>
      </section>
    )
  }

  if (years.length === 0 || selectedYear == null) {
    return (
      <section className="pb-32 px-[5vw]">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-16">
            <span className="border border-white/30 text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
              HISTORY
            </span>
          </div>
          <p className="text-center text-white/30 text-sm py-16">등록된 히스토리가 없습니다.</p>
        </div>
      </section>
    )
  }

  const data = yearData[selectedYear] ?? EMPTY_YEAR

  return (
    <section className="pb-32 px-[5vw]">
      <div className="max-w-3xl mx-auto">

        {/* HISTORY 타이틀 */}
        <div className="flex justify-center mb-16">
          <span className="border border-white/30 text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
            HISTORY
          </span>
        </div>

        {/* 타임라인 + 수직선 컨테이너 */}
        <div ref={containerRef} className="relative px-2">

          {/* 수평 점선 */}
          <div className="absolute top-[9px] left-0 right-0 h-px bg-white/20" />

          {/* 연도 버튼들 */}
          <div className="relative flex items-start justify-between">
            {years.map((year, i) => {
              const isActive = selectedYear === year
              return (
                <button
                  key={year}
                  ref={(el) => { yearRefs.current[i] = el }}
                  onClick={() => setSelectedYear(year)}
                  className="flex flex-col items-center gap-2.5 group"
                >
                  {isActive ? (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
                        stroke="#1C5AFF"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <div className="w-[9px] h-[9px] rounded-full bg-white/30 mt-[4.5px] group-hover:bg-white/60 transition-colors" />
                  )}
                  <span
                    className={`text-sm transition-colors ${
                      isActive
                        ? 'text-white font-bold'
                        : 'text-white/40 group-hover:text-white/70 font-medium'
                    }`}
                  >
                    {year}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 수직 연결선 */}
          <div
            className="absolute w-px pointer-events-none"
            style={{
              left: lineX,
              top: 50,
              height: 44,
              background: 'linear-gradient(to bottom, #1C5AFF 0%, rgba(28,90,255,0.15) 100%)',
              transition: 'left 0.3s ease',
            }}
          />
        </div>

        {/* 카드 그리드 */}
        <div className="mt-12">
          <div
            ref={cardGridRef}
            className="grid grid-cols-2 gap-2"
            style={{
              width: 'fit-content',
              marginLeft: ready ? cardMargin : undefined,
              transition: 'margin-left 0.3s ease',
            }}
          >
            {cardTitles.map((title, i) => {
              const isRightCol = i % 2 === 1  // 교육(1), 성과(3) → 우측에 tooltip
              return (
                <div key={title} className="group relative h-full">
                  {/* 카드 */}
                  <div
                    ref={(el) => { cardRefs.current[i] = el }}
                    className={`p-5 w-56 h-full ${cardStyles[i].rounded} cursor-default`}
                    style={{
                      background: cardStyles[i].gradient,
                      height: cardHeight || undefined,
                    }}
                  >
                    <h3 className="text-white font-bold text-sm tracking-wider mb-3 uppercase">
                      {title}
                    </h3>
                    <ul className="space-y-1.5">
                      {data[title].map((item, j) => (
                        <li
                          key={j}
                          className="text-white/75 text-sm flex items-start gap-2"
                          style={{ wordBreak: 'keep-all' }}
                        >
                          <span className="mt-[7px] w-1 h-1 rounded-full bg-white/50 flex-shrink-0" />
                          {item.summary}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tooltip — 카드 바로 옆 빈 공간에 표시 */}
                  {/* pl/pr로 gap을 내부에 흡수해 hover 영역이 끊기지 않게 함 */}
                  <div
                    className={`
                      absolute top-0 z-20 w-56
                      opacity-0 pointer-events-none
                      group-hover:opacity-100 group-hover:pointer-events-auto
                      transition-opacity duration-200
                      ${isRightCol
                        ? 'left-full pl-2'   // 우측 열: 카드 오른쪽에 붙음
                        : 'right-full pr-2'  // 좌측 열: 카드 왼쪽에 붙음
                      }
                    `}
                  >
                    <div className="bg-[#0a1628] border border-white/10 rounded-xl p-4 shadow-2xl">
                      <p className="text-white/40 text-xs font-medium mb-2">{selectedYear} · {title}</p>
                      <ul className="space-y-2">
                        {data[title].map((item, j) => (
                          <li
                            key={j}
                            className="text-white/80 text-sm flex items-start gap-2"
                            style={{ wordBreak: 'keep-all' }}
                          >
                            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#1C5AFF]/70 flex-shrink-0" />
                            {item.detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}
