'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/app/lib/fetchWithAuth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.com'

/** 승인 대기 인원수가 바뀌었을 때 헤더 뱃지를 바로 갱신하기 위한 신호. */
const EVENT = 'pay1oad:pending-approvals-changed'

export function notifyPendingApprovalsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT))
}

/**
 * 관리자에게 보여줄 "승인 대기 인원수".
 *
 * 관리자가 아니면 아예 요청하지 않는다 — 일반 회원에게는 403 만 쌓일 뿐이다.
 * 승인/거부 직후에는 notifyPendingApprovalsChanged() 로 즉시 다시 읽고,
 * 그 외에는 다른 탭에서 처리했을 수도 있으니 60초마다 한 번씩만 확인한다.
 */
export function usePendingApprovals(isAdmin: boolean): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isAdmin) return

    let cancelled = false

    const load = () => {
      fetchWithAuth(`${API_URL}/v1/admin/approvals/pending/count`)
        .then(res => (res.ok ? res.json() : null))
        .then(json => {
          if (cancelled) return
          const n = Number(json?.data?.count ?? json?.count ?? 0)
          setCount(Number.isFinite(n) ? n : 0)
        })
        .catch(() => {})
    }

    load()
    const timer = setInterval(load, 60_000)
    window.addEventListener(EVENT, load)

    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener(EVENT, load)
    }
  }, [isAdmin])

  // 관리자가 아닐 때 0 으로 되돌리는 일을 effect 에서 하지 않고 렌더에서 판단한다
  return isAdmin ? count : 0
}
