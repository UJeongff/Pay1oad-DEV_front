'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'
import DocCollabEditor from '@/app/components/DocCollabEditor'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

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

export default function DocCollabWritePage() {
  const params = useParams()
  const router = useRouter()
  const contentId = params.id as string
  const docId = params.docId as string

  const [contentTitle, setContentTitle] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [docType, setDocType] = useState<string | null>(null)
  const [initialHtml, setInitialHtml] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}`)
        .then(r => r.ok ? r.json() : null),
      fetchWithAuth(`${API_URL}/v1/contents/${contentId}/docs/${docId}`)
        .then(r => r.ok ? r.json() : null),
    ]).then(([contentJson, docJson]) => {
      if (contentJson) setContentTitle(contentJson.data?.title ?? contentJson.title ?? '')
      const doc = docJson?.data ?? docJson
      if (doc) {
        setDocTitle(doc.title ?? '')
        setDocType(doc.docType ?? null)
        setInitialHtml(decodeBodyToHtml(doc.bodyJson))
      }
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [contentId, docId])

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: '#040d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>불러오는 중...</span>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>
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
        <Link href="/content" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          Content
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <Link href={`/content/${contentId}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          {contentTitle || '...'}
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <span style={{ color: '#fff' }}>
          {docType === 'REPORT' ? '보고서 편집' : docType === 'POST' ? '게시글 편집' : '문서 편집'}
        </span>
      </div>

      <div className="relative max-w-4xl mx-auto px-[5vw] py-12">
        <DocCollabEditor
          contentId={contentId}
          docId={docId}
          initialTitle={docTitle}
          initialHtml={initialHtml}
          onBack={() => router.push(`/content/${contentId}`)}
        />
      </div>

      <HomeFooter />
    </main>
  )
}
