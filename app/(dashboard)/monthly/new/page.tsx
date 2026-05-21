import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch, WaterNodeOption } from '@/lib/types'
import { AreaReportForm, type NrwAreaLookup } from '@/components/forms/AreaReportForm'
import { sortByPwaBranches, getDmamabranchId } from '@/lib/utils/pwa-branches'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewMonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; branch_id?: string }>
}) {
  const supabase = await createClient()
  const session = await getPwaSession()
  const params = await searchParams

  // Compute default report period (previous month) — same logic as the form
  const now = new Date()
  const fallbackMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const fallbackYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  // searchParams may carry BE year (พ.ศ.) — convert to AD
  const rawYear = params.year ? parseInt(params.year) : null
  const rawMonth = params.month ? parseInt(params.month) : null
  // BE year is typically > 2500; AD year is < 2100
  const defaultYear = rawYear ? (rawYear > 2100 ? rawYear - 543 : rawYear) : fallbackYear
  const defaultMonth = rawMonth ?? fallbackMonth

  // YoY comparison: fetch same month, one year prior (~265 rows — well within any limit)
  const yoyYear = defaultYear - 1
  const yoyMonth = defaultMonth

  const [{ data: branchData }, { data: mmData }, { data: yoyData }, { data: currentData }] = await Promise.all([
    supabase
      .from('branches')
      .select('id, code, name_th, province_th')
      .eq('is_active', true)
      .order('name_th'),
    supabase
      .from('water_nodes')
      .select('id, branch_id, code, name_th, node_type, user_count')
      .eq('node_type', 'MM')
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('nrw_area_stats')
      .select('dmama_branch_id, report_year, report_month, area_name, outbound, distribute_all')
      .eq('report_year', yoyYear)
      .eq('report_month', yoyMonth),
    supabase
      .from('nrw_area_stats')
      .select('dmama_branch_id, report_year, report_month, area_name, outbound, distribute_all')
      .eq('report_year', defaultYear)
      .eq('report_month', defaultMonth),
  ])

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isAdmin = !session?.costcenter

  const mmNodesByBranch: Record<string, WaterNodeOption[]> = {}
  for (const node of (mmData ?? []) as WaterNodeOption[]) {
    if (!mmNodesByBranch[node.branch_id]) mmNodesByBranch[node.branch_id] = []
    mmNodesByBranch[node.branch_id].push(node)
  }

  // Map branch UUID → dmama_branch_id
  const branchUuidToDmamaId: Record<string, number> = {}
  for (const b of branches) {
    const dmamaId = getDmamabranchId(b.name_th)
    if (dmamaId) branchUuidToDmamaId[b.id] = dmamaId
  }

  // Combine YoY (before) + current month (after) into one lookup map
  type RawRow = { dmama_branch_id: number; report_year: number; report_month: number; area_name: string; outbound: number | null; distribute_all: number | null }
  const allRows = [...(yoyData ?? []), ...(currentData ?? [])] as RawRow[]

  const nrwStatsByBranchId: Record<number, NrwAreaLookup[]> = {}
  for (const row of allRows) {
    if (!nrwStatsByBranchId[row.dmama_branch_id]) nrwStatsByBranchId[row.dmama_branch_id] = []
    nrwStatsByBranchId[row.dmama_branch_id].push({
      area_name: row.area_name,
      outbound: row.outbound,
      distribute_all: row.distribute_all,
      report_year: row.report_year,
      report_month: row.report_month,
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/monthly"
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          รายงานรายเดือน
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white">บันทึกพื้นที่</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">บันทึกรายงานรายพื้นที่</h1>
        <p className="text-sm text-white/40 mt-0.5">
          กรอกข้อมูล MM / DMA รายเดือน พร้อมผล Step Test และอุปสรรค
        </p>
      </div>

      <AreaReportForm
        branches={branches}
        userBranchId={matchedBranch?.id}
        isAdmin={isAdmin}
        mmNodesByBranch={mmNodesByBranch}
        nrwStatsByBranchId={nrwStatsByBranchId}
        branchUuidToDmamaId={branchUuidToDmamaId}
        defaultYear={defaultYear}
        defaultMonth={defaultMonth}
      />
    </div>
  )
}
