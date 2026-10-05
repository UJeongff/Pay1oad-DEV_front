'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import SectionLabel from '@/app/components/SectionLabel'
import { revealClass, useRevealOnce } from '@/app/components/Reveal'

/** tags 는 description 원문에서 뽑은 핵심 기술 — 상세 영역에 칩으로 보인다 */
type Field = { name: string; description: string; tags: string[] }

const FIELDS: Field[] = [
  {
    name: 'Web Hacking',
    description:
      '웹 서비스에 숨은 취약점을 찾아내는 분야입니다. SQL Injection, XSS, SSRF, 인증·인가 우회처럼 '
      + '실제 서비스에서 가장 자주 터지는 문제들을 직접 공격해 보고, 어떻게 막아야 하는지까지 함께 다룹니다.',
    tags: ['SQL Injection', 'XSS', 'SSRF', '인증·인가 우회'],
  },
  {
    name: 'Pwnable',
    description:
      '프로그램의 메모리를 망가뜨려 실행 흐름을 빼앗는 시스템 해킹 분야입니다. 버퍼 오버플로우, Use-After-Free 같은 '
      + '메모리 취약점을 익스플로잇하고, ASLR·NX·Canary 같은 보호 기법을 우회하는 방법을 연구합니다.',
    tags: ['버퍼 오버플로우', 'Use-After-Free', 'ASLR·NX·Canary 우회'],
  },
  {
    name: 'Reverse Engineering',
    description:
      '컴파일된 바이너리를 거꾸로 분석해 내부 동작을 밝혀내는 분야입니다. 소스 코드 없이 어셈블리와 디컴파일 결과만으로 '
      + '숨겨진 로직이나 악성코드의 행위를 읽어내는 힘을 기릅니다.',
    tags: ['어셈블리', '디컴파일', '악성코드 분석'],
  },
  {
    name: 'Cryptography',
    description:
      '암호 알고리즘의 설계·구현상 약점을 파고드는 분야입니다. 잘못된 난수, 재사용된 키, 패딩 오라클처럼 '
      + '"암호를 썼는데도 뚫리는" 사례를 분석하고, 안전하게 쓰는 방법을 익힙니다.',
    tags: ['잘못된 난수', '키 재사용', '패딩 오라클'],
  },
  {
    name: 'Forensics',
    description:
      '사고가 난 뒤 남은 흔적을 복원해 경위를 규명하는 분야입니다. 디스크 이미지, 메모리 덤프, 네트워크 패킷에서 '
      + '삭제되거나 감춰진 데이터를 끄집어내 공격자가 무엇을 했는지 재구성합니다.',
    tags: ['디스크 이미지', '메모리 덤프', '네트워크 패킷'],
  },
  {
    name: 'Development',
    description:
      '보안 도구와 서비스를 직접 만드는 분야입니다. 취약점 스캐너, 자동화 익스플로잇, CTF 플랫폼처럼 '
      + '공격과 방어를 손에 잡히는 결과물로 옮기며, 개발 역량과 보안 지식을 함께 쌓습니다.',
    tags: ['취약점 스캐너', '자동화 익스플로잇', 'CTF 플랫폼'],
  },
]

const STAGGER_MS = 60

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 왼쪽 목록에서 분야를 고르면 오른쪽에 전체 설명과 태그가 나오는 패널.
 *
 * - 화면에 들어오면 목록이 위에서부터 차례로 떠오르고, 그 뒤 상세 영역이 나타난다.
 * - 등장이 끝나면 5초마다 다음 분야로 넘어간다. 진행 막대(CSS 애니메이션)가 다 차면 onAnimationEnd 로 넘긴다.
 *   직접 골라도 자동 전환은 계속되고, 고른 분야부터 막대가 다시 찬다(막대가 새 탭 아래 새로 그려지므로).
 *   멈춰서 읽고 싶으면 마우스를 올리거나 키보드 포커스를 두면 된다(globals.css 에서 일시정지).
 * - 동작 줄이기 사용자는 진행 막대가 숨겨져 자동 전환도 일어나지 않는다.
 */
export default function ActivityFields() {
  const [selected, setSelected] = useState(0)
  // 진행 막대도 등장이 끝난 뒤에 시작해야 해서, Reveal 컴포넌트 대신 같은 훅을 직접 쓴다
  const { ref: containerRef, revealed } = useRevealOnce<HTMLDivElement>(0.2)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const choose = (i: number) => setSelected(i)

  // 탭 목록 키보드 이동: 위/아래(좌/우) 화살표, Home/End
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = FIELDS.length - 1
    let next: number | null = null
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = selected === last ? 0 : selected + 1
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = selected === 0 ? last : selected - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    choose(next)
    tabRefs.current[next]?.focus()
  }

  const rv = revealClass(revealed)
  const current = FIELDS[selected]

  return (
    <div ref={containerRef} className="mt-25">
      <SectionLabel label="Fields" className="mb-7" />

      <div
        className="fields-panel rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">

          {/* 목록 */}
          <div role="tablist" aria-label="주요 활동 분야" aria-orientation="vertical" onKeyDown={onTabKeyDown}>
            {FIELDS.map((f, i) => {
              const isSelected = i === selected
              return (
                <div
                  key={f.name}
                  className={`${i > 0 ? 'border-t border-line' : ''} ${rv}`}
                  style={{ transitionDelay: `${i * STAGGER_MS}ms` }}
                >
                  <button
                    ref={(el) => { tabRefs.current[i] = el }}
                    type="button"
                    role="tab"
                    id={`activity-field-tab-${i}`}
                    aria-selected={isSelected}
                    aria-controls="activity-field-detail"
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => choose(i)}
                    className={`relative w-full flex items-center gap-5 px-7 py-5 text-left text-[17px] font-semibold cursor-pointer transition-colors duration-200 ${
                      isSelected ? 'text-white bg-surface-raised' : 'text-fg-subtle hover:text-white hover:bg-surface'
                    }`}
                  >
                    <span className="w-7 shrink-0 text-sm font-bold tabular-nums text-[#6E95FF]">{pad(i + 1)}</span>
                    <span>{f.name}</span>

                    {/* 자동 전환 진행 막대: 다 차면 다음 분야로 */}
                    {isSelected && revealed && (
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
                        <span
                          className="fields-progress-fill block h-full bg-[#1C5AFF]"
                          onAnimationEnd={() => setSelected((selected + 1) % FIELDS.length)}
                        />
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 상세 */}
          <div
            id="activity-field-detail"
            role="tabpanel"
            aria-labelledby={`activity-field-tab-${selected}`}
            className={`border-t md:border-t-0 md:border-l border-line p-7 md:px-11 md:py-10 md:min-h-[340px] ${rv}`}
            style={{ transitionDelay: `${FIELDS.length * STAGGER_MS + 20}ms` }}
          >
            {/* key 가 바뀌면 새로 마운트되어 페이드인 애니메이션이 다시 돈다 */}
            <div key={current.name} className="fields-detail-in">
              <p className="mb-2.5 text-[13px] font-bold tabular-nums text-[#6E95FF]">
                {pad(selected + 1)} / {pad(FIELDS.length)}
              </p>
              <h4 className="mb-4 text-[30px] font-bold tracking-[-0.02em] text-white">{current.name}</h4>
              <p className="text-base leading-[1.8] text-fg-muted">{current.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {current.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#6E95FF]/35 bg-[#1C5AFF]/10 px-3 py-1.5 text-[13px] font-medium text-[#C9D7FF]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
