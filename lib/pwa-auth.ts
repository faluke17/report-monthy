import { cookies } from 'next/headers'

export const PWA_SESSION_COOKIE = 'pwa_session'

export interface PwaSession {
  username: string
  name: string
  surname: string
  prefix_name: string
  costcenter: string
  ba: string
  part: string
  area: string
  wwcode: string
  div_name: string
  job_name: string
  dep_name: string
  org_name: string
  position_name: string
  level: string
  branch_name: string
}

export async function getPwaSession(): Promise<PwaSession | null> {
  // cookies() ต้องอยู่นอก try/catch — มันโยน internal signal ของ Next.js (dynamic server usage)
  // เวลาถูกเรียกตอน build-time static generation ถ้า catch ไว้จะไปกลืน signal นั้นทำให้ Next.js
  // ไม่รู้ว่า route นี้ต้อง render แบบ dynamic แล้วพยายาม static-render ต่อจนพัง (ดู PR ที่แก้ build fail
  // บน Vercel — สาเหตุจาก try/catch ครอบ cookies() ตรงนี้)
  const store = await cookies()
  const raw = store.get(PWA_SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PwaSession
    if (!parsed || typeof parsed !== 'object' || typeof parsed.username !== 'string' || !parsed.username) {
      return null
    }
    return parsed
  } catch (e) {
    console.error('[getPwaSession]', e)
    return null
  }
}
