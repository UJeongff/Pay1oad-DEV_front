'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

type Comment = {
  id: number
  authorId: number
  authorName: string
  content: string
  createdAt: string
}

function formatDate(v: string) {
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 제출물 댓글.
 *
 * 팀장과 제출 당사자만 읽고 쓸 수 있다 — 서버가 같은 규칙으로 막고 있으므로
 * 여기서는 그 결과를 그대로 보여주기만 한다.
 */
export default function SubmissionComments({
  contentId,
  assignmentId,
  submissionId,
  currentUserId,
  canModerate,
}: {
  contentId: string
  assignmentId: string
  submissionId: number
  currentUserId: number | null
  /** 팀장/관리자는 남의 댓글도 지울 수 있다 */
  canModerate: boolean
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const base = `${API_URL}/v1/contents/${contentId}/assignments/${assignmentId}/submissions/${submissionId}/comments`

  const load = useCallback(() => {
    fetchWithAuth(base)
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (Array.isArray(json?.data)) setComments(json.data) })
      .catch(() => {})
  }, [base])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!input.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetchWithAuth(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.errors?.[0]?.message ?? json?.message ?? '댓글 등록에 실패했습니다.')
        return
      }
      setInput('')
      load()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    const res = await fetchWithAuth(`${base}/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else {
      const json = await res.json().catch(() => null)
      setError(json?.message ?? '삭제에 실패했습니다.')
    }
  }

  return (
    <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
        댓글 {comments.length > 0 && `(${comments.length})`}
      </p>

      {comments.length === 0 ? (
        <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>아직 댓글이 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
          {comments.map(c => (
            <div key={c.id} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>{c.authorName}</span>
                <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{formatDate(c.createdAt)}</span>
                  {(canModerate || c.authorId === currentUserId) && (
                    <button
                      onClick={() => remove(c.id)}
                      style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '11px' }}
                    >
                      삭제
                    </button>
                  )}
                </span>
              </div>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.72)', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {c.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ margin: '0 0 10px', color: '#f87171', fontSize: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) add() }}
          placeholder="댓글을 입력하세요"
          style={{
            flex: 1, height: '38px', padding: '0 12px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none',
          }}
        />
        <button
          onClick={add}
          disabled={busy || !input.trim()}
          style={{
            padding: '0 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 600,
            background: input.trim() ? '#1C5AFF' : 'rgba(255,255,255,0.08)',
            color: input.trim() ? '#fff' : 'rgba(255,255,255,0.35)',
            cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          등록
        </button>
      </div>
    </div>
  )
}
