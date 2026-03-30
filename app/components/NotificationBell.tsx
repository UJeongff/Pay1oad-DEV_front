'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-10 gap-2">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="opacity-20">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <p className="text-white/30 text-xs">알림이 없습니다.</p>
  </div>
)

function typeToLabel(type: string) {
  if (type === 'NOTICE_CREATED') return '공지'
  if (type === 'MENTION') return '멘션'
  return type.replace(/_/g, ' ')
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function getNotificationHref(notification: Notification) {
  if (notification.type === 'MENTION' && notification.contentId) {
    return `/blog/${notification.contentId}`
  }

  if (notification.type === 'NOTICE_CREATED' && notification.contentId && notification.referenceId) {
    return `/content/${notification.contentId}/docs/${notification.referenceId}`
  }

  return null
}

function NotificationItem({ n, isRead, onRead, onClose }: { n: Notification; isRead: boolean; onRead: () => void; onClose: () => void }) {
  const router = useRouter()
  const href = getNotificationHref(n)

  const handleClick = () => {
    if (!isRead) onRead()
    if (href) {
      onClose()
      router.push(href)
    }
  }

  const isClickable = !isRead || !!href

  return (
    <div
      className="flex overflow-hidden flex-shrink-0"
      onClick={handleClick}
      style={{
        borderRadius: '8px',
        background: isRead ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 145, 147, 0.12)',
        cursor: isClickable ? 'pointer' : 'default',
        backdropFilter: 'blur(7.05px)',
        WebkitBackdropFilter: 'blur(7.05px)',
        transition: 'background 0.3s ease',
      }}
    >
      {/* Left accent border — only when unread */}
      {!isRead && (
        <div className="w-[3px] flex-shrink-0" style={{ background: 'rgba(255, 145, 147, 0.65)' }} />
      )}

      <div className="flex flex-col gap-2 px-4 py-3 flex-1 min-w-0">
        {/* Tag + icon + title */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-white/70 text-[10px] px-2 py-0.5 flex-shrink-0 whitespace-nowrap"
            style={{ border: '1px solid rgba(255,255,255,0.25)', borderRadius: '100px' }}
          >
            {typeToLabel(n.type)}
          </span>
          <span className="text-sm leading-none flex-shrink-0">📢</span>
          <p className="text-white text-sm font-semibold leading-snug">{n.message}</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <p className="text-white/40 text-xs">
            작성자 | {n.actorName}&nbsp;&nbsp;&nbsp;등록일 | {formatDate(n.createdAt)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'notice' | 'alert'>('notice')
  const [all, setAll] = useState<Notification[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const [mounted, setMounted] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const fetchNotifications = () => {
    fetchWithAuth(`${API_URL}/v1/notifications`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        const list: Notification[] = data.data ?? data.content ?? data
        if (Array.isArray(list)) setAll(list)
      })
      .catch(() => {})
  }

  useEffect(() => { fetchNotifications() }, [])

  useEffect(() => { if (open) fetchNotifications() }, [open])

  useEffect(() => {
    const es = new EventSource(`${API_URL}/v1/notifications/stream`, { withCredentials: true })
    es.addEventListener('notification', (e) => {
      try {
        const newNotif: Notification = JSON.parse(e.data)
        setAll((prev) => [newNotif, ...prev])
      } catch {}
    })
    es.onerror = () => { es.close() }
    return () => { es.close() }
  }, [])

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

  const notices = all.filter((n) => n.type === 'NOTICE_CREATED')
  const alerts = all.filter((n) => n.type !== 'NOTICE_CREATED')
  const unread = all.filter((n) => !n.isRead && !readIds.has(n.id)).length
  const list = tab === 'notice' ? notices : alerts

  // Reset index when tab changes
  useEffect(() => { setCurrentIndex(0) }, [tab])

  function markAsRead(id: number) {
    setReadIds((prev) => new Set(prev).add(id))
    fetchWithAuth(`${API_URL}/v1/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {})
  }

  const current = list[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < list.length - 1

  function goTo(idx: number) {
    setCurrentIndex(idx)
  }

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
        aria-label="알림"
      >
        <Image
          src={unread > 0 ? '/Noticification.svg' : '/Noticification_read.svg'}
          alt="알림"
          width={20}
          height={20}
        />
      </button>

      {mounted && open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] flex flex-col"
          style={{
            width: '504px',
            padding: '16px 30px',
            gap: '10px',
            borderRadius: '10px',
            background: 'rgba(8, 14, 28, 0.40)',
            boxShadow: '2px 2px 2px 0 rgba(0, 0, 0, 0.40)',
            backdropFilter: 'blur(7.75px)',
            WebkitBackdropFilter: 'blur(7.75px)',
            top: '68px',
            right: '40px',
          }}
        >
          {/* Header + Tabs */}
          <div className="flex items-center gap-3">
            <span className="text-white text-xs font-bold tracking-widest uppercase">Notifications</span>
            <div
              className="flex items-center gap-1"
              style={{
                border: '1px solid rgba(255,255,255,0.20)',
                borderRadius: '33px',
                padding: '2px',
              }}
            >
              <button
                onClick={() => setTab('notice')}
                className="transition-colors"
                style={{
                  display: 'flex',
                  padding: '1px 10px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: tab === 'notice' ? '33px' : '152px',
                  background: tab === 'notice' ? 'rgba(255, 255, 255, 0.10)' : 'transparent',
                  color: tab === 'notice' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                공지
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '0 4px',
                }}>
                  {notices.length}
                </span>
              </button>
              <button
                onClick={() => setTab('alert')}
                className="transition-colors"
                style={{
                  display: 'flex',
                  padding: '1px 10px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: tab === 'alert' ? '33px' : '152px',
                  background: tab === 'alert' ? 'rgba(255, 255, 255, 0.10)' : 'transparent',
                  color: tab === 'alert' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                멘션
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '0 4px',
                }}>
                  {alerts.length}
                </span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.10)', margin: '0 -2px' }} />

          {/* Carousel */}
          {list.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex items-center gap-2">
              {/* Left arrow */}
              <button
                onClick={() => hasPrev && goTo(currentIndex - 1)}
                className="flex-shrink-0 transition-colors"
                style={{ color: hasPrev ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.20)', cursor: hasPrev ? 'pointer' : 'default' }}
                aria-label="이전"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Item */}
              {current && (
                <div className="flex-1 min-w-0">
                  <NotificationItem
                    n={current}
                    isRead={current.isRead || readIds.has(current.id)}
                    onRead={() => markAsRead(current.id)}
                    onClose={() => setOpen(false)}
                  />
                </div>
              )}

              {/* Right arrow */}
              <button
                onClick={() => hasNext && goTo(currentIndex + 1)}
                className="flex-shrink-0 transition-colors"
                style={{ color: hasNext ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.20)', cursor: hasNext ? 'pointer' : 'default' }}
                aria-label="다음"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
