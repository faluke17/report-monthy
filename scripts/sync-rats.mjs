// node --env-file=.env.local scripts/sync-rats.mjs
import { createClient } from '@supabase/supabase-js'

const RATS_BASE = process.env.RATS_API_BASE ?? 'http://110.76.155.169/RATS2/api'

function currentThaiYearMonth() {
  const now = new Date()
  return { year_be: now.getFullYear() + 543, month: now.getMonth() + 1 }
}

async function ratsLogin() {
  const res = await fetch(`${RATS_BASE}/auth/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: process.env.RATS_USER, pass: process.env.RATS_PASS }),
  })
  if (!res.ok) throw new Error(`RATS login HTTP ${res.status}`)

  const data = await res.json()
  if (data.status !== 'Pass' && data.check !== 'Pass') {
    throw new Error(`RATS login rejected: ${data.message ?? data.status ?? ''}`)
  }

  if (data.token) return { Authorization: `Bearer ${data.token}` }

  const cookie = res.headers.get('set-cookie')?.split(';')[0]
  if (cookie) return { Cookie: cookie }

  throw new Error('RATS login: no token or cookie returned')
}

async function fetchBranchStats(year_be, month) {
  const authHeaders = await ratsLogin()
  const url = `${RATS_BASE}/large_reading.php?action=branch_stats&year=${year_be}&month=${month}`
  const res = await fetch(url, { headers: authHeaders })
  if (!res.ok) throw new Error(`RATS fetch HTTP ${res.status}`)

  const data = await res.json()
  if (!data.ok) throw new Error('RATS returned ok=false')
  return data.rows
}

async function main() {
  const { year_be, month } = currentThaiYearMonth()
  console.log(`Syncing RATS branch_stats: year_be=${year_be} month=${month}`)

  const rows = await fetchBranchStats(year_be, month)
  console.log(`Fetched ${rows.length} rows from RATS`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const records = rows.map((r) => ({
    ba: r.ba,
    year_be,
    month,
    read_count: r.read_count,
    cust_count: r.cust_count,
    target: r.target,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('branch_read_stats')
    .upsert(records, { onConflict: 'ba,year_be,month' })

  if (error) throw new Error(`Supabase upsert error: ${error.message}`)

  console.log(`Done — ${records.length} rows synced to branch_read_stats`)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
