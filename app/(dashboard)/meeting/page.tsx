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

  // Which meetings have an agenda filled
  const allMeetingIds = allMeetings.map((m) => m.id)
  const { data: filledHeadersRaw } = allMeetingIds.length > 0
    ? await supabase
        .from('meeting_agenda_headers')
        .select('meeting_id')
        .in('meeting_id', allMeetingIds)
    : { data: [] }
  const agendaFilledIds = new Set((filledHeadersRaw ?? []).map((h: any) => h.meeting_id))

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
  let acksByMeeting: Record<string, MeetingAcknowledgment[]> = {}
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
      agendaFilledIds={agendaFilledIds}
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
