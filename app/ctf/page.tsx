'use client'

import { useState, useCallback, useRef, useEffect, useId, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import HomeFooter from '@/app/components/HomeFooter'
import ToastMessage, { useToast } from '@/app/components/ToastMessage'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

interface CtfEvent {
  id: number
  name: string
  imageUrl: string | null
  startAt: string
  endAt: string
  ctfdUrl: string
  isPublished: boolean
  isClickable: boolean
  description: string | null
  status: 'ongoing' | 'upcoming' | 'ended'
  participantCount: number
  joined: boolean
}

interface CtfEventCreateForm {
  name: string
  startAt: string
  endAt: string
  ctfdUrl: string
}

// 상태 표기: 홈 히어로의 ● ACTIVE / ● RECRUITING 처럼 색 점 + 같은 색 글자.
// 진행중은 ACTIVE 의 초록 + 퍼지는 펄스(live-dot), 진행예정은 RECRUITING 의 앰버, 종료는 회색
const STATUS: Record<CtfEvent['status'], { label: string; dotClass: string; textClass: string }> = {
  ongoing: {
    label: '진행중',
    dotClass: 'live-dot bg-status-live shadow-[0_0_8px_rgba(74,222,128,0.8)]',
    textClass: 'text-status-live-text',
  },
  upcoming: {
    label: '진행예정',
    dotClass: 'bg-status-soon shadow-[0_0_8px_rgba(251,191,36,0.8)]',
    textClass: 'text-status-soon-text',
  },
  ended: {
    label: '종료',
    dotClass: 'bg-fg-faint',
    textClass: 'text-fg-subtle',
  },
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

const kstPartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function kstParts(iso: string | number) {
  const parts = kstPartsFormatter.formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return { year: get('year'), month: get('month'), day: get('day'), time: `${get('hour')}:${get('minute')}` }
}

// 기간을 한 줄로: 2026.10.07 09:00 ~ 10.09 18:00 (KST)
// 같은 해면 끝 날짜의 연도를, 같은 날이면 끝 날짜 자체를 생략한다
function formatPeriodKst(startIso: string, endIso: string) {
  const s = kstParts(startIso)
  const e = kstParts(endIso)
  const start = `${s.year}.${s.month}.${s.day} ${s.time}`
  let end: string
  if (s.year !== e.year) end = `${e.year}.${e.month}.${e.day} ${e.time}`
  else if (s.month !== e.month || s.day !== e.day) end = `${e.month}.${e.day} ${e.time}`
  else end = e.time
  return `${start} ~ ${end}`
}

// 한국 날짜 기준으로 며칠 남았는지 (자정을 넘기면 하루). 오늘이면 0
function kstDayDiff(fromMs: number, toIso: string) {
  const a = kstParts(fromMs)
  const b = kstParts(toIso)
  const aDay = Date.UTC(+a.year, +a.month - 1, +a.day)
  const bDay = Date.UTC(+b.year, +b.month - 1, +b.day)
  return Math.round((bDay - aDay) / DAY)
}

// 진행중: 마감까지 남은 시간 / 진행예정: D-n (오늘 시작하면 시작 시각)
function remainingLabel(event: CtfEvent, now: number) {
  if (event.status === 'ongoing') {
    const left = new Date(event.endAt).getTime() - now
    if (left <= 0) return '곧 종료'
    const d = Math.floor(left / DAY)
    const h = Math.floor((left % DAY) / HOUR)
    const m = Math.max(1, Math.floor((left % HOUR) / MINUTE))
    if (d > 0) return h > 0 ? `${d}일 ${h}시간 남음` : `${d}일 남음`
    if (h > 0) return `${h}시간 ${m}분 남음`
    return `${m}분 남음`
  }
  if (event.status === 'upcoming') {
    const days = kstDayDiff(now, event.startAt)
    if (days <= 0) return `오늘 ${kstParts(event.startAt).time} 시작`
    return `D-${days}`
  }
  return null
}

function resolveCtfImageSrc(imageUrl: string | null) {
  if (!imageUrl) return '/ctf1.jpg'

  const trimmed = imageUrl.trim()
  if (!trimmed) return '/ctf1.jpg'

  if (trimmed.startsWith('/')) return trimmed

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed
    }
  } catch {
    return '/ctf1.jpg'
  }

  return '/ctf1.jpg'
}

function resolveCtfShortcutUrl(ctfdUrl: string) {
  const trimmed = ctfdUrl.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
  } catch {
    return null
  }
  return null
}

// 화면 폭에 맞춘 한 페이지 카드 수: 모바일 1 / sm 2 / lg 3 (카드 폭 클래스와 같은 분기점)
function subscribeViewport(onChange: () => void) {
  const queries = [window.matchMedia('(min-width: 640px)'), window.matchMedia('(min-width: 1024px)')]
  queries.forEach(q => q.addEventListener('change', onChange))
  return () => queries.forEach(q => q.removeEventListener('change', onChange))
}

function getPerPage() {
  if (window.matchMedia('(min-width: 1024px)').matches) return 3
  if (window.matchMedia('(min-width: 640px)').matches) return 2
  return 1
}

function usePerPage() {
  return useSyncExternalStore(subscribeViewport, getPerPage, () => 3)
}

// 남은 시간 표시가 흘러가도록 1분마다 현재 시각을 갱신한다
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE)
    return () => clearInterval(timer)
  }, [])
  return now
}

// 모달 공통 틀: 바깥 클릭·ESC 로 닫힌다
function Dialog({
  title,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${maxWidth} rounded-2xl p-6 flex flex-col gap-5 bg-panel border border-line shadow-[0_24px_64px_rgba(0,0,0,0.5)]`}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-white font-bold text-lg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-fg-faint hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function CtfCard({
  event,
  now,
  onShortcutOpen,
  isLoggedIn,
  onLoginRedirect,
  isAdmin,
  onDelete,
  onError,
}: {
  event: CtfEvent
  now: number
  onShortcutOpen: (id: number) => void
  isLoggedIn: boolean
  onLoginRedirect: () => void
  isAdmin: boolean
  onDelete: (event: CtfEvent) => void
  onError: (message: string) => void
}) {
  const handleShortcutOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()

    if (event.status !== 'ongoing') return

    if (!isLoggedIn) {
      onLoginRedirect()
      return
    }

    const shortcutUrl = resolveCtfShortcutUrl(event.ctfdUrl)
    if (!shortcutUrl) {
      onError('CTF 주소가 설정되지 않았습니다.')
      return
    }

    window.open(shortcutUrl, '_blank', 'noopener,noreferrer')
    onShortcutOpen(event.id)
  }

  const imgSrc = resolveCtfImageSrc(event.imageUrl)
  const status = STATUS[event.status]
  const remaining = remainingLabel(event, now)
  const isOngoing = event.status === 'ongoing'

  return (
    <div className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] rounded-xl overflow-hidden flex flex-col bg-surface border border-line">
      {/* Image: 기본 포스터(384×467)와 같은 4:5 */}
      <div className="relative w-full aspect-[4/5]">
        <Image
          src={imgSrc}
          alt={event.name}
          fill
          className={`object-cover ${event.status === 'ended' ? 'grayscale-[60%]' : ''}`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={imgSrc.startsWith('http')}
        />
        {/* 종료된 대회는 카드 전체가 아니라 이미지만 어둡게 해서 글자 대비는 그대로 둔다 */}
        {event.status === 'ended' && <div aria-hidden="true" className="absolute inset-0 bg-[#040d1f]/55" />}

        {/* 상태: ● 진행중 · 2일 3시간 남음 */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium bg-[#040d1f]/70 backdrop-blur-sm border border-line">
          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
          <span className={status.textClass}>{status.label}</span>
          {remaining && (
            <>
              <span aria-hidden="true" className="text-fg-faint">·</span>
              <span className="text-white">{remaining}</span>
            </>
          )}
        </span>

        {/* Admin delete button */}
        {isAdmin && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(event) }}
            aria-label="CTF 삭제"
            className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full transition-colors bg-black/55 hover:bg-danger/25 border border-danger/50 text-danger backdrop-blur-sm"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9.5h5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        <h3
          className="text-white text-lg font-bold leading-snug"
          style={{ wordBreak: 'keep-all', whiteSpace: 'pre-line' }}
        >
          {event.name}
        </h3>

        <div className="flex flex-col gap-3 mt-auto">
          <div className="flex items-center gap-1.5 text-[13px] text-fg-muted">
            <span className="text-fg-subtle"><CalendarIcon /></span>
            <span>{formatPeriodKst(event.startAt, event.endAt)}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
            {event.status !== 'upcoming' ? (
              <div className="flex items-center gap-1.5 text-[13px] text-fg-subtle whitespace-nowrap">
                <PersonIcon />
                <span>참여인원</span>
                <span className="font-semibold text-white">{event.participantCount}명</span>
              </div>
            ) : (
              <div />
            )}

            {event.ctfdUrl && (
              <button
                disabled={!isOngoing}
                className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap shrink-0 ${
                  isOngoing
                    ? 'text-white border-line-strong hover:bg-surface-raised hover:border-fg-subtle focus-visible:outline-none focus-visible:border-brand'
                    : 'text-fg-faint border-line cursor-not-allowed'
                }`}
                onClick={handleShortcutOpen}
              >
                바로가기
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const INPUT_CLASS =
  'rounded-lg px-3 py-2 text-sm text-white placeholder:text-fg-faint outline-none bg-surface-raised border border-line focus:border-brand transition-colors'

// 관리자 CTF 생성 모달
function CreateCtfModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CtfEventCreateForm>({
    name: '',
    startAt: '',
    endAt: '',
    ctfdUrl: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] ?? null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let imageUrl: string | null = null

      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        const uploadRes = await fetchWithAuth(`${API_URL}/v1/admin/ctf/events/images`, {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}))
          throw new Error(data?.message ?? '이미지 업로드 실패')
        }
        const uploadJson = await uploadRes.json()
        imageUrl = uploadJson.data
      }

      const body = {
        name: form.name,
        imageUrl,
        startAt: form.startAt ? form.startAt + ':00' : null,
        endAt: form.endAt ? form.endAt + ':00' : null,
        ctfdUrl: form.ctfdUrl,
        description: null,
      }

      const res = await fetchWithAuth(`${API_URL}/v1/admin/ctf/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.message ?? '생성 실패')
      }

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 중 오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog title="CTF 이벤트 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-fg-subtle text-xs font-medium">대회명 *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="예) 2026 Pay1oad CTF"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-fg-subtle text-xs font-medium">이미지 파일</label>
          <label className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer bg-surface-raised border border-line">
            <span className="text-xs font-medium px-3 py-1 rounded-md shrink-0 text-white bg-brand/25 border border-brand/50">
              파일 선택
            </span>
            <span className={`text-sm truncate ${imageFile ? 'text-fg-muted' : 'text-fg-faint'}`}>
              {imageFile ? imageFile.name : '선택된 파일 없음'}
            </span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-fg-subtle text-xs font-medium">시작일시 *</label>
            <input
              name="startAt"
              type="datetime-local"
              value={form.startAt}
              onChange={handleChange}
              required
              className={INPUT_CLASS}
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-fg-subtle text-xs font-medium">종료일시 *</label>
            <input
              name="endAt"
              type="datetime-local"
              value={form.endAt}
              onChange={handleChange}
              required
              className={INPUT_CLASS}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-fg-subtle text-xs font-medium">CTFd URL *</label>
          <input
            name="ctfdUrl"
            value={form.ctfdUrl}
            onChange={handleChange}
            required
            placeholder="https://ctfd.pay1oad.com"
            className={INPUT_CLASS}
          />
        </div>

        {error && <p className="text-danger text-xs">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm text-fg-subtle border border-line hover:text-white hover:bg-surface-raised transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-brand transition-opacity disabled:opacity-50"
          >
            {loading ? '생성 중...' : '생성'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

// 삭제 확인 모달 (브라우저 기본 confirm 대신)
function ConfirmDeleteModal({
  event,
  onCancel,
  onConfirm,
}: {
  event: CtfEvent
  onCancel: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <Dialog title="CTF 이벤트 삭제" onClose={onCancel} maxWidth="max-w-sm">
      <p className="text-sm text-fg-muted leading-relaxed" style={{ wordBreak: 'keep-all' }}>
        <span className="font-semibold text-white">{event.name}</span> 이벤트를 삭제할까요?
        <br />
        <span className="text-fg-subtle">삭제하면 되돌릴 수 없습니다.</span>
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm text-fg-subtle border border-line hover:text-white hover:bg-surface-raised transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-danger/20 border border-danger/60 hover:bg-danger/35 transition-colors disabled:opacity-50"
        >
          {loading ? '삭제 중...' : '삭제'}
        </button>
      </div>
    </Dialog>
  )
}

function ArrowIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M12.5 4L7 10L12.5 16' : 'M7.5 4L13 10L7.5 16'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const ARROW_CLASS =
  'flex items-center justify-center w-10 h-10 rounded-full transition-colors bg-[#040d1f]/70 backdrop-blur-md border border-line-strong text-fg-muted hover:text-white hover:border-fg-subtle disabled:text-fg-faint disabled:border-line disabled:cursor-not-allowed focus-visible:outline-none focus-visible:border-brand'

export default function CTFPage() {
  const { user } = useAuthContext()
  const router = useRouter()
  const now = useNow()
  const perPage = usePerPage()
  const [events, setEvents] = useState<CtfEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CtfEvent | null>(null)
  const { toast, showToast, clearToast } = useToast()
  const wheelAccum = useRef(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // 페이지 단위로 넘긴다. 화면 폭이 바뀌거나 삭제로 개수가 줄면 마지막 페이지 안으로 맞춘다
  const pageCount = Math.max(1, Math.ceil(events.length / perPage))
  const current = Math.min(page, pageCount - 1)
  const visible = events.slice(current * perPage, current * perPage + perPage)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/v1/ctf/events`, { credentials: 'include' })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEvents(json.data ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const prev = useCallback(() => setPage(Math.max(0, current - 1)), [current])
  const next = useCallback(() => setPage(Math.min(pageCount - 1, current + 1)), [current, pageCount])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    wheelAccum.current += e.deltaX
    if (wheelAccum.current > 80) { wheelAccum.current = 0; next() }
    else if (wheelAccum.current < -80) { wheelAccum.current = 0; prev() }
  }, [next, prev])

  // 모바일: 좌우로 밀어서 넘긴다 (세로 스크롤과 헷갈리지 않게 가로 이동이 더 클 때만)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0) next()
    else prev()
  }

  const handleShortcutOpen = useCallback((eventId: number) => {
    fetchWithAuth(`${API_URL}/v1/ctf/events/${eventId}/join`, { method: 'POST' })
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (!json) return
        const { joined, participantCount } = json.data
        setEvents(prev =>
          prev.map(e => e.id === eventId ? { ...e, joined, participantCount } : e)
        )
      })
      .catch(() => {})
  }, [])

  const handleDeleteEvent = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/ctf/events/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setEvents(prev => prev.filter(e => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setDeleteTarget(null)
      showToast('삭제에 실패했습니다.')
    }
  }, [deleteTarget, showToast])

  const isAdmin = user?.role === 'ADMIN'

  return (
    // 홈과 같은 흐름: 위는 네이비, 아래로 갈수록 회색 검정으로 서서히 바뀐다
    <main
      className="relative min-h-screen"
      style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #040d1f 50vh, #0F0F0F 100%)' }}
    >

      {/* Background */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '100vh',
          backgroundImage: 'url(/background.png)',
          backgroundSize: '130%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
        }}
      />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center pt-46 pb-25 px-6">
        <div className="relative z-10 flex flex-col items-start mb-5">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="mb-2 ml-1" aria-hidden="true">
            <path
              d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25"
              stroke="#1C5AFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
          <h1
            className="text-white font-black uppercase"
            style={{
              fontSize: 'clamp(3.5rem, 8vw, 6rem)',
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              letterSpacing: '0.04em',
            }}
          >
            CTF
          </h1>
        </div>

        <p className="relative z-10 text-fg-muted font-medium mb-3" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
          동아리내의 대회 소식들을 공유하는 페이지입니다.
        </p>
        <p className="relative z-10 text-fg-subtle text-sm leading-relaxed">
          * 다양한 보안 및 개발 대회 소식을 실시간으로 공유하고 함께 도전하는 공간입니다.<br />
          팀원을 모집하거나 기출 문제를 나누며 함께 성장해 보세요!
        </p>
      </section>

      {/* Events Carousel */}
      <section className="pb-32">
        <div className="max-w-5xl mx-auto px-[5vw]">

          {/* 상단: 페이지 점 (sm 이상) + 관리자 추가 버튼 */}
          <div className="flex items-center justify-between mb-8">
            <div className="hidden sm:flex gap-2">
              {pageCount > 1 && Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  aria-label={`${i + 1}페이지`}
                  aria-current={i === current ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-brand' : 'w-1.5 bg-line-strong hover:bg-fg-faint'}`}
                />
              ))}
            </div>
            <div className="sm:hidden" />

            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full transition-colors text-white bg-brand/20 border border-brand/50 hover:bg-brand/35"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                CTF 추가
              </button>
            )}
          </div>
        </div>

        {/* Cards + side arrows (sm 이상에서만 옆에 둔다) */}
        <div
          className="relative max-w-5xl mx-auto px-[5vw]"
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {pageCount > 1 && (
            <>
              <button
                onClick={prev}
                disabled={current === 0}
                aria-label="이전 대회"
                className={`hidden sm:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 ${ARROW_CLASS}`}
              >
                <ArrowIcon dir="left" />
              </button>
              <button
                onClick={next}
                disabled={current >= pageCount - 1}
                aria-label="다음 대회"
                className={`hidden sm:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 ${ARROW_CLASS}`}
              >
                <ArrowIcon dir="right" />
              </button>
            </>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-line-strong border-t-brand rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <p className="text-fg-subtle text-sm">등록된 CTF 이벤트가 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {visible.map(event => (
                <CtfCard
                  key={event.id}
                  event={event}
                  now={now}
                  onShortcutOpen={handleShortcutOpen}
                  isLoggedIn={!!user}
                  onLoginRedirect={() => router.push('/login?next=%2Fctf')}
                  isAdmin={isAdmin}
                  onDelete={setDeleteTarget}
                  onError={showToast}
                />
              ))}
            </div>
          )}

          {/* 모바일: 카드 아래에 ‹ 1 / 4 › */}
          {!loading && pageCount > 1 && (
            <div className="sm:hidden flex items-center justify-center gap-5 mt-6">
              <button onClick={prev} disabled={current === 0} aria-label="이전 대회" className={ARROW_CLASS}>
                <ArrowIcon dir="left" />
              </button>
              <span className="text-sm text-fg-subtle tabular-nums">
                <span className="text-white font-semibold">{current + 1}</span> / {pageCount}
              </span>
              <button onClick={next} disabled={current >= pageCount - 1} aria-label="다음 대회" className={ARROW_CLASS}>
                <ArrowIcon dir="right" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <HomeFooter />

      {/* 관리자 생성 모달 */}
      {showCreateModal && (
        <CreateCtfModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchEvents}
        />
      )}

      {/* 관리자 삭제 확인 */}
      {deleteTarget && (
        <ConfirmDeleteModal
          event={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteEvent}
        />
      )}

      {toast && <ToastMessage key={toast.id} toast={toast} onDone={clearToast} />}
    </main>
  )
}
