import { NextResponse } from 'next/server'
import { PWA_SESSION_COOKIE } from '@/lib/pwa-auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(PWA_SESSION_COOKIE)
  return response
}
