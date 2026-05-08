import { NextResponse, type NextRequest } from 'next/server'
import { PWA_SESSION_COOKIE } from '@/lib/pwa-auth'

const PUBLIC_PATHS = ['/login', '/auth', '/api/auth', '/api/dmama', '/api/rats', '/api/nrw', '/api/export']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  const session = request.cookies.get(PWA_SESSION_COOKIE)?.value
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.svg).*)'],
}
