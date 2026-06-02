'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

type HistoryCategory = 'SELECTION' | 'EDUCATION' | 'PRESENTATION' | 'ACHIEVEMENT'

interface HistoryItem {
  id: number
  year: number
  category: HistoryCategory
  summary: string
  detail: string
  displayOrder: number
}

const CATEGORY_OPTIONS: { value: HistoryCategory; label: string; color: string }[] = [
  { value: 'SELECTION',    label: '선정', color: '#7aa3ff' },
  { value: 'EDUCATION',    label: '교육', color: '#74FF89' },
  { value: 'PRESENTATION', label: '발표', color: '#FFB877' },
  { value: 'ACHIEVEMENT',  label: '성과', color: '#FF9193' },
]

const KO_LABEL: Record<HistoryCategory, string> = {
  SELECTION: '선정',
  EDUCATION: '교육',
  PRESENTATION: '발표',
  ACHIEVEMENT: '성과',
}

type FormState = {
  year: string
  category: HistoryCategory
  summary: string
  detail: string
  displayOrder: string
}

const EMPTY_FORM: FormState = {
  year: String(new Date().getFullYear()),
  category: 'SELECTION',
  summary: '',
  detail: '',
  displayOrder: '0',
}

export default function AdminHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  // 모달
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<HistoryItem | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2400)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/history/items`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        const data: HistoryItem[] = json?.data ?? []
        setItems(data)
        if (selectedYear == null && data.length > 0) {
          const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => b - a)
          setSelectedYear(years[0])
        }
      }
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => { load() }, [load])

  // 연도별 그룹
  const years = useMemo(
    () => Array.from(new Set(items.map(i => i.year))).sort((a, b) => b - a),
    [items],
  )

  const itemsByCategory = useMemo(() => {
    const map: Record<HistoryCategory, HistoryItem[]> = {
      SELECTION: [], EDUCATION: [], PRESENTATION: [], ACHIEVEMENT: [],
    }
    if (selectedYear == null) return map
    items
      .filter(i => i.year === selectedYear)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
      .forEach(i => { map[i.category].push(i) })
    return map
  }, [items, selectedYear])

  function openCreate(presetCategory?: HistoryCategory) {
    setError(null)
    setForm({
      ...EMPTY_FORM,
      year: selectedYear ? String(selectedYear) : EMPTY_FORM.year,
      category: presetCategory ?? EMPTY_FORM.category,
    })
    setCreateOpen(true)
  }

  function openEdit(item: HistoryItem) {
    setError(null)
    setForm({
      year: String(item.year),
      category: item.category,
      summary: item.summary,
      detail: item.detail,
      displayOrder: String(item.displayOrder),
    })
    setEditItem(item)
  }

  function buildBody() {
    return JSON.stringify({
      year: parseInt(form.year, 10),
      category: form.category,
      summary: form.summary.trim(),
      detail: form.detail.trim(),
      displayOrder: form.displayOrder ? parseInt(form.displayOrder, 10) : 0,
    })
  }

  function validate(): string | null {
    const y = parseInt(form.year, 10)
    if (!y || y < 2000 || y > 2100) return '연도는 2000~2100 사이여야 합니다.'
    if (!form.summary.trim()) return '요약은 필수입니다.'
    if (!form.detail.trim()) return '상세 설명은 필수입니다.'
    if (form.summary.length > 200) return '요약은 200자 이하여야 합니다.'
    if (form.detail.length > 500) return '상세는 500자 이하여야 합니다.'
    return null
  }

  async function handleCreate() {
    const v = validate()
    if (v) { setError(v); return }
    setError(null)
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/history/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: buildBody(),
      })
      if (res.ok) {
        const created = (await res.json())?.data
        showToast('히스토리가 추가되었습니다.')
        setCreateOpen(false)
        setSelectedYear(created?.year ?? parseInt(form.year, 10))
        await load()
      } else {
        const j = await res.json().catch(() => ({}))
        setError(j?.message ?? '추가에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEdit() {
    if (!editItem) return
    const v = validate()
    if (v) { setError(v); return }
    setError(null)
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/history/items/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: buildBody(),
      })
      if (res.ok) {
        showToast('수정되었습니다.')
        setEditItem(null)
        await load()
      } else {
        const j = await res.json().catch(() => ({}))
        setError(j?.message ?? '수정에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/history/items/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('삭제되었습니다.')
        setDeleteId(null)
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>History 관리</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            About Us 페이지의 연도별 History 항목을 관리합니다. (선정/교육/발표/성과)
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >+ 항목 추가</button>
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

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>불러오는 중...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          등록된 항목이 없습니다. 우측 상단 &quot;+ 항목 추가&quot;로 시작하세요.
        </div>
      ) : (
        <>
          {/* 연도 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginRight: '4px' }}>연도:</span>
            {years.map(y => {
              const active = selectedYear === y
              return (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    background: active ? 'rgba(28,90,255,0.85)' : 'rgba(255,255,255,0.04)',
                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: active ? '1px solid rgba(28,90,255,0.85)' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >{y}</button>
              )
            })}
          </div>

          {/* 카테고리별 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {CATEGORY_OPTIONS.map(({ value, label, color }) => {
              const list = itemsByCategory[value]
              return (
                <div key={value} style={{
                  background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                      <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>({list.length})</span>
                    </div>
                    <button
                      onClick={() => openCreate(value)}
                      style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                        color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                      }}
                    >+ 추가</button>
                  </div>

                  {list.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                      없음
                    </div>
                  ) : (
                    <div>
                      {list.map(item => (
                        <div key={item.id} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, wordBreak: 'keep-all' }}>{item.summary}</p>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px', lineHeight: 1.5, wordBreak: 'keep-all' }}>{item.detail}</p>
                              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '4px' }}>순서 {item.displayOrder}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button
                                onClick={() => openEdit(item)}
                                style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                              >수정</button>
                              <button
                                onClick={() => setDeleteId(item.id)}
                                style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer' }}
                              >삭제</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 추가/수정 모달 */}
      {(createOpen || editItem) && (
        <Modal title={editItem ? '히스토리 수정' : '히스토리 추가'} onClose={() => { setCreateOpen(false); setEditItem(null); setError(null) }}>
          <FormFields form={form} setForm={setForm} />
          {error && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '12px' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <button onClick={() => { setCreateOpen(false); setEditItem(null); setError(null) }} style={cancelBtnStyle}>취소</button>
            <button
              onClick={editItem ? handleEdit : handleCreate}
              disabled={actionLoading}
              style={{ ...primaryBtnStyle, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? '저장 중...' : (editItem ? '수정 완료' : '추가')}
            </button>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 */}
      {deleteId !== null && (
        <Modal title="히스토리 삭제" onClose={() => setDeleteId(null)}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', marginBottom: '24px' }}>
            이 항목을 삭제하시겠습니까? 되돌릴 수 없습니다.
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

// ─── subcomponents / styles ────────────────────

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

function FormFields({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabelStyle}>연도</label>
          <input
            type="number"
            min="2000"
            max="2100"
            value={form.year}
            onChange={e => setForm({ ...form, year: e.target.value })}
            style={inputStyleObj}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>카테고리</label>
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value as HistoryCategory })}
            style={inputStyleObj}
          >
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{KO_LABEL[c.value]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label style={fieldLabelStyle}>요약 <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(카드에 노출, 최대 200자)</span></label>
        <input
          type="text"
          value={form.summary}
          maxLength={200}
          placeholder="예) BoB 수료"
          onChange={e => setForm({ ...form, summary: e.target.value })}
          style={inputStyleObj}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>상세 <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(hover 툴팁에 노출, 최대 500자)</span></label>
        <textarea
          value={form.detail}
          maxLength={500}
          placeholder="예) BoB 12기 수료: *기 김지성, *기 원신영"
          rows={3}
          onChange={e => setForm({ ...form, detail: e.target.value })}
          style={{ ...inputStyleObj, resize: 'none', fontFamily: 'inherit' }}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>표시 순서 <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(낮을수록 위에 노출, 같은 카테고리 내)</span></label>
        <input
          type="number"
          min="0"
          value={form.displayOrder}
          onChange={e => setForm({ ...form, displayOrder: e.target.value })}
          style={inputStyleObj}
        />
      </div>
    </div>
  )
}
