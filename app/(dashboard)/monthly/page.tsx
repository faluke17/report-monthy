import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { AreaReportTable, AreaReport } from '@/components/dashboard/AreaReportTable'
import { BranchSummaryGrid, BranchSummaryItem } from '@/components/dashboard/BranchSummaryGrid'
import { BranchSummaryHeader } from '@/components/dashboard/BranchSummaryHeader'
import { BranchFilterBar } from '@/components/shared/BranchFilterBar'
import { Plus } from 'lucide-react'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'

export const dynamic = 'force-dynamic'

function computeBranchSummaries(rows: AreaReport[], branches: Branch[]): BranchSummaryItem[] {
  const map = new Map<string, {
    distBefore: number; soldBefore: number
    dist: number; sold: number
    areas: number; highPrio: number; totalObs: number
  }>()
  for (const r of rows) {
    if (!map.has(r.branch_id))
      map.set(r.branch_id, { distBefore: 0, soldBefore: 0, dist: 0, sold: 0, areas: 0, highPrio: 0, totalObs: 0 })
    const agg = map.get(r.branch_id)!
    agg.areas++
    agg.distBefore += r.water_dist_before ?? 0
    agg.soldBefore += r.water_sold_before ?? 0
    agg.dist  += r.water_dist_after ?? 0
    agg.sold  += r.water_sold_after ?? 0
    agg.totalObs += r.area_obstacles?.length ?? 0
    agg.highPrio += r.area_obstacles?.filter((o) => o.priority_order === 1).length ?? 0
  }
  return branches.map((b) => {
    const agg = map.get(b.id)
    const avgNrwBefore = agg && agg.distBefore > 0 ? ((agg.distBefore - agg.soldBefore) / agg.distBefore) * 100 : null
    const avgNrwAfter  = agg && agg.dist > 0 ? ((agg.dist - agg.sold) / agg.dist) * 100 : null
    return {
      branch_id: b.id,
      name_th: b.name_th,
      code: b.code,
      areaCount: agg?.areas ?? 0,
      submitted: (agg?.areas ?? 0) > 0,
      avgNrwBefore,
      avgNrwAfter,
      highPriorityObstacles: agg?.highPrio ?? 0,
      totalObstacles: agg?.totalObs ?? 0,
    }
  })
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string; year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const session = await getPwaSession()
  const now = new Date()

  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th, province_th')
    .eq('is_active', true)

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isBranchUser = !!matchedBranch

  const { branch_id, year, month } = await searchParams
  const filterYear  = parseInt(year  ?? '') || now.getFullYear()
  const filterMonth = parseInt(month ?? '') || now.getMonth() + 1
  const filterBranchId = isBranchUser ? matchedBranch.id : (branch_id ?? '')

  // Fetch area reports (no branch filter for district view so we can show all cards)
  let query = supabase
    .from('area_monthly_reports')
    .select('*, branches(name_th, code), step_test_results(step_no, estimated_loss, leaks_found, repair_status), area_obstacles(obstacle_type, obstacle_detail, resolution_plan, impact, region_support_needed, priority_order)')
    .eq('report_year', filterYear)
    .eq('report_month', filterMonth)
    .order('created_at', { ascending: false })

  if (isBranchUser) {
    query = query.eq('branch_id', filterBranchId)
  }

  const { data: reports } = await query
  const rows = (reports ?? []) as AreaReport[]

  // District view: compute per-branch summaries
  const summaries = !isBranchUser ? computeBranchSummaries(rows, branches) : []

  // Branch view: compute summary stats
  const branchStats = isBranchUser ? (() => {
    const totalDist = rows.reduce((s, r) => s + (r.water_dist_after ?? 0), 0)
    const totalSold = rows.reduce((s, r) => s + (r.water_sold_after ?? 0), 0)
    const avgNrw = totalDist > 0 ? ((totalDist - totalSold) / totalDist) * 100 : null
    return {
      avgNrw,
      totalAreas: rows.length,
      totalObstacles: rows.reduce((s, r) => s + (r.area_obstacles?.length ?? 0), 0),
      leaksRepaired: rows.reduce((s, r) => s + (r.leaks_repaired ?? 0), 0),
      leaksPending:  rows.reduce((s, r) => s + (r.leaks_pending  ?? 0), 0),
    }
  })() : null

  const periodLabel = `${getThaiMonthName(filterMonth)} ${toThaiYear(filterYear)}`
  const branchLabel = isBranchUser ? matchedBranch.name_th : null

  return (
    <div className="space-y-5 animate-fadein">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">
            {branchLabel ?? 'รายงานรายพื้นที่ PDCA'}
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            {periodLabel}
            {isBranchUser && rows.length === 0 && ' · ยังไม่มีรายงาน'}
          </p>
        </div>
        <Link
          href="/monthly/new"
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus size={15} />
          บันทึกใหม่
        </Link>
      </div>

      {/* ─── Month/year filter ─── */}
      <BranchFilterBar
        branches={[]}
        activeBranchId=""
        activeYear={filterYear}
        activeMonth={filterMonth}
      />

      {/* ─── Content ─── */}
      {isBranchUser ? (
        <>
          {branchStats && (
            <BranchSummaryHeader
              avgNrw={branchStats.avgNrw}
              totalAreas={branchStats.totalAreas}
              totalObstacles={branchStats.totalObstacles}
              leaksRepaired={branchStats.leaksRepaired}
              leaksPending={branchStats.leaksPending}
            />
          )}
          <div className="glass-card overflow-hidden">
            <AreaReportTable data={rows} showBranch={false} canDelete={false} />
          </div>
        </>
      ) : (
        <BranchSummaryGrid
          branches={branches}
          summaries={summaries}
          allRows={rows}
          canDelete={true}
        />
      )}
    </div>
  )
}
