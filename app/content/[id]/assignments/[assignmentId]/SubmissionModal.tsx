'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

export type SubmissionFile = {
  id: number
  originalName: string
  fileUrl: string
  fileSize: number
}

type Props = {
  contentId: string
  assignmentId: string
  /** 이미 제출한 게 있으면 내용을 채워 넣는다 (재제출) */
  existing: { body: string | null | undefined; files: SubmissionFile[] } | null
  onClose: () => void
  onSubmitted: () => void
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** 과제 제출 팝업. 페이지를 떠나지 않고 그 자리에서 제출한다. */
export default function SubmissionModal({ contentId, assignmentId, existing, onClose, onSubmitted }: Props) {
  const [body, setBody] = useState(existing?.body ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // ESC 로 닫고, 열려 있는 동안 뒤 배경이 스크롤되지 않게 한다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, submitting])

  const keptFiles = existing?.files ?? []

  async function handleSubmit() {
    if (!body.trim() && files.length === 0 && keptFiles.length === 0) {
      setError('내용이나 첨부 파일 중 하나는 필요합니다.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      if (body.trim()) formData.append('body', body.trim())
      files.forEach(f => formData.append('files', f))

      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions`,
        { method: 'POST', body: formData },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        // 마감이 지나면 서버가 ASSIGNMENT_CLOSED 로 막는다
        setError(json?.message ?? `제출에 실패했습니다. (HTTP ${res.status})`)
        return
      }
      onSubmitted()
      onClose()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div
      onMouseDown={e => { if (e.target === e.currentTarget && !submitting) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(3,6,16,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="과제 제출"
        style={{
          width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto',
          background: '#0b1226', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '18px', padding: '28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800 }}>
              {existing ? '과제 다시 제출' : '과제 제출'}
            </h2>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
              제출한 내용은 팀장만 볼 수 있습니다.
            </p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            aria-label="닫기"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '22px', lineHeight: 1, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginBottom: '8px' }}>
          제출 내용
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={9}
          placeholder="과제 내용을 입력해주세요."
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', padding: '14px', color: '#fff', fontSize: '14px', lineHeight: 1.7,
          }}
        />

        <div style={{ marginTop: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>첨부 파일</span>
            <label style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '12px' }}>
              파일 선택
              <input
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  const picked = Array.from(e.currentTarget.files ?? [])
                  if (picked.length) setFiles(prev => [...prev, ...picked])
                  e.currentTarget.value = ''
                }}
              />
            </label>
          </div>

          {keptFiles.length > 0 && (
            <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
              기존 첨부 {keptFiles.length}개는 그대로 유지됩니다.
            </p>
          )}

          {files.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {files.map((file, i) => (
                <span
                  key={`${file.name}-${i}`}
                  style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', padding: '5px 10px', borderRadius: '999px', background: 'rgba(28,90,255,0.12)', color: '#a9c5ff', fontSize: '12px' }}
                >
                  {file.name} ({formatFileSize(file.size)})
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>선택된 파일이 없습니다.</p>
          )}
        </div>

        {error && <p style={{ margin: '16px 0 0', color: '#f87171', fontSize: '12px' }}>{error}</p>}

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={() => !submitting && onClose()}
            style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#1C5AFF', color: '#fff', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? '제출 중...' : existing ? '다시 제출' : '제출하기'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
