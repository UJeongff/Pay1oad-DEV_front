'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

const RED_BORDER = '1px solid rgba(255,60,60,0.85)'
const RED_SHADOW = '0 0 8px rgba(255,40,40,0.45)'
const DEFAULT_BORDER = '1px solid rgba(255,255,255,0.12)'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const baseInput: React.CSSProperties = {
    width: '100%',
    height: '42px',
    padding: '0 16px',
    background: 'rgba(255,255,255,0.07)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'border 0.15s, box-shadow 0.15s',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setEmailError('이메일을 입력해주세요.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError('올바른 이메일 형식이 아닙니다.'); return }
    setEmailError('')
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/v1/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setError(data?.message ?? '요청에 실패했습니다. 다시 시도해주세요.'); return }
      setSent(true)
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

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
            {sent ? (
              /* 전송 완료 안내 */
              <div className="flex flex-col items-center gap-6 py-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,65,239,0.15)', border: '1px solid rgba(0,65,239,0.3)' }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4d8fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="text-center">
                  <h1 className="text-white text-2xl font-bold mb-2">이메일을 확인해주세요</h1>
                  <p className="text-white/50 text-sm leading-relaxed">
                    <span className="text-white/70 font-medium">{email}</span>로<br />
                    비밀번호 재설정 링크를 보내드렸습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSent(false); setEmail('') }}
                  className="text-white/40 text-xs hover:text-white/70 transition-colors"
                >
                  다른 이메일로 다시 시도
                </button>
              </div>
            ) : (
              /* 이메일 입력 */
              <>
                <h1 className="text-white text-3xl font-bold mb-2">Forgot Password</h1>
                <p className="text-white/50 text-sm mb-7">
                  가입한 이메일 주소를 입력하면 재설정 링크를 보내드립니다.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-white/60 text-xs tracking-wider">Email</label>
                    <input
                      type="email"
                      placeholder="Username@gmail.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                      style={{
                        ...baseInput,
                        border: emailError ? RED_BORDER : DEFAULT_BORDER,
                        boxShadow: emailError ? RED_SHADOW : 'none',
                      }}
                      className="placeholder-white/30 focus:border-blue-500 transition-colors"
                    />
                    {emailError && <p className="text-red-400 text-xs mt-0.5">{emailError}</p>}
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
                    {loading ? '전송 중...' : '재설정 링크 전송'}
                  </button>
                </form>

                <p className="text-center text-white/40 text-xs mt-6">
                  로그인으로 돌아가기{' '}
                  <Link href="/login" className="text-white font-semibold hover:text-blue-300 transition-colors">
                    Login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
