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
    <main className="min-h-screen flex items-center justify-center bg-background">
      <span className="text-fg-subtle text-sm">편집 페이지로 이동 중...</span>
    </main>
  )
}
