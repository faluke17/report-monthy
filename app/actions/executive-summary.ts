'use server'

import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { getDmamabranchId } from '@/lib/utils/pwa-branches'

export interface NrwTrendPoint {
  month: number
  year: number
  nrw_pct: number | null
}

export interface DmaStatRow {
  id: string
  dmama_branch_id: number
  report_year: number
  report_month: number
  area_label: string
  area_name: string
  outbound: number | null
  distribute_all: number | null
  water_loss: number
}

export interface MnfNodeRow {
  node_label: string
  record_date: string
  mnf_flow: number | null
  ema_value: number
  diff_percent: number
  consecutive_count: number
  alert_status: string
}

export interface ObstacleRow {
  id: string
  code: string
  category: string
  obstacle_type: string
  status: string
  progress_pct: number
  due_date: string | null
  last_log_message: string | null
  priority_order: number | null
}

export interface BranchExecutiveSummary {
  branch: {
    id: string
    code: string
    name_th: string
    province_th: string
  }
  nrw: {
    current_pct: number | null
    prev_month_pct: number | null
    yoy_pct: number | null
    water_produced: number | null
    water_sold: number | null
    yoy_produced: number | null
    yoy_sold: number | null
    trend_12m: NrwTrendPoint[]
    leaks_found: number
    leaks_repaired: number
    leaks_pending: number
    mnf_factor: number | null
    volume_distributed: number | null
    report_status: string | null
    report_month: number | null
    report_year: number | null
  }
  pdca: {
    do_text: string | null
    act_text: string | null
    report_month: number | null
    report_year: number | null
  } | null
  budget_2569: {
    total: number
    by_phase: number[]
    overdue: number
    done_pct: number
    projects: { name: string; phase: number; overdue: boolean }[]
  } | null
  dmaStats: DmaStatRow[]
  obstacles: ObstacleRow[]
  mnfNodes: MnfNodeRow[]
}

const FISCAL_YEAR = 2569

// nrw_branch_monthly ใช้ fiscal_year (พ.ศ.) กับ month
// toFiscalYear: Gregorian year + month → fiscal_year พ.ศ.
function toFiscalYear(gregorianYear: number, month: number): number {
  return month >= 10 ? gregorianYear + 543 + 1 : gregorianYear + 543
}

// fyToGregorianYear: fiscal_year (พ.ศ.) + month → Gregorian year
function fyToGregorianYear(fiscalYear: number, month: number): number {
  return month >= 10 ? fiscalYear - 543 - 1 : fiscalYear - 543
}

type NrwMonthRow = {
  fiscal_year: number
  month: number
  water_produced: number | null
  water_sold: number | null
  water_free: number | null
  blow_off: number | null
}

function calcNrwPct(row: NrwMonthRow | null): number | null {
  if (!row?.water_produced) return null
  const loss = (row.water_produced ?? 0)
    - (row.water_sold ?? 0)
    - (row.water_free ?? 0)
    - (row.blow_off ?? 0)
  return loss >= 0 ? (loss / row.water_produced) * 100 : null
}

export async function getExecutiveBranchSummary(
  branchId: string
): Promise<{ data: BranchExecutiveSummary | null; error: string | null }> {
  const session = await getPwaSession()
  if (!session) return { data: null, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // last 12 months (Gregorian)
  const months12: { year: number; month: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    months12.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  // Phase 1 — get branch first (need name_th to query nrw_branch_monthly)
  const branchRes = await supabase
    .from('branches')
    .select('id,code,name_th,province_th')
    .eq('id', branchId)
    .single()

  if (branchRes.error || !branchRes.data) {
    return { data: null, error: 'ไม่พบข้อมูลสาขา' }
  }

  const dmamaId = getDmamabranchId(branchRes.data.name_th) ?? null

  // Phase 2 — parallel: operational data + NRW official + budget + new panels
  const [reportsRes, nrwMonthlyRes, budgetYearRes, dmaRaw, obstaclesRes, mnfRes] = await Promise.all([
    // monthly_reports: operational data (leaks, MNF, PDCA, status)
    supabase
      .from('monthly_reports')
      .select('report_year,report_month,mnf_factor,leaks_found,leaks_repaired,leaks_pending,volume_distributed,status,pdca_do,pdca_act')
      .eq('branch_id', branchId)
      .order('report_year', { ascending: false })
      .order('report_month', { ascending: false })
      .limit(13),

    // nrw_branch_monthly: NRW% official (ที่เขตกรอกเอง) — join via branch_name
    (supabase as any)
      .from('nrw_branch_monthly')
      .select('fiscal_year,month,water_produced,water_sold,water_free,blow_off')
      .eq('branch_name', branchRes.data.name_th)
      .order('fiscal_year', { ascending: false })
      .order('month', { ascending: false })
      .limit(14),

    // budget year id
    (supabase as any)
      .from('budget_years')
      .select('id')
      .eq('fiscal_year', FISCAL_YEAR)
      .maybeSingle(),

    // DMA area stats — latest synced period
    dmamaId != null
      ? supabase
          .from('nrw_area_stats')
          .select('id,dmama_branch_id,report_year,report_month,area_label,area_name,outbound,distribute_all')
          .eq('dmama_branch_id', dmamaId)
          .order('report_year', { ascending: false })
          .order('report_month', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),

    // Open obstacles
    supabase
      .from('obstacles')
      .select('id,code,category,obstacle_type,status,progress_pct,due_date,last_log_message,priority_order')
      .eq('branch_id', branchId)
      .neq('status', 'ปิดประเด็น')
      .order('priority_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(10),

    // MNF per-node (latest EMA)
    dmamaId != null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase as any)
          .from('mnf_ema_latest')
          .select('node_label,record_date,mnf_flow,ema_value,diff_percent,consecutive_count,alert_status')
          .eq('dmama_branch_id', dmamaId)
          .order('diff_percent', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ])

  const reports = reportsRes.data ?? []
  const latestReport = reports[0] ?? null
  const todayStr = now.toISOString().slice(0, 10)

  // NRW% + trend จาก nrw_branch_monthly (official source)
  const nrwRows = (nrwMonthlyRes.data ?? []) as NrwMonthRow[]
  const nrwMap = new Map(
    nrwRows.map((r) => [`${r.fiscal_year}-${String(r.month).padStart(2, '0')}`, r])
  )
  const trend_12m: NrwTrendPoint[] = months12.map(({ year, month }) => {
    const fy = toFiscalYear(year, month)
    const key = `${fy}-${String(month).padStart(2, '0')}`
    return { year, month, nrw_pct: calcNrwPct(nrwMap.get(key) ?? null) }
  })
  const latestNrw = nrwRows[0] ?? null
  const prevNrw   = nrwRows[1] ?? null
  const current_pct     = calcNrwPct(latestNrw)
  const prev_month_pct  = calcNrwPct(prevNrw)

  // YoY — same month last fiscal year
  const yoyNrw = latestNrw
    ? nrwRows.find((r) => r.month === latestNrw.month && r.fiscal_year === latestNrw.fiscal_year - 1) ?? null
    : null
  const yoy_pct = calcNrwPct(yoyNrw)

  // report month/year ใช้จาก nrw_branch_monthly ก่อน fallback monthly_reports
  const reportMonth = latestNrw?.month ?? latestReport?.report_month ?? null
  const reportYear  = latestNrw
    ? fyToGregorianYear(latestNrw.fiscal_year, latestNrw.month)
    : (latestReport?.report_year ?? null)

  // DMA stats — find latest period and keep only those rows
  const allDmaRaw = (dmaRaw.data ?? []) as (DmaStatRow & { fetched_at?: string })[]
  const latestDmaPeriod = allDmaRaw[0]
    ? { year: allDmaRaw[0].report_year, month: allDmaRaw[0].report_month }
    : null
  const dmaStats: DmaStatRow[] = latestDmaPeriod
    ? allDmaRaw
        .filter((r) => r.report_year === latestDmaPeriod.year && r.report_month === latestDmaPeriod.month)
        .map((r) => ({
          id: r.id,
          dmama_branch_id: r.dmama_branch_id,
          report_year: r.report_year,
          report_month: r.report_month,
          area_label: r.area_label,
          area_name: r.area_name,
          outbound: r.outbound,
          distribute_all: r.distribute_all,
          water_loss: Math.max(0, (r.outbound ?? 0) - (r.distribute_all ?? 0)),
        }))
        .sort((a, b) => b.water_loss - a.water_loss)
    : []

  // MNF nodes — sort by severity
  const ALERT_ORDER: Record<string, number> = { red_spike: 0, red_accumulated: 1, yellow: 2, green: 3 }
  const mnfNodes: MnfNodeRow[] = ((mnfRes.data ?? []) as MnfNodeRow[])
    .sort((a, b) => (ALERT_ORDER[a.alert_status] ?? 9) - (ALERT_ORDER[b.alert_status] ?? 9))

  // PDCA — from latest monthly_report that has pdca text
  const pdcaReport = reports.find((r) => r.pdca_do || r.pdca_act) ?? null
  const pdca = pdcaReport
    ? {
        do_text: pdcaReport.pdca_do as string | null,
        act_text: pdcaReport.pdca_act as string | null,
        report_month: pdcaReport.report_month as number,
        report_year: pdcaReport.report_year as number,
      }
    : null

  // Budget 2569 projects for this branch
  let budget_2569: BranchExecutiveSummary['budget_2569'] = null
  const yearId = budgetYearRes.data?.id
  if (yearId) {
    const { data: groupData } = await (supabase as any)
      .from('budget_groups')
      .select('id')
      .eq('budget_year_id', yearId)

    const groupIds: string[] = (groupData ?? []).map((g: { id: string }) => g.id)

    if (groupIds.length > 0) {
      const { data: projectData } = await (supabase as any)
        .from('budget_projects')
        .select('project_name,current_phase,project_contracts(contract_end_date)')
        .eq('branch_id', branchId)
        .in('budget_group_id', groupIds)

      const projects = (projectData ?? []) as {
        project_name: string
        current_phase: number
        project_contracts: { contract_end_date: string | null } | null
      }[]

      const total = projects.length
      const by_phase = Array.from({ length: 7 }, (_, i) =>
        projects.filter((p) => p.current_phase === i).length
      )
      const overdue = projects.filter((p) => {
        if (p.current_phase === 6) return false
        const end = p.project_contracts?.contract_end_date
        return end && end < todayStr
      }).length
      const done_pct = total > 0 ? Math.round((by_phase[6] / total) * 100) : 0

      budget_2569 = {
        total,
        by_phase,
        overdue,
        done_pct,
        projects: projects.map((p) => ({
          name: p.project_name,
          phase: p.current_phase,
          overdue:
            p.current_phase < 6 &&
            !!p.project_contracts?.contract_end_date &&
            p.project_contracts.contract_end_date < todayStr,
        })),
      }
    }
  }

  return {
    data: {
      branch: branchRes.data,
      nrw: {
        current_pct,
        prev_month_pct,
        yoy_pct,
        water_produced: latestNrw?.water_produced ?? null,
        water_sold: latestNrw?.water_sold ?? null,
        yoy_produced: yoyNrw?.water_produced ?? null,
        yoy_sold: yoyNrw?.water_sold ?? null,
        trend_12m,
        leaks_found: latestReport?.leaks_found ?? 0,
        leaks_repaired: latestReport?.leaks_repaired ?? 0,
        leaks_pending: latestReport?.leaks_pending ?? 0,
        mnf_factor: latestReport?.mnf_factor ?? null,
        volume_distributed: latestReport?.volume_distributed ?? null,
        report_status: latestReport?.status ?? null,
        report_month: reportMonth,
        report_year: reportYear,
      },
      pdca,
      budget_2569,
      dmaStats,
      obstacles: (obstaclesRes.data ?? []) as ObstacleRow[],
      mnfNodes,
    },
    error: null,
  }
}
