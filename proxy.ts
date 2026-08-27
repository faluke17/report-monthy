import { NextResponse, type NextRequest } from 'next/server'
import { PWA_SESSION_COOKIE } from '@/lib/pwa-auth'

const PUBLIC_PATHS = [
  '/login', '/auth', '/api/auth', '/api/dmama', '/api/rats', '/api/nrw', '/api/export',
  // เปิดดูได้โดยไม่ต้อง login — เฉพาะ 2 หน้านี้เท่านั้น (allowlist)
  '/executive-summary', '/report-nrw',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // '/' เช็คแบบ exact match — ห้ามใส่ '/' ลง PUBLIC_PATHS เพราะ startsWith('/') จะจริงทุก path
  // (root page.tsx redirect ไป /executive-summary ซึ่งเปิดสาธารณะอยู่แล้ว)
  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  const session = request.cookies.get(PWA_SESSION_COOKIE)?.value
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('returnTo', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|jpg|jpeg|png|gif|webp|ico|woff|woff2)$).*)'],
}
