import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Meeting, MeetingPreAgenda } from '@/lib/types'
import { MeetingAgendaFormSetup } from './_components/MeetingAgendaFormSetup'
import type { PreviousMeetingRow, OpenResolutionRow, PdcaSummaryRow, ObstacleSummaryRow } from './_components/MeetingAgendaFormSetup'
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
  if (session?.costcenter) notFound()

  const supabase = await createClient()

  const { data: meetingData } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single()

  if (!meetingData) notFound()
  const meeting = meetingData as Meeting

  const preAgendaRes = await supabase.from('meeting_pre_agenda').select('*').eq('meeting_id', id).maybeSingle()

  const refMonth: number | null = (preAgendaRes.data as any)?.pdca_ref_month ?? null
  const refYear: number | null  = (preAgendaRes.data as any)?.pdca_ref_year  ?? null

  const monthlyQuery = supabase
    .from('monthly_reports')
    .select('branch_id, pdca_do, pdca_act, report_month, report_year, branches(name_th)')
    .order('report_year', { ascending: false })
    .order('report_month', { ascending: false })
    .limit(200)
  if (refMonth && refYear) {
    monthlyQuery.eq('report_month', refMonth).eq('report_year', refYear)
  }

  const obstacleQuery = supabase
    .from('obstacles')
    .select('id, branch_id, obstacle_type, category, data_quality_impact, resolution_plan, status, priority_order, report_month, report_year, branches(name_th)')
    .neq('status', 'ปิดประเด็น')
  if (refMonth && refYear) {
    obstacleQuery.eq('report_month', refMonth).eq('report_year', refYear)
  } else {
    obstacleQuery.limit(0)
  }

  const [prevMeetingsRes, openResRes, monthlyRes, obstacleRes] = await Promise.all([
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
    monthlyQuery,
    obstacleQuery,
  ])

  const initialData = (preAgendaRes.data ?? null) as MeetingPreAgenda | null
  const previousMeetings: PreviousMeetingRow[] = (prevMeetingsRes.data ?? []) as PreviousMeetingRow[]
  const openResolutions: OpenResolutionRow[] = (openResRes.data ?? []) as OpenResolutionRow[]

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

  const obstacleSummaries: ObstacleSummaryRow[] = ((obstacleRes.data ?? []) as any[]).map(row => ({
    branch_name: row.branches?.name_th ?? '',
    obstacle_type: row.obstacle_type ?? '',
    category: row.category ?? '',
    data_quality_impact: row.data_quality_impact ?? null,
    resolution_plan: row.resolution_plan ?? null,
    status: row.status ?? '',
    priority_order: row.priority_order ?? 2,
    report_month: row.report_month ?? 0,
    report_year: row.report_year ?? 0,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fadein">

      {/* Progress Steps */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-sm text-white/50">รายละเอียดการประชุม</span>
        </div>
        <div className="h-px w-8 bg-white/20" />
        <div className="flex items-center gap-2">
          <Circle size={16} className="text-cyan-400 fill-cyan-500/20" />
          <span className="text-sm text-white font-semibold">วาระการประชุม</span>
        </div>
        <div className="h-px w-8 bg-white/20" />
        <div className="flex items-center gap-2">
          <Circle size={16} className="text-white/20" />
          <span className="text-sm text-white/35">รายงานการประชุม</span>
        </div>
      </div>

      {/* Meeting Info */}
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
          href={`/meeting/${id}/report`}
          className="shrink-0 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          ข้ามไปรายงาน →
        </Link>
      </div>

      <MeetingAgendaFormSetup
        meeting={meeting}
        initialData={initialData}
        previousMeetings={previousMeetings}
        openResolutions={openResolutions}
        pdcaSummaries={pdcaSummaries}
        obstacleSummaries={obstacleSummaries}
      />
    </div>
  )
}
