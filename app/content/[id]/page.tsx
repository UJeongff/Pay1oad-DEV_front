'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const POST_PAGE_SIZE = 5

// ??? Types ????????????????????????????????????????????????????????????????????

interface ContentDetail {
  id: number
  title: string
  type: 'STUDY' | 'PROJECT'
  description?: string | null
  visibility?: 'MEMBER' | 'TEAM'
  memberCount: number
  isMember?: boolean
  isLeader?: boolean
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
  authorName: string
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

// ??? Utils ????????????????????????????????????????????????????????????????????

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

// ??? Main Page ????????????????????????????????????????????????????????????????

export default function StudyDetailPage() {
  const params = useParams()
  const { user } = useAuthContext()
  const contentId = params.id as string

  const [content, setContent] = useState<ContentDetail | null>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
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
    if (descSaving) return
    setDescSaving(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descriptionDraft }),
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
  const isLeaderOrAdmin = content?.isLeader || isAdmin
  const canViewFull = isAdmin || content?.isLeader || content?.isMember || (content?.visibility === 'MEMBER' && !!user)
  const isProject = content?.type === 'PROJECT'
  const noticePosts = posts.filter(p => p.isNotice)
  const postDocs = posts.filter(p => !p.isNotice && p.docType === 'POST')
  const reportDocs = posts.filter(p => !p.isNotice && p.docType === 'REPORT')
  const docPosts = isProject ? reportDocs : postDocs
  const activePostList = isProject ? noticePosts : posts
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
      // 硫ㅻ쾭 紐⑸줉怨?由щ뜑 ?곹깭 媛깆떊
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
      fetch(`${API_URL}/v1/contents/${contentId}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch(`${API_URL}/v1/contents/${contentId}/members`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ]).then(([contentJson, membersJson]) => {
      const list = membersJson?.data ?? []
      setMembers(list)
      setMembersFetched(true)
      if (contentJson) {
        const data = contentJson.data ?? contentJson
        setContent({ ...data, memberCount: list.length })
      }
    }).catch(() => {})
  }, [contentId])

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/v1/contents/${contentId}/notices`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs?type=POST`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs?type=REPORT`).then(r => r.ok ? r.json() : null),
    ]).then(([noticesJson, postDocsJson, reportDocsJson]) => {
      const notices: ContentPost[] = (noticesJson?.data ?? []).map((n: { id: number; title: string; createdAt: string }) => ({
        id: n.id, title: n.title, isNotice: true, kind: 'notice' as const, authorName: '', createdAt: n.createdAt,
      }))
      const postDocs: ContentPost[] = (postDocsJson?.data ?? []).map((d: { id: number; title: string; docType: 'POST'; authorName: string; createdAt: string; files?: unknown[] }) => ({
        id: d.id, title: d.title, isNotice: false, kind: 'doc' as const, docType: d.docType, authorName: d.authorName, createdAt: d.createdAt, hasAttachment: (d.files?.length ?? 0) > 0,
      }))
      const reportDocs: ContentPost[] = (reportDocsJson?.data ?? []).map((d: { id: number; title: string; docType: 'REPORT'; authorName: string; createdAt: string; files?: unknown[] }) => ({
        id: d.id, title: d.title, isNotice: false, kind: 'doc' as const, docType: d.docType, authorName: d.authorName, createdAt: d.createdAt, hasAttachment: (d.files?.length ?? 0) > 0,
      }))
      const sort = (arr: ContentPost[]) => arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const combined = [...sort(notices), ...sort(postDocs), ...sort(reportDocs)]
      setPosts(combined)
    }).catch(() => {})
  }, [contentId])

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments`)
      .then(r => r.ok ? r.json() : null)
      .then(json => json && setAssignments(json.data ?? []))
      .catch(() => {})
  }, [contentId])

  useEffect(() => {
    if (!content || assignments.length === 0) return
    const leader = (content.isLeader ?? false) || isAdmin
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
  }, [contentId, content?.isLeader, isAdmin, assignments])

  return (
    <main
      className="select-none"
      style={{
        background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)',
        minHeight: '100vh',
      }}
    >
      {/* ?? Header Section ???????????????????????????????????? */}
      <section className="max-w-5xl mx-auto px-[5vw] pt-36 pb-0">

        {/* Info card */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center rounded-[10px] mb-12 gap-8 md:gap-10 p-6 sm:p-8 lg:p-10"
          style={{ background: 'rgba(255, 255, 255, 0.05)' }}
        >
          {/* Left ??title + badges */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
          }}>
            {/* Mini breadcrumb ??content > ?ㅽ꽣???꾨줈?앺듃紐?*/}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="#1C5AFF" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
              <Link href="/content" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textDecoration: 'none', transition: 'color 0.15s', lineHeight: 1, paddingTop: '2px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}>
                Content
              </Link>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', lineHeight: 1, paddingTop: '2px' }}>&gt;</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', lineHeight: 1, paddingTop: '2px' }}>
                {content?.title ?? '...'}
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              color: '#fff',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontWeight: 900,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
              lineHeight: 1.1,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              margin: 0,
            }}>
              {content?.title}
            </h1>

            {/* Badges row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '4px 14px',
                  borderRadius: '100px', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                }}>
                  {content?.type === 'STUDY' ? 'Study' : 'Project'}
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 600, padding: '4px 14px',
                  borderRadius: '100px', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {content?.visibility === 'MEMBER' ? 'Public' : 'Only Team'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 李몄뿬?몄썝 ???대┃ ??硫ㅻ쾭 紐⑸줉 ?앹뾽 */}
                <div style={{ position: 'relative' }}>
                  <button
                    ref={memberBtnRef}
                    onClick={handleMemberCountClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', color: 'rgba(255,255,255,0.35)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '4px 6px', borderRadius: '6px', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    ???? <span style={{ color: '#5C88FF' }}>{content?.memberCount ?? 0}?</span>
                  </button>

                  {/* 硫ㅻ쾭 紐⑸줉 ?앹뾽 */}
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
                        background: 'rgba(10,15,30,0.97)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      }}
                    >
                      {membersLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                          遺덈윭?ㅻ뒗 以?..
                        </div>
                      ) : members.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                          硫ㅻ쾭媛 ?놁뒿?덈떎.
                        </div>
                      ) : (
                        members.map((member, i) => (
                          <div
                            key={member.userId}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 14px',
                              borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            }}
                          >
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              background: 'rgba(28,90,255,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#7ba8ff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                            }}>
                              {member.name.charAt(0)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                                {member.name}
                                {member.role === 'team_leader' && (
                                  <span style={{ marginLeft: '6px', fontSize: '10px', color: '#91CDFF', fontWeight: 500 }}>??</span>
                                )}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>
                                {[member.studentId, member.department].filter(Boolean).join(' ? ')}
                              </p>
                            </div>
                            {isLeaderOrAdmin && member.role !== 'team_leader' && (
                              <button
                                onClick={() => setDelegateTarget(member)}
                                title="???沅뚰븳 ?꾨떖"
                                style={{
                                  background: 'transparent', border: 'none', cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.3)', padding: '2px', borderRadius: '4px',
                                  display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FFD166' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}
                              >
                                {/* ?뺢? ?꾩씠肄?*/}
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
                    title="珥덈? 留곹겕 ?앹꽦 諛?蹂듭궗"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '6px',
                      background: inviteCopied ? 'rgba(116,255,137,0.12)' : 'rgba(28,90,255,0.15)',
                      border: `1px solid ${inviteCopied ? 'rgba(116,255,137,0.3)' : 'rgba(28,90,255,0.35)'}`,
                      color: inviteCopied ? '#74FF89' : '#91CDFF',
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
                        蹂듭궗??
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                        珥덈? 留곹겕
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right ??description */}
          <div style={{
            display: 'flex',
            minWidth: '260px',
            maxWidth: '380px',
            flex: '0 1 340px',
            padding: '24px 28px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '12px',
            alignSelf: 'stretch',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.10)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <p style={{
                fontSize: '12px', fontWeight: 600,
                color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.05em',
                margin: 0,
              }}>
                ?쒕룞?뚭컻 |
              </p>
              {isLeaderOrAdmin && !editingDescription && (
                <button
                  onClick={() => { setDescriptionDraft(content?.description ?? ''); setEditingDescription(true) }}
                  title="?뚭컻 ?섏젙"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)' }}
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
                    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px', padding: '8px 10px', color: 'rgba(255,255,255,0.8)',
                    fontSize: '13px', lineHeight: 1.7, outline: 'none', resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setEditingDescription(false)}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer' }}
                  >
                    痍⑥냼
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    disabled={descSaving}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(28,90,255,0.5)', background: 'rgba(28,90,255,0.25)', color: '#91CDFF', fontSize: '12px', fontWeight: 600, cursor: descSaving ? 'not-allowed' : 'pointer', opacity: descSaving ? 0.6 : 1 }}
                  >
                    {descSaving ? '?? ?...' : '??'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.85,
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {content?.description ?? '?뚭컻媛 ?놁뒿?덈떎.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ?? Posts Section ????????????????????????????????????? */}
      {canViewFull && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ marginBottom: '48px' }}>
        {/* Section title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>寃뚯떆湲</h2>
        </div>

        {/* Table */}
        <div style={{ borderTop: '1px solid rgba(28, 90, 255, 0.5)' }}>
          {activePostList.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              寃뚯떆湲???놁뒿?덈떎.
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
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: postPage === 1 ? 'default' : 'pointer', color: postPage === 1 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)', borderRadius: '5px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {Array.from({ length: computedPostPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPostPage(n)}
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n === postPage ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer', color: n === postPage ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: n === postPage ? 700 : 400, borderRadius: '5px', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { if (n !== postPage) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)' }}
                onMouseLeave={e => { if (n !== postPage) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPostPage(p => Math.min(computedPostPages, p + 1))}
              disabled={postPage === computedPostPages}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: postPage === computedPostPages ? 'default' : 'pointer', color: postPage === computedPostPages ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)', borderRadius: '5px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Write buttons */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLeaderOrAdmin && (
                <Link
                  href={`/content/${contentId}/write?notice=true`}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(28,90,255,0.35)', color: '#91CDFF', fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(28,90,255,0.65)'; el.style.color = '#c0deff' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(28,90,255,0.35)'; el.style.color = '#91CDFF' }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  怨듭? ?묒꽦
                </Link>
              )}
              <Link
                href={`/content/${contentId}/write`}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.45)'; el.style.color = '#fff' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.color = 'rgba(255,255,255,0.65)' }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                湲?곌린
              </Link>
            </div>
          )}
        </div>
      </section>)}

      {/* ?? Report Section (PROJECT only) ????????????????????? */}
      {canViewFull && isProject && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>???</h2>
        </div>

        <div style={{ borderTop: '1px solid rgba(28, 90, 255, 0.5)' }}>
          {docPosts.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              蹂닿퀬?쒓? ?놁뒿?덈떎.
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
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: reportPage === 1 ? 'default' : 'pointer', color: reportPage === 1 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)', borderRadius: '5px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {Array.from({ length: totalReportPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setReportPage(n)}
                style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: n === reportPage ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', cursor: 'pointer', color: n === reportPage ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: n === reportPage ? 700 : 400, borderRadius: '5px', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { if (n !== reportPage) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)' }}
                onMouseLeave={e => { if (n !== reportPage) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))}
              disabled={reportPage === totalReportPages}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: reportPage === totalReportPages ? 'default' : 'pointer', color: reportPage === totalReportPages ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)', borderRadius: '5px' }}
            >
              <svg width="6" height="11" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {user && (
            <Link
              href={`/content/${contentId}/write`}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 16px', borderRadius: '7px', background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: 500, textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.45)'; el.style.color = '#fff' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.color = 'rgba(255,255,255,0.65)' }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              湲?곌린
            </Link>
          )}
        </div>
      </section>)}

      {/* ?? Assignments Section (STUDY only) ?????????????????? */}
      {canViewFull && !isProject && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>怨쇱젣</h2>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>

          {/* Leader view: submission cards */}
          {isLeaderOrAdmin ? (
            <>
              {leaderSubmissions.map(s => (
                <LeaderSubmissionCard key={`${s.assignmentId}-${s.id}`} submission={s} onSelect={() => setSelectedSub(s)} />
              ))}
              {leaderSubmissions.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '24px 0' }}>?쒖텧??怨쇱젣媛 ?놁뒿?덈떎.</p>
              )}
            </>
          ) : (
            <>
              {assignments.map(a => (
                <MemberAssignmentCard key={a.id} assignment={a} myStatus={mySubmissionStatuses[a.id]} contentId={contentId} />
              ))}
              {assignments.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '24px 0' }}>怨쇱젣媛 ?놁뒿?덈떎.</p>
              )}
            </>
          )}
        </div>
      </section>)}

      <HomeFooter />

      {/* ???沅뚰븳 ?꾨떖 ?뺤씤 紐⑤떖 */}
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
              background: '#0D1530', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px', padding: '28px 32px', width: '340px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20M4 20l2-8 6 4 6-4 2 8"/>
                <circle cx="12" cy="7" r="2"/>
                <path d="M4 12l2-4M20 12l-2-4"/>
              </svg>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>???沅뚰븳 ?꾨떖</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
              <strong style={{ color: '#fff' }}>{delegateTarget.name}</strong>?섏뿉寃????沅뚰븳???꾨떖?섏떆寃좎뒿?덇퉴?<br />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>?꾨떖 ??蹂몄씤? ?쇰컲 ??먯씠 ?⑸땲??</span>
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDelegateTarget(null)}
                disabled={delegateLoading}
                style={{ padding: '8px 20px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}
              >
                痍⑥냼
              </button>
              <button
                onClick={() => handleDelegateLeader(delegateTarget)}
                disabled={delegateLoading}
                style={{ padding: '8px 20px', borderRadius: '7px', border: '1px solid rgba(255,166,0,0.4)', background: 'rgba(255,166,0,0.15)', color: '#FFD166', fontSize: '13px', fontWeight: 600, cursor: delegateLoading ? 'not-allowed' : 'pointer', opacity: delegateLoading ? 0.6 : 1 }}
              >
                {delegateLoading ? '泥섎━ 以?..' : '?꾨떖?섍린'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSub && (
        <SubmissionDetailModal
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

// ??? PostRow ??????????????????????????????????????????????????????????????????

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
  const showMenu = post.kind === 'notice' ? isLeaderOrAdmin : isAdmin || isOwner

  const detailHref = post.kind === 'notice'
    ? `/content/${contentId}/notices/${post.id}`
    : `/content/${contentId}/docs/${post.id}`
  const editHref = post.kind === 'notice'
    ? `/content/${contentId}/notices/${post.id}/edit`
    : `/content/${contentId}/docs/${post.id}/edit`
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
      style={{ display: 'flex', alignItems: 'center', padding: '13px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '12px', textDecoration: 'none', transition: 'background 0.12s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Notice badge */}
      <div style={{ width: '40px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {post.isNotice && (
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'rgba(28,90,255,0.18)', color: '#91CDFF', border: '1px solid rgba(28,90,255,0.35)', whiteSpace: 'nowrap' }}>
            怨듭?
          </span>
        )}
      </div>

      {/* Title */}
      <span style={{ flex: 1, color: post.isNotice ? '#fff' : 'rgba(255,255,255,0.78)', fontSize: '14px', fontWeight: post.isNotice ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
        {post.hasAttachment && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        )}
      </span>

      {/* Author */}
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)', flexShrink: 0, minWidth: '90px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {post.authorName ? `?묒꽦??| ${post.authorName}` : ''}
      </span>

      {/* Date */}
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.28)', flexShrink: 0, minWidth: '76px', textAlign: 'right' }}>
        {formatDate(post.createdAt)}
      </span>

      {/* Kebab menu */}
      <div style={{ width: '24px', flexShrink: 0, display: 'flex', justifyContent: 'center' }} onClick={e => e.preventDefault()}>
        {showMenu ? (
          <>
            <button
              ref={btnRef}
              onClick={handleMenuToggle}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'rgba(255,255,255,0.3)', lineHeight: 1, display: 'flex', alignItems: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
            {menuOpen && typeof window !== 'undefined' && createPortal(
              <div
                ref={menuRef}
                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999, minWidth: '110px', display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', borderRadius: '8px', background: 'rgba(8,12,28,0.97)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
              >
                {isOwner && (
                  <button
                    style={{ background: 'rgba(36,36,36,0.8)', border: 'none', color: 'rgba(255,255,255,0.82)', fontSize: '12px', fontWeight: 500, padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', width: '100%' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                    onClick={() => { setMenuOpen(false); window.location.href = editHref }}
                  >
                    ?섏젙?섍린
                  </button>
                )}
                <button
                  style={{ background: 'rgba(36,36,36,0.8)', border: 'none', color: '#f87171', fontSize: '12px', fontWeight: 500, padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', width: '100%' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                  onClick={async () => {
                    setMenuOpen(false)
                    if (!window.confirm('寃뚯떆湲????젣?섏떆寃좎뒿?덇퉴?')) return
                    await fetchWithAuth(deleteApiUrl, { method: 'DELETE' })
                    window.location.reload()
                  }}
                >
                  ??젣?섍린
                </button>
              </div>,
              document.body
            )}
          </>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.18)">
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        )}
      </div>
    </Link>
  )
}

// ??? MemberAssignmentCard ????????????????????????????????????????????????????

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: '?? ?? ?', bg: 'rgba(255,165,0,0.1)', color: '#FFB347', border: 'rgba(255,165,0,0.22)' },
  O:       { label: '?? (O)',     bg: 'rgba(116,255,137,0.08)', color: '#74FF89', border: 'rgba(116,255,137,0.2)' },
  LATE:    { label: '?? (LATE)', bg: 'rgba(255,200,0,0.08)', color: '#FFD700', border: 'rgba(255,200,0,0.2)' },
  X:       { label: '??? (X)',  bg: 'rgba(255,100,100,0.08)', color: '#FF6464', border: 'rgba(255,100,100,0.2)' },
}

function MemberAssignmentCard({ assignment, myStatus, contentId }: { assignment: Assignment; myStatus?: string | null; contentId: string }) {
  const s = myStatus ? (STATUS_STYLE[myStatus] ?? STATUS_STYLE.PENDING) : null
  return (
    <Link
      href={`/content/${contentId}/assignments/${assignment.id}`}
      style={{ width: '190px', padding: '18px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'border-color 0.15s, transform 0.15s', flexShrink: 0 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.transform = 'translateY(0)' }}
    >
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>{assignment.title}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)', margin: 0 }}>?묒꽦??| {formatDate(assignment.createdAt)}</p>
      {assignment.dueAt && (
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>留덇컧 | {formatDate(assignment.dueAt)}</p>
      )}
      <div style={{ marginTop: '8px' }}>
        {s ? (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {s.label}
          </span>
        ) : (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
            誘몄젣異?
          </span>
        )}
      </div>
    </Link>
  )
}

// ??? LeaderSubmissionCard ?????????????????????????????????????????????????????

function LeaderSubmissionCard({ submission, onSelect }: { submission: LeaderSubmission; onSelect: () => void }) {
  const s = STATUS_STYLE[submission.status] ?? STATUS_STYLE.PENDING
  return (
    <div
      onClick={onSelect}
      style={{ width: '190px', padding: '18px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'border-color 0.15s, transform 0.15s', flexShrink: 0 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.transform = 'translateY(0)' }}
    >
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{submission.assignmentTitle}</p>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>?쒖텧??| {submission.submitterName}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)', margin: 0 }}>?묒꽦??| {formatDate(submission.submittedAt)}</p>
      <div style={{ marginTop: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
          {s.label}
        </span>
      </div>
    </div>
  )
}

// ??? SubmissionDetailModal ????????????????????????????????????????????????????

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
  onClose,
  onGraded,
}: {
  submission: LeaderSubmission
  contentId: string
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

  // ?ㅽ겕濡??좉툑
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // ESC ?リ린
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ?곸꽭 ?곗씠???섏튂
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
        throw new Error(d?.message ?? '?됯? ????ㅽ뙣')
      }
      setFull(prev => prev ? { ...prev, status: gradeStatus, feedback: gradeFeedback } : prev)
      setShowGrade(false)
      onGraded(submission.id, gradeStatus)
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : '?ㅻ쪟 諛쒖깮')
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
        style={{ width: '100%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: '#0E1427', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', overflow: 'hidden' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ?? ?ㅻ뜑 ?? */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px 28px 0', gap: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>{submission.assignmentTitle}</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
              {submission.submitterName}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                ?쒖텧??| {formatDate(submission.submittedAt)}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                {st.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px', lineHeight: 1, flexShrink: 0, fontSize: '20px' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)' }}
          >
            ??
          </button>
        </div>

        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.07)', margin: '20px 0 0', flexShrink: 0 }} />

        {/* ?? ?ㅽ겕濡?諛붾뵒 ?? */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 28px' }}>
          {loadingFull ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.12)', borderTopColor: '#1C5AFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* ?쒖텧 ?댁슜 */}
              <div>
                <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>?쒖텧 ?댁슜</p>
                {full?.body ? (
                  <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {full.body}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>?댁슜 ?놁쓬</p>
                )}
              </div>

              {/* 泥⑤? ?뚯씪 */}
              {full && full.files.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>泥⑤? ?뚯씪</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {full.files.map(f => (
                      <a
                        key={f.id}
                        href={f.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none', transition: 'border-color 0.12s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                          </svg>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginLeft: '8px' }}>
                          {f.fileSize < 1024 ? `${f.fileSize}B` : f.fileSize < 1048576 ? `${(f.fileSize / 1024).toFixed(1)}KB` : `${(f.fileSize / 1048576).toFixed(1)}MB`}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 湲곗〈 ?쇰뱶諛?*/}
              {full?.feedback && !showGrade && (
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>???</p>
                  <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '16px', borderRadius: '10px', background: 'rgba(28,90,255,0.06)', border: '1px solid rgba(28,90,255,0.18)' }}>
                    {full.feedback}
                  </p>
                </div>
              )}

              {/* ?됯? ?⑤꼸 */}
              {!showGrade ? (
                <button
                  onClick={() => setShowGrade(true)}
                  style={{ alignSelf: 'flex-start', padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.35)'; el.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.15)'; el.style.background = 'transparent' }}
                >
                  ?됯??섍린
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>?됯?</p>

                  {/* ?곹깭 ?좏깮 */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['O', 'LATE', 'X'] as const).map(v => {
                      const vs = STATUS_STYLE[v]
                      const active = gradeStatus === v
                      return (
                        <button
                          key={v}
                          onClick={() => setGradeStatus(v)}
                          style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${active ? vs.border : 'rgba(255,255,255,0.1)'}`, background: active ? vs.bg : 'transparent', color: active ? vs.color : 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}
                        >
                          {v}
                        </button>
                      )
                    })}
                  </div>

                  {/* ?쇰뱶諛??띿뒪??*/}
                  <textarea
                    value={gradeFeedback}
                    onChange={e => setGradeFeedback(e.target.value)}
                    rows={3}
                    placeholder="?쇰뱶諛깆쓣 ?낅젰?섏꽭??(?좏깮)"
                    style={{ resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', lineHeight: 1.6 }}
                  />

                  {gradeError && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{gradeError}</p>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setShowGrade(false); setGradeError(null) }}
                      style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
                    >
                      痍⑥냼
                    </button>
                    <button
                      onClick={handleGrade}
                      disabled={grading}
                      style={{ flex: 2, padding: '9px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: grading ? 0.6 : 1, transition: 'opacity 0.12s' }}
                    >
                      {grading ? '?? ?...' : '??'}
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

