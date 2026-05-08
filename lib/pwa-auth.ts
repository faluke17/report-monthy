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
  try {
    const store = await cookies()
    const raw = store.get(PWA_SESSION_COOKIE)?.value
    if (!raw) return null
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
