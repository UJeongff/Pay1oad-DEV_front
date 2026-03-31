'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

interface Assignment {
  id: number
  title: string
  authorId?: number | null
  authorIsLeader: boolean
  dueAt?: string | null
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
  const [title, setTitle] = useState('')
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
      setContentTitle(contentJson?.data?.title ?? '')
      const assignmentData = assignmentJson?.data ?? assignmentJson ?? null
      const submissionData = submissionJson?.data ?? null
      setAssignment(assignmentData)
      setMySubmission(submissionData)
      setTitle(assignmentData?.title ?? '')
      setBody(submissionData?.body ?? '')
    }).finally(() => setLoading(false))
  }, [contentId, assignmentId])

  const isOwnPostedAssignment = !!assignment && !assignment.authorIsLeader && assignment.authorId != null && String(assignment.authorId) === String(user?.id)
  const isClosed = !!assignment?.dueAt && new Date(assignment.dueAt).getTime() < Date.now()

  const handleSubmit = async () => {
    if (isOwnPostedAssignment && !title.trim()) return setError('제목을 입력해주세요.')
    if (!body.trim() && attachedFiles.length === 0 && !(mySubmission?.files?.length ?? 0)) return setError('본문이나 첨부 파일 중 하나는 필요합니다.')

    setError(null)
    setSubmitting(true)
    try {
      if (isOwnPostedAssignment) {
        const patchRes = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim() }),
        })
        if (!patchRes.ok) {
          const json = await patchRes.json().catch(() => ({}))
          setError(json?.message ?? '과제 수정에 실패했습니다.')
          return
        }
      }

      const formData = new FormData()
      if (body.trim()) formData.append('body', body.trim())
      attachedFiles.forEach(file => formData.append('files', file))

      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions`, { method: 'POST', body: formData })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.message ?? '저장에 실패했습니다.')
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
      <div className="relative max-w-5xl mx-auto px-[5vw] pt-36 pb-24">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <Link href="/content" style={{ color: 'inherit', textDecoration: 'none' }}>Content</Link>
          <span>›</span>
          <Link href={`/content/${contentId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{contentTitle || '...'}</Link>
          <span>›</span>
          <Link href={`/content/${contentId}/assignments/${assignmentId}`} style={{ color: 'inherit', textDecoration: 'none' }}>{assignment?.title ?? '과제'}</Link>
        </div>

        {loading ? <div style={{ height: '240px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }} /> : (
          <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {isOwnPostedAssignment ? (
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="과제 제목" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.1rem)', fontWeight: 900 }} />
              ) : (
                <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.1rem)', fontWeight: 900 }}>
                  {assignment?.title ?? '과제'}
                </h1>
              )}
              {assignment?.dueAt && <p style={{ margin: '12px 0 0', color: isClosed ? '#ff9a9a' : 'rgba(255,255,255,0.5)', fontSize: '12px' }}>마감 | {formatDate(assignment.dueAt)}</p>}
              {error && <p style={{ margin: '12px 0 0', color: '#f87171', fontSize: '12px' }}>{error}</p>}
            </div>
            <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{isOwnPostedAssignment ? '과제 본문' : '제출 내용'}</p>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder={isOwnPostedAssignment ? '과제 내용을 입력해주세요.' : '제출 내용을 입력해주세요.'} style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px', color: '#fff' }} />
            </div>
            <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>첨부 파일</p>
                <label style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>파일 선택<input type="file" multiple style={{ display: 'none' }} onChange={e => { const files = Array.from(e.currentTarget.files ?? []); if (files.length) setAttachedFiles(prev => [...prev, ...files]); e.currentTarget.value = '' }} /></label>
              </div>
              {(mySubmission?.files?.length ?? 0) > 0 && <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{mySubmission?.files.map(file => <a key={file.id} href={`${API_URL}${file.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: '#7ba8ff', textDecoration: 'none', fontSize: '12px' }}>{file.originalName} ({formatFileSize(file.fileSize)})</a>)}</div>}
              {attachedFiles.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{attachedFiles.map((file, index) => <span key={`${file.name}-${index}`} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', padding: '5px 10px', borderRadius: '999px', background: 'rgba(28,90,255,0.12)', color: '#a9c5ff', fontSize: '12px' }}>{file.name}<button type="button" onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>x</button></span>)}</div> : <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>선택된 새 파일이 없습니다.</p>}
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Link href={`/content/${contentId}/assignments/${assignmentId}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>취소</Link>
              <button onClick={handleSubmit} disabled={submitting || (isClosed && !!assignment?.authorIsLeader)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', cursor: 'pointer', opacity: submitting || (isClosed && !!assignment?.authorIsLeader) ? 0.6 : 1 }}>{submitting ? '저장 중...' : (isOwnPostedAssignment ? '과제 수정 저장' : '과제 제출하기')}</button>
            </div>
          </div>
        )}
      </div>
      <HomeFooter />
    </main>
  )
}
