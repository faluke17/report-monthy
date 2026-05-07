import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch, WaterNodeOption } from '@/lib/types'
import { AreaReportForm, type NrwAreaLookup } from '@/components/forms/AreaReportForm'
import { sortByPwaBranches, getDmamabranchId } from '@/lib/utils/pwa-branches'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewMonthlyPage() {
  const supabase = await createClient()
  const session = await getPwaSession()

  const [{ data: branchData }, { data: mmData }, { data: nrwData }] = await Promise.all([
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
      .order('report_year', { ascending: false })
      .order('report_month', { ascending: false })
      .limit(1000),
  ])

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isAdmin = !session?.branch_name || !matchedBranch

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

  // Keep only the latest month per branch, then group by dmama_branch_id
  type RawRow = { dmama_branch_id: number; report_year: number; report_month: number; area_name: string; outbound: number | null; distribute_all: number | null }
  const rows = (nrwData ?? []) as RawRow[]

  const latestByBranch: Record<number, { year: number; month: number }> = {}
  for (const row of rows) {
    const cur = latestByBranch[row.dmama_branch_id]
    if (!cur || row.report_year > cur.year || (row.report_year === cur.year && row.report_month > cur.month)) {
      latestByBranch[row.dmama_branch_id] = { year: row.report_year, month: row.report_month }
    }
  }

  const nrwStatsByBranchId: Record<number, NrwAreaLookup[]> = {}
  for (const row of rows) {
    const latest = latestByBranch[row.dmama_branch_id]
    if (!latest || row.report_year !== latest.year || row.report_month !== latest.month) continue
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
      />
    </div>
  )
}
