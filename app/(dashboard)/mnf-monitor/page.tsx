import { createClient } from '@/lib/supabase/server'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { MnfMonitorTable } from '@/components/dashboard/MnfMonitorTable'
import { MnfAlertSummaryBar } from '@/components/dashboard/MnfAlertSummaryBar'
import type { MnfAlertStatus, MnfEmaLatest } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MnfMonitorPage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('mnf_ema_latest')
    .select('dmama_branch_id, logger_id, node_label, record_date, mnf_flow, ema_value, diff_percent, consecutive_count, alert_status, computed_at')
    .order('diff_percent', { ascending: false }) as { data: Omit<MnfEmaLatest, 'branch_name_th'>[] | null }

  const branchMap = new Map(PWA_BRANCHES.map(b => [b.dmama_branch_id, b.name_th]))

  const rows: MnfEmaLatest[] = (data ?? []).map(r => ({
    ...r,
    branch_name_th: branchMap.get(r.dmama_branch_id),
  }))

  const counts: Record<MnfAlertStatus, number> = {
    green: 0,
    yellow: 0,
    red_spike: 0,
    red_accumulated: 0,
  }
  for (const r of rows) counts[r.alert_status]++

  const lastComputed = rows[0]?.computed_at
    ? new Date(rows[0].computed_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">MNF Monitor</h1>
          <p className="text-sm text-white/50 mt-1">เฝ้าระวัง Minimum Night Flow ด้วย EMA-14 ต่อ Node</p>
        </div>
        {lastComputed && (
          <p className="text-xs text-white/30 shrink-0">คำนวณล่าสุด: {lastComputed}</p>
        )}
      </div>

      <MnfAlertSummaryBar counts={counts} totalNodes={rows.length} />

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-white/70">รายการทุก Node ({rows.length})</h2>
        <MnfMonitorTable rows={rows} />
      </div>
    </div>
  )
}
