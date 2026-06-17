import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { computeEmaForDateRange } from '@/lib/utils/ema-calc'

const DMAMA_API = 'https://dmama.pwa.co.th/api'
const SECTOR_ID = process.env.DMAMA_SECTOR_ID ?? '1'
const DISTRICT_ID = process.env.DMAMA_DISTRICT_ID ?? '10'

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try { return await fn() } catch (e) { lastError = e }
  }
  throw lastError
}

function parseNumber(val: string | null | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

// "01/05/2569" (Thai Buddhist) → "2026-05-01"
function parseThaiDate(label: string): string | null {
  const m = label.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, beYear] = m
  const ceYear = parseInt(beYear) - 543
  return `${ceYear}-${mm}-${dd}`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// Build list of months from Oct previous fiscal year to current month
function getFiscalMonths(
  fromYear?: number,
  fromMonth?: number,
  toYear?: number,
  toMonth?: number,
): Array<{ year: number; month: number; from: string; to: string }> {
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  const startYear = fromYear ?? (curMonth >= 10 ? curYear : curYear - 1)
  const startMonth = fromMonth ?? 10
  const endYear = toYear ?? curYear
  const endMonth = toMonth ?? curMonth

  const result: Array<{ year: number; month: number; from: string; to: string }> = []
  let y = startYear
  let mo = startMonth

  while (y < endYear || (y === endYear && mo <= endMonth)) {
    const daysInMonth = new Date(y, mo, 0).getDate()
    result.push({
      year: y,
      month: mo,
      from: `${y}-${pad(mo)}-01`,
      to: `${y}-${pad(mo)}-${pad(daysInMonth)}`,
    })
    mo++
    if (mo > 12) {
      mo = 1
      y++
    }
  }

  return result
}

async function fetchMnfRaw(
  token: string,
  branchId: number,
  from: string,
  to: string,
): Promise<{ dataset: unknown[]; meta: { header: Record<string, unknown> } }> {
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
  const res = await fetch(`${DMAMA_API}/report/flow_rate_in_mnf?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

type MnfRecord = {
  dmama_branch_id: number
  logger_id: number
  node_label: string
  record_date: string
  mnf_flow: number | null
  min_pressure: number | null
  mnf_at: string | null
  report_year: number
  report_month: number
  fetched_at: string
}

function parseResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  branchId: number,
  year: number,
  month: number,
  fetchedAt: string,
): MnfRecord[] {
  const header: Record<string, { label: string }> = data?.meta?.header ?? {}
  const dataset: Array<{ label: string; value: Record<string, string | null> }> =
    data?.dataset ?? []

  // Build logger map from header keys (skip "date" key)
  const loggerMap = new Map<string, { logger_id: number; node_label: string }>()
  for (const [key, val] of Object.entries(header)) {
    if (key === 'date') continue
    const m = key.match(/^logger_(\d+)$/)
    if (m) {
      loggerMap.set(key, { logger_id: parseInt(m[1]), node_label: val.label ?? key })
    }
  }

  const records: MnfRecord[] = []

  for (const entry of dataset) {
    const record_date = parseThaiDate(entry.label)
    if (!record_date) continue

    for (const [loggerKey, loggerInfo] of loggerMap) {
      const mnf_flow = parseNumber(entry.value?.[`${loggerKey}_mnf_now`])
      const min_pressure = parseNumber(entry.value?.[`${loggerKey}_min_pressure_now`])
      const mnf_at = entry.value?.[`${loggerKey}_mnf_at`] ?? null

      if (mnf_flow === null && min_pressure === null && mnf_at === null) continue

      records.push({
        dmama_branch_id: branchId,
        logger_id: loggerInfo.logger_id,
        node_label: loggerInfo.node_label,
        record_date,
        mnf_flow,
        min_pressure,
        mnf_at,
        report_year: year,
        report_month: month,
        fetched_at: fetchedAt,
      })
    }
  }

  return records
}

// POST /api/dmama/mnf-sync  (manual trigger)
// GET  /api/dmama/mnf-sync  (Vercel Cron — always sends GET)
// Header: x-sync-secret: <DMAMA_SYNC_SECRET>  (manual)
//         Authorization: Bearer <CRON_SECRET>  (Vercel Cron)
// Query param (optional):
//   ?mode=daily  → ดึงแค่เมื่อวาน (ใช้กับ Cron รายวัน)
// Body (optional, ใช้กับ manual backfill):
//   {}                                              → fiscal year Oct–current month
//   { year: 2026, month: 5 }                       → single month
//   { from_year: 2025, from_month: 10, to_year: 2026, to_month: 5 }  → custom range
async function handler(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.DMAMA_SYNC_SECRET
  const authHeader = req.headers.get('authorization')
  const syncHeader = req.headers.get('x-sync-secret')

  const okCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  const okManual = syncSecret && syncHeader === syncSecret
  if (!okCron && !okManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?mode=daily → ดึงแค่เมื่อวานวันเดียว (ใช้สำหรับ Cron รายวัน)
  const url = new URL(req.url)
  const isDaily = url.searchParams.get('mode') === 'daily'

  let months: ReturnType<typeof getFiscalMonths>

  if (isDaily) {
    const nowBkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    nowBkk.setDate(nowBkk.getDate() - 1)
    const y = nowBkk.getFullYear()
    const m = nowBkk.getMonth() + 1
    months = getFiscalMonths(y, m, y, m)
  } else {
    let body: Record<string, number> = {}
    try {
      body = await req.json()
    } catch {
      // empty body is fine
    }
    months =
      body.year && body.month
        ? getFiscalMonths(body.year, body.month, body.year, body.month)
        : getFiscalMonths(body.from_year, body.from_month, body.to_year, body.to_month)
  }

  // Login to DMAMA (retry 3 ครั้ง)
  let token: string
  try {
    token = await withRetry(async () => {
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
      if (!data.access_token) throw new Error('no access_token')
      return data.access_token as string
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: `dmama login: ${msg}` }, { status: 502 })
  }

  const supabase = await createClient()
  const fetchedAt = new Date().toISOString()

  let totalSynced = 0
  const allErrors: string[] = []

  // Process months sequentially, branches in parallel per month (retry 3 ครั้งต่อสาขา)
  for (const { year, month, from, to } of months) {
    const results = await Promise.allSettled(
      PWA_BRANCHES.map((branch) =>
        withRetry(() => fetchMnfRaw(token, branch.dmama_branch_id, from, to)),
      ),
    )

    const records: MnfRecord[] = []

    results.forEach((result, i) => {
      const branch = PWA_BRANCHES[i]
      if (result.status === 'rejected') {
        allErrors.push(`${year}-${pad(month)} ${branch.name_th}(${branch.dmama_branch_id}): ${result.reason}`)
        return
      }
      records.push(...parseResponse(result.value, branch.dmama_branch_id, year, month, fetchedAt))
    })

    if (records.length === 0) continue

    const { error } = await supabase
      .from('mnf_daily')
      .upsert(records, { onConflict: 'dmama_branch_id,logger_id,record_date' })

    if (error) {
      allErrors.push(`${year}-${pad(month)} Supabase: ${error.message}`)
    } else {
      totalSynced += records.length
    }
  }

  // Recompute EMA for the synced date range
  let emaUpserted = 0
  const emaErrors: string[] = []
  if (months.length > 0) {
    try {
      const emaResult = await computeEmaForDateRange(
        supabase,
        months[0].from,
        months[months.length - 1].to,
      )
      emaUpserted = emaResult.upserted
      emaErrors.push(...(emaResult.errors ?? []))
    } catch (e) {
      emaErrors.push(`EMA compute: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  const combinedErrors = [...allErrors, ...emaErrors]
  return NextResponse.json({
    ok: true,
    months_processed: months.length,
    synced: totalSynced,
    ema_upserted: emaUpserted,
    errors: combinedErrors.length > 0 ? combinedErrors : undefined,
  })
}

// Vercel Cron sends GET — expose the same handler for both methods
export { handler as GET, handler as POST }
