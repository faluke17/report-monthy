import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { BranchTable } from '@/components/dashboard/BranchTable'
import { NrwTrendChart } from '@/components/dashboard/NrwTrendChart'
import { TrafficLightGrid } from '@/components/dashboard/TrafficLightGrid'
import { MeetingBanner } from '@/components/dashboard/MeetingBanner'
import { AlertPanel } from '@/components/dashboard/AlertPanel'
import { DashboardSkeleton } from '@/components/shared/skeletons'
import { Branch, Meeting, MonthlyReport, Obstacle, RequirementWithStatus } from '@/lib/types'
import { UnsubmittedPanel } from '@/components/dashboard/UnsubmittedPanel'
import { ObstacleSummaryPanel } from '@/components/dashboard/ObstacleSummaryPanel'
import { LeakSummaryPanel } from '@/components/dashboard/LeakSummaryPanel'
import { RatsReadingPanel } from '@/components/dashboard/RatsReadingPanel'
import { getMeetingsWithRequirements } from '@/app/actions/meeting-requirements'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const yearBe = year + 543
  const today = now.toISOString().split('T')[0]

  const [
    branchesResult,
    meetingsResult,
    overdueActionsResult,
    obstaclesResult,
  ] = await Promise.all([
    supabase.from('branches').select('*').eq('is_active', true).order('province_th'),
    supabase
      .from('meetings')
      .select('*')
      .eq('status', 'กำหนดแล้ว')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('action_items')
      .select('id', { count: 'exact', head: true })
      .lt('due_date', today)
      .not('status', 'in', '("แล้วเสร็จ","ยกเลิก")'),
    supabase
      .from('obstacles')
      .select('id, status, category')
      .not('status', 'eq', 'ปิดประเด็น'),
  ])

  const branches = (branchesResult.data ?? []) as Branch[]
  const upcomingMeetings = (meetingsResult.data ?? []) as Meeting[]
  const overdueCount = overdueActionsResult.count ?? 0
  const obstacles = (obstaclesResult.data ?? []) as Pick<Obstacle, 'id' | 'status' | 'category'>[]

  // หา meeting ที่ระบุ report period ไว้ → ใช้เป็น source of truth ว่านับรายงานเดือนไหน
  const periodMeeting = upcomingMeetings.find(
    (m) => m.report_month !== null && m.report_year !== null
  ) ?? null

  const meetingsWithReqs = await getMeetingsWithRequirements()

  // หา requirement monthly_report จาก meeting ที่ใกล้ที่สุด
  const primaryReq = meetingsWithReqs
    .flatMap(m => m.requirements)
    .find(r => r.requirement_type === 'monthly_report') ?? null

  // คำนวณ period จาก requirement หรือ fallback
  const reportMonth = primaryReq?.target_month ?? periodMeeting?.report_month ?? (month === 1 ? 12 : month - 1)
  const reportYear  = primaryReq?.target_year  ?? periodMeeting?.report_year  ?? (month === 1 ? year - 1 : year)

  // ดึงรายงานของเดือนที่กำหนด
  const [reportsResult, submittedResult] = await Promise.all([
    supabase
      .from('monthly_reports')
      .select('*')
      .eq('report_year', reportYear)
      .eq('report_month', reportMonth),
    // นับจาก area_monthly_reports เพราะสาขาส่งรายงานผ่านตารางนี้
    supabase
      .from('area_monthly_reports')
      .select('branch_id')
      .eq('report_year', reportYear)
      .eq('report_month', reportMonth)
      .in('status', ['submitted', 'reviewed']),
  ])

  const reports = (reportsResult.data ?? []) as MonthlyReport[]

  // สร้าง requirementsByMeetingId สำหรับส่งไป MeetingBanner
  const requirementsByMeetingId: Record<string, RequirementWithStatus[]> = Object.fromEntries(
    meetingsWithReqs.map(m => [m.id, m.requirements])
  )

  // นับสาขาที่ยังไม่ได้ส่ง area_monthly_reports (ตัด draft ออก)
  const submittedIds = new Set((submittedResult.data ?? []).map((r) => r.branch_id as string))
  const pdcaNonSubmittedBranches = branches.filter((b) => !submittedIds.has(b.id))

  // Compute KPIs
  const withNrw = reports.filter((r) => r.nrw_pct !== null)
  const avgNrw = withNrw.length
    ? withNrw.reduce((s, r) => s + (r.nrw_pct ?? 0), 0) / withNrw.length
    : null
  const branchesOnTarget = withNrw.filter((r) => (r.nrw_pct ?? 100) <= 20).length
  const avgMnf = withNrw.length
    ? withNrw.reduce((s, r) => s + (r.mnf_factor ?? 0), 0) / withNrw.length
    : null

  // District overview computations

  const OBSTACLE_STATUSES = ['เกินกำหนด', 'ล่าช้า', 'รอสนับสนุน', 'ระหว่างแก้', 'รายงานใหม่'] as const
  const obstacleBreakdown = OBSTACLE_STATUSES.map((s) => ({
    status: s,
    count: obstacles.filter((o) => o.status === s).length,
  }))

  // เฉพาะรายงานที่ submit แล้ว — ตัด draft ที่ยังไม่ยืนยันออก
  const confirmedReports = reports.filter((r) => r.status === 'submitted' || r.status === 'reviewed')
  const totalLeaksFound    = confirmedReports.reduce((s, r) => s + (r.leaks_found    ?? 0), 0)
  const totalLeaksRepaired = confirmedReports.reduce((s, r) => s + (r.leaks_repaired ?? 0), 0)
  const totalLeaksPending  = confirmedReports.reduce((s, r) => s + (r.leaks_pending  ?? 0), 0)
  const repairRatio        = totalLeaksFound > 0
    ? Math.round((totalLeaksRepaired / totalLeaksFound) * 100) : 0

  return (
    <div className="space-y-6">
      {upcomingMeetings.length > 0 && (
        <MeetingBanner meetings={upcomingMeetings} requirementsByMeetingId={requirementsByMeetingId} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="NRW เฉลี่ยเขต"
          value={avgNrw !== null ? avgNrw.toFixed(2) : '—'}
          unit="%"
          sub={`จาก ${withNrw.length} สาขาที่ส่งข้อมูล`}
          accentColor="cyan"
        />
        <KpiCard
          label="สาขาที่ลดได้"
          value={branchesOnTarget}
          unit={`/ ${branches.length}`}
          sub="สาขา NRW ≤ 20%"
          accentColor="green"
          invertDelta
        />
        <KpiCard
          label="MNF Factor เฉลี่ย"
          value={avgMnf !== null ? avgMnf.toFixed(3) : '—'}
          sub={avgMnf !== null && avgMnf > 0.5 ? 'สูง — ต้องตรวจสอบ' : 'อยู่ในเกณฑ์ปกติ'}
          accentColor={avgMnf !== null && avgMnf > 0.5 ? 'amber' : 'teal'}
        />
        <KpiCard
          label="Action Items เกินกำหนด"
          value={overdueCount}
          unit="รายการ"
          sub="ต้องดำเนินการด่วน"
          accentColor={overdueCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* ภาพรวมเขต */}
      <div>
        <p className="page-kicker mb-3">ภาพรวมเขต</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UnsubmittedPanel
            nonSubmittedBranches={pdcaNonSubmittedBranches}
            totalBranches={branches.length}
            reportYear={reportYear}
            reportMonth={reportMonth}
            periodMeeting={periodMeeting}
            requirementTitle={primaryReq?.title ?? undefined}
            requirementDueDate={primaryReq?.due_date ?? undefined}
          />
          <ObstacleSummaryPanel
            total={obstacles.length}
            breakdown={obstacleBreakdown}
          />
          <LeakSummaryPanel
            leaksFound={totalLeaksFound}
            leaksRepaired={totalLeaksRepaired}
            leaksPending={totalLeaksPending}
            repairRatio={repairRatio}
          />
        </div>
      </div>

      {/* RATS Reading Stats */}
      <RatsReadingPanel yearBe={yearBe} month={month} />

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <BranchTable branches={branches} />
          </Suspense>
          <NrwTrendChart />
        </div>
        <div className="space-y-6">
          <TrafficLightGrid reports={reports} branches={branches} />
          <Suspense fallback={<div className="glass-card p-5 h-48 animate-pulse" />}>
            <AlertPanel />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
