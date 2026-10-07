'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

interface Notification {
  id: number
  type: string
  message: string
  contentId: number | null
  referenceId: number | null
  actorName: string
  isRead: boolean
  createdAt: string
}

type Tab = 'notice' | 'alert'
type IconKind = 'notice' | 'assignment' | 'grade' | 'mention' | 'comment' | 'member'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

const TAB_LABEL: Record<Tab, string> = { notice: '공지', alert: '알림' }

// 종류 이름과 아이콘. 초대·참여·내보냄·탈퇴는 모두 멤버 변동이라 하나로 묶는다
const TYPE_META: Record<string, { label: string; icon: IconKind }> = {
  NOTICE_CREATED: { label: '공지', icon: 'notice' },
  MENTION: { label: '언급', icon: 'mention' },
  ASSIGNMENT_CREATED: { label: '과제', icon: 'assignment' },
  ASSIGNMENT_GRADED: { label: '평가', icon: 'grade' },
  COMMENT_CREATED: { label: '댓글', icon: 'comment' },
  MEMBER_INVITED: { label: '멤버', icon: 'member' },
  MEMBER_REMOVED: { label: '멤버', icon: 'member' },
  MEMBER_LEFT: { label: '멤버', icon: 'member' },
  LEADER_DELEGATED: { label: '리더', icon: 'member' },
}

function typeMeta(type: string) {
  return TYPE_META[type] ?? { label: '알림', icon: 'notice' as IconKind }
}

function TypeIcon({ kind }: { kind: IconKind }) {
  const common = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {kind === 'notice' && <><path d="M4 10v4h3l5 4V6L7 10H4z" {...common} /><path d="M16 9a3.5 3.5 0 0 1 0 6" {...common} /></>}
      {kind === 'assignment' && <><path d="M9 4h6v3H9z" {...common} /><path d="M7 5.5H5.5v15h13v-15H17" {...common} /><path d="M9 12h6M9 16h4" {...common} /></>}
      {kind === 'grade' && <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M8.5 12.5l2.5 2.5 4.5-5" {...common} /></>}
      {kind === 'mention' && <><circle cx="12" cy="12" r="3.5" {...common} /><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.4 6.8" {...common} /></>}
      {kind === 'comment' && <path d="M4.5 5.5h15v10.5H10l-5.5 4z" {...common} />}
      {kind === 'member' && <><circle cx="12" cy="8.5" r="3.5" {...common} /><path d="M5 19.5c1.4-3.2 4-4.5 7-4.5s5.6 1.3 7 4.5" {...common} /></>}
    </svg>
  )
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

// 화면에 보이는 포커스 가능한 요소들 (문서 순서)
function focusables(root: ParentNode) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
}

function fullDate(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// 방금 · N분 전 · N시간 전 · 어제 · N일 전 · 그 이전은 날짜
function relativeTime(iso: string, now: number) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const min = Math.floor((now - t) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  const day = Math.floor(hour / 24)
  if (day === 1) return '어제'
  if (day < 7) return `${day}일 전`
  return fullDate(iso).slice(0, 10)
}

function getNotificationHref(notification: Notification) {
  if (notification.type === 'MENTION' && notification.contentId) {
    return `/blog/${notification.contentId}`
  }

  if (notification.type === 'NOTICE_CREATED' && notification.contentId != null && notification.referenceId != null) {
    return `/content/${notification.contentId}/notices/${notification.referenceId}`
  }

  if (notification.type === 'ASSIGNMENT_CREATED' && notification.contentId != null && notification.referenceId != null) {
    return `/content/${notification.contentId}/assignments/${notification.referenceId}`
  }

  if (notification.type === 'ASSIGNMENT_GRADED' && notification.contentId != null && notification.referenceId != null) {
    return `/content/${notification.contentId}/assignments/${notification.referenceId}`
  }

  if (notification.type === 'COMMENT_CREATED' && notification.contentId != null && notification.referenceId != null) {
    return `/content/${notification.contentId}/docs/${notification.referenceId}`
  }

  if (notification.type === 'MEMBER_INVITED' && notification.contentId) {
    return `/content/${notification.contentId}`
  }

  if (
    (notification.type === 'MEMBER_REMOVED' ||
      notification.type === 'MEMBER_LEFT' ||
      notification.type === 'LEADER_DELEGATED') &&
    notification.contentId
  ) {
    return `/content/${notification.contentId}`
  }

  return null
}

function NotificationItem({ n, now, onRead, onClose }: { n: Notification; now: number; onRead: () => void; onClose: () => void }) {
  const router = useRouter()
  const href = getNotificationHref(n)
  const meta = typeMeta(n.type)

  const handleClick = () => {
    onRead()
    if (!href) return

    router.push(href)
    onClose()

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (window.location.pathname !== href) {
          window.location.assign(href)
        }
      }, 120)
    }
  }

  return (
    // 목록에는 안 읽은 알림만 남는다(누르면 읽음 처리되고 빠진다). 오른쪽 위 브랜드 점이 "새 알림" 표시
    <button
      type="button"
      onClick={handleClick}
      className="relative flex w-full gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted">
        <TypeIcon kind={meta.icon} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 pr-3">
        <span className="line-clamp-2 break-keep text-sm leading-snug text-white">{n.message}</span>
        <span className="text-xs text-fg-subtle">
          {meta.label}
          <span aria-hidden="true" className="mx-1.5 text-fg-faint">·</span>
          {n.actorName}
          <span aria-hidden="true" className="mx-1.5 text-fg-faint">·</span>
          <time dateTime={n.createdAt} title={fullDate(n.createdAt)}>{relativeTime(n.createdAt, now)}</time>
        </span>
      </span>
      <span aria-hidden="true" className="absolute right-3 top-4 h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px_#1C5AFF]" />
    </button>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('notice')
  const [all, setAll] = useState<Notification[]>([])
  const [now, setNow] = useState(() => Date.now())

  const bellRef = useRef<HTMLDivElement>(null)
  const bellButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // createPortal은 클라이언트에서만 가능하다. SSR에서는 false, 하이드레이션 후 true.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  const fetchNotifications = useCallback(() => {
    fetchWithAuth(`${API_URL}/v1/notifications`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const list: Notification[] = data.data ?? data.content ?? data
        // 읽은 알림은 목록에 남기지 않는다 — 회색으로 쌓여 있으면 새 알림이 묻힌다
        if (Array.isArray(list)) setAll(list.filter((n) => !n.isRead))
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // 열 때마다 목록을 새로 받는다 ("N분 전" 기준 시각은 종을 누를 때 맞춘다)
  useEffect(() => { if (open) fetchNotifications() }, [open, fetchNotifications])

  // 실시간 알림(SSE). 네트워크가 잠깐 끊기면 브라우저가 스스로 다시 붙고,
  // 서버가 연결을 닫아 완전히 끊긴 경우(CLOSED)에만 2초 → 4초 → … 최대 60초 간격으로 직접 다시 연결한다.
  // 다시 붙으면 끊긴 사이에 온 알림을 놓치지 않도록 목록을 한 번 새로 받는다
  useEffect(() => {
    let es: EventSource | null = null
    let retry = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const connect = () => {
      es = new EventSource(`${API_URL}/v1/notifications/stream`, { withCredentials: true })
      es.addEventListener('open', () => {
        if (retry > 0) fetchNotifications()
        retry = 0
      })
      es.addEventListener('notification', (e) => {
        try {
          const newNotif: Notification = JSON.parse((e as MessageEvent).data)
          if (newNotif.isRead) return
          setAll((prev) => prev.some((n) => n.id === newNotif.id) ? prev : [newNotif, ...prev])
        } catch {}
      })
      es.onerror = () => {
        if (stopped || es?.readyState !== EventSource.CLOSED) return
        es.close()
        const delay = Math.min(60000, 2000 * 2 ** retry)
        retry += 1
        timer = setTimeout(connect, delay)
      }
    }

    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      es?.close()
    }
  }, [fetchNotifications])

  // 바깥을 누르면 닫는다
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        bellRef.current && !bellRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Esc 로 닫고 포커스를 종 버튼으로 돌려준다
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      bellButtonRef.current?.focus()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // 열리면 포커스를 선택된 탭으로 옮긴다 (팝업은 body 끝에 붙어서 Tab 만으로는 들어오지 못한다)
  useEffect(() => {
    if (!open || !mounted) return
    const id = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, mounted])

  // 팝업 안에서는 Tab 으로 차례로 돌고, 끝을 넘어가면 닫는다.
  // 마지막 다음 Tab → 종 다음 요소로, 처음에서 Shift+Tab → 종으로 (팝업이 종 바로 뒤에 있는 것처럼)
  function handlePanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !panelRef.current) return
    const inside = focusables(panelRef.current)
    if (inside.length === 0) return
    const first = inside[0]
    const last = inside[inside.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      setOpen(false)
      bellButtonRef.current?.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      setOpen(false)
      const page = focusables(document).filter((el) => !panelRef.current?.contains(el))
      const bell = bellButtonRef.current
      const next = bell ? page[page.indexOf(bell) + 1] : undefined
      ;(next ?? bell)?.focus()
    }
  }

  const notices = all.filter((n) => n.type === 'NOTICE_CREATED')
  const alerts = all.filter((n) => n.type !== 'NOTICE_CREATED')
  const unread = all.length
  const list = tab === 'notice' ? notices : alerts
  const counts: Record<Tab, number> = { notice: notices.length, alert: alerts.length }

  function markAsRead(id: number) {
    setAll((prev) => prev.filter((n) => n.id !== id))
    fetchWithAuth(`${API_URL}/v1/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {})
  }

  // 공지·알림 탭 구분 없이 전부 읽음. 실패하면 서버 목록으로 되돌린다
  function markAllAsRead() {
    setAll([])
    fetchWithAuth(`${API_URL}/v1/notifications/read-all`, { method: 'PATCH' })
      .then((res) => { if (!res.ok) fetchNotifications() })
      .catch(() => fetchNotifications())
  }

  return (
    <div ref={bellRef} className="relative">
      <button
        ref={bellButtonRef}
        type="button"
        onClick={() => { setNow(Date.now()); setOpen((o) => !o) }}
        className="relative flex items-center justify-center w-8 h-8 rounded-full text-[#EFEFEF] hover:bg-white/10 transition-colors"
        aria-label={unread > 0 ? `알림, 읽지 않음 ${unread}개` : '알림'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 25 25" fill="none" aria-hidden="true">
          <path d="M5.8335 18.9585V10.6252C5.8335 8.85705 6.53588 7.16136 7.78612 5.91112C9.03636 4.66088 10.7321 3.9585 12.5002 3.9585C14.2683 3.9585 15.964 4.66088 17.2142 5.91112C18.4645 7.16136 19.1668 8.85705 19.1668 10.6252V18.9585M3.3335 18.9585H21.6668M15.0002 18.9585V19.7918C15.0002 20.4549 14.7368 21.0908 14.2679 21.5596C13.7991 22.0284 13.1632 22.2918 12.5002 22.2918C11.8371 22.2918 11.2012 22.0284 10.7324 21.5596C10.2636 21.0908 10.0002 20.4549 10.0002 19.7918V18.9585" stroke="currentColor" strokeWidth="1.66667" />
        </svg>
        {/* 안 읽은 개수 배지. 10개 이상은 9+. 내비 바 바탕색 테두리로 종 선과 떨어져 보이게 한다.
            개수는 버튼 이름(aria-label)으로 읽어 주므로 배지는 스크린리더에서 숨긴다 */}
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute left-[17px] top-px h-4 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-bold leading-4 tabular-nums text-white shadow-[0_0_0_2px_var(--background)]"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {mounted && open && createPortal(
        // 폭 400px(좁은 화면에선 양옆 16px 을 남기고 줄어듦), 안쪽 여백 16px 로 통일.
        // 뒤가 비치지 않게 불투명 panel + 얇은 테두리 + 떠 있는 면 그림자
        <div
          ref={panelRef}
          role="dialog"
          aria-label="알림"
          onKeyDown={handlePanelKeyDown}
          className="fixed right-4 top-[68px] z-[9999] flex w-[min(400px,calc(100vw-32px))] flex-col rounded-xl border border-line bg-panel shadow-pop sm:right-10"
        >
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <div role="tablist" aria-label="알림 종류" className="flex items-center gap-1 rounded-full border border-line p-0.5">
              {(['notice', 'alert'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    tab === t ? 'bg-white/10 text-white' : 'text-fg-subtle hover:text-white'
                  }`}
                >
                  {TAB_LABEL[t]}
                  {/* 원이 아니라 알약: 두 자리 숫자도 찌그러지지 않는다 */}
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white/[0.12] px-1 text-[11px] font-semibold tabular-nums text-fg-muted">
                    {counts[t]}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unread === 0}
              className="rounded text-xs font-medium text-fg-subtle transition-colors hover:text-white disabled:cursor-default disabled:text-fg-faint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              모두 읽음
            </button>
          </div>

          <div className="border-t border-line" />

          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-fg-subtle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm">{tab === 'notice' ? '새 공지가 없습니다.' : '새 알림이 없습니다.'}</p>
            </div>
          ) : (
            // 스크롤 손잡이는 패널 테두리에 붙지 않게 오른쪽 4px 안쪽에, 아래 끝은 흐려서 더 있음을 알린다
            <ul className="panel-scroll panel-fade my-1 mr-1 flex max-h-[min(420px,60vh)] flex-col gap-0.5 overflow-y-auto p-2 pr-1">
              {list.map((n) => (
                <li key={n.id}>
                  <NotificationItem
                    n={n}
                    now={now}
                    onRead={() => markAsRead(n.id)}
                    onClose={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
