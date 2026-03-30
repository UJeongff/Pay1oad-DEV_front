'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const RED_BORDER = '1px solid rgba(255,60,60,0.85)'
const RED_SHADOW = '0 0 8px rgba(255,40,40,0.45)'
const DEFAULT_BORDER = '1px solid rgba(255,255,255,0.12)'

function PasswordResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({ newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const baseInput: React.CSSProperties = {
    width: '100%',
    height: '42px',
    padding: '0 40px 0 16px',
    background: 'rgba(255,255,255,0.07)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'border 0.15s, box-shadow 0.15s',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = { newPassword: '', confirmPassword: '' }
    if (!newPassword) errs.newPassword = '새 비밀번호를 입력해주세요.'
    else if (newPassword.length < 8) errs.newPassword = '비밀번호는 8자 이상이어야 합니다.'
    if (!confirmPassword) errs.confirmPassword = '비밀번호 확인을 입력해주세요.'
    else if (newPassword !== confirmPassword) errs.confirmPassword = '비밀번호가 일치하지 않습니다.'
    if (errs.newPassword || errs.confirmPassword) { setFieldErrors(errs); return }
    setFieldErrors({ newPassword: '', confirmPassword: '' })
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/v1/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.message ?? '비밀번호 재설정에 실패했습니다.'); return }
      setSuccess(true)
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="text-white/50 text-sm">유효하지 않은 접근입니다.</p>
        <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">
          비밀번호 재설정 요청하기
        </Link>
      </div>
    )
  }

  return success ? (
    <div className="flex flex-col items-center gap-6 py-4">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,200,100,0.15)', border: '1px solid rgba(0,200,100,0.3)' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(0,220,110,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-2">비밀번호 재설정 완료</h1>
        <p className="text-white/50 text-sm">새 비밀번호로 로그인하실 수 있습니다.</p>
      </div>
      <Link
        href="/login"
        style={{
          width: '100%',
          height: '42px',
          background: '#0041EF',
          borderRadius: '3.56px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
        }}
      >
        로그인으로 이동
      </Link>
    </div>
  ) : (
    <>
      <h1 className="text-white text-3xl font-bold mb-2">Reset Password</h1>
      <p className="text-white/50 text-sm mb-7">새로운 비밀번호를 입력해주세요.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-white/60 text-xs tracking-wider">새 비밀번호</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((p) => ({ ...p, newPassword: '' })) }}
              style={{
                ...baseInput,
                border: fieldErrors.newPassword ? RED_BORDER : DEFAULT_BORDER,
                boxShadow: fieldErrors.newPassword ? RED_SHADOW : 'none',
              }}
              className="placeholder-white/30 focus:border-blue-500 transition-colors"
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors" tabIndex={-1}>
              <EyeIcon open={showNew} />
            </button>
          </div>
          {fieldErrors.newPassword && <p className="text-red-400 text-xs mt-0.5">{fieldErrors.newPassword}</p>}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-white/60 text-xs tracking-wider">비밀번호 확인</label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((p) => ({ ...p, confirmPassword: '' })) }}
              style={{
                ...baseInput,
                border: fieldErrors.confirmPassword ? RED_BORDER : DEFAULT_BORDER,
                boxShadow: fieldErrors.confirmPassword ? RED_SHADOW : 'none',
              }}
              className="placeholder-white/30 focus:border-blue-500 transition-colors"
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors" tabIndex={-1}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {fieldErrors.confirmPassword && <p className="text-red-400 text-xs mt-0.5">{fieldErrors.confirmPassword}</p>}
        </div>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: '42px',
            background: '#0041EF',
            borderRadius: '3.56px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? '재설정 중...' : '비밀번호 재설정'}
        </button>
      </form>
    </>
  )
}

export default function PasswordResetPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'url(/login_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen pt-10 px-[8.5vw]">
        <div
          className="w-full flex flex-col items-center justify-center py-14 relative overflow-hidden"
          style={{
            maxWidth: '1196px',
            minHeight: '520px',
            background: 'rgba(0,0,0,0.50)',
            backdropFilter: 'blur(29.1px)',
            WebkitBackdropFilter: 'blur(29.1px)',
            borderRadius: '40px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Image
            src="/logo.png"
            alt=""
            width={570}
            height={592}
            className="select-none pointer-events-none absolute"
            style={{ opacity: 0.03, top: '-10px', left: '306px' }}
          />

          <div className="w-full max-w-sm px-4 sm:px-0">
            <Suspense fallback={<div className="text-white/40 text-sm text-center">불러오는 중...</div>}>
              <PasswordResetForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
