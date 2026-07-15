import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { NrwReportTable } from '@/components/dashboard/NrwReportTable'
import { NrwReportFilterBar } from '@/components/shared/NrwReportFilterBar'
import { getThaiMonthName } from '@/lib/utils/date-th'
import type { NrwBranchMonthly, NrwBranchTarget } from '@/lib/types'

const NRW_EDITOR_ID = '18074'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

function getCurrentFiscalYear(): number {
  const now = new Date()
  const month = now.getMonth() + 1
  const gregorianYear = now.getFullYear()
  return month >= 10 ? gregorianYear + 543 + 1 : gregorianYear + 543
}

function historyKey(branchName: string, fiscalYear: number, month: number): string {
  return `${branchName}|${fiscalYear}|${month}`
}

export default async function ReportNrwPage({ searchParams }: PageProps) {
  const params = await searchParams
  const fiscalYear = parseInt(params.year ?? '') || getCurrentFiscalYear()
  const month      = parseInt(params.month ?? '') || new Date().getMonth() + 1

  const supabase = await createClient()
  const session  = await getPwaSession()
  const canEdit  = session?.username === NRW_EDITOR_ID

  // Fetch monthly data, annual targets, และประวัติ 2 ปีงบ (ปีนี้+ปีก่อน) สำหรับเช็คความผิดปกติเทียบเดือนก่อนหน้า
  const [monthlyRes, targetRes, historyRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('nrw_branch_monthly')
      .select('*')
      .eq('fiscal_year', fiscalYear)
      .eq('month', month)
      .order('branch_name') as Promise<{ data: NrwBranchMonthly[] | null; error: { message: string } | null }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('nrw_branch_target')
      .select('*')
      .eq('fiscal_year', fiscalYear) as Promise<{ data: NrwBranchTarget[] | null; error: unknown }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('nrw_branch_monthly')
      .select('branch_name,fiscal_year,month,water_produced,water_sold,water_free,blow_off')
      .in('fiscal_year', [fiscalYear, fiscalYear - 1]) as Promise<{ data: Pick<NrwBranchMonthly, 'branch_name' | 'fiscal_year' | 'month' | 'water_produced' | 'water_sold' | 'water_free' | 'blow_off'>[] | null; error: unknown }>,
  ])

  const allTargets = targetRes.data ?? []
  const districtTarget = allTargets.find((t) => t.branch_name === '__district__')?.target_nrw ?? null
  const targetMap = new Map(
    allTargets.filter((t) => t.branch_name !== '__district__').map((t) => [t.branch_name, t.target_nrw])
  )

  const rows: NrwBranchMonthly[] = (monthlyRes.data ?? []).map((r) => {
    const produced = r.water_produced ?? null
    const waterLoss = produced != null
      ? Math.max(0, produced - (r.water_sold ?? 0) - (r.water_free ?? 0) - (r.blow_off ?? 0))
      : null
    const nrwRate = waterLoss !== null && produced
      ? (waterLoss / produced) * 100
      : null
    return {
      ...r,
      water_loss: waterLoss,
      nrw_rate:   nrwRate,
      target_nrw: targetMap.get(r.branch_name) ?? null,
    }
  })

  // ประวัติอัตราสูญเสียรายเดือน (2 ปีงบ) ให้ฝั่ง client เทียบ "เดือนก่อนหน้า" ตอนแก้ไข/วางข้อมูลใหม่ ไม่ว่าจะแก้เดือนไหนก็หาย้อนหลังได้
  const historyMap: Record<string, { water_loss: number | null; nrw_rate: number | null }> = {}
  for (const r of historyRes.data ?? []) {
    const produced = r.water_produced ?? null
    const waterLoss = produced != null
      ? Math.max(0, produced - (r.water_sold ?? 0) - (r.water_free ?? 0) - (r.blow_off ?? 0))
      : null
    const nrwRate = waterLoss !== null && produced ? (waterLoss / produced) * 100 : null
    historyMap[historyKey(r.branch_name, r.fiscal_year, r.month)] = { water_loss: waterLoss, nrw_rate: nrwRate }
  }

  const monthName = getThaiMonthName(month)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#12181F]">Report NRW</h1>
          <p className="text-sm text-black/50 mt-1">
            ข้อมูลน้ำสูญเสียรายสาขา — ปีงบ {fiscalYear} เดือน{monthName}
          </p>
        </div>
        <div className="shrink-0">
          <NrwReportFilterBar activeFiscalYear={fiscalYear} activeMonth={month} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="glass-card px-4 py-3 flex flex-col gap-0.5 min-w-32">
          <span className="text-xs text-black/40">สาขาที่กรอกแล้ว</span>
          <span className="text-lg font-bold text-[#12181F]">{rows.length} <span className="text-sm font-normal text-black/40">/ 26</span></span>
        </div>
        <div className="glass-card px-4 py-3 flex flex-col gap-0.5 min-w-32">
          <span className="text-xs text-black/40">ยังไม่กรอก</span>
          <span className="text-lg font-bold text-amber-400">{26 - rows.length}</span>
        </div>
        <div className="glass-card px-4 py-3 flex flex-col gap-0.5 min-w-32">
          <span className="text-xs text-black/40">ตั้งเป้าหมายแล้ว</span>
          <span className="text-lg font-bold text-cyan-400">{targetMap.size} <span className="text-sm font-normal text-black/40">/ 26</span></span>
        </div>
        {monthlyRes.error && (
          <div className="glass-card px-4 py-3 border-red-500/30">
            <span className="text-xs text-red-400">ไม่สามารถโหลดข้อมูลได้ — กรุณา apply migration ก่อน</span>
          </div>
        )}
      </div>

      <NrwReportTable
        rows={rows}
        fiscalYear={fiscalYear}
        month={month}
        targets={Object.fromEntries(targetMap)}
        districtTarget={districtTarget}
        canEdit={canEdit}
        historyMap={historyMap}
      />
    </div>
  )
}
