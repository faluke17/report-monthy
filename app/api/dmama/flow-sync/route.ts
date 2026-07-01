/**
 * POST /api/dmama/flow-sync
 *
 * Sync น้ำจ่ายรายวันจาก DMAMA → ทำความสะอาดข้อมูล → คำนวณ NRW ต่อ node
 *
 * Body (optional):
 *   { year: 2026, month: 5 }   → เดือนที่ระบุ
 *   {}                          → เดือนก่อนหน้า (default)
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>   (Vercel Cron)
 *   x-sync-secret: <DMAMA_SYNC_SECRET>    (manual trigger)
 *
 * ขั้นตอน:
 *   1. ดึง water_nodes ทั้งหมดจาก Supabase (พร้อม logger_id, parent_id, self_supply)
 *   2. Map branches.name_th → dmama_branch_id ผ่าน PWA_BRANCHES
 *   3. สำหรับแต่ละสาขา fetch DMAMA water_flow_through_meter_monthly
 *   4. Clean ข้อมูล per-logger ด้วย flow-cleaner (port ของ JAVIS agent2)
 *   5. Upsert → node_flow_daily
 *   6. คำนวณ gross_flow, net_flow (tree subtraction สำหรับ MM self_supply=true)
 *   7. ดึง distribute_all จาก nrw_area_stats ผ่าน dmama_area_label
 *   8. คำนวณ NRW% → Upsert → node_nrw_monthly
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { cleanLoggerSeries, type DailyReading } from '@/lib/utils/flow-cleaner'

export const maxDuration = 300 // ต้องการ Vercel Pro plan (Hobby limit 60s)

const DMAMA_API = 'https://dmama.pwa.co.th/api'
const SECTOR_ID = process.env.DMAMA_SECTOR_ID ?? '1'
const DISTRICT_ID = process.env.DMAMA_DISTRICT_ID ?? '10'

// ─── Helpers ────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getPrevMonth(): { year: number; month: number } {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() // 0-indexed → current-1
  if (month === 0) {
    year--
    month = 12
  }
  return { year, month }
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const n = parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

// "01/05/2569" → 1 (วันที่ 1)
function parseDayNum(label: string): number | null {
  const d = parseInt(label.split('/')[0])
  return isNaN(d) ? null : d
}

// ลบ tree chars ออก ("├ DMA-01" → "DMA-01") สำหรับ match area_label
function stripTreeChars(s: string): string {
  return s.replace(/[├└│]/g, '').replace(/\s+/g, ' ').trim()
}

// ─── DMAMA API ───────────────────────────────────────────────────────────────

async function dmamaLogin(): Promise<string> {
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
}

type DmamaDataset = { label: string; value: Record<string, string | null> }[]

async function fetchFlowDataset(
  token: string,
  branchId: number,
  year: number,
  month: number,
): Promise<DmamaDataset> {
  const daysInMonth = new Date(year, month, 0).getDate()
  const fromStr = `${year}-${pad(month)}-01 08:00:00`
  const toStr = `${year}-${pad(month)}-${pad(daysInMonth)} 08:00:00`

  const params = new URLSearchParams({
    sector_id: SECTOR_ID,
    district_id: DISTRICT_ID,
    branch_id: String(branchId),
    from: fromStr,
    to: toStr,
    date: fromStr,
    frequency: '1440',
    year: fromStr,
    filter_type: 'dma',
    m5: 'false',
    is_target: 'false',
    branches_has_formula: 'false',
    branch_is_potential: 'false',
    branch_is_hire_management: 'false',
    show_ois: 'true',
  })

  const res = await fetch(
    `${DMAMA_API}/report/water_flow_through_meter_monthly?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.dataset ?? []) as DmamaDataset
}

// ─── Types ───────────────────────────────────────────────────────────────────

type WaterNode = {
  id: string
  code: string
  logger_id: string | null
  parent_id: string | null
  node_type: string // MM | DMA | SUB | VD
  self_supply: boolean
  dmama_area_label: string | null
  branch_id: string
  dmama_branch_id: number // คำนวณจาก branch.name_th → PWA_BRANCHES
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.DMAMA_SYNC_SECRET
  const authHeader = req.headers.get('authorization')
  const syncHeader = req.headers.get('x-sync-secret')
  const okCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  const okManual = syncSecret && syncHeader === syncSecret
  if (!okCron && !okManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse target month
  let year: number
  let month: number
  try {
    const body = await req.json()
    year = body.year
    month = body.month
  } catch {
    ;({ year, month } = getPrevMonth())
  }
  if (!year || !month) {
    ;({ year, month } = getPrevMonth())
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const supabase = await createClient()
  const syncedAt = new Date().toISOString()

  // ── 1. Login DMAMA ─────────────────────────────────────────────────────────
  let token: string
  try {
    token = await dmamaLogin()
  } catch (e) {
    return NextResponse.json(
      { error: `dmama login: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 502 },
    )
  }

  // ── 2. Load branches: id → dmama_branch_id ─────────────────────────────────
  const { data: branchRows, error: branchErr } = await supabase
    .from('branches')
    .select('id, name_th')
  if (branchErr || !branchRows) {
    return NextResponse.json({ error: `load branches: ${branchErr?.message}` }, { status: 500 })
  }

  const nameToId = new Map(PWA_BRANCHES.map((b) => [b.name_th, b.dmama_branch_id]))
  const branchIdToDmama = new Map<string, number>(
    branchRows.map((b) => [b.id, nameToId.get(b.name_th) ?? 0]),
  )

  // ── 3. Load all active water_nodes ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nodesRaw, error: nodesErr } = await (supabase as any)
    .from('water_nodes')
    .select('id, code, logger_id, parent_id, node_type, self_supply, dmama_area_label, branch_id')
    .eq('is_active', true)

  if (nodesErr || !nodesRaw) {
    return NextResponse.json({ error: `load nodes: ${nodesErr?.message}` }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allNodes: WaterNode[] = nodesRaw.map((n: any) => ({
    ...n,
    dmama_branch_id: branchIdToDmama.get(n.branch_id) ?? 0,
  }))

  // Group nodes-with-logger by dmama_branch_id
  const nodesWithLogger = allNodes.filter((n) => n.logger_id && n.dmama_branch_id > 0)
  const byBranch = new Map<number, WaterNode[]>()
  for (const node of nodesWithLogger) {
    if (!byBranch.has(node.dmama_branch_id)) byBranch.set(node.dmama_branch_id, [])
    byBranch.get(node.dmama_branch_id)!.push(node)
  }

  // ── 4. Fetch DMAMA + clean per-logger, build daily rows ──────────────────
  type DailyRow = {
    water_node_id: string
    report_year: number
    report_month: number
    day_num: number
    raw_value: number | null
    cleaned_value: number
    flag: string
    fill_median: number | null
    synced_at: string
  }

  const dailyRows: DailyRow[] = []
  const grossFlowByNode = new Map<string, number>()
  const daysDataByNode = new Map<string, number>()
  const hasDeviceFailByNode = new Map<string, boolean>()
  const fetchErrors: string[] = []

  const branchEntries = Array.from(byBranch.entries())
  const branchResults = await Promise.allSettled(
    branchEntries.map(async ([dmamaBranchId, nodes]) => {
      const dataset = await fetchFlowDataset(token, dmamaBranchId, year, month)

      // Build day → { loggerKey → value } lookup
      const dayMap = new Map<number, Record<string, number | null>>()
      for (const entry of dataset) {
        const dayNum = parseDayNum(entry.label)
        if (!dayNum) continue
        const vals: Record<string, number | null> = {}
        for (const [k, v] of Object.entries(entry.value ?? {})) {
          vals[k] = parseNumber(v)
        }
        dayMap.set(dayNum, vals)
      }

      for (const node of nodes) {
        if (!node.logger_id) continue

        // Collect readings for each day of the month
        const readings: DailyReading[] = []
        for (let d = 1; d <= daysInMonth; d++) {
          const dayVals = dayMap.get(d)
          readings.push({
            day_num: d,
            raw_value: dayVals ? (dayVals[node.logger_id] ?? null) : null,
          })
        }

        const cleaned = cleanLoggerSeries(readings)

        let gross = 0
        let daysData = 0
        let hasDF = false

        for (const c of cleaned) {
          dailyRows.push({
            water_node_id: node.id,
            report_year: year,
            report_month: month,
            day_num: c.day_num,
            raw_value: c.raw_value,
            cleaned_value: c.cleaned_value,
            flag: c.flag,
            fill_median: c.flag !== 'ok' ? c.fill_median : null,
            synced_at: syncedAt,
          })
          gross += c.cleaned_value
          if (c.raw_value !== null) daysData++
          if (c.flag === 'DEVICE_FAIL') hasDF = true
        }

        grossFlowByNode.set(node.id, Math.round(gross * 100) / 100)
        daysDataByNode.set(node.id, daysData)
        hasDeviceFailByNode.set(node.id, hasDF)
      }
    }),
  )

  branchResults.forEach((r, i) => {
    if (r.status === 'rejected') {
      const branchId = branchEntries[i][0]
      fetchErrors.push(`branch ${branchId}: ${r.reason}`)
    }
  })

  // ── 5. Upsert daily rows in chunks of 500 ─────────────────────────────────
  const CHUNK = 500
  let dailyUpserted = 0
  const dailyErrors: string[] = []

  for (let i = 0; i < dailyRows.length; i += CHUNK) {
    const chunk = dailyRows.slice(i, i + CHUNK)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('node_flow_daily')
      .upsert(chunk, { onConflict: 'water_node_id,report_year,report_month,day_num' })
    if (error) dailyErrors.push(error.message)
    else dailyUpserted += chunk.length
  }

  // ── 6. Build parent→children map for tree calculation ─────────────────────
  const childrenOf = new Map<string, string[]>()
  for (const node of allNodes) {
    if (node.parent_id) {
      if (!childrenOf.has(node.parent_id)) childrenOf.set(node.parent_id, [])
      childrenOf.get(node.parent_id)!.push(node.id)
    }
  }

  // ── 7. Fetch distribute_all from nrw_area_stats ──────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: areaStats } = await (supabase as any)
    .from('nrw_area_stats')
    .select('area_label, area_name, dmama_branch_id, distribute_all')
    .eq('report_year', year)
    .eq('report_month', month)

  // Primary: match via node.dmama_area_label (ถ้าถูก set)
  const distByLabel = new Map<string, number>()
  // Fallback: match via node.code against area_name (per dmama_branch_id)
  type AreaEntry = { area_name: string; distribute_all: number }
  const distByBranch = new Map<number, AreaEntry[]>()

  for (const row of areaStats ?? []) {
    if (row.distribute_all == null) continue
    if (row.area_label) {
      distByLabel.set(row.area_label.trim(), row.distribute_all)
      distByLabel.set(stripTreeChars(row.area_label), row.distribute_all)
    }
    if (row.area_name && row.dmama_branch_id) {
      if (!distByBranch.has(row.dmama_branch_id)) distByBranch.set(row.dmama_branch_id, [])
      distByBranch.get(row.dmama_branch_id)!.push({ area_name: row.area_name.trim(), distribute_all: row.distribute_all })
    }
  }

  // ดึงส่วน code มาตรฐาน (ก่อน Thai chars) เช่น "DMA-08บ้านสักหลง" → "DMA-08"
  function codePrefix(code: string): string {
    const m = code.match(/^([A-Za-z0-9-]+)/)
    return m ? m[1] : code
  }

  // ── 8. Compute node_nrw_monthly ───────────────────────────────────────────
  type NrwRow = {
    water_node_id: string
    report_year: number
    report_month: number
    gross_flow: number | null
    net_flow: number | null
    days_data: number | null
    days_total: number
    has_device_fail: boolean
    distribute_all: number | null
    nrw_pct: number | null
    data_source: string
    computed_at: string
  }

  const computedAt = new Date().toISOString()
  const nrwRows: NrwRow[] = []

  for (const node of allNodes) {
    const gross = grossFlowByNode.get(node.id) ?? null
    const daysData = daysDataByNode.get(node.id) ?? null
    const hasDF = hasDeviceFailByNode.get(node.id) ?? false

    let netFlow: number | null = null
    let dataSource = 'no_logger'

    if (gross !== null) {
      dataSource = hasDF ? 'device_fail' : 'dmama_logger'

      if (node.node_type === 'MM' && node.self_supply) {
        // MM_net = gross - Σ direct child DMA gross flows
        const childIds = childrenOf.get(node.id) ?? []
        const childGrossSum = childIds.reduce(
          (sum, cid) => sum + (grossFlowByNode.get(cid) ?? 0),
          0,
        )
        netFlow = Math.round((gross - childGrossSum) * 100) / 100
      } else {
        // DMA / MM without own customers → net = gross
        netFlow = gross
      }
    }

    // Match distribute_all — primary: dmama_area_label, fallback: node.code vs area_name
    let distAll: number | null = null
    if (node.dmama_area_label) {
      const label = node.dmama_area_label.trim()
      distAll = distByLabel.get(label) ?? distByLabel.get(stripTreeChars(label)) ?? null
    }
    if (distAll === null && node.dmama_branch_id > 0) {
      const entries = distByBranch.get(node.dmama_branch_id) ?? []
      const prefix = codePrefix(node.code)
      for (const entry of entries) {
        const n = entry.area_name
        if (n === node.code || n === prefix || n.startsWith(prefix + ' ') || n.startsWith(prefix + '-')) {
          distAll = entry.distribute_all
          break
        }
      }
    }

    let nrwPct: number | null = null
    if (netFlow !== null && netFlow > 0 && distAll !== null) {
      nrwPct = Math.round(((netFlow - distAll) / netFlow) * 10000) / 100
    }

    nrwRows.push({
      water_node_id: node.id,
      report_year: year,
      report_month: month,
      gross_flow: gross,
      net_flow: netFlow,
      days_data: daysData,
      days_total: daysInMonth,
      has_device_fail: hasDF,
      distribute_all: distAll,
      nrw_pct: nrwPct,
      data_source: dataSource,
      computed_at: computedAt,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: nrwErr } = await (supabase as any)
    .from('node_nrw_monthly')
    .upsert(nrwRows, { onConflict: 'water_node_id,report_year,report_month' })

  const allErrors = [
    ...fetchErrors,
    ...dailyErrors,
    ...(nrwErr ? [`nrw_upsert: ${nrwErr.message}`] : []),
  ]

  // สรุป nodes ที่มีปัญหา
  const deviceFailNodes = allNodes
    .filter((n) => hasDeviceFailByNode.get(n.id))
    .map((n) => n.id)

  const noDataNodes = nodesWithLogger.filter(
    (n) => daysDataByNode.get(n.id) === 0,
  ).length

  return NextResponse.json({
    ok: allErrors.length === 0,
    year,
    month,
    daily_upserted: dailyUpserted,
    nrw_rows: nrwRows.length,
    nodes_with_logger: nodesWithLogger.length,
    device_fail_nodes: deviceFailNodes.length,
    no_raw_data_nodes: noDataNodes,
    errors: allErrors.length > 0 ? allErrors : undefined,
  })
}
