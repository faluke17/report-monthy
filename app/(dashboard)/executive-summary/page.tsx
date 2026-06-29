import { redirect } from 'next/navigation'
import { getPwaSession } from '@/lib/pwa-auth'
import { createClient } from '@/lib/supabase/server'
import { ExecutiveSummaryClient } from './_components/ExecutiveSummaryClient'
import type { Branch } from '@/lib/types'

export const metadata = { title: 'บทสรุปผู้บริหาร | NRW Tracker' }
export const dynamic = 'force-dynamic'

export interface BranchNrwSnap {
  branch_id: string
  nrw_pct: number | null
  report_status: string | null
}

export default async function ExecutiveSummaryPage() {
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const now = new Date()

  const [branchesRes, snapsRes] = await Promise.all([
    supabase
      .from('branches')
      .select('id,code,name_th,province_th,region,is_active,created_at')
      .eq('is_active', true)
      .order('name_th'),

    supabase
      .from('monthly_reports')
      .select('branch_id,nrw_pct,status')
      .eq('report_year', now.getFullYear())
      .eq('report_month', now.getMonth() + 1),
  ])

  const snapMap: Record<string, BranchNrwSnap> = {}
  for (const s of snapsRes.data ?? []) {
    snapMap[s.branch_id] = {
      branch_id: s.branch_id,
      nrw_pct: s.nrw_pct,
      report_status: s.status,
    }
  }

  return (
    // Cancel dashboard layout padding to fill the whole viewport
    <div
      className="-m-4 -mb-20 md:-m-6 md:-mb-6 overflow-hidden"
      style={{ height: 'calc(100vh - 56px)' }}
    >
      <ExecutiveSummaryClient
        branches={(branchesRes.data ?? []) as Branch[]}
        snapMap={snapMap}
      />
    </div>
  )
}
