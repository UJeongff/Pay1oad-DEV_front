'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

type RecruitStatus = 'RECRUITING' | 'UPCOMING' | 'CLOSED'

interface Recruitment {
  id: number
  title: string
  applyUrl: string
  startAt: string
  endAt: string
  isActive: boolean
  status?: RecruitStatus
  generation?: number
  createdAt: string
}

type RecruitForm = {
  title: string
  applyUrl: string
  startAt: string
  endAt: string
  status: RecruitStatus
  generation: string
}

const EMPTY_FORM: RecruitForm = {
  title: '', applyUrl: '', startAt: '', endAt: '',
  status: 'UPCOMING', generation: '',
}

function parseList<T>(json: unknown): T[] {
  if (!json) return []
  const j = json as Record<string, unknown>
  if (Array.isArray(j)) return j as T[]
  if (j.data) {
    const d = j.data as Record<string, unknown>
    if (Array.isArray(d)) return d as T[]
    if (d.content && Array.isArray(d.content)) return d.content as T[]
  }
  if (j.content && Array.isArray(j.content)) return j.content as T[]
  return []
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

function toDateInput(s: string) {
  return s ? s.slice(0, 10) : ''
}

export default function AdminRecruitmentPage() {
  const [items, setItems] = useState<Recruitment[]>([])
  const [loading, setLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Recruitment | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<RecruitForm>(EMPTY_FORM)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment`)
      if (!res.ok) return
      const json = await res.json()
      setItems(parseList<Recruitment>(json))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function buildBody() {
    return JSON.stringify({
      title: form.title,
      applyUrl: form.applyUrl,
      startAt: form.startAt ? `${form.startAt}T00:00:00` : undefined,
      endAt: form.endAt ? `${form.endAt}T23:59:59` : undefined,
      isActive: form.status === 'RECRUITING',
      status: form.status,
      generation: form.generation ? parseInt(form.generation) : undefined,
    })
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.applyUrl.trim()) return
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildBody(),
      })
      if (res.ok) {
        setCreateOpen(false)
        setForm(EMPTY_FORM)
        showToast('모집이 등록되었습니다.')
        await load()
      } else {
        showToast('등록에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEdit() {
    if (!editItem) return
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: buildBody(),
      })
      if (res.ok) {
        setEditItem(null)
        showToast('모집이 수정되었습니다.')
        await load()
      } else {
        showToast('수정에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteId(null)
        showToast('모집이 삭제되었습니다.')
        await load()
      } else {
        showToast('삭제에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>지원하기 관리</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>신규 부원 모집 기간과 지원서 링크를 관리합니다.</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >+ 모집 등록</button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          padding: '11px 24px', borderRadius: '8px',
          background: 'rgba(0, 65, 239, 0.95)', border: '1px solid rgba(28,90,255,0.6)',
          color: '#fff', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>{toast}</div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>불러오는 중...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>등록된 모집이 없습니다.</div>
        ) : (
          <div>
            {items.map(r => {
              const isOpen = r.status === 'RECRUITING' || (!r.status && r.isActive)
              const isUpcoming = r.status === 'UPCOMING'
              const statusLabel = isOpen ? '모집중' : isUpcoming ? '모집예정' : '모집마감'
              const statusStyle: React.CSSProperties = isOpen
                ? { color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }
                : isUpcoming
                  ? { color: '#facc15', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)' }
                  : { color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }
              return (
                <div key={r.id} style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{r.title}</p>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...statusStyle }}>
                          {statusLabel}
                        </span>
                        {r.generation != null && (
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {r.generation}기
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
                        {fmtDateTime(r.startAt)} ~ {fmtDateTime(r.endAt)}
                      </p>
                      <a
                        href={r.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#7aa3ff', fontSize: '12px', marginTop: '4px', display: 'inline-block', textDecoration: 'none', wordBreak: 'break-all' }}
                      >{r.applyUrl}</a>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          setEditItem(r)
                          setForm({
                            title: r.title,
                            applyUrl: r.applyUrl,
                            startAt: toDateInput(r.startAt),
                            endAt: toDateInput(r.endAt),
                            status: r.status ?? (r.isActive ? 'RECRUITING' : 'CLOSED'),
                            generation: r.generation?.toString() ?? '',
                          })
                        }}
                        style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                      >수정</button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer' }}
                      >삭제</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 모집 등록 */}
      {createOpen && (
        <Modal title="모집 등록" onClose={() => setCreateOpen(false)}>
          <RecruitFormFields form={form} onChange={setForm} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <button onClick={() => setCreateOpen(false)} style={cancelBtnStyle}>취소</button>
            <button
              onClick={handleCreate}
              disabled={actionLoading || !form.title.trim() || !form.applyUrl.trim()}
              style={{ ...primaryBtnStyle, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? '저장 중...' : '등록 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 모집 수정 */}
      {editItem && (
        <Modal title="모집 수정" onClose={() => setEditItem(null)}>
          <RecruitFormFields form={form} onChange={setForm} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <button onClick={() => setEditItem(null)} style={cancelBtnStyle}>취소</button>
            <button
              onClick={handleEdit}
              disabled={actionLoading || !form.title.trim() || !form.applyUrl.trim()}
              style={{ ...primaryBtnStyle, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 */}
      {deleteId !== null && (
        <Modal title="모집 삭제" onClose={() => setDeleteId(null)}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
            이 모집을 삭제하시겠습니까? 되돌릴 수 없습니다.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setDeleteId(null)} style={cancelBtnStyle}>취소</button>
            <button
              onClick={() => handleDelete(deleteId)}
              disabled={actionLoading}
              style={{ ...dangerBtnStyle, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#0b1630', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '480px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '6px',
}
const inputStyleObj: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', fontSize: '13px', outline: 'none',
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
  background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
}
const dangerBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
  background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
}

function RecruitFormFields({ form, onChange }: { form: RecruitForm; onChange: (f: RecruitForm) => void }) {
  const statusOptions: { value: RecruitStatus; label: string; color: string }[] = [
    { value: 'RECRUITING', label: '모집중', color: '#16a34a' },
    { value: 'UPCOMING', label: '모집예정', color: '#ca8a04' },
    { value: 'CLOSED', label: '모집마감', color: 'rgba(255,255,255,0.15)' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={fieldLabelStyle}>모집 제목</label>
        <input
          type="text"
          value={form.title}
          onChange={e => onChange({ ...form, title: e.target.value })}
          placeholder="예) 2026년 1학기 신입 부원 모집"
          style={inputStyleObj}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabelStyle}>기수</label>
          <input
            type="number"
            min="1"
            value={form.generation}
            onChange={e => onChange({ ...form, generation: e.target.value })}
            placeholder="예) 12"
            style={inputStyleObj}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>지원서 URL</label>
          <input
            type="url"
            value={form.applyUrl}
            onChange={e => onChange({ ...form, applyUrl: e.target.value })}
            placeholder="https://forms.gle/..."
            style={inputStyleObj}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabelStyle}>모집 시작일</label>
          <input
            type="date"
            value={form.startAt}
            onChange={e => onChange({ ...form, startAt: e.target.value })}
            style={inputStyleObj}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>모집 종료일</label>
          <input
            type="date"
            value={form.endAt}
            onChange={e => onChange({ ...form, endAt: e.target.value })}
            style={inputStyleObj}
          />
        </div>
      </div>
      <div>
        <label style={fieldLabelStyle}>모집 상태</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {statusOptions.map(({ value, label, color }) => {
            const active = form.status === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ ...form, status: value })}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  background: active ? color : 'rgba(255,255,255,0.04)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                  border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >{label}</button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
