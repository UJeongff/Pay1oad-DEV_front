'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import ToastMessage, { useToast } from '@/app/components/ToastMessage'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { ARCHIVE_YEAR_MIN, ARCHIVE_YEAR_MAX } from '@/app/lib/archive'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

const FOLDER_PATH = 'M0 14.6875C0 6.57581 6.57582 0 14.6875 0H84.3267C89.2248 0 93.8005 2.44165 96.5274 6.51041L104.388 18.2396C111.206 28.4115 122.645 34.5156 134.89 34.5156H233.531H267.312C275.424 34.5156 282 41.0914 282 49.2031V210.398C282 218.51 275.424 225.086 267.312 225.086H14.6875C6.57581 225.086 0 218.51 0 210.398V14.6875Z'
// 같은 모양을 반 픽셀 안쪽으로 줄인 선. 바깥 모양에 그대로 그으면 가장자리에서 선 절반이 잘린다
const FOLDER_STROKE_PATH = 'M14.6875 0.367188H84.3271C89.1026 0.367339 93.564 2.74793 96.2227 6.71484L104.083 18.4443C110.969 28.718 122.523 34.8828 134.891 34.8828H267.312C275.221 34.8828 281.633 41.2942 281.633 49.2031V210.398C281.633 218.307 275.221 224.719 267.312 224.719H14.6875C6.77861 224.719 0.367188 218.307 0.367188 210.398V14.6875C0.367188 6.77861 6.77861 0.367188 14.6875 0.367188Z'

// 폴더 카드는 칸 폭에 맞춰 줄고 늘며(최대 220px), 안쪽 글자·여백은 카드 폭(cqw) 기준으로 같이 줄어든다.
// 220px 일 때 예전 고정값(여백 20px, 연도 30px)과 같다
const FOLDER_BOX = 'relative w-full max-w-[220px] mx-auto aspect-[282/226] [container-type:inline-size]'
const FOLDER_INNER_PADDING = '9cqw 9cqw 10cqw'
const FOLDER_LABEL_STYLE = { fontSize: 'clamp(11px, 5.9cqw, 13px)', lineHeight: 1.5, letterSpacing: '0.04em' }
const FOLDER_YEAR_STYLE = {
  fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
  fontSize: 'clamp(22px, 13.6cqw, 30px)',
  lineHeight: 1.5,
  letterSpacing: '-0.8px',
}

function validateYear(input: string, existing: number[]): string {
  if (input.length !== 4) return '4자리 연도를 입력해 주세요.'
  const n = Number(input)
  if (n < ARCHIVE_YEAR_MIN || n > ARCHIVE_YEAR_MAX) return `${ARCHIVE_YEAR_MIN}~${ARCHIVE_YEAR_MAX}년 사이로 입력해 주세요.`
  if (existing.includes(n)) return '이미 있는 연도입니다.'
  return ''
}

// 폴더 면: 진한 파랑을 꽉 채우던 것을 브랜드 블루를 옅게 깐 유리 면으로 바꿨다. 위가 조금 더 밝다.
// 테두리는 한쪽 대각선만 빛나던 것 대신 위에서 아래로 고르게 옅어지는 선. hover 때 한 겹 더 밝아진다
function FolderShape({ id, active = false }: { id: string; active?: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 282 226" fill="none" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="226" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C5AFF" stopOpacity={active ? 0.45 : 0.32} />
          <stop offset="1" stopColor="#1C5AFF" stopOpacity={active ? 0.16 : 0.06} />
        </linearGradient>
        <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="0" y2="226" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path d={FOLDER_PATH} fill={`url(#${id}-fill)`} />
      {/* hover 때 겹쳐지는 한 단계 밝은 면 */}
      <path d={FOLDER_PATH} fill="rgb(28 90 255 / 0.14)" className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <path d={FOLDER_STROKE_PATH} stroke={`url(#${id}-stroke)`} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function FolderIcon({ year, onNavigate, menuOpen, onMenuToggle, onEdit, onDelete, showMenu = false }: {
  year: number
  onNavigate: () => void
  menuOpen: boolean
  onMenuToggle: () => void
  onEdit: () => void
  onDelete: () => void
  showMenu?: boolean
}) {
  return (
    <div
      // 메뉴가 열린 폴더는 옆·아래 폴더보다 위에 그린다
      className={`${FOLDER_BOX} group cursor-pointer select-none transition-transform duration-300 hover:scale-[1.03] ${menuOpen ? 'z-20' : ''}`}
      onClick={onNavigate}
    >
      <FolderShape id={`folder-${year}`} />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: FOLDER_INNER_PADDING }}>
        <div className="relative flex justify-end" style={{ paddingTop: '11cqw' }}>
          {showMenu && (
            <button
              type="button"
              aria-label={`${year} 메뉴`}
              onClick={e => { e.stopPropagation(); onMenuToggle() }}
              style={{ width: '16px', height: '16px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11.8917" cy="4.42536" r="1.75886" fill="white"/>
                <circle cx="11.8917" cy="12.1112" r="1.75886" fill="white"/>
                <circle cx="11.8917" cy="19.7969" r="1.75886" fill="white"/>
              </svg>
            </button>
          )}

          {showMenu && menuOpen && (
            // 반투명이면 아래 연도 글자가 비쳐 보여서 불투명 면(panel)을 쓴다
            <div
              className="absolute right-0 top-6 z-50 flex min-w-[120px] flex-col gap-1 rounded-lg border border-line bg-panel p-1.5 shadow-pop"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                className="w-full rounded-md bg-surface px-3 py-2 text-left text-xs font-medium text-fg-muted transition-colors hover:bg-surface-raised hover:text-white"
                onClick={() => { onMenuToggle(); onEdit() }}
              >
                수정
              </button>
              <button
                type="button"
                className="w-full rounded-md bg-surface px-3 py-2 text-left text-xs font-medium text-danger transition-colors hover:bg-surface-raised"
                onClick={() => { onMenuToggle(); onDelete() }}
              >
                삭제
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {/* 예전 12px · 굵기 200 은 파란 면 위에서 거의 안 보여서 한 단계 키우고 굵게 */}
          <span className="font-medium text-fg-muted" style={FOLDER_LABEL_STYLE}>Archive</span>
          <p className="m-0 text-white" style={FOLDER_YEAR_STYLE}>{year}</p>
        </div>
      </div>
    </div>
  )
}

function AddFolderCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="연도 추가"
      className={`${FOLDER_BOX} block group cursor-pointer select-none transition-transform duration-300 hover:scale-[1.03]`}
      onClick={onClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 282 226" fill="none" className="absolute inset-0 w-full h-full">
        <path
          d={FOLDER_PATH}
          fill="rgba(255,255,255,0.02)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          strokeDasharray="10 6"
          className="group-hover:stroke-white/40 transition-all"
        />
        <text
          x="141"
          y="130"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize="48"
          fontWeight="100"
          className="group-hover:fill-white/55 transition-all"
        >
          +
        </text>
      </svg>
    </button>
  )
}

function EditableFolderCard({
  id,
  value,
  onChange,
  onConfirm,
  onCancel,
  error,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  error: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex w-full flex-col items-center">
      <div className={`${FOLDER_BOX} select-none`}>
        <FolderShape id={id} active />

        <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: FOLDER_INNER_PADDING }}>
          <div style={{ paddingTop: '11cqw' }} />
          <div className="flex flex-col">
            <span className="font-medium text-fg-muted" style={FOLDER_LABEL_STYLE}>Archive</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={value}
              aria-label="연도"
              onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter') onConfirm()
                if (e.key === 'Escape') onCancel()
              }}
              placeholder="연도"
              className="w-full bg-transparent text-white outline-none placeholder:text-fg-faint"
              style={{
                ...FOLDER_YEAR_STYLE,
                border: 'none',
                borderBottom: '1.5px solid rgba(255,255,255,0.5)',
                caretColor: '#fff',
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-center text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export default function ArchivePage() {
  const { user } = useAuthContext()
  const router = useRouter()
  const isAdmin = user?.role === 'ADMIN'
  const { toast, showToast, clearToast } = useToast()

  const [years, setYears] = useState<number[]>([])
  const [openMenuYear, setOpenMenuYear] = useState<number | null>(null)
  const [isAddingYear, setIsAddingYear] = useState(false)
  const [newYearInput, setNewYearInput] = useState('')
  const [yearError, setYearError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [editYearInput, setEditYearInput] = useState('')
  const [editYearError, setEditYearError] = useState('')

  const loadYears = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/v1/archive/years`, { cache: 'no-store', credentials: 'include' })
      if (!res.ok) {
        setYears([])
        return
      }
      const json = await res.json()
      const data = json?.data
      const list = Array.isArray(data) ? data : []
      // 최신 연도가 먼저
      setYears([...list].sort((a, b) => b - a))
    } catch {
      setYears([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadYears()
  }, [loadYears])

  useEffect(() => {
    const handler = () => setOpenMenuYear(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  async function handleYearConfirm() {
    const invalid = validateYear(newYearInput, years)
    if (invalid) {
      setYearError(invalid)
      return
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/v1/archive/years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: Number(newYearInput) }),
      })

      if (!res.ok) {
        setYearError('연도를 만들지 못했습니다.')
        return
      }

      await loadYears()
      router.push(`/archive/${newYearInput}`)
      setIsAddingYear(false)
      setNewYearInput('')
      setYearError('')
    } catch {
      setYearError('연도를 만들지 못했습니다.')
    }
  }

  function handleYearCancel() {
    setIsAddingYear(false)
    setNewYearInput('')
    setYearError('')
  }

  function handleEditStart(year: number) {
    setEditingYear(year)
    setEditYearInput(String(year))
    setEditYearError('')
  }

  function handleEditCancel() {
    setEditingYear(null)
    setEditYearInput('')
    setEditYearError('')
  }

  async function handleDeleteYear(year: number) {
    if (!window.confirm(`${year} 아카이브를 삭제하시겠습니까?`)) return
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/archive/years/${year}`, { method: 'DELETE' })
      if (res.ok) setYears(prev => prev.filter(y => y !== year))
      else showToast(`${year} 아카이브를 삭제하지 못했습니다.`)
    } catch {
      showToast(`${year} 아카이브를 삭제하지 못했습니다.`)
    }
  }

  async function handleEditConfirm() {
    // 자기 자신은 중복으로 치지 않는다
    const invalid = validateYear(editYearInput, years.filter(y => y !== editingYear))
    if (invalid) {
      setEditYearError(invalid)
      return
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/v1/archive/years/${editingYear}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: Number(editYearInput) }),
      })

      if (!res.ok) {
        setEditYearError('연도를 수정하지 못했습니다.')
        return
      }

      await loadYears()
      setEditingYear(null)
      setEditYearInput('')
      setEditYearError('')
    } catch {
      setEditYearError('연도를 수정하지 못했습니다.')
    }
  }

  return (
    <main className="relative min-h-screen select-none bg-background">
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
            ARCHIVE
          </h1>
        </div>

        <p className="relative z-10 text-fg-muted font-medium mb-3" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
          지난 활동들을 보관하는 공간입니다.
        </p>
        {/* 글을 쓰는 게시판용 경고문 대신, 보기만 하는 아카이브에 맞게 무엇이 들어 있는지 안내한다 */}
        <p className="relative z-10 text-fg-subtle text-sm leading-relaxed">
          해마다 블로그 글과 스터디·프로젝트 기록을 연도별 폴더에 모아 둡니다.
        </p>
      </section>

      <div
        className="w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 text-[13px] rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
      >
        {/* 현재 위치를 터미널 경로처럼 보여준다 (블로그의 ~/blog/write 와 같은 형식) */}
        <nav aria-label="현재 위치" className="font-mono tracking-[0.02em]">
          <span className="text-fg-faint">~/</span>
          <span aria-current="page" className="text-white">archive</span>
        </nav>
      </div>

      <section
        className="relative py-12 pb-32"
        style={{ background: 'rgba(0, 65, 239, 0.05)' }}
      >
        <div className="max-w-5xl mx-auto px-[5vw]">
          {loading ? (
            <p className="text-fg-subtle text-sm text-center py-12">연도를 불러오는 중...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {isAdmin && (
                <div className="flex justify-center">
                  {isAddingYear ? (
                    <EditableFolderCard
                      id="folder-new"
                      value={newYearInput}
                      onChange={v => { setNewYearInput(v); setYearError('') }}
                      onConfirm={handleYearConfirm}
                      onCancel={handleYearCancel}
                      error={yearError}
                    />
                  ) : (
                    <AddFolderCard onClick={() => setIsAddingYear(true)} />
                  )}
                </div>
              )}

              {years.map(year => (
                <div key={year} className="flex justify-center">
                  {editingYear === year ? (
                    <EditableFolderCard
                      id="folder-edit"
                      value={editYearInput}
                      onChange={v => { setEditYearInput(v); setEditYearError('') }}
                      onConfirm={handleEditConfirm}
                      onCancel={handleEditCancel}
                      error={editYearError}
                    />
                  ) : (
                    <FolderIcon
                      year={year}
                      onNavigate={() => router.push(`/archive/${year}`)}
                      menuOpen={openMenuYear === year}
                      onMenuToggle={() => setOpenMenuYear(openMenuYear === year ? null : year)}
                      onEdit={() => handleEditStart(year)}
                      onDelete={() => handleDeleteYear(year)}
                      showMenu={isAdmin}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <HomeFooter />

      {toast && <ToastMessage key={toast.id} toast={toast} onDone={clearToast} />}
    </main>
  )
}
