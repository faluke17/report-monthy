import { redirect } from 'next/navigation'
import { getPwaSession } from '@/lib/pwa-auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { getMeetingsWithRequirements } from '@/app/actions/meeting-requirements'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const branchCostcenter = session?.costcenter || null
  const isRegion = !branchCostcenter
  // branch_name-based check (consistent with monthly/page.tsx)
  const isBranchUser = !!session?.branch_name

  const [branchesRes, submittedRes, obstaclesRes, notifRes, meetingsRes, requirementMeetings, overdueActionsRes, mnfRedRes] = await Promise.all([
    supabase.from('branches').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('monthly_reports').select('id', { count: 'exact', head: true })
      .eq('report_year', now.getFullYear()).eq('report_month', now.getMonth() + 1),
    supabase.from('obstacles').select('id', { count: 'exact', head: true })
      .not('status', 'eq', 'ปิดประเด็น'),
    isRegion
      ? supabase.from('resolution_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
      : supabase.from('resolution_notifications').select('id', { count: 'exact', head: true })
          .eq('branch_costcenter', branchCostcenter).eq('is_read', false),
    // Upcoming notified meetings — needed for branch unacked count
    isBranchUser
      ? supabase.from('meetings').select('id')
          .eq('status', 'กำหนดแล้ว')
          .gte('scheduled_date', today)
          .not('notified_at', 'is', null)
      : Promise.resolve({ data: [] as { id: string }[] }),
    // Requirements with fulfillment status
    getMeetingsWithRequirements({ branchCostcenter: branchCostcenter }),
    supabase.from('action_items').select('id', { count: 'exact', head: true })
      .lt('due_date', today)
      .not('status', 'in', '("แล้วเสร็จ","ยกเลิก")'),
    (supabase as any).from('mnf_ema_latest').select('logger_id', { count: 'exact', head: true })
      .in('alert_status', ['red_spike', 'red_accumulated']),
  ])

  // Count unacknowledged meetings for branch users
  const meetingIds = (meetingsRes.data ?? []).map((m) => m.id)
  let unackedMeetings = 0
  if (isBranchUser && meetingIds.length > 0) {
    const { count: ackedCount } = await supabase
      .from('meeting_acknowledgments')
      .select('id', { count: 'exact', head: true })
      .in('meeting_id', meetingIds)
      .eq('branch_name', session.branch_name)
    unackedMeetings = meetingIds.length - (ackedCount ?? 0)
  }

  const total     = branchesRes.count ?? 26
  const submitted = submittedRes.count ?? 0
  const notifyCount = (notifRes.count ?? 0) + Math.max(0, unackedMeetings)
  // region: นับจำนวน ticket ที่ยังไม่ครบ (ไม่ใช่จำนวนสาขา)
  // branch: นับจำนวน ticket ที่ตัวเองยังไม่ทำ
  const requirementCount = isRegion
    ? requirementMeetings.flatMap(m => m.requirements).filter(r => r.pending_count > 0).length
    : requirementMeetings.reduce((s, m) => s + m.total_pending, 0)
  const stats = {
    totalBranches: total,
    submitted,
    pending: total - submitted,
    openObstacles: obstaclesRes.count ?? 0,
    overdueActions: overdueActionsRes.count ?? 0,
    mnfRedCount: (mnfRedRes as any)?.count ?? 0,
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <Sidebar stats={stats} notifyCount={notifyCount + requirementCount} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          session={session}
          notifyCount={notifyCount}
          requirementCount={requirementCount}
          requirementMeetings={requirementMeetings}
          isRegion={isRegion}
          stats={stats}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 animate-fadein">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
