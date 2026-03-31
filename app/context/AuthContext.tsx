'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

export interface AuthUser {
  id: number
  name: string
  nickname: string
  email: string
  role: 'MEMBER' | 'ADMIN'
  status: 'ACTIVE' | 'BREAK' | 'OB' | 'LEAVE'
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refetch: async () => {},
})

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

// 액세스 토큰 만료(15분) 전에 미리 갱신 — 10분 간격
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

async function silentRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/users/me`)
      if (!res.ok) {
        setUser(null)
        return
      }
      const json = await res.json()
      const raw = json?.data ?? json
      console.log('[AuthContext] /v1/users/me raw:', raw)
      const rawRole: string = (Array.isArray(raw.roles) ? raw.roles[0] : raw.role)
        ?? (typeof window !== 'undefined' ? localStorage.getItem('user_role') : null)
        ?? ''
      console.log('[AuthContext] rawRole:', rawRole)
      const normalizedRole: 'ADMIN' | 'MEMBER' = rawRole.toUpperCase().includes('ADMIN') ? 'ADMIN' : 'MEMBER'
      setUser({
        id: raw.userId ?? raw.id,
        name: raw.name ?? raw.nickname,
        nickname: raw.nickname,
        email: raw.email,
        role: normalizedRole,
        status: raw.status,
      })
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  // 주기적으로 토큰을 미리 갱신해 로그인 상태 유지
  useEffect(() => {
    const id = setInterval(async () => {
      // 로그인 상태일 때만 refresh 시도
      if (!user) return
      const ok = await silentRefresh()
      if (!ok) {
        // refresh 토큰도 만료된 경우 로그아웃 처리
        setUser(null)
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, refetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  return useContext(AuthContext)
}
