'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import { formatDate } from '@/app/lib/postCategory'
import { TypeChip, TeamOnlyMark } from '@/app/content/ContentBadges'
import { FG, BRAND, LINE, LINE_STRONG, SURFACE, SURFACE_RAISED, BRAND_SOFT, PANEL, DANGER, TONE } from '@/app/lib/tokens'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'
const POST_PAGE_SIZE = 5

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentDetail {
  id: number
  title: string
  type: 'STUDY' | 'PROJECT'
  description?: string | null
  visibility?: 'MEMBER' | 'TEAM'
  memberCount: number
  isMember?: boolean
  isLeader?: boolean
  isArchived?: boolean
}

interface ContentMember {
  userId: number
  name: string
  nickname?: string
  studentId?: string
  department?: string
  role?: 'team_leader' | 'team_member'
}

interface ContentPost {
  id: number
  title: string
  isNotice: boolean
  kind: 'notice' | 'doc'
  docType?: 'POST' | 'REPORT' | 'MEETING' | 'MATERIALS'
  authorName: string
  createdAt: string
  hasAttachment?: boolean
}

interface Assignment {
  id: number
  title: string
  description?: string | null
  authorId?: number | null
  authorName: string
  authorIsLeader: boolean
  dueAt?: string | null
  createdAt: string
}

interface LeaderSubmission {
  id: number
  assignmentId: number
  assignmentTitle: string
  submitterName: string
  status: string
  submittedAt: string
}

interface SubmissionFile {
  id: number
  originalName: string
  fileUrl: string
  mimeType: string
  fileSize: number
}

// ─── Utils ────────────────────────────────────────────────────────────────────


// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const contentId = params.id as string

  const handleCreateDoc = async (docType: 'POST' | 'REPORT') => {
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docType === 'REPORT' ? '새 보고서' : '새 게시글', docType }),
      })
      if (!res.ok) return
      const json = await res.json()
      const newDocId = json.data?.id ?? json.id
      if (newDocId) router.push(`/content/${contentId}/docs/${newDocId}/write`)
    } catch {}
  }

  const [content, setContent] = useState<ContentDetail | null>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [reportPosts, setReportPosts] = useState<ContentPost[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [mySubmissionStatuses, setMySubmissionStatuses] = useState<Record<number, string | null>>({})
  const [leaderSubmissions, setLeaderSubmissions] = useState<LeaderSubmission[]>([])
  const [selectedSub, setSelectedSub] = useState<LeaderSubmission | null>(null)
  const [postPage, setPostPage] = useState(1)
  const [reportPage, setReportPage] = useState(1)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  const [members, setMembers] = useState<ContentMember[]>([])
  const [membersOpen, setMembersOpen] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersFetched, setMembersFetched] = useState(false)
  const [memberPos, setMemberPos] = useState({ top: 0, left: 0 })
  const memberBtnRef = useRef<HTMLButtonElement>(null)
  const memberPanelRef = useRef<HTMLDivElement>(null)

  const [delegateTarget, setDelegateTarget] = useState<ContentMember | null>(null)
  const [delegateLoading, setDelegateLoading] = useState(false)

  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [descSaving, setDescSaving] = useState(false)

  const handleSaveDescription = async () => {
    if (descSaving || !content) return
    setDescSaving(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.title,
          visibility: content.visibility,
          description: descriptionDraft,
        }),
      })
      if (res.ok) {
        setContent(prev => prev ? { ...prev, description: descriptionDraft } : prev)
        setEditingDescription(false)
      }
    } catch {
    } finally {
      setDescSaving(false)
    }
  }

  const isAdmin = user?.role === 'ADMIN'
  const currentMember = user ? members.find(member => String(member.userId) === String(user.id)) : null
  const isCurrentUserMember = !!currentMember
  const isCurrentUserLeader = currentMember?.role === 'team_leader'
  const isLeaderOrAdmin = !!content?.isLeader || isCurrentUserLeader || isAdmin
  const isArchivedContent = !!content?.isArchived
  // 보관된 페이지는 기록 보존용이라 새로 쓰거나 고칠 수 없다
  const canWriteHere = !isArchivedContent
  const canViewFull = isArchivedContent
    ? isAdmin
    : (isAdmin || !!content?.isLeader || isCurrentUserLeader || !!content?.isMember || isCurrentUserMember || (content?.visibility === 'MEMBER' && !!user))
  const isTeamOnlyPreview = (!canViewFull && content?.visibility === 'TEAM') || (isArchivedContent && !isAdmin)
  const isProject = content?.type === 'PROJECT'
  const noticePosts = posts.filter(p => p.isNotice)
  const postDocs = posts.filter(p => !p.isNotice)
  const docPosts = isProject ? reportPosts : []
  const activePostList = [...noticePosts, ...postDocs]
  const pagedPosts = activePostList.slice((postPage - 1) * POST_PAGE_SIZE, postPage * POST_PAGE_SIZE)
  const computedPostPages = Math.max(1, Math.ceil(activePostList.length / POST_PAGE_SIZE))
  const pagedReportPosts = docPosts.slice((reportPage - 1) * POST_PAGE_SIZE, reportPage * POST_PAGE_SIZE)
  const totalReportPages = Math.max(1, Math.ceil(docPosts.length / POST_PAGE_SIZE))

  const handleMemberCountClick = async () => {
    if (!memberBtnRef.current) return
    const rect = memberBtnRef.current.getBoundingClientRect()
    setMemberPos({ top: rect.bottom + 6, left: rect.left })
    setMembersOpen(v => !v)
    if (!membersFetched) {
      setMembersLoading(true)
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/members`)
        if (res.ok) {
          const json = await res.json()
          const list = json.data ?? []
          setMembers(list)
          setContent(prev => prev ? { ...prev, memberCount: list.length } : prev)
        }
      } catch {}
      finally {
        setMembersLoading(false)
        setMembersFetched(true)
      }
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        memberPanelRef.current && !memberPanelRef.current.contains(e.target as Node) &&
        memberBtnRef.current && !memberBtnRef.current.contains(e.target as Node)
      ) {
        setMembersOpen(false)
      }
    }
    const onScroll = () => setMembersOpen(false)
    window.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  const handleDelegateLeader = async (member: ContentMember) => {
    if (delegateLoading) return
    setDelegateLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/members/delegate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newLeaderId: member.userId }),
      })
      if (!res.ok) return
      setDelegateTarget(null)
      setMembersOpen(false)
      // 멤버 목록과 리더 상태 갱신
      const [contentRes, membersRes] = await Promise.all([
        fetchWithAuth(`${API_URL}/v1/contents/${contentId}`).then(r => r.ok ? r.json() : null),
        fetchWithAuth(`${API_URL}/v1/contents/${contentId}/members`).then(r => r.ok ? r.json() : null),
      ])
      const list = membersRes?.data ?? []
      setMembers(list)
      if (contentRes) {
        const data = contentRes.data ?? contentRes
        setContent({ ...data, memberCount: list.length })
      }
    } catch {
    } finally {
      setDelegateLoading(false)
    }
  }

  const handleInviteLink = async () => {
    if (inviteLoading) return
    setInviteLoading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/members/invite-link`, { method: 'POST' })
      if (!res.ok) return
      const json = await res.json()
      const link: string = json.data ?? ''
      await navigator.clipboard.writeText(link)
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 2000)
    } catch {
    } finally {
      setInviteLoading(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/members`).then(r => r.ok ? r.json() : null),
    ]).then(([contentJson, membersJson]) => {
      const list = membersJson?.data ?? []
      setMembers(list)
      setMembersFetched(true)
      if (contentJson) {
        const data = contentJson.data ?? contentJson
        const memberCount = membersJson != null ? list.length : (data.memberCount ?? 0)
        setContent({ ...data, memberCount })
      }
    }).catch(() => {})
  }, [contentId])

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs?type=POST`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs?type=REPORT`).then(r => r.ok ? r.json() : null),
    ]).then(([noticesJson, postDocsJson, reportDocsJson]) => {
      const notices: ContentPost[] = (noticesJson?.data ?? []).map((n: { id: number; title: string; createdAt: string }) => ({
        id: n.id, title: n.title, isNotice: true, kind: 'notice' as const, authorName: '', createdAt: n.createdAt,
      }))
      const mapDocs = (docsJson: { data?: Array<{ id: number; title: string; docType?: ContentPost['docType']; authorName: string; createdAt: string; files?: unknown[] }> } | null): ContentPost[] =>
        (docsJson?.data ?? []).map(d => ({
          id: d.id, title: d.title, isNotice: false, kind: 'doc' as const, docType: d.docType, authorName: d.authorName, createdAt: d.createdAt, hasAttachment: (d.files?.length ?? 0) > 0,
        }))
      const sort = (arr: ContentPost[]) => arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setPosts(sort([...notices, ...mapDocs(postDocsJson)]))
      setReportPosts(sort(mapDocs(reportDocsJson)))
    }).catch(() => {
      setPosts([])
      setReportPosts([])
    })
  }, [contentId])

  useEffect(() => {
    setPostPage(prev => Math.min(prev, computedPostPages))
  }, [computedPostPages])

  useEffect(() => {
    setReportPage(prev => Math.min(prev, totalReportPages))
  }, [totalReportPages])

  useEffect(() => {
    if (authLoading) return

    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments`)
      .then(r => r.ok ? r.json() : null)
      .then(json => setAssignments(json?.data ?? []))
      .catch(() => setAssignments([]))
  }, [contentId, authLoading, user?.id])

  useEffect(() => {
    if (!content || assignments.length === 0) return
    const leader = isLeaderOrAdmin
    if (leader) {
      Promise.allSettled(
        assignments.map(a =>
          fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${a.id}/submissions`)
            .then(r => r.ok ? r.json() : null)
            .then(json => (json?.data ?? []).map((s: { id: number; submitterName: string; status: string; submittedAt: string }) => ({
              id: s.id, assignmentId: a.id, assignmentTitle: a.title,
              submitterName: s.submitterName, status: s.status, submittedAt: s.submittedAt,
            })))
            .catch(() => [])
        )
      ).then(results => {
        setLeaderSubmissions(results.flatMap(r => r.status === 'fulfilled' ? r.value : []))
      })
    } else {
      Promise.allSettled(
        assignments.map(a =>
          fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${a.id}/submissions/me`)
            .then(r => r.ok ? r.json().then((j: { data?: { status?: string } }) => ({ id: a.id, status: j?.data?.status ?? null })) : { id: a.id, status: null })
            .catch(() => ({ id: a.id, status: null }))
        )
      ).then(results => {
        const statuses: Record<number, string | null> = {}
        results.forEach(r => { if (r.status === 'fulfilled') statuses[r.value.id] = r.value.status })
        setMySubmissionStatuses(statuses)
      })
    }
  }, [contentId, isLeaderOrAdmin, assignments])

  return (
    <main
      // 홈과 같은 흐름: 위는 네이비, 아래로 갈수록 회색 검정
      style={{
        background: 'linear-gradient(to bottom, #040d1f 0%, #040d1f 50vh, #0F0F0F 100%)',
        minHeight: '100vh',
      }}
    >
      {/* ── Header Section ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-[5vw] pt-36 pb-0">

        {/* Info card */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center rounded-xl mb-12 gap-8 md:gap-10 p-6 sm:p-8 lg:p-10"
          style={{ background: SURFACE_RAISED }}
        >
          {/* 팀 전용 미리보기 — 제목 + 안내 */}
          {isTeamOnlyPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: 0 }}>
              <nav aria-label="현재 위치" className="font-mono text-[13px] tracking-[0.02em]">
                <span className="text-fg-faint">~/</span>
                <Link href="/content" className="text-fg-subtle transition-colors hover:text-white">content</Link>
                <span className="text-fg-faint">/</span>
                <span aria-current="page" className="text-white">{contentId}</span>
              </nav>
              <h1 style={{
                color: '#fff', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900,
                letterSpacing: '-0.01em', wordBreak: 'keep-all',
                lineHeight: 1.15, margin: 0,
              }}>
                {content?.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {content && <TypeChip type={content.type} className="bg-white/10 text-white" />}
                <TeamOnlyMark className="text-fg-muted" />
              </div>
              <p style={{ fontSize: '13px', color: FG.subtle, margin: 0, lineHeight: 1.6 }}>
                팀원만 접근할 수 있는 콘텐츠입니다. 팀에 참여하려면 초대 링크가 필요합니다.
              </p>
            </div>
          )}

          {/* Left — title + badges (팀 비공개 미리보기 시 숨김) */}
          {!isTeamOnlyPreview && <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
          }}>
            {/* Mini breadcrumb — content > 스터디/프로젝트명 */}
            <nav aria-label="현재 위치" className="font-mono text-[13px] tracking-[0.02em]">
              <span className="text-fg-faint">~/</span>
              <Link href="/content" className="text-fg-subtle transition-colors hover:text-white">content</Link>
              <span className="text-fg-faint">/</span>
              <span aria-current="page" className="text-white">{contentId}</span>
            </nav>

            {/* Title */}
            <h1 style={{
              color: '#fff',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontWeight: 900,
              letterSpacing: '-0.01em',
              wordBreak: 'keep-all',
              lineHeight: 1.15,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              margin: 0,
            }}>
              {content?.title}
            </h1>

            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* 유형은 아이콘 칩, 팀 전용일 때만 자물쇠 (목록 카드와 같은 표시) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {content && <TypeChip type={content.type} className="bg-white/10 text-white" />}
                {content && content.visibility !== 'MEMBER' && <TeamOnlyMark className="text-fg-muted" />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 참여인원 — 클릭 시 멤버 목록 팝업 */}
                <div style={{ position: 'relative' }}>
                  <button
                    ref={memberBtnRef}
                    onClick={handleMemberCountClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', color: FG.subtle,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '4px 6px', borderRadius: '6px', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = FG.muted }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = FG.subtle }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    참여인원 <span style={{ color: BRAND_SOFT }}>{content?.memberCount ?? 0}명</span>
                  </button>

                  {/* 멤버 목록 팝업 */}
                  {membersOpen && typeof window !== 'undefined' && createPortal(
                    <div
                      ref={memberPanelRef}
                      style={{
                        position: 'fixed',
                        top: memberPos.top,
                        left: memberPos.left,
                        zIndex: 9999,
                        width: '260px',
                        maxHeight: '320px',
                        overflowY: 'auto',
                        background: PANEL,
                        border: `1px solid ${LINE}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      }}
                    >
                      {membersLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: FG.subtle, fontSize: '13px' }}>
                          불러오는 중...
                        </div>
                      ) : members.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: FG.subtle, fontSize: '13px' }}>
                          멤버가 없습니다.
                        </div>
                      ) : (
                        members.map((member, i) => (
                          <div
                            key={member.userId}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 14px',
                              borderBottom: i < members.length - 1 ? `1px solid ${LINE}` : 'none',
                            }}
                          >
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              background: 'rgba(28,90,255,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: BRAND_SOFT, fontSize: '12px', fontWeight: 700, flexShrink: 0,
                            }}>
                              {member.name.charAt(0)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                                {member.name}
                                {member.role === 'team_leader' && (
                                  <span style={{ marginLeft: '6px', fontSize: '10px', color: BRAND_SOFT, fontWeight: 500 }}>팀장</span>
                                )}
                              </p>
                              <p style={{ color: FG.subtle, fontSize: '11px', margin: 0 }}>
                                {[member.studentId, member.department].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            {isLeaderOrAdmin && member.role !== 'team_leader' && (
                              <button
                                onClick={() => setDelegateTarget(member)}
                                title="팀장 권한 전달"
                                style={{
                                  background: 'transparent', border: 'none', cursor: 'pointer',
                                  color: FG.subtle, padding: '2px', borderRadius: '6px',
                                  display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = TONE.yellow }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = FG.subtle }}
                              >
                                {/* 왕관 아이콘 */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 20h20M4 20l2-8 6 4 6-4 2 8"/>
                                  <circle cx="12" cy="7" r="2"/>
                                  <path d="M4 12l2-4M20 12l-2-4"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>,
                    document.body
                  )}
                </div>

                {isLeaderOrAdmin && (
                  <button
                    onClick={handleInviteLink}
                    disabled={inviteLoading}
                    title="초대 링크 생성 및 복사"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '6px',
                      background: inviteCopied ? 'rgba(134,207,146,0.12)' : 'rgba(28,90,255,0.15)',
                      border: `1px solid ${inviteCopied ? 'rgba(134,207,146,0.35)' : 'rgba(28,90,255,0.35)'}`,
                      color: inviteCopied ? TONE.green : BRAND_SOFT,
                      fontSize: '11px', fontWeight: 600,
                      cursor: inviteLoading ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {inviteCopied ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        복사됨!
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        초대 링크
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>}

          {/* Right — description */}
          <div
            className="pt-6 border-t md:pt-1 md:pl-10 md:border-t-0 md:border-l border-line"
            style={{
              display: 'flex',
              minWidth: '260px',
              maxWidth: '380px',
              flex: '0 1 340px',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '12px',
              alignSelf: 'stretch',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <p style={{
                fontSize: '12px', fontWeight: 600,
                color: FG.subtle,
                letterSpacing: '0.05em',
                margin: 0,
              }}>
                활동소개
              </p>
              {isLeaderOrAdmin && !editingDescription && (
                <button
                  onClick={() => { setDescriptionDraft(content?.description ?? ''); setEditingDescription(true) }}
                  title="소개 수정"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: FG.subtle, padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = FG.muted }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = FG.subtle }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
            {editingDescription ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={descriptionDraft}
                  onChange={e => setDescriptionDraft(e.target.value)}
                  rows={5}
                  autoFocus
                  style={{
                    width: '100%', background: SURFACE_RAISED, border: `1px solid ${LINE_STRONG}`,
                    borderRadius: '6px', padding: '8px 10px', color: FG.muted,
                    fontSize: '13px', lineHeight: 1.7, outline: 'none', resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setEditingDescription(false)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${LINE_STRONG}`, background: 'transparent', color: FG.subtle, fontSize: '12px', cursor: 'pointer' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={descSaving}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(28,90,255,0.5)', background: 'rgba(28,90,255,0.25)', color: BRAND_SOFT, fontSize: '12px', fontWeight: 600, cursor: descSaving ? 'not-allowed' : 'pointer', opacity: descSaving ? 0.6 : 1 }}
                  >
                    {descSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{
                fontSize: '14px',
                color: FG.subtle,
                lineHeight: 1.85,
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {content?.description ?? '소개가 없습니다.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Posts Section ───────────────────────────────────── */}
      {canViewFull && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ marginBottom: '48px' }}>
        {/* Section title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '6px', display: 'inline-block', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>공지 / 게시글</h2>
        </div>

        {/* Table */}
        <div style={{ borderTop: '1px solid rgba(28, 90, 255, 0.5)' }}>
          {activePostList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '48px', color: FG.subtle, fontSize: '14px' }}>
              등록된 공지나 게시글이 없습니다.
            </p>
          ) : (
            pagedPosts.map(post => (
              <PostRow key={`${post.kind}-${post.id}`} post={post} contentId={contentId} user={user} isLeaderOrAdmin={!!isLeaderOrAdmin} />
            ))
          )}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          {/* Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => setPostPage(p => Math.max(1, p - 1))}
              disabled={postPage === 1}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: postPage === 1 ? 'default' : 'pointer', color: postPage === 1 ? FG.faint : FG.subtle, borderRadius: '6px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {Array.from({ length: computedPostPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPostPage(n)}
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n === postPage ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer', color: n === postPage ? '#fff' : FG.subtle, fontSize: '13px', fontWeight: n === postPage ? 700 : 400, borderRadius: '6px', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { if (n !== postPage) (e.currentTarget as HTMLElement).style.color = FG.muted }}
                onMouseLeave={e => { if (n !== postPage) (e.currentTarget as HTMLElement).style.color = FG.subtle }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPostPage(p => Math.min(computedPostPages, p + 1))}
              disabled={postPage === computedPostPages}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: postPage === computedPostPages ? 'default' : 'pointer', color: postPage === computedPostPages ? FG.faint : FG.subtle, borderRadius: '6px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Write buttons */}
          {canWriteHere && user && (!!content?.isMember || isCurrentUserMember || isLeaderOrAdmin) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLeaderOrAdmin && (
                <Link
                  href={`/content/${contentId}/write?notice=true`}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(28,90,255,0.35)', color: BRAND_SOFT, fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(28,90,255,0.65)'; el.style.color = BRAND_SOFT }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(28,90,255,0.35)'; el.style.color = BRAND_SOFT }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  공지 작성
                </Link>
              )}
              <button
                onClick={() => handleCreateDoc('POST')}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '8px', background: 'transparent', border: `1px solid ${LINE_STRONG}`, color: FG.muted, fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.45)'; el.style.color = '#fff' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = LINE_STRONG; el.style.color = FG.muted }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                게시글 작성
              </button>
            </div>
          )}
        </div>
      </section>)}

      {/* ── Report Section (PROJECT only) ───────────────────── */}
      {canViewFull && isProject && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '6px', display: 'inline-block', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>보고서</h2>
        </div>

        <div style={{ borderTop: '1px solid rgba(28, 90, 255, 0.5)' }}>
          {docPosts.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '48px', color: FG.subtle, fontSize: '14px' }}>
              등록된 보고서가 없습니다.
            </p>
          ) : (
            pagedReportPosts.map(post => (
              <PostRow key={`${post.kind}-${post.id}`} post={post} contentId={contentId} user={user} isLeaderOrAdmin={!!isLeaderOrAdmin} />
            ))
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => setReportPage(p => Math.max(1, p - 1))}
              disabled={reportPage === 1}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: reportPage === 1 ? 'default' : 'pointer', color: reportPage === 1 ? FG.faint : FG.subtle, borderRadius: '6px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {Array.from({ length: totalReportPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setReportPage(n)}
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n === reportPage ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer', color: n === reportPage ? '#fff' : FG.subtle, fontSize: '13px', fontWeight: n === reportPage ? 700 : 400, borderRadius: '6px', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { if (n !== reportPage) (e.currentTarget as HTMLElement).style.color = FG.muted }}
                onMouseLeave={e => { if (n !== reportPage) (e.currentTarget as HTMLElement).style.color = FG.subtle }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))}
              disabled={reportPage === totalReportPages}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: reportPage === totalReportPages ? 'default' : 'pointer', color: reportPage === totalReportPages ? FG.faint : FG.subtle, borderRadius: '6px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {canWriteHere && user && (!!content?.isMember || isLeaderOrAdmin) && (
            <button
              onClick={() => handleCreateDoc('REPORT')}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '8px', background: 'transparent', border: `1px solid ${LINE_STRONG}`, color: FG.muted, fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.45)'; el.style.color = '#fff' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = LINE_STRONG; el.style.color = FG.muted }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              보고서 작성
            </button>
          )}
        </div>
      </section>)}

      {canViewFull && !isProject && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '6px', display: 'inline-block', flexShrink: 0 }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>과제</h2>
          </div>
          {/* 과제 생성은 팀장/관리자, 과제 제출은 초대받은 팀원 */}
          {canWriteHere && user && isLeaderOrAdmin && (
            <Link href={`/content/${contentId}/assignments/create`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(28,90,255,0.35)', color: BRAND_SOFT, fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              과제 생성
            </Link>
          )}
          {/* 제출은 과제 상세 페이지 안에서 팝업으로 한다 — 여기서 새 과제가 만들어지면 안 된다 */}
        </div>

        {/* 과제 목록은 팀장·팀원 모두에게 보인다. 팀원에게는 자기 제출 상태가 함께 표시된다. */}
        <div className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
          {assignments.map(a => (
            <MemberAssignmentCard
              key={a.id}
              assignment={a}
              myStatus={isLeaderOrAdmin ? undefined : mySubmissionStatuses[a.id]}
              contentId={contentId}
              currentUserId={user?.id}
            />
          ))}
          {assignments.length === 0 && (
            <EmptyAssignmentCard message='아직 등록된 과제가 없습니다.' fill />
          )}
        </div>

        {isLeaderOrAdmin && (
          <div style={{ marginTop: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ width: '3px', height: '16px', background: 'rgba(255,255,255,0.35)', borderRadius: '6px', display: 'inline-block', flexShrink: 0 }} />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: FG.muted, margin: 0 }}>제출 현황</h3>
            </div>
            {/* 제출물이 늘어나도 한 줄로 훑어볼 수 있게 좌우 스크롤 */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin' }}>
              {leaderSubmissions.map(s => (
                <LeaderSubmissionCard key={`${s.assignmentId}-${s.id}`} submission={s} onSelect={() => setSelectedSub(s)} />
              ))}
              {leaderSubmissions.length === 0 && (
                <EmptyAssignmentCard message='제출된 과제가 없습니다.' />
              )}
            </div>
          </div>
        )}
      </section>)}

      <HomeFooter />

      {/* 팀장 권한 전달 확인 모달 */}
      {delegateTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => !delegateLoading && setDelegateTarget(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: PANEL, border: `1px solid ${LINE}`,
              borderRadius: '12px', padding: '28px 32px', width: '340px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TONE.yellow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20M4 20l2-8 6 4 6-4 2 8"/>
                <circle cx="12" cy="7" r="2"/>
                <path d="M4 12l2-4M20 12l-2-4"/>
              </svg>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>팀장 권한 전달</span>
            </div>
            <p style={{ color: FG.muted, fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
              <strong style={{ color: '#fff' }}>{delegateTarget.name}</strong>님에게 팀장 권한을 전달하시겠습니까?<br />
              <span style={{ fontSize: '12px', color: FG.subtle }}>전달 후 본인은 일반 팀원이 됩니다.</span>
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDelegateTarget(null)}
                disabled={delegateLoading}
                style={{ padding: '8px 20px', borderRadius: '8px', border: `1px solid ${LINE_STRONG}`, background: 'transparent', color: FG.subtle, fontSize: '13px', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelegateLeader(delegateTarget)}
                disabled={delegateLoading}
                style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(226,196,122,0.45)', background: 'rgba(226,196,122,0.12)', color: TONE.yellow, fontSize: '13px', fontWeight: 600, cursor: delegateLoading ? 'not-allowed' : 'pointer', opacity: delegateLoading ? 0.6 : 1 }}
              >
                {delegateLoading ? '처리 중...' : '전달하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSub && (
        <SubmissionDetailModal
          index={leaderSubmissions.findIndex(x => x.id === selectedSub.id && x.assignmentId === selectedSub.assignmentId)}
          total={leaderSubmissions.length}
          onStep={(delta: number) => {
            const i = leaderSubmissions.findIndex(x => x.id === selectedSub.id && x.assignmentId === selectedSub.assignmentId)
            const next = leaderSubmissions[i + delta]
            if (next) setSelectedSub(next)
          }}
          submission={selectedSub}
          contentId={contentId}
          onClose={() => setSelectedSub(null)}
          onGraded={(submissionId, status) => {
            setLeaderSubmissions(prev =>
              prev.map(s => s.id === submissionId ? { ...s, status } : s)
            )
            setSelectedSub(prev => prev && prev.id === submissionId ? { ...prev, status } : prev)
          }}
        />
      )}
    </main>
  )
}

// ─── PostRow ──────────────────────────────────────────────────────────────────

function PostRow({
  post, contentId, user, isLeaderOrAdmin,
}: {
  post: ContentPost
  contentId: string
  user: import('@/app/context/AuthContext').AuthUser | null
  isLeaderOrAdmin: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'ADMIN'
  const isOwner = user != null && post.authorName === (user.name ?? user.nickname)
  // 게시글·보고서는 실시간 공동 편집 대상이라 접근 권한이 있으면 누구나 편집할 수 있다.
  // 삭제는 되돌릴 수 없으므로 작성자·팀장·관리자로 유지한다.
  const canEditPost = post.kind === 'notice' ? isLeaderOrAdmin : user != null
  const canDeletePost = post.kind === 'notice' ? isLeaderOrAdmin : (isOwner || isAdmin || isLeaderOrAdmin)
  const showMenu = canEditPost || canDeletePost

  const detailHref = post.kind === 'notice'
    ? `/content/${contentId}/notices/${post.id}`
    : `/content/${contentId}/docs/${post.id}`
  const editHref = post.kind === 'notice'
    ? `/content/${contentId}/notices/${post.id}/edit`
    : `/content/${contentId}/docs/${post.id}`
  const deleteApiUrl = post.kind === 'notice'
    ? `${API_URL}/v1/contents/${contentId}/notices/${post.id}`
    : `${API_URL}/v1/contents/${contentId}/docs/${post.id}`

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onScroll = () => setMenuOpen(false)
    window.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 110 })
    setMenuOpen(v => !v)
  }

  return (
    <Link
      href={detailHref}
      // 공지는 목록 위에 고정된 줄처럼: 왼쪽 파란 막대 + 옅은 파란 물결 + 압정, 제목 앞 [공지] 말머리
      style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '13px 4px', borderBottom: `1px solid ${LINE}`, gap: '12px', textDecoration: 'none', transition: 'background 0.12s', background: post.isNotice ? 'linear-gradient(to right, rgba(28,90,255,0.10), transparent 70%)' : 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = post.isNotice ? 'linear-gradient(to right, rgba(28,90,255,0.16), rgba(255,255,255,0.03) 70%)' : SURFACE }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = post.isNotice ? 'linear-gradient(to right, rgba(28,90,255,0.10), transparent 70%)' : 'transparent' }}
    >
      {post.isNotice && (
        <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: '8px', bottom: '8px', width: '2px', borderRadius: '2px', background: BRAND }} />
      )}

      {/* 공지 압정 */}
      <div style={{ width: '40px', flexShrink: 0, display: 'flex', justifyContent: 'center', color: BRAND_SOFT }}>
        {post.isNotice && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="공지">
            <path d="M12 17v5M9 10.8V4h6v6.8l3 3.2H6z"/>
          </svg>
        )}
      </div>

      {/* Title */}
      <span style={{ flex: 1, color: post.isNotice ? '#fff' : FG.muted, fontSize: '14px', fontWeight: post.isNotice ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {post.isNotice && <span style={{ color: BRAND_SOFT, fontWeight: 700, marginRight: '6px' }}>[공지]</span>}
          {post.title}
        </span>
        {post.hasAttachment && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={FG.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        )}
      </span>

      {/* Author */}
      <span style={{ fontSize: '12px', color: FG.subtle, flexShrink: 0, minWidth: '90px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {post.authorName ? `작성자 | ${post.authorName}` : ''}
      </span>

      {/* Date */}
      <span style={{ fontSize: '12px', color: FG.subtle, flexShrink: 0, minWidth: '76px', textAlign: 'right' }}>
        {formatDate(post.createdAt)}
      </span>

      {/* Kebab menu */}
      <div style={{ width: '24px', flexShrink: 0, display: 'flex', justifyContent: 'center' }} onClick={e => e.preventDefault()}>
        {showMenu ? (
          <>
            <button
              ref={btnRef}
              onClick={handleMenuToggle}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: FG.subtle, lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
            {menuOpen && typeof window !== 'undefined' && createPortal(
              <div
                ref={menuRef}
                className="popup-menu"
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999, minWidth: '110px' }}
              >
                {canEditPost && (
                  <button
                    className="popup-menu-item"
                    onClick={() => { setMenuOpen(false); window.location.href = editHref }}
                  >
                    수정하기
                  </button>
                )}
                {canDeletePost && (
                  <button
                    className="popup-menu-item is-danger"
                    onClick={async () => {
                      setMenuOpen(false)
                      if (!window.confirm('게시글을 삭제하시겠습니까?')) return
                      await fetchWithAuth(deleteApiUrl, { method: 'DELETE' })
                      window.location.reload()
                    }}
                  >
                    삭제하기
                  </button>
                )}
              </div>,
              document.body
            )}
          </>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill={FG.faint}>
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        )}
      </div>
    </Link>
  )
}

// 과제 평가 상태: 블로그 분류 라벨처럼 빛나는 점 + 같은 색 글자. 대기는 아직 결과가 없어 무채색
const STATUS_STYLE: Record<string, { label: string; color: string; dot: string; glow: string }> = {
  PENDING: { label: '평가 대기 중', color: FG.subtle,    dot: FG.faint,     glow: 'none' },
  O:       { label: '완료 (O)',     color: TONE.green,  dot: TONE.green,  glow: `0 0 8px ${TONE.green}` },
  LATE:    { label: '지각 (LATE)',  color: TONE.yellow, dot: TONE.yellow, glow: `0 0 8px ${TONE.yellow}` },
  X:       { label: '미완료 (X)',   color: TONE.red,    dot: TONE.red,    glow: `0 0 8px ${TONE.red}` },
}

function StatusLabel({ label, color, dot, glow }: { label: string; color: string; dot: string; glow: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 500, color }}>
      <span aria-hidden="true" style={{ width: '6px', height: '6px', borderRadius: '9999px', background: dot, boxShadow: glow, flexShrink: 0 }} />
      {label}
    </span>
  )
}

function MemberAssignmentCard({ assignment, myStatus, contentId, currentUserId }: { assignment: Assignment; myStatus?: string | null; contentId: string; currentUserId?: number }) {
  const s = myStatus ? (STATUS_STYLE[myStatus] ?? STATUS_STYLE.PENDING) : null
  const detailHref = `/content/${contentId}/assignments/${assignment.id}`

  const isAuthor = assignment.authorId != null && String(assignment.authorId) === String(currentUserId)
  const canSubmit = !isAuthor
  const metaLabel = canSubmit ? (s ? s.label : '미제출') : (isAuthor ? (s ? s.label : '내 과제') : assignment.authorName)
  // 제출할 수 있는 과제는 내 상태 색, 아니면(미제출·내 과제·작성자) 무채색 점
  const meta = canSubmit && s ? s : { label: metaLabel, color: FG.subtle, dot: FG.faint, glow: 'none' }

  return (
    <div
      style={{ width: '100%', padding: '18px 20px', borderRadius: '12px', background: SURFACE, border: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', gap: '6px', transition: 'border-color 0.15s, transform 0.15s' }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = LINE_STRONG; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = LINE; el.style.transform = 'translateY(0)' }}
    >
      <Link href={detailHref} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>{assignment.title}</p>
        <p style={{ fontSize: '12px', color: FG.subtle, margin: 0 }}>작성일 | {formatDate(assignment.createdAt)}</p>
        {assignment.dueAt && <p style={{ fontSize: '11px', color: FG.subtle, margin: 0 }}>마감 | {formatDate(assignment.dueAt)}</p>}
      </Link>
      <div style={{ marginTop: '8px' }}>
        <StatusLabel {...meta} label={metaLabel} />
      </div>
      <div style={{ marginTop: '10px' }}>
        <Link href={detailHref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '8px 12px', borderRadius: '8px', background: canSubmit ? 'rgba(28,90,255,0.18)' : SURFACE_RAISED, border: canSubmit ? '1px solid rgba(28,90,255,0.35)' : `1px solid ${LINE}`, color: canSubmit ? BRAND_SOFT : FG.muted, fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
          {canSubmit ? (myStatus ? '제출 수정하기' : '과제 제출하기') : '과제 보기'}
        </Link>
      </div>
    </div>
  )
}
function LeaderSubmissionCard({ submission, onSelect }: { submission: LeaderSubmission; onSelect: () => void }) {
  const s = STATUS_STYLE[submission.status] ?? STATUS_STYLE.PENDING
  return (
    <div
      onClick={onSelect}
      style={{ width: '190px', padding: '18px 20px', borderRadius: '12px', background: SURFACE, border: `1px solid ${LINE}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'border-color 0.15s, transform 0.15s', flexShrink: 0 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = LINE_STRONG; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = LINE; el.style.transform = 'translateY(0)' }}
    >
      <p style={{ fontSize: '11px', color: FG.subtle, margin: 0 }}>{submission.assignmentTitle}</p>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>제출자 | {submission.submitterName}</p>
      <p style={{ fontSize: '12px', color: FG.subtle, margin: 0 }}>작성일 | {formatDate(submission.submittedAt)}</p>
      <div style={{ marginTop: '8px' }}>
        <StatusLabel {...s} />
      </div>
    </div>
  )
}

// ─── SubmissionDetailModal ────────────────────────────────────────────────────

function EmptyAssignmentCard({ message, fill = false }: { message: string; fill?: boolean }) {
  return (
    <div
      style={{ width: fill ? '100%' : '190px', minHeight: '148px', padding: '18px 20px', borderRadius: '12px', background: SURFACE, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <p style={{ margin: 0, textAlign: 'center', fontSize: '13px', lineHeight: 1.7, color: FG.subtle }}>{message}</p>
    </div>
  )
}

interface SubmissionFull {
  id: number
  assignmentId: number
  submitterName: string
  body: string | null
  status: string
  feedback: string | null
  submittedAt: string
  files: SubmissionFile[]
}

function SubmissionDetailModal({
  submission,
  contentId,
  index,
  total,
  onStep,
  onClose,
  onGraded,
}: {
  submission: LeaderSubmission
  contentId: string
  /** 제출물 목록에서의 위치 — 모달 안에서 좌우로 넘겨볼 수 있게 한다 */
  index: number
  total: number
  onStep: (delta: number) => void
  onClose: () => void
  onGraded: (submissionId: number, status: string) => void
}) {
  const [full, setFull] = useState<SubmissionFull | null>(null)
  const [loadingFull, setLoadingFull] = useState(true)
  const [showGrade, setShowGrade] = useState(false)
  const [gradeStatus, setGradeStatus] = useState<'O' | 'LATE' | 'X'>('O')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [grading, setGrading] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)

  // 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onStep(-1)
      if (e.key === 'ArrowRight') onStep(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onStep])

  // 상세 데이터 페치
  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${submission.assignmentId}/submissions/${submission.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const d = json?.data ?? json
        if (d) {
          setFull(d)
          if (d.feedback) setGradeFeedback(d.feedback)
          if (d.status && d.status !== 'PENDING') setGradeStatus(d.status as 'O' | 'LATE' | 'X')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFull(false))
  }, [contentId, submission.assignmentId, submission.id])

  const handleGrade = async () => {
    setGradeError(null)
    setGrading(true)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${contentId}/assignments/${submission.assignmentId}/submissions/${submission.id}/grade`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: gradeStatus, feedback: gradeFeedback }),
        }
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.message ?? '평가 저장 실패')
      }
      setFull(prev => prev ? { ...prev, status: gradeStatus, feedback: gradeFeedback } : prev)
      setShowGrade(false)
      onGraded(submission.id, gradeStatus)
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setGrading(false)
    }
  }

  const displayStatus = full?.status ?? submission.status
  const st = STATUS_STYLE[displayStatus] ?? STATUS_STYLE.PENDING

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: '24px' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '12px', background: PANEL, border: `1px solid ${LINE}`, boxShadow: '0 24px 80px rgba(0,0,0,0.7)', overflow: 'hidden' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px 0', gap: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: FG.subtle, letterSpacing: '0.04em' }}>{submission.assignmentTitle}</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
              {submission.submitterName}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: FG.subtle }}>
                제출일 | {formatDate(submission.submittedAt)}
              </span>
              <StatusLabel {...st} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={() => onStep(-1)}
              disabled={index <= 0}
              title="이전 제출물 (←)"
              style={{ background: 'transparent', border: `1px solid ${LINE_STRONG}`, borderRadius: '6px', cursor: index <= 0 ? 'not-allowed' : 'pointer', color: FG.subtle, width: '26px', height: '26px', lineHeight: 1, fontSize: '13px', opacity: index <= 0 ? 0.3 : 1 }}
            >
              ‹
            </button>
            <span style={{ fontSize: '11px', color: FG.subtle, minWidth: '38px', textAlign: 'center' }}>
              {index + 1} / {total}
            </span>
            <button
              onClick={() => onStep(1)}
              disabled={index >= total - 1}
              title="다음 제출물 (→)"
              style={{ background: 'transparent', border: `1px solid ${LINE_STRONG}`, borderRadius: '6px', cursor: index >= total - 1 ? 'not-allowed' : 'pointer', color: FG.subtle, width: '26px', height: '26px', lineHeight: 1, fontSize: '13px', opacity: index >= total - 1 ? 0.3 : 1 }}
            >
              ›
            </button>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: FG.subtle, padding: '4px', lineHeight: 1, flexShrink: 0, fontSize: '20px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = FG.muted }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = FG.subtle }}
          >
            ✕
          </button>
        </div>

        <div style={{ width: '100%', height: '1px', background: SURFACE_RAISED, margin: '20px 0 0', flexShrink: 0 }} />

        {/* ── 스크롤 바디 ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 28px' }}>
          {loadingFull ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: '28px', height: '28px', border: `2px solid ${LINE}`, borderTopColor: '#1C5AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* 제출 내용 */}
              <div>
                <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: FG.subtle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>제출 내용</p>
                {full?.body ? (
                  <p style={{ margin: 0, fontSize: '14px', color: FG.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '16px', borderRadius: '12px', background: SURFACE, border: `1px solid ${LINE}` }}>
                    {full.body}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: FG.subtle, fontStyle: 'italic' }}>내용 없음</p>
                )}
              </div>

              {/* 첨부 파일 */}
              {full && full.files.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: FG.subtle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>첨부 파일</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {full.files.map(f => (
                      <a
                        key={f.id}
                        href={f.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: SURFACE, border: `1px solid ${LINE}`, textDecoration: 'none', transition: 'border-color 0.12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = LINE_STRONG }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = LINE }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={FG.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                          </svg>
                          <span style={{ fontSize: '13px', color: FG.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: FG.subtle, flexShrink: 0, marginLeft: '8px' }}>
                          {f.fileSize < 1024 ? `${f.fileSize}B` : f.fileSize < 1048576 ? `${(f.fileSize / 1024).toFixed(1)}KB` : `${(f.fileSize / 1048576).toFixed(1)}MB`}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 기존 피드백 */}
              {full?.feedback && !showGrade && (
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: FG.subtle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>피드백</p>
                  <p style={{ margin: 0, fontSize: '14px', color: FG.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '16px', borderRadius: '12px', background: 'rgba(28,90,255,0.06)', border: '1px solid rgba(28,90,255,0.18)' }}>
                    {full.feedback}
                  </p>
                </div>
              )}

              {/* 평가 패널 */}
              {!showGrade ? (
                <button
                  onClick={() => setShowGrade(true)}
                  style={{ alignSelf: 'flex-start', padding: '8px 20px', borderRadius: '8px', border: `1px solid ${LINE_STRONG}`, background: 'transparent', color: FG.muted, fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.35)'; el.style.background = SURFACE_RAISED }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = LINE_STRONG; el.style.background = 'transparent' }}
                >
                  평가하기
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px', borderRadius: '12px', background: SURFACE, border: `1px solid ${LINE}` }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: FG.subtle, letterSpacing: '0.08em', textTransform: 'uppercase' }}>평가</p>

                  {/* 상태 선택 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['O', 'LATE', 'X'] as const).map(v => {
                      const vs = STATUS_STYLE[v]
                      const active = gradeStatus === v
                      return (
                        <button
                          key={v}
                          onClick={() => setGradeStatus(v)}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${active ? `${vs.dot}99` : LINE}`, background: active ? `${vs.dot}1A` : 'transparent', color: active ? vs.color : FG.subtle, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}
                        >
                          {v}
                        </button>
                      )
                    })}
                  </div>

                  {/* 피드백 텍스트 */}
                  <textarea
                    value={gradeFeedback}
                    onChange={e => setGradeFeedback(e.target.value)}
                    rows={3}
                    placeholder="피드백을 입력하세요 (선택)"
                    style={{ resize: 'none', background: SURFACE_RAISED, border: `1px solid ${LINE}`, borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', lineHeight: 1.6 }}
                  />

                  {gradeError && <p style={{ margin: 0, fontSize: '12px', color: DANGER }}>{gradeError}</p>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setShowGrade(false); setGradeError(null) }}
                      style={{ flex: 1, padding: '9px', borderRadius: '8px', border: `1px solid ${LINE}`, background: 'transparent', color: FG.subtle, fontSize: '13px', cursor: 'pointer' }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleGrade}
                      disabled={grading}
                      style={{ flex: 2, padding: '9px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: grading ? 0.6 : 1, transition: 'opacity 0.12s' }}
                    >
                      {grading ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>,
    document.body
  )
}
