import { NextRequest, NextResponse } from 'next/server'

// 로그인 여부만 본다. 관리자인지는 여기서 판단하지 않는다.
// 토큰 안의 roles 는 발급 시점 값이라, 콘솔에서 관리자 권한을 줘도 토큰이 바뀔 때까지(최대 15분)
// /admin 에서 홈으로 튕겨냈다. 관리자 판단은 DB 기준인 admin/layout(/v1/users/me)과
// 백엔드(/v1/admin/** 를 요청마다 DB 권한으로 검사)가 맡는다.
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
