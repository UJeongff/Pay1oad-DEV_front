'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/app/context/AuthContext'

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, user, router, pathname])

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-fg-subtle text-sm">불러오는 중...</span>
      </main>
    )
  }

  return <>{children}</>
}
