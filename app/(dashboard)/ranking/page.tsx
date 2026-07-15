import { createClient } from '@/lib/supabase/server'
import { RankingTable } from '@/components/dashboard/RankingTable'
import { formatThaiMonthYear } from '@/lib/utils/date-th'
import { MonthlyReport, Branch } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const supabase = await createClient()
  const now = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: reports } = await supabase
    .from('monthly_reports')
    .select('*, branches(*)')
    .eq('report_year', year)
    .eq('report_month', month)
    .order('nrw_pct', { ascending: false })

  const rankedRows = ((reports ?? []) as (MonthlyReport & { branches?: Branch })[])
    .map((r, i) => ({ ...r, rank: i + 1 }))

  return (
    <div className="space-y-5 animate-fadein">
      <div>
        <h1 className="text-xl font-bold text-[#12181F]">จัดอันดับสาขา</h1>
        <p className="text-sm text-black/40 mt-0.5">
          ประจำเดือน {formatThaiMonthYear(year, month)} · เรียงตาม NRW สูงสุด
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <RankingTable data={rankedRows} />
      </div>
    </div>
  )
}
