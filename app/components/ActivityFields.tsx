'use client'

import { useState } from 'react'

type Field = { name: string; description: string }

const FIELDS: Field[] = [
  {
    name: 'Web Hacking',
    description:
      '웹 서비스에 숨은 취약점을 찾아내는 분야입니다. SQL Injection, XSS, SSRF, 인증·인가 우회처럼 '
      + '실제 서비스에서 가장 자주 터지는 문제들을 직접 공격해 보고, 어떻게 막아야 하는지까지 함께 다룹니다.',
  },
  {
    name: 'Pwnable',
    description:
      '프로그램의 메모리를 망가뜨려 실행 흐름을 빼앗는 시스템 해킹 분야입니다. 버퍼 오버플로우, Use-After-Free 같은 '
      + '메모리 취약점을 익스플로잇하고, ASLR·NX·Canary 같은 보호 기법을 우회하는 방법을 연구합니다.',
  },
  {
    name: 'Reverse Engineering',
    description:
      '컴파일된 바이너리를 거꾸로 분석해 내부 동작을 밝혀내는 분야입니다. 소스 코드 없이 어셈블리와 디컴파일 결과만으로 '
      + '숨겨진 로직이나 악성코드의 행위를 읽어내는 힘을 기릅니다.',
  },
  {
    name: 'Cryptography',
    description:
      '암호 알고리즘의 설계·구현상 약점을 파고드는 분야입니다. 잘못된 난수, 재사용된 키, 패딩 오라클처럼 '
      + '"암호를 썼는데도 뚫리는" 사례를 분석하고, 안전하게 쓰는 방법을 익힙니다.',
  },
  {
    name: 'Forensics',
    description:
      '사고가 난 뒤 남은 흔적을 복원해 경위를 규명하는 분야입니다. 디스크 이미지, 메모리 덤프, 네트워크 패킷에서 '
      + '삭제되거나 감춰진 데이터를 끄집어내 공격자가 무엇을 했는지 재구성합니다.',
  },
  {
    name: 'Development',
    description:
      '보안 도구와 서비스를 직접 만드는 분야입니다. 취약점 스캐너, 자동화 익스플로잇, CTF 플랫폼처럼 '
      + '공격과 방어를 손에 잡히는 결과물로 옮기며, 개발 역량과 보안 지식을 함께 쌓습니다.',
  },
]

export default function ActivityFields() {
  const [openName, setOpenName] = useState<string | null>(null)
  const open = FIELDS.find((f) => f.name === openName) ?? null

  return (
    <div className="mt-25">
      <h3 className="text-xl font-bold mb-6" style={{ color: '#1C5AFF' }}>
        주요 활동 분야
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {FIELDS.map((f) => {
          const isOpen = openName === f.name
          return (
            <button
              key={f.name}
              type="button"
              onClick={() => setOpenName(isOpen ? null : f.name)}
              aria-expanded={isOpen}
              aria-controls="activity-field-detail"
              className="border text-sm rounded-xl py-2.5 px-2 text-center transition-all duration-200 cursor-pointer"
              style={{
                background: isOpen ? 'rgba(28,90,255,0.18)' : 'rgba(255,255,255,0.03)',
                borderColor: isOpen ? 'rgba(28,90,255,0.65)' : 'rgba(255,255,255,0.15)',
                color: isOpen ? '#91CDFF' : 'rgba(255,255,255,0.75)',
              }}
            >
              {f.name}
            </button>
          )
        })}
      </div>

      {/* 0fr → 1fr 로 펼친다. max-height 를 찍어두는 방식과 달리 내용 높이가 달라져도 잘린 곳 없이 맞는다. */}
      <div
        id="activity-field-detail"
        className="grid transition-all duration-300 ease-out"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
          marginTop: open ? '0.75rem' : 0,
        }}
      >
        <div className="overflow-hidden">
          <div
            className="rounded-xl border px-5 py-4"
            style={{
              background: 'rgba(28,90,255,0.06)',
              borderColor: 'rgba(28,90,255,0.25)',
            }}
          >
            <p className="text-sm leading-relaxed text-white/70">
              <span className="font-semibold" style={{ color: '#91CDFF' }}>
                {open?.name}
              </span>
              <span className="text-white/40">{' : '}</span>
              {open?.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
