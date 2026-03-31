'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

export default function AssignmentPostCreatePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthContext()
  const contentId = params.id as string

  const [contentTitle, setContentTitle] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => setContentTitle(json?.data?.title ?? ''))
      .catch(() => {})
  }, [contentId])

  const handleSubmit = async () => {
    if (!title.trim()) return setError('제목을 입력해주세요.')
    if (!body.trim() && attachedFiles.length === 0) return setError('본문이나 첨부 파일 중 하나는 필요합니다.')
    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      if (body.trim()) formData.append('body', body.trim())
      attachedFiles.forEach(file => formData.append('files', file))
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/assignments/posts`, { method: 'POST', body: formData })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.message ?? '과제 등록에 실패했습니다.')
        return
      }
      const json = await res.json().catch(() => ({}))
      router.push(`/content/${contentId}/assignments/${json?.data?.id}`)
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
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>과제 작성</span>
        </div>

        <div style={{ borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="과제 제목" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 'clamp(1.6rem,3vw,2.1rem)', fontWeight: 900 }} />
            {error && <p style={{ margin: '12px 0 0', color: '#f87171', fontSize: '12px' }}>{error}</p>}
          </div>
          <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>과제 내용</p>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} placeholder="과제 내용을 입력해주세요." style={{ width: '100%', boxSizing: 'border-box', resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px', color: '#fff' }} />
          </div>
          <div style={{ padding: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>첨부 파일</p>
              <label style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>파일 선택<input type="file" multiple style={{ display: 'none' }} onChange={e => { const files = Array.from(e.currentTarget.files ?? []); if (files.length) setAttachedFiles(prev => [...prev, ...files]); e.currentTarget.value = '' }} /></label>
            </div>
            {attachedFiles.length > 0 ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{attachedFiles.map((file, index) => <span key={`${file.name}-${index}`} style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', padding: '5px 10px', borderRadius: '999px', background: 'rgba(28,90,255,0.12)', color: '#a9c5ff', fontSize: '12px' }}>{file.name}<button type="button" onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>x</button></span>)}</div> : <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>선택된 파일이 없습니다.</p>}
          </div>
          <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Link href={`/content/${contentId}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>취소</Link>
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>{submitting ? '등록 중...' : '과제 등록하기'}</button>
          </div>
        </div>
      </div>
      <HomeFooter />
    </main>
  )
}
