const RATS_BASE = process.env.RATS_API_BASE ?? 'http://110.76.155.169/RATS2/api'

export interface BranchStat {
  ba: number
  read_count: number
  cust_count: number
  last_read: string | null
  target: number
}

interface RatsLoginResponse {
  ok?: boolean
  status?: string
  check?: string
  token?: string
  message?: string
}

interface BranchStatsResponse {
  ok: boolean
  rows: BranchStat[]
  month: number
  year_be: number
}

async function ratsLogin(): Promise<{ authHeader?: string; cookie?: string }> {
  const res = await fetch(`${RATS_BASE}/auth/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: process.env.RATS_USER,
      pass: process.env.RATS_PASS,
    }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`RATS login HTTP error: ${res.status}`)

  const data: RatsLoginResponse = await res.json()
  if (data.status !== 'Pass' && data.check !== 'Pass') {
    throw new Error(`RATS login rejected: ${data.message ?? data.status ?? 'unknown'}`)
  }

  if (data.token) return { authHeader: `Bearer ${data.token}` }

  const setCookie = res.headers.get('set-cookie')
  if (setCookie) return { cookie: setCookie.split(';')[0] }

  throw new Error('RATS login: no token or session cookie returned')
}

export async function fetchBranchStats(yearBe: number, month: number): Promise<BranchStat[]> {
  const auth = await ratsLogin()

  const headers: Record<string, string> = {}
  if (auth.authHeader) headers['Authorization'] = auth.authHeader
  if (auth.cookie) headers['Cookie'] = auth.cookie

  const url = `${RATS_BASE}/large_reading.php?action=branch_stats&year=${yearBe}&month=${month}`
  const res = await fetch(url, { headers, cache: 'no-store' })

  if (!res.ok) throw new Error(`RATS fetch error: ${res.status}`)

  const data: BranchStatsResponse = await res.json()
  if (!data.ok) throw new Error('RATS returned ok=false for branch_stats')

  return data.rows
}
