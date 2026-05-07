import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'

const DMAMA_API = 'https://dmama.pwa.co.th/api'
const SECTOR_ID = process.env.DMAMA_SECTOR_ID ?? '1'
const DISTRICT_ID = process.env.DMAMA_DISTRICT_ID ?? '10'

function parseNumber(val: string | null | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function cleanLabel(label: string): string {
  return label.replace(/[├└│]/g, '').replace(/\s+/g, ' ').trim()
}

function getPrevMonth(): { year: number; month: number; from: string; to: string } {
  const now = new Date()
  let year = now.getFullYear()
  // getMonth() is 0-indexed current = 1-indexed previous month
  let month = now.getMonth()
  if (month === 0) {
    year--
    month = 12
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  const to = `${year}-${pad(month)}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  return { year, month, from, to }
}

async function fetchBranchNrw(
  token: string,
  branchId: number,
  from: string,
  to: string,
): Promise<Array<{ label: string; value: Record<string, string | null> }>> {
  const params = new URLSearchParams({
    sector_id: SECTOR_ID,
    district_id: DISTRICT_ID,
    branch_id: String(branchId),
    from,
    to,
    date: from,
    frequency: '1440',
    year: from,
    filter_type: 'dma',
    m5: 'false',
    is_target: 'false',
    branches_has_formula: 'false',
    branch_is_potential: 'false',
    branch_is_hire_management: 'false',
    show_ois: 'true',
  })
  const res = await fetch(`${DMAMA_API}/report/non_revenue_water?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.dataset ?? []
}

// POST /api/dmama/sync
// Vercel Cron fires on the 16th of each month at 02:00 UTC (09:00 Bangkok)
// Authorization: Bearer <CRON_SECRET>  OR  x-sync-secret: <DMAMA_SYNC_SECRET>
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.DMAMA_SYNC_SECRET
  const authHeader = req.headers.get('authorization')
  const syncHeader = req.headers.get('x-sync-secret')

  const okCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  const okManual = syncSecret && syncHeader === syncSecret
  if (!okCron && !okManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Login once — reuse token for all branches
  let token: string
  try {
    const res = await fetch(`${DMAMA_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.DMAMA_USERNAME,
        password: process.env.DMAMA_PASSWORD,
        accept: true,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    token = data.access_token
    if (!token) throw new Error('no access_token')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: `dmama login: ${msg}` }, { status: 502 })
  }

  const { year, month, from, to } = getPrevMonth()

  // Fetch all 26 branches in parallel
  const results = await Promise.allSettled(
    PWA_BRANCHES.map((branch) => fetchBranchNrw(token, branch.dmama_branch_id, from, to)),
  )

  const records: {
    dmama_branch_id: number
    report_year: number
    report_month: number
    area_label: string
    area_name: string
    outbound: number | null
    distribute_all: number | null
    fetched_at: string
  }[] = []

  const errors: string[] = []
  const fetched_at = new Date().toISOString()

  results.forEach((result, i) => {
    const branch = PWA_BRANCHES[i]
    if (result.status === 'rejected') {
      errors.push(`${branch.name_th}(${branch.dmama_branch_id}): ${result.reason}`)
      return
    }
    for (const item of result.value) {
      records.push({
        dmama_branch_id: branch.dmama_branch_id,
        report_year: year,
        report_month: month,
        area_label: item.label,
        area_name: cleanLabel(item.label),
        outbound: parseNumber(item.value?.outbound),
        distribute_all: parseNumber(item.value?.distribute_all),
        fetched_at,
      })
    }
  })

  if (records.length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูล', errors }, { status: 502 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('nrw_area_stats')
    .upsert(records, { onConflict: 'dmama_branch_id,report_year,report_month,area_label' })

  if (error) {
    return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    year,
    month,
    synced: records.length,
    branches_ok: results.filter((r) => r.status === 'fulfilled').length,
    branches_failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
