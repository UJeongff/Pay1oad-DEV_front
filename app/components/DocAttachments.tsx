'use client'

import { useRef, useState } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

export type DocFile = {
  id: number
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType?: string | null
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** 상대 경로로 내려오므로 API 호스트를 붙인다. */
function absolute(url: string) {
  return url.startsWith('http') ? url : `${API_URL}${url}`
}

/**
 * 문서 첨부파일 목록 + 올리기/지우기.
 *
 * 본문에 붙여넣은 이미지도 같은 저장소에 올라가므로 여기에 함께 나타난다.
 * 이미지를 목록에서 지워도 본문에 남은 <img> 는 자동으로 사라지지 않는다 —
 * 지우기 전에 한 번 확인을 받는 이유다.
 */
export default function DocAttachments({
  contentId,
  docId,
  files,
  readOnly = false,
  onChanged,
}: {
  contentId: string
  docId: string
  files: DocFile[]
  readOnly?: boolean
  /** 업로드/삭제 후 문서를 다시 읽어오게 한다 */
  onChanged: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(picked: File[]) {
    if (picked.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const file of picked) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetchWithAuth(
          `${API_URL}/v1/contents/${contentId}/docs/${docId}/files`,
          { method: 'POST', body: form },
        )
        if (!res.ok) {
          const json = await res.json().catch(() => null)
          setError(json?.message ?? `업로드에 실패했습니다. (HTTP ${res.status})`)
          break
        }
      }
      onChanged()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(file: DocFile) {
    if (!window.confirm(`"${file.fileName}"을(를) 삭제하시겠습니까?\n본문에 넣은 이미지라면 본문에서도 따로 지워야 합니다.`)) return
    setError(null)
    try {
      const res = await fetchWithAuth(
        `${API_URL}/v1/contents/${contentId}/docs/${docId}/files/${file.id}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.message ?? `삭제에 실패했습니다. (HTTP ${res.status})`)
        return
      }
      onChanged()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    }
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ width: '3px', height: '14px', background: '#1C5AFF', borderRadius: '2px', display: 'inline-block' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
          첨부파일{files.length > 0 && ` (${files.length})`}
        </span>
        {!readOnly && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            style={{
              marginLeft: 'auto', padding: '5px 12px', borderRadius: '7px', fontSize: '12px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.65)', cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? '올리는 중…' : '파일 추가'}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            const picked = Array.from(e.currentTarget.files ?? [])
            e.currentTarget.value = ''
            void upload(picked)
          }}
        />
      </div>

      {error && <p style={{ margin: '0 0 10px', color: '#f87171', fontSize: '12px' }}>{error}</p>}

      {files.length === 0 ? (
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>첨부된 파일이 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {files.map(f => (
            <div
              key={f.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                padding: '10px 14px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
              }}
            >
              <a
                href={absolute(f.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', minWidth: 0, flex: 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.fileName}
                </span>
              </a>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                {formatFileSize(f.fileSize)}
              </span>
              {!readOnly && (
                <button
                  onClick={() => remove(f)}
                  aria-label={`${f.fileName} 삭제`}
                  title="삭제"
                  style={{
                    flexShrink: 0, width: '22px', height: '22px', lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', borderRadius: '5px',
                    color: 'rgba(255,255,255,0.35)', fontSize: '16px', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#f87171'; el.style.background = 'rgba(239,68,68,0.12)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'rgba(255,255,255,0.35)'; el.style.background = 'transparent' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
