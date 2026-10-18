'use client'

import { useRef, useState } from 'react'
import Avatar from '@/app/components/Avatar'
import { useAuthContext } from '@/app/context/AuthContext'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const ALLOWED_TYPES = ACCEPT.split(',')
// 원본은 브라우저에서 줄여 올리므로 넉넉히 받는다. 서버 한도(5MB)는 줄인 결과에 적용된다
const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const OUTPUT_SIZE = 512

const OUTLINE_BUTTON =
  'px-4 py-2 rounded-lg text-[13px] font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, 0.9))
}

/**
 * 가운데를 정사각형으로 잘라 최대 512px 로 줄인다.
 * 캔버스로 다시 그리므로 EXIF(촬영 위치 등)도 함께 지워진다.
 */
async function resizeToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const out = Math.min(OUTPUT_SIZE, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
      0, 0, out, out,
    )
    // WebP 를 못 만드는 브라우저는 PNG 로 돌려주므로 그때는 JPEG 로 다시 뽑는다
    const webp = await canvasToBlob(canvas, 'image/webp')
    if (webp && webp.type === 'image/webp') return webp
    const jpeg = await canvasToBlob(canvas, 'image/jpeg')
    if (!jpeg) throw new Error('encode')
    return jpeg
  } finally {
    bitmap.close()
  }
}

export default function ProfilePhotoSection() {
  const { user, refetch } = useAuthContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null)
  const [error, setError] = useState('')

  if (!user) return null
  const hasPhoto = !!user.profileImageUrl

  async function handleFile(file: File) {
    setError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('JPG, PNG, WebP 이미지만 올릴 수 있습니다.')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('20MB 이하의 이미지를 골라주세요.')
      return
    }

    setBusy('upload')
    try {
      let blob: Blob
      try {
        blob = await resizeToSquare(file)
      } catch {
        setError('이미지를 읽을 수 없습니다. 다른 파일을 골라주세요.')
        return
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        setError('이미지가 너무 큽니다. 다른 파일을 골라주세요.')
        return
      }

      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const body = new FormData()
      body.append('file', blob, `profile.${ext}`)
      const res = await fetchWithAuth(`${API_URL}/v1/users/me/profile-image`, { method: 'POST', body })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message ?? `업로드에 실패했습니다. (HTTP ${res.status})`)
        return
      }
      await refetch()
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    setError('')
    setBusy('delete')
    try {
      const res = await fetchWithAuth(`${API_URL}/v1/users/me/profile-image`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message ?? `삭제에 실패했습니다. (HTTP ${res.status})`)
        return
      }
      await refetch()
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-line">
      <Avatar src={user.profileImageUrl} name={user.nickname} size={72} className={busy === 'upload' ? 'opacity-60' : ''} />
      <div className="min-w-0">
        <p className="text-xs text-fg-subtle mb-2.5">
          JPG, PNG, WebP · 정사각형으로 잘려 저장됩니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null}
            className={`${OUTLINE_BUTTON} text-fg-muted border-line-strong hover:text-white hover:bg-surface-raised`}
          >
            {busy === 'upload' ? '올리는 중...' : '사진 변경'}
          </button>
          {hasPhoto && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy !== null}
              className={`${OUTLINE_BUTTON} font-normal text-fg-subtle border-line hover:text-danger hover:border-danger/50`}
            >
              {busy === 'delete' ? '삭제 중...' : '삭제'}
            </button>
          )}
        </div>
        {error && <p className="text-danger text-xs mt-2">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            // 같은 파일을 다시 골라도 change 가 일어나도록 비운다
            e.target.value = ''
            if (file) handleFile(file)
          }}
        />
      </div>
    </div>
  )
}
