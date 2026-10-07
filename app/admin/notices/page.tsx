'use client'

import { useState } from 'react'
import {
  adminFetch, asList, Button, Choice, ConfirmDialog, DetailPanel, EmptyState, ErrorState, Field, FilterTabs,
  formatDate, formatDateTime, InfoGrid, LoadingState, PageHeader, panelPad, SelectableRow, SelectInput, StatusLabel,
  Table, Td, TextArea, TextInput, Th, Toast, useAdminQuery, useToast, type Tone,
} from '../_components/AdminUI'

interface ContentSummary {
  id: number
  title: string
  type: 'STUDY' | 'PROJECT' | string
}

interface ContentNotice {
  id: number
  title: string
  content: string
  /** LocalDate (yyyy-MM-dd) */
  startAt: string
  endAt: string
  createdAt: string
}

type Target = 'CONTENT' | 'ALL'

/** 전체 부원 공지는 알림 한 건으로 가므로 서버(BroadcastNoticeRequest)와 같은 길이 제한 */
const BROADCAST_TITLE_MAX = 100
const BROADCAST_CONTENT_MAX = 380

const TYPE_LABEL: Record<string, string> = { STUDY: '스터디', PROJECT: '프로젝트' }

/** 오늘 날짜 (yyyy-MM-dd, 브라우저 시간 기준) — 게시 기간 비교용 */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function periodState(n: ContentNotice): { label: string; tone: Tone } {
  const t = today()
  const start = n.startAt?.slice(0, 10) ?? ''
  const end = n.endAt?.slice(0, 10) ?? ''
  if (start && t < start) return { label: '게시 예정', tone: 'soon' }
  if (end && t > end) return { label: '종료', tone: 'off' }
  return { label: '게시 중', tone: 'live' }
}

/** 팀 공지 입력값 검사 — 서버가 400 을 돌려주기 전에 이유를 보여준다 */
function contentNoticeProblem(f: { title: string; content: string; startAt: string; endAt: string }): string | null {
  if (!f.title.trim()) return '제목을 입력해주세요.'
  if (!f.content.trim()) return '내용을 입력해주세요.'
  if (!f.startAt || !f.endAt) return '게시 시작일과 종료일을 모두 입력해주세요.'
  if (f.endAt < f.startAt) return '종료일은 시작일과 같거나 이후여야 해요.'
  return null
}

export default function AdminNoticesPage() {
  const { toast, show } = useToast()

  const contentsQuery = useAdminQuery<unknown>('/v1/contents')
  const contents = asList<ContentSummary>(contentsQuery.data)

  const [pickedId, setPickedId] = useState<number | null>(null)
  // 고른 콘텐츠가 없으면(처음 · 삭제됨) 첫 콘텐츠를 보여준다
  const contentId = contents.some((c) => c.id === pickedId) ? pickedId : (contents[0]?.id ?? null)
  const current = contents.find((c) => c.id === contentId) ?? null

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  // 새 공지를 등록하면 목록을 처음부터 다시 불러오도록 key 를 바꾼다
  const [version, setVersion] = useState(0)

  const panelOpen = creating || selectedId !== null

  function pickContent(id: number) {
    setPickedId(id)
    setSelectedId(null)
  }

  function openCreate() {
    setSelectedId(null)
    setCreating(true)
  }

  return (
    <div className={panelPad(panelOpen)}>
      <PageHeader
        path="notices"
        title="공지 관리"
        description="스터디·프로젝트 팀원 공지를 관리하고, 전체 부원에게 알림 공지를 보냅니다."
        actions={<Button onClick={openCreate}>+ 공지 작성</Button>}
      />

      {contentsQuery.error && !contentsQuery.data ? (
        <ErrorState command="fetch contents" error={contentsQuery.error} onRetry={contentsQuery.reload} />
      ) : contentsQuery.loading && !contentsQuery.data ? (
        <LoadingState command="fetch contents" rows={2} />
      ) : contents.length === 0 ? (
        <EmptyState
          command="ls contents/"
          text="스터디·프로젝트가 없어요. 전체 부원 공지는 위의 '+ 공지 작성'에서 보낼 수 있어요"
        />
      ) : (
        <>
          {contentsQuery.error && (
            <p role="alert" className="mb-3 text-xs text-danger">
              콘텐츠 목록을 새로 불러오지 못했어요: {contentsQuery.error}{' '}
              <button type="button" onClick={contentsQuery.reload} className="cursor-pointer underline">다시 시도</button>
            </p>
          )}
          <FilterTabs
            label="스터디·프로젝트 선택"
            items={contents.map((c) => ({ key: String(c.id), label: c.title }))}
            value={String(contentId ?? '')}
            onChange={(k) => pickContent(Number(k))}
          />
          {current && (
            // 콘텐츠가 바뀌면 목록 상태를 통째로 새로 시작한다 — 이전 콘텐츠의 목록이나 오류가 남지 않는다
            <NoticeList
              key={`${current.id}:${version}`}
              content={current}
              selectedId={selectedId}
              onSelect={(id) => { setCreating(false); setSelectedId(id) }}
              onClose={() => setSelectedId(null)}
              show={show}
            />
          )}
        </>
      )}

      {creating && (
        <CreatePanel
          contents={contents}
          defaultContentId={contentId}
          onClose={() => setCreating(false)}
          onCreated={(cid, notice) => {
            setCreating(false)
            setPickedId(cid)
            setVersion((v) => v + 1)
            setSelectedId(notice.id)
            show('공지를 등록했어요. 팀원에게 알림이 갔어요.')
          }}
          onBroadcast={(count) => {
            setCreating(false)
            show(`${count}명에게 보냈어요.`)
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 콘텐츠 한 개의 공지 목록 + 수정 패널
// ─────────────────────────────────────────────────────────────

function NoticeList({
  content, selectedId, onSelect, onClose, show,
}: {
  content: ContentSummary
  selectedId: number | null
  onSelect: (id: number) => void
  onClose: () => void
  show: (text: string, tone?: Tone) => void
}) {
  const { data, error, loading, reload, mutate } = useAdminQuery<unknown>(`/v1/contents/${content.id}/notices/all`)
  const notices = asList<ContentNotice>(data)
  const selected = notices.find((n) => n.id === selectedId) ?? null
  const panelOpen = !!selected
  const command = `fetch contents/${content.id}/notices`

  return (
    <>
      {error && !data ? (
        <ErrorState command={command} error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingState command={command} />
      ) : notices.length === 0 ? (
        <EmptyState command={`ls contents/${content.id}/notices/`} text={`${content.title}에 등록된 공지가 없어요`} />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={reload} className="cursor-pointer underline">다시 시도</button></p>}
          <p className="mb-2 text-xs text-fg-subtle">
            <span className="text-white">{content.title}</span>
            {TYPE_LABEL[content.type] ? ` · ${TYPE_LABEL[content.type]}` : ''} 공지 <span className="font-mono text-white">{notices.length}</span>개
          </p>
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table label={`${content.title} 공지 목록`}>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th className="hidden sm:table-cell">Period</Th>
                  <Th>State</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden lg:table-cell'}>Created</Th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n) => {
                  const st = periodState(n)
                  return (
                    <SelectableRow key={n.id} selected={n.id === selectedId} onSelect={() => onSelect(n.id)} label={`${n.title} 공지 열기`}>
                      <Td className="font-semibold text-white">
                        <span className="line-clamp-2 break-all">{n.title}</span>
                        <span className="mt-1 block font-mono text-[11px] font-normal text-fg-faint sm:hidden">
                          {formatDate(n.startAt)} ~ {formatDate(n.endAt)}
                        </span>
                      </Td>
                      <Td className="hidden whitespace-nowrap font-mono text-fg-subtle sm:table-cell">{formatDate(n.startAt)} ~ {formatDate(n.endAt)}</Td>
                      <Td><StatusLabel tone={st.tone}>{st.label}</StatusLabel></Td>
                      <Td className={`whitespace-nowrap font-mono text-fg-faint ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>{formatDate(n.createdAt)}</Td>
                    </SelectableRow>
                  )
                })}
              </tbody>
            </Table>
          </div>
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">↑↓ 이동 · enter 열기 · esc 닫기</p>
        </>
      )}

      {selected && (
        <EditPanel
          key={selected.id}
          content={content}
          notice={selected}
          onClose={onClose}
          onSaved={(next) => {
            mutate((d) => asList<ContentNotice>(d).map((n) => (n.id === next.id ? next : n)))
            show('공지를 저장했어요.')
          }}
          onDeleted={() => {
            onClose()
            show('공지를 삭제했어요.')
            reload()
          }}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// 입력칸 묶음
// ─────────────────────────────────────────────────────────────

type NoticeForm = { title: string; content: string; startAt: string; endAt: string }

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max
  return <span className={`font-mono ${over ? 'text-danger' : 'text-fg-faint'}`}>{value.length}/{max}</span>
}

function NoticeFields({
  form, onChange, disabled, withDates, limits,
}: {
  form: NoticeForm
  onChange: (f: NoticeForm) => void
  disabled: boolean
  withDates: boolean
  /** 전체 부원 공지일 때만 길이 제한과 글자 수 표시 */
  limits?: { title: number; content: number }
}) {
  const datesBad = withDates && !!form.startAt && !!form.endAt && form.endAt < form.startAt
  return (
    <div className="flex flex-col gap-4">
      <Field
        label="제목"
        hint={limits ? <Counter value={form.title} max={limits.title} /> : undefined}
        error={limits && form.title.length > limits.title ? `제목은 ${limits.title}자 이하여야 해요.` : undefined}
      >
        {(a) => (
          <TextInput {...a} value={form.title} disabled={disabled} placeholder="공지 제목" onChange={(e) => onChange({ ...form, title: e.target.value })} />
        )}
      </Field>
      <Field
        label="내용"
        hint={limits ? <Counter value={form.content} max={limits.content} /> : undefined}
        error={limits && form.content.length > limits.content ? `내용은 ${limits.content}자 이하여야 해요.` : undefined}
      >
        {(a) => (
          <TextArea {...a} rows={7} value={form.content} disabled={disabled} placeholder="공지 내용을 입력하세요" onChange={(e) => onChange({ ...form, content: e.target.value })} />
        )}
      </Field>
      {withDates && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="게시 시작일">
            {(a) => (
              <TextInput {...a} type="date" value={form.startAt} disabled={disabled} onChange={(e) => onChange({ ...form, startAt: e.target.value })} className="font-mono" />
            )}
          </Field>
          <Field label="게시 종료일" error={datesBad ? '시작일보다 앞설 수 없어요.' : undefined}>
            {(a) => (
              <TextInput {...a} type="date" value={form.endAt} min={form.startAt || undefined} disabled={disabled} onChange={(e) => onChange({ ...form, endAt: e.target.value })} className="font-mono" />
            )}
          </Field>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// 새 공지 — 팀원 공지 또는 전체 부원 알림
// ─────────────────────────────────────────────────────────────

function CreatePanel({
  contents, defaultContentId, onClose, onCreated, onBroadcast,
}: {
  contents: ContentSummary[]
  defaultContentId: number | null
  onClose: () => void
  onCreated: (contentId: number, notice: ContentNotice) => void
  onBroadcast: (recipientCount: number) => void
}) {
  const [target, setTarget] = useState<Target>(contents.length > 0 ? 'CONTENT' : 'ALL')
  const [targetId, setTargetId] = useState<number | null>(defaultContentId)
  const [form, setForm] = useState<NoticeForm>({ title: '', content: '', startAt: today(), endAt: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)

  const problem = target === 'ALL'
    ? !form.title.trim() ? '제목을 입력해주세요.'
      : !form.content.trim() ? '내용을 입력해주세요.'
        : form.title.length > BROADCAST_TITLE_MAX ? `제목은 ${BROADCAST_TITLE_MAX}자 이하여야 해요.`
          : form.content.length > BROADCAST_CONTENT_MAX ? `내용은 ${BROADCAST_CONTENT_MAX}자 이하여야 해요.`
            : null
    : !targetId ? '공지를 올릴 스터디·프로젝트를 골라주세요.' : contentNoticeProblem(form)

  async function submit() {
    if (problem) return
    setSaving(true)
    setNotice(null)
    if (target === 'ALL') {
      const r = await adminFetch<{ recipientCount: number }>('/v1/admin/notices', {
        method: 'POST',
        json: { title: form.title.trim(), content: form.content.trim() },
      })
      setSaving(false)
      if (!r.ok) { setNotice({ tone: 'danger', text: `보내지 못했어요: ${r.error}` }); return }
      onBroadcast(r.data?.recipientCount ?? 0)
      return
    }
    const cid = targetId as number
    const r = await adminFetch<ContentNotice>(`/v1/contents/${cid}/notices`, {
      method: 'POST',
      json: { title: form.title.trim(), content: form.content, startAt: form.startAt, endAt: form.endAt },
    })
    setSaving(false)
    if (!r.ok) { setNotice({ tone: 'danger', text: `등록하지 못했어요: ${r.error}` }); return }
    onCreated(cid, r.data)
  }

  return (
    <DetailPanel
      open
      onClose={onClose}
      path="notices/new"
      label="새 공지 작성"
      busy={saving}
      notice={notice}
      footer={
        <>
          <span className="min-w-0 truncate text-xs text-fg-faint">{problem ?? ''}</span>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={saving} onClick={onClose}>취소</Button>
            <Button disabled={!!problem} loading={saving} onClick={submit}>{target === 'ALL' ? '보내기' : '등록'}</Button>
          </div>
        </>
      }
    >
      <h2 className="mb-5 text-2xl font-bold text-white">새 공지</h2>

      <p className="mb-2 text-xs text-fg-subtle">보낼 대상</p>
      <Choice
        label="보낼 대상"
        value={target}
        onChange={(k) => { setTarget(k); setNotice(null) }}
        disabled={saving}
        options={[
          { key: 'CONTENT', label: '콘텐츠 팀원' },
          { key: 'ALL', label: '전체 부원' },
        ]}
      />

      {target === 'ALL' ? (
        <p className="mb-5 mt-3 rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-[11px] leading-relaxed text-fg-subtle">
          <span className="text-brand-soft">#</span> 승인된 활동 부원 모두에게 알림으로 보내요. 공지 목록에는 남지 않고, 알림 종에는 앞부분만 보여요.
        </p>
      ) : (
        <div className="mb-5 mt-4">
          {contents.length === 0 ? (
            <p className="text-xs text-fg-faint">공지를 올릴 스터디·프로젝트가 없어요.</p>
          ) : (
            <Field label="스터디·프로젝트" hint="등록하면 그 팀원 전체에게 알림이 가요.">
              {(a) => (
                <SelectInput {...a} value={targetId ?? ''} disabled={saving} onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">선택해주세요</option>
                  {contents.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}{TYPE_LABEL[c.type] ? ` (${TYPE_LABEL[c.type]})` : ''}</option>
                  ))}
                </SelectInput>
              )}
            </Field>
          )}
        </div>
      )}

      <NoticeFields
        form={form}
        onChange={setForm}
        disabled={saving}
        withDates={target === 'CONTENT'}
        limits={target === 'ALL' ? { title: BROADCAST_TITLE_MAX, content: BROADCAST_CONTENT_MAX } : undefined}
      />
    </DetailPanel>
  )
}

// ─────────────────────────────────────────────────────────────
// 팀 공지 수정 · 삭제
// ─────────────────────────────────────────────────────────────

function EditPanel({
  content, notice: n, onClose, onSaved, onDeleted,
}: {
  content: ContentSummary
  notice: ContentNotice
  onClose: () => void
  onSaved: (n: ContentNotice) => void
  onDeleted: () => void
}) {
  const initial: NoticeForm = { title: n.title, content: n.content, startAt: n.startAt?.slice(0, 10) ?? '', endAt: n.endAt?.slice(0, 10) ?? '' }
  const [form, setForm] = useState<NoticeForm>(initial)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const dirty = (Object.keys(initial) as (keyof NoticeForm)[]).some((k) => form[k] !== initial[k])
  const problem = contentNoticeProblem(form)

  async function save() {
    if (problem) return
    setSaving(true)
    setNotice(null)
    const r = await adminFetch<ContentNotice>(`/v1/contents/${content.id}/notices/${n.id}`, {
      method: 'PATCH',
      json: { title: form.title.trim(), content: form.content, startAt: form.startAt, endAt: form.endAt },
    })
    setSaving(false)
    if (!r.ok) { setNotice({ tone: 'danger', text: `저장하지 못했어요: ${r.error}` }); return }
    // 표의 줄을 서버 응답으로 바꾸면 initial 도 새 값이 되어 dirty 가 풀린다
    onSaved(r.data?.id ? r.data : { ...n, ...form })
    setNotice({ tone: 'live', text: '저장했어요.' })
  }

  async function remove() {
    setDeleting(true)
    setDeleteError('')
    const r = await adminFetch(`/v1/contents/${content.id}/notices/${n.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!r.ok) { setDeleteError(r.error); return }
    setConfirmOpen(false)
    onDeleted()
  }

  return (
    <>
      <DetailPanel
        open
        onClose={onClose}
        path={`notices/${content.id}/${n.id}`}
        label={`${n.title} 공지 상세`}
        busy={saving || deleting}
        notice={notice}
        footer={
          <>
            <Button variant="dangerText" disabled={saving} onClick={() => { setDeleteError(''); setConfirmOpen(true) }}>공지 삭제…</Button>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setForm(initial); setNotice(null) }}>되돌리기</Button>
              <Button disabled={!dirty || !!problem} loading={saving} onClick={save} title={dirty && problem ? problem : undefined}>저장</Button>
            </div>
          </>
        }
      >
        <h2 className="break-all text-2xl font-bold text-white">{n.title}</h2>
        <p className="mb-5 mt-1 font-mono text-xs text-fg-faint">
          {formatDate(n.startAt)} ~ {formatDate(n.endAt)}
        </p>
        <InfoGrid rows={[
          ['content', content.title],
          ['created', formatDateTime(n.createdAt)],
          ['id', String(n.id)],
        ]} />

        <NoticeFields form={form} onChange={setForm} disabled={saving} withDates />
        {dirty && problem && <p className="mt-3 text-xs text-status-soon-text">{problem}</p>}
      </DetailPanel>

      <ConfirmDialog
        open={confirmOpen}
        title="공지 삭제"
        confirmLabel="삭제"
        busy={deleting}
        error={deleteError}
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      >
        <b className="text-white">{content.title}</b>의 공지 <b className="text-white">{n.title}</b>이(가) 삭제됩니다. 되돌릴 수 없어요.
      </ConfirmDialog>
    </>
  )
}
