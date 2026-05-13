import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Meeting, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'
import { MeetingAgendaFormSetup } from './_components/MeetingAgendaFormSetup'
import { Calendar, CheckCircle2, Circle } from 'lucide-react'
import { formatThaiDate } from '@/lib/utils/date-th'
import type { PreviousMeetingRow, OpenResolutionRow, PdcaSummaryRow } from './_components/MeetingAgendaFormSetup'

export const dynamic = 'force-dynamic'

export default async function MeetingAgendaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getPwaSession()
  if (session?.costcenter) notFound()

  const supabase = await createClient()

  const { data: meetingData } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (!meetingData) notFound()
  const meeting = meetingData as Meeting

  const [headerRes, subitemsRes, prevMeetingsRes, openResRes, monthlyRes] = await Promise.all([
    supabase.from('meeting_agenda_headers').select('*').eq('meeting_id', id).maybeSingle(),
    supabase
      .from('meeting_agenda_subitems')
      .select('*')
      .eq('meeting_id', id)
      .order('agenda_no')
      .order('sort_order'),
    supabase
      .from('meetings')
      .select('id, code, title, scheduled_date')
      .eq('status', 'เสร็จสิ้น')
      .order('scheduled_date', { ascending: false })
      .limit(20),
    supabase
      .from('meeting_resolutions')
      .select('id, meeting_id, title, responsible_branch, due_date, status, progress_pct, sequence_no')
      .neq('meeting_id', id)
      .neq('status', 'แล้วเสร็จ')
      .neq('status', 'ปิดประเด็น')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(30),
    supabase
      .from('monthly_reports')
      .select('branch_id, pdca_do, pdca_act, report_month, report_year, branches(name_th)')
      .order('report_year', { ascending: false })
      .order('report_month', { ascending: false })
      .limit(200),
  ])

  const agendaHeader = (headerRes.data ?? null) as MeetingAgendaHeader | null
  const agendaSubitems = (subitemsRes.data ?? []) as MeetingAgendaSubItem[]
  const previousMeetings: PreviousMeetingRow[] = (prevMeetingsRes.data ?? []) as PreviousMeetingRow[]
  const openResolutions: OpenResolutionRow[] = (openResRes.data ?? []) as OpenResolutionRow[]

  // Deduplicate monthly_reports by branch_id → keep latest
  const branchMap = new Map<string, PdcaSummaryRow>()
  for (const row of (monthlyRes.data ?? []) as any[]) {
    if (!branchMap.has(row.branch_id)) {
      branchMap.set(row.branch_id, {
        branch_name: row.branches?.name_th ?? '',
        pdca_do: row.pdca_do ?? null,
        pdca_act: row.pdca_act ?? null,
        report_month: row.report_month,
        report_year: row.report_year,
      })
    }
  }
  const pdcaSummaries: PdcaSummaryRow[] = Array.from(branchMap.values())

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
        previousMeetings={previousMeetings}
        openResolutions={openResolutions}
        pdcaSummaries={pdcaSummaries}
      />

    </div>
  )
}
