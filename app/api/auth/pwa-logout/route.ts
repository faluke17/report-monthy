import { NextResponse } from 'next/server'
import { PWA_SESSION_COOKIE } from '@/lib/pwa-auth'

const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  // Expire the cookie with the same attributes it was set with
  response.cookies.set(PWA_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    path:     '/',
    maxAge:   0,
  })
  return response
}
