import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { BranchTable } from '@/components/dashboard/BranchTable'
import { NrwTrendChart } from '@/components/dashboard/NrwTrendChart'
import { TrafficLightGrid } from '@/components/dashboard/TrafficLightGrid'
import { MeetingBanner } from '@/components/dashboard/MeetingBanner'
import { AlertPanel } from '@/components/dashboard/AlertPanel'
import { DashboardSkeleton } from '@/components/shared/skeletons'
import { Branch, Meeting, MonthlyReport, Obstacle } from '@/lib/types'
import { UnsubmittedPanel } from '@/components/dashboard/UnsubmittedPanel'
import { ObstacleSummaryPanel } from '@/components/dashboard/ObstacleSummaryPanel'
import { LeakSummaryPanel } from '@/components/dashboard/LeakSummaryPanel'
import { RatsReadingPanel } from '@/components/dashboard/RatsReadingPanel'

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
    reportsResult,
    meetingResult,
    overdueActionsResult,
    obstaclesResult,
    ratsResult,
    pdcaSubmittedResult,
  ] = await Promise.all([
    supabase.from('branches').select('*').eq('is_active', true).order('province_th'),
    supabase
      .from('monthly_reports')
      .select('*')
      .eq('report_year', year)
      .eq('report_month', month),
    supabase
      .from('meetings')
      .select('*')
      .eq('status', 'กำหนดแล้ว')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('action_items')
      .select('id', { count: 'exact', head: true })
      .lt('due_date', today)
      .not('status', 'in', '("แล้วเสร็จ","ยกเลิก")'),
    supabase
      .from('obstacles')
      .select('id, status, category')
      .not('status', 'eq', 'ปิดประเด็น'),
    supabase
      .from('branch_read_stats')
      .select('ba, read_count, cust_count, target')
      .eq('year_be', yearBe)
      .eq('month', month),
    supabase
      .from('area_monthly_reports')
      .select('branch_id')
      .eq('report_year', year)
      .eq('report_month', month),
  ])

  const branches = (branchesResult.data ?? []) as Branch[]
  const reports = (reportsResult.data ?? []) as MonthlyReport[]
  const meeting = meetingResult.data as Meeting | null
  const overdueCount = overdueActionsResult.count ?? 0
  const obstacles = (obstaclesResult.data ?? []) as Pick<Obstacle, 'id' | 'status' | 'category'>[]
  const ratsStats = ratsResult.data ?? []

  // PDCA submission tracking
  const pdcaSubmittedIds = new Set((pdcaSubmittedResult.data ?? []).map((r) => r.branch_id as string))
  const pdcaNonSubmittedBranches = branches.filter((b) => !pdcaSubmittedIds.has(b.id))

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

  const totalLeaksFound    = reports.reduce((s, r) => s + (r.leaks_found    ?? 0), 0)
  const totalLeaksRepaired = reports.reduce((s, r) => s + (r.leaks_repaired ?? 0), 0)
  const totalLeaksPending  = reports.reduce((s, r) => s + (r.leaks_pending  ?? 0), 0)
  const repairRatio        = totalLeaksFound > 0
    ? Math.round((totalLeaksRepaired / totalLeaksFound) * 100) : 0

  return (
    <div className="space-y-6">
      {meeting && <MeetingBanner meeting={meeting} />}

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
            nextMeeting={meeting}
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
      {ratsStats.length > 0 && (
        <RatsReadingPanel stats={ratsStats} yearBe={yearBe} month={month} />
      )}

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
