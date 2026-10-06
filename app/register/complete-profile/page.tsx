'use client'

import Link from 'next/link'
import { mapServerErrors, summarize } from '@/app/lib/formErrors'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/app/context/AuthContext'
import {
  AuthShell, Field, TextInput, ActionBtn,
  GenerationSelect, PolicyList, AgreeCheckbox, PRIMARY_BUTTON,
} from '@/app/components/AuthForm'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

type FieldErrors = {
  name: string
  nickname: string
  department: string
  studentId: string
  joinYear: string
  agreed: string
}

const EMPTY_ERRORS: FieldErrors = {
  name: '', nickname: '', department: '', studentId: '', joinYear: '', agreed: '',
}

// 서버가 쓰는 필드명 → 이 폼의 필드명 (generation 만 이름이 다르다)
const SERVER_FIELD_MAP = {
  name: 'name', nickname: 'nickname',
  department: 'department', studentId: 'studentId', generation: 'joinYear',
} as const

// errors 배열 없이 코드만 오는 오류도 해당 칸 밑에 붙인다
const SERVER_CODE_MAP = {
  NICKNAME_ALREADY_EXISTS: 'nickname',
} as const

// 정책 링크는 같은 탭에서 열리므로, 다녀와도 입력이 남도록 임시 저장한다 (회원가입과 같은 방식)
const DRAFT_KEY = 'complete_profile_draft'

export default function CompleteProfilePage() {
  const router = useRouter()
  const { refetch } = useAuthContext()

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [department, setDepartment] = useState('')
  const [studentId, setStudentId] = useState('')
  const [joinYear, setJoinYear] = useState('')
  const [agreed, setAgreed] = useState(false)

  // nickname check
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null)
  const [nicknameChecking, setNicknameChecking] = useState(false)
  const [nicknameMsg, setNicknameMsg] = useState('')
  const [checkedNickname, setCheckedNickname] = useState('')

  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS)

  function clearField(key: keyof FieldErrors) {
    setFieldErrors((p) => ({ ...p, [key]: '' }))
  }

  // ── sessionStorage 복원 (마운트 시 1회) ─────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY)
      if (!saved) return
      const d = JSON.parse(saved)
      if (d.name)       setName(d.name)
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
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        name, nickname, department, studentId, joinYear, agreed,
        checkedNickname, nicknameAvailable,
      }))
    } catch { /* 저장 실패 무시 */ }
  }, [name, nickname, department, studentId, joinYear, agreed, checkedNickname, nicknameAvailable])

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
      // 응답은 { data: { available } } 로 한 겹 감싸져 온다
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

  function validate(): FieldErrors {
    const e = { ...EMPTY_ERRORS }
    if (!name.trim()) e.name = '이름을 입력해주세요.'
    if (!nickname.trim()) e.nickname = '닉네임을 입력해주세요.'
    else if (nicknameAvailable !== true || nickname !== checkedNickname) e.nickname = '닉네임 중복 확인을 해주세요.'
    if (!department.trim()) e.department = '학과를 입력해주세요.'
    if (!studentId.trim()) e.studentId = '학번을 입력해주세요.'
    if (!joinYear) e.joinYear = '동아리 가입년도를 선택해주세요.'
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
      const res = await fetch(`${API_URL}/v1/auth/complete-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          nickname,
          department,
          studentId,
          generation: generationYear,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        // 서버는 어느 필드가 왜 틀렸는지 알려준다. 그 칸 밑에 바로 보여줘야
        // 사용자가 무엇을 고쳐야 할지 알 수 있다.
        const mapped = mapServerErrors(data, SERVER_FIELD_MAP, SERVER_CODE_MAP)
        setFieldErrors({ ...EMPTY_ERRORS, ...mapped.fieldErrors })
        setApiError(summarize(mapped, data, '프로필 등록에 실패했습니다. 다시 시도해주세요.'))
        return
      }

      sessionStorage.removeItem(DRAFT_KEY)

      // 프로필 입력까지만 끝났고 로그인은 관리자 승인 후다 (서버가 토큰을 주지 않는다)
      if ((data?.data ?? data)?.approvalStatus === 'AWAITING_APPROVAL') {
        router.push('/register/pending')
        return
      }

      await refetch()
      router.push('/')
    } catch {
      setApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const nicknameOk = nicknameAvailable === true && nickname === checkedNickname

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[860px] px-5 sm:px-8">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/40 bg-brand/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#6E95FF]" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="text-xs font-medium text-[#8DB0FF]">Google 계정으로 가입</span>
          </div>
          <h1 className="mb-1.5 text-3xl font-bold text-white">프로필 완성</h1>
          <p className="text-sm text-fg-faint">동아리 활동에 필요한 정보를 입력해주세요.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">

            {/* ── 왼쪽 열 ── */}
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

            {/* ── 오른쪽 열 ── */}
            <div className="flex flex-col gap-4">
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
                {loading ? '등록 중...' : '가입 완료'}
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
      </div>
    </AuthShell>
  )
}
