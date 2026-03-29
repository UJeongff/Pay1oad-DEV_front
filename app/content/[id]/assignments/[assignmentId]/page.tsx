'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentInfo {
  id: number
  title: string
  isLeader?: boolean
  isMember?: boolean
}

interface Assignment {
  id: number
  title: string
  description?: string | null
  authorName: string
  dueAt?: string | null
  createdAt: string
}

interface SubmissionFile {
  id: number
  originalName: string
  fileUrl: string
  mimeType: string
  fileSize: number
}

interface Submission {
  id: number
  submitterName: string
  body?: string | null
  status: string
  feedback?: string | null
  submittedAt: string
  files: SubmissionFile[]
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: '평가 대기 중', bg: 'rgba(255,165,0,0.1)',     color: '#FFB347', border: 'rgba(255,165,0,0.22)' },
  O:       { label: '완료 (O)',     bg: 'rgba(116,255,137,0.08)',   color: '#74FF89', border: 'rgba(116,255,137,0.2)' },
  LATE:    { label: '지각 (LATE)', bg: 'rgba(255,200,0,0.08)',     color: '#FFD700', border: 'rgba(255,200,0,0.2)' },
  X:       { label: '미완료 (X)',  bg: 'rgba(255,100,100,0.08)',   color: '#FF6464', border: 'rgba(255,100,100,0.2)' },
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const contentId = params.id as string
  const assignmentId = params.assignmentId as string

  const [content, setContent] = useState<ContentInfo | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)

  // Member state
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [mySubmissionChecked, setMySubmissionChecked] = useState(false)
  const [submitBody, setSubmitBody] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showResubmit, setShowResubmit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Leader state
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [gradingId, setGradingId] = useState<number | null>(null)
  const [gradeStatus, setGradeStatus] = useState<'O' | 'LATE' | 'X'>('O')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [grading, setGrading] = useState(false)

  // Edit/delete
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueAt, setEditDueAt] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const isLeaderOrAdmin = (content?.isLeader ?? false) || isAdmin

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`).then(r => r.ok ? r.json() : null),
    ]).then(([cJson, aJson]) => {
      if (cJson) setContent(cJson.data ?? cJson)
      if (aJson) setAssignment(aJson.data ?? aJson)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [contentId, assignmentId])

  // ── Role-specific fetch ────────────────────────────────────────────────────

  useEffect(() => {
    if (!content || !assignment) return
    const leader = (content.isLeader ?? false) || isAdmin
    if (leader) {
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions`)
        .then(r => r.ok ? r.json() : null)
        .then(json => json && setAllSubmissions(json.data ?? []))
        .catch(() => {})
    } else {
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/me`)
        .then(r => r.ok ? r.json() : null)
        .then(json => { if (json) setMySubmission(json.data ?? null) })
        .catch(() => {})
        .finally(() => setMySubmissionChecked(true))
    }
  }, [contentId, assignmentId, content?.isLeader, isAdmin, assignment])

  // ── Member: submit / resubmit ──────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (submitBody.trim()) formData.append('body', submitBody.trim())
      attachedFiles.forEach(f => formData.append('files', f))

      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions`,
        { method: 'POST', body: formData }
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setSubmitError(json?.message ?? '제출에 실패했습니다.')
        return
      }
      const json = await res.json()
      setMySubmission(json.data ?? null)
      setShowResubmit(false)
      setSubmitBody('')
      setAttachedFiles([])
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Leader: grade ──────────────────────────────────────────────────────────

  const handleGrade = async (submissionId: number) => {
    setGrading(true)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/${submissionId}/grade`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: gradeStatus, feedback: gradeFeedback }),
        }
      )
      if (!res.ok) return
      const json = await res.json()
      setAllSubmissions(prev => prev.map(s => s.id === submissionId ? (json.data ?? s) : s))
      setGradingId(null)
      setGradeFeedback('')
    } catch {
    } finally {
      setGrading(false)
    }
  }

  // ── Leader: edit assignment ────────────────────────────────────────────────

  const openEdit = () => {
    if (!assignment) return
    setEditTitle(assignment.title)
    setEditDescription(assignment.description ?? '')
    setEditDueAt(assignment.dueAt ? assignment.dueAt.slice(0, 16) : '')
    setEditMode(true)
  }

  const handleSave = async () => {
    if (!editTitle.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { title: editTitle.trim() }
      if (editDescription.trim()) body.description = editDescription.trim()
      if (editDueAt) body.dueAt = new Date(editDueAt).toISOString().replace('Z', '')

      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      )
      if (!res.ok) return
      const json = await res.json()
      setAssignment(json.data ?? assignment)
      setEditMode(false)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('과제를 삭제하시겠습니까?')) return
    await fetchWithAuth(
      `${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`,
      { method: 'DELETE' }
    )
    router.push(`/content/${contentId}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <main style={{ background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)', minHeight: '100vh' }} />
  )

  if (!assignment) return (
    <main style={{ background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>과제를 찾을 수 없습니다.</p>
    </main>
  )

  return (
    <main className="select-none" style={{ background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-[5vw] pt-36 pb-24">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
            <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="#1C5AFF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <Link href="/content" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Content</Link>
          <span>›</span>
          <Link href={`/content/${contentId}`} style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{content?.title ?? '...'}</Link>
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{assignment.title}</span>
        </div>

        {/* Assignment info card */}
        <div style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '36px 40px', marginBottom: '28px' }}>
          {editMode ? (
            /* ── Edit mode ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(28,90,255,0.5)', outline: 'none', color: '#fff', fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 900, paddingBottom: '8px', width: '100%', caretColor: '#1C5AFF', fontFamily: "var(--font-archivo-black),'Archivo Black',sans-serif" }}
              />
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="설명 (선택)"
                rows={4}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '12px 14px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.7, resize: 'none', outline: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600 }}>마감일</span>
                <input
                  type="datetime-local"
                  value={editDueAt}
                  onChange={e => setEditDueAt(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '6px 10px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', outline: 'none', colorScheme: 'dark' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditMode(false)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>취소</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: '#1C5AFF', color: '#fff', cursor: saving ? 'default' : 'pointer' }}>{saving ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <h1 style={{ color: '#fff', fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 900, letterSpacing: '0.03em', fontFamily: "var(--font-archivo-black),'Archivo Black',sans-serif", lineHeight: 1.2, margin: 0 }}>
                  {assignment.title}
                </h1>
                {isLeaderOrAdmin && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={openEdit} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>수정</button>
                    <button onClick={handleDelete} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(255,80,80,0.3)', background: 'rgba(255,80,80,0.08)', color: '#ff8080', cursor: 'pointer' }}>삭제</button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                <span>출제자 | {assignment.authorName}</span>
                <span>작성일 | {formatDate(assignment.createdAt)}</span>
                {assignment.dueAt && <span style={{ color: new Date(assignment.dueAt) < new Date() ? '#ff8080' : 'rgba(255,255,255,0.35)' }}>마감 | {formatDate(assignment.dueAt)}</span>}
              </div>

              {assignment.description && (
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.8, marginTop: '20px', whiteSpace: 'pre-wrap' }}>
                  {assignment.description}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Leader view: all submissions ── */}
        {isLeaderOrAdmin && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>제출 현황</h2>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>{allSubmissions.length}명</span>
            </div>

            {allSubmissions.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '24px 0' }}>아직 제출한 팀원이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allSubmissions.map(sub => {
                  const s = STATUS_STYLE[sub.status] ?? STATUS_STYLE.PENDING
                  const isGrading = gradingId === sub.id
                  return (
                    <div key={sub.id} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      {/* Submission header */}
                      <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(28,90,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ba8ff', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                          {sub.submitterName.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0 }}>{sub.submitterName}</p>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>제출일 | {formatDate(sub.submittedAt)}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                            {s.label}
                          </span>
                          <button
                            onClick={() => {
                              if (isGrading) { setGradingId(null); return }
                              setGradingId(sub.id)
                              setGradeStatus('O')
                              setGradeFeedback(sub.feedback ?? '')
                            }}
                            style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(28,90,255,0.4)', background: isGrading ? 'rgba(28,90,255,0.15)' : 'transparent', color: '#7ba8ff', cursor: 'pointer' }}
                          >
                            {isGrading ? '닫기' : '평가'}
                          </button>
                        </div>
                      </div>

                      {/* Submission body */}
                      {sub.body && (
                        <div style={{ padding: '0 24px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '14px 0 0' }}>{sub.body}</p>
                        </div>
                      )}

                      {/* Files */}
                      {sub.files && sub.files.length > 0 && (
                        <div style={{ padding: '0 24px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {sub.files.map(f => (
                            <a key={f.id} href={`${API_URL}${f.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              {f.originalName} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({formatFileSize(f.fileSize)})</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Grade panel */}
                      {isGrading && (
                        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(28,90,255,0.05)' }}>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>평가</p>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            {(['O', 'LATE', 'X'] as const).map(g => (
                              <button
                                key={g}
                                onClick={() => setGradeStatus(g)}
                                style={{
                                  padding: '6px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                  border: gradeStatus === g ? '1px solid rgba(28,90,255,0.7)' : '1px solid rgba(255,255,255,0.15)',
                                  background: gradeStatus === g ? 'rgba(28,90,255,0.2)' : 'rgba(255,255,255,0.04)',
                                  color: gradeStatus === g ? '#7ba8ff' : 'rgba(255,255,255,0.5)',
                                }}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={gradeFeedback}
                            onChange={e => setGradeFeedback(e.target.value)}
                            placeholder="피드백 (선택)"
                            rows={2}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '10px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button
                              onClick={() => handleGrade(sub.id)}
                              disabled={grading}
                              style={{ padding: '7px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: grading ? 'rgba(28,90,255,0.5)' : '#1C5AFF', color: '#fff', cursor: grading ? 'default' : 'pointer' }}
                            >
                              {grading ? '저장 중...' : '평가 저장'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Member view: my submission ── */}
        {!isLeaderOrAdmin && mySubmissionChecked && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>내 제출</h2>
            </div>

            {/* Already submitted */}
            {mySubmission && !showResubmit && (
              <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '100px', background: (STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).bg, color: (STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).color, border: `1px solid ${(STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).border}` }}>
                      {(STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).label}
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>제출일 | {formatDate(mySubmission.submittedAt)}</span>
                  </div>
                  {mySubmission.status === 'PENDING' && (
                    <button
                      onClick={() => { setShowResubmit(true); setSubmitBody(mySubmission.body ?? '') }}
                      style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                    >
                      재제출
                    </button>
                  )}
                </div>

                {mySubmission.body && (
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{mySubmission.body}</p>
                )}

                {mySubmission.files && mySubmission.files.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {mySubmission.files.map(f => (
                      <a key={f.id} href={`${API_URL}${f.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {f.originalName} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({formatFileSize(f.fileSize)})</span>
                      </a>
                    ))}
                  </div>
                )}

                {mySubmission.feedback && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(28,90,255,0.08)', border: '1px solid rgba(28,90,255,0.2)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, margin: '0 0 6px' }}>팀장 피드백</p>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{mySubmission.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Submit / resubmit form */}
            {(!mySubmission || showResubmit) && (
              <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
                {showResubmit && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '12px' }}>기존 제출을 덮어씁니다.</p>
                )}

                <textarea
                  value={submitBody}
                  onChange={e => setSubmitBody(e.target.value)}
                  placeholder="과제 내용을 입력하세요."
                  rows={6}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: 1.7, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', caretColor: '#1C5AFF' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(28,90,255,0.5)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
                />

                {/* File list */}
                {attachedFiles.length > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {attachedFiles.map((f, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px 4px 12px', borderRadius: '100px', background: 'rgba(28,90,255,0.1)', border: '1px solid rgba(28,90,255,0.25)', color: '#7ba8ff', fontSize: '12px' }}>
                        {f.name}
                        <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(123,168,255,0.6)', lineHeight: 1, padding: 0, display: 'flex' }}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {submitError && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px' }}>{submitError}</p>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    파일 첨부
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {showResubmit && (
                      <button onClick={() => setShowResubmit(false)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>취소</button>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{ padding: '7px 22px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: submitting ? 'rgba(28,90,255,0.5)' : '#1C5AFF', color: '#fff', cursor: submitting ? 'default' : 'pointer' }}
                    >
                      {submitting ? '제출 중...' : (showResubmit ? '재제출' : '제출하기')}
                    </button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) { setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = '' } }} />
              </div>
            )}
          </section>
        )}

      </div>
      <HomeFooter />
    </main>
  )
}
