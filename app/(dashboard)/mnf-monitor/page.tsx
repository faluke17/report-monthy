import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { MnfMonitorTable } from '@/components/dashboard/MnfMonitorTable'
import { MnfAlertSummaryBar } from '@/components/dashboard/MnfAlertSummaryBar'
import { MnfBranchAccordion } from '@/components/dashboard/MnfBranchAccordion'
import type { BranchGroup } from '@/components/dashboard/MnfBranchAccordion'
import type { MnfAlertStatus, MnfEmaLatest } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MnfMonitorPage() {
  const supabase = await createClient()
  const session  = await getPwaSession()

  const branchCostcenter = session?.costcenter || null
  const isRegion = !branchCostcenter

  // หา dmama_branch_id ของสาขาที่ login (สำหรับ branch user)
  const myBranch = branchCostcenter
    ? PWA_BRANCHES.find(b => b.costcenter === branchCostcenter) ?? null
    : null

  const branchMap = new Map(PWA_BRANCHES.map(b => [b.dmama_branch_id, b.name_th]))

  // Query — branch user: กรองเฉพาะสาขาตัวเอง
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('mnf_ema_latest')
    .select('dmama_branch_id, logger_id, node_label, record_date, mnf_flow, ema_value, diff_percent, consecutive_count, alert_status, computed_at')
    .order('diff_percent', { ascending: false })

  if (myBranch) {
    q = q.eq('dmama_branch_id', myBranch.dmama_branch_id)
  }

  const { data } = await q as { data: Omit<MnfEmaLatest, 'branch_name_th'>[] | null }

  const rows: MnfEmaLatest[] = (data ?? []).map(r => ({
    ...r,
    branch_name_th: branchMap.get(r.dmama_branch_id),
  }))

  // Summary counts
  const counts: Record<MnfAlertStatus, number> = {
    green: 0, yellow: 0, red_spike: 0, red_accumulated: 0,
  }
  for (const r of rows) counts[r.alert_status]++

  const lastComputed = rows[0]?.computed_at
    ? new Date(rows[0].computed_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    : null

  // Region: จัดกลุ่มตามสาขา เรียงจาก worst ก่อน
  const STATUS_ORDER: Record<MnfAlertStatus, number> = {
    red_spike: 0, red_accumulated: 1, yellow: 2, green: 3,
  }

  const groups: BranchGroup[] = []
  if (isRegion) {
    const byBranch = new Map<number, MnfEmaLatest[]>()
    for (const r of rows) {
      const arr = byBranch.get(r.dmama_branch_id) ?? []
      arr.push(r)
      byBranch.set(r.dmama_branch_id, arr)
    }
    for (const [dmamaId, nodes] of byBranch) {
      const c: Record<MnfAlertStatus, number> = { green: 0, yellow: 0, red_spike: 0, red_accumulated: 0 }
      for (const n of nodes) c[n.alert_status]++
      const worstStatus = (['red_spike', 'red_accumulated', 'yellow', 'green'] as MnfAlertStatus[])
        .find(s => c[s] > 0) ?? 'green'
      groups.push({
        dmama_branch_id: dmamaId,
        branch_name_th: branchMap.get(dmamaId) ?? String(dmamaId),
        nodes,
        worstStatus,
        counts: c,
      })
    }
    groups.sort((a, b) => STATUS_ORDER[a.worstStatus] - STATUS_ORDER[b.worstStatus])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">MNF Monitor</h1>
          <p className="text-sm text-white/50 mt-1">
            {isRegion
              ? `เฝ้าระวัง Minimum Night Flow ทั้งเขต · ${rows.length} nodes จาก ${groups.length} สาขา`
              : `เฝ้าระวัง MNF สาขา${myBranch?.name_th ?? ''} · ${rows.length} nodes`
            }
          </p>
        </div>
        {lastComputed && (
          <p className="text-xs text-white/30 shrink-0">คำนวณล่าสุด: {lastComputed}</p>
        )}
      </div>

      <MnfAlertSummaryBar counts={counts} totalNodes={rows.length} />

      {rows.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/30 text-sm">
          ยังไม่มีข้อมูล EMA — กรุณารัน mnf-sync ก่อน
        </div>
      ) : isRegion ? (
        /* เขต: accordion จัดกลุ่มตามสาขา */
        <MnfBranchAccordion groups={groups} />
      ) : (
        /* สาขา: ตารางปกติ เฉพาะของตัวเอง */
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-white/70">Node ทั้งหมด ({rows.length})</h2>
          <MnfMonitorTable rows={rows} />
        </div>
      )}
    </div>
  )
}
