'use client'

import { useState } from 'react'
import { useAuthContext } from '@/app/context/AuthContext'
import {
  adminFetch, Button, Choice, ConfirmDialog, DetailPanel, EmptyState, ErrorState, FilterTabs,
  formatDate, InfoGrid, LoadingState, PageHeader, panelPad, SelectableRow, StatusLabel, Table, Td, TextInput,
  Th, Toast, useAdminQuery, useToast, type Tone,
} from '../_components/AdminUI'

type UserStatus = 'ACTIVE' | 'BREAK' | 'OB' | 'LEAVE'

interface AdminUser {
  id: number
  email: string
  name: string
  nickname: string
  department: string
  studentId: string
  generation: number | null
  status: UserStatus
  createdAt: string
  roles: string[]
}

interface PageData {
  content: AdminUser[]
  totalElements: number
  totalPages: number
  number: number
}

const STATUS: Record<UserStatus, { label: string; tone: Tone; tab: string }> = {
  ACTIVE: { label: '활동', tone: 'live', tab: 'active' },
  BREAK: { label: '휴학', tone: 'soon', tab: 'break' },
  OB: { label: 'OB', tone: 'off', tab: 'ob' },
  LEAVE: { label: '탈퇴', tone: 'danger', tab: 'leave' },
}

type Filter = 'ALL' | UserStatus
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'all' },
  ...(Object.keys(STATUS) as UserStatus[]).map((k) => ({ key: k as Filter, label: STATUS[k].tab })),
]

const isAdminUser = (u: AdminUser) => u.roles?.includes('ADMIN')

export default function AdminUsersPage() {
  const { user: me } = useAuthContext()
  const { toast, show } = useToast()

  const [filter, setFilter] = useState<Filter>('ALL')
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const params = new URLSearchParams({ page: String(page), size: '20' })
  if (filter !== 'ALL') params.set('status', filter)
  if (search) params.set('search', search)
  // 필터를 빠르게 바꿔도 늦게 온 이전 응답은 버려진다 (useAdminQuery)
  const { data, error, loading, reload: load, mutate } = useAdminQuery<PageData>(`/v1/admin/users?${params}`)

  const users = data?.content ?? []
  const selected = users.find((u) => u.id === selectedId) ?? null
  const panelOpen = !!selected

  function onSaved(next: AdminUser) {
    mutate((d) => (d ? { ...d, content: d.content.map((u) => (u.id === next.id ? next : u)) } : d))
  }

  function onDeleted(u: AdminUser) {
    setSelectedId(null)
    show(`${u.name} 님을 삭제했어요.`)
    load()
  }

  const total = data?.totalElements ?? 0
  const filtered = filter !== 'ALL' || !!search

  return (
    <div className={panelPad(panelOpen)}>
      <PageHeader
        path="users"
        title="회원 관리"
        description={<>{filtered ? '조건에 맞는 부원' : '승인된 부원'} <span className="font-mono text-white">{total}</span>명</>}
        actions={
          <form
            role="search"
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(0) }}
            className="relative w-full sm:w-[240px]"
          >
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-brand-soft">/</span>
            <TextInput
              type="search"
              aria-label="이름·닉네임·이메일 검색 (Enter)"
              placeholder="이름·닉네임·이메일"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                // 검색어를 지우면 바로 전체로
                if (!e.target.value && search) { setSearch(''); setPage(0) }
              }}
              className="pl-7 font-mono text-[13px]"
            />
          </form>
        }
      />

      <FilterTabs label="상태별 보기" items={FILTERS} value={filter} onChange={(k) => { setFilter(k); setPage(0) }} />

      {error && !data ? (
        <ErrorState command="fetch users" error={error} onRetry={load} />
      ) : loading && !data ? (
        <LoadingState command="fetch users" />
      ) : users.length === 0 ? (
        <EmptyState command={`ls users/${search ? ` | grep "${search}"` : ''}`} text={search ? '검색 결과가 없어요' : '해당하는 부원이 없어요'} />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={load} className="cursor-pointer underline">다시 시도</button></p>}
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table label="회원 목록">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th className="hidden md:table-cell">Nick</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden lg:table-cell'}>Email</Th>
                  <Th className="hidden sm:table-cell">Gen</Th>
                  <Th>Status</Th>
                  <Th className="hidden sm:table-cell">Role</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden xl:table-cell'}>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <SelectableRow key={u.id} selected={u.id === selectedId} onSelect={() => setSelectedId(u.id)} label={`${u.name} 상세 열기`}>
                    <Td className="font-semibold text-white">
                      {u.name}
                      {/* 좁은 화면에선 닉네임 · 기수를 이름 아래에 */}
                      <span className="mt-1 block font-mono text-[11px] font-normal text-fg-faint md:hidden">
                        {u.nickname}{u.generation ? ` · ${u.generation}기` : ''}{isAdminUser(u) ? ' · admin' : ''}
                      </span>
                    </Td>
                    <Td className={`hidden font-mono md:table-cell ${u.id === selectedId ? 'text-white' : 'text-fg-subtle'}`}>{u.nickname}</Td>
                    <Td className={`text-fg-subtle ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>{u.email}</Td>
                    <Td className="hidden font-mono sm:table-cell">{u.generation ?? '—'}</Td>
                    <Td><StatusLabel tone={STATUS[u.status]?.tone ?? 'off'}>{STATUS[u.status]?.label ?? u.status}</StatusLabel></Td>
                    <Td className={`hidden font-mono sm:table-cell ${isAdminUser(u) ? 'text-brand-soft' : 'text-fg-faint'}`}>{isAdminUser(u) ? 'admin' : 'member'}</Td>
                    <Td className={`whitespace-nowrap font-mono text-fg-faint ${panelOpen ? 'hidden' : 'hidden xl:table-cell'}`}>{formatDate(u.createdAt)}</Td>
                  </SelectableRow>
                ))}
              </tbody>
            </Table>
          </div>

          {(data?.totalPages ?? 0) > 1 && (
            <nav aria-label="페이지" className="mt-4 flex items-center gap-3 font-mono text-xs">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="cursor-pointer text-fg-subtle hover:text-white disabled:cursor-not-allowed disabled:text-fg-faint/50">‹ prev</button>
              <span><span className="text-white">{page + 1}</span> <span className="text-fg-faint">/ {data?.totalPages}</span></span>
              <button type="button" disabled={page + 1 >= (data?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)} className="cursor-pointer text-fg-subtle hover:text-white disabled:cursor-not-allowed disabled:text-fg-faint/50">next ›</button>
            </nav>
          )}
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">↑↓ 이동 · enter 열기 · esc 닫기</p>
        </>
      )}

      {selected && (
        // key 로 사람이 바뀔 때마다 패널 안의 입력 상태를 새로 시작한다
        <UserPanel
          key={selected.id}
          user={selected}
          isSelf={me?.id === selected.id}
          onClose={() => setSelectedId(null)}
          onSaved={(u, msg) => { onSaved(u); show(msg) }}
          onDeleted={onDeleted}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

function UserPanel({
  user, isSelf, onClose, onSaved, onDeleted,
}: {
  user: AdminUser
  isSelf: boolean
  onClose: () => void
  onSaved: (u: AdminUser, msg: string) => void
  onDeleted: (u: AdminUser) => void
}) {
  const wasAdmin = isAdminUser(user)
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>(wasAdmin ? 'ADMIN' : 'MEMBER')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const statusChanged = status !== user.status
  const roleChanged = (role === 'ADMIN') !== wasAdmin
  const dirty = statusChanged || roleChanged

  async function save() {
    setSaving(true)
    setNotice(null)
    let next = user
    // 바뀐 것만 보낸다. 상태는 저장되고 권한만 실패하면 표에도 바뀐 상태를 반영해야 하므로 단계별로 기록한다.
    if (statusChanged) {
      const r = await adminFetch(`/v1/admin/users/${user.id}/status`, { method: 'PATCH', json: { status } })
      if (!r.ok) {
        setNotice({ tone: 'danger', text: `저장하지 못했어요: ${r.error}` })
        setSaving(false)
        return
      }
      next = { ...next, status }
    }
    if (roleChanged) {
      const r = await adminFetch(`/v1/admin/users/${user.id}/role`, { method: 'PATCH', json: { grant: role === 'ADMIN' } })
      if (!r.ok) {
        if (next !== user) onSaved(next, '상태만 저장했어요.')
        setNotice({ tone: 'soon', text: `${statusChanged ? '상태는 저장했지만, ' : ''}권한은 바꾸지 못했어요: ${r.error}` })
        setRole(wasAdmin ? 'ADMIN' : 'MEMBER')
        setSaving(false)
        return
      }
      next = { ...next, roles: role === 'ADMIN' ? [...new Set([...(next.roles ?? []), 'ADMIN'])] : (next.roles ?? []).filter((r) => r !== 'ADMIN') }
    }
    onSaved(next, `${user.name} 님 정보를 저장했어요.`)
    setNotice({ tone: 'live', text: '저장했어요.' })
    setSaving(false)
  }

  async function remove() {
    setDeleting(true)
    setDeleteError('')
    const r = await adminFetch(`/v1/admin/users/${user.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!r.ok) { setDeleteError(r.error); return }
    setConfirmOpen(false)
    onDeleted(user)
  }

  return (
    <>
      <DetailPanel
        open
        onClose={onClose}
        path={`users/${user.nickname}`}
        label={`${user.name} 회원 상세`}
        busy={saving || deleting}
        notice={notice}
        footer={
          <>
            <Button
              variant="dangerText"
              disabled={isSelf || saving}
              title={isSelf ? '본인 계정은 여기서 삭제할 수 없어요' : undefined}
              onClick={() => { setDeleteError(''); setConfirmOpen(true) }}
            >
              회원 삭제…
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setStatus(user.status); setRole(wasAdmin ? 'ADMIN' : 'MEMBER'); setNotice(null) }}>되돌리기</Button>
              <Button disabled={!dirty} loading={saving} onClick={save}>저장</Button>
            </div>
          </>
        }
      >
        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
        <p className="mb-5 mt-1 font-mono text-xs text-fg-faint">
          {user.nickname}{user.generation ? ` · ${user.generation}기` : ''} · {formatDate(user.createdAt)} 가입
        </p>
        <InfoGrid rows={[['email', user.email], ['dept', user.department || '—'], ['id', user.studentId || '—']]} />

        <p className="mb-2 text-xs text-fg-subtle">활동 상태</p>
        <div className="mb-5">
          <Choice
            label="활동 상태"
            value={status}
            onChange={setStatus}
            disabled={saving}
            options={(Object.keys(STATUS) as UserStatus[]).map((k) => ({ key: k, label: STATUS[k].label, tone: STATUS[k].tone }))}
          />
        </div>

        <p className="mb-2 text-xs text-fg-subtle">권한</p>
        <Choice
          label="권한"
          value={role}
          onChange={setRole}
          disabled={saving || isSelf}
          options={[{ key: 'MEMBER', label: '부원' }, { key: 'ADMIN', label: '관리자' }]}
        />
        <p className="mt-2 text-xs text-fg-faint">
          {isSelf ? '본인 권한은 다른 관리자가 바꿔야 해요.' : '관리자는 이 콘솔에서 가입 승인·회원 관리를 할 수 있어요. 관리자가 한 명뿐이면 해제할 수 없어요.'}
        </p>
      </DetailPanel>

      <ConfirmDialog
        open={confirmOpen}
        title="회원 삭제"
        confirmLabel="영구 삭제"
        busy={deleting}
        error={deleteError}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      >
        <b className="text-white">{user.name}</b> ({user.email}) 님의 계정이 영구 삭제됩니다. 되돌릴 수 없어요.
      </ConfirmDialog>
    </>
  )
}
