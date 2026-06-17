import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Constants ───────────────────────────────────────────────────────────────
export const EMA_PERIOD     = 14
export const EMA_MULTIPLIER = 2 / (EMA_PERIOD + 1)   // 0.13333...

// Thresholds calibrated from real data (Oct 2025 – May 2026):
// - Even the most stable nodes have day-to-day fluctuation of ±20-30% from EMA
// - WARNING at 10% would fire every day on every node → useless
// - SPIKE at 200% = value is 3× EMA → unambiguous pipe-burst level event
export const WARNING_LIMIT  = 50    // % above EMA → yellow (watch)
export const SPIKE_LIMIT    = 200   // % above EMA → red_spike (emergency)
export const DAYS_TO_ALERT  = 3     // consecutive days above WARNING → red_accumulated

// Node classification filters (based on percentile analysis of real data)
export const MIN_NODE_MEDIAN  = 1.0  // m³/hr — nodes below this are too small to alert on
export const BIMODAL_RATIO    = 0.10 // q1 < median × this → bimodal node (unreliable EMA)
export const NULL_RATIO_LIMIT = 0.60 // >60% null readings → logger unreliable, skip
export const RECENT_NULL_DAYS = 7    // all-null last N days → logger currently offline, skip

// ─── Types ───────────────────────────────────────────────────────────────────
export type AlertStatus  = 'green' | 'yellow' | 'red_spike' | 'red_accumulated'
export type NodeCategory = 'normal' | 'tiny' | 'bimodal' | 'sparse' | 'offline'

export interface DailyFlowInput {
  record_date: string   // 'YYYY-MM-DD'
  mnf_flow: number | null
}

export interface EmaRow {
  record_date: string
  mnf_flow: number | null
  ema_value: number
  diff_percent: number
  consecutive_count: number
  alert_status: AlertStatus
}

export interface NodeClassification {
  category: NodeCategory
  median: number
  q1: number
}

// ─── Node Classification ─────────────────────────────────────────────────────

/**
 * Classify a node based on its historical flow distribution.
 *
 * tiny   — median < 1 m³/hr: too small, not worth alerting on
 * bimodal — q1 < median × 10%: the node has long stretches of near-zero
 *           readings (valve closed / logger offline), EMA would be unreliable
 * normal — everything else: EMA alerting applies
 */
export function classifyNode(validFlows: number[]): NodeClassification {
  if (validFlows.length === 0) return { category: 'tiny', median: 0, q1: 0 }

  const sorted = [...validFlows].sort((a, b) => a - b)
  const n      = sorted.length
  const median = sorted[Math.floor(n * 0.5)]
  const q1     = sorted[Math.floor(n * 0.25)]

  if (median < MIN_NODE_MEDIAN)          return { category: 'tiny',    median, q1 }
  if (q1     < median * BIMODAL_RATIO)   return { category: 'bimodal', median, q1 }
  return { category: 'normal', median, q1 }
}

// ─── Alert Status Derivation ─────────────────────────────────────────────────

export function deriveAlertStatus(diffPct: number, consecutiveCount: number): AlertStatus {
  if (diffPct >= SPIKE_LIMIT)             return 'red_spike'
  if (consecutiveCount >= DAYS_TO_ALERT) return 'red_accumulated'
  if (diffPct >= WARNING_LIMIT)          return 'yellow'
  return 'green'
}

// ─── EMA Series Computation ──────────────────────────────────────────────────

/**
 * Compute EMA-14 series for a single (branch, logger) node.
 *
 * Rules:
 * - Leading nulls → skipped entirely (no output row until first valid value).
 * - First valid value → EMA initialised to that value, diff=0, status=green.
 * - Post-init null days → carry EMA forward, diff=0, consecutive unchanged.
 * - Valid days → EMA updated, diff and consecutive evaluated normally.
 * - consecutive_count resets to 0 when diff drops below WARNING_LIMIT.
 */
export function computeEmaSeries(inputs: DailyFlowInput[]): EmaRow[] {
  const sorted = [...inputs].sort((a, b) => a.record_date.localeCompare(b.record_date))

  const results: EmaRow[] = []
  let emaValue: number | null = null
  let consecutiveCount = 0

  for (const row of sorted) {
    // ── Initialisation phase ──
    if (emaValue === null) {
      if (row.mnf_flow === null) continue
      emaValue = row.mnf_flow
      results.push({
        record_date:      row.record_date,
        mnf_flow:         row.mnf_flow,
        ema_value:        round4(emaValue),
        diff_percent:     0,
        consecutive_count: 0,
        alert_status:     'green',
      })
      continue
    }

    // ── Null day after init ──
    if (row.mnf_flow === null) {
      results.push({
        record_date:      row.record_date,
        mnf_flow:         null,
        ema_value:        round4(emaValue),
        diff_percent:     0,
        consecutive_count: consecutiveCount,
        alert_status:     'green',
      })
      continue
    }

    // ── Normal day ──
    const emaPrev: number = emaValue
    emaValue       = row.mnf_flow * EMA_MULTIPLIER + emaPrev * (1 - EMA_MULTIPLIER)
    const diffPct  = emaPrev !== 0 ? ((row.mnf_flow - emaPrev) / emaPrev) * 100 : 0
    consecutiveCount = diffPct >= WARNING_LIMIT ? consecutiveCount + 1 : 0
    const status   = deriveAlertStatus(diffPct, consecutiveCount)

    results.push({
      record_date:       row.record_date,
      mnf_flow:          row.mnf_flow,
      ema_value:         round4(emaValue),
      diff_percent:      round2(diffPct),
      consecutive_count: consecutiveCount,
      alert_status:      status,
    })
  }

  return results
}

// ─── Range Computation (with DB) ─────────────────────────────────────────────

type NodeKey = string  // `${dmama_branch_id}:${logger_id}`

interface RawRow {
  dmama_branch_id: number
  logger_id:       number
  node_label:      string
  record_date:     string
  mnf_flow:        number | null
}

type EmaRecord = {
  dmama_branch_id:   number
  logger_id:         number
  node_label:        string
  record_date:       string
  mnf_flow:          number | null
  ema_value:         number
  diff_percent:      number
  consecutive_count: number
  alert_status:      AlertStatus
  computed_at:       string
}

/**
 * Compute EMA for all nodes within a date range and upsert results.
 *
 * Steps:
 * 1. Fetch mnf_daily from (fromDate − 60 days) for EMA warm-up.
 * 2. Group by (dmama_branch_id, logger_id).
 * 3. Classify each node — skip 'tiny' and 'bimodal' nodes.
 * 4. Run computeEmaSeries() on 'normal' nodes.
 * 5. Filter output to dates >= fromDate (exclude warm-up rows from upsert).
 * 6. Upsert in chunks of 500.
 */
export async function computeEmaForDateRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  fromDate: string,
  toDate:   string,
): Promise<{ upserted: number; node_pairs: number; skipped: number; errors: string[] }> {
  const warmupFrom  = subtractDays(fromDate, 60)
  const computedAt  = new Date().toISOString()
  const errors: string[] = []

  // Paginate because PostgREST caps max-rows at 1000 per request
  const PAGE = 1000
  const rawRows: RawRow[] = []
  let offset = 0
  while (true) {
    const { data: page, error: fetchErr } = await supabase
      .from('mnf_daily')
      .select('dmama_branch_id, logger_id, node_label, record_date, mnf_flow')
      .gte('record_date', warmupFrom)
      .lte('record_date', toDate)
      .order('record_date', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (fetchErr) {
      return { upserted: 0, node_pairs: 0, skipped: 0, errors: [`fetch mnf_daily: ${fetchErr.message}`] }
    }
    if (!page || page.length === 0) break
    rawRows.push(...(page as RawRow[]))
    if (page.length < PAGE) break
    offset += PAGE
  }

  // ── Group by node ──
  const nodeMap = new Map<NodeKey, {
    meta:   { dmama_branch_id: number; logger_id: number; node_label: string }
    inputs: DailyFlowInput[]
  }>()

  for (const row of (rawRows as RawRow[]) ?? []) {
    const key: NodeKey = `${row.dmama_branch_id}:${row.logger_id}`
    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        meta:   { dmama_branch_id: row.dmama_branch_id, logger_id: row.logger_id, node_label: row.node_label },
        inputs: [],
      })
    }
    nodeMap.get(key)!.inputs.push({ record_date: row.record_date, mnf_flow: row.mnf_flow })
  }

  // ── Classify + compute ──
  const allRecords: EmaRecord[] = []
  let skipped = 0

  for (const { meta, inputs } of nodeMap.values()) {
    const validFlows = inputs
      .map(i => i.mnf_flow)
      .filter((f): f is number => f !== null && f > 0)

    // Skip loggers that are chronically unreliable (too many nulls overall)
    const nullRatio = inputs.length > 0 ? 1 - validFlows.length / inputs.length : 1
    if (nullRatio > NULL_RATIO_LIMIT) { skipped++; continue }

    // Skip loggers that are currently offline (last N days all null)
    const recentInputs = [...inputs]
      .sort((a, b) => b.record_date.localeCompare(a.record_date))
      .slice(0, RECENT_NULL_DAYS)
    const recentAllNull = recentInputs.length > 0 && recentInputs.every(r => r.mnf_flow === null)
    if (recentAllNull) { skipped++; continue }

    const { category } = classifyNode(validFlows)
    if (category !== 'normal') { skipped++; continue }

    const series  = computeEmaSeries(inputs)
    const inRange = series.filter(r => r.record_date >= fromDate && r.record_date <= toDate)

    for (const r of inRange) {
      allRecords.push({
        dmama_branch_id:   meta.dmama_branch_id,
        logger_id:         meta.logger_id,
        node_label:        meta.node_label,
        record_date:       r.record_date,
        mnf_flow:          r.mnf_flow,
        ema_value:         r.ema_value,
        diff_percent:      r.diff_percent,
        consecutive_count: r.consecutive_count,
        alert_status:      r.alert_status,
        computed_at:       computedAt,
      })
    }
  }

  // ── Upsert in chunks of 500 ──
  let totalUpserted = 0
  const CHUNK = 500

  for (let i = 0; i < allRecords.length; i += CHUNK) {
    const chunk = allRecords.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('mnf_ema_daily')
      .upsert(chunk, { onConflict: 'dmama_branch_id,logger_id,record_date' })
    if (error) {
      errors.push(`upsert chunk ${Math.floor(i / CHUNK) + 1}: ${error.message}`)
    } else {
      totalUpserted += chunk.length
    }
  }

  return { upserted: totalUpserted, node_pairs: nodeMap.size, skipped, errors }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round4(n: number): number { return Math.round(n * 10000) / 10000 }
function round2(n: number): number { return Math.round(n * 100)   / 100   }

function subtractDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function pad(n: number) { return String(n).padStart(2, '0') }

/**
 * Build a from/to date range covering fromMonth–toMonth of a fiscal year.
 * Defaults to full current fiscal year (Oct previous year → current month).
 */
export function getFiscalMonthRange(
  fromYear?:  number,
  fromMonth?: number,
  toYear?:    number,
  toMonth?:   number,
): { from: string; to: string } {
  const now      = new Date()
  const curYear  = now.getFullYear()
  const curMonth = now.getMonth() + 1

  const startYear  = fromYear  ?? (curMonth >= 10 ? curYear : curYear - 1)
  const startMonth = fromMonth ?? 10
  const endYear    = toYear    ?? curYear
  const endMonth   = toMonth   ?? curMonth
  const endDay     = new Date(endYear, endMonth, 0).getDate()

  return {
    from: `${startYear}-${pad(startMonth)}-01`,
    to:   `${endYear}-${pad(endMonth)}-${pad(endDay)}`,
  }
}
