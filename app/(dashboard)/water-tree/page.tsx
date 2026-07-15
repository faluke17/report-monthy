import { redirect } from 'next/navigation'
import { getPwaSession } from '@/lib/pwa-auth'
import { createClient } from '@/lib/supabase/server'
import { getLatestFlowPeriod, getNodeNrwStats } from '@/app/actions/water-nodes'
import { WaterTreeClient } from './_components/WaterTreeClient'
import type { Branch, WaterNode } from '@/lib/types'

export const metadata = { title: 'ผังจ่ายน้ำ | NRW Tracker' }
export const dynamic = 'force-dynamic'

export default async function WaterTreePage() {
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const isBranch = !!session.costcenter

  const [branchesRes, nodesRes] = await Promise.all([
    supabase
      .from('branches')
      .select('id,code,name_th,province_th,region,is_active,created_at')
      .eq('is_active', true)
      .order('name_th'),

    supabase
      .from('water_nodes')
      .select('id,branch_id,node_type,code,name_th,parent_id,status,user_count,is_active,created_at,logger_id,self_supply,dmama_area_label')
      .eq('is_active', true)
      .order('code'),
  ])

  const branches = (branchesRes.data ?? []) as Branch[]
  const nodes    = (nodesRes.data ?? []) as WaterNode[]

  // ถ้าเป็น branch user กรองเฉพาะสาขาตัวเอง
  const myBranch = isBranch
    ? branches.find(b => b.code === session.costcenter) ?? null
    : null

  // เดือน/ปีล่าสุดที่มีข้อมูล flow sync แล้ว — ใช้เป็นค่าเริ่มต้นของผังการไหล
  const now = new Date()
  const latestPeriod = await getLatestFlowPeriod()
  const flowYear  = latestPeriod?.year  ?? now.getFullYear()
  const flowMonth = latestPeriod?.month ?? now.getMonth() + 1
  const flowStats = await getNodeNrwStats(flowYear, flowMonth)

  return (
    <div className="-m-4 -mb-20 md:-m-6 md:-mb-6 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      <WaterTreeClient
        branches={branches}
        nodes={nodes}
        defaultBranchId={myBranch?.id ?? null}
        initialFlowYear={flowYear}
        initialFlowMonth={flowMonth}
        initialFlowStats={flowStats.filter(f => f.report_year === flowYear)}
      />
    </div>
  )
}
