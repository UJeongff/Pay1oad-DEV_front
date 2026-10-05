'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { mapServerErrors, summarize } from '@/app/lib/formErrors'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

const SERVER_FIELD_MAP = { nickname: 'nickname', department: 'department' } as const
const SERVER_CODE_MAP = {
  NICKNAME_ALREADY_EXISTS: 'nickname',
  INVALID_PASSWORD: 'currentPassword',
} as const

type Props = {
  nickname: string
  department: string
  email: string
  /** 수정이 끝나면 헤더의 닉네임 등을 새로 읽어오기 위해 */
  onUpdated: () => void
  onLoggedOut: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', height: '42px', padding: '0 14px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px',
}
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px', padding: '24px', marginBottom: '20px',
}

export default function AccountPanel({ nickname, department, email, onUpdated, onLoggedOut }: Props) {
  const router = useRouter()

  const [form, setForm] = useState({ nickname, department, currentPassword: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState('')
  const [leaveError, setLeaveError] = useState('')
  const [leaving, setLeaving] = useState(false)

  const changed = form.nickname !== nickname || form.department !== department

  async function handleSave() {
    if (!changed) return
    setSaving(true)
    setMessage(null)
    setFieldErrors({})
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: form.nickname.trim(),
          department: form.department.trim(),
          currentPassword: form.currentPassword,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const mapped = mapServerErrors(data, SERVER_FIELD_MAP, SERVER_CODE_MAP)
        setFieldErrors(mapped.fieldErrors as Record<string, string>)
        setMessage({ kind: 'error', text: summarize(mapped, data, '수정에 실패했습니다.') })
        return
      }

      setForm(f => ({ ...f, currentPassword: '' }))
      setMessage({ kind: 'ok', text: '저장되었습니다.' })
      onUpdated()
    } catch {
      setMessage({ kind: 'error', text: '서버에 연결할 수 없습니다.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleLeave() {
    setLeaving(true)
    setLeaveError('')
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/users/me`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        // 팀장으로 있는 팀이 남아 있으면 서버가 막는다 (LEADER_EXISTS)
        setLeaveError(data?.message ?? `탈퇴에 실패했습니다. (HTTP ${res.status})`)
        return
      }
      await fetchWithAuth(`${API_URL}/v1/auth/logout`, { method: 'POST' }).catch(() => {})
      onLoggedOut()
      router.push('/')
    } catch {
      setLeaveError('서버에 연결할 수 없습니다.')
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      {/* ── 프로필 ── */}
      <div style={cardStyle}>
        <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>프로필</h3>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '0 0 20px' }}>
          닉네임과 학과를 바꿀 수 있습니다.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>이메일</label>
          <input value={email} disabled style={{ ...inputStyle, opacity: 0.45, cursor: 'not-allowed' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: '6px 0 0' }}>
            이메일은 이 화면에서 바꿀 수 없습니다. 변경이 필요하면 운영진에게 문의해주세요.
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>닉네임</label>
          <input
            value={form.nickname}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            style={{ ...inputStyle, borderColor: fieldErrors.nickname ? 'rgba(255,60,60,0.85)' : 'rgba(255,255,255,0.12)' }}
          />
          {fieldErrors.nickname && <p style={{ color: '#f87171', fontSize: '12px', margin: '6px 0 0' }}>{fieldErrors.nickname}</p>}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>학과</label>
          <input
            value={form.department}
            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            style={{ ...inputStyle, borderColor: fieldErrors.department ? 'rgba(255,60,60,0.85)' : 'rgba(255,255,255,0.12)' }}
          />
          {fieldErrors.department && <p style={{ color: '#f87171', fontSize: '12px', margin: '6px 0 0' }}>{fieldErrors.department}</p>}
        </div>

        {/* 서버가 현재 비밀번호 재인증을 요구한다 (도용된 세션으로 프로필이 바뀌는 것을 막기 위해) */}
        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>현재 비밀번호</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            placeholder="본인 확인을 위해 필요합니다"
            autoComplete="current-password"
            style={{ ...inputStyle, borderColor: fieldErrors.currentPassword ? 'rgba(255,60,60,0.85)' : 'rgba(255,255,255,0.12)' }}
          />
          {fieldErrors.currentPassword && <p style={{ color: '#f87171', fontSize: '12px', margin: '6px 0 0' }}>{fieldErrors.currentPassword}</p>}
        </div>

        {message && (
          <p style={{ fontSize: '12px', margin: '0 0 14px', color: message.kind === 'ok' ? '#4ade80' : '#f87171' }}>
            {message.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !changed}
          style={{
            padding: '9px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
            background: changed ? '#1C5AFF' : 'rgba(255,255,255,0.08)',
            color: changed ? '#fff' : 'rgba(255,255,255,0.35)',
            cursor: saving || !changed ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>

      {/* ── 비밀번호 ── */}
      <div style={cardStyle}>
        <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>비밀번호</h3>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '0 0 16px', lineHeight: 1.6 }}>
          비밀번호는 가입한 이메일로 재설정 링크를 받아 바꿉니다.
        </p>
        <button
          onClick={() => router.push('/forgot-password')}
          style={{
            padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
          }}
        >
          비밀번호 재설정 메일 받기
        </button>
      </div>

      {/* ── 탈퇴 ── */}
      <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.25)' }}>
        <h3 style={{ color: '#fca5a5', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>회원 탈퇴</h3>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '0 0 16px', lineHeight: 1.6 }}>
          탈퇴하면 계정이 비활성화되고 참여 중인 스터디·프로젝트에서 빠집니다.
          작성한 글과 댓글은 남습니다. 팀장으로 있는 팀이 있으면 먼저 위임해야 합니다.
        </p>

        {!leaveOpen ? (
          <button
            onClick={() => { setLeaveOpen(true); setLeaveError(''); setLeaveConfirm('') }}
            style={{
              padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.5)',
              color: '#f87171', cursor: 'pointer',
            }}
          >
            탈퇴하기
          </button>
        ) : (
          <div>
            <label style={labelStyle}>
              정말 탈퇴하려면 <strong style={{ color: '#fca5a5' }}>탈퇴</strong> 를 입력해주세요
            </label>
            <input
              value={leaveConfirm}
              onChange={e => setLeaveConfirm(e.target.value)}
              placeholder="탈퇴"
              style={{ ...inputStyle, marginBottom: '12px' }}
            />
            {leaveError && <p style={{ color: '#f87171', fontSize: '12px', margin: '0 0 12px' }}>{leaveError}</p>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setLeaveOpen(false)}
                style={{
                  padding: '9px 18px', borderRadius: '8px', fontSize: '13px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving || leaveConfirm.trim() !== '탈퇴'}
                style={{
                  padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none',
                  background: leaveConfirm.trim() === '탈퇴' ? 'rgba(239,68,68,0.85)' : 'rgba(255,255,255,0.08)',
                  color: leaveConfirm.trim() === '탈퇴' ? '#fff' : 'rgba(255,255,255,0.35)',
                  cursor: leaving || leaveConfirm.trim() !== '탈퇴' ? 'not-allowed' : 'pointer',
                  opacity: leaving ? 0.6 : 1,
                }}
              >
                {leaving ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
