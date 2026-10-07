'use client'

import { useEffect, useRef, useState } from 'react'
import {
  adminFetch, asList, Button, ConfirmDialog, DetailPanel, EmptyState, ErrorState, Field, formatDateTime,
  InfoGrid, LoadingState, PageHeader, panelPad, SelectableRow, StatusLabel, Switch, Table, Td, TextArea, TextInput,
  Th, Toast, toDatetimeLocal, useAdminQuery, useToast, type Tone,
} from '../_components/AdminUI'

interface CtfEvent {
  id: number
  name: string
  imageUrl: string | null
  startAt: string
  endAt: string
  ctfdUrl: string
  isPublished: boolean
  isClickable: boolean
  description: string | null
  status?: 'ongoing' | 'upcoming' | 'ended'
  participantCount?: number
}

type Flag = 'isPublished' | 'isClickable'

const PHASE: Record<'upcoming' | 'ongoing' | 'ended', { label: string; tone: Tone }> = {
  upcoming: { label: '예정', tone: 'soon' },
  ongoing: { label: '진행 중', tone: 'live' },
  ended: { label: '종료', tone: 'off' },
}

/** 지금 KST 를 서버와 같은 형식(yyyy-MM-ddTHH:mm)으로 */
function nowKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16)
}

/** 날짜로 직접 계산한다 (응답의 status 는 불러온 시점 기준이라 오래 열어 두면 어긋난다) */
function phaseOf(ev: CtfEvent): keyof typeof PHASE {
  const now = nowKst()
  if (now < toDatetimeLocal(ev.startAt)) return 'upcoming'
  if (now > toDatetimeLocal(ev.endAt)) return 'ended'
  return 'ongoing'
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const IMAGE_MAX = 20 * 1024 * 1024

/** datetime-local 값(yyyy-MM-ddTHH:mm)을 서버 LocalDateTime 으로 */
const toServerDt = (v: string) => (v.length === 16 ? `${v}:00` : v)

export default function AdminCtfPage() {
  const { toast, show } = useToast()
  const { data, error, loading, reload, mutate } = useAdminQuery<CtfEvent[]>('/v1/admin/ctf/events')
  const events = asList<CtfEvent>(data)

  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  // 같은 스위치를 연달아 눌러 같은 값이 두 번 가던 문제: 요청 중인 스위치는 잠근다
  const [pending, setPending] = useState<Record<string, true>>({})
  const pendingRef = useRef(new Set<string>())

  const selected = typeof selectedId === 'number' ? events.find((e) => e.id === selectedId) ?? null : null
  const creating = selectedId === 'new'
  const panelOpen = creating || !!selected

  function patchLocal(id: number, patch: Partial<CtfEvent>) {
    mutate((d) => asList<CtfEvent>(d).map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  async function toggle(ev: CtfEvent, field: Flag, next: boolean) {
    const k = `${ev.id}:${field}`
    if (pendingRef.current.has(k)) return
    pendingRef.current.add(k)
    setPending((p) => ({ ...p, [k]: true }))
    const prev = ev[field]
    patchLocal(ev.id, { [field]: next })
    const r = await adminFetch(`/v1/admin/ctf/events/${ev.id}`, { method: 'PATCH', json: { [field]: next } })
    pendingRef.current.delete(k)
    setPending((p) => { const n = { ...p }; delete n[k]; return n })
    const what = field === 'isPublished' ? '공개' : '바로가기'
    if (!r.ok) {
      patchLocal(ev.id, { [field]: prev })
      show(`${what} 설정을 바꾸지 못했어요: ${r.error}`, 'danger')
      return
    }
    show(`${ev.name} ${what}를 ${next ? '켰어요' : '껐어요'}.`)
  }

  const isPending = (id: number, f: Flag) => !!pending[`${id}:${f}`]

  function onSaved(ev: CtfEvent) {
    mutate((d) => asList<CtfEvent>(d).map((e) => (e.id === ev.id ? { ...e, ...ev } : e)))
    show('저장했어요.')
  }

  function onCreated(ev: CtfEvent) {
    mutate((d) => [ev, ...asList<CtfEvent>(d)].sort((a, b) => toDatetimeLocal(b.startAt).localeCompare(toDatetimeLocal(a.startAt))))
    setSelectedId(null)
    show(`${ev.name} 이벤트를 추가했어요.`)
  }

  function onDeleted(ev: CtfEvent) {
    setSelectedId(null)
    mutate((d) => asList<CtfEvent>(d).filter((e) => e.id !== ev.id))
    show(`${ev.name} 이벤트를 삭제했어요.`)
  }

  return (
    <div className={panelPad(panelOpen)}>
      <PageHeader
        path="ctf"
        title="CTF"
        description={<>대회 이벤트 <span className="font-mono text-white">{events.length}</span>개</>}
        actions={<Button onClick={() => setSelectedId('new')}>+ 이벤트 추가</Button>}
      />

      {error && !data ? (
        <ErrorState command="fetch ctf/events" error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingState command="fetch ctf/events" />
      ) : events.length === 0 ? (
        <EmptyState command="ls ctf/events/" text="등록된 CTF 이벤트가 없어요" action={<Button variant="ghost" onClick={() => setSelectedId('new')}>+ 첫 이벤트 추가</Button>} />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={reload} className="cursor-pointer underline">다시 시도</button></p>}
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table label="CTF 이벤트 목록">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th className={panelOpen ? 'hidden xl:table-cell' : 'hidden md:table-cell'}>Period</Th>
                  <Th className="hidden sm:table-cell">Status</Th>
                  <Th className={panelOpen ? 'hidden' : 'hidden lg:table-cell'}>Participants</Th>
                  <Th>Public</Th>
                  <Th>Link</Th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const ph = PHASE[phaseOf(ev)]
                  return (
                    <SelectableRow key={ev.id} selected={ev.id === selectedId} onSelect={() => setSelectedId(ev.id)} dim={!ev.isPublished} label={`${ev.name} 상세 열기`}>
                      <Td className="font-semibold text-white">
                        <span className="block max-w-[320px] truncate">{ev.name}</span>
                        {/* 좁은 화면에선 상태 · 기간을 이름 아래에 */}
                        <span className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] font-normal text-fg-faint sm:hidden">
                          <StatusLabel tone={ph.tone}><span className="text-[11px]">{ph.label}</span></StatusLabel>
                          <span>{formatDateTime(ev.startAt)}</span>
                        </span>
                        <span className={`mt-1 font-mono text-[11px] font-normal text-fg-faint ${panelOpen ? 'hidden sm:block xl:hidden' : 'hidden sm:block md:hidden'}`}>
                          {formatDateTime(ev.startAt)} → {formatDateTime(ev.endAt)}
                        </span>
                      </Td>
                      <Td className={`whitespace-nowrap font-mono text-xs text-fg-subtle ${panelOpen ? 'hidden xl:table-cell' : 'hidden md:table-cell'}`}>
                        {formatDateTime(ev.startAt)}
                        <span className="block text-fg-faint">→ {formatDateTime(ev.endAt)}</span>
                      </Td>
                      <Td className="hidden sm:table-cell"><StatusLabel tone={ph.tone}>{ph.label}</StatusLabel></Td>
                      <Td className={`font-mono ${panelOpen ? 'hidden' : 'hidden lg:table-cell'} ${ev.participantCount ? 'text-brand-soft' : 'text-fg-faint'}`}>
                        {ev.participantCount ?? '—'}
                      </Td>
                      <Td>
                        <Switch label={`${ev.name} 공개`} checked={ev.isPublished} busy={isPending(ev.id, 'isPublished')} onChange={(v) => toggle(ev, 'isPublished', v)} />
                      </Td>
                      <Td>
                        <Switch label={`${ev.name} 바로가기`} checked={ev.isClickable} busy={isPending(ev.id, 'isClickable')} onChange={(v) => toggle(ev, 'isClickable', v)} />
                      </Td>
                    </SelectableRow>
                  )
                })}
              </tbody>
            </Table>
          </div>
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">↑↓ 이동 · enter 열기 · esc 닫기 · 공개 = 사이트 목록에 노출 · 바로가기 = CTFd 링크 활성</p>
        </>
      )}

      {creating && (
        <CtfPanel key="new" onClose={() => setSelectedId(null)} onCreated={onCreated} onSaved={onSaved} onDeleted={onDeleted} />
      )}
      {selected && (
        <CtfPanel
          key={selected.id}
          event={selected}
          onClose={() => setSelectedId(null)}
          onCreated={onCreated}
          onSaved={onSaved}
          onDeleted={onDeleted}
          flags={{
            toggle: (f, v) => toggle(selected, f, v),
            busy: (f) => isPending(selected.id, f),
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

type Form = { name: string; startAt: string; endAt: string; ctfdUrl: string; description: string }
type Errors = Partial<Record<keyof Form | 'image', string>>

function toForm(ev?: CtfEvent): Form {
  return {
    name: ev?.name ?? '',
    startAt: toDatetimeLocal(ev?.startAt),
    endAt: toDatetimeLocal(ev?.endAt),
    ctfdUrl: ev?.ctfdUrl ?? '',
    description: ev?.description ?? '',
  }
}

function validate(f: Form): Errors {
  const e: Errors = {}
  if (!f.name.trim()) e.name = '대회 이름을 입력해주세요.'
  if (!f.startAt) e.startAt = '시작 일시를 골라주세요.'
  if (!f.endAt) e.endAt = '종료 일시를 골라주세요.'
  else if (f.startAt && f.endAt <= f.startAt) e.endAt = '종료 일시는 시작 일시보다 뒤여야 해요.'
  if (!f.ctfdUrl.trim()) e.ctfdUrl = 'CTFd 주소를 입력해주세요.'
  else if (!/^https:\/\/\S+$/.test(f.ctfdUrl.trim())) e.ctfdUrl = 'https:// 로 시작하는 주소를 입력해주세요.'
  return e
}

function CtfPanel({
  event, onClose, onCreated, onSaved, onDeleted, flags,
}: {
  event?: CtfEvent
  onClose: () => void
  onCreated: (e: CtfEvent) => void
  onSaved: (e: CtfEvent) => void
  onDeleted: (e: CtfEvent) => void
  flags?: { toggle: (f: Flag, v: boolean) => void; busy: (f: Flag) => boolean }
}) {
  const isNew = !event
  const base = toForm(event)
  const [form, setForm] = useState<Form>(base)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // 이미지: 고른 파일은 한 번만 올린다. 저장이 실패해 다시 눌러도 올려 둔 주소를 그대로 쓴다.
  const [file, setFile] = useState<File | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])

  const dirty = (Object.keys(base) as (keyof Form)[]).some((k) => base[k] !== form[k]) || !!file

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function setPreviewUrl(url: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }

  function pickFile(f: File | null) {
    setErrors((e) => ({ ...e, image: undefined }))
    if (!f) return
    if (!IMAGE_TYPES.includes(f.type)) { setErrors((e) => ({ ...e, image: 'png · jpg · gif · webp 이미지만 올릴 수 있어요.' })); return }
    if (f.size > IMAGE_MAX) { setErrors((e) => ({ ...e, image: `20MB 이하만 올릴 수 있어요. (지금 ${(f.size / 1024 / 1024).toFixed(1)}MB)` })); return }
    setFile(f)
    setUploadedUrl(null)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function clearFile() {
    setFile(null)
    setUploadedUrl(null)
    setPreviewUrl(null)
    setErrors((e) => ({ ...e, image: undefined }))
    if (fileInput.current) fileInput.current.value = ''
  }

  async function save() {
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    setNotice(null)

    let imageUrl = uploadedUrl
    if (file && !imageUrl) {
      const fd = new FormData()
      fd.append('file', file)
      const up = await adminFetch<string>('/v1/admin/ctf/events/images', { method: 'POST', body: fd })
      if (!up.ok) {
        setSaving(false)
        setErrors((e) => ({ ...e, image: up.error }))
        setNotice({ tone: 'danger', text: `이미지를 올리지 못했어요: ${up.error}` })
        return
      }
      imageUrl = up.data
      setUploadedUrl(up.data)
    }

    const desc = form.description.trim()
    const common = {
      name: form.name.trim(),
      startAt: toServerDt(form.startAt),
      endAt: toServerDt(form.endAt),
      ctfdUrl: form.ctfdUrl.trim(),
    }
    // 수정: description 은 "" 을 보내야 실제로 지워진다 (null 은 "그대로 둠")
    // 이미지: null 은 "그대로 둠"이므로 새로 올렸을 때만 주소가 바뀐다
    const r = isNew
      ? await adminFetch<CtfEvent>('/v1/admin/ctf/events', { method: 'POST', json: { ...common, imageUrl, description: desc || null } })
      : await adminFetch<CtfEvent>(`/v1/admin/ctf/events/${event.id}`, { method: 'PATCH', json: { ...common, imageUrl, description: desc } })
    setSaving(false)
    if (!r.ok) { setNotice({ tone: 'danger', text: `저장하지 못했어요: ${r.error}` }); return }
    if (isNew) { onCreated(r.data); return }
    onSaved(r.data)
    setForm(toForm(r.data))
    clearFile()
    setNotice({ tone: 'live', text: '저장했어요.' })
  }

  async function remove() {
    if (!event) return
    setDeleting(true)
    setDeleteError('')
    const r = await adminFetch(`/v1/admin/ctf/events/${event.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!r.ok) { setDeleteError(r.error); return }
    setConfirmOpen(false)
    onDeleted(event)
  }

  const shownImage = preview ?? event?.imageUrl ?? null
  const ph = event ? PHASE[phaseOf(event)] : null

  return (
    <>
      <DetailPanel
        open
        onClose={onClose}
        path={isNew ? 'ctf/new' : `ctf/${event.id}`}
        label={isNew ? 'CTF 이벤트 추가' : `${event.name} 수정`}
        busy={saving || deleting}
        notice={notice}
        footer={
          <>
            {isNew ? <span /> : (
              <Button variant="dangerText" disabled={saving} onClick={() => { setDeleteError(''); setConfirmOpen(true) }}>이벤트 삭제…</Button>
            )}
            <div className="flex gap-2">
              {isNew ? (
                <Button variant="ghost" disabled={saving} onClick={onClose}>취소</Button>
              ) : (
                <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setForm(base); clearFile(); setErrors({}); setNotice(null) }}>되돌리기</Button>
              )}
              <Button disabled={!isNew && !dirty} loading={saving} onClick={save}>{isNew ? '추가' : '저장'}</Button>
            </div>
          </>
        }
      >
        {isNew ? (
          <>
            <h2 className="text-2xl font-bold text-white">새 이벤트</h2>
            <p className="mb-5 mt-1 text-xs text-fg-faint">추가하면 바로 공개돼요. 목록에서 공개를 끌 수 있어요.</p>
          </>
        ) : (
          <>
            <h2 className="break-keep text-2xl font-bold text-white">{event.name}</h2>
            <p className="mb-5 mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs text-fg-faint">
              {ph && <StatusLabel tone={ph.tone}><span className="text-xs">{ph.label}</span></StatusLabel>}
              <span>참여 {event.participantCount ?? 0}명</span>
            </p>
            <InfoGrid rows={[['period', `${formatDateTime(event.startAt)} → ${formatDateTime(event.endAt)}`], ['id', String(event.id)]]} />
            {flags && (
              <div className="mb-6 flex flex-col gap-3 rounded-xl border border-line px-4 py-3.5">
                <FlagRow label="공개" hint="사이트 CTF 목록에 보여요" checked={event.isPublished} busy={flags.busy('isPublished')} onChange={(v) => flags.toggle('isPublished', v)} />
                <FlagRow label="바로가기" hint="CTFd 로 이동하는 버튼이 눌려요" checked={event.isClickable} busy={flags.busy('isClickable')} onChange={(v) => flags.toggle('isClickable', v)} />
                <p className="text-xs text-fg-faint">스위치는 누르면 바로 반영돼요.</p>
              </div>
            )}
          </>
        )}

        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (!saving) save() }}>
          <Field label="대회 이름" error={errors.name}>
            {(a) => <TextInput {...a} value={form.name} placeholder="예) 2026 Pay1oad CTF" disabled={saving} onChange={(e) => set('name', e.target.value)} />}
          </Field>

          <div className="grid gap-3">
            <Field label="시작 일시" error={errors.startAt}>
              {(a) => <TextInput {...a} type="datetime-local" value={form.startAt} disabled={saving} onChange={(e) => set('startAt', e.target.value)} className="font-mono" />}
            </Field>
            <Field label="종료 일시" error={errors.endAt}>
              {(a) => <TextInput {...a} type="datetime-local" value={form.endAt} min={form.startAt || undefined} disabled={saving} onChange={(e) => set('endAt', e.target.value)} className="font-mono" />}
            </Field>
          </div>

          <Field label="CTFd 주소" hint="https:// 로 시작해야 해요" error={errors.ctfdUrl}>
            {(a) => <TextInput {...a} type="url" inputMode="url" value={form.ctfdUrl} placeholder="https://ctf.example.com" disabled={saving} onChange={(e) => set('ctfdUrl', e.target.value)} className="font-mono" />}
          </Field>

          <Field label="설명" optional hint={isNew ? undefined : '모두 지우고 저장하면 설명이 비워져요'}>
            {(a) => <TextArea {...a} rows={3} value={form.description} placeholder="대회 소개 한두 줄" disabled={saving} onChange={(e) => set('description', e.target.value)} />}
          </Field>

          <Field label="대표 이미지" optional hint="png · jpg · gif · webp, 20MB 이하" error={errors.image}>
            {(a) => (
              <div className="flex flex-col gap-2">
                {shownImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- 업로드 미리보기(blob:)와 외부 업로드 주소라 next/image 를 쓰지 않는다
                  <img src={shownImage} alt="대표 이미지 미리보기" className="max-h-40 w-full rounded-lg border border-line bg-surface object-contain" />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    {...a}
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    disabled={saving}
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <Button variant="ghost" size="sm" disabled={saving} onClick={() => fileInput.current?.click()}>
                    {file || event?.imageUrl ? '다른 이미지 선택' : '이미지 선택'}
                  </Button>
                  <span className="min-w-0 truncate font-mono text-xs text-fg-faint">
                    {file ? `${file.name}${uploadedUrl ? ' · 올림' : ''}` : event?.imageUrl ? '현재 이미지 유지' : '선택한 파일 없음'}
                  </span>
                  {file && <Button variant="text" disabled={saving} onClick={clearFile}>선택 취소</Button>}
                </div>
              </div>
            )}
          </Field>
          <button type="submit" hidden tabIndex={-1} />
        </form>
      </DetailPanel>

      {event && (
        <ConfirmDialog
          open={confirmOpen}
          title="CTF 이벤트 삭제"
          confirmLabel="영구 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={remove}
          onClose={() => setConfirmOpen(false)}
        >
          <b className="text-white">{event.name}</b> 이벤트가 영구 삭제됩니다. 되돌릴 수 없어요.
        </ConfirmDialog>
      )}
    </>
  )
}

function FlagRow({
  label, hint, checked, busy, onChange,
}: { label: string; hint: string; checked: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] text-white">{label}</p>
        <p className="text-xs text-fg-faint">{hint}</p>
      </div>
      <Switch label={label} checked={checked} busy={busy} onChange={onChange} />
    </div>
  )
}
