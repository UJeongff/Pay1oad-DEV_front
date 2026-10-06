'use client'

import { useCallback, useEffect, useState } from 'react'

export type Toast = { id: number; message: string }

// 하단 알림 (브라우저 기본 alert 대신). 3초 뒤 사라진다
export default function ToastMessage({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDone])

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full px-5 py-3 text-sm text-white bg-panel border border-line shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-danger" />
      {toast.message}
    </div>
  )
}

// 페이지에서 쓰는 쪽: const { toast, showToast, clearToast } = useToast()
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), [])
  const clearToast = useCallback(() => setToast(null), [])
  return { toast, showToast, clearToast }
}
