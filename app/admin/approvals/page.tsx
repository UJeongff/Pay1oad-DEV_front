'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

interface PendingUser {
  id: number
  email: string
  name: string
  nickname: string
  department: string
  studentId: string
  generation: number
  createdAt: string
}

interface PendingPage {
  content: PendingUser[]
  totalElements: number
  totalPages: number
  number: number
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AdminApprovalsPage() {
  const [data, setData] = useState<PendingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: number; type: 'approve' | 'reject'; nickname: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/approvals/pending`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
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

  const handleAction = async (id: number, type: 'approve' | 'reject') => {
    setActingId(id)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/approvals/${id}/${type}`, { method: 'POST' })
      if (res.ok) {
        showToast(type === 'approve' ? '승인 완료' : '거부 완료')
        await load()
      } else {
        showToast('처리에 실패했습니다.')
      }
    } catch {
      showToast('네트워크 오류')
    } finally {
      setActingId(null)
      setConfirmAction(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>가입 승인</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          초대 코드 없이 가입한 신청자입니다. 검토 후 승인 또는 거부하세요.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          padding: '11px 24px', borderRadius: '8px',
          background: 'rgba(0, 65, 239, 0.95)', border: '1px solid rgba(28,90,255,0.6)',
          color: '#fff', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {/* Confirm modal */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0d1b35', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '380px', width: '100%' }}>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              <strong style={{ color: '#fff' }}>{confirmAction.nickname}</strong> 님의 가입을{' '}
              {confirmAction.type === 'approve' ? '승인' : '거부'}하시겠습니까?
              {confirmAction.type === 'reject' && (
                <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  거부 후에도 같은 이메일로 재가입은 불가능합니다.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
              >취소</button>
              <button
                onClick={() => handleAction(confirmAction.id, confirmAction.type)}
                disabled={actingId === confirmAction.id}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: confirmAction.type === 'reject' ? 'rgba(239,68,68,0.85)' : 'rgba(34,197,94,0.85)',
                  border: 'none', color: '#fff', cursor: 'pointer',
                  opacity: actingId === confirmAction.id ? 0.6 : 1,
                }}
              >{confirmAction.type === 'approve' ? '승인' : '거부'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>불러오는 중...</div>
        ) : !data || data.content.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>대기 중인 신청이 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>이름 (닉네임)</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>이메일</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>학과 / 학번</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>기수</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600 }}>신청일</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600 }}>처리</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>@{u.nickname}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{u.email}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div>{u.department}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{u.studentId}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{u.generation}기</td>
                  <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.5)' }}>{formatDateTime(u.createdAt)}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => setConfirmAction({ id: u.id, type: 'approve', nickname: u.nickname })}
                      disabled={actingId !== null}
                      style={{
                        padding: '5px 12px', marginRight: '6px', borderRadius: '6px',
                        background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                        color: '#4ade80', fontSize: '12px', fontWeight: 600, cursor: actingId === null ? 'pointer' : 'not-allowed',
                        opacity: actingId !== null ? 0.5 : 1,
                      }}
                    >승인</button>
                    <button
                      onClick={() => setConfirmAction({ id: u.id, type: 'reject', nickname: u.nickname })}
                      disabled={actingId !== null}
                      style={{
                        padding: '5px 12px', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                        color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: actingId === null ? 'pointer' : 'not-allowed',
                        opacity: actingId !== null ? 0.5 : 1,
                      }}
                    >거부</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalElements > 0 && (
        <p style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          총 {data.totalElements}건
        </p>
      )}
    </div>
  )
}
