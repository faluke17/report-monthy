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
  cum_trend_delta: number | null // ผลต่าง NRW% เดือนล่าสุด เทียบเดือนเดียวกันปีก่อน (YoY, ไม่สะสม) บวก=แย่ลง ลบ=ดีขึ้น
  cum_months: number             // จำนวนเดือนที่นับสะสม
}

// ภาพรวมน้ำสูญเสียทั้งเขต — รวมทุกสาขาต่อเดือน แล้วคำนวณสะสมแบบเดียวกับ BranchNrwSnap
export interface RegionNrwSnap {
  cum_pct: number | null            // NRW% สะสมทั้งเขตตั้งแต่ ต.ค. ถึงเดือนล่าสุด
  cum_trend_delta: number | null    // ผลต่าง NRW% เดือนล่าสุด เทียบเดือนเดียวกันปีก่อน (YoY, ไม่สะสม) — เท่ากับ latest_month_delta
  cum_months: number
  latest_month: number | null       // เดือนปฏิทินล่าสุดที่มีข้อมูลครบ
  latest_month_pct: number | null   // NRW% เฉพาะเดือนล่าสุด (ไม่สะสม)
  latest_month_delta: number | null // ผลต่าง NRW% เดือนล่าสุด เทียบเดือนเดียวกันปีก่อน (YoY, ไม่สะสม)
  latest_month_produced: number | null // น้ำผลิตจ่ายรวมทั้งเขต เฉพาะเดือนล่าสุด (ไม่สะสม) — ตรงกับผลรวม "รวมเขต" ของหน้า /report-nrw
  latest_month_sold: number | null     // น้ำจำหน่ายรวมทั้งเขต เฉพาะเดือนล่าสุด (ไม่สะสม)
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

// cum_pct: สะสม produced/sold/free/blow_off ตั้งแต่ ต.ค. ถึงเดือนล่าสุดที่มีข้อมูล (หยุดที่เดือนแรกที่ยังไม่มีข้อมูล)
// cum_trend_delta: เทียบ NRW% เฉพาะเดือนล่าสุด (ไม่สะสม) กับ NRW% เดือนเดียวกันของปีงบก่อนหน้า (YoY)
function computeCumulativeTrend(currRows: NrwMonthRow[], prevRows: NrwMonthRow[]): Omit<BranchNrwSnap, 'branch_id'> {
  const currByMonth = new Map(currRows.map((r) => [r.month, r]))
  const prevByMonth = new Map(prevRows.map((r) => [r.month, r]))

  let sumProduced = 0, sumSold = 0, sumFree = 0, sumBlowoff = 0
  let monthsCounted = 0
  let currPct: number | null = null
  let latestMonth: number | null = null
  let latestMonthPct: number | null = null

  for (const month of FISCAL_MONTH_ORDER) {
    const row = currByMonth.get(month)
    if (!row || row.water_produced == null) break

    sumProduced += row.water_produced ?? 0
    sumSold += row.water_sold ?? 0
    sumFree += row.water_free ?? 0
    sumBlowoff += row.blow_off ?? 0
    monthsCounted += 1

    const loss = sumProduced - sumSold - sumFree - sumBlowoff
    currPct = sumProduced > 0 ? (loss / sumProduced) * 100 : null

    latestMonth = month
    latestMonthPct = row.water_produced > 0
      ? ((row.water_produced - (row.water_sold ?? 0) - (row.water_free ?? 0) - (row.blow_off ?? 0)) / row.water_produced) * 100
      : null
  }

  // เดือนเดียวกันของปีงบก่อนหน้า (ปฏิทิน) — สำหรับ cum_trend_delta (YoY, ไม่สะสม)
  const prevRow = latestMonth != null ? prevByMonth.get(latestMonth) : undefined
  const prevMonthPct = prevRow && prevRow.water_produced != null && prevRow.water_produced > 0
    ? ((prevRow.water_produced - (prevRow.water_sold ?? 0) - (prevRow.water_free ?? 0) - (prevRow.blow_off ?? 0)) / prevRow.water_produced) * 100
    : null

  return {
    cum_pct: currPct,
    cum_trend_delta: latestMonthPct != null && prevMonthPct != null ? latestMonthPct - prevMonthPct : null,
    cum_months: monthsCounted,
  }
}

// รวมทุกสาขาต่อเดือนก่อน แล้วคำนวณสะสม/เดือนล่าสุด เทียบช่วงเดียวกันของปีงบก่อนหน้า (YoY) แบบเดียวกับ computeCumulativeTrend
// getTarget: เป้าหมาย NRW% ต่อสาขา (ตั้งค่าจากหน้า /report-nrw) ใช้แทนเกณฑ์ ≤20% ตายตัวเดิม
function computeRegionSnap(
  currRows: NrwMonthRow[],
  prevRows: NrwMonthRow[],
  branchesTotal: number,
  getTarget: (branchName: string) => number,
): RegionNrwSnap {
  const aggregateByMonth = (rows: NrwMonthRow[]) => {
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
    return byMonth
  }

  const byMonth = aggregateByMonth(currRows)
  const prevByMonth = aggregateByMonth(prevRows)

  let sumProduced = 0, sumSold = 0, sumFree = 0, sumBlowoff = 0
  let monthsCounted = 0
  let currCumPct: number | null = null
  let latestMonth: number | null = null
  let latestMonthPct: number | null = null
  let latestMonthProduced: number | null = null
  let latestMonthSold: number | null = null

  for (const month of FISCAL_MONTH_ORDER) {
    const agg = byMonth.get(month)
    if (!agg) break

    latestMonthPct = agg.produced > 0 ? ((agg.produced - agg.sold - agg.free - agg.blowoff) / agg.produced) * 100 : null
    latestMonth = month
    latestMonthProduced = agg.produced
    latestMonthSold = agg.sold

    sumProduced += agg.produced
    sumSold += agg.sold
    sumFree += agg.free
    sumBlowoff += agg.blowoff
    monthsCounted += 1

    const loss = sumProduced - sumSold - sumFree - sumBlowoff
    currCumPct = sumProduced > 0 ? (loss / sumProduced) * 100 : null
  }

  // เดือนเดียวกันของปีก่อน (ปฏิทิน) — สำหรับ cum_trend_delta / latest_month_delta (YoY, ไม่สะสม)
  const prevMonthAgg = latestMonth != null ? prevByMonth.get(latestMonth) : undefined
  const prevMonthPct = prevMonthAgg && prevMonthAgg.produced > 0
    ? ((prevMonthAgg.produced - prevMonthAgg.sold - prevMonthAgg.free - prevMonthAgg.blowoff) / prevMonthAgg.produced) * 100
    : null

  const branchesOnTarget = latestMonth != null
    ? currRows.filter((r) => {
        if (r.month !== latestMonth || !r.water_produced) return false
        const pct = ((r.water_produced - (r.water_sold ?? 0) - (r.water_free ?? 0) - (r.blow_off ?? 0)) / r.water_produced) * 100
        return pct <= getTarget(r.branch_name)
      }).length
    : 0

  const branchesReporting = latestMonth != null
    ? new Set(currRows.filter((r) => r.month === latestMonth && r.water_produced != null).map((r) => r.branch_name)).size
    : 0

  return {
    cum_pct: currCumPct,
    cum_trend_delta: latestMonthPct != null && prevMonthPct != null ? latestMonthPct - prevMonthPct : null,
    cum_months: monthsCounted,
    latest_month: latestMonth,
    latest_month_pct: latestMonthPct,
    latest_month_delta: latestMonthPct != null && prevMonthPct != null ? latestMonthPct - prevMonthPct : null,
    latest_month_produced: latestMonthProduced,
    latest_month_sold: latestMonthSold,
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
  const prevFiscalYear = currentFiscalYear - 1

  const [branchesRes, nrwMonthlyRes, targetRes] = await Promise.all([
    supabase
      .from('branches')
      .select('id,code,name_th,province_th,region,is_active,created_at')
      .eq('is_active', true)
      .order('name_th'),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('nrw_branch_monthly')
      .select('branch_name,fiscal_year,month,water_produced,water_sold,water_free,blow_off')
      .in('fiscal_year', [currentFiscalYear, prevFiscalYear]),

    // เป้าหมาย NRW% ต่อสาขา — ตั้งค่าที่หน้า /report-nrw (ต่อสาขา + ค่า district fallback แถวชื่อ __district__)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('nrw_branch_target')
      .select('branch_name,target_nrw')
      .eq('fiscal_year', currentFiscalYear),
  ])

  const branches = (branchesRes.data ?? []) as Branch[]
  const allRows = (nrwMonthlyRes.data ?? []) as NrwMonthRow[]
  const currYearRows = allRows.filter((r) => r.fiscal_year === currentFiscalYear)
  const prevYearRows = allRows.filter((r) => r.fiscal_year === prevFiscalYear)

  const allTargets = (targetRes.data ?? []) as { branch_name: string; target_nrw: number | null }[]
  const districtTarget = allTargets.find((t) => t.branch_name === '__district__')?.target_nrw ?? null
  const targetMap = new Map(
    allTargets.filter((t) => t.branch_name !== '__district__').map((t) => [t.branch_name, t.target_nrw])
  )
  const getTarget = (branchName: string): number => targetMap.get(branchName) ?? districtTarget ?? 20

  const currRowsByBranchName = new Map<string, NrwMonthRow[]>()
  for (const r of currYearRows) {
    const arr = currRowsByBranchName.get(r.branch_name) ?? []
    arr.push(r)
    currRowsByBranchName.set(r.branch_name, arr)
  }
  const prevRowsByBranchName = new Map<string, NrwMonthRow[]>()
  for (const r of prevYearRows) {
    const arr = prevRowsByBranchName.get(r.branch_name) ?? []
    arr.push(r)
    prevRowsByBranchName.set(r.branch_name, arr)
  }

  const snapMap: Record<string, BranchNrwSnap> = {}
  for (const b of branches) {
    const trend = computeCumulativeTrend(currRowsByBranchName.get(b.name_th) ?? [], prevRowsByBranchName.get(b.name_th) ?? [])
    snapMap[b.id] = { branch_id: b.id, ...trend }
  }

  const regionSnap = computeRegionSnap(currYearRows, prevYearRows, branches.length, getTarget)

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
