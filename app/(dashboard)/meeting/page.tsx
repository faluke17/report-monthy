import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { Meeting, MeetingAcknowledgment, MeetingResolution } from '@/lib/types'
import { MeetingView } from './_components/MeetingView'

export const dynamic = 'force-dynamic'

export default async function MeetingPage() {
  const supabase = await createClient()
  const session = await getPwaSession()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const isAdmin = !session?.costcenter

  // All meetings (newest first)
  const { data: allMeetingsRaw } = await supabase
    .from('meetings')
    .select('*')
    .order('scheduled_date', { ascending: false })
    .limit(50)

  const allMeetings = (allMeetingsRaw ?? []) as Meeting[]
  const latest = allMeetings[0] ?? null
  const prev = allMeetings[1] ?? null

  // Which meetings have pre-agenda / report filled
  const allMeetingIds = allMeetings.map((m) => m.id)
  let preAgendaFilledIds = new Set<string>()
  let reportFilledIds = new Set<string>()

  if (allMeetingIds.length > 0) {
    const [preAgendaRes, reportHeadersRes] = await Promise.all([
      supabase.from('meeting_pre_agenda').select('meeting_id').in('meeting_id', allMeetingIds),
      supabase.from('meeting_agenda_headers').select('meeting_id').in('meeting_id', allMeetingIds),
    ])
    preAgendaFilledIds = new Set((preAgendaRes.data ?? []).map((h: any) => h.meeting_id))
    reportFilledIds = new Set((reportHeadersRes.data ?? []).map((h: any) => h.meeting_id))
  }

  // Resolutions for latest two meetings (resolution/followup tabs)
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

  // Split meetings for schedule tab
  const upcomingMeetings = allMeetings
    .filter((m) => m.status === 'กำหนดแล้ว' && m.scheduled_date >= today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

  const overdueMeetings = allMeetings
    .filter((m) => m.status === 'กำหนดแล้ว' && m.scheduled_date < today)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))

  const pastMeetings = allMeetings
    .filter((m) => ['เสร็จสิ้น', 'เลื่อน', 'ยกเลิก'].includes(m.status))

  // Acks for schedule tab
  const scheduleIds = [...upcomingMeetings, ...overdueMeetings, ...pastMeetings].map((m) => m.id)
  const acksByMeeting: Record<string, MeetingAcknowledgment[]> = {}
  let myAcks: MeetingAcknowledgment[] = []

  if (scheduleIds.length > 0) {
    if (isAdmin) {
      const { data: ackData } = await supabase
        .from('meeting_acknowledgments')
        .select('*')
        .in('meeting_id', scheduleIds)
      const acks = (ackData ?? []) as MeetingAcknowledgment[]
      for (const a of acks) {
        if (!acksByMeeting[a.meeting_id]) acksByMeeting[a.meeting_id] = []
        acksByMeeting[a.meeting_id].push(a)
      }
    } else if (session?.branch_name) {
      const { data: ackData } = await supabase
        .from('meeting_acknowledgments')
        .select('*')
        .in('meeting_id', scheduleIds)
        .eq('branch_name', session.branch_name)
      myAcks = (ackData ?? []) as MeetingAcknowledgment[]
    }
  }

  return (
    <MeetingView
      allMeetings={allMeetings}
      preAgendaFilledIds={preAgendaFilledIds}
      reportFilledIds={reportFilledIds}
      latestMeeting={latest}
      prevMeeting={prev}
      latestResolutions={latestResolutions}
      prevResolutions={prevResolutions}
      upcomingMeetings={upcomingMeetings}
      overdueMeetings={overdueMeetings}
      pastMeetings={pastMeetings}
      acksByMeeting={acksByMeeting}
      myAcks={myAcks}
      isAdmin={isAdmin}
      branchName={session?.branch_name ?? null}
      branchCostcenter={session?.costcenter ?? null}
    />
  )
}
