'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import {
  adminFetch, asList, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, Table, Td,
  TextInput, Th, Toast, useAdminQuery, useToast,
} from '../_components/AdminUI'

// 백엔드 Create/UpdateArchiveYearRequest 와 같은 범위
const YEAR_MIN = 2000
const YEAR_MAX = 2100

/** 연도 입력 검사. 통과하면 숫자, 아니면 오류 문구 */
function parseYear(raw: string, existing: number[], current?: number): number | string {
  const v = raw.trim()
  const y = Number(v)
  if (!v || !Number.isInteger(y) || y < YEAR_MIN || y > YEAR_MAX) return `${YEAR_MIN}~${YEAR_MAX} 사이 연도를 입력해주세요.`
  if (y !== current && existing.includes(y)) return `${y} 아카이브는 이미 있어요.`
  return y
}

export default function AdminArchivePage() {
  const { toast, show } = useToast()
  const { data, error, loading, reload, mutate } = useAdminQuery<number[]>('/v1/archive/years')
  const years = asList<number>(data).slice().sort((a, b) => b - a)

  // 추가
  const [newYear, setNewYear] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)

  // 줄 안에서 수정
  const [editing, setEditing] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // 삭제
  const [deleting, setDeleting] = useState<number | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Enter 를 연타해도 요청은 하나만 (state 는 다음 렌더까지 반영되지 않으므로 ref 로 잠근다)
  const busyRef = useRef(false)

  async function add() {
    if (busyRef.current) return
    const y = parseYear(newYear, years)
    if (typeof y === 'string') { setAddError(y); return }
    busyRef.current = true
    setAdding(true)
    setAddError('')
    const r = await adminFetch<{ year: number }>('/v1/archive/years', { method: 'POST', json: { year: y } })
    busyRef.current = false
    setAdding(false)
    if (!r.ok) { setAddError(r.error); return }
    const created = r.data?.year ?? y
    mutate((d) => [...asList<number>(d).filter((v) => v !== created), created])
    setNewYear('')
    show(`${created} 아카이브를 만들었어요.`)
  }

  function startEdit(year: number) {
    setEditing(year)
    setEditValue(String(year))
    setEditError('')
  }

  function cancelEdit() {
    if (savingEdit) return
    setEditing(null)
    setEditError('')
  }

  async function saveEdit() {
    if (editing === null || busyRef.current) return
    const y = parseYear(editValue, years, editing)
    if (typeof y === 'string') { setEditError(y); return }
    if (y === editing) { setEditing(null); return }
    busyRef.current = true
    setSavingEdit(true)
    setEditError('')
    const from = editing
    const r = await adminFetch<{ year: number }>(`/v1/archive/years/${from}`, { method: 'PATCH', json: { year: y } })
    busyRef.current = false
    setSavingEdit(false)
    if (!r.ok) { setEditError(r.error); return }
    const to = r.data?.year ?? y
    mutate((d) => asList<number>(d).map((v) => (v === from ? to : v)))
    setEditing(null)
    show(`${from} → ${to} 로 바꿨어요.`)
  }

  function onEditKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
  }

  async function remove() {
    if (deleting === null) return
    setDeleteBusy(true)
    setDeleteError('')
    const year = deleting
    const r = await adminFetch<{ restored?: number }>(`/v1/archive/years/${year}`, { method: 'DELETE' })
    setDeleteBusy(false)
    if (!r.ok) { setDeleteError(r.error); return }
    mutate((d) => asList<number>(d).filter((v) => v !== year))
    setDeleting(null)
    const restored = r.data?.restored
    show(`${year} 아카이브를 삭제했어요.${restored ? ` 글·자료 ${restored}건이 원래 목록으로 돌아갔어요.` : ''}`)
  }

  return (
    <div>
      <PageHeader
        path="archive"
        title="아카이브"
        description={<>연도별 아카이브 <span className="font-mono text-white">{years.length}</span>개 · 지난 해 글과 자료를 연도로 묶어 보관해요</>}
        actions={
          <form
            onSubmit={(e) => { e.preventDefault(); add() }}
            className="flex items-center gap-2"
          >
            <TextInput
              aria-label="새 아카이브 연도"
              aria-invalid={addError ? true : undefined}
              aria-describedby={addError ? 'archive-add-error' : undefined}
              inputMode="numeric"
              placeholder={String(new Date().getFullYear())}
              value={newYear}
              disabled={adding}
              onChange={(e) => { setNewYear(e.target.value); if (addError) setAddError('') }}
              className="w-[110px] font-mono"
            />
            <Button type="submit" loading={adding}>추가</Button>
          </form>
        }
      />
      {addError && <p id="archive-add-error" role="alert" className="-mt-2 mb-4 text-xs text-danger sm:text-right">{addError}</p>}

      {error && !data ? (
        <ErrorState command="fetch archive/years" error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingState command="fetch archive/years" rows={3} />
      ) : years.length === 0 ? (
        <EmptyState command="ls archive/" text="아카이브 연도가 없어요. 위 입력칸에 연도를 넣고 추가해주세요" />
      ) : (
        <>
          {error && <p role="alert" className="mb-3 text-xs text-danger">새로 불러오지 못했어요: {error} <button type="button" onClick={reload} className="cursor-pointer underline">다시 시도</button></p>}
          <div className={`max-w-[640px] ${loading ? 'opacity-60 transition-opacity' : ''}`}>
            <Table label="아카이브 연도 목록">
              <thead>
                <tr>
                  <Th>Year</Th>
                  <Th className="hidden sm:table-cell">Page</Th>
                  <Th className="text-right"><span className="sr-only">동작</span></Th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => {
                  const isEditing = editing === year
                  return (
                    <tr key={year} className={`border-t border-white/[0.06] ${isEditing ? 'bg-brand/12 shadow-[inset_2px_0_0_var(--color-brand)]' : ''}`}>
                      {isEditing ? (
                        <Td className="py-2.5" >
                          <div className="flex flex-col gap-1.5">
                            <TextInput
                              autoFocus
                              aria-label={`${year} 아카이브의 새 연도 (Enter 저장 · Esc 취소)`}
                              aria-invalid={editError ? true : undefined}
                              aria-describedby={editError ? `archive-edit-error-${year}` : undefined}
                              inputMode="numeric"
                              value={editValue}
                              disabled={savingEdit}
                              onChange={(e) => { setEditValue(e.target.value); if (editError) setEditError('') }}
                              onKeyDown={onEditKey}
                              className="w-[110px] font-mono"
                            />
                            {editError && <p id={`archive-edit-error-${year}`} role="alert" className="text-xs text-danger">{editError}</p>}
                          </div>
                        </Td>
                      ) : (
                        <Td className="font-mono text-base font-semibold text-white">{year}</Td>
                      )}
                      <Td className="hidden sm:table-cell">
                        <a
                          href={`/archive/${year}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-brand-soft hover:underline"
                        >
                          /archive/{year} ↗
                        </a>
                      </Td>
                      <Td className="text-right">
                        <div className="flex items-center justify-end gap-4">
                          {isEditing ? (
                            <>
                              <Button variant="text" disabled={savingEdit} onClick={cancelEdit}>취소</Button>
                              <Button size="sm" loading={savingEdit} onClick={saveEdit}>저장</Button>
                            </>
                          ) : (
                            <>
                              <Button variant="text" disabled={savingEdit} onClick={() => startEdit(year)} aria-label={`${year} 수정`}>수정</Button>
                              <Button variant="dangerText" onClick={() => { setDeleteError(''); setDeleting(year) }} aria-label={`${year} 삭제`}>삭제</Button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
          <p className="mt-4 hidden font-mono text-[11px] text-fg-faint md:block">수정 중 enter 저장 · esc 취소</p>
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="아카이브 삭제"
        confirmLabel="삭제"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      >
        <b className="text-white">{deleting}</b> 아카이브를 삭제합니다. 이 연도로 보관된 글과 자료는 <b className="text-white">지워지지 않고</b> 아카이브에서 풀려 원래 목록으로 돌아가요.
      </ConfirmDialog>

      <Toast toast={toast} />
    </div>
  )
}
