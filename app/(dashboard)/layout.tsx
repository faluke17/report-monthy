import { redirect } from 'next/navigation'
import { getPwaSession } from '@/lib/pwa-auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'

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

  const [branchesRes, submittedRes, obstaclesRes, notifRes, meetingsRes] = await Promise.all([
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
  const stats = {
    totalBranches: total,
    submitted,
    pending: total - submitted,
    openObstacles: obstaclesRes.count ?? 0,
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <Sidebar stats={stats} notifyCount={notifyCount} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar session={session} notifyCount={notifyCount} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 animate-fadein">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
