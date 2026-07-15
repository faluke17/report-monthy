import { createClient } from '@/lib/supabase/server'
import type { Obstacle, ActionItem, KmCase, Branch } from '@/lib/types'
import { formatThaiDate, formatThaiMonthYearShort } from '@/lib/utils/date-th'
import { cn } from '@/lib/utils'
import { TrendingDown } from 'lucide-react'
import { MonthYearPicker } from '@/components/shared/MonthYearPicker'
import { SummaryCards } from '@/components/dashboard/SummaryCards'

export const dynamic = 'force-dynamic'

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const now = new Date()
  const { year: yearParam, month: monthParam } = await searchParams
  const year  = parseInt(yearParam  ?? '') || now.getFullYear()
  const month = parseInt(monthParam ?? '') || now.getMonth() + 1
  const todayStr = now.toISOString().split('T')[0]

  const [reportsRes, obstaclesRes, actionsRes, kmRes, branchesRes, fiveTopicsRes] = await Promise.all([
    supabase
      .from('area_monthly_reports')
      .select('branch_id, branches(name_th, code)')
      .eq('report_year', year)
      .eq('report_month', month)
      .eq('status', 'submitted'),
    supabase
      .from('obstacles')
      .select('*, branches(*)')
      .in('status', ['ล่าช้า', 'เกินกำหนด', 'รอสนับสนุน'])
      .order('priority_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('action_items')
      .select('*, branches(*)')
      .not('status', 'in', '(แล้วเสร็จ,ยกเลิก)')
      .lte('due_date', todayStr)
      .order('due_date', { ascending: true }),
    supabase
      .from('km_cases')
      .select('*, branches(*)')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('branches')
      .select('id, name_th, code')
      .eq('is_active', true)
      .order('name_th'),
    supabase
      .from('five_topics_reports')
      .select('id, branch_id, t1_dma_count, t2_leak_points, t3_dma_pm_count, t4_flush_points, t5_meters_replaced, branches(name_th, code)')
      .eq('report_year', year)
      .eq('report_month', month)
      .eq('status', 'submitted'),
  ])

  // Deduplicate area_monthly_reports by branch_id → one entry per branch that submitted
  type AreaRow = { branch_id: string; branches?: { name_th: string; code: string } | null }
  const areaRows = (reportsRes.data ?? []) as unknown as AreaRow[]
  const seenBranchIds = new Set<string>()
  const reports = areaRows
    .filter(r => { if (seenBranchIds.has(r.branch_id)) return false; seenBranchIds.add(r.branch_id); return true })
    .map(r => ({ branch_id: r.branch_id, nrw_pct: null as number | null, leaks_pending: 0, branches: r.branches ?? undefined }))

  const obstacles = (obstaclesRes.data ?? []) as (Obstacle & { branches?: Branch })[]
  const overdueActions = (actionsRes.data ?? []) as (ActionItem & { branches?: Branch })[]
  const kmCases = (kmRes.data ?? []) as (KmCase & { branches?: Branch })[]
  const allBranches = (branchesRes.data ?? []) as { id: string; name_th: string; code: string }[]
  const totalBranches = allBranches.length || 26
  const fiveTopics = (fiveTopicsRes.data ?? []) as any[]

  // NRW data not available from area_monthly_reports (no pre-computed nrw_pct)
  const reportsWithNrw: typeof reports = []
  const avgNrw = null as number | null

  const notSubmitted = totalBranches - reports.length

  const totalLeaksPending = 0
  const confirmedKm = kmCases.find(k => k.verification_status === 'ยืนยันแล้ว')

  const monthLabel = formatThaiMonthYearShort(year, month)
  const isEmpty = reports.length === 0 && obstacles.length === 0 && overdueActions.length === 0

  return (
    <div className="space-y-5 max-w-3xl animate-fadein">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#12181F]">Executive Summary</h1>
          <p className="text-sm text-black/40 mt-0.5">
            รายงานสรุปสำหรับผู้บริหาร — ประชุม WSC-R {monthLabel} · กปภ. เขต 10
          </p>
        </div>
      </div>

      <MonthYearPicker activeYear={year} activeMonth={month} />

      <SummaryCards
        avgNrw={avgNrw}
        reportsWithNrwCount={reportsWithNrw.length}
        allBranches={allBranches}
        reports={reports}
        fiveTopics={fiveTopics}
        obstacles={obstacles}
        overdueActions={overdueActions}
        year={year}
        month={month}
      />

      {isEmpty && (
        <div className="glass-card p-12 text-center text-black/30 text-sm">
          ยังไม่มีข้อมูลสำหรับเดือนนี้ — เริ่มกรอกผลรายเดือนและบันทึกอุปสรรคเพื่อดูสรุป
        </div>
      )}

      {/* สถานการณ์ */}
      <ExecSection title="สถานการณ์" color="cyan">
        <p className="text-sm text-black/60 leading-relaxed">
          เขต 10 มีค่าเฉลี่ย NRW {monthLabel} อยู่ที่{' '}
          <b className="text-[#12181F]">
            {avgNrw !== null ? avgNrw.toFixed(1) + '%' : '(ยังไม่มีข้อมูล)'}
          </b>
          {reportsWithNrw.length > 0 && ` จาก ${reports.length} สาขาที่ส่งข้อมูล`}
          {notSubmitted > 0 && (
            <>
              {' '}ทั้งนี้มี <b className="text-amber-400">{notSubmitted} สาขา</b>ยังไม่ส่งผลรายเดือน
            </>
          )}
          {totalLeaksPending > 0 && (
            <>
              {' '}มีจุดรั่วค้างซ่อม <b className="text-[#12181F]">{totalLeaksPending} จุด</b>
            </>
          )}
        </p>
      </ExecSection>

      {/* ประเด็นสำคัญ */}
      {obstacles.length > 0 && (
        <ExecSection title="ประเด็นสำคัญ" color="amber">
          <ol className="space-y-2">
            {obstacles.slice(0, 3).map((obs, i) => (
              <li key={obs.id} className="text-sm text-black/60 leading-relaxed">
                <b>{i + 1}.</b>{' '}
                <b className="text-[#12181F]">
                  {obs.branches?.name_th} — {obs.obstacle_type}
                </b>
                {obs.data_quality_impact && (
                  <span className="text-black/50"> — {obs.data_quality_impact}</span>
                )}
              </li>
            ))}
          </ol>
        </ExecSection>
      )}

      {/* ผลกระทบ */}
      {overdueActions.length > 0 && (
        <ExecSection title="ผลกระทบ / Action เกินกำหนด" color="red">
          <ul className="space-y-2">
            {overdueActions.slice(0, 4).map(action => (
              <li key={action.id} className="text-sm text-black/60 flex items-start gap-2">
                <span className="num text-red-400 text-xs font-mono shrink-0 mt-0.5">
                  {action.code}
                </span>
                <span>
                  {action.branches?.name_th && (
                    <b className="text-black/80">{action.branches.name_th} — </b>
                  )}
                  {action.title}
                  {action.due_date && (
                    <span className="text-red-400/80">
                      {' '}· ครบ {formatThaiDate(action.due_date, true)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </ExecSection>
      )}

      {/* KM */}
      {confirmedKm ? (
        <ExecSection title="KM / ผลดีที่ควรขยาย" color="green">
          <p className="text-sm text-black/60 leading-relaxed">
            <b className="text-[#12181F]">{confirmedKm.branches?.name_th}</b>
            {' — '}
            {confirmedKm.title}
            {confirmedKm.nrw_before !== null && confirmedKm.nrw_after !== null && (
              <>
                {' '}NRW ลดจาก{' '}
                <b className="text-red-400">{confirmedKm.nrw_before}%</b>
                {' → '}
                <b className="text-green-400">{confirmedKm.nrw_after}%</b>
              </>
            )}
            {confirmedKm.water_saved_daily !== null && confirmedKm.water_saved_daily !== undefined && (
              <>
                {' '}ประหยัดน้ำ{' '}
                <b className="text-[#12181F]">{confirmedKm.water_saved_daily.toLocaleString()} ลบ.ม./วัน</b>
              </>
            )}
            {confirmedKm.applicable_branches && confirmedKm.applicable_branches.length > 0 && (
              <>
                {' '}— เขตควรขยายผลไปสาขา{' '}
                <b className="text-[#12181F]">{confirmedKm.applicable_branches.join(' · ')}</b>
              </>
            )}
          </p>
        </ExecSection>
      ) : kmCases.length > 0 ? (
        <ExecSection title="KM / กรณีศึกษาที่กำลังติดตาม" color="green">
          <ul className="space-y-1.5">
            {kmCases.map(km => (
              <li key={km.id} className="text-sm text-black/60 flex items-center gap-2">
                <TrendingDown size={13} className="text-green-400 shrink-0" />
                <b className="text-black/80">{km.branches?.name_th}</b>
                {' — '}{km.title}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/8 text-black/40 border border-black/10 shrink-0">
                  {km.verification_status}
                </span>
              </li>
            ))}
          </ul>
        </ExecSection>
      ) : null}

      {/* สิ่งที่ต้องเร่งรัด */}
      {overdueActions.length > 0 && (
        <ExecSection title="สิ่งที่ผู้จัดการควรมอบหมายเร่งรัด" color="cyan">
          <ol className="space-y-1.5">
            {overdueActions.slice(0, 5).map((action, i) => (
              <li key={action.id} className="text-sm text-black/60">
                <b className="text-black/80">{i + 1}. {action.title}</b>
                {action.owner && <span className="text-black/40"> — {action.owner}</span>}
                {action.due_date && (
                  <span className="text-red-400/70">
                    {' '}· ครบ {formatThaiDate(action.due_date, true)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </ExecSection>
      )}

      {/* Top NRW branches */}
      {reportsWithNrw.length > 0 && (
        <ExecSection title="สาขาที่เขตควรขอความอนุเคราะห์ให้เร่งรัดเป็นพิเศษ" color="amber">
          <div className="space-y-1.5">
            {reportsWithNrw.slice(0, 3).map(r => (
              <div key={r.branch_id} className="flex items-center gap-3">
                <b className="text-black/80 text-sm">{r.branches?.name_th}</b>
                <span className="num text-red-400 text-xs font-bold">{r.nrw_pct?.toFixed(1)}%</span>
                {r.leaks_pending > 0 && (
                  <span className="text-xs text-amber-400/80">ค้างซ่อม {r.leaks_pending} จุด</span>
                )}
              </div>
            ))}
          </div>
        </ExecSection>
      )}
    </div>
  )
}


function ExecSection({
  title,
  color,
  children,
}: {
  title: string
  color: 'cyan' | 'amber' | 'red' | 'green'
  children: React.ReactNode
}) {
  const styles: Record<string, string> = {
    cyan:  'border-cyan-500  bg-cyan-500/5',
    amber: 'border-amber-500 bg-amber-500/5',
    red:   'border-red-500   bg-red-500/5',
    green: 'border-green-500 bg-green-500/5',
  }
  const headingColor: Record<string, string> = {
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    green: 'text-green-400',
  }
  return (
    <div className={cn('border-l-[3px] pl-4 py-3 pr-4 rounded-r-xl', styles[color])}>
      <h4 className={cn('text-[11px] font-bold uppercase tracking-widest mb-2', headingColor[color])}>
        {title}
      </h4>
      {children}
    </div>
  )
}
