'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

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
  PENDING: { label: '평가 대기 중', bg: 'rgba(255,165,0,0.1)', color: '#FFB347', border: 'rgba(255,165,0,0.22)' },
  O: { label: '완료 (O)', bg: 'rgba(116,255,137,0.08)', color: '#74FF89', border: 'rgba(116,255,137,0.2)' },
  LATE: { label: '지각 (LATE)', bg: 'rgba(255,200,0,0.08)', color: '#FFD700', border: 'rgba(255,200,0,0.2)' },
  X: { label: '미완료 (X)', bg: 'rgba(255,100,100,0.08)', color: '#FF6464', border: 'rgba(255,100,100,0.2)' },
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const contentId = params.id as string
  const assignmentId = params.assignmentId as string

  const [content, setContent] = useState<ContentInfo | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)

  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [mySubmissionChecked, setMySubmissionChecked] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [gradingId, setGradingId] = useState<number | null>(null)
  const [gradeStatus, setGradeStatus] = useState<'O' | 'LATE' | 'X'>('O')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [grading, setGrading] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueAt, setEditDueAt] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const isLeaderOrAdmin = (content?.isLeader ?? false) || isAdmin
  const isAssignmentClosed = !!assignment?.dueAt && new Date(assignment.dueAt).getTime() < Date.now()
  const submissionWriteHref = `/content/${contentId}/assignments/${assignmentId}/write`

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`).then(r => r.ok ? r.json() : null),
    ]).then(([contentJson, assignmentJson]) => {
      if (contentJson) setContent(contentJson.data ?? contentJson)
      if (assignmentJson) setAssignment(assignmentJson.data ?? assignmentJson)
    }).catch(() => {
    }).finally(() => setLoading(false))
  }, [contentId, assignmentId])

  useEffect(() => {
    if (!content || !assignment) return
    if (isLeaderOrAdmin) {
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions`)
        .then(r => r.ok ? r.json() : null)
        .then(json => setAllSubmissions(json?.data ?? []))
        .catch(() => {})
      return
    }

    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/me`)
      .then(async r => {
        if (r.ok) return r.json()
        return null
      })
      .then(json => setMySubmission(json?.data ?? null))
      .catch(() => setMySubmission(null))
      .finally(() => setMySubmissionChecked(true))
  }, [content, assignment, contentId, assignmentId, isLeaderOrAdmin])

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

      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
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
    if (!window.confirm('과제를 삭제하시겠습니까?')) return
    await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`, { method: 'DELETE' })
    router.push(`/content/${contentId}`)
  }

  const handleDeleteSubmission = async () => {
    if (!mySubmission) return
    if (!window.confirm('제출한 과제를 삭제하시겠습니까?')) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/${mySubmission.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setSubmitError(json?.message ?? '제출 삭제에 실패했습니다.')
        return
      }
      setMySubmission(null)
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrade = async (submissionId: number) => {
    setGrading(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: gradeStatus, feedback: gradeFeedback }),
      })
      if (!res.ok) return
      const json = await res.json()
      setAllSubmissions(prev => prev.map(submission => submission.id === submissionId ? (json.data ?? submission) : submission))
      setGradingId(null)
      setGradeFeedback('')
    } catch {
    } finally {
      setGrading(false)
    }
  }

  if (loading) {
    return <main style={{ background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)', minHeight: '100vh' }} />
  }

  if (!assignment) {
    return (
      <main style={{ background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>과제를 찾을 수 없습니다.</p>
      </main>
    )
  }

  return (
    <main className="select-none" style={{ background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-[5vw] pt-36 pb-24">
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

        <div className="rounded-2xl mb-7 p-6 sm:p-8 lg:p-10" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ background: 'transparent', border: 'none', borderBottom: '1px solid rgba(28,90,255,0.5)', outline: 'none', color: '#fff', fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 900, paddingBottom: '8px', width: '100%', caretColor: '#1C5AFF', fontFamily: "var(--font-archivo-black),'Archivo Black',sans-serif" }} />
              <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="설명 (선택)" rows={4} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '12px 14px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.7, resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600 }}>마감일</span>
                <input type="datetime-local" value={editDueAt} onChange={e => setEditDueAt(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '6px 10px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', outline: 'none', colorScheme: 'dark' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditMode(false)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>취소</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: '#1C5AFF', color: '#fff', cursor: saving ? 'default' : 'pointer' }}>{saving ? '저장 중...' : '저장'}</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <h1 style={{ color: '#fff', fontSize: 'clamp(1.4rem,2.5vw,2rem)', fontWeight: 900, letterSpacing: '0.03em', fontFamily: "var(--font-archivo-black),'Archivo Black',sans-serif", lineHeight: 1.2, margin: 0 }}>{assignment.title}</h1>
                {isLeaderOrAdmin && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={openEdit} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>수정</button>
                    <button onClick={handleDelete} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(255,80,80,0.3)', background: 'rgba(255,80,80,0.08)', color: '#ff8080', cursor: 'pointer' }}>삭제</button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', flexWrap: 'wrap' }}>
                <span>출제자 | {assignment.authorName}</span>
                <span>작성일 | {formatDate(assignment.createdAt)}</span>
                {assignment.dueAt && <span style={{ color: new Date(assignment.dueAt) < new Date() ? '#ff8080' : 'rgba(255,255,255,0.35)' }}>마감 | {formatDate(assignment.dueAt)}</span>}
              </div>

              {assignment.description && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.8, marginTop: '20px', whiteSpace: 'pre-wrap' }}>{assignment.description}</p>}
            </>
          )}
        </div>

        {isLeaderOrAdmin ? (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>제출 현황</h2>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{allSubmissions.length}명</span>
            </div>

            {allSubmissions.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '24px 0' }}>아직 제출한 팀원이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allSubmissions.map(submission => {
                  const status = STATUS_STYLE[submission.status] ?? STATUS_STYLE.PENDING
                  const isGrading = gradingId === submission.id
                  return (
                    <div key={submission.id} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0 }}>{submission.submitterName}</p>
                          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '4px 0 0' }}>제출일 | {formatDate(submission.submittedAt)}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '100px', background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>{status.label}</span>
                          <button onClick={() => {
                            if (isGrading) {
                              setGradingId(null)
                              return
                            }
                            setGradingId(submission.id)
                            setGradeStatus('O')
                            setGradeFeedback(submission.feedback ?? '')
                          }} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(28,90,255,0.4)', background: isGrading ? 'rgba(28,90,255,0.15)' : 'transparent', color: '#7ba8ff', cursor: 'pointer' }}>{isGrading ? '닫기' : '평가'}</button>
                        </div>
                      </div>

                      {submission.body && <div style={{ padding: '0 24px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}><p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '14px 0 0' }}>{submission.body}</p></div>}

                      {submission.files?.length > 0 && (
                        <div style={{ padding: '0 24px 16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {submission.files.map(file => (
                            <a key={file.id} href={`${API_URL}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                              {file.originalName} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({formatFileSize(file.fileSize)})</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {isGrading && (
                        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(28,90,255,0.05)' }}>
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            {(['O', 'LATE', 'X'] as const).map(value => (
                              <button key={value} onClick={() => setGradeStatus(value)} style={{ padding: '6px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: gradeStatus === value ? '1px solid rgba(28,90,255,0.7)' : '1px solid rgba(255,255,255,0.15)', background: gradeStatus === value ? 'rgba(28,90,255,0.2)' : 'rgba(255,255,255,0.04)', color: gradeStatus === value ? '#7ba8ff' : 'rgba(255,255,255,0.5)' }}>{value}</button>
                            ))}
                          </div>
                          <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} placeholder="피드백 (선택)" rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '10px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '13px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button onClick={() => handleGrade(submission.id)} disabled={grading} style={{ padding: '7px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: grading ? 'rgba(28,90,255,0.5)' : '#1C5AFF', color: '#fff', cursor: grading ? 'default' : 'pointer' }}>{grading ? '저장 중...' : '평가 저장'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        ) : mySubmissionChecked && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ width: '3px', height: '16px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block' }} />
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{mySubmission ? '내 제출' : '과제 제출'}</h2>
            </div>

            {submitError && <p style={{ color: '#f87171', fontSize: '12px', margin: '0 0 12px' }}>{submitError}</p>}

            {mySubmission ? (
              <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '100px', background: (STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).bg, color: (STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).color, border: `1px solid ${(STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).border}` }}>
                      {(STATUS_STYLE[mySubmission.status] ?? STATUS_STYLE.PENDING).label}
                    </span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>제출일 | {formatDate(mySubmission.submittedAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {!isAssignmentClosed && (
                      <Link href={submissionWriteHref} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>수정하기</Link>
                    )}
                    <button onClick={handleDeleteSubmission} disabled={submitting} style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,80,80,0.25)', background: 'rgba(255,80,80,0.08)', color: '#ff9a9a', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.65 : 1 }}>삭제하기</button>
                  </div>
                </div>

                {mySubmission.body && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: '0 0 14px' }}>{mySubmission.body}</p>}

                {mySubmission.files?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {mySubmission.files.map(file => (
                      <a key={file.id} href={`${API_URL}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        {file.originalName} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({formatFileSize(file.fileSize)})</span>
                      </a>
                    ))}
                  </div>
                )}

                {mySubmission.feedback && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(28,90,255,0.08)', border: '1px solid rgba(28,90,255,0.2)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, margin: '0 0 6px' }}>피드백</p>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{mySubmission.feedback}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>아직 제출한 과제가 없습니다. 전용 작성 페이지에서 과제 내용을 작성하고 파일을 첨부해 제출할 수 있습니다.</p>
                {isAssignmentClosed ? (
                  <span style={{ fontSize: '12px', color: '#ff9a9a' }}>마감된 과제는 새로 제출할 수 없습니다.</span>
                ) : (
                  <div>
                    <Link href={submissionWriteHref} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', background: '#1C5AFF', color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>과제 제출하기</Link>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <HomeFooter />
    </main>
  )
}
