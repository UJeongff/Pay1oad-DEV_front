'use client'

// 관리자 콘솔 공통 부품 (터미널 콘솔 + 상세 패널).
// 8개 화면이 모달 · 버튼 · 입력칸 · 표 · 알림을 각자 복사해 쓰다가 버그까지 같이 복사됐던 걸 한곳에 모았다.
// 색은 globals.css 토큰만 쓴다: 글자 fg-muted/subtle/faint · brand · status-live/soon · danger · panel

import {
  useCallback, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

/** 상단 메뉴바 높이 · 하단 상태 줄 높이 (레이아웃과 패널 위치가 같이 쓴다) */
export const NAVBAR_H = 90
export const STATUSBAR_H = 30

// ─────────────────────────────────────────────────────────────
// 요청
// ─────────────────────────────────────────────────────────────

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; status?: number }

type ErrorBody = { message?: string; errors?: { field?: string; message?: string }[] | null } | null

/** 서버 오류 본문에서 사람이 읽을 문구를 고른다: 필드 오류 → message → 대체 문구 */
export function errorMessage(body: unknown, fallback: string): string {
  const b = body as ErrorBody
  const field = b?.errors?.find((e) => e?.message?.trim())?.message
  return field ?? b?.message ?? fallback
}

/**
 * 관리자 API 호출. 성공/실패를 항상 Result 로 돌려준다.
 * res.ok 를 확인하지 않아 실패가 성공처럼 보이던 문제, 네트워크 예외가 삼켜지던 문제를 여기서 한 번에 막는다.
 */
export async function adminFetch<T = unknown>(
  path: string,
  init: Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit } = {},
): Promise<Result<T>> {
  const { json, headers, ...rest } = init
  let res: Response
  try {
    res = await fetchWithAuth(`${API_URL}${path}`, {
      cache: 'no-store',
      ...rest,
      headers: json !== undefined ? { 'Content-Type': 'application/json', ...headers } : headers,
      ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    })
  } catch {
    return { ok: false, error: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' }
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    return { ok: false, status: res.status, error: errorMessage(body, `요청을 처리하지 못했습니다 (HTTP ${res.status})`) }
  }
  return { ok: true, data: (body?.data ?? body) as T }
}

/**
 * 화면 데이터 불러오기.
 * - 경로가 바뀌면 다시 불러오고, 늦게 온 이전 응답은 버린다 (필터를 빠르게 바꿀 때 덮어쓰기 방지)
 * - 다시 불러오는 동안에도 이전 데이터를 유지해 화면 전체가 "불러오는 중"으로 깜빡이지 않는다
 * - error 와 "데이터 없음"을 구분한다
 * path 가 null 이면 요청하지 않는다.
 */
export function useAdminQuery<T>(path: string | null) {
  const [tick, setTick] = useState(0)
  const key = path === null ? null : `${path}#${tick}`
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string }>({ key: null, data: null, error: '' })

  useEffect(() => {
    if (path === null || key === null) return
    let cancelled = false
    adminFetch<T>(path).then((r) => {
      if (cancelled) return
      setState((s) => (r.ok ? { key, data: r.data, error: '' } : { key, data: s.data, error: r.error }))
    })
    return () => { cancelled = true }
  }, [path, key])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  /** 저장 직후처럼 서버에 다시 묻지 않고 화면 데이터를 고칠 때 */
  const mutate = useCallback((fn: (d: T | null) => T | null) => setState((s) => ({ ...s, data: fn(s.data) })), [])

  return {
    data: state.data,
    error: state.error,
    loading: key !== null && state.key !== key,
    reload,
    mutate,
  }
}

/** 목록 응답: 배열이거나 Page({ content }) 이거나 */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const content = (data as { content?: unknown })?.content
  return Array.isArray(content) ? (content as T[]) : []
}

// ─────────────────────────────────────────────────────────────
// 날짜 — 서버는 시간대 없는 LocalDateTime(KST)을 준다. Date 로 바꾸지 않고 글자 그대로 자른다.
// ─────────────────────────────────────────────────────────────

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/

function kstIso(s: string): string {
  if (!HAS_ZONE.test(s)) return s
  // 시간대가 붙어 오면 KST 로 바꿔서 같은 형식으로 만든다
  const d = new Date(new Date(s).getTime() + 9 * 3600 * 1000)
  return d.toISOString().slice(0, 19)
}

/** 2026.03.02 */
export function formatDate(s?: string | null): string {
  if (!s) return '—'
  return kstIso(s).slice(0, 10).replace(/-/g, '.')
}

/** 2026.03.02 14:00 */
export function formatDateTime(s?: string | null): string {
  if (!s) return '—'
  const v = kstIso(s)
  return `${v.slice(0, 10).replace(/-/g, '.')} ${v.slice(11, 16)}`
}

/** datetime-local 입력값 (yyyy-MM-ddTHH:mm) */
export function toDatetimeLocal(s?: string | null): string {
  return s ? kstIso(s).slice(0, 16) : ''
}

/** "3일" · "5시간" · "방금" — 승인 대기처럼 얼마나 기다렸는지 */
export function since(s?: string | null): string {
  if (!s) return '—'
  const t = HAS_ZONE.test(s) ? new Date(s).getTime() : new Date(`${s}+09:00`).getTime()
  const min = Math.max(0, Math.floor((Date.now() - t) / 60000))
  if (min < 1) return '방금'
  if (min < 60) return `${min}분`
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간`
  return `${Math.floor(min / 60 / 24)}일`
}

// ─────────────────────────────────────────────────────────────
// 모양 조각
// ─────────────────────────────────────────────────────────────

export type Tone = 'live' | 'soon' | 'off' | 'danger' | 'brand'

const DOT: Record<Tone, string> = {
  live: 'bg-status-live shadow-[0_0_8px_var(--color-status-live)]',
  soon: 'bg-status-soon shadow-[0_0_8px_var(--color-status-soon)]',
  off: 'bg-white/35',
  danger: 'bg-danger shadow-[0_0_8px_var(--color-danger)]',
  brand: 'bg-brand-soft shadow-[0_0_8px_var(--color-brand-soft)]',
}

export const TONE_TEXT: Record<Tone, string> = {
  live: 'text-status-live-text',
  soon: 'text-status-soon-text',
  off: 'text-fg-subtle',
  danger: 'text-[#FCA5A5]',
  brand: 'text-brand-soft',
}

export function Dot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
  return <span aria-hidden="true" className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${DOT[tone]} ${pulse ? 'motion-safe:animate-pulse' : ''}`} />
}

/** ● 활동 처럼 점 + 같은 색 글자 */
export function StatusLabel({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-[7px] whitespace-nowrap text-[13px] ${TONE_TEXT[tone]}`}>
      <Dot tone={tone} />
      {children}
    </span>
  )
}

/** 터미널식 로딩 도형 (globals.css .term-spin) */
export function TermSpin({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`term-spin font-mono ${className}`} />
}

/** 화면 제목: 경로 · 제목 · 설명 · 오른쪽 동작 */
export function PageHeader({
  path, title, description, actions,
}: { path: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <p className="mb-1.5 font-mono text-xs tracking-[0.04em] text-fg-faint">
          ~/admin/<span className="text-white">{path}</span>
        </p>
        <h1 className="text-[26px] font-bold tracking-[-0.01em] text-white">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-fg-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 버튼
// ─────────────────────────────────────────────────────────────

type Variant = 'primary' | 'ghost' | 'danger' | 'dangerGhost' | 'dangerText' | 'success' | 'text'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-[#1749D6]',
  ghost: 'border border-line-strong text-fg-muted hover:border-fg-faint hover:text-white',
  danger: 'bg-danger text-[#1a0505] hover:bg-[#FB8B8B]',
  dangerGhost: 'border border-danger/40 text-[#FCA5A5] hover:bg-danger/10',
  success: 'bg-[#22C55E] text-[#03140a] hover:bg-[#34D372]',
  text: 'text-fg-subtle hover:text-white',
  dangerText: 'text-danger hover:text-[#FCA5A5]',
}

export function Button({
  variant = 'primary', size = 'md', loading = false, className = '', children, disabled, type = 'button', ref, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}) {
  const sizing = variant === 'text' || variant === 'dangerText' ? 'h-auto px-0 text-[13px]' : size === 'sm' ? 'h-8 px-3 text-xs' : 'h-[34px] px-3.5 text-[13px]'
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${sizing} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
      {loading && <TermSpin />}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// 탭 · 선택 버튼 · 스위치
// ─────────────────────────────────────────────────────────────

/** 목록 위 필터: 모노 글자 + 밑줄 (all 8 · active 5 …) */
export function FilterTabs<K extends string>({
  items, value, onChange, label,
}: { items: { key: K; label: string; count?: number }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="mb-3 flex gap-x-5 gap-y-1 overflow-x-auto border-b border-line font-mono text-xs [scrollbar-width:none]">
      {items.map((it) => {
        const on = it.key === value
        return (
          <button
            key={it.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.key)}
            className={`-mb-px shrink-0 cursor-pointer border-b-2 pb-2.5 transition-colors ${on ? 'border-brand text-white' : 'border-transparent text-fg-subtle hover:text-white'}`}
          >
            {it.label}
            {it.count !== undefined && <span className="ml-1.5 text-fg-faint">{it.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** 패널 안에서 하나를 고르는 버튼 묶음 (활동 상태 · 권한 · 공지 대상 …) */
export function Choice<K extends string>({
  options, value, onChange, label, disabled = false,
}: {
  options: { key: K; label: string; tone?: Tone }[]
  value: K
  onChange: (k: K) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o.key === value
        const toneOn = o.tone === 'live' ? 'border-status-live/70 bg-status-live/10 text-status-live-text'
          : o.tone === 'soon' ? 'border-status-soon/80 bg-status-soon/10 text-status-soon-text'
            : o.tone === 'danger' ? 'border-danger/70 bg-danger/10 text-[#FCA5A5]'
              : 'border-brand bg-brand/12 text-white'
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(o.key)}
            className={`inline-flex h-8 cursor-pointer items-center gap-[7px] rounded-lg border px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${on ? toneOn : 'border-line-strong text-fg-subtle hover:text-white'}`}
          >
            {o.tone && <Dot tone={o.tone} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({
  checked, onChange, label, disabled = false, busy = false,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${checked ? 'bg-brand' : 'bg-white/15'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left] ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// 입력칸 — 칸 이름 · 안내 · 오류를 aria 로 묶는다
// ─────────────────────────────────────────────────────────────

export type FieldA11y = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }

export function Field({
  label, hint, error, optional = false, children,
}: { label: string; hint?: ReactNode; error?: string; optional?: boolean; children: (a11y: FieldA11y) => ReactNode }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [error && errId, hint && hintId].filter(Boolean).join(' ')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs text-fg-subtle">
        {label}
        {optional && <span className="ml-1 text-fg-faint">(선택)</span>}
      </label>
      {children({ id, ...(error ? { 'aria-invalid': true as const } : {}), ...(describedBy ? { 'aria-describedby': describedBy } : {}) })}
      {hint && <p id={hintId} className="text-xs text-fg-faint">{hint}</p>}
      {error && <p id={errId} className="text-xs text-danger">{error}</p>}
    </div>
  )
}

const INPUT =
  'w-full min-w-0 rounded-lg border bg-surface-raised px-3 text-sm text-white outline-none transition-colors placeholder:text-fg-faint disabled:opacity-50 '

function inputTone(invalid: boolean) {
  return invalid ? 'border-danger' : 'border-line hover:border-line-strong focus:border-brand'
}

export function TextInput({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${INPUT} h-[38px] [color-scheme:dark] ${inputTone(!!rest['aria-invalid'])} ${className}`} />
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${INPUT} resize-y py-2.5 leading-relaxed ${inputTone(!!rest['aria-invalid'])} ${className}`} />
}

export function SelectInput({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${INPUT} h-[38px] cursor-pointer ${inputTone(!!rest['aria-invalid'])} ${className}`}>
      {children}
    </select>
  )
}

// ─────────────────────────────────────────────────────────────
// 표
// ─────────────────────────────────────────────────────────────

export function Table({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  )
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th scope="col" className={`whitespace-nowrap px-2.5 py-2 text-left font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-fg-faint ${className}`}>
      {children}
    </th>
  )
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-2.5 py-3 align-middle ${className}`}>{children}</td>
}

/**
 * 누르면 상세 패널이 열리는 줄. Enter/Space 로 열고 ↑↓ 로 옆 줄로 이동한다.
 */
export function SelectableRow({
  selected, onSelect, children, dim = false, label,
}: { selected: boolean; onSelect: () => void; children: ReactNode; dim?: boolean; label: string }) {
  function onKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLElement | null
      next?.focus()
    }
  }
  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      aria-label={label}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`cursor-pointer border-t border-white/[0.06] outline-none transition-colors focus-visible:bg-surface-raised ${dim ? 'opacity-45' : ''} ${selected ? 'bg-brand/12 shadow-[inset_2px_0_0_var(--color-brand)]' : 'hover:bg-surface'}`}
    >
      {children}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────
// 상태 화면: 불러오는 중 · 오류 · 비어 있음 — "없음"과 "오류"를 구분한다
// ─────────────────────────────────────────────────────────────

export function LoadingState({ command, rows = 4 }: { command: string; rows?: number }) {
  return (
    <div role="status" aria-label="불러오는 중" className="py-4">
      <div className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3.5">
            <span className="h-2.5 w-16 rounded bg-white/[0.08] motion-safe:animate-pulse" />
            <span className="h-2.5 w-24 rounded bg-white/[0.06] motion-safe:animate-pulse" />
            <span className="h-2.5 flex-1 rounded bg-white/[0.05] motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
      <p className="mt-5 font-mono text-xs text-fg-subtle">
        <span className="text-brand-soft">$</span> {command} <TermSpin className="text-status-soon-text" />
      </p>
    </div>
  )
}

export function ErrorState({ command, error, onRetry }: { command: string; error: string; onRetry: () => void }) {
  return (
    <div role="alert" className="py-4 font-mono text-[13px] leading-[1.9]">
      <div><span className="text-brand-soft">$</span> {command}</div>
      <div className="flex items-start gap-2 text-[#FCA5A5]"><span className="mt-[7px]"><Dot tone="danger" /></span><span className="font-sans">{error}</span></div>
      <div className="text-fg-faint"># 잠시 후 다시 시도하거나 운영진에게 알려주세요</div>
      <Button variant="ghost" size="sm" className="mt-3 font-sans" onClick={onRetry}>다시 불러오기</Button>
    </div>
  )
}

export function EmptyState({ command, text, action }: { command: string; text: string; action?: ReactNode }) {
  return (
    <div className="py-4 font-mono text-[13px] leading-[1.9]">
      <div><span className="text-brand-soft">$</span> {command}</div>
      <div className="font-sans text-fg-faint"># {text}</div>
      <div><span className="text-brand-soft">$</span> <span className="term-cursor bg-status-live-text" /></div>
      {action && <div className="mt-3 font-sans">{action}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 상세 패널 — 데스크톱은 오른쪽, 모바일은 아래에서 올라오는 시트
// ─────────────────────────────────────────────────────────────

/** 패널이 열렸을 때 본문이 패널 밑으로 들어가지 않게 오른쪽 여백을 준다 */
export function panelPad(open: boolean) {
  return open ? 'md:pr-[440px]' : ''
}

/** 바깥(배경)에서 누르고 바깥에서 뗐을 때만 닫는다 — 입력칸에서 드래그하다 바깥에서 떼도 닫히지 않게 */
function useBackdropClose(onClose: () => void, disabled: boolean) {
  const downOnBackdrop = useRef(false)
  return {
    onMouseDown: (e: React.MouseEvent) => { downOnBackdrop.current = e.target === e.currentTarget },
    onClick: (e: React.MouseEvent) => {
      if (!disabled && downOnBackdrop.current && e.target === e.currentTarget) onClose()
      downOnBackdrop.current = false
    },
  }
}

export function DetailPanel({
  open, onClose, path, label, children, footer, busy = false, notice,
}: {
  open: boolean
  onClose: () => void
  /** 패널 머리의 경로 (예: users/r3v3rs3r) */
  path: string
  /** 스크린리더용 패널 이름 */
  label: string
  children: ReactNode
  footer?: ReactNode
  /** 저장 중엔 Esc · 바깥 눌러 닫기를 막는다 */
  busy?: boolean
  /** 패널 머리 아래 한 줄 알림 (저장 결과 등) */
  notice?: { tone: Tone; text: string } | null
}) {
  const ref = useRef<HTMLElement>(null)
  const latest = useRef({ onClose, busy })
  useEffect(() => { latest.current = { onClose, busy } })

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Escape' || latest.current.busy) return
      // 확인 창이 떠 있으면 그쪽이 먼저 닫힌다
      if (document.querySelector('[data-admin-dialog]')) return
      if (e.target instanceof HTMLSelectElement) return
      latest.current.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (prev && document.contains(prev)) prev.focus()
    }
  }, [open])

  const backdrop = useBackdropClose(onClose, busy)
  if (!open) return null

  return (
    <>
      {/* 모바일에서만 뒤를 어둡게 */}
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/60 md:hidden" {...backdrop} />
      <aside
        ref={ref}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-[20px] border-t border-line bg-panel shadow-[0_-20px_40px_rgb(0_0_0/0.5)] outline-none md:inset-x-auto md:right-0 md:top-[90px] md:bottom-[30px] md:z-30 md:max-h-none md:w-[440px] md:rounded-none md:border-t-0 md:border-l md:shadow-[-24px_0_48px_rgb(0_0_0/0.35)]"
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/25 md:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5 md:px-[22px]">
          <span className="min-w-0 truncate font-mono text-xs text-fg-faint">
            ~/admin/<span className="text-white">{path}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="패널 닫기"
            className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 font-mono text-xs text-fg-faint transition-colors hover:text-white disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-brand"
          >
            esc ✕
          </button>
        </div>
        {notice && (
          <p role="status" className={`flex shrink-0 items-start gap-2 border-b border-line px-5 py-2.5 text-[13px] md:px-[22px] ${TONE_TEXT[notice.tone]}`}>
            <span className="mt-[6px]"><Dot tone={notice.tone} /></span>
            <span>{notice.text}</span>
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-[22px]">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-5 py-3.5 md:px-[22px]">{footer}</div>}
      </aside>
    </>
  )
}

/** 패널 위쪽 정보 상자 (email · dept · id …) */
export function InfoGrid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="mb-6 grid grid-cols-[72px_minmax(0,1fr)] gap-y-2 rounded-xl border border-line bg-[rgb(2_6_18/0.5)] px-4 py-3.5 font-mono text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-fg-faint">{k}</dt>
          <dd className="break-all text-fg-muted">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─────────────────────────────────────────────────────────────
// 확인 창 — 되돌릴 수 없는 동작에만
// ─────────────────────────────────────────────────────────────

export function ConfirmDialog({
  open, title, children, confirmLabel = '확인', tone = 'danger', busy = false, error, onConfirm, onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  busy?: boolean
  error?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const latest = useRef({ onClose, busy })
  useEffect(() => { latest.current = { onClose, busy } })
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && !latest.current.busy) { e.stopPropagation(); latest.current.onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (prev && document.contains(prev)) prev.focus()
    }
  }, [open])

  const backdrop = useBackdropClose(onClose, busy)
  if (!open) return null

  return (
    <div data-admin-dialog className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[rgb(2_7_19/0.8)] p-4" {...backdrop}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="my-auto w-full max-w-[440px] rounded-[14px] border border-line bg-panel px-[22px] py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-bold text-white">{title}</h2>
          <span className="font-mono text-xs text-fg-faint">esc</span>
        </div>
        <div className="mb-4 text-[13px] leading-relaxed text-fg-subtle">{children}</div>
        {error && <p role="alert" className="mb-3 text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" onClick={onClose} disabled={busy}>취소</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 알림 — 연속으로 떠도 새 알림이 일찍 사라지지 않게 타이머를 하나만 둔다
// ─────────────────────────────────────────────────────────────

export type ToastState = { text: string; tone: Tone; key: number } | null

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((text: string, tone: Tone = 'live') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ text, tone, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3200)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return { toast, show }
}

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[46px] z-[80] flex justify-center px-4">
      {toast && (
        <p key={toast.key} className={`pointer-events-auto flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-[13px] shadow-[0_8px_32px_rgb(0_0_0/0.5)] ${toast.tone === 'danger' ? 'text-[#FCA5A5]' : 'text-white'}`}>
          <Dot tone={toast.tone} />
          {toast.text}
        </p>
      )}
    </div>
  )
}
