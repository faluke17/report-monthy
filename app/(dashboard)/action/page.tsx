import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { getDirectiveSummaries, getDirectiveKpis } from '@/app/actions/directive'
import { DirectiveCommandCenter } from '@/components/dashboard/DirectiveCommandCenter'
import type { Meeting } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ActionPage() {
  const [session, supabase] = await Promise.all([
    getPwaSession(),
    createClient(),
  ])

  const isAdmin = !session?.costcenter

  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, code, title, meeting_type, scheduled_date, scheduled_time, location, meeting_link, target_audience, status, created_by, created_at, updated_at')
    .order('scheduled_date', { ascending: false })
    .limit(12)

  const meetingsList = (meetings ?? []) as Meeting[]

  const [summaries, kpis] = await Promise.all([
    getDirectiveSummaries(),
    getDirectiveKpis(),
  ])

  return (
    <div className="space-y-5 animate-fadein">
      <div>
        <h1 className="text-xl font-bold text-[#12181F]">Action Tracker</h1>
        <p className="text-sm text-black/40 mt-0.5">ติดตามมติสั่งการและความก้าวหน้าต่อสาขา</p>
      </div>
      <DirectiveCommandCenter
        initialSummaries={summaries}
        initialKpis={kpis}
        isAdmin={isAdmin}
        branchCostcenter={session?.costcenter || null}
        branchName={session?.branch_name ?? null}
        meetings={meetingsList}
        defaultMeetingId={meetingsList[0]?.id ?? null}
      />
    </div>
  )
}
