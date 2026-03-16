'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

export interface AuthUser {
  id: number
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

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
      const rawRole: string = (Array.isArray(raw.roles) ? raw.roles[0] : raw.role)
        ?? (typeof window !== 'undefined' ? localStorage.getItem('user_role') : null)
        ?? ''
      const normalizedRole: 'ADMIN' | 'MEMBER' = rawRole.toUpperCase().includes('ADMIN') ? 'ADMIN' : 'MEMBER'
      setUser({
        id: raw.userId ?? raw.id,
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

  return (
    <AuthContext.Provider value={{ user, loading, refetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  return useContext(AuthContext)
}
