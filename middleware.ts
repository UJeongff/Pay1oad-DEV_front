import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('accessToken')
  const refreshToken = request.cookies.get('refreshToken')
  const { pathname, search } = request.nextUrl

  // accessToken이 만료되어도 refreshToken만 있으면 AuthContext가 silent refresh로 복구.
  // 둘 다 없을 때만 비로그인으로 확정해 로그인 페이지로 302.
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
