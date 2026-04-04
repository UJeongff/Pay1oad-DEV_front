import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Content auth is validated by the client/AuthContext and API responses.
  // Edge middleware cannot reliably observe auth cookies in every environment,
  // which caused valid sessions to be redirected to /login before the page loaded.
  return NextResponse.next()
}

export const config = {
  matcher: ['/content', '/content/:path+'],
}
