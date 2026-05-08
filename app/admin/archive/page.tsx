'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

function YearInput({
  value,
  onChange,
  onConfirm,
  onCancel,
  error,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  error: string
  placeholder?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          ref={ref}
          type="number"
          min={2000}
          max={2099}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onConfirm()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder={placeholder ?? '연도 입력 (예: 2026)'}
          style={{
            width: '180px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(28,90,255,0.5)',
            color: '#fff', outline: 'none',
          }}
        />
        <button
          onClick={onConfirm}
          style={{
            padding: '8px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
            background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
          }}
        >확인</button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 12px', borderRadius: '7px', fontSize: '12px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
          }}
        >취소</button>
      </div>
      {error && <p style={{ color: '#f87171', fontSize: '12px' }}>{error}</p>}
    </div>
  )
}

export default function AdminArchivePage() {
  const [years, setYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  const [isAdding, setIsAdding] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [newYearError, setNewYearError] = useState('')

  const [editingYear, setEditingYear] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState('')

  const [deletingYear, setDeletingYear] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/v1/archive/years`, { credentials: 'include', cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      const data = json?.data
      setYears(Array.isArray(data) ? [...data].sort((a, b) => b - a) : [])
    } catch {
      setYears([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    const y = Number(newYear)
    if (!newYear || y < 2000 || y > 2099) {
      setNewYearError('2000~2099 사이의 유효한 연도를 입력하세요.')
      return
    }
    if (years.includes(y)) {
      setNewYearError('이미 존재하는 연도입니다.')
      return
    }
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/archive/years`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: y }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setNewYearError(d?.message ?? '추가 실패')
        return
      }
      setIsAdding(false)
      setNewYear('')
      setNewYearError('')
      load()
    } catch {
      setNewYearError('네트워크 오류')
    }
  }

  async function handleEdit() {
    const y = Number(editValue)
    if (!editValue || y < 2000 || y > 2099) {
      setEditError('2000~2099 사이의 유효한 연도를 입력하세요.')
      return
    }
    if (y !== editingYear && years.includes(y)) {
      setEditError('이미 존재하는 연도입니다.')
      return
    }
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/archive/years/${editingYear}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: y }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setEditError(d?.message ?? '수정 실패')
        return
      }
      setEditingYear(null)
      setEditValue('')
      setEditError('')
      load()
    } catch {
      setEditError('네트워크 오류')
    }
  }

  async function handleDelete() {
    if (!deletingYear) return
    setDeleteLoading(true)
    try {
      await fetchWithAuth(`${API_URL}/v1/archive/years/${deletingYear}`, { method: 'DELETE' })
      setDeletingYear(null)
      load()
    } catch {} finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Archive 관리</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>연도별 아카이브 생성·수정·삭제</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => { setIsAdding(true); setNewYear(''); setNewYearError('') }}
            style={{
              padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >+ 연도 추가</button>
        )}
      </div>

      {isAdding && (
        <div style={{
          padding: '16px 20px', borderRadius: '10px', marginBottom: '16px',
          background: 'rgba(28,90,255,0.06)', border: '1px solid rgba(28,90,255,0.25)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '10px' }}>새 아카이브 연도</p>
          <YearInput
            value={newYear}
            onChange={v => { setNewYear(v); setNewYearError('') }}
            onConfirm={handleAdd}
            onCancel={() => { setIsAdding(false); setNewYear(''); setNewYearError('') }}
            error={newYearError}
          />
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', textAlign: 'center', padding: '60px 0' }}>불러오는 중...</p>
      ) : years.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>아카이브 연도가 없습니다.</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '6px' }}>위의 &quot;연도 추가&quot; 버튼을 눌러 시작하세요.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {years.map(year => (
            <div
              key={year}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                transition: 'border-color 0.15s',
              }}
            >
              {editingYear === year ? (
                <div style={{ flex: 1 }}>
                  <YearInput
                    value={editValue}
                    onChange={v => { setEditValue(v); setEditError('') }}
                    onConfirm={handleEdit}
                    onCancel={() => { setEditingYear(null); setEditValue(''); setEditError('') }}
                    error={editError}
                    placeholder={String(year)}
                  />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{
                      fontSize: '22px', fontWeight: 800, color: '#fff',
                      fontFamily: "'Archivo Black', sans-serif", letterSpacing: '-0.5px',
                    }}>{year}</span>
                    <a
                      href={`/archive/${year}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#7aa3ff', textDecoration: 'none', opacity: 0.8 }}
                    >
                      /archive/{year} ↗
                    </a>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setEditingYear(year); setEditValue(String(year)); setEditError('') }}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        background: 'rgba(28,90,255,0.15)', border: '1px solid rgba(28,90,255,0.3)',
                        color: '#7aa3ff', cursor: 'pointer',
                      }}
                    >수정</button>
                    <button
                      onClick={() => setDeletingYear(year)}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', cursor: 'pointer',
                      }}
                    >삭제</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {deletingYear !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.65)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div style={{
            background: '#0d1b35', borderRadius: '16px', padding: '28px',
            border: '1px solid rgba(255,255,255,0.1)', maxWidth: '380px', width: '100%',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              <strong style={{ color: '#fff' }}>{deletingYear}</strong> 아카이브를 삭제합니다.
              해당 연도의 모든 데이터가 삭제될 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingYear(null)} style={{
                padding: '8px 18px', borderRadius: '8px', fontSize: '13px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}>취소</button>
              <button onClick={handleDelete} disabled={deleteLoading} style={{
                padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(239,68,68,0.85)', border: 'none',
                color: '#fff', cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.6 : 1,
              }}>{deleteLoading ? '삭제 중...' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
