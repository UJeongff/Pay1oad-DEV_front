'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

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
  description: string
}

const STATUS_LABEL: Record<CtfEvent['status'], string> = {
  ongoing: '진행중',
  upcoming: '진행예정',
  ended: '진행 완료',
}

const STATUS_STYLE: Record<CtfEvent['status'], React.CSSProperties> = {
  ongoing: { background: 'rgba(0, 65, 239, 0.7)', color: '#ffffff', border: 'none' },
  upcoming: { background: 'rgba(148, 148, 148, 0.7)', color: '#ffffff', border: 'none' },
  ended: { background: 'rgba(60, 60, 60, 0.7)', color: '#aaaaaa', border: 'none' },
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="1.5" y1="6" x2="14.5" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function formatDateTimeKst(iso: string) {
  const date = new Date(iso)

  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const dateParts = dateFormatter.formatToParts(date)
  const year = dateParts.find(part => part.type === 'year')?.value ?? ''
  const month = dateParts.find(part => part.type === 'month')?.value ?? ''
  const day = dateParts.find(part => part.type === 'day')?.value ?? ''
  const time = timeFormatter.format(date)

  return {
    date: `${year}.${month}.${day}`,
    time: `${time} KST`,
  }
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

function CtfCard({
  event,
  onShortcutOpen,
  isLoggedIn,
  onLoginRedirect,
}: {
  event: CtfEvent
  onShortcutOpen: (id: number) => void
  isLoggedIn: boolean
  onLoginRedirect: () => void
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
      alert('CTF URL이 설정되지 않았습니다.')
      return
    }

    window.open(shortcutUrl, '_blank', 'noopener,noreferrer')
    onShortcutOpen(event.id)
  }

  const imgSrc = resolveCtfImageSrc(event.imageUrl)

  return (
    <div
      className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: event.status === 'ongoing' ? 1 : 0.5,
      }}
    >
      {/* Image */}
      <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
        <Image
          src={imgSrc}
          alt={event.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={imgSrc.startsWith('http')}
        />
        {/* Status badge */}
        <span
          className="absolute top-3 left-3 text-xs font-semibold tracking-wider px-3 py-1 rounded-sm"
          style={STATUS_STYLE[event.status]}
        >
          {STATUS_LABEL[event.status]}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-4">
        <h3
          className="text-white text-sm font-semibold leading-snug"
          style={{ wordBreak: 'keep-all', whiteSpace: 'pre-line' }}
        >
          {event.name}
        </h3>

        <div className="flex flex-col gap-3 mt-auto">
          <div className="grid grid-cols-2 gap-y-1.5">
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <CalendarIcon />
              <span>Start Date</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <CalendarIcon />
              <span>End Date</span>
            </div>
            <div className="text-white/70 text-xs pl-[18px] leading-relaxed">
              <div>{formatDateTimeKst(event.startAt).date}</div>
              <div className="text-white/45">{formatDateTimeKst(event.startAt).time}</div>
            </div>
            <div className="text-white/70 text-xs pl-[18px] leading-relaxed">
              <div>{formatDateTimeKst(event.endAt).date}</div>
              <div className="text-white/45">{formatDateTimeKst(event.endAt).time}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {event.status !== 'upcoming' ? (
              <div className="flex items-center gap-1 text-xs text-white/50 whitespace-nowrap">
                <PersonIcon />
                <span>참여인원</span>
                <span className="font-semibold" style={{ color: '#4d7cff' }}>{event.participantCount}명</span>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 shrink-0">
              {event.ctfdUrl && (
                <button
                  disabled={event.status !== 'ongoing'}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
                  style={
                    event.status !== 'ongoing'
                      ? { color: 'rgba(255,255,255,0.3)', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', cursor: 'not-allowed' }
                      : { color: '#ffffff', background: 'transparent', border: '1px solid rgba(255,255,255,0.35)' }
                  }
                  onMouseEnter={e => {
                    if (event.status === 'ongoing') {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (event.status === 'ongoing') {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
                    }
                  }}
                  onClick={handleShortcutOpen}
                >
                  바로가기
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M7.5 4L13 10L7.5 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 관리자 CTF 생성 모달
function CreateCtfModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CtfEventCreateForm>({
    name: '',
    startAt: '',
    endAt: '',
    ctfdUrl: '',
    description: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        description: form.description || null,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: '#0d1b35', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">CTF 이벤트 추가</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium">대회명 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="예) 2026 Pay1oad CTF"
              className="rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium">이미지 파일</label>
            <label
              className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <span
                className="text-xs font-medium px-3 py-1 rounded-md shrink-0"
                style={{ background: 'rgba(28,90,255,0.25)', color: '#7aa0ff', border: '1px solid rgba(28,90,255,0.4)' }}
              >
                파일 선택
              </span>
              <span className="text-sm truncate" style={{ color: imageFile ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>
                {imageFile ? imageFile.name : '선택된 파일 없음'}
              </span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-white/60 text-xs font-medium">시작일시 *</label>
              <input
                name="startAt"
                type="datetime-local"
                value={form.startAt}
                onChange={handleChange}
                required
                className="rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', colorScheme: 'dark' }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-white/60 text-xs font-medium">종료일시 *</label>
              <input
                name="endAt"
                type="datetime-local"
                value={form.endAt}
                onChange={handleChange}
                required
                className="rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium">CTFd URL *</label>
            <input
              name="ctfdUrl"
              value={form.ctfdUrl}
              onChange={handleChange}
              required
              placeholder="https://ctfd.pay1oad.com"
              className="rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white/60 text-xs font-medium">설명</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="대회 설명을 입력하세요"
              className="rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none resize-none focus:border-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-white/60 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#1C5AFF' }}
            >
              {loading ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CTFPage() {
  const { user } = useAuthContext()
  const router = useRouter()
  const [events, setEvents] = useState<CtfEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const wheelAccum = useRef(0)

  const perPage = 3
  const total = events.length
  const maxIndex = Math.max(0, total - perPage)

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

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex(i => Math.min(maxIndex, i + 1)), [maxIndex])

  const visible = events.slice(index, index + perPage)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    wheelAccum.current += e.deltaX
    if (wheelAccum.current > 80) { wheelAccum.current = 0; next() }
    else if (wheelAccum.current < -80) { wheelAccum.current = 0; prev() }
  }, [next, prev])

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

  const isAdmin = user?.role === 'ADMIN'

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>

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
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="mb-2 ml-1">
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

        <p className="relative z-10 text-white/75 font-medium mb-3" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
          동아리내의 대회 소식들을 공유하는 페이지입니다.
        </p>
        <p className="relative z-10 text-white/40 text-sm leading-relaxed">
          * 다양한 보안 및 개발 대회 소식을 실시간으로 공유하고 함께 도전하는 공간입니다.<br />
          팀원을 모집하거나 기출 문제를 나누며 함께 성장해 보세요!
        </p>
      </section>

      {/* Events Carousel */}
      <section className="pb-32">
        <div className="max-w-5xl mx-auto px-[5vw]">

          {/* 상단: 도트 인디케이터 + 관리자 추가 버튼 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              {maxIndex > 0 && Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === index ? '20px' : '6px',
                    height: '6px',
                    background: i === index ? '#1C5AFF' : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full transition-all"
                style={{ background: 'rgba(28,90,255,0.2)', border: '1px solid rgba(28,90,255,0.5)', color: '#4d7cff' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(28,90,255,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(28,90,255,0.2)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                CTF 추가
              </button>
            )}
          </div>
        </div>

        {/* Cards + side arrows */}
        <div className="relative max-w-5xl mx-auto px-[5vw]" onWheel={handleWheel}>
          <button
            onClick={prev}
            disabled={index === 0}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              background: 'rgba(4,13,31,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: index === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 4L7 10L12.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={next}
            disabled={index >= maxIndex}
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              background: 'rgba(4,13,31,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: index >= maxIndex ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
              cursor: index >= maxIndex ? 'not-allowed' : 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 4L13 10L7.5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <p className="text-white/30 text-sm">등록된 CTF 이벤트가 없습니다.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {visible.map(event => (
                <CtfCard
                  key={event.id}
                  event={event}
                  onShortcutOpen={handleShortcutOpen}
                  isLoggedIn={!!user}
                  onLoginRedirect={() => router.push('/login')}
                />
              ))}
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
    </main>
  )
}
