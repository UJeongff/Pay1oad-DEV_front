'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// 1기 = 2018, 9기 = 2026
const GENERATION_OPTIONS = Array.from({ length: 9 }, (_, i) => {
  const gen = 9 - i
  const year = 2017 + gen
  return { value: gen, label: `${year}년 - ${gen}기` }
})

const POLICIES = [
  { label: '개인정보 처리방침', href: 'https://policy.pay1oad.kr/privacy-policy', external: true },
  { label: '개인정보 수집 및 동의', href: 'https://policy.pay1oad.kr/personal-info-consent', external: true },
  { label: '마케팅 및 수신 동의', href: 'https://policy.pay1oad.kr/marketing-consent', external: true },
  { label: '초상권', href: '/policy/portrait-rights', external: false },
]

const RED_BORDER = '1px solid rgba(255,60,60,0.85)'
const RED_SHADOW = '0 0 8px rgba(255,40,40,0.45)'
const DEFAULT_BORDER = '1px solid rgba(255,255,255,0.12)'
const GREEN_BORDER = '1px solid rgba(60,200,100,0.7)'
const GREEN_SHADOW = '0 0 8px rgba(40,200,80,0.35)'

type FieldErrors = {
  name: string
  email: string
  password: string
  nickname: string
  department: string
  studentId: string
  joinYear: string
  agreed: string
}

const EMPTY_ERRORS: FieldErrors = {
  name: '', email: '', password: '', nickname: '',
  department: '', studentId: '', joinYear: '', agreed: '',
}

const baseInput: React.CSSProperties = {
  height: '42px',
  padding: '0 16px',
  background: 'rgba(255,255,255,0.07)',
  borderRadius: '6px',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  transition: 'border 0.15s, box-shadow 0.15s',
}

function iStyle(hasError: boolean, isSuccess = false): React.CSSProperties {
  if (isSuccess) return { ...baseInput, border: GREEN_BORDER, boxShadow: GREEN_SHADOW }
  return {
    ...baseInput,
    border: hasError ? RED_BORDER : DEFAULT_BORDER,
    boxShadow: hasError ? RED_SHADOW : 'none',
  }
}

function ActionBtn({
  onClick, disabled, loading, children,
}: { onClick: () => void; disabled: boolean; loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        height: '42px',
        padding: '0 14px',
        background: disabled ? 'rgba(255,255,255,0.05)' : 'rgba(0,65,239,0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '6px',
        color: disabled ? 'rgba(255,255,255,0.3)' : 'white',
        fontSize: '12px',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}
    >
      {loading ? '...' : children}
    </button>
  )
}

export default function RegisterPage() {
  const router = useRouter()

  // form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nickname, setNickname] = useState('')
  const [department, setDepartment] = useState('')
  const [studentId, setStudentId] = useState('')
  const [joinYear, setJoinYear] = useState('')
  const [agreed, setAgreed] = useState(false)

  // email verification (after signup)
  const [signupDone, setSignupDone] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailResending, setEmailResending] = useState(false)

  // nickname check
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null)
  const [nicknameChecking, setNicknameChecking] = useState(false)
  const [nicknameMsg, setNicknameMsg] = useState('')
  const [checkedNickname, setCheckedNickname] = useState('')

  // submit
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS)

  function clearField(key: keyof FieldErrors) {
    setFieldErrors((p) => ({ ...p, [key]: '' }))
  }

  // ── 이메일 인증 전 이탈 방지 ────────────────────────────────────
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault()
    e.returnValue = ''
  }, [])

  useEffect(() => {
    if (!signupDone || emailVerified) return

    // 브라우저 새로고침/탭 닫기 경고
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 브라우저 뒤로가기 가로채기
    window.history.pushState(null, '', window.location.href)
    const handlePopState = () => {
      const confirmed = window.confirm(
        '이메일 인증을 완료하지 않으면 회원가입이 취소됩니다.\n정말 나가시겠습니까?'
      )
      if (confirmed) {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        router.push('/register')
      } else {
        window.history.pushState(null, '', window.location.href)
      }
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [signupDone, emailVerified, handleBeforeUnload, router])


  // ── Email verification (after signup) ──────────────────────────
  async function resendEmailCode() {
    setEmailResending(true)
    setEmailMsg('')
    try {
      const res = await fetch(
        `${API_URL}/v1/auth/email/resend?email=${encodeURIComponent(email)}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setEmailMsg(data?.message ?? '재발송에 실패했습니다.')
        return
      }
      setEmailMsg('인증 코드가 재발송되었습니다.')
    } catch {
      setEmailMsg('서버에 연결할 수 없습니다.')
    } finally {
      setEmailResending(false)
    }
  }

  async function verifyEmailCode() {
    if (!emailCode.trim()) return
    setEmailVerifying(true)
    setEmailMsg('')
    try {
      const res = await fetch(
        `${API_URL}/v1/auth/email/verify?email=${encodeURIComponent(email)}&code=${encodeURIComponent(emailCode)}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setEmailMsg(data?.message ?? '인증 코드가 올바르지 않습니다.')
        return
      }
      setEmailVerified(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setEmailMsg('서버에 연결할 수 없습니다.')
    } finally {
      setEmailVerifying(false)
    }
  }

  // ── Nickname check ──────────────────────────────────────────────
  async function checkNickname() {
    if (!nickname.trim()) {
      setFieldErrors((p) => ({ ...p, nickname: '닉네임을 입력해주세요.' }))
      return
    }
    setNicknameChecking(true)
    setNicknameMsg('')
    try {
      const res = await fetch(`${API_URL}/v1/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`)
      const data = await res.json().catch(() => null)
      if (!res.ok || data?.data?.available === false) {
        setNicknameAvailable(false)
        setNicknameMsg('이미 사용 중인 닉네임입니다.')
      } else {
        setNicknameAvailable(true)
        setCheckedNickname(nickname)
        clearField('nickname')
        setNicknameMsg('사용 가능한 닉네임입니다.')
      }
    } catch {
      setNicknameMsg('확인 중 오류가 발생했습니다.')
    } finally {
      setNicknameChecking(false)
    }
  }

  // ── Validation & Submit ─────────────────────────────────────────
  function validate(): FieldErrors {
    const e = { ...EMPTY_ERRORS }
    if (!name.trim()) e.name = '이름을 입력해주세요.'
    if (!email.trim()) e.email = '이메일을 입력해주세요.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '올바른 이메일 형식이 아닙니다.'
    if (!password) e.password = '비밀번호를 입력해주세요.'
    else if (password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다.'
    else if (!/[a-zA-Z]/.test(password)) e.password = '영문자를 포함해야 합니다.'
    else if (!/[0-9]/.test(password)) e.password = '숫자를 포함해야 합니다.'
    else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) e.password = '특수문자를 포함해야 합니다.'
    if (!nickname.trim()) e.nickname = '닉네임을 입력해주세요.'
    else if (nicknameAvailable !== true || nickname !== checkedNickname) e.nickname = '닉네임 중복 확인을 해주세요.'
    if (!department.trim()) e.department = '학과를 입력해주세요.'
    if (!studentId.trim()) e.studentId = '학번을 입력해주세요.'
    if (!joinYear) e.joinYear = '가입년도를 선택해주세요.'
    if (!agreed) e.agreed = '정책에 동의해주세요.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.values(errs).some(Boolean)) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors(EMPTY_ERRORS)
    setApiError('')
    setLoading(true)

    const generationYear = parseInt(joinYear)

    try {
      const res = await fetch(`${API_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, password, nickname,
          department, studentId, generation: generationYear,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setApiError(data?.message ?? '회원가입에 실패했습니다. 다시 시도해주세요.')
        return
      }

      // 인증 코드가 이메일로 발송됨 → 인증 화면으로 전환
      setSignupDone(true)
    } catch {
      setApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">

      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/background.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.62)' }} />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen pt-10 px-[8.5vw]">

        {/* Card */}
        <div
          className="w-full flex flex-col items-center py-8 relative overflow-hidden"
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
            style={{ opacity: 0.03, top: '-10px', left: '314px' }}
          />

          <div style={{ width: 'min(860px, 100%)', padding: '0 24px', minHeight: '480px', display: 'flex', flexDirection: 'column', justifyContent: signupDone ? 'center' : 'flex-start' }}>

            {signupDone ? (
              /* ── 이메일 인증 화면 ── */
              <div className="flex flex-col items-center gap-6 py-8">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
                  style={emailVerified
                    ? { background: 'rgba(40,200,80,0.15)', border: '1px solid rgba(40,200,80,0.4)' }
                    : { background: 'rgba(0,65,239,0.15)', border: '1px solid rgba(0,65,239,0.3)' }
                  }
                >
                  {emailVerified ? (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4d8fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  )}
                </div>
                <div className="text-center">
                  {emailVerified ? (
                    <>
                      <h2 className="text-white text-2xl font-bold mb-2">인증 완료</h2>
                      <p className="text-white/50 text-sm leading-relaxed">
                        이메일 인증이 완료되었습니다.<br />
                        <span className="text-white/40 text-xs">잠시 후 로그인 페이지로 이동합니다.</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-white text-2xl font-bold mb-2">이메일 인증</h2>
                      <p className="text-white/50 text-sm leading-relaxed">
                        <span className="text-white/70 font-medium">{email}</span>로<br />
                        인증 코드 6자리를 보내드렸습니다.
                      </p>
                    </>
                  )}
                </div>
                {!emailVerified && (
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="인증 코드 6자리 입력"
                        value={emailCode}
                        onChange={(e) => { setEmailCode(e.target.value); setEmailMsg('') }}
                        style={{
                          ...baseInput,
                          border: DEFAULT_BORDER,
                          flex: 1,
                        }}
                        className="placeholder-white/30 focus:border-blue-500 transition-colors"
                      />
                      <ActionBtn onClick={verifyEmailCode} disabled={!emailCode.trim()} loading={emailVerifying}>
                        확인
                      </ActionBtn>
                    </div>
                    {emailMsg && <p className="text-red-400 text-xs">{emailMsg}</p>}
                    <button
                      type="button"
                      onClick={resendEmailCode}
                      disabled={emailResending}
                      className="text-white/40 text-xs hover:text-white/70 transition-colors mt-1 self-start disabled:opacity-40"
                    >
                      {emailResending ? '재발송 중...' : '인증 코드 재발송'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
            <>
            <h1 className="text-white text-3xl font-bold mb-8">Sign up</h1>

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-2 gap-x-10 gap-y-4">

                {/* ── Left column ── */}
                <div className="flex flex-col gap-4">

                  {/* Name */}
                  <Field label="Name" error={fieldErrors.name}>
                    <input
                      type="text"
                      placeholder="홍길동"
                      value={name}
                      onChange={(e) => { setName(e.target.value); clearField('name') }}
                      style={iStyle(!!fieldErrors.name)}
                      className="placeholder-white/30 focus:border-blue-500 transition-colors"
                    />
                  </Field>

                  {/* Email */}
                  <Field label="Email" error={fieldErrors.email}>
                    <input
                      type="email"
                      placeholder="Username@gmail.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                      style={iStyle(!!fieldErrors.email)}
                      className="placeholder-white/30 focus:border-blue-500 transition-colors"
                    />
                  </Field>

                  {/* Password */}
                  <Field label="Password" error={fieldErrors.password}>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="8자 이상 입력"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearField('password') }}
                        style={{ ...iStyle(!!fieldErrors.password), paddingRight: '40px' }}
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
                    {!fieldErrors.password && (
                      <p className="text-white/30 text-xs mt-0.5">영문, 숫자, 특수문자 포함 8자 이상</p>
                    )}
                  </Field>

                  {/* Nickname + 중복 확인 */}
                  <Field label="Nickname" error={fieldErrors.nickname}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="닉네임"
                        value={nickname}
                        onChange={(e) => {
                          setNickname(e.target.value)
                          clearField('nickname')
                          setNicknameAvailable(null)
                          setNicknameMsg('')
                          setCheckedNickname('')
                        }}
                        style={iStyle(!!fieldErrors.nickname, nicknameAvailable === true && nickname === checkedNickname)}
                        className="placeholder-white/30 focus:border-blue-500 transition-colors"
                      />
                      <ActionBtn
                        onClick={checkNickname}
                        disabled={!nickname.trim()}
                        loading={nicknameChecking}
                      >
                        중복 확인
                      </ActionBtn>
                    </div>
                    {nicknameMsg && (
                      <p className={`text-xs mt-0.5 ${nicknameAvailable ? 'text-green-400' : 'text-red-400'}`}>
                        {nicknameMsg}
                      </p>
                    )}
                  </Field>
                </div>

                {/* ── Right column ── */}
                <div className="flex flex-col gap-4">

                  {/* 학과 + 학번 */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="학과" error={fieldErrors.department}>
                      <input
                        type="text"
                        placeholder="컴퓨터공학과"
                        value={department}
                        onChange={(e) => { setDepartment(e.target.value); clearField('department') }}
                        style={iStyle(!!fieldErrors.department)}
                        className="placeholder-white/30 focus:border-blue-500 transition-colors"
                      />
                    </Field>
                    <Field label="학번" error={fieldErrors.studentId}>
                      <input
                        type="text"
                        placeholder="202235341"
                        value={studentId}
                        onChange={(e) => { setStudentId(e.target.value); clearField('studentId') }}
                        style={iStyle(!!fieldErrors.studentId)}
                        className="placeholder-white/30 focus:border-blue-500 transition-colors"
                      />
                    </Field>
                  </div>

                  {/* 가입년도 */}
                  <Field label="동아리 가입년도" error={fieldErrors.joinYear}>
                    <GenerationSelect
                      value={joinYear}
                      onChange={(v) => { setJoinYear(v); clearField('joinYear') }}
                      hasError={!!fieldErrors.joinYear}
                    />
                  </Field>

                  {/* Policy */}
                  <Field label="정책">
                    <div
                      className="rounded-md p-3 flex flex-col gap-2"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        minHeight: '120px',
                      }}
                    >
                      {POLICIES.map(({ label, href, external }) => (
                        <Link
                          key={label}
                          href={href}
                          target={external ? '_blank' : undefined}
                          rel={external ? 'noopener noreferrer' : undefined}
                          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-blue-300 transition-colors group"
                        >
                          <svg
                            className="shrink-0 text-white/25 group-hover:text-blue-400 transition-colors"
                            width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                          >
                            {external ? (
                              <>
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </>
                            ) : (
                              <path d="M9 18l6-6-6-6" />
                            )}
                          </svg>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </Field>

                  {/* Agree checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: agreed ? '#0041EF' : 'rgba(255,255,255,0.07)',
                        border: fieldErrors.agreed
                          ? RED_BORDER
                          : `1px solid ${agreed ? '#0041EF' : 'rgba(255,255,255,0.20)'}`,
                        boxShadow: fieldErrors.agreed ? RED_SHADOW : 'none',
                      }}
                    >
                      {agreed && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                          <polyline points="2 6 5 9 10 3" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => { setAgreed(e.target.checked); clearField('agreed') }}
                      className="sr-only"
                    />
                    <span className="text-white/55 text-xs">위 정책을 모두 확인했습니다</span>
                  </label>
                  {fieldErrors.agreed && <p className="text-red-400 text-xs -mt-2">{fieldErrors.agreed}</p>}

                  {/* API Error */}
                  {apiError && <p className="text-red-400 text-xs">{apiError}</p>}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
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
                      width: '100%',
                    }}
                  >
                    {loading ? 'Processing...' : 'Sign Up'}
                  </button>
                </div>
              </div>

              {/* Sign in link */}
              <p className="text-center text-white/40 text-xs mt-6">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="text-white font-semibold hover:text-blue-300 transition-colors">
                  로그인
                </Link>
              </p>
            </form>
            </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function GenerationSelect({ value, onChange, hasError }: {
  value: string
  onChange: (v: string) => void
  hasError: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = GENERATION_OPTIONS.find((o) => String(o.value) === value)

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 50 : 'auto' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: '42px',
          width: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.07)',
          border: hasError ? '1px solid rgba(255,60,60,0.85)' : open ? '1px solid rgba(0,65,239,0.6)' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: '6px',
          color: selected ? 'white' : 'rgba(255,255,255,0.3)',
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: hasError ? '0 0 8px rgba(255,40,40,0.45)' : 'none',
          transition: 'border 0.15s, box-shadow 0.15s',
        }}
      >
        <span>{selected ? selected.label : '선택해주세요'}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(8,10,22,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.10)',
            overflow: 'hidden',
            overflowY: 'auto',
            maxHeight: '260px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {GENERATION_OPTIONS.map((opt) => {
            const isSelected = String(opt.value) === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(String(opt.value)); setOpen(false) }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: isSelected ? '#0041EF' : 'transparent',
                  color: isSelected ? 'white' : 'rgba(255,255,255,0.75)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.background = 'rgba(0,65,239,0.45)'; e.currentTarget.style.color = 'white' } }}
                onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' } }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-white/60 text-xs tracking-wider">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-0.5">{error}</p>}
    </div>
  )
}
