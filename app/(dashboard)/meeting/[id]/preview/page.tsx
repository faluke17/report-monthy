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

  // ดึง PDCA จาก area_monthly_reports (ตารางจริงที่สาขาใช้กรอก)
  // แต่ละสาขามีหลาย area → aggregate ต่อสาขา
  let areaQuery = (supabase as any)
    .from('area_monthly_reports')
    .select('branch_id, pdca_do, pdca_act, report_month, report_year, water_dist_after, water_sold_after, mnf_after, leaks_repaired, leaks_pending, branches(name_th), step_test_results(leaks_found)')
    .order('report_year', { ascending: false })
    .order('report_month', { ascending: false })

  if (pdcaRefMonth && pdcaRefYear) {
    areaQuery = areaQuery
      .eq('report_month', pdcaRefMonth)
      .eq('report_year', pdcaRefYear)
  } else {
    areaQuery = areaQuery.limit(1000)
  }

  // Previous month for delta comparison
  const prevMonthNum = pdcaRefMonth ? (pdcaRefMonth === 1 ? 12 : pdcaRefMonth - 1) : null
  const prevMonthYear = pdcaRefMonth
    ? (pdcaRefMonth === 1 ? (pdcaRefYear ?? 0) - 1 : pdcaRefYear)
    : null

  const [areaRes, prevAreaRes] = await Promise.all([
    areaQuery,
    prevMonthNum && prevMonthYear
      ? (supabase as any)
          .from('area_monthly_reports')
          .select('branch_id, water_dist_after, water_sold_after, mnf_after, branches(name_th)')
          .eq('report_month', prevMonthNum)
          .eq('report_year', prevMonthYear)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Aggregate area rows → one row per branch
  function aggregateAreaRows(rows: any[]): {
    branch_name: string; pdca_do: string | null; pdca_act: string | null
    report_month: number; report_year: number
    volume_distributed: number | null; volume_sold: number | null
    mnf_latest: number | null; nrw_pct: number | null
    leaks_found: number; leaks_repaired: number; leaks_pending: number
  }[] {
    const map = new Map<string, {
      name: string; do_parts: string[]; act_parts: string[]
      month: number; year: number
      dist: number; sold: number; mnf_sum: number; mnf_count: number
      lf: number; lr: number; lp: number
    }>()
    for (const row of rows) {
      const name: string = row.branches?.name_th ?? ''
      if (!name) continue
      if (!map.has(name)) {
        map.set(name, { name, do_parts: [], act_parts: [], month: row.report_month, year: row.report_year, dist: 0, sold: 0, mnf_sum: 0, mnf_count: 0, lf: 0, lr: 0, lp: 0 })
      }
      const a = map.get(name)!
      if (row.pdca_do) a.do_parts.push(row.pdca_do)
      if (row.pdca_act) a.act_parts.push(row.pdca_act)
      a.dist += row.water_dist_after ?? 0
      a.sold += row.water_sold_after ?? 0
      if (row.mnf_after != null) { a.mnf_sum += row.mnf_after; a.mnf_count++ }
      a.lr += row.leaks_repaired ?? 0
      a.lp += row.leaks_pending ?? 0
      for (const st of row.step_test_results ?? []) a.lf += st.leaks_found ?? 0
    }
    return Array.from(map.values()).map(a => {
      const nrw_pct = a.dist > 0 ? Math.round((a.dist - a.sold) / a.dist * 10000) / 100 : null
      return {
        branch_name: a.name,
        pdca_do: a.do_parts.length ? a.do_parts.join('\n\n') : null,
        pdca_act: a.act_parts.length ? a.act_parts.join('\n\n') : null,
        report_month: a.month, report_year: a.year,
        volume_distributed: a.dist || null, volume_sold: a.sold || null,
        mnf_latest: a.mnf_count ? Math.round(a.mnf_sum / a.mnf_count * 100) / 100 : null,
        nrw_pct,
        leaks_found: a.lf, leaks_repaired: a.lr, leaks_pending: a.lp,
      }
    })
  }

  const pdcaAllRows = aggregateAreaRows(areaRes.data ?? []).map(r => ({
    ...r,
    mnf_factor: null,
    leaks_repeat: 0,
    meters_abnormal: 0,
  }))

  const prevAggregated = aggregateAreaRows(prevAreaRes.data ?? [])
  const pdcaPrevRows = prevAggregated.map(r => ({
    branch_name: r.branch_name,
    volume_distributed: r.volume_distributed,
    volume_sold: r.volume_sold,
    mnf_latest: r.mnf_latest,
    nrw_pct: r.nrw_pct,
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
