import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch, WaterNodeOption } from '@/lib/types'
import { AreaReportForm, type NodeNrwLookup } from '@/components/forms/AreaReportForm'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { getNodeMnfStats } from '@/app/actions/water-nodes'
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

  // YoY comparison: fetch same month, one year prior
  const yoyYear = defaultYear - 1

  const [{ data: branchData }, { data: mmData }, { data: nrwNodeData }, mnfData] = await Promise.all([
    supabase
      .from('branches')
      .select('id, code, name_th, province_th')
      .eq('is_active', true)
      .order('name_th'),
    supabase
      .from('water_nodes')
      .select('id, branch_id, code, name_th, node_type, user_count, logger_id')
      .eq('node_type', 'MM')
      .eq('is_active', true)
      .order('code'),
    (supabase as any)
      .from('node_nrw_monthly')
      .select('water_node_id, report_year, report_month, gross_flow, net_flow, distribute_all')
      .in('report_year', [yoyYear, defaultYear])
      .eq('report_month', defaultMonth),
    getNodeMnfStats(defaultYear, defaultMonth),
  ])

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isAdmin = !session?.costcenter

  const mmNodesByBranch: Record<string, WaterNodeOption[]> = {}
  for (const node of (mmData ?? []) as WaterNodeOption[]) {
    if (!mmNodesByBranch[node.branch_id]) mmNodesByBranch[node.branch_id] = []
    mmNodesByBranch[node.branch_id].push(node)
  }

  type NrwNodeRow = { water_node_id: string; report_year: number; report_month: number; gross_flow: number | null; net_flow: number | null; distribute_all: number | null }
  const nrwStatsByNodeId: Record<string, NodeNrwLookup[]> = {}
  for (const row of (nrwNodeData ?? []) as NrwNodeRow[]) {
    if (!nrwStatsByNodeId[row.water_node_id]) nrwStatsByNodeId[row.water_node_id] = []
    nrwStatsByNodeId[row.water_node_id].push({
      report_year: row.report_year,
      report_month: row.report_month,
      gross_flow: row.gross_flow,
      net_flow: row.net_flow,
      distribute_all: row.distribute_all,
    })
  }

  // MNF stats keyed by logger_id (string) → [{report_year, report_month, avg_mnf}]
  const mnfStatsByLoggerId: Record<string, { report_year: number; report_month: number; avg_mnf: number }[]> = {}
  for (const row of mnfData) {
    const key = String(row.logger_id)
    if (!mnfStatsByLoggerId[key]) mnfStatsByLoggerId[key] = []
    mnfStatsByLoggerId[key].push({ report_year: row.report_year, report_month: row.report_month, avg_mnf: row.avg_mnf })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/pdca"
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
        nrwStatsByNodeId={nrwStatsByNodeId}
        mnfStatsByLoggerId={mnfStatsByLoggerId}
        defaultYear={defaultYear}
        defaultMonth={defaultMonth}
      />
    </div>
  )
}
