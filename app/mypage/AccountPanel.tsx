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

const CARD = 'rounded-xl bg-surface border border-line p-6'
const CARD_TITLE = 'text-[15px] font-bold mb-1'
const CARD_DESC = 'text-fg-subtle text-xs leading-relaxed mb-5'
const LABEL = 'block text-xs text-fg-subtle mb-1.5'
const FIELD_ERROR = 'text-danger text-xs mt-1.5'
const OUTLINE_BUTTON =
  'px-5 py-2.5 rounded-lg text-[13px] font-semibold border transition-colors'

function inputClass(hasError: boolean) {
  return `w-full h-[42px] px-3.5 rounded-lg text-sm text-white bg-surface-raised border outline-none transition-colors placeholder:text-fg-faint ${
    hasError ? 'border-danger' : 'border-line focus:border-brand'
  }`
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
  const leaveReady = leaveConfirm.trim() === '탈퇴'

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
    // 넓은 화면: 왼쪽 프로필 / 오른쪽 비밀번호·탈퇴. 좁은 화면에선 한 줄로 쌓인다
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
      {/* ── 프로필 ── */}
      <section className={CARD}>
        <h3 className={`${CARD_TITLE} text-white`}>프로필</h3>
        <p className={CARD_DESC}>닉네임과 학과를 바꿀 수 있습니다.</p>

        <div className="mb-4">
          <label className={LABEL}>이메일</label>
          <input value={email} disabled className={`${inputClass(false)} text-fg-subtle cursor-not-allowed`} />
          <p className="text-fg-subtle text-[11px] mt-1.5">
            이메일은 이 화면에서 바꿀 수 없습니다. 변경이 필요하면 운영진에게 문의해주세요.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <div>
            <label className={LABEL}>닉네임</label>
            <input
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              className={inputClass(!!fieldErrors.nickname)}
            />
            {fieldErrors.nickname && <p className={FIELD_ERROR}>{fieldErrors.nickname}</p>}
          </div>

          <div>
            <label className={LABEL}>학과</label>
            <input
              value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className={inputClass(!!fieldErrors.department)}
            />
            {fieldErrors.department && <p className={FIELD_ERROR}>{fieldErrors.department}</p>}
          </div>
        </div>

        {/* 서버가 현재 비밀번호 재인증을 요구한다 (도용된 세션으로 프로필이 바뀌는 것을 막기 위해) */}
        <div className="mb-5">
          <label className={LABEL}>현재 비밀번호</label>
          <input
            type="password"
            value={form.currentPassword}
            onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            placeholder="본인 확인을 위해 필요합니다"
            autoComplete="current-password"
            className={inputClass(!!fieldErrors.currentPassword)}
          />
          {fieldErrors.currentPassword && <p className={FIELD_ERROR}>{fieldErrors.currentPassword}</p>}
        </div>

        {message && (
          <p className={`text-xs mb-3.5 ${message.kind === 'ok' ? 'text-status-live-text' : 'text-danger'}`}>
            {message.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !changed}
          className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity ${
            changed ? 'bg-brand text-white' : 'bg-surface-raised text-fg-faint cursor-not-allowed'
          } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </section>

      <div className="grid gap-5">
        {/* ── 비밀번호 ── */}
        <section className={CARD}>
          <h3 className={`${CARD_TITLE} text-white`}>비밀번호</h3>
          <p className={CARD_DESC}>비밀번호는 가입한 이메일로 재설정 링크를 받아 바꿉니다.</p>
          <button
            onClick={() => router.push('/forgot-password')}
            className={`${OUTLINE_BUTTON} text-fg-muted border-line-strong hover:text-white hover:bg-surface-raised`}
          >
            비밀번호 재설정 메일 받기
          </button>
        </section>

        {/* ── 탈퇴 ── */}
        <section className={`${CARD} border-danger/30`}>
          <h3 className={`${CARD_TITLE} text-danger`}>회원 탈퇴</h3>
          <p className={CARD_DESC}>
            탈퇴하면 계정이 비활성화되고 참여 중인 스터디·프로젝트에서 빠집니다.
            작성한 글과 댓글은 남습니다. 팀장으로 있는 팀이 있으면 먼저 위임해야 합니다.
          </p>

          {!leaveOpen ? (
            <button
              onClick={() => { setLeaveOpen(true); setLeaveError(''); setLeaveConfirm('') }}
              className={`${OUTLINE_BUTTON} text-danger border-danger/50 hover:bg-danger/10`}
            >
              탈퇴하기
            </button>
          ) : (
            <div>
              <label className={LABEL}>
                정말 탈퇴하려면 <strong className="text-danger">탈퇴</strong> 를 입력해주세요
              </label>
              <input
                value={leaveConfirm}
                onChange={e => setLeaveConfirm(e.target.value)}
                placeholder="탈퇴"
                className={`${inputClass(false)} mb-3`}
              />
              {leaveError && <p className="text-danger text-xs mb-3">{leaveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setLeaveOpen(false)}
                  className={`${OUTLINE_BUTTON} font-normal text-fg-subtle border-line hover:text-white hover:bg-surface-raised`}
                >
                  취소
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving || !leaveReady}
                  className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
                    leaveReady ? 'bg-danger/85 hover:bg-danger text-white' : 'bg-surface-raised text-fg-faint cursor-not-allowed'
                  } ${leaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {leaving ? '처리 중...' : '탈퇴하기'}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
