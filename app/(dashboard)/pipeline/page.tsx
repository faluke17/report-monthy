import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { redirect } from 'next/navigation'
import { PipelineGraph } from './_components/PipelineGraph'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()

  const [areaRes, nrwRes, flowRes, nodeRes, mnfRes, emaRes] = await Promise.all([
    supabase
      .from('nrw_area_stats')
      .select('report_year, report_month')
      .order('report_year', { ascending: false })
      .order('report_month', { ascending: false })
      .limit(50),

    (supabase as any)
      .from('node_nrw_monthly')
      .select('report_year, report_month, gross_flow, distribute_all, nrw_pct')
      .order('report_year', { ascending: false })
      .order('report_month', { ascending: false })
      .limit(300),

    (supabase as any)
      .from('node_flow_daily')
      .select('report_year, report_month, synced_at')
      .order('synced_at', { ascending: false })
      .limit(1),

    (supabase as any)
      .from('water_nodes')
      .select('id, logger_id, dmama_area_label')
      .eq('is_active', true),

    supabase
      .from('mnf_daily')
      .select('record_date')
      .order('record_date', { ascending: false })
      .limit(1),

    (supabase as any)
      .from('mnf_ema_daily')
      .select('record_date, alert_status')
      .order('record_date', { ascending: false })
      .limit(1000),
  ])

  // nrw_area_stats
  type AreaRow = { report_year: number; report_month: number }
  const areaRows = (areaRes.data ?? []) as AreaRow[]
  const distinctMonths = new Set(areaRows.map(r => `${r.report_year}-${r.report_month}`)).size
  const latestArea = areaRows[0] ?? null

  // node_nrw_monthly — isolate latest month
  type NrwRow = { report_year: number; report_month: number; gross_flow: number | null; distribute_all: number | null; nrw_pct: number | null }
  const nrwRows = (nrwRes.data ?? []) as NrwRow[]
  const ly = nrwRows[0]?.report_year ?? null
  const lm = nrwRows[0]?.report_month ?? null
  const latestNrw = nrwRows.filter(r => r.report_year === ly && r.report_month === lm)
  const nrwStat = {
    year: ly, month: lm,
    total: latestNrw.length,
    hasFlow: latestNrw.filter(r => r.gross_flow != null).length,
    hasDist: latestNrw.filter(r => r.distribute_all != null).length,
    hasNrw:  latestNrw.filter(r => r.nrw_pct != null).length,
  }

  // node_flow_daily
  type FlowRow = { report_year: number; report_month: number; synced_at: string | null }
  const flowLatest = ((flowRes.data ?? []) as FlowRow[])[0] ?? null

  // water_nodes
  type NodeRow = { id: string; logger_id: number | null; dmama_area_label: string | null }
  const nodeRows = (nodeRes.data ?? []) as NodeRow[]
  const nodeStats = {
    total: nodeRows.length,
    withLogger: nodeRows.filter(n => n.logger_id != null).length,
    withLabel:  nodeRows.filter(n => n.dmama_area_label != null).length,
  }

  // mnf_daily
  const mnfLatestDate = ((mnfRes.data ?? []) as { record_date: string }[])[0]?.record_date ?? null

  // mnf_ema_daily
  type EmaRow = { record_date: string; alert_status: string }
  const emaRows = (emaRes.data ?? []) as EmaRow[]
  const emaDate = emaRows[0]?.record_date ?? null
  const emaLatest = emaRows.filter(r => r.record_date === emaDate)
  const emaStat = {
    date:   emaDate,
    total:  emaLatest.length,
    red:    emaLatest.filter(r => r.alert_status?.startsWith('red')).length,
    yellow: emaLatest.filter(r => r.alert_status === 'yellow').length,
    green:  emaLatest.filter(r => r.alert_status === 'green').length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#12181F]">Pipeline Monitor</h1>
        <p className="text-sm text-black/40 mt-0.5">
          แสดง data flow ของระบบ — DMAMA API → Sync → Database → UI
        </p>
      </div>

      <PipelineGraph
        areaStats={{ monthsCount: distinctMonths, latestYear: latestArea?.report_year ?? null, latestMonth: latestArea?.report_month ?? null }}
        nodeFlowDaily={{ latestYear: flowLatest?.report_year ?? null, latestMonth: flowLatest?.report_month ?? null, lastSynced: flowLatest?.synced_at ?? null }}
        nodeNrwMonthly={nrwStat}
        waterNodes={nodeStats}
        mnfDaily={{ latestDate: mnfLatestDate }}
        mnfEmaDaily={emaStat}
      />
    </div>
  )
}
