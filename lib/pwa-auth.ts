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
    return JSON.parse(raw) as PwaSession
  } catch {
    return null
  }
}
