'use client'

import { useState, useCallback, useEffect } from 'react'
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
}

type CtfFormData = {
  name: string
  startAt: string
  endAt: string
  ctfdUrl: string
  description: string
  isPublished: boolean
  isClickable: boolean
}

const EMPTY_FORM: CtfFormData = {
  name: '', startAt: '', endAt: '', ctfdUrl: '',
  description: '', isPublished: false, isClickable: false,
}

const STATUS_LABEL: Record<CtfEvent['status'], string> = {
  ongoing: '진행중', upcoming: '예정', ended: '종료',
}
const STATUS_COLOR: Record<CtfEvent['status'], string> = {
  ongoing: '#4ade80', upcoming: '#facc15', ended: '#94a3b8',
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul',
  })
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function CtfModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CtfEvent
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!initial
  const [form, setForm] = useState<CtfFormData>(
    initial
      ? {
          name: initial.name,
          startAt: toDatetimeLocal(initial.startAt),
          endAt: toDatetimeLocal(initial.endAt),
          ctfdUrl: initial.ctfdUrl,
          description: initial.description ?? '',
          isPublished: initial.isPublished,
          isClickable: initial.isClickable,
        }
      : EMPTY_FORM
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm(p => ({ ...p, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setForm(p => ({ ...p, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let imageUrl: string | null = initial?.imageUrl ?? null

      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
        const upRes = await fetchWithAuth(`${API_URL}/v1/admin/ctf/events/images`, { method: 'POST', body: fd })
        if (!upRes.ok) throw new Error('이미지 업로드 실패')
        const upJson = await upRes.json()
        imageUrl = upJson.data
      }

      const body = {
        name: form.name,
        imageUrl,
        startAt: form.startAt ? form.startAt + ':00' : null,
        endAt: form.endAt ? form.endAt + ':00' : null,
        ctfdUrl: form.ctfdUrl,
        description: form.description || null,
        isPublished: form.isPublished,
        isClickable: form.isClickable,
      }

      const url = isEdit
        ? `${API_URL}/v1/admin/ctf/events/${initial!.id}`
        : `${API_URL}/v1/admin/ctf/events`
      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.message ?? '저장 실패')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', outline: 'none', colorScheme: 'dark',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#0d1b35', borderRadius: '16px', padding: '28px',
        border: '1px solid rgba(255,255,255,0.1)', maxWidth: '520px', width: '100%',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>
            {isEdit ? 'CTF 이벤트 수정' : 'CTF 이벤트 추가'}
          </h2>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>대회명 *</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="예) 2026 Pay1oad CTF" style={inp} />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>이미지 파일</label>
            <label style={{ ...inp, display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '5px', flexShrink: 0,
                background: 'rgba(28,90,255,0.2)', color: '#7aa3ff', border: '1px solid rgba(28,90,255,0.35)',
              }}>파일 선택</span>
              <span style={{ fontSize: '12px', color: imageFile ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {imageFile ? imageFile.name : initial?.imageUrl ? '현재 이미지 유지' : '선택된 파일 없음'}
              </span>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>시작일시 *</label>
              <input name="startAt" type="datetime-local" value={form.startAt} onChange={handleChange} required style={inp} />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>종료일시 *</label>
              <input name="endAt" type="datetime-local" value={form.endAt} onChange={handleChange} required style={inp} />
            </div>
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>CTFd URL *</label>
            <input name="ctfdUrl" value={form.ctfdUrl} onChange={handleChange} required placeholder="https://ctfd.pay1oad.com" style={inp} />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>설명</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              placeholder="대회 설명을 입력하세요"
              style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {([['isPublished', '공개 (Published)'], ['isClickable', '바로가기 활성화']] as [keyof CtfFormData, string][]).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name={key}
                  checked={form[key] as boolean}
                  onChange={handleChange}
                  style={{ width: '15px', height: '15px', accentColor: '#1C5AFF' }}
                />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
              </label>
            ))}
          </div>

          {error && <p style={{ color: '#f87171', fontSize: '12px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 18px', borderRadius: '8px', fontSize: '13px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}>취소</button>
            <button type="submit" disabled={loading} style={{
              padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: 'rgba(28,90,255,0.85)', border: 'none',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>{loading ? '저장 중...' : isEdit ? '수정 완료' : '추가'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCtfPage() {
  const [events, setEvents] = useState<CtfEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CtfEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<CtfEvent | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/ctf/events`)
      const json = await res.json().catch(() => ({}))
      const data = json?.data
      setEvents(Array.isArray(data) ? data : (data?.content ?? []))
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete() {
    if (!deletingEvent) return
    setDeleteLoading(true)
    try {
      await fetchWithAuth(`${API_URL}/v1/admin/ctf/events/${deletingEvent.id}`, { method: 'DELETE' })
      setDeletingEvent(null)
      load()
    } catch {} finally {
      setDeleteLoading(false)
    }
  }

  async function handleToggle(event: CtfEvent, field: 'isPublished' | 'isClickable') {
    try {
      await fetchWithAuth(`${API_URL}/v1/admin/ctf/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !event[field] }),
      })
      load()
    } catch {}
  }

  const cell: React.CSSProperties = {
    padding: '13px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.75)',
    borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle',
  }
  const hCell: React.CSSProperties = {
    padding: '10px 14px', fontSize: '11px', fontWeight: 700,
    color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)',
  }

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>CTF 관리</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>전체 {events.length}개</p>
        </div>
        <button
          onClick={() => { setEditingEvent(null); setShowModal(true) }}
          style={{
            padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
          }}
        >+ 이벤트 추가</button>
      </div>

      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['대회명', '시작일', '종료일', '상태', '참여', '공개', '바로가기', ''].map(h => (
                <th key={h} style={hCell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ ...cell, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px' }}>불러오는 중...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={8} style={{ ...cell, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px' }}>CTF 이벤트가 없습니다.</td></tr>
            ) : events.map(ev => (
              <tr key={ev.id}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...cell, fontWeight: 600, maxWidth: '220px' }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                </td>
                <td style={{ ...cell, fontSize: '12px', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.5)' }}>{formatDt(ev.startAt)}</td>
                <td style={{ ...cell, fontSize: '12px', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.5)' }}>{formatDt(ev.endAt)}</td>
                <td style={cell}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                    color: STATUS_COLOR[ev.status],
                    background: `${STATUS_COLOR[ev.status]}18`,
                    border: `1px solid ${STATUS_COLOR[ev.status]}40`,
                  }}>{STATUS_LABEL[ev.status]}</span>
                </td>
                <td style={{ ...cell, color: '#4d7cff', fontWeight: 600 }}>{ev.participantCount}명</td>

                {/* Published toggle */}
                <td style={cell}>
                  <button
                    onClick={() => handleToggle(ev, 'isPublished')}
                    style={{
                      width: '38px', height: '20px', borderRadius: '10px', border: 'none',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                      background: ev.isPublished ? '#1C5AFF' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '2px',
                      left: ev.isPublished ? '20px' : '2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                    }} />
                  </button>
                </td>

                {/* Clickable toggle */}
                <td style={cell}>
                  <button
                    onClick={() => handleToggle(ev, 'isClickable')}
                    style={{
                      width: '38px', height: '20px', borderRadius: '10px', border: 'none',
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                      background: ev.isClickable ? '#1C5AFF' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '2px',
                      left: ev.isClickable ? '20px' : '2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                    }} />
                  </button>
                </td>

                <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => { setEditingEvent(ev); setShowModal(true) }}
                      style={{
                        padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(28,90,255,0.2)', border: '1px solid rgba(28,90,255,0.35)',
                        color: '#7aa3ff', cursor: 'pointer',
                      }}
                    >편집</button>
                    <button
                      onClick={() => setDeletingEvent(ev)}
                      style={{
                        padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', cursor: 'pointer',
                      }}
                    >삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CtfModal
          initial={editingEvent ?? undefined}
          onClose={() => { setShowModal(false); setEditingEvent(null) }}
          onSaved={load}
        />
      )}

      {deletingEvent && (
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
              <strong style={{ color: '#fff' }}>{deletingEvent.name}</strong> 이벤트를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingEvent(null)} style={{
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
