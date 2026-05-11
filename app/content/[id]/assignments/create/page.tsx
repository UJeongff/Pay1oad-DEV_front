'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function AssignmentCreatePage() {
  const router = useRouter()
  const params = useParams()
  const contentId = params.id as string

  useEffect(() => {
    router.replace(`/content/${contentId}`)
  }, [contentId, router])

  return null
}
