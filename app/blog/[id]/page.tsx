'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import HomeFooter from '@/app/components/HomeFooter'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

const CATEGORY_LABEL: Record<string, string> = {
  KNOWLEDGE: 'Knowledge',
  QNA: 'QnA',
  ACTIVITIES: 'Activities',
}

const CATEGORY_COLOR: Record<string, { border: string; text: string; bg: string }> = {
  ACTIVITIES: { border: '#FF9193', text: '#FF9193', bg: 'rgba(255,145,147,0.08)' },
  KNOWLEDGE:  { border: '#74FF89', text: '#74FF89', bg: 'rgba(116,255,137,0.08)' },
  QNA:        { border: '#91CDFF', text: '#91CDFF', bg: 'rgba(145,205,255,0.08)' },
}

interface PostFile {
  id: number
  fileUrl: string
  fileName: string
  mimeType: string
}

interface PostDetail {
  id: number
  title: string
  content: string
  category: string
  authorName: string
  authorId: number
  likeCount: number
  liked: boolean
  commentCount: number
  isFeatured: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string | null
  files: PostFile[]
}

interface Comment {
  id: number
  content: string | null
  isDeleted: boolean
  authorName: string | null
  authorId: number | null
  parentId: number | null
  replies: Comment[]
  createdAt: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
}


function formatDateShort(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function renderContentWithMentions(content: string) {
  const parts = content.split(/(@\S+)/g)
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} style={{ color: '#74FF89', fontWeight: 500 }}>{part}</span>
      : part
  )
}
function normalizeUploadedFileUrl(url: string) {
  if (!url) return url
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`

  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith('/uploads/')) {
      return `${API_URL}${parsed.pathname}`
    }
  } catch {
    // Leave non-URL values unchanged.
  }

  return url
}

function normalizePostContent(content: string) {
  return content.replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (_match, prefix: string, src: string, suffix: string) => {
    return `${prefix}${normalizeUploadedFileUrl(src)}${suffix}`
  })
}

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthContext()

  const [post, setPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likePending, setLikePending] = useState(false)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: number; authorName: string; authorId: number | null } | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)

  // @ 멘션 자동완성
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionSuggestions, setMentionSuggestions] = useState<{ id: number; nickname: string }[]>([])
  const [mentionAt, setMentionAt] = useState<number | null>(null) // @ 위치
  const [mentionUserIds, setMentionUserIds] = useState<number[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [commentPage, setCommentPage] = useState(1)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const COMMENTS_PER_PAGE = 5

  const isAdmin = user?.role === 'ADMIN'
  const isOwner = user != null && post != null && user.id === post.authorId

  // 게시글 불러오기
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}`, { cache: 'no-store' })
        if (res.status === 404) { setNotFound(true); return }
        if (!res.ok) { setNotFound(true); return }
        const json = await res.json()
        const data: PostDetail = json.data
        setPost(data)
        setLikeCount(data.likeCount)
        setLiked(data.liked ?? false)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [id])

  // 댓글 불러오기
  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}/comments`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        setComments(json.data ?? [])
      } catch {}
    }
    fetchComments()
  }, [id])

  const handleLike = async () => {
    if (!user) return
    if (likePending) return
    setLikePending(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}/likes`, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        setLiked(json.data.liked)
        setLikeCount(json.data.likeCount)
      }
    } catch {} finally {
      setLikePending(false)
    }
  }

  const fetchMentionSuggestions = useCallback(async (query: string) => {
    if (!query) { setMentionSuggestions([]); return }
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/users/mention?q=${encodeURIComponent(query)}`)
      if (!res.ok) return
      const json = await res.json()
      setMentionSuggestions(json.data ?? [])
    } catch {}
  }, [])

  const handleCommentInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setCommentInput(val)
    const cursor = e.target.selectionStart ?? val.length
    // @ 뒤에 영문/한글/숫자가 1자 이상 입력됐는지 확인
    const match = val.slice(0, cursor).match(/@([^\s@]{1,30})$/)
    if (match) {
      const atIdx = cursor - match[0].length
      setMentionAt(atIdx)
      setMentionQuery(match[1])
      fetchMentionSuggestions(match[1])
    } else {
      setMentionAt(null)
      setMentionQuery('')
      setMentionSuggestions([])
    }
  }

  const handleMentionSelect = (u: { id: number; nickname: string }) => {
    if (mentionAt === null) return
    const before = commentInput.slice(0, mentionAt)
    const after = commentInput.slice(mentionAt + 1 + mentionQuery.length)
    const newVal = before + '@' + u.nickname + ' ' + after
    setCommentInput(newVal)
    setMentionUserIds(prev => prev.includes(u.id) ? prev : [...prev, u.id])
    setMentionAt(null)
    setMentionQuery('')
    setMentionSuggestions([])
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleCommentSubmit = async () => {
    if (!commentInput.trim() || !user) return
    setSubmittingComment(true)
    try {
      const body: Record<string, unknown> = {
        content: commentInput.trim(),
        authorDisplay: 'NICKNAME',
        mentionUserIds,
      }
      if (replyTo) body.parentId = replyTo.id

      const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const json = await res.json()
        const newComment: Comment = json.data
        if (replyTo) {
          setComments(prev => prev.map(c =>
            c.id === replyTo.id ? { ...c, replies: [...c.replies, newComment] } : c
          ))
        } else {
          setComments(prev => [...prev, { ...newComment, replies: [] }])
        }
        setCommentInput('')
        setReplyTo(null)
        setMentionUserIds([])
        if (post) setPost({ ...post, commentCount: post.commentCount + 1 })
      }
    } catch {} finally {
      setSubmittingComment(false)
    }
  }

  const handleCommentDelete = async (commentId: number, parentId: number | null) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        if (parentId) {
          // 대댓글 삭제: 백엔드는 부모에 활성 대댓글이 남아있으면 commentCount를 감소시키지 않으므로
          // 남은 대댓글 수를 확인한 뒤 카운트 조정
          setComments(prev => prev.map(c => {
            if (c.id !== parentId) return c
            const newReplies = c.replies.filter(r => r.id !== commentId)
            return { ...c, replies: newReplies }
          }))
          // 삭제 후 부모 댓글의 활성 대댓글이 0개일 때만 감소 (백엔드 동일 조건)
          setComments(prev => {
            const parent = prev.find(c => c.id === parentId)
            const remainingReplies = parent?.replies.filter(r => r.id !== commentId) ?? []
            if (remainingReplies.length === 0 && post) {
              setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) })
            }
            return prev
          })
        } else {
          setComments(prev => prev.filter(c => c.id !== commentId))
          if (post) setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) })
        }
      }
    } catch {}
  }

  const handlePostDelete = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/posts/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/blog')
    } catch {}
  }

  const color = post ? CATEGORY_COLOR[post.category] : CATEGORY_COLOR.KNOWLEDGE

  if (loading) {
    return (
      <main className="relative min-h-screen" style={{ background: '#040d1f' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>불러오는 중...</span>
        </div>
      </main>
    )
  }

  if (notFound || !post) {
    return (
      <main className="relative min-h-screen" style={{ background: '#040d1f' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>게시글을 찾을 수 없습니다.</span>
          <Link href="/blog" style={{ color: '#1C5AFF', fontSize: '14px' }}>목록으로 돌아가기</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen select-none" style={{ background: '#040d1f' }}>

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

      {/* ── Breadcrumb bar ──────────────────────────── */}
      <div className="w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 gap-1.5 text-[13px] mt-40 rounded-t-[100px]"
        style={{ background: 'rgba(0, 65, 239, 0.4)' }}
      >
        <Link
          href="/blog"
          style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          Blog
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>&gt;</span>
        <span style={{ color: '#fff' }}>게시글 상세페이지</span>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div style={{ background: 'rgba(0, 65, 239, 0.05)', minHeight: 'calc(100vh - 209px)', paddingBottom: '80px' }}>
        <div className="relative max-w-4xl mx-auto px-[5vw] pt-12">

          {/* Category badge + pin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{
              fontSize: '12px', fontWeight: 600,
              color: color.text, border: `1px solid ${color.border}`, background: color.bg,
              borderRadius: '100px', padding: '3px 14px',
            }}>
              {CATEGORY_LABEL[post.category] ?? post.category}
            </span>
            {post.isFeatured && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                <Image src="/pin.svg" alt="pinned" width={12} height={12} />
                <span>고정됨</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            color: '#fff', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700,
            lineHeight: 1.35, marginBottom: '18px',
          }}>
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>
              <span>작성자</span>
              <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.2)' }} />
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{post.authorName}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
              {formatDate(post.publishedAt ?? post.createdAt)}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '36px' }} />

          {/* Body content */}
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: normalizePostContent(post.content) }}
            style={{ color: 'rgba(255,255,255,0.82)', fontSize: '15px', lineHeight: 1.85 }}
          />

          {/* 첨부 이미지 (content에 인라인 이미지가 없거나 파일로 별도 저장된 경우) */}
          {/* 파일 이미지 캐러셀 (content에 인라인 이미지가 없을 때만) */}
          {(() => {
            const imageFiles = post.files?.filter(f => f.mimeType.startsWith('image/')) ?? []
            if (imageFiles.length === 0) return null
            const contentHasImages = /<img[^>]+src=["'](?!__IMG_PLACEHOLDER)[^"']+["']/i.test(post.content)
            if (contentHasImages) return null
            const idx = Math.min(carouselIdx, imageFiles.length - 1)
            return (
              <div style={{ marginTop: '24px' }}>
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={normalizeUploadedFileUrl(imageFiles[idx].fileUrl)}
                    alt={imageFiles[idx].fileName}
                    style={{ width: '100%', maxHeight: '520px', objectFit: 'contain', display: 'block' }}
                  />
                  {imageFiles.length > 1 && (
                    <>
                      <button
                        onClick={() => setCarouselIdx(i => (i - 1 + imageFiles.length) % imageFiles.length)}
                        style={{
                          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                          <path d="M7 1L1 7L7 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => setCarouselIdx(i => (i + 1) % imageFiles.length)}
                        style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                          <path d="M1 1L7 7L1 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <div style={{
                        position: 'absolute', top: '10px', right: '10px',
                        background: 'rgba(0,0,0,0.5)', borderRadius: '100px',
                        padding: '2px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.8)',
                      }}>
                        {idx + 1} / {imageFiles.length}
                      </div>
                    </>
                  )}
                </div>
                {imageFiles.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
                    {imageFiles.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIdx(i)}
                        style={{
                          width: i === idx ? '20px' : '6px', height: '6px',
                          borderRadius: '3px',
                          background: i === idx ? '#fff' : 'rgba(255,255,255,0.3)',
                          border: 'none', cursor: 'pointer',
                          transition: 'all 0.2s', padding: 0,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* 비이미지 첨부파일 다운로드 목록 */}
          {(() => {
            const nonImageFiles = post.files?.filter(f => !f.mimeType.startsWith('image/')) ?? []
            if (nonImageFiles.length === 0) return null
            return (
              <div style={{ marginTop: '28px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>첨부파일</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {nonImageFiles.map(file => (
                    <a
                      key={file.id}
                      href={normalizeUploadedFileUrl(file.fileUrl)}
                      download={file.fileName}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.75)', fontSize: '13px', textDecoration: 'none',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.fileName}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Divider */}
          <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', marginTop: '48px', marginBottom: '28px' }} />

          {/* ── Actions: Like + Admin/Owner ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={!user || likePending}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 20px', borderRadius: '100px',
                border: liked ? '1px solid rgba(255,100,100,0.6)' : '1px solid rgba(255,255,255,0.18)',
                background: liked ? 'rgba(255,80,80,0.12)' : 'transparent',
                color: liked ? '#f87171' : 'rgba(255,255,255,0.5)',
                fontSize: '14px', fontWeight: 500, cursor: user ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {likeCount}
            </button>

            {/* Owner / Admin buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {isOwner && (
                <Link
                  href={`/blog/${id}/edit`}
                  style={{
                    padding: '8px 18px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.18)', background: 'transparent',
                    color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500,
                    textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' }}
                >
                  수정하기
                </Link>
              )}
              {(isOwner || isAdmin) && (
                <>
                  {deleteConfirm ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>정말 삭제할까요?</span>
                      <button
                        onClick={handlePostDelete}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.5)', background: 'rgba(248,113,113,0.12)', color: '#f87171', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.6)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)' }}
                    >
                      삭제하기
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Comments ─────────────────────────────── */}
          <div style={{ marginTop: '48px' }}>
            <h3 style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              댓글
              {comments.length > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 400 }}>
                  {comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)}
                </span>
              )}
            </h3>

            {/* Comment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {comments.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', padding: '20px 0' }}>첫 댓글을 남겨보세요.</p>
              ) : (
                comments
                  .slice((commentPage - 1) * COMMENTS_PER_PAGE, commentPage * COMMENTS_PER_PAGE)
                  .map(comment => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      user={user}
                      isAdmin={isAdmin}
                      postAuthorId={post.authorId}
                      onDelete={handleCommentDelete}
                      onReply={c => {
                        setReplyTo({ id: c.id, authorName: c.authorName ?? '익명', authorId: c.authorId })
                        setCommentInput('@' + (c.authorName ?? '익명') + ' ')
                        if (c.authorId != null) setMentionUserIds(prev => prev.includes(c.authorId!) ? prev : [...prev, c.authorId!])
                      }}
                    />
                  ))
              )}
            </div>

            {/* Pagination */}
            {Math.ceil(comments.length / COMMENTS_PER_PAGE) > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '20px' }}>
                <button
                  onClick={() => setCommentPage(p => Math.max(1, p - 1))}
                  disabled={commentPage === 1}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: commentPage === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: commentPage === 1 ? 0.3 : 1 }}
                >
                  <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {Array.from({ length: Math.ceil(comments.length / COMMENTS_PER_PAGE) }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCommentPage(p)}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      border: p === commentPage ? '1px solid rgba(28,90,255,0.6)' : '1px solid rgba(255,255,255,0.12)',
                      background: p === commentPage ? 'rgba(28,90,255,0.3)' : 'transparent',
                      color: p === commentPage ? '#fff' : 'rgba(255,255,255,0.45)',
                      fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCommentPage(p => Math.min(Math.ceil(comments.length / COMMENTS_PER_PAGE), p + 1))}
                  disabled={commentPage === Math.ceil(comments.length / COMMENTS_PER_PAGE)}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: commentPage === Math.ceil(comments.length / COMMENTS_PER_PAGE) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: commentPage === Math.ceil(comments.length / COMMENTS_PER_PAGE) ? 0.3 : 1 }}
                >
                  <svg width="6" height="10" viewBox="0 0 6 10" fill="none"><path d="M1 1L5 5L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            )}

            {/* Comment input */}
            {user ? (
              <div style={{ marginTop: '24px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', background: 'rgba(10,13,22,0.4)' }}>
                {replyTo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: 'rgba(28,90,255,0.08)', borderBottom: '1px solid rgba(28,90,255,0.15)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                      <span style={{ color: '#74FF89' }}>@{replyTo.authorName}</span> 에게 답글 작성 중
                    </span>
                    <button onClick={() => { setReplyTo(null); setCommentInput('') }} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>{user.nickname}</span>
                </div>
                <div style={{ padding: '10px 14px 12px', background: 'rgba(52,52,52,0.4)', position: 'relative' }}>
                  <textarea
                    ref={textareaRef}
                    value={commentInput}
                    onChange={handleCommentInputChange}
                    onKeyDown={e => {
                      if (mentionSuggestions.length > 0 && (e.key === 'Escape')) {
                        setMentionSuggestions([]); setMentionAt(null); setMentionQuery(''); e.preventDefault(); return
                      }
                      if (e.key === 'Enter' && !e.shiftKey && mentionSuggestions.length === 0) { e.preventDefault(); handleCommentSubmit() }
                    }}
                    placeholder={replyTo ? `@${replyTo.authorName}에게 답글 달기...` : '댓글을 작성해보세요. @ - 언급'}
                    rows={2}
                    style={{
                      width: '100%', padding: '0',
                      border: 'none', background: 'transparent',
                      color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.6,
                      outline: 'none', resize: 'none', caretColor: '#1C5AFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  {mentionSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '14px', right: '14px',
                      background: '#0d1a2e', border: '1px solid rgba(28,90,255,0.4)',
                      borderRadius: '10px', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto', zIndex: 50,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    }}>
                      {mentionSuggestions.map((u, i) => (
                        <button
                          key={u.id}
                          onMouseDown={e => { e.preventDefault(); handleMentionSelect(u) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            width: '100%', padding: '9px 14px',
                            background: 'transparent', border: 'none',
                            borderBottom: i < mentionSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            color: 'rgba(255,255,255,0.85)', fontSize: '13px', cursor: 'pointer',
                            textAlign: 'left', transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(28,90,255,0.15)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                          </svg>
                          <span style={{ color: '#74FF89', fontWeight: 500 }}>@{u.nickname}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button
                      onClick={handleCommentSubmit}
                      disabled={!commentInput.trim() || submittingComment}
                      style={{
                        padding: '7px 20px', borderRadius: '8px',
                        border: '0.734px solid rgba(0, 65, 239, 0.6)',
                        background: 'rgba(0, 65, 239, 0.4)',
                        color: '#fff', fontSize: '13px', fontWeight: 600,
                        cursor: commentInput.trim() ? 'pointer' : 'default',
                        opacity: commentInput.trim() ? 1 : 0.5,
                      }}
                    >
                      {submittingComment ? '...' : '등록'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                style={{
                  marginTop: '20px',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.02)',
                  textAlign: 'center',
                  display: 'block',
                  textDecoration: 'none',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>댓글을 작성하려면 </span>
                <span style={{ color: '#7aa3ff', fontSize: '13px' }}>로그인</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>이 필요합니다.</span>
              </Link>
            )}
          </div>

          {/* Back button */}
          <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-start' }}>
            <Link
              href="/blog"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: 'rgba(255,255,255,0.45)', fontSize: '13px', textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
            >
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M6 1L1 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              목록으로
            </Link>
          </div>
        </div>
      </div>

      {/* Content styling */}
      <style>{`
        .post-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 16px 0;
          display: block;
        }
        .post-content p {
          margin: 0 0 14px 0;
        }
        .post-content h1, .post-content h2, .post-content h3 {
          color: #fff;
          margin: 24px 0 12px 0;
        }
        .post-content a {
          color: #7aa3ff;
          text-decoration: underline;
        }
        .post-content ul, .post-content ol {
          padding-left: 24px;
          margin: 0 0 14px 0;
        }
        .post-content li {
          margin-bottom: 4px;
        }
        .post-content blockquote {
          border-left: 3px solid rgba(28,90,255,0.6);
          margin: 16px 0;
          padding: 8px 16px;
          color: rgba(255,255,255,0.6);
        }
        .post-content code {
          background: rgba(255,255,255,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          font-family: monospace;
        }
        .post-content pre {
          background: rgba(255,255,255,0.06);
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 16px 0;
        }
      `}</style>

      <HomeFooter />
    </main>
  )
}

function CommentItem({
  comment, user, isAdmin, postAuthorId, onDelete, onReply, depth = 0,
}: {
  comment: Comment
  user: import('@/app/context/AuthContext').AuthUser | null
  isAdmin: boolean
  postAuthorId: number
  onDelete: (commentId: number, parentId: number | null) => void
  onReply: (comment: Comment) => void
  depth?: number
}) {
  const isOwner = user != null && user.id === comment.authorId
  const isPostAuthor = comment.authorId === postAuthorId
  const cardBg = depth > 0 ? 'rgba(10,13,22,0.4)' : 'rgba(52,52,52,0.4)'

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      {depth > 0 && (
        <div style={{ paddingTop: '14px', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.3 }}>
            <path d="M3 2v7h9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', background: cardBg }}>
          {comment.isDeleted ? (
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>삭제된 댓글입니다.</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>
                  {comment.authorName ?? '익명'}
                </span>
                {isPostAuthor && (
                  <span style={{ fontSize: '11px', color: '#74FF89', border: '1px solid rgba(116,255,137,0.3)', borderRadius: '100px', padding: '1px 7px' }}>
                    작성자
                  </span>
                )}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '14px', lineHeight: 1.65, margin: '0 0 10px 0' }}>
                {renderContentWithMentions(comment.content ?? '')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                  {formatDateShort(comment.createdAt)}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {depth === 0 && user && (
                    <button
                      onClick={() => onReply(comment)}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontSize: '12px', cursor: 'pointer', padding: '3px 10px', borderRadius: '6px', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}
                    >
                      답글
                    </button>
                  )}
                  {(isOwner || isAdmin) && (
                    <button
                      onClick={() => onDelete(comment.id, comment.parentId)}
                      style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.25)', color: 'rgba(248,113,113,0.6)', fontSize: '12px', cursor: 'pointer', padding: '3px 10px', borderRadius: '6px', transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.5)'; (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.25)'; (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.6)' }}
                    >
                      삭제하기
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={{ ...reply, parentId: comment.id }}
                user={user}
                isAdmin={isAdmin}
                postAuthorId={postAuthorId}
                onDelete={onDelete}
                onReply={onReply}
                depth={1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
