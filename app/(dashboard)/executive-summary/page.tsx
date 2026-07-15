import { redirect } from 'next/navigation'
import { getPwaSession } from '@/lib/pwa-auth'
import { createClient } from '@/lib/supabase/server'
import { ExecutiveSummaryClient } from './_components/ExecutiveSummaryClient'
import type { Branch } from '@/lib/types'

export const metadata = { title: 'บทสรุปผู้บริหาร | NRW Tracker' }
export const dynamic = 'force-dynamic'

export interface BranchNrwSnap {
  branch_id: string
  cum_pct: number | null        // NRW% สะสมตั้งแต่ ต.ค. ถึงเดือนล่าสุดที่มีข้อมูล (ปีงบปัจจุบัน)
  cum_trend_delta: number | null // ผลต่าง pct สะสม (เดือนล่าสุด − เดือนก่อนหน้า) บวก=แย่ลง ลบ=ดีขึ้น
  cum_months: number             // จำนวนเดือนที่นับสะสม
}

// ภาพรวมน้ำสูญเสียทั้งเขต — รวมทุกสาขาต่อเดือน แล้วคำนวณสะสมแบบเดียวกับ BranchNrwSnap
export interface RegionNrwSnap {
  cum_pct: number | null            // NRW% สะสมทั้งเขตตั้งแต่ ต.ค. ถึงเดือนล่าสุด
  cum_trend_delta: number | null    // ผลต่าง %สะสม เดือนล่าสุด vs เดือนก่อนหน้า
  cum_months: number
  cum_loss_total: number | null     // ปริมาณน้ำสูญเสียสะสมรวมทั้งเขต (m³)
  cum_produced_total: number | null // ปริมาณน้ำจ่ายสะสมรวมทั้งเขต (m³)
  latest_month: number | null       // เดือนปฏิทินล่าสุดที่มีข้อมูลครบ
  latest_month_pct: number | null   // NRW% เฉพาะเดือนล่าสุด (ไม่สะสม)
  latest_month_delta: number | null // ผลต่าง NRW% เดือนล่าสุด vs เดือนก่อนหน้า (ไม่สะสม)
  branches_reporting: number
  branches_on_target: number
  branches_total: number
}

// ปีงบประมาณ กปภ. เริ่ม ต.ค. จบ ก.ย. — ลำดับเดือนตามปีงบ
const FISCAL_MONTH_ORDER = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function toFiscalYear(gregorianYear: number, month: number): number {
  return month >= 10 ? gregorianYear + 543 + 1 : gregorianYear + 543
}

type NrwMonthRow = {
  branch_name: string
  fiscal_year: number
  month: number
  water_produced: number | null
  water_sold: number | null
  water_free: number | null
  blow_off: number | null
}

// สะสม produced/sold/free/blow_off ตั้งแต่ ต.ค. ถึงเดือนล่าสุดที่มีข้อมูล (หยุดที่เดือนแรกที่ยังไม่มีข้อมูล)
// แล้วเทียบ %สะสม ณ เดือนล่าสุด กับ %สะสม ณ เดือนก่อนหน้า เพื่อดูแนวโน้ม
function computeCumulativeTrend(rows: NrwMonthRow[]): Omit<BranchNrwSnap, 'branch_id'> {
  const byMonth = new Map(rows.map((r) => [r.month, r]))
  let sumProduced = 0, sumSold = 0, sumFree = 0, sumBlowoff = 0
  let monthsCounted = 0
  let prevPct: number | null = null
  let currPct: number | null = null

  for (const month of FISCAL_MONTH_ORDER) {
    const row = byMonth.get(month)
    if (!row || row.water_produced == null) break

    sumProduced += row.water_produced ?? 0
    sumSold += row.water_sold ?? 0
    sumFree += row.water_free ?? 0
    sumBlowoff += row.blow_off ?? 0
    monthsCounted += 1

    const loss = sumProduced - sumSold - sumFree - sumBlowoff
    prevPct = currPct
    currPct = sumProduced > 0 ? (loss / sumProduced) * 100 : null
  }

  return {
    cum_pct: currPct,
    cum_trend_delta: currPct != null && prevPct != null ? currPct - prevPct : null,
    cum_months: monthsCounted,
  }
}

// รวมทุกสาขาต่อเดือนก่อน แล้วคำนวณสะสม/เดือนล่าสุดแบบเดียวกับ computeCumulativeTrend
function computeRegionSnap(rows: NrwMonthRow[], branchesTotal: number): RegionNrwSnap {
  const byMonth = new Map<number, { produced: number; sold: number; free: number; blowoff: number }>()
  for (const r of rows) {
    if (r.water_produced == null) continue
    const agg = byMonth.get(r.month) ?? { produced: 0, sold: 0, free: 0, blowoff: 0 }
    agg.produced += r.water_produced ?? 0
    agg.sold += r.water_sold ?? 0
    agg.free += r.water_free ?? 0
    agg.blowoff += r.blow_off ?? 0
    byMonth.set(r.month, agg)
  }

  let sumProduced = 0, sumSold = 0, sumFree = 0, sumBlowoff = 0
  let monthsCounted = 0
  let prevCumPct: number | null = null
  let currCumPct: number | null = null
  let latestMonth: number | null = null
  let latestMonthPct: number | null = null
  let prevMonthPct: number | null = null

  for (const month of FISCAL_MONTH_ORDER) {
    const agg = byMonth.get(month)
    if (!agg) break

    prevMonthPct = latestMonthPct
    latestMonthPct = agg.produced > 0 ? ((agg.produced - agg.sold - agg.free - agg.blowoff) / agg.produced) * 100 : null
    latestMonth = month

    sumProduced += agg.produced
    sumSold += agg.sold
    sumFree += agg.free
    sumBlowoff += agg.blowoff
    monthsCounted += 1

    const loss = sumProduced - sumSold - sumFree - sumBlowoff
    prevCumPct = currCumPct
    currCumPct = sumProduced > 0 ? (loss / sumProduced) * 100 : null
  }

  const branchesOnTarget = latestMonth != null
    ? rows.filter((r) => {
        if (r.month !== latestMonth || !r.water_produced) return false
        const pct = ((r.water_produced - (r.water_sold ?? 0) - (r.water_free ?? 0) - (r.blow_off ?? 0)) / r.water_produced) * 100
        return pct <= 20
      }).length
    : 0

  const branchesReporting = latestMonth != null
    ? new Set(rows.filter((r) => r.month === latestMonth && r.water_produced != null).map((r) => r.branch_name)).size
    : 0

  return {
    cum_pct: currCumPct,
    cum_trend_delta: currCumPct != null && prevCumPct != null ? currCumPct - prevCumPct : null,
    cum_months: monthsCounted,
    cum_loss_total: monthsCounted > 0 ? sumProduced - sumSold - sumFree - sumBlowoff : null,
    cum_produced_total: monthsCounted > 0 ? sumProduced : null,
    latest_month: latestMonth,
    latest_month_pct: latestMonthPct,
    latest_month_delta: latestMonthPct != null && prevMonthPct != null ? latestMonthPct - prevMonthPct : null,
    branches_reporting: branchesReporting,
    branches_on_target: branchesOnTarget,
    branches_total: branchesTotal,
  }
}

export default async function ExecutiveSummaryPage() {
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const now = new Date()
  const currentFiscalYear = toFiscalYear(now.getFullYear(), now.getMonth() + 1)

  const [branchesRes, nrwMonthlyRes] = await Promise.all([
    supabase
      .from('branches')
      .select('id,code,name_th,province_th,region,is_active,created_at')
      .eq('is_active', true)
      .order('name_th'),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('nrw_branch_monthly')
      .select('branch_name,fiscal_year,month,water_produced,water_sold,water_free,blow_off')
      .eq('fiscal_year', currentFiscalYear),
  ])

  const branches = (branchesRes.data ?? []) as Branch[]

  const rowsByBranchName = new Map<string, NrwMonthRow[]>()
  for (const r of (nrwMonthlyRes.data ?? []) as NrwMonthRow[]) {
    const arr = rowsByBranchName.get(r.branch_name) ?? []
    arr.push(r)
    rowsByBranchName.set(r.branch_name, arr)
  }

  const snapMap: Record<string, BranchNrwSnap> = {}
  for (const b of branches) {
    const trend = computeCumulativeTrend(rowsByBranchName.get(b.name_th) ?? [])
    snapMap[b.id] = { branch_id: b.id, ...trend }
  }

  const regionSnap = computeRegionSnap((nrwMonthlyRes.data ?? []) as NrwMonthRow[], branches.length)

  return (
    // Cancel dashboard layout padding to fill the whole viewport
    <div
      className="-m-4 -mb-20 md:-m-6 md:-mb-6 overflow-hidden"
      style={{ height: 'calc(100dvh - 56px)' }}
    >
      <ExecutiveSummaryClient
        branches={branches}
        snapMap={snapMap}
        regionSnap={regionSnap}
      />
    </div>
  )
}
