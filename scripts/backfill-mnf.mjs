// node --env-file=.env.local scripts/backfill-mnf.mjs
// Backfill MNF daily data + recompute EMA for a given month (default: current month)
// Usage:
//   node --env-file=.env.local scripts/backfill-mnf.mjs            → current month
//   node --env-file=.env.local scripts/backfill-mnf.mjs 2026 5     → May 2026

import { createClient } from '@supabase/supabase-js'

const DMAMA_API   = 'https://dmama.pwa.co.th/api'
const SECTOR_ID   = process.env.DMAMA_SECTOR_ID  ?? '1'
const DISTRICT_ID = process.env.DMAMA_DISTRICT_ID ?? '10'

const PWA_BRANCHES = [
  { name_th: 'นครสวรรค์',      dmama_branch_id: 29 },
  { name_th: 'ท่าตะโก',        dmama_branch_id: 30 },
  { name_th: 'ลาดยาว',         dmama_branch_id: 31 },
  { name_th: 'พยุหะคีรี',      dmama_branch_id: 32 },
  { name_th: 'ชัยนาท',         dmama_branch_id: 33 },
  { name_th: 'อุทัยธานี',      dmama_branch_id: 34 },
  { name_th: 'กำแพงเพชร',      dmama_branch_id: 35 },
  { name_th: 'ขาณุวรลักษบุรี', dmama_branch_id: 36 },
  { name_th: 'ตาก',            dmama_branch_id: 37 },
  { name_th: 'แม่สอด',         dmama_branch_id: 38 },
  { name_th: 'สุโขทัย',        dmama_branch_id: 39 },
  { name_th: 'ทุ่งเสลี่ยม',    dmama_branch_id: 40 },
  { name_th: 'ศรีสำโรง',       dmama_branch_id: 41 },
  { name_th: 'สวรรคโลก',       dmama_branch_id: 42 },
  { name_th: 'ศรีสัชนาลัย',    dmama_branch_id: 43 },
  { name_th: 'อุตรดิตถ์',      dmama_branch_id: 44 },
  { name_th: 'พิษณุโลก',       dmama_branch_id: 45 },
  { name_th: 'นครไทย',         dmama_branch_id: 46 },
  { name_th: 'พิจิตร',         dmama_branch_id: 47 },
  { name_th: 'บางมูลนาก',      dmama_branch_id: 48 },
  { name_th: 'ตะพานหิน',       dmama_branch_id: 49 },
  { name_th: 'เพชรบูรณ์',      dmama_branch_id: 50 },
  { name_th: 'หล่มสัก',        dmama_branch_id: 51 },
  { name_th: 'ชนแดน',          dmama_branch_id: 52 },
  { name_th: 'หนองไผ่',        dmama_branch_id: 53 },
  { name_th: 'วิเชียรบุรี',    dmama_branch_id: 54 },
]

// ─── EMA constants (mirrors ema-calc.ts) ────────────────────────────────────
const EMA_PERIOD     = 14
const EMA_MULTIPLIER = 2 / (EMA_PERIOD + 1)  // 0.13333
const WARNING_LIMIT  = 50
const SPIKE_LIMIT    = 200
const DAYS_TO_ALERT  = 3
const MIN_NODE_MEDIAN = 1.0
const BIMODAL_RATIO   = 0.10

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }
function round4(n) { return Math.round(n * 10000) / 10000 }
function round2(n) { return Math.round(n * 100)   / 100   }

function parseNumber(val) {
  if (!val) return null
  const n = parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function parseThaiDate(label) {
  const m = label.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, beYear] = m
  return `${parseInt(beYear) - 543}-${mm}-${dd}`
}

function subtractDays(isoDate, days) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// ─── EMA logic ───────────────────────────────────────────────────────────────
function classifyNode(validFlows) {
  if (validFlows.length === 0) return { category: 'tiny' }
  const sorted = [...validFlows].sort((a, b) => a - b)
  const n      = sorted.length
  const median = sorted[Math.floor(n * 0.5)]
  const q1     = sorted[Math.floor(n * 0.25)]
  if (median < MIN_NODE_MEDIAN)        return { category: 'tiny' }
  if (q1 < median * BIMODAL_RATIO)     return { category: 'bimodal' }
  return { category: 'normal' }
}

function deriveAlertStatus(diffPct, consecutiveCount) {
  if (Math.abs(diffPct) >= SPIKE_LIMIT)  return 'red_spike'
  if (consecutiveCount >= DAYS_TO_ALERT) return 'red_accumulated'
  if (diffPct >= WARNING_LIMIT)          return 'yellow'
  return 'green'
}

function computeEmaSeries(inputs) {
  const sorted = [...inputs].sort((a, b) => a.record_date.localeCompare(b.record_date))
  const results = []
  let emaValue = null
  let consecutiveCount = 0

  for (const row of sorted) {
    if (emaValue === null) {
      if (row.mnf_flow === null) continue
      emaValue = row.mnf_flow
      results.push({ record_date: row.record_date, mnf_flow: row.mnf_flow,
        ema_value: round4(emaValue), diff_percent: 0, consecutive_count: 0, alert_status: 'green' })
      continue
    }
    if (row.mnf_flow === null) {
      results.push({ record_date: row.record_date, mnf_flow: null,
        ema_value: round4(emaValue), diff_percent: 0, consecutive_count: consecutiveCount, alert_status: 'green' })
      continue
    }
    const emaPrev = emaValue
    emaValue = row.mnf_flow * EMA_MULTIPLIER + emaPrev * (1 - EMA_MULTIPLIER)
    const diffPct = emaPrev !== 0 ? ((row.mnf_flow - emaPrev) / emaPrev) * 100 : 0
    consecutiveCount = diffPct >= WARNING_LIMIT ? consecutiveCount + 1 : 0
    results.push({ record_date: row.record_date, mnf_flow: row.mnf_flow,
      ema_value: round4(emaValue), diff_percent: round2(diffPct),
      consecutive_count: consecutiveCount, alert_status: deriveAlertStatus(diffPct, consecutiveCount) })
  }
  return results
}

// ─── DMAMA API ────────────────────────────────────────────────────────────────
async function dmamaLogin() {
  const res = await fetch(`${DMAMA_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.DMAMA_USERNAME, password: process.env.DMAMA_PASSWORD, accept: true }),
  })
  if (!res.ok) throw new Error(`dmama login HTTP ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('dmama login: no access_token')
  return data.access_token
}

async function fetchMnfRaw(token, branchId, from, to) {
  const params = new URLSearchParams({
    sector_id: SECTOR_ID, district_id: DISTRICT_ID,
    branch_id: String(branchId), from, to, date: from,
    frequency: '1440', year: from, filter_type: 'dma',
    m5: 'false', is_target: 'false', branches_has_formula: 'false',
    branch_is_potential: 'false', branch_is_hire_management: 'false', show_ois: 'true',
  })
  const res = await fetch(`${DMAMA_API}/report/flow_rate_in_mnf?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function parseResponse(data, branchId, year, month, fetchedAt) {
  const header  = data?.meta?.header ?? {}
  const dataset = data?.dataset ?? []

  const loggerMap = new Map()
  for (const [key, val] of Object.entries(header)) {
    if (key === 'date') continue
    const m = key.match(/^logger_(\d+)$/)
    if (m) loggerMap.set(key, { logger_id: parseInt(m[1]), node_label: val.label ?? key })
  }

  const records = []
  for (const entry of dataset) {
    const record_date = parseThaiDate(entry.label)
    if (!record_date) continue
    for (const [loggerKey, loggerInfo] of loggerMap) {
      const mnf_flow     = parseNumber(entry.value?.[`${loggerKey}_mnf_now`])
      const min_pressure = parseNumber(entry.value?.[`${loggerKey}_min_pressure_now`])
      const mnf_at       = entry.value?.[`${loggerKey}_mnf_at`] ?? null
      if (mnf_flow === null && min_pressure === null && mnf_at === null) continue
      records.push({ dmama_branch_id: branchId, logger_id: loggerInfo.logger_id,
        node_label: loggerInfo.node_label, record_date, mnf_flow, min_pressure, mnf_at,
        report_year: year, report_month: month, fetched_at: fetchedAt })
    }
  }
  return records
}

// ─── EMA recompute ────────────────────────────────────────────────────────────
async function recomputeEma(supabase, fromDate, toDate) {
  const warmupFrom = subtractDays(fromDate, 60)
  const computedAt = new Date().toISOString()
  const errors = []

  console.log(`  EMA: fetching mnf_daily from ${warmupFrom} to ${toDate} ...`)

  const PAGE = 1000
  const rawRows = []
  let offset = 0
  while (true) {
    const { data: page, error } = await supabase
      .from('mnf_daily')
      .select('dmama_branch_id, logger_id, node_label, record_date, mnf_flow')
      .gte('record_date', warmupFrom)
      .lte('record_date', toDate)
      .order('record_date', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) { errors.push(`fetch: ${error.message}`); break }
    if (!page || page.length === 0) break
    rawRows.push(...page)
    if (page.length < PAGE) break
    offset += PAGE
  }
  console.log(`  EMA: ${rawRows.length} raw rows loaded`)

  const nodeMap = new Map()
  for (const row of rawRows) {
    const key = `${row.dmama_branch_id}:${row.logger_id}`
    if (!nodeMap.has(key)) {
      nodeMap.set(key, { meta: { dmama_branch_id: row.dmama_branch_id, logger_id: row.logger_id, node_label: row.node_label }, inputs: [] })
    }
    nodeMap.get(key).inputs.push({ record_date: row.record_date, mnf_flow: row.mnf_flow })
  }

  const allRecords = []
  let skipped = 0
  for (const { meta, inputs } of nodeMap.values()) {
    const validFlows = inputs.map(i => i.mnf_flow).filter(f => f !== null && f > 0)
    const { category } = classifyNode(validFlows)
    if (category !== 'normal') { skipped++; continue }
    const series  = computeEmaSeries(inputs)
    const inRange = series.filter(r => r.record_date >= fromDate && r.record_date <= toDate)
    for (const r of inRange) {
      allRecords.push({ ...meta, ...r, computed_at: computedAt })
    }
  }

  console.log(`  EMA: ${nodeMap.size} nodes, ${skipped} skipped, ${allRecords.length} rows to upsert`)

  const CHUNK = 500
  let totalUpserted = 0
  for (let i = 0; i < allRecords.length; i += CHUNK) {
    const chunk = allRecords.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('mnf_ema_daily')
      .upsert(chunk, { onConflict: 'dmama_branch_id,logger_id,record_date' })
    if (error) errors.push(`upsert chunk ${Math.floor(i / CHUNK) + 1}: ${error.message}`)
    else totalUpserted += chunk.length
  }

  return { upserted: totalUpserted, errors }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const now = new Date()
  const year  = parseInt(process.argv[2] ?? now.getFullYear())
  const month = parseInt(process.argv[3] ?? (now.getMonth() + 1))
  const daysInMonth = new Date(year, month, 0).getDate()
  const from  = `${year}-${pad(month)}-01`
  const to    = `${year}-${pad(month)}-${pad(daysInMonth)}`

  console.log(`\n=== MNF Backfill: ${year}-${pad(month)} (${from} → ${to}) ===\n`)

  const token = await dmamaLogin()
  console.log('DMAMA login OK')

  const fetchedAt = new Date().toISOString()
  const results = await Promise.allSettled(
    PWA_BRANCHES.map(b => fetchMnfRaw(token, b.dmama_branch_id, from, to))
  )

  const records = []
  results.forEach((result, i) => {
    const branch = PWA_BRANCHES[i]
    if (result.status === 'rejected') {
      console.warn(`  WARN ${branch.name_th}(${branch.dmama_branch_id}): ${result.reason}`)
      return
    }
    const parsed = parseResponse(result.value, branch.dmama_branch_id, year, month, fetchedAt)
    records.push(...parsed)
    console.log(`  OK  ${branch.name_th}(${branch.dmama_branch_id}): ${parsed.length} records`)
  })

  console.log(`\nTotal mnf_daily records: ${records.length}`)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  if (records.length > 0) {
    const { error } = await supabase
      .from('mnf_daily')
      .upsert(records, { onConflict: 'dmama_branch_id,logger_id,record_date' })
    if (error) throw new Error(`mnf_daily upsert: ${error.message}`)
    console.log(`mnf_daily upserted OK`)
  }

  console.log(`\nRecomputing EMA...`)
  const ema = await recomputeEma(supabase, from, to)
  if (ema.errors.length > 0) console.error('EMA errors:', ema.errors)
  console.log(`\n=== Done — mnf_ema_daily upserted: ${ema.upserted} rows ===\n`)
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
