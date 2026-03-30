'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/app/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const GOOGLE_CLIENT_ID = '496361331951-viefkapmkdapsgtge3icep02jkrdmsfi.apps.googleusercontent.com'

const RED_BORDER = '1px solid rgba(255,60,60,0.85)'
const RED_SHADOW = '0 0 8px rgba(255,40,40,0.45)'
const DEFAULT_BORDER = '1px solid rgba(255,255,255,0.12)'

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void
          prompt: () => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { refetch } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' })

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      })
    }
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  async function handleGoogleCredential(response: { credential: string }) {
    setGoogleLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken: response.credential }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.message ?? 'Google 로그인에 실패했습니다.')
        return
      }

      if (data?.data?.signupStatus === 'PENDING') {
        router.push('/register/complete-profile')
        return
      }

      await refetch()

      if (data?.data?.googleLinked) {
        router.push('/?googleLinked=true')
        return
      }

      router.push('/')
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleGoogleClick() {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt()
    }
  }

  function validate() {
    const errs = { email: '', password: '' }
    if (!email.trim()) errs.email = '이메일을 입력해주세요.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = '올바른 이메일 형식이 아닙니다.'
    if (!password) errs.password = '비밀번호를 입력해주세요.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (errs.email || errs.password) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({ email: '', password: '' })
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.message ?? '이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      const rawRole: string = data?.data?.roles?.[0] ?? ''
      const role = rawRole.toUpperCase().includes('ADMIN') ? 'ADMIN' : 'MEMBER'
      localStorage.setItem('user_role', role)

      await refetch()
      router.push('/')
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/login_background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen pt-10 px-[8.5vw]">

        {/* Card */}
        <div
          className="w-full flex flex-col items-center py-14 relative overflow-hidden"
          style={{
            maxWidth: '1196px',
            background: 'rgba(0,0,0,0.50)',
            backdropFilter: 'blur(29.1px)',
            WebkitBackdropFilter: 'blur(29.1px)',
            borderRadius: '40px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Logo watermark */}
          <Image
            src="/logo.png"
            alt=""
            width={570}
            height={592}
            className="select-none pointer-events-none absolute"
            style={{ opacity: 0.03, top: '-10px', left: '306px' }}
          />

          <div className="w-full max-w-sm px-4 sm:px-0">

            <h1 className="text-white text-3xl font-bold mb-7">Login</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-white/60 text-xs tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="Username@gmail.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })) }}
                  style={{
                    ...baseInput,
                    border: fieldErrors.email ? RED_BORDER : DEFAULT_BORDER,
                    boxShadow: fieldErrors.email ? RED_SHADOW : 'none',
                  }}
                  className="placeholder-white/30 focus:border-blue-500 transition-colors"
                />
                {fieldErrors.email && <p className="text-red-400 text-xs mt-0.5">{fieldErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-white/60 text-xs tracking-wider">Password</label>
                  <Link href="/forgot-password" className="text-white/40 text-xs hover:text-white/70 transition-colors">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: '' })) }}
                    style={{
                      ...baseInput,
                      padding: '0 40px 0 16px',
                      border: fieldErrors.password ? RED_BORDER : DEFAULT_BORDER,
                      boxShadow: fieldErrors.password ? RED_SHADOW : 'none',
                    }}
                    className="placeholder-white/30 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
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
                    )}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-red-400 text-xs mt-0.5">{fieldErrors.password}</p>}
              </div>

              {/* API Error */}
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}

              {/* Sign in */}
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
                  padding: '0 16px',
                }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <span className="text-white/40 text-xs">Or Continue With</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Google */}
            <div className="flex justify-center mb-6">
              <button
                type="button"
                disabled={googleLoading}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                onClick={handleGoogleClick}
              >
                {googleLoading ? (
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
              </button>
            </div>

            {/* Register */}
            <p className="text-center text-white/40 text-xs">
              Don&apos;t have an account yet?{' '}
              <Link href="/register" className="text-white font-semibold hover:text-blue-300 transition-colors">
                Register for free
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
