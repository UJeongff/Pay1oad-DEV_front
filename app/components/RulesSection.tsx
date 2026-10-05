'use client'

import { useState } from 'react'

type Article = {
  num: number
  title: string
  content: string
}

type Chapter = {
  num: number
  title: string
  articles: Article[]
}

const chapters: Chapter[] = [
  {
    num: 1,
    title: '활동 점수 시행 규칙',
    articles: [
      {
        num: 1,
        title: '활동 기준',
        content: `
회원은 다음 활동을 통해 활동 점수를 부여받습니다.
- 세미나 및 스터디 참여
- 과제 및 프로젝트 수행
- 내부 발표
- 보안 관련 자격증 취득
- 취약점 분석 및 외부 대회 참여
        `,
      },
      {
        num: 2,
        title: '필수 참여',
        content: `
모든 회원은 한 학기 동안 최소 1개 이상의 스터디 또는 프로젝트에 참여해야 합니다.
중도 포기 시 이후 활동 참여에 불이익이 있을 수 있습니다.
        `,
      },
      {
        num: 3,
        title: '출석 및 제명',
        content: `
동아리 행사 3회 이상 무단 결석 시 제명됩니다.
단, 공결 또는 외부 보안 활동 참여 등은 예외로 인정됩니다.
        `,
      },
      {
        num: 4,
        title: '활동 점수 기준',
        content: `
활동 점수는 운영진 기준에 따라 부여됩니다.
외부 활동도 성과에 따라 점수로 인정될 수 있습니다.
        `,
      },
      {
        num: 5,
        title: '신입 회원 기준',
        content: `
신입 회원은 교육 커리큘럼에 필수 참여해야 합니다.
과제 수행을 통해 최대 14점까지 부여되며, 최소 10점 이상 획득해야 합니다.
        `,
      },
      {
        num: 6,
        title: '기존 회원 기준',
        content: `
기존 회원은 팀 프로젝트에 필수 참여해야 합니다.
발표 및 보고서를 통해 최대 14점까지 부여되며, 최소 10점 이상 획득해야 합니다.
        `,
      },
      {
        num: 7,
        title: '제명 기준',
        content: `
학기 종료 시 활동 점수 10점 미만인 경우 제명됩니다.
또한 동아리 규칙 위반 시 운영진 회의를 통해 징계가 결정됩니다.
        `,
      },
    ],
  },
  {
    num: 2,
    title: '회칙',
    articles: [
      {
        num: 1,
        title: '목적 및 정당성',
        content: '',
      },
    ],
  },
]

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="flex-shrink-0 text-fg-subtle transition-transform duration-300"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
    >
      <path
        d="M6 3l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function RulesSection() {
  const [openChapters, setOpenChapters] = useState<number[]>([])

  function toggle(num: number) {
    setOpenChapters((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    )
  }

  return (
    <section className="pb-28 px-[5vw]">
      <div className="max-w-3xl mx-auto">

        {/* Title badge */}
        <div className="flex justify-center mb-6">
          <span className="border border-line-strong text-white text-sm font-bold tracking-[0.35em] px-8 py-2.5 rounded-full">
            RULES
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-center text-fg-subtle text-base mb-12">
          Pay1oad 회칙 / 운영 원칙
        </p>

        {/* Accordion */}
        <div className="flex flex-col gap-2">
          {chapters.map((chapter) => {
            const isOpen = openChapters.includes(chapter.num)
            return (
              <div key={chapter.num} className="rounded-xl overflow-hidden border border-line">

                {/* Chapter header */}
                <button
                  type="button"
                  onClick={() => toggle(chapter.num)}
                  aria-expanded={isOpen}
                  aria-controls={`rules-chapter-${chapter.num}`}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors duration-200 ${
                    isOpen ? 'bg-[#1C5AFF]/8' : 'bg-surface hover:bg-surface-raised'
                  }`}
                >
                  <span className="text-white text-base font-semibold tracking-wide">
                    [제 {chapter.num}장]&nbsp; {chapter.title}
                  </span>
                  <ChevronIcon open={isOpen} />
                </button>

                {/* Articles */}
                {isOpen && (
                  <div
                    id={`rules-chapter-${chapter.num}`}
                    className="px-5 py-4 flex flex-col gap-4 border-t border-line bg-black/20"
                  >
                    {chapter.articles.map((article) => (
                      <div key={article.num}>
                        <p className="text-white text-[15px] font-medium mb-1">
                          제 {article.num}조 ({article.title})
                        </p>
                        {/* 원문의 줄바꿈·"- " 목록을 그대로 살린다 (앞뒤 빈 줄은 trim) */}
                        <p className="text-fg-subtle text-[15px] leading-relaxed whitespace-pre-line" style={{ wordBreak: 'keep-all' }}>
                          {article.content.trim()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
