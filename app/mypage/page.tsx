'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface MyPost {
  id: number
  title: string
  category: string
  createdAt: string
}

interface MyComment {
  id: number
  content: string
  postTitle: string
  postId: number
  createdAt: string
}

type Tab = 'posts' | 'comments' | 'likes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: '내 게시글' },
  { key: 'comments', label: '내 댓글' },
  { key: 'likes', label: '좋아요한 게시글' },
]

function parseList<T>(json: unknown): T[] {
  if (!json) return []
  const j = json as Record<string, unknown>
  if (Array.isArray(j)) return j as T[]
  if (j.data) {
    const d = j.data as Record<string, unknown>
    if (Array.isArray(d)) return d as T[]
    if (d.content && Array.isArray(d.content)) return d.content as T[]
  }
  if (j.content && Array.isArray(j.content)) return j.content as T[]
  return []
}

export default function MypagePage() {
  const { user, loading: authLoading, refetch } = useAuthContext()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('posts')

  const [posts, setPosts] = useState<MyPost[]>([])
  const [comments, setComments] = useState<MyComment[]>([])
  const [likes, setLikes] = useState<MyPost[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const fetchTab = useCallback(async (t: Tab) => {
    setTabLoading(true)
    try {
      const endpointMap: Record<Tab, string> = {
        posts: `/v1/mypage/posts?page=0&size=10`,
        comments: `/v1/mypage/comments?page=0&size=10`,
        likes: `/v1/mypage/likes?page=0&size=10`,
      }
      const res = await fetchWithAuth(`${API_URL}${endpointMap[t]}`)
      if (!res.ok) return
      const json = await res.json()
      if (t === 'posts') setPosts(parseList<MyPost>(json))
      else if (t === 'comments') setComments(parseList<MyComment>(json))
      else setLikes(parseList<MyPost>(json))
    } finally {
      setTabLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) fetchTab(tab)
  }, [tab, authLoading, user, fetchTab])

  async function handleLogout() {
    setLogoutLoading(true)
    try {
      await fetchWithAuth(`${API_URL}/v1/auth/logout`, { method: 'POST' })
    } finally {
      localStorage.removeItem('user_role')
      await refetch()
      router.push('/login')
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#040d1f' }}>
        <div className="text-white/40 text-sm">불러오는 중...</div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#040d1f' }}>
        <div className="text-center">
          <p className="text-white/40 mb-4">로그인이 필요합니다.</p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold text-sm">
            로그인하기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen pt-24 px-12" style={{ background: '#040d1f' }}>
      <div className="max-w-5xl mx-auto py-16">

        {/* Profile header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0041EF, #0066ff)' }}
            >
              {user.nickname?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-white text-3xl font-black">{user.nickname}</h1>
              <p className="text-white/40 text-sm mt-1">{user.email}</p>
              <span
                className={`text-xs font-bold tracking-wider px-2 py-0.5 rounded mt-1 inline-block ${
                  user.role === 'ADMIN'
                    ? 'bg-blue-600/30 text-blue-300'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {user.role === 'ADMIN' ? 'MANAGER' : 'MEMBER'}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-40"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {logoutLoading ? '로그아웃 중...' : '로그아웃'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-white/10">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-3 text-sm font-semibold tracking-wider transition-colors ${
                tab === key
                  ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tabLoading ? (
          <div className="py-16 text-center text-white/30 text-sm">불러오는 중...</div>
        ) : (
          <>
            {/* Posts */}
            {tab === 'posts' && (
              <PostList items={posts} emptyMessage="작성한 게시글이 없습니다." />
            )}

            {/* Comments */}
            {tab === 'comments' && (
              <div className="divide-y divide-white/10">
                {comments.length === 0 ? (
                  <p className="text-white/40 py-10 text-center text-sm">작성한 댓글이 없습니다.</p>
                ) : (
                  comments.map((c) => (
                    <Link
                      key={c.id}
                      href={`/blog/${c.postId}`}
                      className="py-4 px-4 -mx-4 rounded-lg hover:bg-white/5 transition-colors block group"
                    >
                      <p className="text-white/40 text-xs mb-1 group-hover:text-blue-300 transition-colors truncate">
                        {c.postTitle}
                      </p>
                      <p className="text-white font-medium text-sm">{c.content}</p>
                      <p className="text-white/30 text-xs mt-1">
                        {new Date(c.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Likes */}
            {tab === 'likes' && (
              <PostList items={likes} emptyMessage="좋아요한 게시글이 없습니다." />
            )}
          </>
        )}
      </div>
    </main>
  )
}

function PostList({ items, emptyMessage }: { items: MyPost[]; emptyMessage: string }) {
  if (items.length === 0) {
    return <p className="text-white/40 py-10 text-center text-sm">{emptyMessage}</p>
  }
  return (
    <div className="divide-y divide-white/10">
      {items.map((post) => (
        <Link
          key={post.id}
          href={`/blog/${post.id}`}
          className="flex items-center gap-4 py-4 hover:bg-white/5 px-4 -mx-4 rounded-lg transition-colors group"
        >
          <span className="text-xs text-blue-400 font-semibold tracking-wider flex-shrink-0">
            {post.category}
          </span>
          <span className="text-white font-medium flex-1 group-hover:text-blue-200 transition-colors truncate text-sm">
            {post.title}
          </span>
          <span className="text-white/30 text-xs flex-shrink-0">
            {new Date(post.createdAt).toLocaleDateString('ko-KR')}
          </span>
        </Link>
      ))}
    </div>
  )
}
