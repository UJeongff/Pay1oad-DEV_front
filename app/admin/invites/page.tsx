'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pay1oad.xyz'

interface InviteToken {
  id: number
  code: string
  expiresAt: string
  usedCount: number
  createdByUserId: number
  memo: string | null
  revokedAt: string | null
  createdAt: string
  usable: boolean
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function defaultExpiry(): string {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return formatDate(d.toISOString())
}

export default function AdminInvitesPage() {
  const [tokens, setTokens] = useState<InviteToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expiresOn, setExpiresOn] = useState(defaultExpiry())
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<InviteToken | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/invites`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setTokens(json.data ?? [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  const handleCreate = async () => {
    setError(null)
    if (!expiresOn) { setError('만료일을 선택해주세요.'); return }
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresOn, memo: memo.trim() || null }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.message ?? '발급에 실패했습니다.')
        return
      }
      showToast('초대 코드가 발급되었습니다.')
      setShowCreate(false)
      setMemo('')
      setExpiresOn(defaultExpiry())
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id: number) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/invites/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('폐기되었습니다.')
        await load()
      } else {
        showToast('폐기에 실패했습니다.')
      }
    } finally {
      setConfirmRevoke(null)
    }
  }

  const copyLink = async (code: string) => {
    const link = `${SITE_URL}/signup?invite=${encodeURIComponent(code)}`
    try {
      await navigator.clipboard.writeText(link)
      showToast('초대 링크가 복사되었습니다.')
    } catch {
      showToast('복사 실패 — 수동으로 복사해주세요.')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>초대 코드</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            코드로 가입하면 관리자 승인 없이 바로 활성 회원이 됩니다. 만료일까지 다회 사용 가능.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(28,90,255,0.85)', border: '1px solid rgba(28,90,255,0.6)',
            color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >+ 새 코드 발급</button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          padding: '11px 24px', borderRadius: '8px',
          background: 'rgba(0, 65, 239, 0.95)', border: '1px solid rgba(28,90,255,0.6)',
          color: '#fff', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>{toast}</div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0d1b35', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>초대 코드 발급</h3>

            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '6px' }}>만료일</label>
            <input
              type="date"
              value={expiresOn}
              onChange={e => setExpiresOn(e.target.value)}
              min={formatDate(new Date().toISOString())}
              style={{
                width: '100%', padding: '8px 12px', marginBottom: '16px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none',
              }}
            />

            <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '6px' }}>메모 (선택)</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="예: 2026 신입 OT"
              maxLength={200}
              style={{
                width: '100%', padding: '8px 12px', marginBottom: '20px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none',
              }}
            />

            {error && <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCreate(false); setError(null) }}
                style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
              >취소</button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: 'rgba(28,90,255,0.85)', border: 'none', color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
                }}
              >발급</button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirm */}
      {confirmRevoke && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0d1b35', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '380px', width: '100%' }}>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              <strong style={{ color: '#fff' }}>{confirmRevoke.memo || confirmRevoke.code.slice(0, 8) + '...'}</strong> 코드를 폐기하시겠습니까?<br />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>이미 이 코드로 가입한 사용자는 영향받지 않습니다.</span>
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmRevoke(null)} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>취소</button>
              <button onClick={() => handleRevoke(confirmRevoke.id)} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'rgba(239,68,68,0.85)', border: 'none', color: '#fff', cursor: 'pointer' }}>폐기</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>불러오는 중...</div>
        ) : tokens.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>발급된 초대 코드가 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>코드 / 메모</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>상태</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>사용 / 만료</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>발급일</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600 }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(t => (
                <tr key={t.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', color: '#fff' }}>{t.code}</div>
                    {t.memo && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{t.memo}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Badge usable={t.usable} revoked={!!t.revokedAt} />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div>{t.usedCount}회 사용</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>만료 {formatDate(t.expiresAt)}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.5)' }}>{formatDateTime(t.createdAt)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => copyLink(t.code)}
                      disabled={!t.usable}
                      style={{
                        padding: '5px 12px', marginRight: '6px', borderRadius: '6px',
                        background: 'rgba(28,90,255,0.15)', border: '1px solid rgba(28,90,255,0.4)',
                        color: '#7aa3ff', fontSize: '12px', fontWeight: 600,
                        cursor: t.usable ? 'pointer' : 'not-allowed', opacity: t.usable ? 1 : 0.4,
                      }}
                    >링크 복사</button>
                    {!t.revokedAt && (
                      <button
                        onClick={() => setConfirmRevoke(t)}
                        style={{
                          padding: '5px 12px', borderRadius: '6px',
                          background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                          color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >폐기</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Badge({ usable, revoked }: { usable: boolean; revoked: boolean }) {
  let label = '사용 가능'
  let style: React.CSSProperties = { color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }
  if (revoked) {
    label = '폐기됨'
    style = { color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }
  } else if (!usable) {
    label = '만료'
    style = { color: '#facc15', background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)' }
  }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, ...style }}>
      {label}
    </span>
  )
}
