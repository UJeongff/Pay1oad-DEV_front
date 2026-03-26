'use client'

import { useState } from 'react'

const FAQ_ITEMS = [
  {
    question: 'Q. Pay1oad는 어떤 동아리인가요?',
    answer: 'Pay1oad는 가천대학교 정보보안 동아리로, 해킹과 보안에 관심 있는 학생들이 모여 함께 성장하는 공간입니다. CTF 대회 참가, 보안 프로젝트, 세미나 등 다양한 활동을 진행합니다.',
  },
  {
    question: 'Q. Pay1oad는 어떤 활동을 하나요?',
    answer: 'CTF(Capture The Flag) 대회 참가, 웹 해킹·리버싱·포렌식 등 분야별 스터디, 보안 프로젝트, 외부 세미나 및 교내 발표 등을 진행합니다.',
  },
  {
    question: 'Q. 관련 학과가 아닌 학생도 지원할 수 있나요?',
    answer: '네, 가천대학교 재학생이라면 전공에 관계없이 누구든 지원할 수 있습니다. 보안에 대한 열정과 의지가 있다면 환영합니다.',
  },
  {
    question: 'Q. 개강 세미나가 무엇인가요?',
    answer: '1학기 동안의 동아리 활동에 관한 사항을 소개하는 자리로, 동아리 내 모든 부원은 필수적으로 참여해야 합니다.',
  },
  {
    question: 'Q. 어떤 학생을 모집하나요?',
    answer: '정보 보안에 관심이 많고, 동아리 활동에 열정을 가지고 활동할 수 있는 가천대학교 재학생 및 휴학생을 대상으로 모집합니다.',
  },
]

export default function HomeFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-28 px-[5vw]">
      <div className="max-w-2xl mx-auto">

        {/* Label */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
              stroke="#1C5AFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-white text-xl font-semibold tracking-widest">FAQ</span>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <div
                key={i}
                className="rounded-xl border overflow-hidden transition-colors duration-200"
                style={{
                  borderColor: isOpen ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                {/* Question row */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <span className="text-white/80 text-sm">{item.question}</span>
                  <span
                    className="text-white/60 text-xl leading-none flex-shrink-0 ml-4 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)' }}
                  >
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {/* Answer */}
                <div
                  style={{
                    maxHeight: isOpen ? '300px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                  }}
                >
                  <p className="px-5 pb-5 text-white/50 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
