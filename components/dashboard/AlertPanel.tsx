import Link from 'next/link'
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export async function AlertPanel() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [obstaclesResult, actionsResult] = await Promise.all([
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
  ])

  const obstacles = obstaclesResult.data ?? []
  const overdueActions = actionsResult.data ?? []

  return (
    <div className="glass-card p-5 space-y-5">
      <h3 className="text-sm font-semibold text-white">การแจ้งเตือน</h3>

      {/* Overdue actions */}
      {overdueActions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium mb-2">
            <Clock size={12} />
            Action เกินกำหนด ({overdueActions.length})
          </div>
          <div className="space-y-1.5">
            {overdueActions.map((a) => (
              <div key={a.id} className="text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="text-white font-medium truncate">{a.title}</p>
                <p className="text-red-400/70 mt-0.5">{(a as any).branches?.name_th} · {a.due_date}</p>
              </div>
            ))}
          </div>
          <Link href="/action" className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-2">
            ดูทั้งหมด <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* Open obstacles */}
      {obstacles.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium mb-2">
            <AlertTriangle size={12} />
            อุปสรรคที่ต้องติดตาม ({obstacles.length})
          </div>
          <div className="space-y-1.5">
            {obstacles.map((o) => (
              <div key={o.id} className="text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <p className="text-white font-medium truncate">{o.obstacle_type}</p>
                <p className="text-amber-400/70 mt-0.5">{(o as any).branches?.name_th} · {o.status}</p>
              </div>
            ))}
          </div>
          <Link href="/obstacle" className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2">
            ดูทั้งหมด <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {obstacles.length === 0 && overdueActions.length === 0 && (
        <p className="text-xs text-white/30 text-center py-4">ไม่มีการแจ้งเตือน</p>
      )}
    </div>
  )
}
