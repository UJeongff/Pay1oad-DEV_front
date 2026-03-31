'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

interface ContentInfo {
  id: number
  title: string
  isLeader?: boolean
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

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  PENDING: { label: '평가 대기 중', bg: 'rgba(255,165,0,0.1)', color: '#FFB347', border: 'rgba(255,165,0,0.22)' },
  O: { label: '완료 (O)', bg: 'rgba(116,255,137,0.08)', color: '#74FF89', border: 'rgba(116,255,137,0.2)' },
  LATE: { label: '지각 (LATE)', bg: 'rgba(255,200,0,0.08)', color: '#FFD700', border: 'rgba(255,200,0,0.2)' },
  X: { label: '미완료 (X)', bg: 'rgba(255,100,100,0.08)', color: '#FF6464', border: 'rgba(255,100,100,0.2)' },
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

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const contentId = params.id as string
  const assignmentId = params.assignmentId as string

  const [content, setContent] = useState<ContentInfo | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gradingId, setGradingId] = useState<number | null>(null)
  const [gradeStatus, setGradeStatus] = useState<'O' | 'LATE' | 'X'>('O')
  const [gradeFeedback, setGradeFeedback] = useState('')
  const [grading, setGrading] = useState(false)

  const isAdmin = user?.role === 'ADMIN'
  const isLeaderOrAdmin = !!content?.isLeader || isAdmin
  const isAssignmentAuthor = assignment?.authorId != null && String(assignment.authorId) === String(user?.id)
  const canSubmitToAssignment = !!assignment?.authorIsLeader && !isLeaderOrAdmin
  const isOwnPostedAssignment = !!assignment && !assignment.authorIsLeader && !!isAssignmentAuthor && !isLeaderOrAdmin
  const submissionWriteHref = `/content/${contentId}/assignments/${assignmentId}/write`

  const statusStyle = useMemo(() => STATUS_STYLE[mySubmission?.status ?? 'PENDING'] ?? STATUS_STYLE.PENDING, [mySubmission?.status])

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`).then(r => r.ok ? r.json() : null),
    ]).then(([contentJson, assignmentJson]) => {
      setContent(contentJson?.data ?? contentJson ?? null)
      setAssignment(assignmentJson?.data ?? assignmentJson ?? null)
    }).finally(() => setLoading(false))
  }, [contentId, assignmentId])

  useEffect(() => {
    if (!assignment) return
    if (isLeaderOrAdmin) {
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions`)
        .then(r => r.ok ? r.json() : null)
        .then(json => setSubmissions(json?.data ?? []))
      return
    }

    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/me`)
      .then(r => r.ok ? r.json() : null)
      .then(json => setMySubmission(json?.data ?? null))
      .catch(() => setMySubmission(null))
  }, [assignment, contentId, assignmentId, isLeaderOrAdmin])

  const handleDeleteAssignment = async () => {
    if (!window.confirm(isOwnPostedAssignment ? '작성한 과제를 삭제하시겠습니까?' : '과제를 삭제하시겠습니까?')) return
    await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`, { method: 'DELETE' })
    router.push(`/content/${contentId}`)
  }

  const handleDeleteSubmission = async () => {
    if (!mySubmission) return
    if (!window.confirm('제출한 과제를 삭제하시겠습니까?')) return
    setError(null)
    const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/${mySubmission.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setError(json?.message ?? '제출 삭제에 실패했습니다.')
      return
    }
    setMySubmission(null)
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
      const json = await res.json().catch(() => ({}))
      setSubmissions(prev => prev.map(item => item.id === submissionId ? (json.data ?? item) : item))
      setGradingId(null)
      setGradeFeedback('')
    } finally {
      setGrading(false)
    }
  }

  if (loading) return <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)' }} />
  if (!assignment) return <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(255,255,255,0.5)' }}>과제를 찾을 수 없습니다.</p></main>

  return (
    <main className="select-none" style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0E111C 0%, #0D1530 100%)' }}>
      <div className="max-w-5xl mx-auto px-[5vw] pt-36 pb-24">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <Link href="/content" style={{ color: 'inherit', textDecoration: 'none' }}>Content</Link>
          <span>›</span>
          <Link href={`/content/${contentId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{content?.title ?? '...'}</Link>
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{assignment.title}</span>
        </div>

        <section style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '28px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(1.5rem,2.5vw,2rem)', fontWeight: 900 }}>{assignment.title}</h1>
              <div style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                <span>{assignment.authorIsLeader ? '출제자' : '작성자'} | {assignment.authorName}</span>
                <span>작성일 | {formatDate(assignment.createdAt)}</span>
                {assignment.dueAt && <span>마감 | {formatDate(assignment.dueAt)}</span>}
              </div>
            </div>
            {(isLeaderOrAdmin || isOwnPostedAssignment) && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {(isOwnPostedAssignment || canSubmitToAssignment) && <Link href={submissionWriteHref} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>수정</Link>}
                <button onClick={handleDeleteAssignment} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.25)', background: 'rgba(255,80,80,0.08)', color: '#ff9a9a', cursor: 'pointer' }}>삭제</button>
              </div>
            )}
          </div>
          {assignment.description && <p style={{ margin: '18px 0 0', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{assignment.description}</p>}
        </section>

        {isLeaderOrAdmin ? (
          <section style={{ display: 'grid', gap: '12px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>제출 현황</h2>
            {submissions.length === 0 && <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)' }}>아직 제출이 없습니다.</div>}
            {submissions.map(submission => {
              const style = STATUS_STYLE[submission.status] ?? STATUS_STYLE.PENDING
              const isOpen = gradingId === submission.id
              return (
                <div key={submission.id} style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ margin: 0, color: '#fff', fontWeight: 700 }}>{submission.submitterName}</p>
                      <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>제출일 | {formatDate(submission.submittedAt)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '999px', background: style.bg, color: style.color, border: `1px solid ${style.border}`, fontSize: '12px', fontWeight: 700 }}>{style.label}</span>
                      <button onClick={() => { setGradingId(isOpen ? null : submission.id); setGradeStatus('O'); setGradeFeedback(submission.feedback ?? '') }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(28,90,255,0.35)', background: 'transparent', color: '#8fb6ff', cursor: 'pointer' }}>{isOpen ? '닫기' : '평가'}</button>
                    </div>
                  </div>
                  {submission.body && <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{submission.body}</p>}
                  {submission.files.length > 0 && <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{submission.files.map(file => <a key={file.id} href={`${API_URL}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: '#a9c5ff', textDecoration: 'none', fontSize: '12px' }}>{file.originalName} ({formatFileSize(file.fileSize)})</a>)}</div>}
                  {isOpen && (
                    <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>{(['O', 'LATE', 'X'] as const).map(value => <button key={value} onClick={() => setGradeStatus(value)} style={{ padding: '6px 12px', borderRadius: '999px', border: gradeStatus === value ? '1px solid rgba(28,90,255,0.6)' : '1px solid rgba(255,255,255,0.15)', background: gradeStatus === value ? 'rgba(28,90,255,0.15)' : 'transparent', color: gradeStatus === value ? '#8fb6ff' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>{value}</button>)}</div>
                      <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} rows={3} placeholder="피드백 (선택)" style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: '#fff' }} />
                      <div><button onClick={() => handleGrade(submission.id)} disabled={grading} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', cursor: 'pointer' }}>{grading ? '저장 중...' : '평가 저장'}</button></div>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        ) : (
          <section style={{ borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
            {error && <p style={{ color: '#f87171', marginTop: 0 }}>{error}</p>}
            {mySubmission ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, fontSize: '12px', fontWeight: 700 }}>{statusStyle.label}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{canSubmitToAssignment ? '제출일' : '등록일'} | {formatDate(mySubmission.submittedAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link href={submissionWriteHref} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>수정하기</Link>
                    {isOwnPostedAssignment ? (
                      <button onClick={handleDeleteAssignment} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.25)', background: 'rgba(255,80,80,0.08)', color: '#ff9a9a', cursor: 'pointer' }}>삭제하기</button>
                    ) : (
                      <button onClick={handleDeleteSubmission} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,80,80,0.25)', background: 'rgba(255,80,80,0.08)', color: '#ff9a9a', cursor: 'pointer' }}>삭제하기</button>
                    )}
                  </div>
                </div>
                {mySubmission.body && <p style={{ color: 'rgba(255,255,255,0.76)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{mySubmission.body}</p>}
                {mySubmission.files.length > 0 && <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{mySubmission.files.map(file => <a key={file.id} href={`${API_URL}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: '#a9c5ff', textDecoration: 'none', fontSize: '12px' }}>{file.originalName} ({formatFileSize(file.fileSize)})</a>)}</div>}
                {mySubmission.feedback && <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: 'rgba(28,90,255,0.08)', border: '1px solid rgba(28,90,255,0.2)' }}><p style={{ margin: 0, color: 'rgba(255,255,255,0.78)', whiteSpace: 'pre-wrap' }}>{mySubmission.feedback}</p></div>}
              </>
            ) : canSubmitToAssignment ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>아직 제출한 과제가 없습니다. 작성 페이지에서 제출할 수 있습니다.</p>
                <div><Link href={submissionWriteHref} style={{ display: 'inline-flex', padding: '8px 18px', borderRadius: '8px', background: '#1C5AFF', color: '#fff', textDecoration: 'none' }}>과제 제출하기</Link></div>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>{isOwnPostedAssignment ? '등록된 과제를 수정하려면 수정 페이지를 이용해 주세요.' : '작성자가 등록한 과제입니다. 이 페이지에서는 읽기만 가능합니다.'}</p>
            )}
          </section>
        )}
      </div>
      <HomeFooter />
    </main>
  )
}
