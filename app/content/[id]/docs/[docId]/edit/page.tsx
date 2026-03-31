'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function DocEditRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const contentId = params.id as string
  const docId = params.docId as string

  useEffect(() => {
    router.replace(`/content/${contentId}/docs/${docId}/write`)
  }, [contentId, docId, router])

  return (
    <main style={{ minHeight: '100vh', background: '#040d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>편집 페이지로 이동 중...</span>
    </main>
  )
}
