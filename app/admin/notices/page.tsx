'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

interface ContentSummary { id: number; title: string; type: string; isMember: boolean }
interface ContentNotice {
  id: number
  title: string
  content: string
  startAt: string
  endAt: string
  createdAt: string
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

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ko-KR')
}

function toDateInput(s: string) {
  return s ? s.slice(0, 10) : ''
}

type NoticeForm = { title: string; content: string; startAt: string; endAt: string }
const EMPTY_FORM: NoticeForm = { title: '', content: '', startAt: '', endAt: '' }

export default function AdminNoticesPage() {
  const [contents, setContents] = useState<ContentSummary[]>([])
  const [selectedContent, setSelectedContent] = useState<ContentSummary | null>(null)
  const [notices, setNotices] = useState<ContentNotice[]>([])
  const [loading, setLoading] = useState(false)

  // 모달
  const [createOpen, setCreateOpen] = useState(false)
  const [editNotice, setEditNotice] = useState<ContentNotice | null>(null)
  const [deleteNoticeId, setDeleteNoticeId] = useState<number | null>(null)
  const [form, setForm] = useState<NoticeForm>(EMPTY_FORM)
  const [target, setTarget] = useState<'ALL' | 'CONTENT'>('CONTENT')
  const [targetContentId, setTargetContentId] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  // 콘텐츠 목록 로드
  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents`)
      .then(r => r.ok ? r.json() : null)
      .then(j => setContents(parseList<ContentSummary>(j)))
      .catch(() => {})
  }, [])

  // 공지 목록 로드
  const fetchNotices = useCallback(async (contentId: number) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices/all`)
      if (!res.ok) return
      const json = await res.json()
      setNotices(parseList<ContentNotice>(json))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedContent) fetchNotices(selectedContent.id)
  }, [selectedContent, fetchNotices])

  async function handleCreate() {
    if (!form.title.trim() || !form.content.trim()) return
    if (target === 'CONTENT' && !targetContentId) return
    setActionLoading(true)
    try {
      const body = JSON.stringify({
        title: form.title,
        content: form.content,
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
      })
      const url = target === 'ALL'
        ? `${API_URL}/v1/admin/notices`
        : `${API_URL}/v1/contents/${targetContentId}/notices`
      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (res.ok) {
        setCreateOpen(false)
        setForm(EMPTY_FORM)
        showToast('공지가 작성되었습니다.')
        if (target === 'CONTENT' && selectedContent?.id === targetContentId) {
          await fetchNotices(selectedContent.id)
        }
      } else {
        showToast('작성에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEdit() {
    if (!selectedContent || !editNotice) return
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${selectedContent.id}/notices/${editNotice.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      )
      if (res.ok) {
        setEditNotice(null)
        setForm(EMPTY_FORM)
        showToast('공지가 수정되었습니다.')
        await fetchNotices(selectedContent.id)
      } else {
        showToast('수정에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete(noticeId: number) {
    if (!selectedContent) return
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${selectedContent.id}/notices/${noticeId}`,
        { method: 'DELETE' },
      )
      if (res.ok) {
        setDeleteNoticeId(null)
        showToast('공지가 삭제되었습니다.')
        await fetchNotices(selectedContent.id)
      } else {
        showToast('삭제에 실패했습니다.')
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>공지 관리</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          전체 부원 공지 또는 각 스터디/프로젝트별 공지를 관리합니다.
        </p>
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

      {/* 전체 부원 공지 발송 박스 */}
      <div
        style={{
          padding: '16px 20px', marginBottom: '20px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}
      >
        <div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 600 }}>전체 부원 공지</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>
            모든 활성 부원에게 공지를 발송합니다.
          </p>
        </div>
        <button
          onClick={() => {
            setTarget('ALL')
            setTargetContentId(null)
            setForm(EMPTY_FORM)
            setCreateOpen(true)
          }}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >+ 공지 작성</button>
      </div>

      {/* 컨텐츠 선택 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginRight: '4px' }}>
          스터디 / 프로젝트:
        </span>
        {contents.length === 0 ? (
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>불러오는 중...</span>
        ) : (
          contents.map(c => {
            const active = selectedContent?.id === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedContent(c)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: active ? 'rgba(28,90,255,0.85)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  border: active ? '1px solid rgba(28,90,255,0.85)' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{c.title}</button>
            )
          })
        )}
      </div>

      {/* 컨텐츠별 공지 목록 */}
      {!selectedContent ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          위에서 스터디 / 프로젝트를 선택하세요.
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{selectedContent.title}</span>의 공지 ({notices.length})
            </p>
            <button
              onClick={() => {
                setTarget('CONTENT')
                setTargetContentId(selectedContent.id)
                setForm(EMPTY_FORM)
                setCreateOpen(true)
              }}
              style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff', cursor: 'pointer',
              }}
            >+ 공지 작성</button>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>불러오는 중...</div>
          ) : notices.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>등록된 공지가 없습니다.</div>
          ) : (
            <div>
              {notices.map(n => (
                <div key={n.id} style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{n.title}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>
                        {fmtDate(n.startAt)} ~ {fmtDate(n.endAt)}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          setEditNotice(n)
                          setForm({
                            title: n.title,
                            content: n.content,
                            startAt: toDateInput(n.startAt),
                            endAt: toDateInput(n.endAt),
                          })
                        }}
                        style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                      >수정</button>
                      <button
                        onClick={() => setDeleteNoticeId(n.id)}
                        style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer' }}
                      >삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 공지 작성 모달 */}
      {createOpen && (
        <Modal title="공지 작성" onClose={() => setCreateOpen(false)}>
          <div style={{ marginBottom: '16px' }}>
            <label style={fieldLabelStyle}>공지 보낼 대상</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              {([['ALL', '전체 부원'], ['CONTENT', '스터디/프로젝트']] as [string, string][]).map(([val, label]) => {
                const active = target === val
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setTarget(val as 'ALL' | 'CONTENT')
                      if (val === 'CONTENT') setTargetContentId(selectedContent?.id ?? contents[0]?.id ?? null)
                      else setTargetContentId(null)
                    }}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      background: active ? 'rgba(28,90,255,0.85)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      border: active ? '1px solid rgba(28,90,255,0.85)' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                    }}
                  >{label}</button>
                )
              })}
            </div>
            {target === 'CONTENT' && (
              <select
                value={targetContentId ?? ''}
                onChange={e => setTargetContentId(Number(e.target.value))}
                style={inputStyleObj}
              >
                <option value="">선택해주세요</option>
                {contents.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>
          <NoticeFormFields form={form} onChange={setForm} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <button onClick={() => setCreateOpen(false)} style={cancelBtnStyle}>취소</button>
            <button
              onClick={handleCreate}
              disabled={
                actionLoading ||
                !form.title.trim() ||
                !form.content.trim() ||
                (target === 'CONTENT' && (!targetContentId || !form.startAt || !form.endAt))
              }
              style={{ ...primaryBtnStyle, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? '저장 중...' : '작성 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 공지 수정 모달 */}
      {editNotice && (
        <Modal title="공지 수정" onClose={() => setEditNotice(null)}>
          <NoticeFormFields form={form} onChange={setForm} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px' }}>
            <button onClick={() => setEditNotice(null)} style={cancelBtnStyle}>취소</button>
            <button
              onClick={handleEdit}
              disabled={actionLoading || !form.title.trim() || !form.content.trim() || !form.startAt || !form.endAt}
              style={{ ...primaryBtnStyle, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 */}
      {deleteNoticeId !== null && (
        <Modal title="공지 삭제" onClose={() => setDeleteNoticeId(null)}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
            이 공지를 삭제하시겠습니까? 되돌릴 수 없습니다.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setDeleteNoticeId(null)} style={cancelBtnStyle}>취소</button>
            <button
              onClick={() => handleDelete(deleteNoticeId)}
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

// ─── Subcomponents / styles ──────────────────────────────────

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

function NoticeFormFields({ form, onChange }: { form: NoticeForm; onChange: (f: NoticeForm) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={fieldLabelStyle}>제목</label>
        <input
          type="text"
          value={form.title}
          onChange={e => onChange({ ...form, title: e.target.value })}
          placeholder="공지 제목"
          style={inputStyleObj}
        />
      </div>
      <div>
        <label style={fieldLabelStyle}>내용</label>
        <textarea
          value={form.content}
          onChange={e => onChange({ ...form, content: e.target.value })}
          placeholder="공지 내용을 입력하세요"
          rows={5}
          style={{ ...inputStyleObj, resize: 'none', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={fieldLabelStyle}>시작일</label>
          <input
            type="date"
            value={form.startAt}
            onChange={e => onChange({ ...form, startAt: e.target.value })}
            style={inputStyleObj}
          />
        </div>
        <div>
          <label style={fieldLabelStyle}>종료일</label>
          <input
            type="date"
            value={form.endAt}
            onChange={e => onChange({ ...form, endAt: e.target.value })}
            style={inputStyleObj}
          />
        </div>
      </div>
    </div>
  )
}
