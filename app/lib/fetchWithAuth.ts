const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.pay1oad.xyz'

// Deduplicate concurrent refresh attempts
let isRefreshing = false
let refreshQueue: Array<(success: boolean) => void> = []

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise((resolve) => refreshQueue.push(resolve))
  }

  isRefreshing = true
  try {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const success = res.ok
    refreshQueue.forEach((cb) => cb(success))
    return success
  } catch {
    refreshQueue.forEach((cb) => cb(false))
    return false
  } finally {
    isRefreshing = false
    refreshQueue = []
  }
}

/**
 * fetch wrapper that automatically calls /v1/auth/refresh on 401
 * and retries the original request once.
 * Always sends cookies (credentials: 'include').
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const opts: RequestInit = { ...init, credentials: 'include' }

  let res = await fetch(input, opts)

  if (res.status === 401 || res.status === 403) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      res = await fetch(input, opts)
    }
  }

  return res
}
