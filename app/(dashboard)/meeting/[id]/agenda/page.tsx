import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Meeting, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'
import { MeetingAgendaFormSetup } from './_components/MeetingAgendaFormSetup'
import { Calendar, CheckCircle2, Circle } from 'lucide-react'
import { formatThaiDate } from '@/lib/utils/date-th'

export const dynamic = 'force-dynamic'

export default async function MeetingAgendaPage({
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

  const [headerRes, subitemsRes] = await Promise.all([
    supabase.from('meeting_agenda_headers').select('*').eq('meeting_id', id).maybeSingle(),
    supabase
      .from('meeting_agenda_subitems')
      .select('*')
      .eq('meeting_id', id)
      .order('agenda_no')
      .order('sort_order'),
  ])

  const agendaHeader = (headerRes.data ?? null) as MeetingAgendaHeader | null
  const agendaSubitems = (subitemsRes.data ?? []) as MeetingAgendaSubItem[]

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadein">

      {/* Progress Steps */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-sm text-white/50">รายละเอียดการประชุม</span>
        </div>
        <div className="h-px w-8 bg-white/20" />
        <div className="flex items-center gap-2">
          <Circle size={16} className="text-cyan-400 fill-cyan-500/20" />
          <span className="text-sm text-white font-semibold">กรอกวาระการประชุม</span>
        </div>
        <div className="h-px w-8 bg-white/20" />
        <div className="flex items-center gap-2">
          <Circle size={16} className="text-white/20" />
          <span className="text-sm text-white/35">ตรวจสอบ &amp; Preview</span>
        </div>
      </div>

      {/* Meeting Info Summary */}
      <div className="glass-card-sm p-4 flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-white truncate">{meeting.title}</p>
          <p className="text-xs text-white/40 flex items-center gap-1.5">
            <Calendar size={11} className="text-white/30" />
            {formatThaiDate(meeting.scheduled_date)} · {meeting.scheduled_time.slice(0, 5)} น.
            {meeting.location && ` · ${meeting.location}`}
          </p>
        </div>
        <Link
          href={`/meeting/${id}/preview`}
          className="shrink-0 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          ข้ามไป Preview
        </Link>
      </div>

      {/* Agenda Form */}
      <MeetingAgendaFormSetup
        meeting={meeting}
        initialHeader={agendaHeader}
        initialSubitems={agendaSubitems}
      />

    </div>
  )
}
