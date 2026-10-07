'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

type ContentType = 'STUDY' | 'PROJECT'
type ContentVisibility = 'TEAM' | 'MEMBER'

interface UserResult {
  id: number
  name: string
  studentId: string
  department: string
}

export default function ContentCreatePage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ContentType>('STUDY')
  const [visibility, setVisibility] = useState<ContentVisibility>('TEAM')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSearchResults([])
      setDropdownOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetchWithAuth(`${API_URL}/v1/users/search?name=${encodeURIComponent(value.trim())}`)
        if (res.ok) {
          const json = await res.json()
          const list: UserResult[] = json?.data ?? []
          setSearchResults(list.filter(u => !selectedMembers.some(m => m.id === u.id)))
          setDropdownOpen(true)
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const selectMember = (user: UserResult) => {
    setSelectedMembers(prev => [...prev, user])
    setSearchQuery('')
    setSearchResults([])
    setDropdownOpen(false)
  }

  const removeMember = (userId: number) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== userId))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          visibility,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.message ?? '생성에 실패했습니다.')
        return
      }

      const json = await res.json()
      const contentId = json?.data?.id

      if (contentId && selectedMembers.length > 0) {
        await Promise.allSettled(
          selectedMembers.map(member =>
            fetchWithAuth(`${API_URL}/v1/contents/${contentId}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: member.id }),
            })
          )
        )
      }

      router.push(contentId ? `/content/${contentId}` : '/content')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #040d1f 50vh, #0F0F0F 100%)' }}>
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: '100vh',
          backgroundImage: 'url(/background.png)',
          backgroundSize: '130%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 85%)',
        }}
      />

      {/* ── Breadcrumb bar: 블로그와 같은 터미널 경로 ── */}
      <div className="relative w-full h-[49px] flex items-center px-5 sm:px-10 lg:px-20 text-[13px] mt-40 rounded-t-[100px] bg-brand/40">
        <nav aria-label="현재 위치" className="font-mono tracking-[0.02em]">
          <span className="text-fg-faint">~/</span>
          <Link href="/content" className="text-fg-subtle transition-colors hover:text-white">content</Link>
          <span className="text-fg-faint">/</span>
          <span aria-current="page" className="text-white">create</span>
        </nav>
      </div>

      <div className="relative max-w-5xl mx-auto px-[5vw] pt-12 pb-24">
        <div className="rounded-xl bg-surface border border-line overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[260px]">
            <div className="p-6 sm:p-10 sm:pb-8 flex flex-col justify-end border-b md:border-b-0 md:border-r border-line">
              {/* 한글 제목이 대부분이라 영문 전용 글꼴 대신 Pretendard 굵게 */}
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="TITLE"
                maxLength={60}
                className="w-full bg-transparent border-none outline-none text-white font-black leading-[1.15] tracking-[-0.01em] caret-brand placeholder:text-fg-faint"
                style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              />
              {error && <p className="text-danger text-xs mt-2">{error}</p>}
            </div>

            <div className="p-6 sm:px-8 sm:py-7 flex flex-col">
              <p className="text-fg-subtle text-xs font-semibold mb-2.5 tracking-[0.06em]">활동 소개</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="활동에 대한 설명을 입력해주세요."
                rows={6}
                className="flex-1 rounded-lg px-4 py-3.5 text-[13px] leading-[1.7] text-fg-muted bg-surface-raised border border-line outline-none resize-none caret-brand transition-colors focus:border-brand placeholder:text-fg-faint"
              />
            </div>
          </div>

          <div className="h-px bg-line" />

          <div className="px-6 sm:px-10 py-6 flex items-center gap-x-8 gap-y-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-fg-subtle text-xs font-semibold tracking-[0.06em] mr-1">유형</span>
              {(['STUDY', 'PROJECT'] as ContentType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`px-4 py-[5px] rounded-full text-xs font-semibold border transition-colors ${
                    type === t ? 'bg-brand border-brand text-white' : 'bg-surface border-line-strong text-fg-subtle hover:text-white'
                  }`}
                >
                  {t === 'STUDY' ? 'Study' : 'Project'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle mr-1" aria-label="공개 범위">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {([['TEAM', 'Only Team'], ['MEMBER', 'Public']] as [ContentVisibility, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setVisibility(val)}
                  aria-pressed={visibility === val}
                  className={`px-4 py-[5px] rounded-full text-xs font-semibold border transition-colors ${
                    visibility === val ? 'bg-brand border-brand text-white' : 'bg-surface border-line-strong text-fg-subtle hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div ref={searchRef} className="relative flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle shrink-0" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="멤버 이름으로 검색"
                  className="w-full bg-transparent border-none outline-none text-fg-muted text-[13px] caret-brand placeholder:text-fg-faint"
                />
                {searching && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-fg-subtle shrink-0 animate-spin" aria-hidden="true">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                )}
              </div>

              {dropdownOpen && searchResults.length > 0 && (
                <div className="absolute top-[calc(100%+8px)] inset-x-0 z-[100] rounded-lg overflow-hidden bg-panel border border-line shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => selectMember(user)}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left border-b border-line last:border-b-0 transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:bg-surface-raised"
                    >
                      <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-brand/25 text-white text-xs font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white text-[13px] font-semibold">{user.name}</p>
                        <p className="text-fg-subtle text-[11px]">
                          {[user.studentId, user.department].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {dropdownOpen && searchQuery && searchResults.length === 0 && !searching && (
                <div className="absolute top-[calc(100%+8px)] inset-x-0 z-[100] rounded-lg p-3.5 text-center text-[13px] text-fg-subtle bg-panel border border-line">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <>
              <div className="h-px bg-line mx-6 sm:mx-10" />
              <div className="px-6 sm:px-10 py-4 flex items-center gap-2 flex-wrap">
                <span className="text-fg-subtle text-xs font-semibold mr-1">초대할 멤버</span>
                {selectedMembers.map(member => (
                  <span key={member.id} className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1 rounded-full bg-brand/15 border border-brand/40 text-white text-xs font-medium">
                    {member.name}
                    <button
                      onClick={() => removeMember(member.id)}
                      aria-label={`${member.name} 빼기`}
                      className="flex items-center text-fg-subtle hover:text-white transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="h-px bg-line" />

          <div className="px-6 sm:px-10 py-5 flex justify-end gap-2.5">
            <Link
              href="/content"
              className="inline-flex items-center px-5 py-2 rounded-lg text-[13px] font-medium border border-line-strong text-fg-subtle transition-colors hover:text-white hover:border-fg-faint"
            >
              취소
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg text-[13px] font-semibold text-white bg-brand transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
            >
              {submitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin" aria-hidden="true">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  생성 중...
                </>
              ) : '페이지 생성하기'}
            </button>
          </div>
        </div>

        <p className="text-fg-subtle text-xs mt-4 text-center">
          페이지를 생성한 사람이 팀장이 됩니다.
        </p>
      </div>

      <HomeFooter />
    </main>
  )
}
