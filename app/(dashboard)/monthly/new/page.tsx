import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch, WaterNodeOption } from '@/lib/types'
import { AreaReportForm } from '@/components/forms/AreaReportForm'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewMonthlyPage() {
  const supabase = await createClient()
  const session = await getPwaSession()

  const [{ data: branchData }, { data: mmData }] = await Promise.all([
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
  ])

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  // เขต/ส่วนกลาง users have a session but no matching branch — let them pick a branch
  const isAdmin = !session?.branch_name || !matchedBranch

  const mmNodesByBranch: Record<string, WaterNodeOption[]> = {}
  for (const node of (mmData ?? []) as WaterNodeOption[]) {
    if (!mmNodesByBranch[node.branch_id]) mmNodesByBranch[node.branch_id] = []
    mmNodesByBranch[node.branch_id].push(node)
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
      />
    </div>
  )
}
