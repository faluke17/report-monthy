import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { Meeting, MeetingAcknowledgment, MeetingResolution, MonthlyReport, Branch } from '@/lib/types'
import { MeetingView } from './_components/MeetingView'

export const dynamic = 'force-dynamic'

export default async function MeetingPage() {
  const supabase = await createClient()
  const session = await getPwaSession()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const today = now.toISOString().split('T')[0]
  const isAdmin = !session?.branch_name

  // Latest meetings for agenda/resolution/followup tabs
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .order('scheduled_date', { ascending: false })
    .limit(10)

  const rows = (meetings ?? []) as Meeting[]
  const latest = rows[0] ?? null
  const prev = rows[1] ?? null

  let latestResolutions: MeetingResolution[] = []
  let prevResolutions: MeetingResolution[] = []

  if (latest) {
    const { data } = await supabase
      .from('meeting_resolutions')
      .select('*')
      .eq('meeting_id', latest.id)
      .order('sequence_no')
    latestResolutions = (data ?? []) as MeetingResolution[]
  }

  if (prev) {
    const { data } = await supabase
      .from('meeting_resolutions')
      .select('*')
      .eq('meeting_id', prev.id)
      .order('sequence_no')
    prevResolutions = (data ?? []) as MeetingResolution[]
  }

  const { data: nrwData } = await supabase
    .from('monthly_reports')
    .select('*, branches(*)')
    .eq('report_year', year)
    .eq('report_month', month)
    .order('nrw_pct', { ascending: false })

  const nrwReports = (nrwData ?? []) as (MonthlyReport & { branches?: Branch })[]

  const { count: totalBranches } = await supabase
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  // Schedule tab: upcoming and past meetings + acks
  const [upcomingRes, pastRes] = await Promise.all([
    supabase
      .from('meetings')
      .select('*')
      .eq('status', 'กำหนดแล้ว')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('meetings')
      .select('*')
      .in('status', ['เสร็จสิ้น', 'เลื่อน', 'ยกเลิก'])
      .order('scheduled_date', { ascending: false })
      .limit(5),
  ])

  const upcomingMeetings = (upcomingRes.data ?? []) as Meeting[]
  const pastMeetings = (pastRes.data ?? []) as Meeting[]
  const allIds = [...upcomingMeetings, ...pastMeetings].map((m) => m.id)

  let acksByMeeting: Record<string, MeetingAcknowledgment[]> = {}
  let myAcks: MeetingAcknowledgment[] = []

  if (allIds.length > 0) {
    if (isAdmin) {
      const { data: ackData } = await supabase
        .from('meeting_acknowledgments')
        .select('*')
        .in('meeting_id', allIds)
      const acks = (ackData ?? []) as MeetingAcknowledgment[]
      for (const a of acks) {
        if (!acksByMeeting[a.meeting_id]) acksByMeeting[a.meeting_id] = []
        acksByMeeting[a.meeting_id].push(a)
      }
    } else if (session?.branch_name) {
      const { data: ackData } = await supabase
        .from('meeting_acknowledgments')
        .select('*')
        .in('meeting_id', allIds)
        .eq('branch_name', session.branch_name)
      myAcks = (ackData ?? []) as MeetingAcknowledgment[]
    }
  }

  return (
    <MeetingView
      latestMeeting={latest}
      prevMeeting={prev}
      latestResolutions={latestResolutions}
      prevResolutions={prevResolutions}
      nrwReports={nrwReports}
      totalBranches={totalBranches ?? 26}
      currentYear={year}
      currentMonth={month}
      upcomingMeetings={upcomingMeetings}
      pastMeetings={pastMeetings}
      acksByMeeting={acksByMeeting}
      myAcks={myAcks}
      isAdmin={isAdmin}
      branchName={session?.branch_name ?? null}
    />
  )
}
