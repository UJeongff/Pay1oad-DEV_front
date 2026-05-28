import { NextRequest, NextResponse } from 'next/server'

// JWT payload 만 base64url 디코드. 서명 검증은 백엔드가 담당.
// 미들웨어는 UX 차단용 — 위조된 토큰이 들어와도 백엔드 API가 401/403 반환.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isExpired(payload: Record<string, unknown>): boolean {
  const exp = typeof payload.exp === 'number' ? payload.exp : null
  return exp !== null && Date.now() >= exp * 1000
}

function hasAdminRole(payload: Record<string, unknown>): boolean {
  const roles = payload.roles
  if (Array.isArray(roles)) {
    return roles.some((r) => typeof r === 'string' && r.toUpperCase().includes('ADMIN'))
  }
  return false
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')?.value
  const refreshToken = request.cookies.get('refreshToken')?.value
  const { pathname, search } = request.nextUrl

  // 둘 다 없으면 비로그인 확정 → 로그인 페이지로 302
  // refreshToken만 있어도 통과시켜 AuthContext의 silent refresh가 복구하도록 한다.
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // 관리자 경로는 추가로 ADMIN role 확인.
  // accessToken이 살아있을 때만 SSR 단계에서 검증하고, 만료/누락된 경우는
  // 클라이언트 silent refresh 후 admin/layout 가드가 최종 차단한다.
  if (pathname.startsWith('/admin') && accessToken) {
    const payload = decodeJwtPayload(accessToken)
    if (payload && !isExpired(payload) && !hasAdminRole(payload)) {
      // 인증은 됐지만 권한 없음 — 홈으로 보냄
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/content',
    '/content/:path*',
    '/blog/:path+',
  ],
}
