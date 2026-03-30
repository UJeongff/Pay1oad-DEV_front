'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyPost { id: number; title: string; category: string; createdAt: string }
interface MyComment { id: number; content: string; postTitle: string; postId: number; createdAt: string }

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

type Tab = 'posts' | 'comments' | 'likes' | 'notices' | 'members' | 'recruitment'

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

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ko-KR')
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
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
  OB:     'text-blue-300 bg-blue-400/10',
  LEAVE:  'text-red-400 bg-red-400/10',
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#0b1630', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MypagePage() {
  const { user, loading: authLoading, refetch } = useAuthContext()
  const router = useRouter()
  const isAdmin = user?.role === 'ADMIN'

  // ── tab ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('posts')

  // ── base tabs ─────────────────────────────────────────────────────────────
  const [posts, setPosts]       = useState<MyPost[]>([])
  const [comments, setComments] = useState<MyComment[]>([])
  const [likes, setLikes]       = useState<MyPost[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

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

  const canManageNotices = isAdmin || ledContents.length > 0

  const TABS: { key: Tab; label: string }[] = [
    { key: 'posts',       label: '내 게시글' },
    { key: 'comments',    label: '내 댓글' },
    { key: 'likes',       label: '좋아요한 게시글' },
    ...(canManageNotices  ? [{ key: 'notices'     as Tab, label: '공지 관리' }] : []),
    ...(isAdmin           ? [{ key: 'members'     as Tab, label: '부원 관리' }] : []),
    ...(isAdmin           ? [{ key: 'recruitment' as Tab, label: '지원하기 관리' }] : []),
  ]

  // ─── 기본 탭 fetch ────────────────────────────────────────────────────────

  const fetchBaseTab = useCallback(async (t: 'posts' | 'comments' | 'likes') => {
    setTabLoading(true)
    try {
      const ep: Record<string, string> = {
        posts:    `/v1/mypage/posts?page=0&size=10`,
        comments: `/v1/mypage/comments?page=0&size=10`,
        likes:    `/v1/mypage/likes?page=0&size=10`,
      }
      const res = await fetchWithAuth(`${API_URL}${ep[t]}`)
      if (!res.ok) return
      const json = await res.json()
      if (t === 'posts')    setPosts(parseList<MyPost>(json))
      else if (t === 'comments') setComments(parseList<MyComment>(json))
      else                  setLikes(parseList<MyPost>(json))
    } finally {
      setTabLoading(false)
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
    if (tab === 'posts' || tab === 'comments' || tab === 'likes') fetchBaseTab(tab)
    else if (tab === 'members')     fetchMembers(memberStatusFilter || undefined)
    else if (tab === 'recruitment') fetchRecruitments()
    // notices 탭은 content 선택 시 fetch
  }, [tab, authLoading, user, fetchBaseTab, fetchMembers, fetchRecruitments, memberStatusFilter])

  useEffect(() => {
    if (selectedContent) fetchNotices(selectedContent.id)
  }, [selectedContent, fetchNotices])

  // ─── 공지 actions ─────────────────────────────────────────────────────────

  async function handleCreateNotice() {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) return
    if (noticeTarget === 'CONTENT' && !noticeTargetContentId) return
    setNoticeActionLoading(true)
    try {
      let res: Response
      const body = JSON.stringify({
        title:   noticeForm.title,
        content: noticeForm.content,
        startAt: noticeForm.startAt || undefined,
        endAt:   noticeForm.endAt   || undefined,
      })
      if (noticeTarget === 'ALL') {
        res = await fetchWithAuth(`${API_URL}/v1/admin/notices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
      } else {
        res = await fetchWithAuth(`${API_URL}/v1/contents/${noticeTargetContentId}/notices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
      }
      if (res.ok) {
        setCreateNoticeOpen(false)
        setNoticeForm({ title: '', content: '', startAt: '', endAt: '' })
        if (noticeTarget === 'CONTENT' && selectedContent?.id === noticeTargetContentId) {
          await fetchNotices(selectedContent.id)
        }
      }
    } finally {
      setNoticeActionLoading(false)
    }
  }

  async function handleEditNotice() {
    if (!selectedContent || !editNotice) return
    setNoticeActionLoading(true)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${selectedContent.id}/notices/${editNotice.id}`,
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
      if (res.ok) {
        setEditNotice(null)
        setNoticeForm({ title: '', content: '', startAt: '', endAt: '' })
        await fetchNotices(selectedContent.id)
      }
    } finally {
      setNoticeActionLoading(false)
    }
  }

  async function handleDeleteNotice(noticeId: number) {
    if (!selectedContent) return
    setNoticeActionLoading(true)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${selectedContent.id}/notices/${noticeId}`,
        { method: 'DELETE' },
      )
      if (res.ok) {
        setDeleteNoticeId(null)
        await fetchNotices(selectedContent.id)
      }
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
      localStorage.removeItem('user_role')
      await refetch()
      router.push('/login')
    }
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#040d1f' }}>
        <div className="text-white/40 text-sm">불러오는 중...</div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#040d1f' }}>
        <div className="text-center">
          <p className="text-white/40 mb-4">로그인이 필요합니다.</p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold text-sm">로그인하기</Link>
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="relative min-h-screen pt-24 px-4 sm:px-8 lg:px-12" style={{ background: '#040d1f' }}>
      <div className="max-w-5xl mx-auto py-16">

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
          <div className="flex items-center gap-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0041EF, #0066ff)' }}
            >
              {user.nickname?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-white text-3xl font-black">{user.nickname}</h1>
              <p className="text-white/40 text-sm mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs font-bold tracking-wider px-2 py-0.5 rounded ${
                    user.role === 'ADMIN'
                      ? 'bg-blue-600/30 text-blue-300'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {user.role === 'ADMIN' ? 'MANAGER' : 'MEMBER'}
                </span>
                {ledContents.length > 0 && (
                  <span className="text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-purple-600/30 text-purple-300">
                    TEAM LEADER
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-40"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {logoutLoading ? '로그아웃 중...' : '로그아웃'}
          </button>
        </div>

        {/* Tabs */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <div className="flex gap-1 mb-8 border-b border-white/10 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as any}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-3 text-sm font-semibold tracking-wider transition-colors whitespace-nowrap ${
                tab === key
                  ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ─── Tab content ─── */}

        {/* 내 게시글 / 댓글 / 좋아요 */}
        {tabLoading && (tab === 'posts' || tab === 'comments' || tab === 'likes' || tab === 'members' || tab === 'recruitment') && (
          <div className="py-16 text-center text-white/30 text-sm">불러오는 중...</div>
        )}

        {!tabLoading && tab === 'posts'    && <PostList items={posts}   emptyMessage="작성한 게시글이 없습니다." />}
        {!tabLoading && tab === 'comments' && <CommentList items={comments} />}
        {!tabLoading && tab === 'likes'    && <PostList items={likes}   emptyMessage="좋아요한 게시글이 없습니다." />}

        {/* ── 공지 관리 ── */}
        {tab === 'notices' && (
          <div>
            {/* 전체 부원 공지 (admin only) */}
            {isAdmin && (
              <div className="mb-6 p-4 rounded-xl flex items-center justify-between gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <p className="text-white/70 text-sm font-semibold">전체 부원 공지</p>
                  <p className="text-white/30 text-xs mt-0.5">모든 활성 부원에게 공지를 발송합니다.</p>
                </div>
                <button
                  onClick={() => {
                    setNoticeTarget('ALL')
                    setNoticeTargetContentId(null)
                    setNoticeForm({ title: '', content: '', startAt: '', endAt: '' })
                    setCreateNoticeOpen(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white flex-shrink-0"
                  style={{ background: '#0041EF' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  공지 작성
                </button>
              </div>
            )}

            {/* 컨텐츠 선택 */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className="text-white/40 text-sm">스터디 / 프로젝트 선택:</span>
              {noticeContents.length === 0 ? (
                <span className="text-white/30 text-sm">로딩 중...</span>
              ) : (
                noticeContents.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContent(c)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                      selectedContent?.id === c.id
                        ? 'text-white'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                    style={{
                      background: selectedContent?.id === c.id ? '#0041EF' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${selectedContent?.id === c.id ? '#0041EF' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {c.title}
                  </button>
                ))
              )}
            </div>

            {!selectedContent ? (
              <p className="text-white/30 py-10 text-center text-sm">위에서 스터디 / 프로젝트를 선택하세요.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/40 text-sm">
                    <span className="text-white/70 font-semibold">{selectedContent.title}</span>의 공지 목록
                  </p>
                  <button
                    onClick={() => {
                      setNoticeTarget('CONTENT')
                      setNoticeTargetContentId(selectedContent?.id ?? null)
                      setNoticeForm({ title: '', content: '', startAt: '', endAt: '' })
                      setCreateNoticeOpen(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: '#0041EF' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    공지 작성
                  </button>
                </div>

                {noticesLoading ? (
                  <div className="py-12 text-center text-white/30 text-sm">불러오는 중...</div>
                ) : contentNotices.length === 0 ? (
                  <p className="text-white/40 py-10 text-center text-sm">등록된 공지가 없습니다.</p>
                ) : (
                  <div className="divide-y divide-white/10">
                    {contentNotices.map(n => (
                      <div key={n.id} className="py-4 px-4 -mx-4 hover:bg-white/5 transition-colors rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm">{n.title}</p>
                            <p className="text-white/30 text-xs mt-0.5">
                              {fmtDate(n.startAt)} ~ {fmtDate(n.endAt)}
                            </p>
                            <p className="text-white/30 text-xs mt-1 line-clamp-2">{n.content}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                            <button
                              onClick={() => {
                                setEditNotice(n)
                                setNoticeForm({
                                  title:   n.title,
                                  content: n.content,
                                  startAt: toDateInput(n.startAt),
                                  endAt:   toDateInput(n.endAt),
                                })
                              }}
                              className="px-3 py-1 rounded text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => setDeleteNoticeId(n.id)}
                              className="px-3 py-1 rounded text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
                      memberStatusFilter === s ? 'text-white' : 'text-white/40 hover:text-white/70'
                    }`}
                    style={{
                      background: memberStatusFilter === s ? '#0041EF' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${memberStatusFilter === s ? '#0041EF' : 'rgba(255,255,255,0.1)'}`,
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
                    className="pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 rounded-lg outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <button
                  onClick={() => fetchMembers(memberStatusFilter || undefined, memberSearch)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ background: '#0041EF' }}
                >
                  검색
                </button>
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <p className="text-white/40 py-10 text-center text-sm">부원이 없습니다.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredMembers.map(m => {
                  const isAdminMember = hasAdminRole(m.roles)
                  return (
                    <div key={m.id} className="py-4 px-4 -mx-4 hover:bg-white/5 transition-colors rounded-lg">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #0041EF, #0066ff)' }}
                          >
                            {(m.nickname ?? m.name ?? '?')[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium text-sm">{m.nickname ?? m.name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLOR[m.status] ?? 'text-white/40'}`}>
                                {STATUS_LABEL[m.status] ?? m.status}
                              </span>
                              {isAdminMember && (
                                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-blue-600/30 text-blue-300">ADMIN</span>
                              )}
                            </div>
                            <p className="text-white/30 text-xs truncate">{m.email}</p>
                            {(m.department || m.generation) && (
                              <p className="text-white/20 text-xs">{[m.department, m.generation ? `${m.generation}기` : ''].filter(Boolean).join(' · ')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                          <button
                            onClick={() => { setEditMember(m); setMemberStatusForm(m.status) }}
                            className="px-3 py-1 rounded text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            상태 변경
                          </button>
                          <button
                            onClick={() => handleMemberRole(m.id, !isAdminMember)}
                            disabled={memberActionLoading}
                            className={`px-3 py-1 rounded text-xs transition-colors disabled:opacity-40 ${
                              isAdminMember
                                ? 'text-blue-400/70 hover:text-blue-400 hover:bg-blue-400/10'
                                : 'text-white/50 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isAdminMember ? 'ADMIN 해제' : 'ADMIN 부여'}
                          </button>
                          <button
                            onClick={() => setDeleteMemberId(m.id)}
                            className="px-3 py-1 rounded text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
              <p className="text-white/40 text-sm">신규 부원 모집 기간을 관리합니다.</p>
              <button
                onClick={() => {
                  setRecruitForm({ title: '', applyUrl: '', startAt: '', endAt: '', status: 'UPCOMING', generation: '' })
                  setCreateRecruitOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#0041EF' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                모집 등록
              </button>
            </div>

            {recruitments.length === 0 ? (
              <p className="text-white/40 py-10 text-center text-sm">등록된 모집이 없습니다.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {recruitments.map(r => (
                  <div key={r.id} className="py-4 px-4 -mx-4 hover:bg-white/5 transition-colors rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium text-sm">{r.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            (r.status === 'RECRUITING' || (!r.status && r.isActive))
                              ? 'text-green-400 bg-green-400/10'
                              : r.status === 'UPCOMING'
                                ? 'text-yellow-400 bg-yellow-400/10'
                                : 'text-white/30 bg-white/5'
                          }`}>
                            {r.status === 'RECRUITING' || (!r.status && r.isActive)
                              ? '모집중'
                              : r.status === 'UPCOMING'
                                ? '모집예정'
                                : '모집마감'}
                          </span>
                        </div>
                        <p className="text-white/30 text-xs mt-0.5">
                          {fmtDateTime(r.startAt)} ~ {fmtDateTime(r.endAt)}
                        </p>
                        <a
                          href={r.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400/70 hover:text-blue-400 text-xs mt-1 block truncate"
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
                          className="px-3 py-1 rounded text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteRecruitId(r.id)}
                          className="px-3 py-1 rounded text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
      {createNoticeOpen && (
        <Modal title="공지 작성" onClose={() => setCreateNoticeOpen(false)}>
          {/* 공지 보낼 대상 선택 */}
          <div className="mb-4">
            <label className="block text-white/50 text-xs font-semibold mb-1.5">공지 보낼 대상</label>
            <div className="flex gap-2 mb-2">
              {([['ALL', '전체 부원'], ['CONTENT', '스터디/프로젝트']] as [string, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setNoticeTarget(val as 'ALL' | 'CONTENT')
                    if (val === 'CONTENT') setNoticeTargetContentId(selectedContent?.id ?? noticeContents[0]?.id ?? null)
                    else setNoticeTargetContentId(null)
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${noticeTarget === val ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                  style={{
                    background: noticeTarget === val ? '#0041EF' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${noticeTarget === val ? '#0041EF' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {noticeTarget === 'CONTENT' && (
              <select
                value={noticeTargetContentId ?? ''}
                onChange={e => setNoticeTargetContentId(Number(e.target.value))}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">선택해주세요</option>
                {noticeContents.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>
          <NoticeForm form={noticeForm} onChange={setNoticeForm} />
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setCreateNoticeOpen(false)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button
              onClick={handleCreateNotice}
              disabled={
                noticeActionLoading ||
                !noticeForm.title.trim() ||
                !noticeForm.content.trim() ||
                (noticeTarget === 'CONTENT' && (!noticeTargetContentId || !noticeForm.startAt || !noticeForm.endAt))
              }
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#0041EF' }}
            >
              {noticeActionLoading ? '저장 중...' : '작성 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 공지 수정 */}
      {editNotice && (
        <Modal title="공지 수정" onClose={() => setEditNotice(null)}>
          <NoticeForm form={noticeForm} onChange={setNoticeForm} />
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setEditNotice(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button
              onClick={handleEditNotice}
              disabled={noticeActionLoading || !noticeForm.title.trim() || !noticeForm.content.trim() || !noticeForm.startAt || !noticeForm.endAt}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#0041EF' }}
            >
              {noticeActionLoading ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 공지 삭제 확인 */}
      {deleteNoticeId !== null && (
        <Modal title="공지 삭제" onClose={() => setDeleteNoticeId(null)}>
          <p className="text-white/60 text-sm mb-6">이 공지를 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteNoticeId(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button onClick={() => handleDeleteNotice(deleteNoticeId)} disabled={noticeActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40">
              {noticeActionLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </Modal>
      )}

      {/* 부원 상태 변경 */}
      {editMember && (
        <Modal title={`${editMember.nickname ?? editMember.name} 상태 변경`} onClose={() => setEditMember(null)}>
          <p className="text-white/40 text-xs mb-4">{editMember.email}</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(['ACTIVE', 'BREAK', 'OB', 'LEAVE'] as const).map(s => (
              <button
                key={s}
                onClick={() => setMemberStatusForm(s)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${memberStatusForm === s ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                style={{
                  background: memberStatusForm === s ? '#0041EF' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${memberStatusForm === s ? '#0041EF' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditMember(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button onClick={handleMemberStatus} disabled={memberActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0041EF' }}>
              {memberActionLoading ? '저장 중...' : '변경 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 부원 삭제 확인 */}
      {deleteMemberId !== null && (
        <Modal title="부원 삭제" onClose={() => setDeleteMemberId(null)}>
          <p className="text-white/60 text-sm mb-6">해당 부원 계정을 완전히 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteMemberId(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button onClick={() => handleDeleteMember(deleteMemberId)} disabled={memberActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40">
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
            <button onClick={() => setCreateRecruitOpen(false)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button
              onClick={handleCreateRecruit}
              disabled={recruitActionLoading || !recruitForm.title.trim() || !recruitForm.applyUrl.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#0041EF' }}
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
            <button onClick={() => setEditRecruitment(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button
              onClick={handleEditRecruit}
              disabled={recruitActionLoading || !recruitForm.title.trim() || !recruitForm.applyUrl.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#0041EF' }}
            >
              {recruitActionLoading ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </Modal>
      )}

      {/* 모집 삭제 확인 */}
      {deleteRecruitId !== null && (
        <Modal title="모집 삭제" onClose={() => setDeleteRecruitId(null)}>
          <p className="text-white/60 text-sm mb-6">이 모집을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeleteRecruitId(null)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">취소</button>
            <button onClick={() => handleDeleteRecruit(deleteRecruitId)} disabled={recruitActionLoading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40">
              {recruitActionLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostList({ items, emptyMessage }: { items: MyPost[]; emptyMessage: string }) {
  if (items.length === 0) return <p className="text-white/40 py-10 text-center text-sm">{emptyMessage}</p>
  return (
    <div className="divide-y divide-white/10">
      {items.map(post => (
        <Link
          key={post.id}
          href={`/blog/${post.id}`}
          className="flex items-center gap-4 py-4 hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors group"
        >
          <span className="text-xs text-blue-400 font-semibold tracking-wider flex-shrink-0">{post.category}</span>
          <span className="text-white font-medium flex-1 group-hover:text-blue-200 transition-colors truncate text-sm">{post.title}</span>
          <span className="text-white/30 text-xs flex-shrink-0">{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
        </Link>
      ))}
    </div>
  )
}

function CommentList({ items }: { items: MyComment[] }) {
  if (items.length === 0) return <p className="text-white/40 py-10 text-center text-sm">작성한 댓글이 없습니다.</p>
  return (
    <div className="divide-y divide-white/10">
      {items.map(c => (
        <Link key={c.id} href={`/blog/${c.postId}`} className="py-4 px-4 -mx-4 rounded-lg hover:bg-white/5 transition-colors block group">
          <p className="text-white/40 text-xs mb-1 group-hover:text-blue-300 transition-colors truncate">{c.postTitle}</p>
          <p className="text-white font-medium text-sm">{c.content}</p>
          <p className="text-white/30 text-xs mt-1">{new Date(c.createdAt).toLocaleDateString('ko-KR')}</p>
        </Link>
      ))}
    </div>
  )
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white/50 text-xs font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none"
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

function NoticeForm({
  form,
  onChange,
}: {
  form: { title: string; content: string; startAt: string; endAt: string }
  onChange: (f: typeof form) => void
}) {
  return (
    <div className="space-y-4">
      <InputField label="제목">
        <input type="text" value={form.title} onChange={e => onChange({ ...form, title: e.target.value })}
          placeholder="공지 제목" className={inputCls} style={inputStyle} />
      </InputField>
      <InputField label="내용">
        <textarea value={form.content} onChange={e => onChange({ ...form, content: e.target.value })}
          placeholder="공지 내용을 입력하세요" rows={5}
          className={`${inputCls} resize-none`} style={inputStyle} />
      </InputField>
      <div className="grid grid-cols-2 gap-3">
        <InputField label="시작일">
          <input type="date" value={form.startAt} onChange={e => onChange({ ...form, startAt: e.target.value })}
            className={inputCls} style={inputStyle} />
        </InputField>
        <InputField label="종료일">
          <input type="date" value={form.endAt} onChange={e => onChange({ ...form, endAt: e.target.value })}
            className={inputCls} style={inputStyle} />
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
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${form.status === value ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
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
