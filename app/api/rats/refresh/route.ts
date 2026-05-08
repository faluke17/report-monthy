import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchBranchStats } from '@/lib/rats-api'
import { getPwaSession } from '@/lib/pwa-auth'

// POST /api/rats/refresh — triggered by the client on dashboard load
// Syncs RATS branch_stats for the current Thai month into branch_read_stats
export async function POST() {
  const session = await getPwaSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const year_be = now.getFullYear() + 543
  const month = now.getMonth() + 1

  let rows
  try {
    rows = await fetchBranchStats(year_be, month)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: `RATS API error: ${msg}` }, { status: 502 })
  }

  const records = rows.map((r) => ({
    ba: r.ba,
    year_be,
    month,
    read_count: r.read_count,
    cust_count: r.cust_count,
    target: r.target,
    synced_at: new Date().toISOString(),
  }))

  const supabase = await createClient()
  const { error } = await supabase
    .from('branch_read_stats')
    .upsert(records, { onConflict: 'ba,year_be,month' })

  if (error) return NextResponse.json({ error: `Supabase error: ${error.message}` }, { status: 500 })

  return NextResponse.json({ ok: true, synced: records.length, year_be, month })
}
