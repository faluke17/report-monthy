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

function deriveNrwPeriod(scheduledDate: string): { fiscalYear: number; month: number } {
  const d = new Date(scheduledDate)
  const month = d.getMonth() + 1
  const buddhistYear = d.getFullYear() + 543
  const fiscalYear = month >= 10 ? buddhistYear + 1 : buddhistYear
  return { fiscalYear, month }
}

export const dynamic = 'force-dynamic'

export default async function MeetingPreviewPage({
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

  const { fiscalYear: nrwFiscalYear, month: nrwMonth } = deriveNrwPeriod(meeting.scheduled_date)

  const [headerRes, subitemsRes, prevRes, currNrwRes, prevNrwRes, monthlyRes] = await Promise.all([
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
    (supabase as any)
      .from('nrw_branch_monthly')
      .select('branch_name, month, water_produced, water_sold, water_free, blow_off')
      .eq('fiscal_year', nrwFiscalYear),
    (supabase as any)
      .from('nrw_branch_monthly')
      .select('branch_name, month, water_produced, water_sold, water_free, blow_off')
      .eq('fiscal_year', nrwFiscalYear - 1),
    supabase
      .from('monthly_reports')
      .select('branch_id, pdca_do, pdca_act, report_month, report_year, branches(name_th)')
      .order('report_year', { ascending: false })
      .order('report_month', { ascending: false })
      .limit(400),
  ])

  const agendaHeader = (headerRes.data ?? null) as MeetingAgendaHeader | null
  const agendaSubitems = (subitemsRes.data ?? []) as MeetingAgendaSubItem[]
  const prevMeeting = (prevRes.data ?? null) as Meeting | null
  const nrwCurrRaw: any[] = currNrwRes.data ?? []
  const nrwPrevRaw: any[] = prevNrwRes.data ?? []

  console.log('[preview] monthlyRes rows:', monthlyRes.data?.length, 'error:', monthlyRes.error?.message)

  const pdcaAllRows = (monthlyRes.data ?? []).map((row: any) => ({
    branch_name: row.branches?.name_th ?? '',
    pdca_do: row.pdca_do ?? null,
    pdca_act: row.pdca_act ?? null,
    report_month: row.report_month,
    report_year: row.report_year,
  }))

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
      nrwCurrRaw={nrwCurrRaw}
      nrwPrevRaw={nrwPrevRaw}
      nrwFiscalYear={nrwFiscalYear}
      nrwMonth={nrwMonth}
      pdcaAllRows={pdcaAllRows}
    />
  )
}
