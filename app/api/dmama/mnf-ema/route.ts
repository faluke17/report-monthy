import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeEmaForDateRange, getFiscalMonthRange } from '@/lib/utils/ema-calc'

// POST /api/dmama/mnf-ema
// Standalone EMA recompute — same auth gates as mnf-sync
// Body (optional):
//   {}                                                   → full fiscal year
//   { year: 2026, month: 5 }                             → single month
//   { from_year: 2025, from_month: 10, to_year: 2026, to_month: 5 } → custom range
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.DMAMA_SYNC_SECRET
  const authHeader = req.headers.get('authorization')
  const syncHeader = req.headers.get('x-sync-secret')

  const okCron   = cronSecret && authHeader === `Bearer ${cronSecret}`
  const okManual = syncSecret && syncHeader === syncSecret
  if (!okCron && !okManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, number> = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine
  }

  const range =
    body.year && body.month
      ? getFiscalMonthRange(body.year, body.month, body.year, body.month)
      : getFiscalMonthRange(body.from_year, body.from_month, body.to_year, body.to_month)

  const supabase = await createClient()
  const result = await computeEmaForDateRange(supabase, range.from, range.to)

  return NextResponse.json({
    ok: true,
    from: range.from,
    to: range.to,
    upserted: result.upserted,
    node_pairs: result.node_pairs,
    skipped: result.skipped,
    errors: result.errors.length > 0 ? result.errors : undefined,
  })
}
