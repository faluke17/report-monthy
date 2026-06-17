import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { MnfMonitorGrid } from '@/components/dashboard/MnfMonitorGrid'
import type { BranchGroup } from '@/components/dashboard/MnfMonitorGrid'
import type { MnfAlertStatus, MnfEmaLatest } from '@/lib/types'
import type { MnfSeriesPoint } from '@/app/actions/mnf-monitor'

export const dynamic = 'force-dynamic'

function fmtThaiDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d}/${m}/${y + 543}`
}

export default async function MnfMonitorPage() {
  const supabase = await createClient()
  const session  = await getPwaSession()

  const branchCostcenter = session?.costcenter || null
  const isRegion = !branchCostcenter

  const myBranch = branchCostcenter
    ? PWA_BRANCHES.find(b => b.costcenter === branchCostcenter) ?? null
    : null

  const branchMap = new Map(PWA_BRANCHES.map(b => [b.dmama_branch_id, b.name_th]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('mnf_ema_latest')
    .select('dmama_branch_id, logger_id, node_label, record_date, mnf_flow, ema_value, diff_percent, consecutive_count, alert_status, computed_at')
    .order('diff_percent', { ascending: false })

  if (myBranch) q = q.eq('dmama_branch_id', myBranch.dmama_branch_id)

  const { data } = await q as { data: Omit<MnfEmaLatest, 'branch_name_th'>[] | null }

  const rows: MnfEmaLatest[] = (data ?? []).map(r => ({
    ...r,
    branch_name_th: branchMap.get(r.dmama_branch_id),
  }))

  const lastComputed = rows[0]?.computed_at
    ? new Date(rows[0].computed_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
    : null

  // Sync status: query latest record_date from mnf_daily
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestSyncRow } = await (supabase as any)
    .from('mnf_daily')
    .select('record_date')
    .order('record_date', { ascending: false })
    .limit(1)
    .single() as { data: { record_date: string } | null }

  const nowBkk    = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  const yestBkk   = new Date(nowBkk.getTime() - 86400_000).toISOString().split('T')[0]
  const latestDate = latestSyncRow?.record_date ?? null
  const daysBehind = latestDate
    ? Math.max(0, Math.round((new Date(yestBkk).getTime() - new Date(latestDate).getTime()) / 86400_000))
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

  // Branch view: pre-fetch 30-day series server-side
  let initialSeries: MnfSeriesPoint[] = []
  if (!isRegion && myBranch) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sd } = await (supabase as any)
      .from('mnf_ema_daily')
      .select('node_label, record_date, mnf_flow, ema_value, diff_percent, alert_status')
      .eq('dmama_branch_id', myBranch.dmama_branch_id)
      .gte('record_date', thirtyDaysAgo)
      .order('record_date', { ascending: true })
    initialSeries = (sd ?? []) as MnfSeriesPoint[]
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
        <div className="shrink-0 text-right space-y-1.5">
          {daysBehind === null ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-white/30 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              ไม่มีข้อมูล
            </span>
          ) : daysBehind === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              สำเร็จ · ข้อมูลวันที่ {fmtThaiDate(latestDate!)}
            </span>
          ) : daysBehind === 1 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              ยังไม่ sync วันนี้ · ล่าสุด {fmtThaiDate(latestDate!)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/8 text-red-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              ข้อมูลค้าง {daysBehind} วัน · ตรวจสอบ Cron
            </span>
          )}
          {lastComputed && (
            <p className="text-[10px] text-white/25">คำนวณ EMA: {lastComputed}</p>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/30 text-sm">
          ยังไม่มีข้อมูล EMA — กรุณารัน mnf-sync ก่อน
        </div>
      ) : (
        <MnfMonitorGrid
          groups={groups}
          rows={rows}
          isRegion={isRegion}
          lastComputed={lastComputed}
          initialSeries={initialSeries}
        />
      )}
    </div>
  )
}
