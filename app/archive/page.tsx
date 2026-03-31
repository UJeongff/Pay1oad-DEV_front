'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

function FolderIcon({ year, onNavigate, menuOpen, onMenuToggle, onEdit, showMenu = false }: {
  year: number
  onNavigate: () => void
  menuOpen: boolean
  onMenuToggle: () => void
  onEdit: () => void
  showMenu?: boolean
}) {
  const gradFillId = `fg-fill-${year}`
  const gradStrokeId = `fg-stroke-${year}`

  return (
    <div
      className="relative group cursor-pointer select-none transition-transform duration-300 hover:scale-[1.03] mx-auto"
      style={{ width: '220px', height: '175px' }}
      onClick={onNavigate}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="282" height="226" viewBox="0 0 282 226" fill="none"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id={gradFillId} x1="141" y1="-8.44531" x2="141" y2="225.086" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0041EF"/>
            <stop offset="1" stopColor="#02174E"/>
          </linearGradient>
          <linearGradient id={gradStrokeId} x1="267.312" y1="19.8281" x2="2.79213e-05" y2="243.813" gradientUnits="userSpaceOnUse">
            <stop/>
            <stop offset="0.5" stopColor="white"/>
            <stop offset="1"/>
          </linearGradient>
        </defs>
        <path d="M0 14.6875C0 6.57581 6.57582 0 14.6875 0H84.3267C89.2248 0 93.8005 2.44165 96.5274 6.51041L104.388 18.2396C111.206 28.4115 122.645 34.5156 134.89 34.5156H233.531H267.312C275.424 34.5156 282 41.0914 282 49.2031V210.398C282 218.51 275.424 225.086 267.312 225.086H14.6875C6.57581 225.086 0 218.51 0 210.398V14.6875Z" fill={`url(#${gradFillId})`}/>
        <path d="M14.6875 0.367188H84.3271C89.1026 0.367339 93.564 2.74793 96.2227 6.71484L104.083 18.4443C110.969 28.718 122.523 34.8828 134.891 34.8828H267.312C275.221 34.8828 281.633 41.2942 281.633 49.2031V210.398C281.633 218.307 275.221 224.719 267.312 224.719H14.6875C6.77861 224.719 0.367188 218.307 0.367188 210.398V14.6875C0.367188 6.77861 6.77861 0.367188 14.6875 0.367188Z" stroke={`url(#${gradStrokeId})`} strokeOpacity="0.5" strokeWidth="0.734375"/>
      </svg>

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '20px 20px 24px' }}>
        <div className="relative flex justify-end" style={{ paddingTop: '25px' }}>
          {showMenu && (
            <button
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
            <div
              className="absolute right-0 top-6 z-50 flex flex-col gap-1 p-1.5 rounded-lg min-w-[120px]"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-2 text-xs font-medium text-white rounded-md transition-colors"
                style={{ background: 'rgba(36,36,36,0.8)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(36,36,36,1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(36,36,36,0.8)')}
                onClick={() => { onMenuToggle(); onEdit() }}
              >
                Edit
              </button>
              <button
                className="w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors"
                style={{ background: 'rgba(36,36,36,0.8)', color: '#f87171' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(36,36,36,1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(36,36,36,0.8)')}
                onClick={() => onMenuToggle()}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span
            style={{
              color: '#FFF',
              fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
              fontSize: '12px',
              fontWeight: 200,
              lineHeight: '150%',
              letterSpacing: '-0.32px',
            }}
          >
            Archive
          </span>
          <p
            style={{
              color: '#FFF',
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              fontSize: '30px',
              fontWeight: 400,
              lineHeight: '150%',
              letterSpacing: '-0.8px',
              margin: 0,
            }}
          >
            {year}
          </p>
        </div>
      </div>
    </div>
  )
}

function AddFolderCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="relative group cursor-pointer select-none mx-auto transition-transform duration-300 hover:scale-[1.03]"
      onClick={onClick}
      style={{ width: '220px', height: '175px' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="282" height="226" viewBox="0 0 282 226" fill="none"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <path
          d="M0 14.6875C0 6.57581 6.57582 0 14.6875 0H84.3267C89.2248 0 93.8005 2.44165 96.5274 6.51041L104.388 18.2396C111.206 28.4115 122.645 34.5156 134.89 34.5156H233.531H267.312C275.424 34.5156 282 41.0914 282 49.2031V210.398C282 218.51 275.424 225.086 267.312 225.086H14.6875C6.57581 225.086 0 218.51 0 210.398V14.6875Z"
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
    </div>
  )
}

function EditableFolderCard({
  value,
  onChange,
  onConfirm,
  onCancel,
  error,
}: {
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        className="relative select-none mx-auto"
        style={{ width: '220px', height: '175px' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="282" height="226" viewBox="0 0 282 226" fill="none"
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="ef-fill" x1="141" y1="-8.44531" x2="141" y2="225.086" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0041EF" stopOpacity="0.6"/>
              <stop offset="1" stopColor="#02174E" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          <path
            d="M0 14.6875C0 6.57581 6.57582 0 14.6875 0H84.3267C89.2248 0 93.8005 2.44165 96.5274 6.51041L104.388 18.2396C111.206 28.4115 122.645 34.5156 134.89 34.5156H233.531H267.312C275.424 34.5156 282 41.0914 282 49.2031V210.398C282 218.51 275.424 225.086 267.312 225.086H14.6875C6.57581 225.086 0 218.51 0 210.398V14.6875Z"
            fill="url(#ef-fill)"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1.5"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: '20px 20px 24px' }}>
          <div style={{ paddingTop: '25px' }} />
          <div className="flex flex-col">
            <span style={{
              color: '#FFF',
              fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
              fontSize: '12px',
              fontWeight: 200,
              lineHeight: '150%',
              letterSpacing: '-0.32px',
            }}>
              Archive
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={value}
              onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => {
                if (e.key === 'Enter') onConfirm()
                if (e.key === 'Escape') onCancel()
              }}
              placeholder="Year"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1.5px solid rgba(255,255,255,0.5)',
                outline: 'none',
                color: '#FFF',
                fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                fontSize: '30px',
                fontWeight: 400,
                lineHeight: '150%',
                letterSpacing: '-0.8px',
                width: '100%',
                caretColor: '#fff',
              }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p style={{
          marginTop: '8px',
          color: '#f87171',
          fontSize: '12px',
          fontWeight: 500,
          textAlign: 'center',
        }}>
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
      setYears([...list].sort((a, b) => a - b))
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
    if (newYearInput.length !== 4) {
      setYearError('Please enter a 4-digit year.')
      return
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/v1/archive/years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: Number(newYearInput) }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        setYearError(error?.message ?? 'Failed to create archive year.')
        return
      }

      await loadYears()
      router.push(`/archive/${newYearInput}`)
      setIsAddingYear(false)
      setNewYearInput('')
      setYearError('')
    } catch {
      setYearError('Failed to create archive year.')
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

  async function handleEditConfirm() {
    if (editYearInput.length !== 4) {
      setEditYearError('Please enter a 4-digit year.')
      return
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/v1/archive/years/${editingYear}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: Number(editYearInput) }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        setEditYearError(error?.message ?? 'Failed to update archive year.')
        return
      }

      await loadYears()
      setEditingYear(null)
      setEditYearInput('')
      setEditYearError('')
    } catch {
      setEditYearError('Failed to update archive year.')
    }
  }

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>
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

        <p className="relative z-10 text-white/75 font-medium mb-3" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.05rem)' }}>
          지난 활동들을 보관하는 공간입니다.
        </p>
        <p className="relative z-10 text-white/40 text-sm leading-relaxed">
          * 타인에 대한 비방, 욕설, 저작권 침해 등 부적절한 내용을 포함한 게시물은<br />
          서비스 운영 원칙에 따라 사전 고지 없이 삭제될 수 있습니다. 
        </p>
      </section>

      <div
        className="w-full h-[49px] flex items-center pl-5 sm:pl-10 lg:pl-20 rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
      >
        <span className="text-white text-sm font-medium tracking-widest">Archive</span>
      </div>

      <section
        className="relative py-12 pb-32"
        style={{ background: 'rgba(0, 65, 239, 0.05)' }}
      >
        <div className="max-w-5xl mx-auto px-[5vw]">
          {loading ? (
            <p className="text-white/50 text-sm text-center py-12">Loading years...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-5">
              {years.map(year => (
                <div key={year} className="flex justify-center">
                  {editingYear === year ? (
                    <EditableFolderCard
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
                      showMenu={isAdmin}
                    />
                  )}
                </div>
              ))}

              {isAdmin && (
                <div className="flex justify-center">
                  {isAddingYear ? (
                    <EditableFolderCard
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
            </div>
          )}
        </div>
      </section>

      <HomeFooter />
    </main>
  )
}
