'use client'

import { useState } from 'react'
import {
  adminFetch, asList, Button, Choice, ConfirmDialog, DetailPanel, EmptyState, ErrorState, Field, FilterTabs,
  LoadingState, PageHeader, panelPad, TextArea, TextInput, Toast, useAdminQuery, useToast, type Tone,
} from '../_components/AdminUI'

type HistoryCategory = 'SELECTION' | 'EDUCATION' | 'PRESENTATION' | 'ACHIEVEMENT'

interface HistoryItem {
  id: number
  year: number
  category: HistoryCategory
  summary: string
  detail: string | null
  displayOrder: number
}

// 분류 점 색은 globals.css 토큰만: 선정=brand-soft · 교육=tone-green · 발표=tone-yellow · 성과=tone-red
const CATEGORY: Record<HistoryCategory, { label: string; dot: string; hint: string }> = {
  SELECTION: { label: '선정', dot: 'bg-brand-soft', hint: '지원 사업·프로그램 선정' },
  EDUCATION: { label: '교육', dot: 'bg-tone-green', hint: '교육·스터디 수료' },
  PRESENTATION: { label: '발표', dot: 'bg-tone-yellow', hint: '세미나·컨퍼런스 발표' },
  ACHIEVEMENT: { label: '성과', dot: 'bg-tone-red', hint: '대회 수상·성과' },
}
const CATEGORIES = Object.keys(CATEGORY) as HistoryCategory[]

const YEAR_MIN = 2000
const YEAR_MAX = 2100

function CatDot({ category }: { category: HistoryCategory }) {
  return <span aria-hidden="true" className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${CATEGORY[category].dot}`} />
}

const byOrder = (a: HistoryItem, b: HistoryItem) => a.displayOrder - b.displayOrder || a.id - b.id

type PanelTarget = { mode: 'edit'; id: number } | { mode: 'create'; year: number; category: HistoryCategory }

export default function AdminHistoryPage() {
  const { toast, show } = useToast()
  // 연도 탭을 바꿀 때마다 다시 불러오던 문제: 전체를 한 번만 불러오고 연도는 화면에서 거른다
  const { data, error, loading, reload, mutate } = useAdminQuery<HistoryItem[]>('/v1/admin/history/items')
  const items = asList<HistoryItem>(data)

  const [yearPick, setYearPick] = useState<number | null>(null)
  const [panel, setPanel] = useState<PanelTarget | null>(null)

  const years = Array.from(new Set(items.map((i) => i.year))).sort((a, b) => b - a)
  // 고른 연도의 마지막 항목을 지우면 그 연도가 사라진다 → 남아 있는 첫 연도로
  const year = yearPick !== null && years.includes(yearPick) ? yearPick : (years[0] ?? null)
  const inYear = items.filter((i) => i.year === year).sort(byOrder)

  const editing = panel?.mode === 'edit' ? items.find((i) => i.id === panel.id) ?? null : null
  const panelOpen = panel?.mode === 'create' || !!editing
  const selectedId = editing?.id ?? null

  function openCreate(category: HistoryCategory = 'SELECTION') {
    setPanel({ mode: 'create', year: year ?? new Date().getFullYear(), category })
  }

  function onCreated(item: HistoryItem) {
    mutate((d) => [...asList<HistoryItem>(d), item])
    setYearPick(item.year)
    setPanel(null)
    show(`${item.year}년 ${CATEGORY[item.category]?.label ?? ''} 항목을 추가했어요.`)
  }

  function onSaved(item: HistoryItem) {
    mutate((d) => asList<HistoryItem>(d).map((i) => (i.id === item.id ? item : i)))
    // 연도를 옮겼으면 그 연도로 따라간다 (항목이 화면에서 사라지지 않게)
    setYearPick(item.year)
    show('저장했어요.')
  }

  function onDeleted(item: HistoryItem) {
    setPanel(null)
    mutate((d) => asList<HistoryItem>(d).filter((i) => i.id !== item.id))
    show('항목을 삭제했어요.')
  }

  return (
    <div className={panelPad(panelOpen)}>
      <PageHeader
        path="history"
        title="연혁"
        description={<>About 페이지의 연도별 활동 기록 · 전체 <span className="font-mono text-white">{items.length}</span>개</>}
        actions={<Button onClick={() => openCreate()}>+ 항목 추가</Button>}
      />

      {error && !data ? (
        <ErrorState command="fetch history" error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingState command="fetch history" />
      ) : items.length === 0 || year === null ? (
        <EmptyState command="ls history/" text="등록된 연혁이 없어요" action={<Button variant="ghost" onClick={() => openCreate()}>+ 첫 항목 추가</Button>} />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={reload} className="cursor-pointer underline">다시 시도</button></p>}

          <FilterTabs
            label="연도별 보기"
            items={years.map((y) => ({ key: String(y), label: String(y), count: items.filter((i) => i.year === y).length }))}
            value={String(year)}
            onChange={(k) => setYearPick(Number(k))}
          />

          <div className={`grid gap-3 ${panelOpen ? 'xl:grid-cols-2' : 'sm:grid-cols-2'} ${loading ? 'opacity-60 transition-opacity' : ''}`}>
            {CATEGORIES.map((cat) => {
              const list = inYear.filter((i) => i.category === cat)
              return (
                <section key={cat} aria-label={`${year}년 ${CATEGORY[cat].label}`} className="rounded-xl border border-line">
                  <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
                    <h2 className="flex items-center gap-2 text-[13px] font-semibold text-white">
                      <CatDot category={cat} />
                      {CATEGORY[cat].label}
                      <span className="font-mono text-[11px] font-normal text-fg-faint">{list.length}</span>
                    </h2>
                    <Button variant="text" aria-label={`${year}년 ${CATEGORY[cat].label} 항목 추가`} onClick={() => openCreate(cat)}>+ 추가</Button>
                  </div>
                  {list.length === 0 ? (
                    <p className="px-3.5 py-3 font-mono text-xs text-fg-faint"># 없음</p>
                  ) : (
                    <ul>
                      {list.map((it) => {
                        const on = it.id === selectedId
                        return (
                          <li key={it.id} className="border-t border-white/[0.06] first:border-t-0">
                            <button
                              type="button"
                              aria-pressed={on}
                              aria-label={`${it.summary} 수정`}
                              onClick={() => setPanel({ mode: 'edit', id: it.id })}
                              className={`flex w-full cursor-pointer items-start gap-3 px-3.5 py-2.5 text-left outline-none transition-colors focus-visible:bg-surface-raised ${on ? 'bg-brand/12 shadow-[inset_2px_0_0_var(--color-brand)]' : 'hover:bg-surface'}`}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block break-keep text-[13px] text-white">{it.summary}</span>
                                {it.detail && <span className="mt-0.5 block truncate text-xs text-fg-subtle">{it.detail}</span>}
                              </span>
                              <span className="shrink-0 pt-0.5 font-mono text-[11px] text-fg-faint" title="표시 순서">#{it.displayOrder}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">tab 이동 · enter 열기 · esc 닫기 · #숫자 = 표시 순서</p>
        </>
      )}

      {panel?.mode === 'create' && (
        <HistoryPanel
          key={`new-${panel.year}-${panel.category}`}
          initial={{ year: panel.year, category: panel.category }}
          onClose={() => setPanel(null)}
          onCreated={onCreated}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
      {editing && (
        <HistoryPanel
          key={editing.id}
          item={editing}
          onClose={() => setPanel(null)}
          onCreated={onCreated}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}

type Form = { year: string; category: HistoryCategory; summary: string; detail: string; displayOrder: string }
type Errors = Partial<Record<keyof Form, string>>

function toForm(item: HistoryItem): Form {
  return {
    year: String(item.year),
    category: item.category,
    summary: item.summary,
    detail: item.detail ?? '',
    displayOrder: String(item.displayOrder ?? 0),
  }
}

function validate(f: Form): Errors {
  const e: Errors = {}
  const y = Number(f.year)
  if (!f.year.trim() || !Number.isInteger(y) || y < YEAR_MIN || y > YEAR_MAX) e.year = `${YEAR_MIN}~${YEAR_MAX} 사이 연도를 입력해주세요.`
  if (!f.summary.trim()) e.summary = '요약을 입력해주세요.'
  else if (f.summary.trim().length > 200) e.summary = '요약은 200자 이하여야 해요.'
  if (f.detail.trim().length > 500) e.detail = '상세는 500자 이하여야 해요.'
  const o = Number(f.displayOrder)
  if (f.displayOrder.trim() && (!Number.isInteger(o) || o < 0)) e.displayOrder = '0 이상의 정수를 입력해주세요.'
  return e
}

function HistoryPanel({
  item, initial, onClose, onCreated, onSaved, onDeleted,
}: {
  item?: HistoryItem
  initial?: { year: number; category: HistoryCategory }
  onClose: () => void
  onCreated: (i: HistoryItem) => void
  onSaved: (i: HistoryItem) => void
  onDeleted: (i: HistoryItem) => void
}) {
  const isNew = !item
  const base: Form = item
    ? toForm(item)
    : { year: String(initial?.year ?? new Date().getFullYear()), category: initial?.category ?? 'SELECTION', summary: '', detail: '', displayOrder: '0' }

  const [form, setForm] = useState<Form>(base)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const dirty = (Object.keys(base) as (keyof Form)[]).some((k) => base[k] !== form[k])

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  async function save() {
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    setNotice(null)
    const json = {
      year: Number(form.year),
      category: form.category,
      summary: form.summary.trim(),
      detail: form.detail.trim(),
      displayOrder: form.displayOrder.trim() ? Number(form.displayOrder) : 0,
    }
    const r = isNew
      ? await adminFetch<HistoryItem>('/v1/admin/history/items', { method: 'POST', json })
      : await adminFetch<HistoryItem>(`/v1/admin/history/items/${item.id}`, { method: 'PATCH', json })
    setSaving(false)
    if (!r.ok) { setNotice({ tone: 'danger', text: `저장하지 못했어요: ${r.error}` }); return }
    if (isNew) { onCreated(r.data); return }
    onSaved(r.data)
    setForm(toForm(r.data))
    setNotice({ tone: 'live', text: '저장했어요.' })
  }

  async function remove() {
    if (!item) return
    setDeleting(true)
    setDeleteError('')
    const r = await adminFetch(`/v1/admin/history/items/${item.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!r.ok) { setDeleteError(r.error); return }
    setConfirmOpen(false)
    onDeleted(item)
  }

  return (
    <>
      <DetailPanel
        open
        onClose={onClose}
        path={isNew ? 'history/new' : `history/${item.year}/${item.id}`}
        label={isNew ? '연혁 항목 추가' : '연혁 항목 수정'}
        busy={saving || deleting}
        notice={notice}
        footer={
          <>
            {isNew ? <span /> : (
              <Button variant="dangerText" disabled={saving} onClick={() => { setDeleteError(''); setConfirmOpen(true) }}>삭제…</Button>
            )}
            <div className="flex gap-2">
              {isNew ? (
                <Button variant="ghost" disabled={saving} onClick={onClose}>취소</Button>
              ) : (
                <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setForm(base); setErrors({}); setNotice(null) }}>되돌리기</Button>
              )}
              <Button disabled={!isNew && !dirty} loading={saving} onClick={save}>{isNew ? '추가' : '저장'}</Button>
            </div>
          </>
        }
      >
        <h2 className="mb-5 text-2xl font-bold text-white">{isNew ? '새 항목' : '항목 수정'}</h2>

        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (!saving) save() }}>
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
            <Field label="연도" error={errors.year}>
              {(a) => (
                <TextInput {...a} inputMode="numeric" value={form.year} disabled={saving} onChange={(e) => set('year', e.target.value)} className="font-mono" />
              )}
            </Field>
            <Field label="표시 순서" hint="작을수록 위에 나와요" error={errors.displayOrder}>
              {(a) => (
                <TextInput {...a} inputMode="numeric" value={form.displayOrder} disabled={saving} onChange={(e) => set('displayOrder', e.target.value)} className="font-mono" />
              )}
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-fg-subtle">분류</p>
            <Choice
              label="분류"
              value={form.category}
              onChange={(k) => set('category', k)}
              disabled={saving}
              options={CATEGORIES.map((k) => ({ key: k, label: CATEGORY[k].label }))}
            />
            <p className="mt-1.5 text-xs text-fg-faint">{CATEGORY[form.category].hint}</p>
          </div>

          <Field label="요약" hint={`카드에 보이는 한 줄 · ${form.summary.trim().length}/200`} error={errors.summary}>
            {(a) => (
              <TextInput {...a} value={form.summary} maxLength={200} placeholder="예) BoB 수료" disabled={saving} onChange={(e) => set('summary', e.target.value)} />
            )}
          </Field>

          <Field label="상세" optional hint={`카드에서 항목을 눌러 펼치면 보여요 · ${form.detail.trim().length}/500`} error={errors.detail}>
            {(a) => (
              <TextArea {...a} rows={4} value={form.detail} maxLength={500} placeholder="예) BoB 12기 수료: 1기 홍길동" disabled={saving} onChange={(e) => set('detail', e.target.value)} />
            )}
          </Field>
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      </DetailPanel>

      {item && (
        <ConfirmDialog
          open={confirmOpen}
          title="연혁 항목 삭제"
          confirmLabel="삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={remove}
          onClose={() => setConfirmOpen(false)}
        >
          <b className="text-white">{item.year}년 · {CATEGORY[item.category]?.label}</b> “{item.summary}” 항목을 삭제합니다. 되돌릴 수 없어요.
        </ConfirmDialog>
      )}
    </>
  )
}
