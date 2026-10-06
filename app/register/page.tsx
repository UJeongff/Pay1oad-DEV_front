'use client'

import Link from 'next/link'
import { mapServerErrors, summarize } from '@/app/lib/formErrors'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/app/context/AuthContext'
import {
  AuthShell, StepIndicator, Field, TextInput, PasswordInput, ActionBtn,
  GenerationSelect, PolicyList, AgreeCheckbox, PRIMARY_BUTTON,
} from '@/app/components/AuthForm'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

const STEPS = ['정보 입력', '이메일 인증', '가입 완료']

// 서버가 쓰는 필드명 → 이 폼의 필드명 (generation 만 이름이 다르다)
const SERVER_FIELD_MAP = {
  name: 'name', email: 'email', password: 'password', nickname: 'nickname',
  department: 'department', studentId: 'studentId', generation: 'joinYear',
} as const

// errors 배열 없이 코드만 오는 오류도 해당 칸 밑에 붙인다
const SERVER_CODE_MAP = {
  EMAIL_ALREADY_EXISTS: 'email',
  OAUTH_ACCOUNT_EXISTS: 'email',
  NICKNAME_ALREADY_EXISTS: 'nickname',
} as const

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

type Msg = { tone: 'ok' | 'error'; text: string } | null

// 인증을 마친 뒤 어디로 가는지 — 완료 화면의 안내 문구도 이걸로 정한다
type NextStop = 'home' | 'pending' | 'login'

const NEXT_STOP_TEXT: Record<NextStop, string> = {
  home: '바로 로그인해서 홈으로 이동합니다.',
  pending: '잠시 후 운영진 승인 안내 페이지로 이동합니다.',
  login: '잠시 후 로그인 페이지로 이동합니다.',
}

export default function RegisterPage() {
  const router = useRouter()
  const { refetch } = useAuthContext()

  // form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [department, setDepartment] = useState('')
  const [studentId, setStudentId] = useState('')
  const [joinYear, setJoinYear] = useState('')
  const [agreed, setAgreed] = useState(false)

  // email verification (after signup)
  const [signupDone, setSignupDone] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [emailMsg, setEmailMsg] = useState<Msg>(null)
  const [nextStop, setNextStop] = useState<NextStop | null>(null)
  const [emailResending, setEmailResending] = useState(false)
  const emailVerified = nextStop !== null

  // nickname check
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null)
  const [nicknameChecking, setNicknameChecking] = useState(false)
  const [nicknameMsg, setNicknameMsg] = useState('')
  const [checkedNickname, setCheckedNickname] = useState('')

  // submit
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS)

  // invite code (URL ?invite=)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  // 'error' 는 "코드가 무효"가 아니라 "확인을 못 했다"는 뜻이다. 둘을 섞으면
  // 서버가 잠깐 느린 것만으로 멀쩡한 초대 코드가 만료된 것처럼 보인다.
  const [inviteState, setInviteState] = useState<'unchecked' | 'valid' | 'invalid' | 'error'>('unchecked')
  const [inviteRetry, setInviteRetry] = useState(0)

  // URL에서 invite 코드 추출 + 유효성 사전 검증
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('invite')?.trim()
    if (!code) return
    setInviteCode(code)

    // 응답이 안 오면 배너가 "확인 중..."에 영영 갇힌다. 8초면 끊는다.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    let done = false

    fetch(`${API_URL}/v1/auth/invite/check?code=${encodeURIComponent(code)}`, { signal: ctrl.signal })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(j => {
        done = true
        // usable 이 응답에 아예 없으면 확인한 게 아니다
        const usable = j?.data?.usable
        setInviteState(usable === true ? 'valid' : usable === false ? 'invalid' : 'error')
      })
      .catch(() => { done = true; setInviteState('error') })
      .finally(() => { clearTimeout(timer); if (!done) setInviteState('error') })

    return () => { clearTimeout(timer); ctrl.abort() }
  }, [inviteRetry])

  function clearField(key: keyof FieldErrors) {
    setFieldErrors((p) => ({ ...p, [key]: '' }))
  }

  // ── sessionStorage 복원 (마운트 시 1회) ─────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('register_draft')
      if (!saved) return
      const d = JSON.parse(saved)
      if (d.name)       setName(d.name)
      if (d.email)      setEmail(d.email)
      if (d.password)   setPassword(d.password)
      if (d.nickname)   setNickname(d.nickname)
      if (d.department) setDepartment(d.department)
      if (d.studentId)  setStudentId(d.studentId)
      if (d.joinYear)   setJoinYear(d.joinYear)
      if (d.agreed)     setAgreed(d.agreed)
      if (d.checkedNickname) {
        setCheckedNickname(d.checkedNickname)
        setNicknameAvailable(d.nicknameAvailable ?? null)
      }
    } catch { /* 손상된 데이터 무시 */ }
  }, [])

  // ── sessionStorage 저장 (필드 변경 시마다) ──────────────────────
  useEffect(() => {
    if (signupDone) return
    try {
      sessionStorage.setItem('register_draft', JSON.stringify({
        name, email, password, nickname, department, studentId, joinYear, agreed,
        checkedNickname, nicknameAvailable,
      }))
    } catch { /* 저장 실패 무시 */ }
  }, [name, email, password, nickname, department, studentId, joinYear, agreed, checkedNickname, nicknameAvailable, signupDone])

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
        // 이미 /register 라서 router.push('/register') 로는 화면이 바뀌지 않는다.
        // 상태를 되돌려 입력 화면으로 돌아간다 (입력했던 값은 그대로 남는다).
        setSignupDone(false)
        setEmailCode('')
        setEmailMsg(null)
      } else {
        window.history.pushState(null, '', window.location.href)
      }
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [signupDone, emailVerified, handleBeforeUnload])


  // ── Email verification (after signup) ──────────────────────────
  async function resendEmailCode() {
    setEmailResending(true)
    setEmailMsg(null)
    try {
      const res = await fetch(
        `${API_URL}/v1/auth/email/resend?email=${encodeURIComponent(email)}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setEmailMsg({ tone: 'error', text: data?.message ?? '재발송에 실패했습니다.' })
        return
      }
      setEmailMsg({ tone: 'ok', text: '인증 코드가 재발송되었습니다.' })
    } catch {
      setEmailMsg({ tone: 'error', text: '서버에 연결할 수 없습니다.' })
    } finally {
      setEmailResending(false)
    }
  }

  async function verifyEmailCode() {
    if (emailCode.length !== 6) return
    setEmailVerifying(true)
    setEmailMsg(null)
    try {
      const res = await fetch(
        `${API_URL}/v1/auth/email/verify?email=${encodeURIComponent(email)}&code=${encodeURIComponent(emailCode)}`,
        { method: 'POST' },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setEmailMsg({ tone: 'error', text: data?.message ?? '인증 코드가 올바르지 않습니다.' })
        return
      }
      sessionStorage.removeItem('register_draft')

      // 바로 로그인할지는 서버가 인증하는 순간 초대 코드를 다시 확인해 정한 승인 상태로 따른다.
      // 화면이 미리 확인한 초대 코드 상태는 그사이 만료됐거나 확인에 실패했을 수 있다.
      // (응답에 승인 상태가 없는 이전 서버라면 그 미리 확인한 상태로 대신한다)
      const status = data?.data?.approvalStatus
      const approved = status ? status === 'APPROVED' : inviteState === 'valid'
      if (!approved) {
        setNextStop('pending')
        setTimeout(() => router.push('/register/pending'), 1200)
        return
      }

      setNextStop('home')
      try {
        const loginRes = await fetch(`${API_URL}/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        })
        if (loginRes.ok) {
          await refetch()
          router.push('/')
          return
        }
      } catch { /* 로그인 실패 시 로그인 페이지로 폴백 */ }
      setNextStop('login')
      setTimeout(() => router.push('/login'), 2000)
    } catch {
      setEmailMsg({ tone: 'error', text: '서버에 연결할 수 없습니다.' })
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
          ...(inviteCode ? { inviteCode } : {}),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        // 서버는 어느 필드가 왜 틀렸는지 알려준다. 그 칸 밑에 바로 보여줘야
        // 사용자가 무엇을 고쳐야 할지 알 수 있다.
        const mapped = mapServerErrors(data, SERVER_FIELD_MAP, SERVER_CODE_MAP)
        setFieldErrors({ ...EMPTY_ERRORS, ...mapped.fieldErrors })
        setApiError(summarize(mapped, data, '회원가입에 실패했습니다. 다시 시도해주세요.'))
        return
      }

      // 인증 코드가 이메일로 발송됨 → 인증 화면으로 전환
      sessionStorage.removeItem('register_draft')
      setSignupDone(true)
    } catch {
      setApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const nicknameOk = nicknameAvailable === true && nickname === checkedNickname
  const inviteWarn = inviteState === 'invalid' || inviteState === 'error'

  return (
    <AuthShell>
      <div className="mx-auto flex w-full max-w-[860px] flex-col px-5 sm:px-8">
        <StepIndicator steps={STEPS} current={emailVerified ? STEPS.length : signupDone ? 1 : 0} />

        {signupDone ? (
          /* ── 이메일 인증 화면 ── */
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 py-8">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 ${
                emailVerified ? 'border-status-live/40 bg-status-live/15' : 'border-brand/40 bg-brand/15'
              }`}
            >
              {emailVerified ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-status-live" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6E95FF]" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              )}
            </div>
            <div className="text-center" aria-live="polite">
              {nextStop ? (
                <>
                  <h2 className="mb-2 text-2xl font-bold text-white">인증 완료</h2>
                  <p className="text-sm leading-relaxed text-fg-subtle">
                    이메일 인증이 완료되었습니다.<br />
                    <span className="text-xs text-fg-faint">{NEXT_STOP_TEXT[nextStop]}</span>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-2 text-2xl font-bold text-white">이메일 인증</h2>
                  <p className="text-sm leading-relaxed text-fg-subtle">
                    <span className="font-medium text-fg-muted">{email}</span>로<br />
                    인증 코드 6자리를 보내드렸습니다.
                  </p>
                </>
              )}
            </div>
            {!emailVerified && (
              <div className="flex w-full max-w-sm flex-col gap-2">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); verifyEmailCode() }}
                >
                  <TextInput
                    type="text"
                    aria-label="인증 코드 6자리"
                    placeholder="인증 코드 6자리"
                    // 숫자 키패드 + 문자로 받은 코드 자동 입력
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setEmailMsg(null) }}
                    aria-invalid={emailMsg?.tone === 'error' ? true : undefined}
                    aria-describedby={emailMsg ? 'email-code-msg' : undefined}
                    className="flex-1 font-mono tracking-[0.3em] placeholder:tracking-normal placeholder:font-sans"
                  />
                  <ActionBtn type="submit" disabled={emailCode.length !== 6} loading={emailVerifying}>
                    확인
                  </ActionBtn>
                </form>
                {emailMsg && (
                  <p
                    id="email-code-msg"
                    role={emailMsg.tone === 'ok' ? 'status' : 'alert'}
                    className={`text-xs ${emailMsg.tone === 'ok' ? 'text-status-live-text' : 'text-danger'}`}
                  >
                    {emailMsg.text}
                  </p>
                )}
                <button
                  type="button"
                  onClick={resendEmailCode}
                  disabled={emailResending}
                  className="mt-1 self-start cursor-pointer text-xs text-fg-faint transition-colors hover:text-fg-muted disabled:cursor-wait disabled:opacity-40"
                >
                  {emailResending ? '재발송 중...' : '인증 코드 재발송'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <h1 className="mt-6 mb-8 text-3xl font-bold text-white">회원가입</h1>

            {/* 초대 코드 배너 */}
            {inviteCode && (
              <div
                className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 ${
                  inviteState === 'valid'
                    ? 'border-status-live/35 bg-status-live/10'
                    : inviteWarn
                      ? 'border-status-soon/35 bg-status-soon/10'
                      : 'border-line bg-surface-raised'
                }`}
              >
                <span className="text-base leading-none" aria-hidden="true">
                  {inviteState === 'valid' ? '🔑' : inviteWarn ? '⚠️' : '⌛'}
                </span>
                <div className="text-[13px] leading-normal text-fg-muted" aria-live="polite">
                  {inviteState === 'valid' && (
                    <>
                      <strong>초대 코드가 확인되었습니다.</strong><br />
                      <span className="text-xs text-fg-subtle">
                        가입 완료 시 별도 승인 없이 바로 로그인할 수 있습니다.
                      </span>
                    </>
                  )}
                  {inviteState === 'invalid' && (
                    <>
                      <strong>초대 코드가 만료되었거나 유효하지 않습니다.</strong><br />
                      <span className="text-xs text-fg-subtle">
                        일반 가입으로 진행되며, 가입 후 관리자 승인이 필요합니다.
                      </span>
                    </>
                  )}
                  {inviteState === 'error' && (
                    <>
                      <strong>초대 코드를 확인하지 못했습니다.</strong><br />
                      <span className="text-xs text-fg-subtle">
                        일시적인 네트워크 문제일 수 있습니다. 코드는 가입할 때 서버에서 다시 확인하므로
                        그대로 진행하셔도 됩니다.
                      </span>
                      <br />
                      <button
                        type="button"
                        onClick={() => { setInviteState('unchecked'); setInviteRetry(n => n + 1) }}
                        className="mt-1.5 cursor-pointer rounded-lg border border-line-strong bg-surface-raised px-2.5 py-1 text-xs text-fg-muted transition-colors hover:text-white"
                      >
                        다시 확인
                      </button>
                    </>
                  )}
                  {inviteState === 'unchecked' && '초대 코드 확인 중...'}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">

                {/* ── Left column ── */}
                <div className="flex flex-col gap-4">
                  <Field label="이름" error={fieldErrors.name}>
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        type="text"
                        autoComplete="name"
                        placeholder="홍길동"
                        value={name}
                        onChange={(e) => { setName(e.target.value); clearField('name') }}
                      />
                    )}
                  </Field>

                  <Field label="이메일" error={fieldErrors.email}>
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="username@gmail.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearField('email') }}
                      />
                    )}
                  </Field>

                  <Field label="비밀번호" error={fieldErrors.password} hint="영문, 숫자, 특수문자 포함 8자 이상">
                    {(a11y) => (
                      <PasswordInput
                        {...a11y}
                        autoComplete="new-password"
                        placeholder="8자 이상 입력"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearField('password') }}
                      />
                    )}
                  </Field>

                  <Field
                    label="닉네임"
                    error={fieldErrors.nickname}
                    note={nicknameMsg ? { tone: nicknameAvailable ? 'ok' : 'error', text: nicknameMsg } : null}
                  >
                    {(a11y) => (
                      <div className="flex gap-2">
                        <TextInput
                          {...a11y}
                          type="text"
                          autoComplete="nickname"
                          placeholder="닉네임"
                          value={nickname}
                          success={nicknameOk}
                          onChange={(e) => {
                            setNickname(e.target.value)
                            clearField('nickname')
                            setNicknameAvailable(null)
                            setNicknameMsg('')
                            setCheckedNickname('')
                          }}
                        />
                        <ActionBtn onClick={checkNickname} disabled={!nickname.trim()} loading={nicknameChecking}>
                          중복 확인
                        </ActionBtn>
                      </div>
                    )}
                  </Field>
                </div>

                {/* ── Right column ── */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="학과" error={fieldErrors.department}>
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          type="text"
                          autoComplete="off"
                          placeholder="컴퓨터공학과"
                          value={department}
                          onChange={(e) => { setDepartment(e.target.value); clearField('department') }}
                        />
                      )}
                    </Field>
                    <Field label="학번" error={fieldErrors.studentId}>
                      {(a11y) => (
                        <TextInput
                          {...a11y}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="202235341"
                          value={studentId}
                          onChange={(e) => { setStudentId(e.target.value); clearField('studentId') }}
                        />
                      )}
                    </Field>
                  </div>

                  <Field label="동아리 가입년도" error={fieldErrors.joinYear}>
                    {(a11y) => (
                      <GenerationSelect
                        a11y={a11y}
                        value={joinYear}
                        onChange={(v) => { setJoinYear(v); clearField('joinYear') }}
                      />
                    )}
                  </Field>

                  <PolicyList />

                  <AgreeCheckbox
                    checked={agreed}
                    onChange={(v) => { setAgreed(v); clearField('agreed') }}
                    error={fieldErrors.agreed}
                  />

                  {apiError && <p role="alert" className="text-xs text-danger">{apiError}</p>}

                  <button type="submit" disabled={loading} className={`${PRIMARY_BUTTON} w-full`}>
                    {loading ? '가입 중...' : '가입하기'}
                  </button>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-fg-faint">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="font-semibold text-white transition-colors hover:text-[#8DB0FF]">
                  로그인
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  )
}
