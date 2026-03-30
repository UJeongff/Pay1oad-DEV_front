'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Assignment {
  id: number
  title: string
  description?: string | null
  dueAt?: string | null
  createdAt: string
}

interface SubmissionFile {
  id: number
  originalName: string
  fileUrl: string
  fileSize: number
}

interface Submission {
  id: number
  body?: string | null
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

export default function AssignmentSubmissionWritePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthContext()

  const contentId = params.id as string
  const assignmentId = params.assignmentId as string

  const [contentTitle, setContentTitle] = useState('')
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [body, setBody] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`).then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/me`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([contentJson, assignmentJson, submissionJson]) => {
      setContentTitle(contentJson?.data?.title ?? contentJson?.title ?? '')
      const assignmentData = assignmentJson?.data ?? assignmentJson ?? null
      const submissionData = submissionJson?.data ?? null
      setAssignment(assignmentData)
      setMySubmission(submissionData)
      setBody(submissionData?.body ?? '')
    }).catch(() => {
    }).finally(() => setLoading(false))
  }, [contentId, assignmentId])

  const isClosed = !!assignment?.dueAt && new Date(assignment.dueAt).getTime() < Date.now()

  const handleSubmit = async () => {
    if (!body.trim() && attachedFiles.length === 0 && !(mySubmission?.files?.length ?? 0)) {
      setError('제출 내용이나 첨부 파일 중 하나는 필요합니다.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (body.trim()) formData.append('body', body.trim())
      attachedFiles.forEach(file => formData.append('files', file))

      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.message ?? '제출에 실패했습니다.')
        return
      }
      router.push(`/content/${contentId}/assignments/${assignmentId}`)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #0E1427 100%)' }}>
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '100vh', backgroundImage: 'url(/background.png)', backgroundSize: '130%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)', maskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)' }} />

      <div className="relative max-w-5xl mx-auto px-[5vw] pt-36 pb-24">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
            <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="#1C5AFF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <Link href="/content" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Content</Link>
          <span>›</span>
          <Link href={`/content/${contentId}`} style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{contentTitle || '...'}</Link>
          <span>›</span>
          <Link href={`/content/${contentId}/assignments/${assignmentId}`} style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{assignment?.title ?? '과제'}</Link>
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{mySubmission ? '제출 수정' : '과제 제출'}</span>
        </div>

        {loading ? (
          <div style={{ height: '240px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }} />
        ) : (
          <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div className="px-5 sm:px-8 lg:px-10 pt-8 pb-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: '#8FB6FF' }}>{mySubmission ? 'EDIT SUBMISSION' : 'NEW SUBMISSION'}</p>
                  <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', fontWeight: 900, lineHeight: 1.2, fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif" }}>{assignment?.title ?? '과제 제출'}</h1>
                </div>
                {assignment?.dueAt && <span style={{ padding: '6px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', color: isClosed ? '#ff9a9a' : 'rgba(255,255,255,0.6)', fontSize: '12px' }}>마감 | {formatDate(assignment.dueAt)}</span>}
              </div>
              {assignment?.description && <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: '13px', lineHeight: 1.7, margin: '16px 0 0', whiteSpace: 'pre-wrap' }}>{assignment.description}</p>}
              {error && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '12px' }}>{error}</p>}
            </div>

            {mySubmission && (
              <div className="px-5 sm:px-8 lg:px-10 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, margin: 0, letterSpacing: '0.06em' }}>기존 제출</p>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>제출일 | {formatDate(mySubmission.submittedAt)}</span>
                </div>
                {(mySubmission.files?.length ?? 0) > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {mySubmission.files.map(file => (
                      <a key={file.id} href={`${API_URL}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.62)', fontSize: '12px', textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        {file.originalName} <span style={{ color: 'rgba(255,255,255,0.32)' }}>({formatFileSize(file.fileSize)})</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>기존 첨부 파일은 없습니다.</p>
                )}
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '12px 0 0' }}>새 파일을 첨부하면 기존 첨부 파일은 새 파일 목록으로 교체됩니다.</p>
              </div>
            )}

            <div className="px-5 sm:px-8 lg:px-10 py-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.06em' }}>제출 내용</p>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="과제 제출 내용을 입력해주세요."
                rows={10}
                disabled={isClosed}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '14px 16px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: 1.7, resize: 'none', outline: 'none', caretColor: '#1C5AFF', fontFamily: 'inherit', boxSizing: 'border-box', opacity: isClosed ? 0.6 : 1 }}
              />
            </div>

            <div className="px-5 sm:px-8 lg:px-10 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, margin: 0, letterSpacing: '0.06em' }}>첨부 파일</p>
                <label style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: isClosed ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.6)', cursor: isClosed ? 'default' : 'pointer' }}>
                  파일 선택
                  <input type="file" multiple disabled={isClosed} style={{ display: 'none' }} onChange={e => {
                    if (!e.target.files) return
                    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files)])
                    e.target.value = ''
                  }} />
                </label>
              </div>

              {attachedFiles.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {attachedFiles.map((file, index) => (
                    <span key={`${file.name}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', background: 'rgba(28,90,255,0.12)', border: '1px solid rgba(28,90,255,0.26)', color: '#A9C5FF', fontSize: '12px' }}>
                      {file.name}
                      <button type="button" onClick={() => setAttachedFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index))} style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', display: 'flex' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '12px', margin: 0 }}>선택된 새 파일이 없습니다.</p>
              )}
            </div>

            <div className="px-5 sm:px-8 lg:px-10 py-5 flex justify-end gap-2.5">
              <Link href={`/content/${contentId}/assignments/${assignmentId}`} style={{ padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>취소</Link>
              <button onClick={handleSubmit} disabled={submitting || isClosed} style={{ padding: '9px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: 'none', background: submitting || isClosed ? 'rgba(28,90,255,0.5)' : '#1C5AFF', color: '#fff', cursor: submitting || isClosed ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {submitting ? '저장 중...' : (mySubmission ? '제출 수정 저장' : '과제 제출하기')}
              </button>
            </div>
          </div>
        )}
      </div>

      <HomeFooter />
    </main>
  )
}
