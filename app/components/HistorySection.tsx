'use client'

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'

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

const years = [2018, 2022, 2023, 2024, 2025]

const historyData: Record<number, YearData> = {
  2018: {
    선정: [{ summary: '동아리 창립', detail: '동아리 창립' }],
    교육: [{ summary: '-', detail: '-' }],
    발표: [{ summary: '-', detail: '-' }],
    성과: [{ summary: '-', detail: '-' }],
  },
  2022: {
    선정: [{ summary: '-', detail: '-' }],
    교육: [{ summary: 'BoB 수료', detail: 'BoB 수료' }],
    발표: [{ summary: '-', detail: '-' }],
    성과: [{ summary: '-', detail: '-' }],
  },
  2023: {
    선정: [
      { summary: 'KUSIC 지원 사업 선정', detail: 'KUSIC 지원 사업 동아리 선정' },
      { summary: 'Dreamhack Education Plan 선정', detail: 'Dreamhack Education Plan 선정' },
    ],
    교육: [
      { summary: 'BoB 수료', detail: 'BoB 12기 수료: *기 김지성, *기 원신영' },
      { summary: 'WhiteHat School 수료', detail: 'WhiteHat School 1기 수료' },
      { summary: 'P4C 수료', detail: 'P4C 수료' },
    ],
    발표: [
      { summary: '스마트보안학과 세미나', detail: '스마트보안학과 세미나: 7기 이동하' },
    ],
    성과: [
      { summary: 'CVE 발급', detail: 'Zero Pointer(이동하, 박우진, 전우진, 정지민) CVE 발급 (CVE-2023-50245)' },
      { summary: '정보보호학회장상', detail: '정보보호학회장상' },
      { summary: '정보보호학회 참가', detail: '2023 하계/추계 정보보호학회' },
    ],
  },
  2024: {
    선정: [
      { summary: 'KUSIC 선정', detail: 'KUSIC 선정' },
    ],
    교육: [
      { summary: 'BoB 수료', detail: 'BoB 13기 수료: *기 고재훈, 2기 김대훈, *기 김용진, *기 박우진, *기 이지수' },
      { summary: 'WhiteHat School 수료', detail: 'WhiteHat School 2기 수료' },
      { summary: 'P4C 수료', detail: 'P4C 수료' },
    ],
    발표: [
      { summary: 'OB 특강', detail: 'OB 특강' },
      { summary: 'KUSIC 권역별 세미나', detail: '2024 KUSIC 권역별 세미나' },
      { summary: '제 1회 스보인의 날', detail: '제 1회 스보인의 날' },
    ],
    성과: [
      { summary: '한국통신학회', detail: '2024 동계 한국통신학회' },
    ],
  },
  2025: {
    선정: [{ summary: '-', detail: '-' }],
    교육: [
      { summary: 'K-shield 주니어 수료', detail: 'K-shield 주니어 기초과정 수료' },
      { summary: 'KISA Academy 수료', detail: 'KISA Academy 침해사고 대응훈련 수료' },
      { summary: 'P4C 수료', detail: 'P4C 시스템 해킹 12기 수료' },
    ],
    발표: [{ summary: '-', detail: '-' }],
    성과: [
      { summary: '핵테온 세종 12위', detail: '2025 핵테온 세종: 초급 국내 부문 최고 기록 12등' },
    ],
  },
}

const cardStyles: { gradient: string; rounded: string }[] = [
  { gradient: 'linear-gradient(to left,   #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-tl-2xl' },
  { gradient: 'linear-gradient(to top,    #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-tr-2xl' },
  { gradient: 'linear-gradient(to bottom, #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-bl-2xl' },
  { gradient: 'linear-gradient(to right,  #010812 0%, #010812 25%, #1e3d9e 100%)', rounded: 'rounded-br-2xl' },
]

const cardTitles: (keyof YearData)[] = ['선정', '교육', '발표', '성과']

export default function HistorySection() {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [lineX, setLineX] = useState(0)
  const [cardMargin, setCardMargin] = useState(0)
  const [ready, setReady] = useState(false)

  const yearRefs = useRef<(HTMLButtonElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const cardGridRef = useRef<HTMLDivElement>(null)

  const updateLayout = useCallback(() => {
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
    setReady(true)
  }, [selectedYear])

  useLayoutEffect(() => {
    updateLayout()
  }, [updateLayout])

  useEffect(() => {
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [updateLayout])

  const data = historyData[selectedYear]

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
              const isTopRow = i < 2           // 선정(0), 교육(1) → 아래 정렬
              return (
                <div key={title} className={`group relative ${isTopRow ? 'self-end' : 'self-start'}`}>
                  {/* 카드 */}
                  <div
                    className={`p-5 w-56 ${cardStyles[i].rounded} cursor-default`}
                    style={{ background: cardStyles[i].gradient }}
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
