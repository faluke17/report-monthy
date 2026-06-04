import Link from 'next/link'
import { AlertTriangle, Clock, ArrowRight, Droplets, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'

export async function AlertPanel() {
  const supabase   = await createClient()
  const today      = new Date().toISOString().split('T')[0]
  const branchMap  = new Map(PWA_BRANCHES.map(b => [b.dmama_branch_id, b.name_th]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [obstaclesResult, actionsResult, mnfRedResult] = await Promise.all([
    supabase
      .from('obstacles')
      .select('id, code, obstacle_type, status, branch_id, branches(name_th)')
      .eq('show_in_monthly_alert', true)
      .not('status', 'eq', 'ปิดประเด็น')
      .order('priority_order', { ascending: true })
      .limit(5),
    supabase
      .from('action_items')
      .select('id, code, title, due_date, status, branches(name_th)')
      .lt('due_date', today)
      .not('status', 'in', '("แล้วเสร็จ","ยกเลิก")')
      .order('due_date', { ascending: true })
      .limit(5),
    (supabase as any)
      .from('mnf_ema_latest')
      .select('dmama_branch_id, logger_id, node_label, alert_status, diff_percent, consecutive_count')
      .in('alert_status', ['red_spike', 'red_accumulated'])
      .order('diff_percent', { ascending: false })
      .limit(5),
  ])

  const obstacles     = obstaclesResult.data   ?? []
  const overdueActions = actionsResult.data     ?? []
  const mnfRedNodes   = (mnfRedResult as any)?.data ?? []

  const isEmpty = obstacles.length === 0 && overdueActions.length === 0 && mnfRedNodes.length === 0

  return (
    <div className="glass-card p-5 space-y-5">
      <h3 className="text-[13px] font-semibold" style={{ color: '#E4ECFF' }}>การแจ้งเตือน</h3>

      {/* Overdue actions */}
      {overdueActions.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Clock size={12} style={{ color: '#F87171' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#F87171' }}>
              Action เกินกำหนด ({overdueActions.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {overdueActions.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2.5 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(248,113,113,.06)',
                  border: '1px solid rgba(248,113,113,.18)',
                  borderLeft: '3px solid #F87171',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: '#E4ECFF' }}>{a.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#F87171' }}>
                    {(a as any).branches?.name_th} · {a.due_date}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/action"
            className="inline-flex items-center gap-1 mt-2 text-[11px] transition-colors"
            style={{ color: '#F87171' }}
          >
            ดูทั้งหมด <ArrowRight size={10} />
          </Link>
        </section>
      )}

      {/* Open obstacles */}
      {obstacles.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2.5">
            <AlertTriangle size={12} style={{ color: '#FCD34D' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#FCD34D' }}>
              อุปสรรคที่ต้องติดตาม ({obstacles.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {obstacles.map((o) => (
              <div
                key={o.id}
                className="flex items-start gap-2.5 px-3 py-2 rounded-xl"
                style={{
                  background: 'rgba(252,211,77,.06)',
                  border: '1px solid rgba(252,211,77,.16)',
                  borderLeft: '3px solid #FCD34D',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: '#E4ECFF' }}>{o.obstacle_type}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#FCD34D' }}>
                    {(o as any).branches?.name_th} · {o.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/obstacle"
            className="inline-flex items-center gap-1 mt-2 text-[11px] transition-colors"
            style={{ color: '#FCD34D' }}
          >
            ดูทั้งหมด <ArrowRight size={10} />
          </Link>
        </section>
      )}

      {/* MNF red alerts */}
      {mnfRedNodes.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Droplets size={12} style={{ color: '#FB7185' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#FB7185' }}>
              MNF Alert ({mnfRedNodes.length} node)
            </span>
          </div>
          <div className="space-y-1.5">
            {(mnfRedNodes as any[]).map((n) => {
              const branchName = branchMap.get(n.dmama_branch_id) ?? String(n.dmama_branch_id)
              const diffSign   = n.diff_percent > 0 ? '+' : ''
              const isSpike    = n.alert_status === 'red_spike'
              return (
                <div
                  key={`${n.dmama_branch_id}-${n.logger_id}`}
                  className="flex items-start gap-2.5 px-3 py-2 rounded-xl"
                  style={{
                    background: 'rgba(251,113,133,.06)',
                    border: '1px solid rgba(251,113,133,.16)',
                    borderLeft: `3px solid ${isSpike ? '#F87171' : '#FB7185'}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: '#E4ECFF' }}>
                      {branchName} · {n.node_label}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#FB7185' }}>
                      {isSpike ? 'ฉุกเฉิน' : 'สะสม'}
                      {' · '}Diff {diffSign}{Number(n.diff_percent).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            href="/mnf-monitor"
            className="inline-flex items-center gap-1 mt-2 text-[11px] transition-colors"
            style={{ color: '#FB7185' }}
          >
            ดูรายละเอียด <ArrowRight size={10} />
          </Link>
        </section>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,.10)', border: '1px solid rgba(52,211,153,.20)' }}
          >
            <CheckCircle size={20} style={{ color: '#34D399' }} />
          </div>
          <p className="text-[12px] text-center" style={{ color: '#7B9CCC' }}>ไม่มีการแจ้งเตือน</p>
        </div>
      )}
    </div>
  )
}
