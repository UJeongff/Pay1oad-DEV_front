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
}

interface ContentMember {
  id: number
  name: string
  studentId?: string
  department?: string
  role?: 'LEADER' | 'MEMBER'
}

interface ContentPost {
  id: number
  title: string
  isNotice: boolean
  kind: 'notice' | 'doc'
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

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudyDetailPage() {
  const params = useParams()
  const { user } = useAuthContext()
  const contentId = params.id as string

  const [content, setContent] = useState<ContentDetail | null>(null)
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [mySubmissionStatuses, setMySubmissionStatuses] = useState<Record<number, string | null>>({})
  const [leaderSubmissions, setLeaderSubmissions] = useState<LeaderSubmission[]>([])
  const [postPage, setPostPage] = useState(1)
  const [totalPostPages, setTotalPostPages] = useState(1)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  const [members, setMembers] = useState<ContentMember[]>([])
  const [membersOpen, setMembersOpen] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersFetched, setMembersFetched] = useState(false)
  const [memberPos, setMemberPos] = useState({ top: 0, left: 0 })
  const memberBtnRef = useRef<HTMLButtonElement>(null)
  const memberPanelRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'ADMIN'
  const isLeaderOrAdmin = content?.isLeader || isAdmin
  const canViewFull = isAdmin || content?.isMember || content?.isLeader
  const pagedPosts = posts.slice((postPage - 1) * POST_PAGE_SIZE, postPage * POST_PAGE_SIZE)

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
        setContent({ ...data, memberCount: list.length })
      }
    }).catch(() => {})
  }, [contentId])

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/notices`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs`).then(r => r.ok ? r.json() : null),
    ]).then(([noticesJson, docsJson]) => {
      const notices: ContentPost[] = (noticesJson?.data ?? []).map((n: { id: number; title: string; createdAt: string }) => ({
        id: n.id, title: n.title, isNotice: true, kind: 'notice' as const, authorName: '', createdAt: n.createdAt,
      }))
      const docs: ContentPost[] = (docsJson?.data ?? []).map((d: { id: number; title: string; authorName: string; createdAt: string; files?: unknown[] }) => ({
        id: d.id, title: d.title, isNotice: false, kind: 'doc' as const, authorName: d.authorName, createdAt: d.createdAt, hasAttachment: (d.files?.length ?? 0) > 0,
      }))
      const sort = (arr: ContentPost[]) => arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const combined = [...sort(notices), ...sort(docs)]
      setPosts(combined)
      setTotalPostPages(Math.max(1, Math.ceil(combined.length / POST_PAGE_SIZE)))
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
      {/* ── Header Section ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-[5vw] pt-36 pb-0">

        {/* Info card */}
        <div style={{
          display: 'flex',
          padding: '40px',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.05)',
          marginBottom: '48px',
          gap: '40px',
        }}>
          {/* Left — title + badges */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
          }}>
            {/* Mini breadcrumb — content > 스터디/프로젝트명 */}
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
                {/* 참여인원 — 클릭 시 멤버 목록 팝업 */}
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
                    참여인원 <span style={{ color: '#5C88FF' }}>{content?.memberCount ?? 0}명</span>
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
                        background: 'rgba(10,15,30,0.97)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      }}
                    >
                      {membersLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                          불러오는 중...
                        </div>
                      ) : members.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                          멤버가 없습니다.
                        </div>
                      ) : (
                        members.map((member, i) => (
                          <div
                            key={member.id}
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
                            <div>
                              <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                                {member.name}
                                {member.role === 'LEADER' && (
                                  <span style={{ marginLeft: '6px', fontSize: '10px', color: '#91CDFF', fontWeight: 500 }}>팀장</span>
                                )}
                              </p>
                              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>
                                {[member.studentId, member.department].filter(Boolean).join(' · ')}
                              </p>
                            </div>
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
          </div>

          {/* Right — description */}
          <div style={{
            display: 'flex',
            width: '380px',
            padding: '24px 28px',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '12px',
            flexShrink: 0,
            alignSelf: 'stretch',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.10)',
          }}>
            <p style={{
              fontSize: '12px', fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.05em',
              margin: 0,
            }}>
              활동소개 |
            </p>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.85,
              margin: 0,
            }}>
              {content?.description ?? '소개가 없습니다.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Posts Section ───────────────────────────────────── */}
      {canViewFull && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ marginBottom: '48px' }}>
        {/* Section title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>게시글</h2>
        </div>

        {/* Table */}
        <div style={{ borderTop: '1px solid rgba(28, 90, 255, 0.5)' }}>
          {posts.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              게시글이 없습니다.
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
            {Array.from({ length: totalPostPages }, (_, i) => i + 1).map(n => (
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
              onClick={() => setPostPage(p => Math.min(totalPostPages, p + 1))}
              disabled={postPage === totalPostPages}
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: postPage === totalPostPages ? 'default' : 'pointer', color: postPage === totalPostPages ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)', borderRadius: '5px' }}
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
                  공지 작성
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
                글쓰기
              </Link>
            </div>
          )}
        </div>
      </section>)}

      {/* ── Assignments Section ─────────────────────────────── */}
      {canViewFull && (<section className="max-w-5xl mx-auto px-[5vw]" style={{ paddingBottom: '80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>과제</h2>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {/* Add card — leader only */}
          {isLeaderOrAdmin && (
            <Link
              href={`/content/${contentId}/assignments/create`}
              style={{ width: '170px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1.5px dashed rgba(255,255,255,0.13)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textDecoration: 'none', flexShrink: 0, transition: 'border-color 0.15s, background 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.28)'; el.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.13)'; el.style.background = 'rgba(255,255,255,0.02)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Link>
          )}

          {/* Leader view: submission cards */}
          {isLeaderOrAdmin ? (
            <>
              {leaderSubmissions.map(s => (
                <LeaderSubmissionCard key={`${s.assignmentId}-${s.id}`} submission={s} contentId={contentId} />
              ))}
              {leaderSubmissions.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '24px 0' }}>제출된 과제가 없습니다.</p>
              )}
            </>
          ) : (
            <>
              {assignments.map(a => (
                <MemberAssignmentCard key={a.id} assignment={a} myStatus={mySubmissionStatuses[a.id]} contentId={contentId} />
              ))}
              {assignments.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '24px 0' }}>과제가 없습니다.</p>
              )}
            </>
          )}
        </div>
      </section>)}

      <HomeFooter />
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
  const isOwner = user != null && post.authorName === user.nickname
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
            공지
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
        {post.authorName ? `작성자 | ${post.authorName}` : ''}
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
                    수정하기
                  </button>
                )}
                <button
                  style={{ background: 'rgba(36,36,36,0.8)', border: 'none', color: '#f87171', fontSize: '12px', fontWeight: 500, padding: '7px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', width: '100%' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(36,36,36,0.8)' }}
                  onClick={async () => {
                    setMenuOpen(false)
                    if (!window.confirm('게시글을 삭제하시겠습니까?')) return
                    await fetchWithAuth(deleteApiUrl, { method: 'DELETE' })
                    window.location.reload()
                  }}
                >
                  삭제하기
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

// ─── MemberAssignmentCard ────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: '평가 대기 중', bg: 'rgba(255,165,0,0.1)', color: '#FFB347', border: 'rgba(255,165,0,0.22)' },
  O:       { label: '완료 (O)',     bg: 'rgba(116,255,137,0.08)', color: '#74FF89', border: 'rgba(116,255,137,0.2)' },
  LATE:    { label: '지각 (LATE)', bg: 'rgba(255,200,0,0.08)', color: '#FFD700', border: 'rgba(255,200,0,0.2)' },
  X:       { label: '미완료 (X)',  bg: 'rgba(255,100,100,0.08)', color: '#FF6464', border: 'rgba(255,100,100,0.2)' },
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
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)', margin: 0 }}>작성일 | {formatDate(assignment.createdAt)}</p>
      {assignment.dueAt && (
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>마감 | {formatDate(assignment.dueAt)}</p>
      )}
      <div style={{ marginTop: '8px' }}>
        {s ? (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            {s.label}
          </span>
        ) : (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
            미제출
          </span>
        )}
      </div>
    </Link>
  )
}

// ─── LeaderSubmissionCard ─────────────────────────────────────────────────────

function LeaderSubmissionCard({ submission, contentId }: { submission: LeaderSubmission; contentId: string }) {
  const s = STATUS_STYLE[submission.status] ?? STATUS_STYLE.PENDING
  return (
    <Link
      href={`/content/${contentId}/assignments/${submission.assignmentId}`}
      style={{ width: '190px', padding: '18px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'border-color 0.15s, transform 0.15s', flexShrink: 0 }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.transform = 'translateY(0)' }}
    >
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{submission.assignmentTitle}</p>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4, margin: 0 }}>제출자 | {submission.submitterName}</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)', margin: 0 }}>작성일 | {formatDate(submission.submittedAt)}</p>
      <div style={{ marginTop: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
          {s.label}
        </span>
      </div>
    </Link>
  )
}
