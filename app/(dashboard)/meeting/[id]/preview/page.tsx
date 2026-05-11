import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { notFound } from 'next/navigation'
import type {
  Meeting,
  MeetingAgendaHeader,
  MeetingAgendaSubItem,
  MeetingResolution,
  Obstacle,
} from '@/lib/types'
import { MeetingPreviewClient } from './_components/MeetingPreviewClient'

export const dynamic = 'force-dynamic'

export default async function MeetingPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getPwaSession()
  if (session?.branch_name) notFound()

  const supabase = await createClient()

  const { data: meetingData } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (!meetingData) notFound()
  const meeting = meetingData as Meeting

  const [headerRes, subitemsRes, prevRes] = await Promise.all([
    supabase.from('meeting_agenda_headers').select('*').eq('meeting_id', id).maybeSingle(),
    supabase
      .from('meeting_agenda_subitems')
      .select('*')
      .eq('meeting_id', id)
      .order('agenda_no')
      .order('sort_order'),
    supabase
      .from('meetings')
      .select('*')
      .lt('scheduled_date', meeting.scheduled_date)
      .order('scheduled_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const agendaHeader = (headerRes.data ?? null) as MeetingAgendaHeader | null
  const agendaSubitems = (subitemsRes.data ?? []) as MeetingAgendaSubItem[]
  const prevMeeting = (prevRes.data ?? null) as Meeting | null

  let prevResolutions: MeetingResolution[] = []
  if (prevMeeting) {
    const { data } = await supabase
      .from('meeting_resolutions')
      .select('*')
      .eq('meeting_id', prevMeeting.id)
      .order('sequence_no')
    prevResolutions = (data ?? []) as MeetingResolution[]
  }

  const { data: obstaclesData } = await supabase
    .from('obstacles')
    .select('*, branches(id, name_th, code)')
    .not('status', 'eq', 'ปิดประเด็น')
    .order('priority_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const obstacles = (obstaclesData ?? []) as Obstacle[]

  return (
    <MeetingPreviewClient
      meeting={meeting}
      agendaHeader={agendaHeader}
      agendaSubitems={agendaSubitems}
      prevMeeting={prevMeeting}
      prevResolutions={prevResolutions}
      obstacles={obstacles}
    />
  )
}
