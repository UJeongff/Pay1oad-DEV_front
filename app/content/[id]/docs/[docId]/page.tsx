'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import DocCollabEditor from '@/app/components/DocCollabEditor'
import DocAttachments from '@/app/components/DocAttachments'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import DOMPurify from 'isomorphic-dompurify'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

interface DocFile {
  id: number
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
}

interface DocDetail {
  id: number
  docType?: string
  submittedAt?: string | null
  submittedByName?: string | null
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


let purifyHooksRegistered = false
function ensurePurifyHooks() {
  if (purifyHooksRegistered) return
  purifyHooksRegistered = true
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'A') return
    const href = node.getAttribute('href') ?? ''
    if (/^\s*(javascript|data|vbscript):/i.test(href)) {
      node.removeAttribute('href')
      return
    }
    if (/^https?:\/\//i.test(href)) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })
}

function decodeBodyToHtml(bodyJson: string | null): string {
  if (!bodyJson) return ''
  try {
    const bin = atob(bodyJson)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const state = JSON.parse(new TextDecoder().decode(bytes))
    const rawBody = typeof state.body === 'string' ? state.body : ''
    if (!rawBody) return ''
    ensurePurifyHooks()
    return DOMPurify.sanitize(rawBody, {
      USE_PROFILES: { html: true },
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onanimationend', 'onanimationstart', 'onanimationiteration', 'formaction'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'meta', 'link', 'style'],
    })
  } catch {
    return ''
  }
}

export default function DocDetailPage() {
  const params = useParams()
  const router = useRouter()
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
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}`)
      .then(r => {
        if (!r.ok) throw new Error('게시글을 불러올 수 없습니다.')
        return r.json()
      })
      .then(json => setDoc(json.data ?? json))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [contentId, docId])

  /** 제출된 보고서는 실시간 동기화가 끝나고 "편집하기"를 누른 사람만 편집하는 일반 문서가 된다 */
  const submitted = !!doc?.submittedAt
  const isReport = doc?.docType === 'REPORT'
  const [soloEditing, setSoloEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const reload = useCallback(() => {
    fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setDoc(json.data ?? json) })
      .catch(() => {})
  }, [contentId, docId])

  const submitReport = useCallback(async () => {
    if (!window.confirm('보고서를 제출하시겠습니까? 제출하면 실시간 공동 편집이 종료됩니다.')) return
    setSubmitting(true)
    setActionError(null)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}/submit`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? '제출에 실패했습니다.')
      }
      setSoloEditing(false)
      reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '제출 오류')
    } finally {
      setSubmitting(false)
    }
  }, [contentId, docId, reload])

  const cancelSubmit = useCallback(async () => {
    if (!window.confirm('제출을 취소하고 다시 공동 편집 상태로 되돌리시겠습니까?')) return
    setSubmitting(true)
    setActionError(null)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}/submit`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? '제출 취소에 실패했습니다.')
      }
      setSoloEditing(false)
      reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '제출 취소 오류')
    } finally {
      setSubmitting(false)
    }
  }, [contentId, docId, reload])

  const bodyHtml = doc ? decodeBodyToHtml(doc.bodyJson) : ''

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
            {/*
              상세 페이지가 곧 편집 화면이다. 별도의 "편집하기" 버튼 없이 본문을 클릭하면
              바로 편집되고, 같은 글을 열어둔 다른 사람에게 실시간으로 반영된다.
            */}
            <DocCollabEditor
              key={`${submitted ? 'solo' : 'collab'}-${doc.updatedAt ?? ''}`}
              contentId={contentId}
              docId={docId}
              initialTitle={doc.title}
              initialHtml={bodyHtml}
              mode={submitted ? 'solo' : 'collaborative'}
              readOnly={submitted && !soloEditing}
              onSessionEnded={reload}
              onSaved={() => { setSoloEditing(false); reload() }}
              metaSlot={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {[
                    { label: '작성자', value: doc.authorName },
                    { label: '작성일', value: formatDate(doc.createdAt) },
                    ...(doc.updatedAt ? [{ label: '최종 수정', value: `${formatDate(doc.updatedAt)}${doc.updatedByName ? ` (${doc.updatedByName})` : ''}` }] : []),
                    ...(doc.submittedAt ? [{ label: '제출', value: `${formatDate(doc.submittedAt)}${doc.submittedByName ? ` (${doc.submittedByName})` : ''}` }] : []),
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', fontSize: '14px' }}>
                      <span style={{ width: '72px', flexShrink: 0, color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{row.label}</span>
                      <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.65)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              }
              footerSlot={
                <DocAttachments
                  contentId={contentId}
                  docId={docId}
                  files={doc.files}
                  readOnly={submitted && !soloEditing}
                  onChanged={reload}
                />
              }
              onFileUploaded={reload}
            />

            {actionError && (
              <p style={{ color: '#FF6060', fontSize: '13px', marginTop: '12px' }}>{actionError}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', marginBottom: '48px' }}>
              <button
                onClick={() => router.back()}
                style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.4)'; el.style.color = '#fff' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(255,255,255,0.18)'; el.style.color = 'rgba(255,255,255,0.55)' }}
              >
                목록으로
              </button>

              {isReport && (
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                  {!submitted && (
                    <button
                      onClick={submitReport}
                      disabled={submitting}
                      style={{ padding: '9px 22px', borderRadius: '8px', border: '0.734px solid rgba(0,65,239,0.6)', background: 'rgba(0,65,239,0.4)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
                    >
                      {submitting ? '제출 중...' : '제출하기'}
                    </button>
                  )}
                  {submitted && !soloEditing && (
                    <button
                      onClick={() => setSoloEditing(true)}
                      style={{ padding: '9px 22px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      편집하기
                    </button>
                  )}
                  {submitted && (
                    <button
                      onClick={cancelSubmit}
                      disabled={submitting}
                      style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,184,107,0.35)', background: 'transparent', color: '#FFB86B', fontSize: '13px', fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
                    >
                      제출 취소
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <HomeFooter />
    </main>
  )
}
