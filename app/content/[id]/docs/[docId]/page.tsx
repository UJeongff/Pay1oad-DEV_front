'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface DocFile {
  id: number
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
}

interface DocDetail {
  id: number
  title: string
  bodyJson: string | null
  authorName: string
  updatedByName: string | null
  createdAt: string
  updatedAt: string | null
  files: DocFile[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function decodeBodyToHtml(bodyJson: string | null): string {
  if (!bodyJson) return ''
  try {
    const bin = atob(bodyJson)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const state = JSON.parse(new TextDecoder().decode(bytes))
    return typeof state.body === 'string' ? state.body : ''
  } catch {
    return ''
  }
}

export default function DocDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const contentId = params.id as string
  const docId = params.docId as string

  const [doc, setDoc] = useState<DocDetail | null>(null)
  const [contentTitle, setContentTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setContentTitle(json.data?.title ?? json.title ?? '') })
      .catch(() => {})
  }, [contentId])

  useEffect(() => {
    setLoading(true)
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}`)
      .then(r => {
        if (!r.ok) throw new Error('게시글을 불러올 수 없습니다.')
        return r.json()
      })
      .then(json => setDoc(json.data ?? json))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [contentId, docId])

  const bodyHtml = doc ? decodeBodyToHtml(doc.bodyJson) : ''
  const isOwner = user != null && doc != null && doc.authorName === (user.name ?? user.nickname)
  const isAdmin = user?.role === 'ADMIN'
  const canEdit = isOwner || isAdmin

  return (
    <main className="relative min-h-screen" style={{ background: '#040d1f' }}>

      {/* Background */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '60vh',
          backgroundImage: 'url(/background.png)',
          backgroundSize: '130%',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 80%)',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 80%)',
        }}
      />

      {/* Breadcrumb */}
      <div
        className="w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 gap-1.5 text-[13px] mt-40 rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
      >
        <Link href="/content" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >Content</Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <Link href={`/content/${contentId}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >{contentTitle || '...'}</Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <span style={{ color: '#fff' }}>{doc?.title ?? '...'}</span>

        {canEdit && (
          <div style={{ marginLeft: 'auto' }}>
            <Link
              href={`/content/${contentId}/write?docId=${docId}`}
              style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none', transition: 'all 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.5)'; el.style.color = '#fff' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.2)'; el.style.color = 'rgba(255,255,255,0.6)' }}
            >
              편집하기
            </Link>
          </div>
        )}
      </div>

      <div className="relative max-w-4xl mx-auto px-[5vw] py-12">
        {loading && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', textAlign: 'center', paddingTop: '80px' }}>불러오는 중...</p>
        )}
        {error && (
          <p style={{ color: '#FF6060', fontSize: '14px', textAlign: 'center', paddingTop: '80px' }}>{error}</p>
        )}
        {!loading && !error && doc && (
          <>
            {/* Title */}
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '24px', lineHeight: 1.3 }}>
              {doc.title}
            </h1>

            {/* Meta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {[
                { label: '작성자', value: doc.authorName },
                { label: '작성일', value: formatDate(doc.createdAt) },
                ...(doc.updatedAt ? [{ label: '최종 수정', value: `${formatDate(doc.updatedAt)}${doc.updatedByName ? ` (${doc.updatedByName})` : ''}` }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', fontSize: '14px' }}>
                  <span style={{ width: '72px', flexShrink: 0, color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{row.label}</span>
                  <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.65)' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

            {/* Body */}
            {bodyHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', lineHeight: 1.8, wordBreak: 'break-word' }}
              />
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '15px', fontStyle: 'italic' }}>내용이 없습니다.</p>
            )}

            {/* Attached files */}
            {doc.files.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ width: '3px', height: '14px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>첨부파일</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {doc.files.map(f => (
                    <a
                      key={f.id}
                      href={f.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{f.fileName}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{formatFileSize(f.fileSize)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px', marginBottom: '48px' }}>
              <button
                onClick={() => router.back()}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.4)'; el.style.color = '#fff' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.color = 'rgba(255,255,255,0.55)' }}
              >
                목록으로
              </button>
              {canEdit && (
                <Link
                  href={`/content/${contentId}/write?docId=${docId}`}
                  style={{ padding: '9px 22px', borderRadius: '8px', border: '0.734px solid rgba(0, 65, 239, 0.6)', background: 'rgba(0, 65, 239, 0.35)', color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0, 65, 239, 0.55)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0, 65, 239, 0.35)' }}
                >
                  편집하기
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <HomeFooter />
    </main>
  )
}
