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

  const [headerRes, subitemsRes, prevRes, currNrwRes, prevNrwRes, preAgendaRes] = await Promise.all([
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
      .from('meeting_pre_agenda')
      .select('pdca_ref_month, pdca_ref_year')
      .eq('meeting_id', id)
      .maybeSingle(),
  ])

  const agendaHeader = (headerRes.data ?? null) as MeetingAgendaHeader | null
  const agendaSubitems = (subitemsRes.data ?? []) as MeetingAgendaSubItem[]
  const prevMeeting = (prevRes.data ?? null) as Meeting | null
  const nrwCurrRaw: any[] = currNrwRes.data ?? []
  const nrwPrevRaw: any[] = prevNrwRes.data ?? []

  const pdcaRefMonth: number | null = preAgendaRes.data?.pdca_ref_month ?? null
  const pdcaRefYear: number | null = preAgendaRes.data?.pdca_ref_year ?? null

  // ดึง PDCA: ถ้ามี ref ระบุ → ดึงเฉพาะเดือนนั้น, ถ้าไม่มี → ดึง 400 rows ล่าสุดให้ user เลือกเอง
  let monthlyQuery = supabase
    .from('monthly_reports')
    .select('branch_id, pdca_do, pdca_act, report_month, report_year, branches(name_th), volume_distributed, volume_sold, mnf_latest, mnf_factor, nrw_pct, leaks_found, leaks_repaired, leaks_pending, leaks_repeat, meters_abnormal')
    .order('report_year', { ascending: false })
    .order('report_month', { ascending: false })

  if (pdcaRefMonth && pdcaRefYear) {
    monthlyQuery = monthlyQuery
      .eq('report_month', pdcaRefMonth)
      .eq('report_year', pdcaRefYear)
  } else {
    monthlyQuery = (monthlyQuery as any).limit(400)
  }

  // Previous month for delta comparison
  const prevMonthNum = pdcaRefMonth ? (pdcaRefMonth === 1 ? 12 : pdcaRefMonth - 1) : null
  const prevMonthYear = pdcaRefMonth
    ? (pdcaRefMonth === 1 ? (pdcaRefYear ?? 0) - 1 : pdcaRefYear)
    : null

  const [monthlyRes, prevMonthlyRes] = await Promise.all([
    monthlyQuery,
    prevMonthNum && prevMonthYear
      ? supabase
          .from('monthly_reports')
          .select('branch_id, volume_distributed, volume_sold, mnf_latest, nrw_pct, branches(name_th)')
          .eq('report_month', prevMonthNum)
          .eq('report_year', prevMonthYear)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const pdcaAllRows = (monthlyRes.data ?? []).map((row: any) => ({
    branch_name: row.branches?.name_th ?? '',
    pdca_do: row.pdca_do ?? null,
    pdca_act: row.pdca_act ?? null,
    report_month: row.report_month,
    report_year: row.report_year,
    volume_distributed: row.volume_distributed ?? null,
    volume_sold: row.volume_sold ?? null,
    mnf_latest: row.mnf_latest ?? null,
    mnf_factor: row.mnf_factor ?? null,
    nrw_pct: row.nrw_pct ?? null,
    leaks_found: row.leaks_found ?? 0,
    leaks_repaired: row.leaks_repaired ?? 0,
    leaks_pending: row.leaks_pending ?? 0,
    leaks_repeat: row.leaks_repeat ?? 0,
    meters_abnormal: row.meters_abnormal ?? 0,
  }))

  const pdcaPrevRows = (prevMonthlyRes.data ?? []).map((row: any) => ({
    branch_name: row.branches?.name_th ?? '',
    volume_distributed: row.volume_distributed ?? null,
    volume_sold: row.volume_sold ?? null,
    mnf_latest: row.mnf_latest ?? null,
    nrw_pct: row.nrw_pct ?? null,
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
      pdcaPrevRows={pdcaPrevRows}
      pdcaRefMonth={pdcaRefMonth}
      pdcaRefYear={pdcaRefYear}
    />
  )
}
