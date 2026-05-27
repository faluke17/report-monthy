'use server'

import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'

export interface NrwTrendPoint {
  month: number
  year: number
  nrw_pct: number | null
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

  // Phase 2 — parallel: operational data + NRW official + budget
  const [reportsRes, nrwMonthlyRes, budgetYearRes] = await Promise.all([
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
      .limit(13),

    // budget year id
    (supabase as any)
      .from('budget_years')
      .select('id')
      .eq('fiscal_year', FISCAL_YEAR)
      .maybeSingle(),
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

  // report month/year ใช้จาก nrw_branch_monthly ก่อน fallback monthly_reports
  const reportMonth = latestNrw?.month ?? latestReport?.report_month ?? null
  const reportYear  = latestNrw
    ? fyToGregorianYear(latestNrw.fiscal_year, latestNrw.month)
    : (latestReport?.report_year ?? null)

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
    },
    error: null,
  }
}
