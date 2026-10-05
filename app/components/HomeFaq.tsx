'use client'

import { useState } from 'react'
import SectionLabel from '@/app/components/SectionLabel'
import Reveal from '@/app/components/Reveal'

const FAQ_ITEMS = [
  {
    question: 'Pay1oad는 어떤 동아리인가요?',
    answer: 'Pay1oad는 가천대학교 정보보안 동아리로, 해킹과 보안에 관심 있는 학생들이 모여 함께 성장하는 공간입니다. CTF 대회 참가, 보안 프로젝트, 세미나 등 다양한 활동을 진행합니다.',
  },
  {
    question: 'Pay1oad는 어떤 활동을 하나요?',
    answer: 'CTF(Capture The Flag) 대회 참가, 웹 해킹·리버싱·포렌식 등 분야별 스터디, 보안 프로젝트, 외부 세미나 및 교내 발표 등을 진행합니다.',
  },
  {
    question: '관련 학과가 아닌 학생도 지원할 수 있나요?',
    answer: '네, 가천대학교 재학생이라면 전공에 관계없이 누구든 지원할 수 있습니다. 보안에 대한 열정과 의지가 있다면 환영합니다.',
  },
  {
    question: '개강 세미나가 무엇인가요?',
    answer: '1학기 동안의 동아리 활동에 관한 사항을 소개하는 자리로, 동아리 내 모든 부원은 필수적으로 참여해야 합니다.',
  },
  {
    question: '어떤 학생을 모집하나요?',
    answer: '정보 보안에 관심이 많고, 동아리 활동에 열정을 가지고 활동할 수 있는 가천대학교 재학생 및 휴학생을 대상으로 모집합니다.',
  },
]

export default function HomeFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-28 px-[5vw]">
      <div className="max-w-2xl mx-auto">

        <Reveal>
          <SectionLabel label="FAQ" className="mb-12" />
        </Reveal>

        {/* Items */}
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i
            return (
              // 질문마다 Reveal 로 감싸 차례로 등장시킨다
              <Reveal key={i} delay={(i + 1) * 80}>
              <div
                className={`rounded-xl border bg-surface overflow-hidden transition-colors duration-200 ${
                  isOpen ? 'border-[#1C5AFF]/40' : 'border-line'
                }`}
              >
                {/* Question row */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="text-fg-muted text-sm">
                    {/* 터미널 프롬프트 기호: "Q." 대신 */}
                    <span aria-hidden="true" className="font-mono font-medium text-[#6E95FF] mr-2.5">&gt;</span>
                    {item.question}
                  </span>
                  <span aria-hidden="true" className="text-fg-subtle text-xl leading-none flex-shrink-0 ml-4">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {/* Answer */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s ease',
                  }}
                >
                  <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    {/* 왼쪽 여백을 > 기호 폭만큼 더 줘서 답변이 질문 글자와 같은 선에서 시작한다 */}
                    <p className="pl-[42px] pr-5 pb-5 text-fg-subtle text-sm leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
              </Reveal>
            )
          })}
        </div>

      </div>
    </section>
  )
}
