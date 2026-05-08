'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

type UserStatus = 'ACTIVE' | 'BREAK' | 'OB' | 'LEAVE'

interface AdminUser {
  id: number
  email: string
  name: string
  nickname: string
  department: string
  studentId: string
  generation: number
  status: UserStatus
  createdAt: string
  roles: string[]
}

interface PageInfo {
  totalElements: number
  totalPages: number
  number: number
}

const STATUS_OPTIONS: { value: '' | UserStatus; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '활동' },
  { value: 'BREAK', label: '휴학' },
  { value: 'OB', label: 'OB' },
  { value: 'LEAVE', label: '탈퇴' },
]

const STATUS_STYLE: Record<UserStatus, React.CSSProperties> = {
  ACTIVE: { color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' },
  BREAK:  { color: '#facc15', background: 'rgba(250,204,21,0.1)',  border: '1px solid rgba(250,204,21,0.25)' },
  OB:     { color: '#94a3b8', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.25)' },
  LEAVE:  { color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' },
}

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: '활동', BREAK: '휴학', OB: 'OB', LEAVE: '탈퇴',
}

function Badge({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', ...style,
    }}>
      {children}
    </span>
  )
}

function ConfirmModal({
  message, onConfirm, onCancel, danger = false,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#0d1b35', borderRadius: '16px', padding: '28px',
        border: '1px solid rgba(255,255,255,0.1)', maxWidth: '380px', width: '100%',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '13px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}
          >취소</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: danger ? 'rgba(239,68,68,0.85)' : 'rgba(28,90,255,0.85)',
              border: 'none', color: '#fff', cursor: 'pointer',
            }}
          >확인</button>
        </div>
      </div>
    </div>
  )
}

function StatusModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = user.roles.includes('ADMIN')
  const [grantAdmin, setGrantAdmin] = useState(isAdmin)

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const statusRes = await fetchWithAuth(`${API_URL}/v1/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!statusRes.ok) {
        const d = await statusRes.json().catch(() => ({}))
        throw new Error(d?.message ?? '상태 변경 실패')
      }

      if (grantAdmin !== isAdmin) {
        const roleRes = await fetchWithAuth(`${API_URL}/v1/admin/users/${user.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grant: grantAdmin }),
        })
        if (!roleRes.ok) {
          const d = await roleRes.json().catch(() => ({}))
          throw new Error(d?.message ?? '권한 변경 실패')
        }
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#0d1b35', borderRadius: '16px', padding: '28px',
        border: '1px solid rgba(255,255,255,0.1)', maxWidth: '400px', width: '100%',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: '15px' }}>{user.name}</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>{user.email}</p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.08em' }}>활동 상태</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['ACTIVE', 'BREAK', 'OB', 'LEAVE'] as UserStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    ...(status === s
                      ? STATUS_STYLE[s]
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }
                    ),
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>관리자 권한</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>전체 관리 기능에 접근 가능</p>
            </div>
            <button
              onClick={() => setGrantAdmin(v => !v)}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', transition: 'background 0.2s', position: 'relative',
                background: grantAdmin ? '#1C5AFF' : 'rgba(255,255,255,0.15)',
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: grantAdmin ? '23px' : '3px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </button>
          </div>
        </div>

        {error && <p style={{ color: '#f87171', fontSize: '12px', marginTop: '12px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px', borderRadius: '8px', fontSize: '13px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}
          >취소</button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: 'rgba(28,90,255,0.85)', border: 'none',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >{loading ? '저장 중...' : '저장'}</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo>({ totalElements: 0, totalPages: 0, number: 0 })
  const [statusFilter, setStatusFilter] = useState<'' | UserStatus>('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), size: '20' })
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetchWithAuth(`${API_URL}/v1/admin/users?${params}`)
      const json = await res.json().catch(() => ({}))
      const data = json?.data
      if (data) {
        setUsers(data.content ?? [])
        setPageInfo({ totalElements: data.totalElements ?? 0, totalPages: data.totalPages ?? 0, number: data.number ?? 0 })
      }
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleDelete() {
    if (!deletingUser) return
    try {
      await fetchWithAuth(`${API_URL}/v1/admin/users/${deletingUser.id}`, { method: 'DELETE' })
      setDeletingUser(null)
      loadUsers()
    } catch {}
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(0)
  }

  const cell: React.CSSProperties = {
    padding: '12px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.75)',
    borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle',
  }
  const hCell: React.CSSProperties = {
    padding: '10px 14px', fontSize: '11px', fontWeight: 700,
    color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)',
  }

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>회원 관리</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>전체 {pageInfo.totalElements}명</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => { setStatusFilter(o.value); setPage(0) }}
              style={{
                padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: statusFilter === o.value ? 'rgba(28,90,255,0.3)' : 'rgba(255,255,255,0.05)',
                border: statusFilter === o.value ? '1px solid rgba(28,90,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                color: statusFilter === o.value ? '#7aa3ff' : 'rgba(255,255,255,0.45)',
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="이름, 닉네임, 이메일 검색"
            style={{
              padding: '7px 12px', borderRadius: '7px', fontSize: '12px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none', width: '220px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(28,90,255,0.3)', border: '1px solid rgba(28,90,255,0.4)',
              color: '#7aa3ff', cursor: 'pointer',
            }}
          >검색</button>
        </form>
      </div>

      {/* Table */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['이름', '닉네임', '이메일', '학과', '학번', '기수', '상태', '권한', '가입일', ''].map(h => (
                <th key={h} style={hCell}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ ...cell, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px' }}>
                  불러오는 중...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ ...cell, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px' }}>
                  회원이 없습니다.
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={cell}>{u.name}</td>
                <td style={cell}>{u.nickname}</td>
                <td style={{ ...cell, color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{u.email}</td>
                <td style={{ ...cell, color: 'rgba(255,255,255,0.45)' }}>{u.department || '—'}</td>
                <td style={{ ...cell, color: 'rgba(255,255,255,0.45)' }}>{u.studentId || '—'}</td>
                <td style={{ ...cell, color: 'rgba(255,255,255,0.45)' }}>{u.generation ? `${u.generation}기` : '—'}</td>
                <td style={cell}>
                  <Badge style={STATUS_STYLE[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                </td>
                <td style={cell}>
                  {u.roles.includes('ADMIN') ? (
                    <Badge style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>ADMIN</Badge>
                  ) : (
                    <Badge style={{ color: 'rgba(255,255,255,0.35)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>MEMBER</Badge>
                  )}
                </td>
                <td style={{ ...cell, fontSize: '12px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '—'}
                </td>
                <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setEditingUser(u)}
                      style={{
                        padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(28,90,255,0.2)', border: '1px solid rgba(28,90,255,0.35)',
                        color: '#7aa3ff', cursor: 'pointer',
                      }}
                    >편집</button>
                    <button
                      onClick={() => setDeletingUser(u)}
                      style={{
                        padding: '4px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#f87171', cursor: 'pointer',
                      }}
                    >삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageInfo.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
          {Array.from({ length: pageInfo.totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              style={{
                width: '32px', height: '32px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: i === pageInfo.number ? 'rgba(28,90,255,0.4)' : 'rgba(255,255,255,0.06)',
                color: i === pageInfo.number ? '#7aa3ff' : 'rgba(255,255,255,0.4)',
              }}
            >{i + 1}</button>
          ))}
        </div>
      )}

      {editingUser && (
        <StatusModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={loadUsers} />
      )}

      {deletingUser && (
        <ConfirmModal
          message={`${deletingUser.name}(${deletingUser.email}) 회원을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </div>
  )
}
