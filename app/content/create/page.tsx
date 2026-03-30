'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import HomeFooter from '@/app/components/HomeFooter'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

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

  // 팀원 검색
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<UserResult[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  // 이름 검색 디바운스
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
          // 이미 선택된 멤버 제외
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
      // 1. 콘텐츠 생성
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

      // 2. 선택한 팀원 초대
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
    <main className="relative min-h-screen select-none" style={{ background: 'linear-gradient(to bottom, #040d1f 0%, #0E1427 100%)' }}>

      {/* Background */}
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

      <div className="relative max-w-5xl mx-auto px-[5vw] pt-36 pb-24">

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
            <path d="M10 1.5V18.5M2.5 5.75L17.5 14.25M17.5 5.75L2.5 14.25" stroke="#1C5AFF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <Link href="/content" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>Content</Link>
          <span>›</span>
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>페이지 생성하기</span>
        </div>

        {/* Main card */}
        <div style={{
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>

          {/* Top section: Title + Description */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ minHeight: '260px' }}>

            {/* Title */}
            <div style={{
              padding: '40px 40px 32px',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="TITLE"
                maxLength={60}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)',
                  fontWeight: 900,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  fontFamily: "var(--font-archivo-black), 'Archivo Black', sans-serif",
                  lineHeight: 1.15,
                  width: '100%',
                  caretColor: '#1C5AFF',
                }}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
              />
              {error && (
                <p style={{ color: '#f87171', fontSize: '12px', marginTop: '8px' }}>{error}</p>
              )}
            </div>

            {/* Description */}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.06em' }}>
                활동소개
              </p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="활동에 대한 설명을 입력해주세요."
                rows={6}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  resize: 'none',
                  outline: 'none',
                  caretColor: '#1C5AFF',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(28,90,255,0.5)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

          {/* Middle section: Type + Visibility + Member search */}
          <div style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>

            {/* Type selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', marginRight: '4px' }}>유형</span>
              {(['STUDY', 'PROJECT'] as ContentType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '5px 16px',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: type === t ? '1px solid rgba(28,90,255,0.7)' : '1px solid rgba(255,255,255,0.15)',
                    background: type === t ? 'rgba(28,90,255,0.18)' : 'rgba(255,255,255,0.05)',
                    color: type === t ? '#7ba8ff' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'STUDY' ? 'Study' : 'Project'}
                </button>
              ))}
            </div>

            {/* Visibility selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {([['TEAM', 'Only Team'], ['MEMBER', 'Public']] as [ContentVisibility, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setVisibility(val)}
                  style={{
                    padding: '5px 16px',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: visibility === val ? '1px solid rgba(28,90,255,0.7)' : '1px solid rgba(255,255,255,0.15)',
                    background: visibility === val ? 'rgba(28,90,255,0.18)' : 'rgba(255,255,255,0.05)',
                    color: visibility === val ? '#7ba8ff' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Member search */}
            <div ref={searchRef} style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="팀원 이름으로 검색"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '13px',
                    width: '100%',
                    caretColor: '#1C5AFF',
                  }}
                />
                {searching && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                )}
              </div>

              {/* Search dropdown */}
              {dropdownOpen && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: 'rgba(10,15,30,0.97)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => selectMember(user)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(28,90,255,0.12)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: 'rgba(28,90,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#7ba8ff', fontSize: '12px', fontWeight: 700, flexShrink: 0,
                      }}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>{user.name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>
                          {[user.studentId, user.department].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {dropdownOpen && searchQuery && searchResults.length === 0 && !searching && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  background: 'rgba(10,15,30,0.97)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '14px',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                  textAlign: 'center',
                }}>
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Selected members */}
          {selectedMembers.length > 0 && (
            <>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 40px' }} />
              <div style={{ padding: '16px 40px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 600, marginRight: '4px' }}>초대할 팀원</span>
                {selectedMembers.map(member => (
                  <span key={member.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px 4px 12px',
                    borderRadius: '100px',
                    background: 'rgba(28,90,255,0.15)',
                    border: '1px solid rgba(28,90,255,0.35)',
                    color: '#7ba8ff',
                    fontSize: '12px', fontWeight: 500,
                  }}>
                    {member.name}
                    <button
                      onClick={() => removeMember(member.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(123,168,255,0.6)', lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

          {/* Actions */}
          <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Link
              href="/content"
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
            >
              취소
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: submitting ? 'rgba(28,90,255,0.5)' : '#1C5AFF',
                color: '#fff',
                cursor: submitting ? 'default' : 'pointer',
                transition: 'background 0.15s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = '#2d6aff' }}
              onMouseLeave={e => { if (!submitting) (e.currentTarget as HTMLElement).style.background = '#1C5AFF' }}
            >
              {submitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  생성 중...
                </>
              ) : '페이지 생성하기'}
            </button>
          </div>
        </div>

        {/* Helper text */}
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '16px', textAlign: 'center' }}>
          페이지를 생성한 사람이 팀장이 됩니다.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <HomeFooter />
    </main>
  )
}
