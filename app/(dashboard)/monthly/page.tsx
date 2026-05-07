import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { AreaReportTable } from '@/components/dashboard/AreaReportTable'
import { BranchFilterBar } from '@/components/shared/BranchFilterBar'
import { Plus } from 'lucide-react'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'

export const dynamic = 'force-dynamic'

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string; year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const session = await getPwaSession()
  const now = new Date()

  // resolve branch context
  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th, province_th')
    .eq('is_active', true)

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isBranchUser = !!matchedBranch
  const showBranchFilter = !isBranchUser // district admin or region admin

  const { branch_id, year, month } = await searchParams
  const filterYear  = parseInt(year  ?? '') || now.getFullYear()
  const filterMonth = parseInt(month ?? '') || now.getMonth() + 1
  const filterBranchId = isBranchUser
    ? matchedBranch.id
    : (branch_id ?? '')

  // fetch area reports
  let query = supabase
    .from('area_monthly_reports')
    .select('*, branches(name_th, code), step_test_results(step_no, estimated_loss, leaks_found, repair_status), area_obstacles(obstacle_type, obstacle_detail, resolution_plan, impact, region_support_needed, priority_order)')
    .eq('report_year', filterYear)
    .eq('report_month', filterMonth)
    .order('created_at', { ascending: false })

  if (filterBranchId) {
    query = query.eq('branch_id', filterBranchId)
  }

  const { data: reports } = await query

  const rows = reports ?? []

  return (
    <div className="space-y-5 animate-fadein">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">รายงานรายพื้นที่ PDCA</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {getThaiMonthName(filterMonth)} {toThaiYear(filterYear)}
            {filterBranchId && branches.find(b => b.id === filterBranchId)
              ? ` · ${branches.find(b => b.id === filterBranchId)?.name_th}`
              : ''}
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

      {/* ─── Filters ─── */}
      <BranchFilterBar
        branches={showBranchFilter ? branches : []}
        activeBranchId={filterBranchId}
        activeYear={filterYear}
        activeMonth={filterMonth}
      />

      {/* ─── Table ─── */}
      <div className="glass-card overflow-hidden">
        <AreaReportTable data={rows as any} showBranch={showBranchFilter} canDelete={!isBranchUser} />
      </div>
    </div>
  )
}
