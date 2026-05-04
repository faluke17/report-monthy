import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchBranchStats } from '@/lib/rats-api'

// POST /api/rats/sync
// Body: { year_be: number, month: number }
// Header: x-sync-secret (matches RATS_SYNC_SECRET env var)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.RATS_SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let year_be: number, month: number
  try {
    const body = await req.json()
    year_be = Number(body.year_be)
    month = Number(body.month)
    if (!year_be || !month || month < 1 || month > 12) throw new Error()
  } catch {
    return NextResponse.json({ error: 'ต้องส่ง year_be และ month' }, { status: 400 })
  }

  let rows
  try {
    rows = await fetchBranchStats(year_be, month)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: `RATS API error: ${msg}` }, { status: 502 })
  }

  const supabase = await createClient()

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

  if (error) {
    return NextResponse.json({ error: `Supabase error: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, synced: records.length, year_be, month })
}
