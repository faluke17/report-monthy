import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { Meeting, MeetingAcknowledgment, MeetingResolution, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'
import { MeetingView } from './_components/MeetingView'

export const dynamic = 'force-dynamic'

export default async function MeetingPage() {
  const supabase = await createClient()
  const session = await getPwaSession()
  const now = new Date()
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

  let agendaHeader: MeetingAgendaHeader | null = null
  let agendaSubitems: MeetingAgendaSubItem[] = []

  if (latest) {
    const [hRes, sRes] = await Promise.all([
      supabase.from('meeting_agenda_headers').select('*').eq('meeting_id', latest.id).maybeSingle(),
      supabase
        .from('meeting_agenda_subitems')
        .select('*')
        .eq('meeting_id', latest.id)
        .order('agenda_no')
        .order('sort_order'),
    ])
    agendaHeader = hRes.data ?? null
    agendaSubitems = (sRes.data ?? []) as MeetingAgendaSubItem[]
  }

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
      upcomingMeetings={upcomingMeetings}
      pastMeetings={pastMeetings}
      acksByMeeting={acksByMeeting}
      myAcks={myAcks}
      isAdmin={isAdmin}
      branchName={session?.branch_name ?? null}
      agendaHeader={agendaHeader}
      agendaSubitems={agendaSubitems}
    />
  )
}
