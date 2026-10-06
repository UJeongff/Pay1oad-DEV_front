'use client'

// 회원가입 · 프로필 입력 · 승인 대기 화면이 함께 쓰는 부품.
// 두 폼에 같은 코드가 따로 있다가 한쪽만 고쳐져 어긋난 적이 있어 한곳에 모았다.

import Image from 'next/image'
import Link from 'next/link'
import {
  useEffect, useId, useRef, useState,
  type InputHTMLAttributes, type KeyboardEvent, type ReactNode,
} from 'react'

// 1기 = 2018. 현재 년도 기준으로 최고 기수 자동 산출 (2027년 → 10기, 2028년 → 11기 ...)
export const GENERATION_OPTIONS = (() => {
  const maxGen = Math.max(1, new Date().getFullYear() - 2017)
  return Array.from({ length: maxGen }, (_, i) => {
    const gen = maxGen - i
    const year = 2017 + gen
    return { value: gen, label: `${year}년 - ${gen}기` }
  })
})()

const POLICIES = [
  { label: '개인정보 처리방침', href: '/policy/privacy-policy' },
  { label: '개인정보 수집 및 동의', href: '/policy/personal-info-consent' },
  { label: '마케팅 및 수신 동의', href: '/policy/marketing-consent' },
  { label: '초상권', href: '/policy/portrait-rights' },
]

export const LABEL_CLASS = 'text-xs tracking-wider text-fg-subtle'

export const PRIMARY_BUTTON =
  'inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white ' +
  'cursor-pointer transition-colors hover:bg-[#1749D6] disabled:cursor-not-allowed disabled:opacity-60 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

// ── 바탕 + 카드 ─────────────────────────────────────────────────
// 로고 워터마크는 카드가 아니라 화면 가운데에 붙는다. 폼이 화면보다 길어도
// 스크롤하는 동안 계속 화면 중앙에 있도록 sticky 로 둔다.
export function AuthShell({ children, size = 'form' }: { children: ReactNode; size?: 'form' | 'narrow' }) {
  return (
    <div className="relative min-h-screen overflow-clip">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/login_background.jpg)' }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
        <div className="sticky top-0 flex h-screen items-center justify-center">
          <Image
            src="/logo.png"
            alt=""
            width={570}
            height={592}
            className="h-auto w-[min(64vw,460px)] select-none opacity-[0.03]"
          />
        </div>
      </div>

      {/* 위쪽 여백은 고정된 상단 메뉴바보다 넓게 */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-24 pb-12 sm:px-[8.5vw]">
        <div
          className={`relative w-full rounded-[20px] border border-line bg-black/50 backdrop-blur-[29px] sm:rounded-3xl ${
            size === 'form' ? 'max-w-[1196px] py-8 sm:py-10' : 'max-w-[480px] px-6 py-10 sm:px-8'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ── 단계 표시 ───────────────────────────────────────────────────
// current 가 steps.length 이상이면 모든 단계를 끝난 것으로 그린다
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="가입 단계" className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && (
              <span aria-hidden="true" className={`h-px w-5 sm:w-10 ${i <= current ? 'bg-brand' : 'bg-line-strong'}`} />
            )}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                done
                  ? 'bg-brand text-white'
                  : active
                    ? 'border border-brand bg-brand/20 text-white'
                    : 'border border-line-strong text-fg-faint'
              }`}
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            {/* 좁은 화면에서는 지금 단계 이름만 */}
            <span
              className={`text-xs ${active ? 'font-medium text-white' : `hidden sm:inline ${done ? 'text-fg-subtle' : 'text-fg-faint'}`}`}
            >
              {done && <span className="sr-only">완료: </span>}
              {step}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// ── 입력 칸 ─────────────────────────────────────────────────────
export type FieldA11y = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

type Note = { tone: 'ok' | 'error'; text: string }

// 칸 이름을 입력칸과 연결하고, 오류·안내 문구를 aria-describedby 로 묶는다.
// 입력칸은 children(a11y) 로 받아서 이 속성들을 그대로 펼쳐 쓰면 된다.
export function Field({
  label, error, hint, note, children,
}: {
  label: string
  error?: string
  hint?: string
  note?: Note | null
  children: (a11y: FieldA11y) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const noteId = `${id}-note`
  const showHint = !!hint && !error
  const describedBy = [error && errorId, note && noteId, showHint && hintId].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASS}>{label}</label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {note && (
        <p id={noteId} className={`mt-0.5 text-xs ${note.tone === 'ok' ? 'text-status-live-text' : 'text-danger'}`}>
          {note.text}
        </p>
      )}
      {showHint && <p id={hintId} className="mt-0.5 text-xs text-fg-faint">{hint}</p>}
      {error && <p id={errorId} className="mt-0.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

const INPUT_BASE =
  'h-11 w-full min-w-0 rounded-lg border bg-surface-raised px-4 text-sm text-white outline-none cursor-text ' +
  'transition-[border-color,box-shadow] duration-150 placeholder:text-fg-faint'

function inputState(invalid: boolean, success: boolean) {
  if (invalid) return 'border-danger shadow-[0_0_8px_rgb(248_113_113/0.4)]'
  if (success) return 'border-status-live shadow-[0_0_8px_rgb(74_222_128/0.3)]'
  return 'border-line hover:border-line-strong focus:border-brand'
}

export function TextInput({
  success = false, className = '', ...rest
}: InputHTMLAttributes<HTMLInputElement> & { success?: boolean }) {
  const invalid = !!rest['aria-invalid']
  return <input {...rest} className={`${INPUT_BASE} ${inputState(invalid, success)} ${className}`} />
}

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <TextInput {...props} type={show ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
        aria-pressed={show}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-fg-faint transition-colors hover:text-fg-muted focus-visible:outline-2 focus-visible:outline-brand"
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

// 입력칸 옆의 작은 버튼 (중복 확인, 인증 코드 확인)
export function ActionBtn({
  onClick, disabled, loading, children, type = 'button',
}: {
  onClick?: () => void
  disabled: boolean
  loading: boolean
  children: ReactNode
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`h-11 shrink-0 whitespace-nowrap rounded-lg border px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        disabled
          ? 'cursor-not-allowed border-line bg-surface text-fg-faint'
          : `border-transparent bg-brand text-white hover:bg-[#1749D6] ${loading ? 'cursor-wait' : 'cursor-pointer'}`
      }`}
    >
      {loading ? '...' : children}
    </button>
  )
}

// ── 가입년도 드롭다운 ───────────────────────────────────────────
// 포커스는 버튼에 둔 채 aria-activedescendant 로 고른 항목을 알린다.
// ↑↓ 이동 · Home/End · Enter/Space 선택 · Esc 닫기
export function GenerationSelect({
  value, onChange, a11y,
}: { value: string; onChange: (v: string) => void; a11y: FieldA11y }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const listId = `${a11y.id}-list`
  const optionId = (i: number) => `${a11y.id}-opt-${i}`
  const selectedIndex = GENERATION_OPTIONS.findIndex((o) => String(o.value) === value)
  const selected = GENERATION_OPTIONS[selectedIndex]
  const invalid = !!a11y['aria-invalid']
  const last = GENERATION_OPTIONS.length - 1

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // 키보드로 옮긴 항목이 목록 밖에 있으면 보이게 스크롤
  useEffect(() => {
    if (!open || active < 0) return
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function openList() {
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function choose(i: number) {
    onChange(String(GENERATION_OPTIONS[i].value))
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openList()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(last, i + 1)); break
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break
      case 'Home': e.preventDefault(); setActive(0); break
      case 'End': e.preventDefault(); setActive(last); break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (active >= 0) choose(active)
        break
      case 'Escape': e.preventDefault(); setOpen(false); break
      case 'Tab': setOpen(false); break
    }
  }

  return (
    <div ref={ref} className={`relative ${open ? 'z-50' : ''}`}>
      <button
        type="button"
        role="combobox"
        {...a11y}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        // Space 는 keyup 때 click 이 한 번 더 일어나 방금 연 목록을 닫아 버린다
        onKeyUp={(e) => { if (e.key === ' ') e.preventDefault() }}
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-lg border bg-surface-raised px-4 text-left text-sm transition-[border-color,box-shadow] duration-150 outline-none ${
          invalid
            ? 'border-danger shadow-[0_0_8px_rgb(248_113_113/0.4)]'
            : open
              ? 'border-brand'
              : 'border-line hover:border-line-strong focus-visible:border-brand'
        } ${selected ? 'text-white' : 'text-fg-faint'}`}
      >
        <span>{selected ? selected.label : '선택해주세요'}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
          className={`shrink-0 text-fg-faint transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={a11y.id}
          className="absolute inset-x-0 top-[calc(100%+6px)] max-h-[260px] overflow-y-auto rounded-xl border border-line bg-panel/95 py-1 shadow-[0_8px_32px_rgb(0_0_0/0.5)] backdrop-blur-[16px]"
        >
          {GENERATION_OPTIONS.map((opt, i) => {
            const isSelected = i === selectedIndex
            const isActive = i === active
            return (
              <li
                key={opt.value}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                // 마우스로 눌러도 포커스는 버튼에 남긴다
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-4 py-2.5 text-sm transition-colors ${
                  isSelected ? 'bg-brand text-white' : isActive ? 'bg-brand/40 text-white' : 'text-fg-muted'
                }`}
              >
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── 정책 목록 + 동의 ────────────────────────────────────────────
export function PolicyList() {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <p id={id} className={LABEL_CLASS}>정책</p>
      <ul aria-labelledby={id} className="flex min-h-[120px] flex-col gap-2 rounded-xl border border-line bg-surface p-3">
        {POLICIES.map(({ label, href }) => (
          <li key={href}>
            <Link
              href={href}
              className="group inline-flex items-center gap-1.5 text-xs text-fg-subtle transition-colors hover:text-[#8DB0FF]"
            >
              <svg
                className="shrink-0 text-fg-faint transition-colors group-hover:text-[#8DB0FF]"
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// 진짜 체크박스를 화면에서만 숨기고, 그 바로 뒤의 상자가 peer-* 로 상태와 포커스를 따라 그린다
export function AgreeCheckbox({
  checked, onChange, error,
}: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="mt-1">
      <label className="flex w-fit cursor-pointer select-none items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand ${
            checked
              ? 'border-brand bg-brand'
              : error
                ? 'border-danger bg-surface-raised shadow-[0_0_8px_rgb(248_113_113/0.4)]'
                : 'border-line-strong bg-surface-raised'
          }`}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <polyline points="2 6 5 9 10 3" />
            </svg>
          )}
        </span>
        <span className="text-xs text-fg-subtle">위 정책을 모두 확인했습니다</span>
      </label>
      {error && <p id={errorId} className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}
