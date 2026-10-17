'use client'

import { useState } from 'react'
import { notifyPendingApprovalsChanged } from '@/app/lib/usePendingApprovals'
import {
  adminFetch, Button, ConfirmDialog, DetailPanel, EmptyState, ErrorState, InfoGrid, LoadingState,
  PageHeader, panelPad, SelectableRow, since, Table, Td, Th, Toast, useAdminQuery, useToast, type Tone,
} from '../_components/AdminUI'

interface PendingUser {
  id: number
  email: string
  name: string
  nickname: string
  department: string | null
  studentId: string | null
  generation: number | null
  createdAt: string
}

interface PendingPage {
  content: PendingUser[]
  totalElements: number
  totalPages: number
  number: number
}

type Outcome = 'approved' | 'rejected'

/** 첫 페이지(base) 한 벌에 딸린 화면 상태 */
interface Session {
  base: PendingPage | null
  /** "더 보기"로 이어 붙인 줄 */
  extra: PendingUser[]
  processed: Record<number, Outcome>
  /** 가장 최근 응답의 전체 건수와, 그 응답을 받을 때까지 처리한 건수 */
  latestTotal: { total: number; processedAt: number } | null
}

const blankSession = (base: PendingPage | null): Session => ({ base, extra: [], processed: {}, latestTotal: null })

const PAGE_SIZE = 20
const FIRST_PAGE = `/v1/admin/approvals/pending?page=0&size=${PAGE_SIZE}`

const gen = (g: number | null | undefined) => (g ? `${g}기` : '—')

const ALREADY_HANDLED = '이미 처리된 신청이에요. 목록을 새로 불러올게요.'

export default function AdminApprovalsPage() {
  const { toast, show } = useToast()

  // 첫 페이지는 useAdminQuery 로, 그 뒤 페이지는 "더 보기"를 누를 때 직접 불러와 이어 붙인다
  const { data, error, loading, reload } = useAdminQuery<PendingPage>(FIRST_PAGE)
  const [stored, setStored] = useState<Session>(() => blankSession(null))
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 처리 표시 · 더 불러온 줄은 지금 첫 페이지에 묶인다. 새 첫 페이지가 도착해야 비워지므로
  // 새로고침 중(이전 목록이 아직 보이는 동안)엔 처리한 줄이 미처리로 되살아나지 않는다.
  const session = stored.base === data ? stored : blankSession(data)
  const updateSession = (fn: (s: Session) => Session) => setStored((s) => fn(s.base === data ? s : blankSession(data)))
  const { extra, processed, latestTotal } = session

  // 첫 페이지 + 더 불러온 것 (id 로 중복 제거)
  const seen = new Set<number>()
  const applicants: PendingUser[] = []
  for (const u of [...(data?.content ?? []), ...extra]) {
    if (seen.has(u.id)) continue
    seen.add(u.id)
    applicants.push(u)
  }

  const processedCount = Object.keys(processed).length
  const base = latestTotal ?? (data ? { total: data.totalElements, processedAt: 0 } : null)
  /** 서버에 아직 남은 대기 건수 (이 화면에서 처리한 만큼 뺀다) */
  const remaining = base ? Math.max(0, base.total - (processedCount - base.processedAt)) : 0
  const unprocessedLoaded = applicants.filter((u) => !processed[u.id]).length
  const hasMore = remaining > unprocessedLoaded

  const selected = applicants.find((u) => u.id === selectedId) ?? null
  const panelOpen = !!selected

  /** 첫 페이지부터 다시 불러온다. 처리 표시는 새 목록이 도착할 때 비워진다 */
  function reloadList() {
    setMoreError('')
    reload()
  }

  function refresh() {
    setSelectedId(null)
    reloadList()
  }

  async function loadMore() {
    // 처리한 사람은 서버 대기 목록에서 빠져 뒤 항목이 앞으로 당겨진다.
    // 건너뛰지 않도록 "아직 대기 중인 것으로 불러온 수" 기준으로 페이지를 고르고, 겹치는 건 id 로 걸러낸다.
    const offset = applicants.length - processedCount
    const page = Math.max(0, Math.floor(offset / PAGE_SIZE))
    setLoadingMore(true)
    setMoreError('')
    const r = await adminFetch<PendingPage>(`/v1/admin/approvals/pending?page=${page}&size=${PAGE_SIZE}`)
    setLoadingMore(false)
    if (!r.ok) { setMoreError(r.error); return }
    const fresh = (r.data.content ?? []).filter((u) => !seen.has(u.id))
    // 새 줄이 없거나 서버 건수가 예상과 다르면 (다른 관리자가 동시에 처리 등) 위치가 어긋난 것이다.
    // 건너뛴 사람이 생기지 않게 첫 페이지부터 다시 불러온다.
    if (fresh.length === 0 || r.data.totalElements !== remaining) { reloadList(); return }
    updateSession((s) => ({
      ...s,
      extra: [...s.extra, ...fresh],
      latestTotal: { total: r.data.totalElements, processedAt: processedCount },
    }))
  }

  /** 승인/거부 실패: 이미 처리된 신청(409)일 수 있으니 목록을 다시 불러와 지난 줄을 걷어낸다 */
  function onFailed(text: string) {
    show(text, 'danger')
    reloadList()
  }

  function onDone(u: PendingUser, outcome: Outcome) {
    const nextProcessed = { ...processed, [u.id]: outcome }
    updateSession((s) => ({ ...s, processed: { ...s.processed, [u.id]: outcome } }))
    notifyPendingApprovalsChanged()
    show(outcome === 'approved' ? `${u.name} 님을 승인했어요.` : `${u.name} 님의 신청을 거부했어요.`, outcome === 'approved' ? 'live' : 'off')
    // 다음 미처리 신청자를 바로 연다: 아래쪽 먼저, 없으면 위쪽
    const idx = applicants.findIndex((a) => a.id === u.id)
    const rest = [...applicants.slice(idx + 1), ...applicants.slice(0, Math.max(0, idx))]
    const next = rest.find((a) => !nextProcessed[a.id])
    setSelectedId(next ? next.id : null)
  }

  return (
    <div className={panelPad(panelOpen)}>
      <PageHeader
        path="approvals"
        title="가입 승인"
        description={<>초대 코드 없이 가입한 신청자예요. 대기 <span className="font-mono text-white">{remaining}</span>건</>}
        actions={<Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>새로고침</Button>}
      />

      {error && !data ? (
        <ErrorState command="fetch approvals --pending" error={error} onRetry={refresh} />
      ) : loading && !data ? (
        <LoadingState command="fetch approvals --pending" />
      ) : applicants.length === 0 ? (
        <EmptyState command="ls approvals/pending/" text="대기 중인 신청이 없어요" />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={refresh} className="cursor-pointer underline">다시 시도</button></p>}
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table label="가입 신청 목록">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th className="hidden sm:table-cell">Gen</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden lg:table-cell'}>Dept</Th>
                  <Th>Waiting</Th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((u) => {
                  const done = processed[u.id]
                  return (
                    <SelectableRow
                      key={u.id}
                      selected={u.id === selectedId}
                      onSelect={() => setSelectedId(u.id)}
                      dim={!!done}
                      label={`${u.name} 신청 ${done ? '결과 보기' : '열기'}`}
                    >
                      <Td className="font-semibold text-white">
                        {u.name}
                        <span className="mt-1 block font-mono text-[11px] font-normal text-fg-faint">
                          {u.nickname}<span className="sm:hidden"> · {gen(u.generation)}</span>
                        </span>
                      </Td>
                      <Td className="hidden font-mono sm:table-cell">{u.generation ?? '—'}</Td>
                      <Td className={`text-fg-subtle ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>{u.department || '—'}</Td>
                      <Td className="whitespace-nowrap font-mono">
                        {done === 'approved' ? <span className="text-status-live-text">✓ 승인됨</span>
                          : done === 'rejected' ? <span className="text-fg-subtle">✕ 거부됨</span>
                            : <span className="text-fg-subtle">{since(u.createdAt)}</span>}
                      </Td>
                    </SelectableRow>
                  )
                })}
              </tbody>
            </Table>
          </div>

          {(hasMore || moreError) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm" loading={loadingMore} onClick={loadMore}>
                더 보기 <span className="font-mono text-fg-faint">{Math.max(0, remaining - unprocessedLoaded)}</span>
              </Button>
              {moreError && <p role="alert" className="text-xs text-danger">더 불러오지 못했어요: {moreError}</p>}
            </div>
          )}
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">↑↓ 이동 · enter 열기 · esc 닫기</p>
        </>
      )}

      {selected && (
        <ApplicantPanel
          key={selected.id}
          user={selected}
          outcome={processed[selected.id] ?? null}
          locked={loading}
          onClose={() => setSelectedId(null)}
          onDone={onDone}
          onFailed={onFailed}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

function ApplicantPanel({
  user, outcome, locked, onClose, onDone, onFailed,
}: {
  user: PendingUser
  outcome: Outcome | null
  /** 목록을 새로 불러오는 중: 방금 처리된 줄이 아직 남아 보일 수 있어 처리를 막는다 */
  locked: boolean
  onClose: () => void
  onDone: (u: PendingUser, outcome: Outcome) => void
  onFailed: (text: string) => void
}) {
  const [approving, setApproving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectError, setRejectError] = useState('')

  const busy = approving || rejecting
  const waited = since(user.createdAt)

  async function approve() {
    if (locked) return
    setApproving(true)
    setNotice(null)
    const r = await adminFetch(`/v1/admin/approvals/${user.id}/approve`, { method: 'POST' })
    setApproving(false)
    if (!r.ok) {
      const text = r.status === 409 ? ALREADY_HANDLED : `승인하지 못했어요: ${r.error}`
      setNotice({ tone: 'danger', text })
      onFailed(text)
      return
    }
    onDone(user, 'approved')
  }

  async function reject() {
    if (locked) return
    setRejecting(true)
    setRejectError('')
    const r = await adminFetch(`/v1/admin/approvals/${user.id}/reject`, { method: 'POST' })
    setRejecting(false)
    if (!r.ok) {
      if (r.status === 409) {
        // 다시 시도해도 소용없으니 창을 닫고 패널에 알린다
        setConfirmOpen(false)
        setNotice({ tone: 'danger', text: ALREADY_HANDLED })
        onFailed(ALREADY_HANDLED)
      } else {
        setRejectError(r.error)
        onFailed(`거부하지 못했어요: ${r.error}`)
      }
      return
    }
    setConfirmOpen(false)
    onDone(user, 'rejected')
  }

  const resultNotice = outcome === 'approved'
    ? { tone: 'live' as Tone, text: '승인했어요. 이제 로그인해 활동할 수 있어요.' }
    : outcome === 'rejected'
      ? { tone: 'off' as Tone, text: '거부했어요.' }
      : null

  return (
    <>
      <DetailPanel
        open
        onClose={onClose}
        path={`approvals/${user.nickname}`}
        label={`${user.name} 가입 신청`}
        busy={busy}
        notice={resultNotice ?? notice}
        footer={outcome ? undefined : (
          <>
            <Button
              variant="dangerGhost"
              disabled={approving || locked}
              onClick={() => { setRejectError(''); setConfirmOpen(true) }}
            >
              거부…
            </Button>
            <Button variant="success" loading={approving} disabled={rejecting || locked} onClick={approve}>승인하고 다음 →</Button>
          </>
        )}
      >
        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
        <p className="mb-5 mt-1 font-mono text-xs text-fg-faint">
          {waited === '—' ? '신청일 정보 없음' : waited === '방금' ? '방금 신청' : `${waited} 전 신청`}
        </p>
        <InfoGrid
          rows={[
            ['email', user.email],
            ['nick', user.nickname],
            ['dept', user.department || '—'],
            ['id', user.studentId || '—'],
            ['gen', gen(user.generation)],
          ]}
        />
        {!outcome && (
          <p className="text-xs leading-relaxed text-fg-faint">
            승인하면 신청자에게 안내 메일이 가고 바로 로그인할 수 있어요.
          </p>
        )}
      </DetailPanel>

      <ConfirmDialog
        open={confirmOpen}
        title="가입 거부"
        confirmLabel="거부"
        busy={rejecting}
        error={rejectError}
        onConfirm={reject}
        onClose={() => setConfirmOpen(false)}
      >
        <b className="text-white">{user.name}</b> ({user.email}) 님의 가입 신청을 거부합니다.
        신청자에게 반려 안내 메일이 가고, 이 계정으로는 로그인할 수 없어요.
        계정이 그대로 남아 있어 같은 이메일로 다시 가입할 수도 없고, 이 화면에서 되돌릴 수 없어요.
      </ConfirmDialog>
    </>
  )
}
