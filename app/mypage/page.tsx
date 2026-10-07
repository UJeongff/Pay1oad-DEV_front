'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/app/context/AuthContext'
import AccountPanel from '@/app/mypage/AccountPanel'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { CATEGORY_LABEL, CATEGORY_STYLE, formatDate, type PostCategory } from '@/app/lib/postCategory'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyPost { id: number; title: string; category: PostCategory; createdAt: string }
interface MyComment { commentId: number; content: string; postTitle: string; postId: number; createdAt: string }

// Content 목록 (GET /v1/contents)
interface ContentSummary { id: number; title: string; type: string; isMember: boolean }
// Content 상세 (GET /v1/contents/{id}) - isLeader 포함
interface ContentDetail { id: number; title: string; type: string; isMember: boolean; isLeader: boolean }

// 공지 (GET /v1/contents/{contentId}/notices/all)
interface ContentNotice {
  id: number
  title: string
  content: string
  startAt: string   // LocalDate → "YYYY-MM-DD"
  endAt: string
  createdAt: string
}

// 부원 (GET /v1/admin/users)
interface SiteUser {
  id: number
  nickname: string
  name: string
  email: string
  roles: string[]
  status: 'ACTIVE' | 'BREAK' | 'OB' | 'LEAVE'
  department?: string
  studentId?: string
  generation?: number
}

// 지원하기/모집 (GET /v1/admin/recruitment)
type RecruitStatus = 'RECRUITING' | 'UPCOMING' | 'CLOSED'

interface Recruitment {
  id: number
  title: string
  applyUrl: string
  startAt: string   // LocalDateTime
  endAt: string
  isActive: boolean
  status?: RecruitStatus
  generation?: number
  createdAt: string
}

type Tab = 'posts' | 'comments' | 'likes' | 'notices' | 'members' | 'recruitment' | 'account'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseList<T>(json: unknown): T[] {
  if (!json) return []
  const j = json as Record<string, unknown>
  if (Array.isArray(j)) return j as T[]
  if (j.data) {
    const d = j.data as Record<string, unknown>
    if (Array.isArray(d)) return d as T[]
    if (d.content && Array.isArray(d.content)) return d.content as T[]
  }
  if (j.content && Array.isArray(j.content)) return j.content as T[]
  return []
}

const fmtDate = formatDate

function fmtDateTime(s: string) {
  const d = new Date(s)
  return `${formatDate(s)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── 내 게시글 / 댓글 / 좋아요: 10개씩 더 불러온다 ─────────────────────────

type ListKey = 'posts' | 'comments' | 'likes'

interface ListState<T> {
  items: T[]
  page: number        // 마지막으로 불러온 페이지 (0부터)
  last: boolean       // 더 불러올 게 없음
  total: number       // 전체 개수 (서버 totalElements)
  loading: boolean    // 첫 페이지 불러오는 중
  loadingMore: boolean
  error: boolean
}

type Lists = { posts: ListState<MyPost>; comments: ListState<MyComment>; likes: ListState<MyPost> }

const PAGE_SIZE = 10
const LIST_ENDPOINT: Record<ListKey, string> = {
  posts: '/v1/mypage/posts',
  comments: '/v1/mypage/comments',
  likes: '/v1/mypage/likes',
}
const EMPTY_LIST = { items: [], page: 0, last: true, total: 0, loading: true, loadingMore: false, error: false }

// 공지 폼에서 저장 버튼이 꺼지는 이유를 그대로 보여준다
function noticeFormProblem(
  form: { title: string; content: string; startAt: string; endAt: string },
  datesRequired: boolean,
) {
  if (!form.title.trim()) return '제목을 입력해주세요.'
  if (!form.content.trim()) return '내용을 입력해주세요.'
  if (datesRequired && (!form.startAt || !form.endAt)) return '시작일과 종료일을 입력해주세요.'
  if (form.startAt && form.endAt && form.endAt < form.startAt) return '종료일이 시작일보다 빠릅니다.'
  return null
}

async function errorMessage(res: Response, fallback: string) {
  const data = await res.json().catch(() => null)
  return (data?.message as string | undefined) ?? fallback
}

function toDateInput(s: string) {
  return s ? s.slice(0, 10) : ''
}

function hasAdminRole(roles: string[]) {
  return roles.some(r => r.toUpperCase().includes('ADMIN'))
}

const STATUS_LABEL: Record<string, string> = { ACTIVE: '활동', BREAK: '휴학', OB: 'OB', LEAVE: '탈퇴' }
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-400/10',
  BREAK:  'text-yellow-400 bg-yellow-400/10',
  OB:     'text-fg-muted bg-surface-raised',
  LEAVE:  'text-danger bg-danger/10',
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#0b1630', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MypagePage() {
  const { user, loading: authLoading, clearUser, refetch } = useAuthContext()
  const router = useRouter()
  const isAdmin = user?.role === 'ADMIN'

  // ── tab ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('posts')

  // ── base tabs ─────────────────────────────────────────────────────────────
  const [lists, setLists] = useState<Lists>({ posts: EMPTY_LIST, comments: EMPTY_LIST, likes: EMPTY_LIST })
  const [tabLoading, setTabLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  // 계정 탭에서 쓸 상세 정보 (AuthContext 의 user 에는 학과가 없다)
  const [myDetail, setMyDetail] = useState<{ nickname: string; email: string; department: string } | null>(null)
  const [myDetailError, setMyDetailError] = useState(false)

  const fetchMyDetail = useCallback(async () => {
    setMyDetailError(false)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/users/me`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      const d = json?.data ?? json
      setMyDetail({ nickname: d?.nickname ?? '', email: d?.email ?? '', department: d?.department ?? '' })
    } catch {
      // 실패하면 계정 탭에 다시 시도 버튼을 보여준다 (다른 탭은 그대로 동작)
      setMyDetailError(true)
    }
  }, [])

  // ── 공지 관리 ─────────────────────────────────────────────────────────────
  // 유저가 team_leader인 컨텐츠 목록 (페이지 로드 시 감지)
  const [ledContents, setLedContents] = useState<ContentDetail[]>([])
  // 공지 탭에서 보여줄 컨텐츠 목록 (admin=전체, leader=본인 리드)
  const [noticeContents, setNoticeContents] = useState<ContentSummary[]>([])
  const [selectedContent, setSelectedContent] = useState<ContentSummary | null>(null)
  const [contentNotices, setContentNotices] = useState<ContentNotice[]>([])
  const [noticesLoading, setNoticesLoading] = useState(false)
  // 공지 CRUD 모달
  const [editNotice, setEditNotice] = useState<ContentNotice | null>(null)
  const [createNoticeOpen, setCreateNoticeOpen] = useState(false)
  const [deleteNoticeId, setDeleteNoticeId] = useState<number | null>(null)
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', startAt: '', endAt: '' })
  const [noticeActionLoading, setNoticeActionLoading] = useState(false)
  const [noticeError, setNoticeError] = useState<string | null>(null)
  const [noticeTarget, setNoticeTarget] = useState<'ALL' | 'CONTENT'>('CONTENT')
  const [noticeTargetContentId, setNoticeTargetContentId] = useState<number | null>(null)

  // ── 부원 관리 ─────────────────────────────────────────────────────────────
  const [members, setMembers]       = useState<SiteUser[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>('')
  const [editMember, setEditMember] = useState<SiteUser | null>(null)
  const [deleteMemberId, setDeleteMemberId] = useState<number | null>(null)
  const [memberStatusForm, setMemberStatusForm] = useState<'ACTIVE' | 'BREAK' | 'OB' | 'LEAVE'>('ACTIVE')
  const [memberActionLoading, setMemberActionLoading] = useState(false)

  // ── 지원하기 관리 ─────────────────────────────────────────────────────────
  const [recruitments, setRecruitments]   = useState<Recruitment[]>([])
  const [editRecruitment, setEditRecruitment] = useState<Recruitment | null>(null)
  const [createRecruitOpen, setCreateRecruitOpen] = useState(false)
  const [deleteRecruitId, setDeleteRecruitId] = useState<number | null>(null)
  const [recruitForm, setRecruitForm] = useState({
    title: '', applyUrl: '', startAt: '', endAt: '',
    status: 'UPCOMING' as RecruitStatus,
    generation: '',
  })
  const [recruitActionLoading, setRecruitActionLoading] = useState(false)

  // ─── 페이지 로드 시 team_leader 여부 감지 ─────────────────────────────────

  useEffect(() => {
    if (authLoading || !user) return

    async function detectLeaderContents() {
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/contents`)
        if (!res.ok) return
        const json = await res.json()
        const all: ContentSummary[] = parseList<ContentSummary>(json)

        if (isAdmin) {
          // admin은 모든 컨텐츠에 접근 가능
          setNoticeContents(all)
          setLedContents([]) // admin은 별도 구분 불필요
        } else {
          // 내가 멤버인 컨텐츠만 detail 조회해서 isLeader 확인
          const memberContents = all.filter(c => c.isMember)
          const details = await Promise.all(
            memberContents.map(c =>
              fetchWithAuth(`${API_URL}/v1/contents/${c.id}`)
                .then(r => r.ok ? r.json() : null)
                .then(j => {
                  const raw = j?.data ?? j
                  return raw ? {
                    id: raw.id,
                    title: raw.title,
                    type: raw.type,
                    isMember: raw.isMember,
                    isLeader: raw.isLeader,
                  } as ContentDetail : null
                })
                .catch(() => null)
            )
          )
          const led = details.filter((d): d is ContentDetail => d !== null && d.isLeader)
          setLedContents(led)
          setNoticeContents(led.map(d => ({ id: d.id, title: d.title, type: d.type, isMember: true })))
        }
      } catch {}
    }
    detectLeaderContents()
  }, [authLoading, user, isAdmin])

  // ADMIN은 /admin 콘솔에서 공지/부원/지원 관리 → mypage에서는 숨김
  // 팀장(team_leader)만 mypage에서 공지 관리 유지
  const canManageNotices = !isAdmin && ledContents.length > 0

  // 고른 스터디가 없으면 첫 번째를 보여준다 (하나만 맡고 있으면 고를 필요가 없다)
  const activeContent = selectedContent ?? noticeContents[0] ?? null
  const activeContentId = activeContent?.id ?? null

  const TABS: { key: Tab; label: string }[] = [
    { key: 'posts',       label: '내 게시글' },
    { key: 'comments',    label: '내 댓글' },
    { key: 'likes',       label: '좋아요한 게시글' },
    ...(canManageNotices  ? [{ key: 'notices'     as Tab, label: '공지 관리' }] : []),
    { key: 'account',     label: '계정' },
  ]

  // ─── 기본 탭 fetch ────────────────────────────────────────────────────────

  // page 0 은 새로 불러오고, 그 뒤 페이지는 기존 목록 뒤에 붙인다
  const fetchList = useCallback(async (key: ListKey, page: number) => {
    setLists(prev => ({
      ...prev,
      [key]: { ...prev[key], loading: page === 0, loadingMore: page > 0, error: false },
    }))
    try {
      const res = await fetchWithAuth(`${API_URL}${LIST_ENDPOINT[key]}?page=${page}&size=${PAGE_SIZE}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      const items = parseList<never>(json)
      const meta = (json?.data ?? {}) as { last?: boolean; totalElements?: number }
      setLists(prev => {
        const merged = page === 0 ? items : [...prev[key].items, ...items]
        return {
          ...prev,
          [key]: {
            items: merged,
            page,
            last: meta.last ?? items.length < PAGE_SIZE,
            total: meta.totalElements ?? merged.length,
            loading: false,
            loadingMore: false,
            error: false,
          },
        }
      })
    } catch {
      setLists(prev => ({ ...prev, [key]: { ...prev[key], loading: false, loadingMore: false, error: true } }))
    }
  }, [])

  // ─── 공지 fetch ───────────────────────────────────────────────────────────

  const fetchNotices = useCallback(async (contentId: number) => {
    setNoticesLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices/all`)
      if (!res.ok) return
      const json = await res.json()
      setContentNotices(parseList<ContentNotice>(json))
    } finally {
      setNoticesLoading(false)
    }
  }, [])

  // ─── 부원 fetch ───────────────────────────────────────────────────────────

  const fetchMembers = useCallback(async (statusFilter?: string, keyword?: string) => {
    setTabLoading(true)
    try {
      const params = new URLSearchParams({ size: '50' })
      if (statusFilter) params.set('status', statusFilter)
      if (keyword?.trim()) params.set('keyword', keyword.trim())
      const res = await fetchWithAuth(`${API_URL}/v1/admin/users?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setMembers(parseList<SiteUser>(json))
    } finally {
      setTabLoading(false)
    }
  }, [])

  // ─── 지원하기 fetch ───────────────────────────────────────────────────────

  const fetchRecruitments = useCallback(async () => {
    setTabLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment`)
      if (!res.ok) return
      const json = await res.json()
      setRecruitments(parseList<Recruitment>(json))
    } finally {
      setTabLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading || !user) return
    if (tab === 'account')          fetchMyDetail()
    else if (tab === 'posts' || tab === 'comments' || tab === 'likes') fetchList(tab, 0)
    else if (tab === 'members')     fetchMembers(memberStatusFilter || undefined)
    else if (tab === 'recruitment') fetchRecruitments()
    // notices 탭은 아래에서 보여줄 스터디가 정해지면 fetch
  }, [tab, authLoading, user, fetchList, fetchMembers, fetchRecruitments, fetchMyDetail, memberStatusFilter])

  useEffect(() => {
    if (tab === 'notices' && activeContentId !== null) fetchNotices(activeContentId)
  }, [tab, activeContentId, fetchNotices])

  // ─── 공지 actions ─────────────────────────────────────────────────────────

  async function handleCreateNotice() {
    if (noticeTarget === 'CONTENT' && !noticeTargetContentId) return
    if (noticeFormProblem(noticeForm, noticeTarget === 'CONTENT')) return
    setNoticeActionLoading(true)
    setNoticeError(null)
    try {
      const body = JSON.stringify({
        title:   noticeForm.title,
        content: noticeForm.content,
        startAt: noticeForm.startAt || undefined,
        endAt:   noticeForm.endAt   || undefined,
      })
      // 전체 부원 공지는 관리자만 보낼 수 있다 (팀장 화면엔 선택지 자체가 없다)
      const url = noticeTarget === 'ALL' && isAdmin
        ? `${API_URL}/v1/admin/notices`
        : `${API_URL}/v1/contents/${noticeTargetContentId}/notices`
      const res = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) {
        setNoticeError(await errorMessage(res, '공지를 저장하지 못했습니다.'))
        return
      }
      setCreateNoticeOpen(false)
      setNoticeForm({ title: '', content: '', startAt: '', endAt: '' })
      if (noticeTargetContentId !== null) {
        // 방금 쓴 공지가 보이도록 그 스터디로 옮겨 간다
        setSelectedContent(noticeContents.find(c => c.id === noticeTargetContentId) ?? activeContent)
        if (noticeTargetContentId === activeContentId) await fetchNotices(noticeTargetContentId)
      }
    } catch {
      setNoticeError('서버에 연결할 수 없습니다.')
    } finally {
      setNoticeActionLoading(false)
    }
  }

  async function handleEditNotice() {
    if (!activeContent || !editNotice) return
    if (noticeFormProblem(noticeForm, true)) return
    setNoticeActionLoading(true)
    setNoticeError(null)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${activeContent.id}/notices/${editNotice.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:   noticeForm.title,
            content: noticeForm.content,
            startAt: noticeForm.startAt,
            endAt:   noticeForm.endAt,
          }),
        },
      )
      if (!res.ok) {
        setNoticeError(await errorMessage(res, '공지를 수정하지 못했습니다.'))
        return
      }
      setEditNotice(null)
      setNoticeForm({ title: '', content: '', startAt: '', endAt: '' })
      await fetchNotices(activeContent.id)
    } catch {
      setNoticeError('서버에 연결할 수 없습니다.')
    } finally {
      setNoticeActionLoading(false)
    }
  }

  async function handleDeleteNotice(noticeId: number) {
    if (!activeContent) return
    setNoticeActionLoading(true)
    setNoticeError(null)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${activeContent.id}/notices/${noticeId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        setNoticeError(await errorMessage(res, '공지를 삭제하지 못했습니다.'))
        return
      }
      setDeleteNoticeId(null)
      await fetchNotices(activeContent.id)
    } catch {
      setNoticeError('서버에 연결할 수 없습니다.')
    } finally {
      setNoticeActionLoading(false)
    }
  }

  // ─── 부원 actions ─────────────────────────────────────────────────────────

  async function handleMemberStatus() {
    if (!editMember) return
    setMemberActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/users/${editMember.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: memberStatusForm }),
      })
      if (res.ok) {
        setEditMember(null)
        await fetchMembers(memberStatusFilter || undefined)
      }
    } finally {
      setMemberActionLoading(false)
    }
  }

  async function handleMemberRole(userId: number, grant: boolean) {
    setMemberActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant }),
      })
      if (res.ok) await fetchMembers(memberStatusFilter || undefined)
    } finally {
      setMemberActionLoading(false)
    }
  }

  async function handleDeleteMember(userId: number) {
    setMemberActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteMemberId(null)
        await fetchMembers(memberStatusFilter || undefined)
      }
    } finally {
      setMemberActionLoading(false)
    }
  }

  // ─── 지원하기 actions ─────────────────────────────────────────────────────

  function recruitBody() {
    return JSON.stringify({
      title:      recruitForm.title,
      applyUrl:   recruitForm.applyUrl,
      startAt:    recruitForm.startAt ? `${recruitForm.startAt}T00:00:00` : undefined,
      endAt:      recruitForm.endAt   ? `${recruitForm.endAt}T23:59:59`   : undefined,
      isActive:   recruitForm.status === 'RECRUITING',
      status:     recruitForm.status,
      generation: recruitForm.generation ? parseInt(recruitForm.generation) : undefined,
    })
  }

  async function handleCreateRecruit() {
    if (!recruitForm.title.trim() || !recruitForm.applyUrl.trim()) return
    setRecruitActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: recruitBody(),
      })
      if (res.ok) {
        setCreateRecruitOpen(false)
        setRecruitForm({ title: '', applyUrl: '', startAt: '', endAt: '', status: 'UPCOMING', generation: '' })
        await fetchRecruitments()
      }
    } finally {
      setRecruitActionLoading(false)
    }
  }

  async function handleEditRecruit() {
    if (!editRecruitment) return
    setRecruitActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment/${editRecruitment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: recruitBody(),
      })
      if (res.ok) {
        setEditRecruitment(null)
        await fetchRecruitments()
      }
    } finally {
      setRecruitActionLoading(false)
    }
  }

  async function handleDeleteRecruit(id: number) {
    setRecruitActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/admin/recruitment/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteRecruitId(null)
        await fetchRecruitments()
      }
    } finally {
      setRecruitActionLoading(false)
    }
  }

  // ─── 로그아웃 ─────────────────────────────────────────────────────────────

  async function handleLogout() {
    setLogoutLoading(true)
    try {
      await fetchWithAuth(`${API_URL}/v1/auth/logout`, { method: 'POST' })
    } finally {
      clearUser()
      router.push('/login')
    }
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#040d1f' }}>
        <div className="text-fg-subtle text-sm">불러오는 중...</div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#040d1f' }}>
        <div className="text-center">
          <p className="text-fg-subtle mb-4">로그인이 필요합니다.</p>
          <Link href="/login?next=%2Fmypage" className="inline-block px-5 py-2 rounded-lg bg-brand text-white font-semibold text-sm">로그인하기</Link>
        </div>
      </main>
    )
  }

  const filteredMembers = members.filter(m =>
    memberSearch === '' ||
    m.nickname?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.department?.toLowerCase().includes(memberSearch.toLowerCase()),
  )

  function openCreateContentNotice() {
    setNoticeTarget('CONTENT')
    setNoticeTargetContentId(activeContentId)
    setNoticeForm({ title: '', content: '', startAt: '', endAt: '' })
    setNoticeError(null)
    setCreateNoticeOpen(true)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen pt-20 sm:pt-24 px-4 sm:px-8 lg:px-12" style={{ background: '#040d1f' }}>
      <div className="max-w-5xl mx-auto py-8 sm:py-16">

        {/* Profile header */}
        <div className="flex items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-black flex-shrink-0 bg-brand shadow-[0_0_24px_rgba(28,90,255,0.35)]">
              {user.nickname?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-2xl sm:text-3xl font-black truncate">{user.nickname}</h1>
              <p className="text-fg-subtle text-[13px] sm:text-sm mt-1 truncate">{user.email}</p>
              {/* 역할: 내비게이션 바와 같은 이름(ADMIN / MEMBER), 홈의 ● ACTIVE 와 같은 점 표기 */}
              <span className="inline-flex items-center gap-2 mt-2 text-xs font-semibold tracking-[0.08em]">
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-brand shadow-[0_0_8px_rgba(28,90,255,0.9)]' : 'bg-fg-faint'}`}
                />
                <span className={isAdmin ? 'text-white' : 'text-fg-subtle'}>{isAdmin ? 'ADMIN' : 'MEMBER'}</span>
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            aria-label="로그아웃"
            className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2 rounded-lg text-sm text-fg-subtle hover:text-white border border-line hover:border-line-strong transition-colors disabled:opacity-40 shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {/* 모바일은 아이콘만 */}
            <span className="hidden sm:inline">{logoutLoading ? '로그아웃 중...' : '로그아웃'}</span>
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 mb-8 border-b border-line overflow-x-auto [scrollbar-width:none]">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-3.5 sm:px-6 py-3 text-[13px] sm:text-sm font-semibold sm:tracking-wider transition-colors whitespace-nowrap -mb-px border-b-2 ${
                tab === key
                  ? 'text-white border-brand'
                  : 'text-fg-subtle border-transparent hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Tab content ─── */}

        {tabLoading && (tab === 'members' || tab === 'recruitment') && (
          <div className="py-16 text-center text-fg-subtle text-sm">불러오는 중...</div>
        )}

        {/* 내 게시글 / 댓글 / 좋아요: 10개씩 더보기 */}
        {tab === 'posts' && (
          <PagedList state={lists.posts} onRetry={() => fetchList('posts', 0)} onMore={() => fetchList('posts', lists.posts.page + 1)}>
            <PostList items={lists.posts.items} emptyMessage="작성한 게시글이 없습니다." />
          </PagedList>
        )}
        {tab === 'comments' && (
          <PagedList state={lists.comments} onRetry={() => fetchList('comments', 0)} onMore={() => fetchList('comments', lists.comments.page + 1)}>
            <CommentList items={lists.comments.items} />
          </PagedList>
        )}
        {tab === 'likes' && (
          <PagedList state={lists.likes} onRetry={() => fetchList('likes', 0)} onMore={() => fetchList('likes', lists.likes.page + 1)}>
            <PostList items={lists.likes.items} emptyMessage="좋아요한 게시글이 없습니다." />
          </PagedList>
        )}

        {tab === 'account' && (
          myDetail ? (
            <AccountPanel
              nickname={myDetail.nickname}
              department={myDetail.department}
              email={myDetail.email}
              onUpdated={() => { fetchMyDetail(); refetch() }}
              onLoggedOut={clearUser}
            />
          ) : myDetailError ? (
            <LoadError message="계정 정보를 불러오지 못했습니다." onRetry={fetchMyDetail} />
          ) : (
            <div className="py-16 text-center text-fg-subtle text-sm">불러오는 중...</div>
          )
        )}

        {/* ── 공지 관리 (팀장) ── */}
        {tab === 'notices' && (
          <div>
            {/* 맡은 스터디가 둘 이상일 때만 고르는 줄을 보여준다 */}
            {noticeContents.length > 1 && (
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="text-fg-subtle text-sm">스터디 / 프로젝트</span>
                {noticeContents.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContent(c)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                      activeContentId === c.id
                        ? 'text-white bg-brand border-brand'
                        : 'text-fg-subtle bg-surface border-line hover:text-white'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {!activeContent ? (
              <p className="text-fg-subtle py-10 text-center text-sm">불러오는 중...</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-fg-subtle text-sm">
                    <span className="text-white font-semibold">{activeContent.title}</span>의 공지 목록
                  </p>
                  <button
                    onClick={openCreateContentNotice}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    공지 작성
                  </button>
                </div>

                {noticesLoading ? (
                  <div className="py-12 text-center text-fg-subtle text-sm">불러오는 중...</div>
                ) : contentNotices.length === 0 ? (
                  <p className="text-fg-subtle py-10 text-center text-sm">등록된 공지가 없습니다.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {contentNotices.map(n => (
                      <div key={n.id} className="py-4 px-4 -mx-4 hover:bg-surface-raised transition-colors rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm">{n.title}</p>
                            <p className="text-fg-subtle text-xs mt-0.5">
                              {fmtDate(n.startAt)} ~ {fmtDate(n.endAt)}
                            </p>
                            <p className="text-fg-muted text-xs mt-1 line-clamp-2">{n.content}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                            <button
                              onClick={() => {
                                setEditNotice(n)
                                setNoticeError(null)
                                setNoticeForm({
                                  title:   n.title,
                                  content: n.content,
                                  startAt: toDateInput(n.startAt),
                                  endAt:   toDateInput(n.endAt),
                                })
                              }}
                              className="px-3 py-1 rounded text-xs text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => { setDeleteNoticeId(n.id); setNoticeError(null) }}
                              className="px-3 py-1 rounded text-xs text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── 부원 관리 ── */}
        {!tabLoading && tab === 'members' && isAdmin && (
          <div>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              {/* 상태 필터 */}
              <div className="flex items-center gap-2">
                {(['', 'ACTIVE', 'BREAK', 'OB', 'LEAVE'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setMemberStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      memberStatusFilter === s ? 'text-white' : 'text-fg-subtle hover:text-white'
                    }`}
                    style={{
                      background: memberStatusFilter === s ? '#1C5AFF' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${memberStatusFilter === s ? '#1C5AFF' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {s === '' ? '전체' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              {/* 검색 */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="이름, 이메일, 학과 검색..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') fetchMembers(memberStatusFilter || undefined, memberSearch)
                    }}
                    className="pl-9 pr-4 py-2 text-sm text-white placeholder:text-fg-faint rounded-lg outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <button
                  onClick={() => fetchMembers(memberStatusFilter || undefined, memberSearch)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ background: '#1C5AFF' }}
                >
                  검색
                </button>
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <p className="text-fg-subtle py-10 text-center text-sm">부원이 없습니다.</p>
            ) : (
              <div className="divide-y divide-line">
                {filteredMembers.map(m => {
                  const isAdminMember = hasAdminRole(m.roles)
                  return (
                    <div key={m.id} className="py-4 px-4 -mx-4 hover:bg-surface-raised transition-colors rounded-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1C5AFF, #0066ff)' }}
                          >
                            {(m.nickname ?? m.name ?? '?')[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium text-sm">{m.nickname ?? m.name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLOR[m.status] ?? 'text-fg-subtle'}`}>
                                {STATUS_LABEL[m.status] ?? m.status}
                              </span>
                              {isAdminMember && (
                                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-brand/25 text-white">ADMIN</span>
                              )}
                            </div>
                            <p className="text-fg-subtle text-xs truncate">{m.email}</p>
                            {(m.department || m.generation) && (
                              <p className="text-fg-subtle text-xs">{[m.department, m.generation ? `${m.generation}기` : ''].filter(Boolean).join(' · ')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                          <button
                            onClick={() => { setEditMember(m); setMemberStatusForm(m.status) }}
                            className="px-3 py-1 rounded text-xs text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors"
                          >
                            상태 변경
                          </button>
                          <button
                            onClick={() => handleMemberRole(m.id, !isAdminMember)}
                            disabled={memberActionLoading}
                            className={`px-3 py-1 rounded text-xs transition-colors disabled:opacity-40 ${
                              isAdminMember
                                ? 'text-fg-muted hover:text-white hover:bg-brand/15'
                                : 'text-fg-subtle hover:text-white hover:bg-surface-raised'
                            }`}
                          >
                            {isAdminMember ? 'ADMIN 해제' : 'ADMIN 부여'}
                          </button>
                          <button
                            onClick={() => setDeleteMemberId(m.id)}
                            className="px-3 py-1 rounded text-xs text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 지원하기 관리 ── */}
        {!tabLoading && tab === 'recruitment' && isAdmin && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-fg-subtle text-sm">신규 부원 모집 기간을 관리합니다.</p>
              <button
                onClick={() => {
                  setRecruitForm({ title: '', applyUrl: '', startAt: '', endAt: '', status: 'UPCOMING', generation: '' })
                  setCreateRecruitOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#1C5AFF' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                모집 등록
              </button>
            </div>

            {recruitments.length === 0 ? (
              <p className="text-fg-subtle py-10 text-center text-sm">등록된 모집이 없습니다.</p>
            ) : (
              <div className="divide-y divide-line">
                {recruitments.map(r => (
                  <div key={r.id} className="py-4 px-4 -mx-4 hover:bg-surface-raised transition-colors rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium text-sm">{r.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            (r.status === 'RECRUITING' || (!r.status && r.isActive))
                              ? 'text-green-400 bg-green-400/10'
                              : r.status === 'UPCOMING'
                                ? 'text-yellow-400 bg-yellow-400/10'
                                : 'text-fg-subtle bg-white/5'
                          }`}>
                            {r.status === 'RECRUITING' || (!r.status && r.isActive)
                              ? '모집중'
                              : r.status === 'UPCOMING'
                                ? '모집예정'
                                : '모집마감'}
                          </span>
                        </div>
                        <p className="text-fg-subtle text-xs mt-0.5">
                          {fmtDateTime(r.startAt)} ~ {fmtDateTime(r.endAt)}
                        </p>
                        <a
                          href={r.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-fg-muted hover:text-white text-xs mt-1 block truncate"
                        >
                          {r.applyUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditRecruitment(r)
                            setRecruitForm({
                              title:      r.title,
                              applyUrl:   r.applyUrl,
                              startAt:    toDateInput(r.startAt),
                              endAt:      toDateInput(r.endAt),
                              status:     r.status ?? (r.isActive ? 'RECRUITING' : 'CLOSED'),
                              generation: r.generation?.toString() ?? '',
                            })
                          }}
                          className="px-3 py-1 rounded text-xs text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteRecruitId(r.id)}
                          className="px-3 py-1 rounded text-xs text-danger/80 hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ Modals ══ */}

      {/* 공지 작성 */}
      {createNoticeOpen && (() => {
        const sendToAll = isAdmin && noticeTarget === 'ALL'
        const problem = !sendToAll && !noticeTargetContentId
          ? '공지를 보낼 스터디 / 프로젝트를 선택해주세요.'
          : noticeFormProblem(noticeForm, !sendToAll)
        return (
          <Modal title="공지 작성" onClose={() => setCreateNoticeOpen(false)}>
            <div className="mb-4">
              <label className="block text-fg-subtle text-xs font-semibold mb-1.5">공지 보낼 대상</label>
              {/* 전체 부원 공지는 관리자만 보낼 수 있어서 팀장에겐 선택지를 보여주지 않는다 */}
              {isAdmin && (
                <div className="flex gap-2 mb-2">
                  {([['ALL', '전체 부원'], ['CONTENT', '스터디/프로젝트']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setNoticeTarget(val)
                        setNoticeTargetContentId(val === 'CONTENT' ? activeContentId : null)
                      }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        noticeTarget === val ? 'text-white bg-brand border-brand' : 'text-fg-subtle bg-surface border-line hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {!sendToAll && (
                noticeContents.length > 1 ? (
                  <select
                    value={noticeTargetContentId ?? ''}
                    onChange={e => setNoticeTargetContentId(e.target.value ? Number(e.target.value) : null)}
                    className={inputCls}
                  >
                    <option value="">선택해주세요</option>
                    {noticeContents.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                ) : (
                  // 맡은 스터디가 하나면 고를 것 없이 대상만 보여준다
                  <p className="px-3 py-2 rounded-lg text-sm text-white bg-surface border border-line">
                    {activeContent?.title}
                  </p>
                )
              )}
            </div>
            <NoticeForm form={noticeForm} onChange={setNoticeForm} datesRequired={!sendToAll} />
            <NoticeModalFooter
              problem={problem}
              error={noticeError}
              loading={noticeActionLoading}
              submitLabel="작성 완료"
              onCancel={() => setCreateNoticeOpen(false)}
              onSubmit={handleCreateNotice}
            />
          </Modal>
        )
      })()}

      {/* 공지 수정 */}
      {editNotice && (
        <Modal title="공지 수정" onClose={() => setEditNotice(null)}>
          <NoticeForm form={noticeForm} onChange={setNoticeForm} datesRequired />
          <NoticeModalFooter
            problem={noticeFormProblem(noticeForm, true)}
            error={noticeError}
            loading={noticeActionLoading}
            submitLabel="수정 완료"
            onCancel={() => setEditNotice(null)}
            onSubmit={handleEditNotice}
          />
        </Modal>
      )}

      {/* 공지 삭제 확인 */}
      {deleteNoticeId !== null && (
        <Modal title="공지 삭제" onClose={() => setDeleteNoticeId(null)}>
          <p className="text-fg-muted text-sm mb-6">이 공지를 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
          {noticeError && <p className="text-danger text-xs mb-4">{noticeError}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteNoticeId(null)} className="px-4 py-2 rounded-lg text-sm text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors">취소</button>
            <button onClick={() => handleDeleteNotice(deleteNoticeId)} disabled={noticeActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-danger/85 hover:bg-danger disabled:opacity-40">
              {noticeActionLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </Modal>
      )}

      {/* 부원 상태 변경 */}
      {editMember && (
        <Modal title={`${editMember.nickname ?? editMember.name} 상태 변경`} onClose={() => setEditMember(null)}>
          <p className="text-fg-subtle text-xs mb-4">{editMember.email}</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(['ACTIVE', 'BREAK', 'OB', 'LEAVE'] as const).map(s => (
              <button
                key={s}
                onClick={() => setMemberStatusForm(s)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${memberStatusForm === s ? 'text-white' : 'text-fg-subtle hover:text-white'}`}
                style={{
                  background: memberStatusForm === s ? '#1C5AFF' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${memberStatusForm === s ? '#1C5AFF' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditMember(null)} className="px-4 py-2 rounded-lg text-sm text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors">취소</button>
            <button onClick={handleMemberStatus} disabled={memberActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#1C5AFF' }}>
              {memberActionLoading ? '저장 중...' : '변경 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 부원 삭제 확인 */}
      {deleteMemberId !== null && (
        <Modal title="부원 삭제" onClose={() => setDeleteMemberId(null)}>
          <p className="text-fg-muted text-sm mb-6">해당 부원 계정을 완전히 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteMemberId(null)} className="px-4 py-2 rounded-lg text-sm text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors">취소</button>
            <button onClick={() => handleDeleteMember(deleteMemberId)} disabled={memberActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-danger/85 hover:bg-danger disabled:opacity-40">
              {memberActionLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </Modal>
      )}

      {/* 모집 등록 */}
      {createRecruitOpen && (
        <Modal title="모집 등록" onClose={() => setCreateRecruitOpen(false)}>
          <RecruitForm form={recruitForm} onChange={setRecruitForm} />
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setCreateRecruitOpen(false)} className="px-4 py-2 rounded-lg text-sm text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors">취소</button>
            <button
              onClick={handleCreateRecruit}
              disabled={recruitActionLoading || !recruitForm.title.trim() || !recruitForm.applyUrl.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#1C5AFF' }}
            >
              {recruitActionLoading ? '저장 중...' : '등록 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 모집 수정 */}
      {editRecruitment && (
        <Modal title="모집 수정" onClose={() => setEditRecruitment(null)}>
          <RecruitForm form={recruitForm} onChange={setRecruitForm} />
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setEditRecruitment(null)} className="px-4 py-2 rounded-lg text-sm text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors">취소</button>
            <button
              onClick={handleEditRecruit}
              disabled={recruitActionLoading || !recruitForm.title.trim() || !recruitForm.applyUrl.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#1C5AFF' }}
            >
              {recruitActionLoading ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 모집 삭제 확인 */}
      {deleteRecruitId !== null && (
        <Modal title="모집 삭제" onClose={() => setDeleteRecruitId(null)}>
          <p className="text-fg-muted text-sm mb-6">이 모집을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteRecruitId(null)} className="px-4 py-2 rounded-lg text-sm text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors">취소</button>
            <button onClick={() => handleDeleteRecruit(deleteRecruitId)} disabled={recruitActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-danger/85 hover:bg-danger disabled:opacity-40">
              {recruitActionLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// 목록 공통 틀: 첫 로딩 / 실패 / 목록 + 더보기
function PagedList<T>({
  state,
  onRetry,
  onMore,
  children,
}: {
  state: ListState<T>
  onRetry: () => void
  onMore: () => void
  children: React.ReactNode
}) {
  if (state.loading) return <div className="py-16 text-center text-fg-subtle text-sm">불러오는 중...</div>
  if (state.error && state.items.length === 0) return <LoadError message="목록을 불러오지 못했습니다." onRetry={onRetry} />

  return (
    <div>
      {children}
      {state.items.length > 0 && (
        <div className="flex flex-col items-center gap-2 mt-8">
          {state.error ? (
            <LoadError message="더 불러오지 못했습니다." onRetry={onMore} compact />
          ) : !state.last ? (
            <button
              onClick={onMore}
              disabled={state.loadingMore}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm text-fg-muted border border-line-strong hover:text-white hover:bg-surface-raised transition-colors disabled:opacity-60"
            >
              {state.loadingMore ? '불러오는 중...' : '더보기'}
              <span className="text-fg-subtle tabular-nums">{state.items.length} / {state.total}</span>
            </button>
          ) : (
            <p className="text-fg-subtle text-xs tabular-nums">전체 {state.total}개</p>
          )}
        </div>
      )}
    </div>
  )
}

function LoadError({ message, onRetry, compact = false }: { message: string; onRetry: () => void; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${compact ? '' : 'py-16'}`}>
      <p className="text-fg-muted text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm text-white border border-line-strong hover:bg-surface-raised transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}

function PostList({ items, emptyMessage }: { items: MyPost[]; emptyMessage: string }) {
  if (items.length === 0) return <p className="text-fg-subtle py-10 text-center text-sm">{emptyMessage}</p>
  return (
    <div className="divide-y divide-line">
      {items.map(post => {
        const style = CATEGORY_STYLE[post.category]
        return (
          <Link
            key={post.id}
            href={`/blog/${post.id}`}
            className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 sm:flex sm:items-center sm:gap-4 py-3.5 sm:py-4 hover:bg-surface-raised px-4 -mx-4 rounded-lg transition-colors"
          >
            {/* 분류: 블로그 목록과 같은 ● Knowledge 표기 */}
            <span className={`inline-flex items-center gap-2 sm:w-[92px] text-xs font-medium flex-shrink-0 ${style?.text ?? 'text-fg-subtle'}`}>
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style?.dot ?? 'bg-fg-faint'}`} />
              {CATEGORY_LABEL[post.category] ?? post.category}
            </span>
            <span className="col-span-2 row-start-2 sm:flex-1 min-w-0 text-white font-medium truncate text-sm">{post.title}</span>
            <span className="col-start-2 row-start-1 text-fg-subtle text-xs flex-shrink-0 tabular-nums">{fmtDate(post.createdAt)}</span>
          </Link>
        )
      })}
    </div>
  )
}

function CommentList({ items }: { items: MyComment[] }) {
  if (items.length === 0) return <p className="text-fg-subtle py-10 text-center text-sm">작성한 댓글이 없습니다.</p>
  return (
    <div className="divide-y divide-line">
      {items.map(c => (
        <Link key={`${c.postId}-${c.commentId}`} href={`/blog/${c.postId}`} className="py-4 px-4 -mx-4 rounded-lg hover:bg-surface-raised transition-colors block group">
          <p className="text-fg-subtle text-xs mb-1 group-hover:text-fg-muted transition-colors truncate">{c.postTitle}</p>
          {/* 긴 댓글은 3줄까지만, 전체는 글에서 본다 */}
          <p className="text-white font-medium text-sm line-clamp-3 whitespace-pre-line break-words">{c.content}</p>
          <p className="text-fg-subtle text-xs mt-1 tabular-nums">{fmtDate(c.createdAt)}</p>
        </Link>
      ))}
    </div>
  )
}

function InputField({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-fg-subtle text-xs font-semibold mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-fg-faint outline-none bg-surface-raised border border-line focus:border-brand transition-colors [color-scheme:dark]'
const inputStyle = {}

// 공지 모달 아래: 저장이 안 되는 이유(또는 서버 오류) + 취소/저장
function NoticeModalFooter({
  problem,
  error,
  loading,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  problem: string | null
  error: string | null
  loading: boolean
  submitLabel: string
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <p className={`mr-auto text-xs ${error ? 'text-danger' : 'text-fg-subtle'}`}>{error ?? problem}</p>
      <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors">취소</button>
      <button
        onClick={onSubmit}
        disabled={loading || !!problem}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '저장 중...' : submitLabel}
      </button>
    </div>
  )
}

function NoticeForm({
  form,
  onChange,
  datesRequired = false,
}: {
  form: { title: string; content: string; startAt: string; endAt: string }
  onChange: (f: typeof form) => void
  datesRequired?: boolean
}) {
  return (
    <div className="space-y-4">
      <InputField label="제목" required>
        <input type="text" value={form.title} onChange={e => onChange({ ...form, title: e.target.value })}
          placeholder="공지 제목" className={inputCls} />
      </InputField>
      <InputField label="내용" required>
        <textarea value={form.content} onChange={e => onChange({ ...form, content: e.target.value })}
          placeholder="공지 내용을 입력하세요" rows={5}
          className={`${inputCls} resize-none`} />
      </InputField>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="시작일" required={datesRequired}>
          <input type="date" value={form.startAt} onChange={e => onChange({ ...form, startAt: e.target.value })}
            className={inputCls} />
        </InputField>
        <InputField label="종료일" required={datesRequired}>
          <input type="date" value={form.endAt} min={form.startAt || undefined} onChange={e => onChange({ ...form, endAt: e.target.value })}
            className={inputCls} />
        </InputField>
      </div>
    </div>
  )
}

function RecruitForm({
  form,
  onChange,
}: {
  form: { title: string; applyUrl: string; startAt: string; endAt: string; status: RecruitStatus; generation: string }
  onChange: (f: typeof form) => void
}) {
  const statusOptions: { value: RecruitStatus; label: string; color: string }[] = [
    { value: 'RECRUITING', label: '모집중',   color: '#16a34a' },
    { value: 'UPCOMING',   label: '모집예정', color: '#ca8a04' },
    { value: 'CLOSED',     label: '모집마감', color: 'rgba(255,255,255,0.15)' },
  ]
  return (
    <div className="space-y-4">
      <InputField label="모집 제목">
        <input type="text" value={form.title} onChange={e => onChange({ ...form, title: e.target.value })}
          placeholder="예) 2025년 1학기 신입 부원 모집" className={inputCls} style={inputStyle} />
      </InputField>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="기수">
          <input type="number" min="1" value={form.generation} onChange={e => onChange({ ...form, generation: e.target.value })}
            placeholder="예) 12" className={inputCls} style={inputStyle} />
        </InputField>
        <InputField label="지원서 URL">
          <input type="url" value={form.applyUrl} onChange={e => onChange({ ...form, applyUrl: e.target.value })}
            placeholder="https://forms.gle/..." className={inputCls} style={inputStyle} />
        </InputField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="모집 시작일">
          <input type="date" value={form.startAt} onChange={e => onChange({ ...form, startAt: e.target.value })}
            className={inputCls} style={inputStyle} />
        </InputField>
        <InputField label="모집 종료일">
          <input type="date" value={form.endAt} onChange={e => onChange({ ...form, endAt: e.target.value })}
            className={inputCls} style={inputStyle} />
        </InputField>
      </div>
      <InputField label="모집 상태">
        <div className="flex gap-2">
          {statusOptions.map(({ value, label, color }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...form, status: value })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${form.status === value ? 'text-white' : 'text-fg-subtle hover:text-white'}`}
              style={{
                background: form.status === value ? color : 'rgba(255,255,255,0.05)',
                border: `1px solid ${form.status === value ? color : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </InputField>
    </div>
  )
}
