'use client'

import { useState } from 'react'

type Props = {
  /** 프로필 사진 URL. 없거나 불러오지 못하면 이름 첫 글자를 보여준다 */
  src?: string | null
  name?: string | null
  /** 지름(px) */
  size?: number
  className?: string
}

export default function Avatar({ src, name, size = 36, className = '' }: Props) {
  // 실패한 주소를 기억해 두면 src 가 바뀔 때 따로 초기화하지 않아도 된다
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = !!src && src !== failedSrc
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 select-none ${
        showImage ? 'bg-surface-raised' : 'bg-brand text-white font-black'
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- API 서버의 업로드 파일이라 next/image 원격 설정 없이 쓴다
        <img
          src={src}
          alt={name ? `${name} 프로필 사진` : '프로필 사진'}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  )
}
