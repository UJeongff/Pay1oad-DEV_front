'use client'

import { useState } from 'react'
import {
  adminFetch, asList, Button, Choice, ConfirmDialog, DetailPanel, EmptyState, ErrorState, Field,
  formatDateTime, InfoGrid, LoadingState, PageHeader, panelPad, SelectableRow, StatusLabel, Table, Td, TextInput,
  Th, toDatetimeLocal, Toast, useAdminQuery, useToast, type Tone,
} from '../_components/AdminUI'

type RecruitStatus = 'UPCOMING' | 'RECRUITING' | 'CLOSED'

interface Recruitment {
  id: number
  title: string
  applyUrl: string
  startAt: string
  endAt: string
  isActive: boolean
  status?: RecruitStatus | null
  generation?: number | null
  createdAt: string
}

const STATUS: Record<RecruitStatus, { label: string; tone: Tone }> = {
  UPCOMING: { label: '모집 예정', tone: 'soon' },
  RECRUITING: { label: '모집 중', tone: 'live' },
  CLOSED: { label: '마감', tone: 'off' },
}
const STATUS_KEYS: RecruitStatus[] = ['UPCOMING', 'RECRUITING', 'CLOSED']

/** 서버 UrlSafetyValidator 의 모집 공고 허용 도메인 (하위 도메인 포함) */
const ALLOWED_HOSTS = ['docs.google.com', 'forms.gle', 'form.naver.com', 'naver.me']

/** 예전 데이터처럼 status 가 없으면 isActive 로 정한다 */
function statusOf(r: Recruitment): RecruitStatus {
  return r.status ?? (r.isActive ? 'RECRUITING' : 'CLOSED')
}

/** 지금 시각 (yyyy-MM-ddTHH:mm, 브라우저 시간 = KST 가정) */
function nowLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 기간으로 본 상태 — 날짜를 바꾸면 상태를 이 값으로 맞춰 준다 (직접 바꾸는 건 자유) */
function deriveStatus(startAt: string, endAt: string): RecruitStatus | null {
  if (!startAt || !endAt) return null
  const now = nowLocal()
  if (now < startAt) return 'UPCOMING'
  if (now > endAt) return 'CLOSED'
  return 'RECRUITING'
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase() } catch { return null }
}

function hostAllowed(host: string): boolean {
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))
}

type Form = { title: string; generation: string; applyUrl: string; startAt: string; endAt: string; status: RecruitStatus }

const EMPTY_FORM: Form = { title: '', generation: '', applyUrl: '', startAt: '', endAt: '', status: 'UPCOMING' }

function toForm(r: Recruitment): Form {
  return {
    title: r.title ?? '',
    generation: r.generation != null ? String(r.generation) : '',
    applyUrl: r.applyUrl ?? '',
    startAt: toDatetimeLocal(r.startAt),
    endAt: toDatetimeLocal(r.endAt),
    status: statusOf(r),
  }
}

/** 저장을 막는 이유 — 서버가 400 을 돌려주기 전에 보여준다 */
function formProblem(f: Form): string | null {
  if (!f.title.trim()) return '제목을 입력해주세요.'
  if (f.generation.trim()) {
    const g = Number(f.generation)
    if (!Number.isInteger(g) || g < 1 || g > 100) return '기수는 1~100 사이 정수여야 해요.'
  }
  if (!f.applyUrl.trim()) return '지원서 링크를 입력해주세요.'
  if (!/^https:\/\/.+/.test(f.applyUrl.trim()) || !hostOf(f.applyUrl.trim())) return '지원서 링크는 https:// 로 시작해야 해요.'
  if (!f.startAt || !f.endAt) return '모집 시작과 마감 시각을 모두 입력해주세요.'
  if (f.endAt <= f.startAt) return '마감 시각은 시작 시각 이후여야 해요.'
  return null
}

/** datetime-local 값에 초를 붙여 LocalDateTime 으로 보낸다 */
function toServerDateTime(v: string): string {
  return v.length === 16 ? `${v}:00` : v
}

export default function AdminRecruitmentPage() {
  const { toast, show } = useToast()
  const { data, error, loading, reload, mutate } = useAdminQuery<unknown>('/v1/admin/recruitment')
  const items = asList<Recruitment>(data)
    .slice()
    .sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''))

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const selected = items.find((r) => r.id === selectedId) ?? null
  const panelOpen = creating || !!selected

  const recruitingCount = items.filter((r) => statusOf(r) === 'RECRUITING').length

  return (
    <div className={panelPad(panelOpen)}>
      <PageHeader
        path="recruitment"
        title="모집 공고"
        description={
          data
            ? <>신규 부원 모집 기간과 지원서 링크 · 모집 중 <span className="font-mono text-white">{recruitingCount}</span>건</>
            : '신규 부원 모집 기간과 지원서 링크를 관리합니다.'
        }
        actions={<Button onClick={() => { setSelectedId(null); setCreating(true) }}>+ 모집 공고</Button>}
      />

      {error && !data ? (
        <ErrorState command="fetch recruitment" error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingState command="fetch recruitment" />
      ) : items.length === 0 ? (
        <EmptyState command="ls recruitment/" text="등록된 모집 공고가 없어요" />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={reload} className="cursor-pointer underline">다시 시도</button></p>}
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table label="모집 공고 목록">
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th className="hidden sm:table-cell">Gen</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden lg:table-cell'}>Period</Th>
                  <Th className="hidden sm:table-cell">Status</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const st = STATUS[statusOf(r)]
                  return (
                    <SelectableRow key={r.id} selected={r.id === selectedId} onSelect={() => { setCreating(false); setSelectedId(r.id) }} label={`${r.title} 모집 공고 열기`}>
                      <Td className="font-semibold text-white">
                        <span className="break-all">{r.title}</span>
                        {/* 좁은 화면(또는 패널이 열렸을 때)엔 상태 · 기간을 제목 아래에 */}
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-normal sm:hidden">
                          <StatusLabel tone={st.tone}>{st.label}</StatusLabel>
                          {r.generation != null && <span className="font-mono text-[11px] text-fg-faint">{r.generation}기</span>}
                        </span>
                        <span className={`mt-1 block font-mono text-[11px] font-normal text-fg-faint ${panelOpen ? '' : 'lg:hidden'}`}>
                          {formatDateTime(r.startAt)} ~ {formatDateTime(r.endAt)}
                        </span>
                      </Td>
                      <Td className="hidden whitespace-nowrap font-mono text-fg-subtle sm:table-cell">{r.generation != null ? `${r.generation}기` : '—'}</Td>
                      <Td className={`whitespace-nowrap font-mono text-fg-subtle ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>
                        {formatDateTime(r.startAt)} ~ {formatDateTime(r.endAt)}
                      </Td>
                      <Td className="hidden sm:table-cell"><StatusLabel tone={st.tone}>{st.label}</StatusLabel></Td>
                    </SelectableRow>
                  )
                })}
              </tbody>
            </Table>
          </div>
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">↑↓ 이동 · enter 열기 · esc 닫기</p>
        </>
      )}

      {(creating || selected) && (
        <RecruitPanel
          key={selected ? selected.id : 'new'}
          item={creating ? null : selected}
          onClose={() => { setCreating(false); setSelectedId(null) }}
          onSaved={(next, isNew) => {
            if (isNew) {
              setCreating(false)
              setSelectedId(next.id)
              mutate((d) => [...asList<Recruitment>(d), next])
              show('모집 공고를 등록했어요.')
            } else {
              mutate((d) => asList<Recruitment>(d).map((r) => (r.id === next.id ? next : r)))
              show('모집 공고를 저장했어요.')
            }
          }}
          onDeleted={(r) => {
            setSelectedId(null)
            show(`${r.title} 공고를 삭제했어요.`)
            reload()
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

function RecruitPanel({
  item, onClose, onSaved, onDeleted,
}: {
  /** null 이면 새 공고 */
  item: Recruitment | null
  onClose: () => void
  onSaved: (r: Recruitment, isNew: boolean) => void
  onDeleted: (r: Recruitment) => void
}) {
  const initial = item ? toForm(item) : EMPTY_FORM
  const [form, setForm] = useState<Form>(initial)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const dirty = (Object.keys(initial) as (keyof Form)[]).some((k) => form[k] !== initial[k])
  const problem = formProblem(form)
  const url = form.applyUrl.trim()
  const host = url ? hostOf(url) : null
  const hostWarn = host && /^https:\/\//.test(url) && !hostAllowed(host)
  const datesBad = !!form.startAt && !!form.endAt && form.endAt <= form.startAt
  const derived = deriveStatus(form.startAt, form.endAt)
  const mismatch = derived !== null && derived !== form.status

  // 날짜를 바꾸면 상태를 기간에 맞춰 준다. 이후 직접 고른 상태는 그대로 둔다(조기 마감 등).
  function setDates(next: Partial<Pick<Form, 'startAt' | 'endAt'>>) {
    setForm((f) => {
      const merged = { ...f, ...next }
      const d = deriveStatus(merged.startAt, merged.endAt)
      return d ? { ...merged, status: d } : merged
    })
  }

  async function save() {
    if (problem) return
    setSaving(true)
    setNotice(null)
    const g = form.generation.trim()
    const json = {
      title: form.title.trim(),
      applyUrl: url,
      startAt: toServerDateTime(form.startAt),
      endAt: toServerDateTime(form.endAt),
      status: form.status,
      isActive: form.status === 'RECRUITING',
      // 비우면 null 을 보내 기수를 지운다
      generation: g ? Number(g) : null,
    }
    const r = item
      ? await adminFetch<Recruitment>(`/v1/admin/recruitment/${item.id}`, { method: 'PATCH', json })
      : await adminFetch<Recruitment>('/v1/admin/recruitment', { method: 'POST', json })
    setSaving(false)
    if (!r.ok) { setNotice({ tone: 'danger', text: `${item ? '저장' : '등록'}하지 못했어요: ${r.error}` }); return }
    onSaved(r.data, !item)
    if (item) setNotice({ tone: 'live', text: '저장했어요.' })
  }

  async function remove() {
    if (!item) return
    setDeleting(true)
    setDeleteError('')
    const r = await adminFetch(`/v1/admin/recruitment/${item.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!r.ok) { setDeleteError(r.error); return }
    setConfirmOpen(false)
    onDeleted(item)
  }

  const st = item ? STATUS[statusOf(item)] : null

  return (
    <>
      <DetailPanel
        open
        onClose={onClose}
        path={item ? `recruitment/${item.id}` : 'recruitment/new'}
        label={item ? `${item.title} 모집 공고 상세` : '새 모집 공고'}
        busy={saving || deleting}
        notice={notice}
        footer={
          <>
            {item ? (
              <Button variant="dangerText" disabled={saving} onClick={() => { setDeleteError(''); setConfirmOpen(true) }}>공고 삭제…</Button>
            ) : (
              <span className="min-w-0 truncate text-xs text-fg-faint">{problem ?? ''}</span>
            )}
            <div className="flex gap-2">
              {item ? (
                <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setForm(initial); setNotice(null) }}>되돌리기</Button>
              ) : (
                <Button variant="ghost" disabled={saving} onClick={onClose}>취소</Button>
              )}
              <Button disabled={(item ? !dirty : false) || !!problem} loading={saving} onClick={save}>{item ? '저장' : '등록'}</Button>
            </div>
          </>
        }
      >
        {item && st ? (
          <>
            <h2 className="break-all text-2xl font-bold text-white">{item.title}</h2>
            <p className="mb-5 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-fg-faint">
              <StatusLabel tone={st.tone}>{st.label}</StatusLabel>
              {item.generation != null && <span>{item.generation}기</span>}
              <span>{formatDateTime(item.createdAt)} 등록</span>
            </p>
            <InfoGrid rows={[
              ['period', `${formatDateTime(item.startAt)} ~ ${formatDateTime(item.endAt)}`],
              ['url', <a key="url" href={item.applyUrl} target="_blank" rel="noopener noreferrer" className="text-brand-soft underline-offset-2 hover:underline">{item.applyUrl}</a>],
              ['id', String(item.id)],
            ]} />
          </>
        ) : (
          <h2 className="mb-5 text-2xl font-bold text-white">새 모집 공고</h2>
        )}

        <div className="flex flex-col gap-4">
          <Field label="제목">
            {(a) => (
              <TextInput {...a} value={form.title} disabled={saving} placeholder="예) 2026년 2학기 신입 부원 모집" onChange={(e) => setForm({ ...form, title: e.target.value })} />
            )}
          </Field>

          <Field
            label="기수"
            optional
            hint="비워 두면 기수 표시 없이 저장돼요."
            error={form.generation.trim() && problem?.startsWith('기수') ? problem : undefined}
          >
            {(a) => (
              <TextInput {...a} type="number" inputMode="numeric" min={1} max={100} value={form.generation} disabled={saving} placeholder="예) 12" onChange={(e) => setForm({ ...form, generation: e.target.value })} className="font-mono" />
            )}
          </Field>

          <Field
            label="지원서 링크"
            hint={<>https 만, 허용 도메인: <span className="font-mono">{ALLOWED_HOSTS.join(' · ')}</span> (하위 도메인 포함)</>}
            error={url && problem?.startsWith('지원서 링크') ? problem : undefined}
          >
            {(a) => (
              <TextInput {...a} type="url" value={form.applyUrl} disabled={saving} placeholder="https://forms.gle/..." onChange={(e) => setForm({ ...form, applyUrl: e.target.value })} className="font-mono text-[13px]" />
            )}
          </Field>
          {hostWarn && (
            <p className="-mt-2 text-xs text-status-soon-text">
              <span className="font-mono">{host}</span> 은(는) 허용 도메인이 아니라 서버에서 거절될 수 있어요.
            </p>
          )}

          <div className="grid gap-3">
            <Field label="모집 시작">
              {(a) => (
                <TextInput {...a} type="datetime-local" value={form.startAt} disabled={saving} onChange={(e) => setDates({ startAt: e.target.value })} className="font-mono text-[13px]" />
              )}
            </Field>
            <Field label="모집 마감" error={datesBad ? '시작 시각 이후여야 해요.' : undefined}>
              {(a) => (
                <TextInput {...a} type="datetime-local" value={form.endAt} min={form.startAt || undefined} disabled={saving} onChange={(e) => setDates({ endAt: e.target.value })} className="font-mono text-[13px]" />
              )}
            </Field>
          </div>

          <div>
            <p className="mb-2 text-xs text-fg-subtle">모집 상태</p>
            <Choice
              label="모집 상태"
              value={form.status}
              onChange={(k) => setForm({ ...form, status: k })}
              disabled={saving}
              options={STATUS_KEYS.map((k) => ({ key: k, label: STATUS[k].label, tone: STATUS[k].tone }))}
            />
            {mismatch && derived && (
              <p className="mt-2 text-xs text-status-soon-text">
                입력한 기간으로는 &lsquo;{STATUS[derived].label}&rsquo;이에요. 다른 상태로 두면 홈·어바웃의 지원 버튼 노출과 어긋날 수 있어요.
              </p>
            )}
            <p className="mt-2 text-xs text-fg-faint">
              날짜를 바꾸면 상태가 기간에 맞춰 바뀌어요. 홈·어바웃의 지원 버튼은 &lsquo;모집 중&rsquo;이면서 지금이 모집 기간 안일 때만 보여요.
            </p>
          </div>
        </div>

        {item && dirty && problem && <p className="mt-4 text-xs text-status-soon-text">{problem}</p>}
      </DetailPanel>

      {item && (
        <ConfirmDialog
          open={confirmOpen}
          title="모집 공고 삭제"
          confirmLabel="삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={remove}
          onClose={() => setConfirmOpen(false)}
        >
          <b className="text-white">{item.title}</b> 공고가 삭제됩니다. 홈·어바웃의 지원 버튼에서도 사라지고, 되돌릴 수 없어요.
        </ConfirmDialog>
      )}
    </>
  )
}
