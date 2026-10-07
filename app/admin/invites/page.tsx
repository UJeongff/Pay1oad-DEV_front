'use client'

import { useState, type FormEvent } from 'react'
import {
  adminFetch, asList, Button, ConfirmDialog, DetailPanel, EmptyState, ErrorState, Field, formatDate,
  formatDateTime, InfoGrid, LoadingState, PageHeader, panelPad, SelectableRow, StatusLabel, Table, Td,
  TextInput, Th, Toast, useAdminQuery, useToast, type Tone,
} from '../_components/AdminUI'

interface InviteToken {
  id: number
  code: string
  expiresAt: string
  usedCount: number
  createdByUserId: number
  memo: string | null
  revokedAt: string | null
  createdAt: string
  usable: boolean
}

type InviteStatus = 'live' | 'expired' | 'revoked'

const STATUS: Record<InviteStatus, { label: string; tone: Tone }> = {
  live: { label: '사용 가능', tone: 'live' },
  expired: { label: '만료', tone: 'soon' },
  revoked: { label: '폐기', tone: 'off' },
}

function statusOf(t: InviteToken): InviteStatus {
  if (t.revokedAt) return 'revoked'
  return t.usable ? 'live' : 'expired'
}

const MEMO_MAX = 200

/** 브라우저 기준 오늘(+days) 을 yyyy-MM-dd 로 */
function localYmd(days = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inviteLink(code: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'https://pay1oad.com')
  return `${origin}/register?invite=${encodeURIComponent(code)}`
}

export default function AdminInvitesPage() {
  const { toast, show } = useToast()
  const { data, error, loading, reload, mutate } = useAdminQuery<InviteToken[]>('/v1/admin/invites')
  /** 선택한 코드 id, 'new' 면 새로 만들기 */
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)

  const invites = asList<InviteToken>(data)
  const selected = typeof selectedId === 'number' ? invites.find((t) => t.id === selectedId) ?? null : null
  const creating = selectedId === 'new'
  const panelOpen = creating || !!selected
  const liveCount = invites.filter((t) => statusOf(t) === 'live').length

  function onCreated(t: InviteToken) {
    // 다시 불러오기 전에 바로 목록에 넣어 패널이 새 코드로 넘어가게 한다
    mutate((d) => [t, ...asList<InviteToken>(d).filter((x) => x.id !== t.id)])
    setSelectedId(t.id)
    show('초대 코드를 만들었어요. 링크를 복사해 보내주세요.')
    reload()
  }

  function onRevoked(t: InviteToken) {
    mutate((d) => asList<InviteToken>(d).map((x) => (x.id === t.id ? { ...x, revokedAt: x.revokedAt ?? new Date().toISOString(), usable: false } : x)))
    show('초대 코드를 폐기했어요.')
    reload()
  }

  const newButton = <Button onClick={() => setSelectedId('new')}>+ 새 초대 코드</Button>

  return (
    <div className={panelPad(panelOpen)}>
      <PageHeader
        path="invites"
        title="초대 코드"
        description={<>코드로 가입하면 승인 없이 바로 회원이 돼요. 사용 가능 <span className="font-mono text-white">{liveCount}</span>개</>}
        actions={newButton}
      />

      {error && !data ? (
        <ErrorState command="fetch invites" error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingState command="fetch invites" />
      ) : invites.length === 0 ? (
        <EmptyState command="ls invites/" text="만든 초대 코드가 없어요" action={newButton} />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={reload} className="cursor-pointer underline">다시 시도</button></p>}
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table label="초대 코드 목록">
              <thead>
                <tr>
                  <Th>Label</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden md:table-cell'}>Code</Th>
                  <Th className="hidden sm:table-cell">Uses</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden lg:table-cell'}>Expires</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {invites.map((t) => {
                  const st = STATUS[statusOf(t)]
                  return (
                    <SelectableRow
                      key={t.id}
                      selected={t.id === selectedId}
                      onSelect={() => setSelectedId(t.id)}
                      dim={statusOf(t) !== 'live'}
                      label={`${t.memo || t.code} 초대 코드 열기`}
                    >
                      <Td className="max-w-[260px]">
                        <span className={`block truncate ${t.memo ? 'font-semibold text-white' : 'text-fg-faint'}`}>{t.memo || '메모 없음'}</span>
                        {/* 좁은 화면에선 코드 · 사용 횟수를 아래에 */}
                        <span className="mt-1 block truncate font-mono text-[11px] text-fg-faint md:hidden">
                          {t.code} · {t.usedCount}회
                        </span>
                      </Td>
                      <Td className={`max-w-[160px] font-mono text-fg-subtle ${panelOpen ? 'hidden' : 'hidden md:table-cell'}`}>
                        <span className="block truncate">{t.code}</span>
                      </Td>
                      <Td className="hidden whitespace-nowrap font-mono sm:table-cell">{t.usedCount}<span className="text-fg-faint">회</span></Td>
                      <Td className={`whitespace-nowrap font-mono text-fg-faint ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>{formatDate(t.expiresAt)}</Td>
                      <Td><StatusLabel tone={st.tone}>{st.label}</StatusLabel></Td>
                    </SelectableRow>
                  )
                })}
              </tbody>
            </Table>
          </div>
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">↑↓ 이동 · enter 열기 · esc 닫기</p>
        </>
      )}

      {creating && <CreatePanel onClose={() => setSelectedId(null)} onCreated={onCreated} />}
      {selected && (
        <InvitePanel
          key={selected.id}
          invite={selected}
          onClose={() => setSelectedId(null)}
          onRevoked={onRevoked}
          onToast={show}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

function InvitePanel({
  invite, onClose, onRevoked, onToast,
}: {
  invite: InviteToken
  onClose: () => void
  onRevoked: (t: InviteToken) => void
  onToast: (text: string, tone?: Tone) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeError, setRevokeError] = useState('')

  const status = statusOf(invite)
  const st = STATUS[status]
  const link = inviteLink(invite.code)
  const usable = status === 'live'

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      onToast('초대 링크를 복사했어요.')
    } catch {
      onToast('복사하지 못했어요. 링크를 직접 선택해 복사해주세요.', 'danger')
    }
  }

  async function revoke() {
    setRevoking(true)
    setRevokeError('')
    const r = await adminFetch(`/v1/admin/invites/${invite.id}`, { method: 'DELETE' })
    setRevoking(false)
    if (!r.ok) { setRevokeError(r.error); return }
    setConfirmOpen(false)
    onRevoked(invite)
  }

  return (
    <>
      <DetailPanel
        open
        onClose={onClose}
        path={`invites/${invite.id}`}
        label={`${invite.memo || '초대 코드'} 상세`}
        busy={revoking}
        footer={
          <>
            <Button
              variant="dangerGhost"
              disabled={!usable}
              title={!usable ? '이미 쓸 수 없는 코드예요' : undefined}
              onClick={() => { setRevokeError(''); setConfirmOpen(true) }}
            >
              폐기…
            </Button>
            <Button disabled={!usable} onClick={copy}>링크 복사</Button>
          </>
        }
      >
        <h2 className="break-words text-2xl font-bold text-white">{invite.memo || '메모 없음'}</h2>
        <p className="mb-5 mt-1.5"><StatusLabel tone={st.tone}>{st.label}</StatusLabel></p>

        <p className="mb-2 text-xs text-fg-subtle">초대 링크</p>
        <p className={`mb-1.5 select-all break-all rounded-lg border border-line bg-surface-raised px-3 py-2.5 font-mono text-xs ${usable ? 'text-white' : 'text-fg-faint line-through'}`}>
          {link}
        </p>
        <p className="mb-5 text-xs text-fg-faint">
          {usable ? '이 링크로 가입하면 승인 없이 바로 회원이 돼요. 만료일까지 횟수 제한 없이 쓸 수 있어요.' : '이 코드로는 더 이상 가입할 수 없어요.'}
        </p>

        <InfoGrid
          rows={[
            ['code', invite.code],
            ['uses', `${invite.usedCount}회`],
            ['expires', formatDateTime(invite.expiresAt)],
            ['created', formatDateTime(invite.createdAt)],
            ...(invite.revokedAt ? [['revoked', formatDateTime(invite.revokedAt)] as [string, string]] : []),
            ['by', `#${invite.createdByUserId}`],
          ]}
        />
      </DetailPanel>

      <ConfirmDialog
        open={confirmOpen}
        title="초대 코드 폐기"
        confirmLabel="폐기"
        busy={revoking}
        error={revokeError}
        onConfirm={revoke}
        onClose={() => setConfirmOpen(false)}
      >
        <b className="text-white">{invite.memo || invite.code}</b> 코드를 폐기하면 이 링크로는 바로 가입할 수 없게 돼요.
        이미 이 코드로 가입한 부원에게는 영향이 없어요. 되돌릴 수 없어요.
      </ConfirmDialog>
    </>
  )
}

function CreatePanel({ onClose, onCreated }: { onClose: () => void; onCreated: (t: InviteToken) => void }) {
  const [memo, setMemo] = useState('')
  const [expiresOn, setExpiresOn] = useState(() => localYmd(14))
  const [errors, setErrors] = useState<{ memo?: string; expiresOn?: string }>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)

  const today = localYmd()

  function validate() {
    const e: typeof errors = {}
    if (!expiresOn) e.expiresOn = '만료일을 골라주세요.'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) e.expiresOn = '날짜 형식이 올바르지 않아요.'
    else if (expiresOn < today) e.expiresOn = '만료일은 오늘 이후여야 해요.'
    if (memo.trim().length > MEMO_MAX) e.memo = `메모는 ${MEMO_MAX}자까지 쓸 수 있어요.`
    return e
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    setNotice(null)
    if (Object.keys(e).length) return
    setSaving(true)
    const r = await adminFetch<InviteToken>('/v1/admin/invites', {
      method: 'POST',
      json: { expiresOn, memo: memo.trim() || null },
    })
    setSaving(false)
    if (!r.ok) { setNotice({ tone: 'danger', text: `만들지 못했어요: ${r.error}` }); return }
    onCreated(r.data)
  }

  return (
    <DetailPanel
      open
      onClose={onClose}
      path="invites/new"
      label="새 초대 코드"
      busy={saving}
      notice={notice}
      footer={
        <>
          <Button variant="ghost" disabled={saving} onClick={onClose}>취소</Button>
          <Button type="submit" form="invite-create" loading={saving}>만들기</Button>
        </>
      }
    >
      <h2 className="mb-5 text-2xl font-bold text-white">새 초대 코드</h2>
      <form id="invite-create" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="메모" optional hint="어디에 쓰는 코드인지 적어두면 나중에 찾기 쉬워요." error={errors.memo}>
          {(a11y) => (
            <TextInput
              {...a11y}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 10기 신입 OT"
              maxLength={MEMO_MAX}
              disabled={saving}
            />
          )}
        </Field>
        <Field label="만료일" hint="이 날 23:59 까지 쓸 수 있어요. 기간 안에는 횟수 제한이 없어요." error={errors.expiresOn}>
          {(a11y) => (
            <TextInput
              {...a11y}
              type="date"
              required
              value={expiresOn}
              min={today}
              onChange={(e) => setExpiresOn(e.target.value)}
              disabled={saving}
              className="font-mono"
            />
          )}
        </Field>
      </form>
    </DetailPanel>
  )
}
