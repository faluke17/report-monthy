import { createClient } from '@/lib/supabase/server'
import type { Obstacle, ActionItem, KmCase, MonthlyReport, Branch } from '@/lib/types'
import { formatThaiDate, formatThaiMonthYearShort, isOverdue } from '@/lib/utils/date-th'
import { cn } from '@/lib/utils'
import { TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SummaryPage() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const todayStr = now.toISOString().split('T')[0]

  const [reportsRes, obstaclesRes, actionsRes, kmRes, branchesRes] = await Promise.all([
    supabase
      .from('monthly_reports')
      .select('*, branches(*)')
      .eq('report_year', year)
      .eq('report_month', month)
      .order('nrw_pct', { ascending: false }),
    supabase
      .from('obstacles')
      .select('*, branches(*)')
      .not('status', 'eq', 'ปิดประเด็น')
      .in('status', ['ล่าช้า', 'เกินกำหนด', 'รอสนับสนุน'])
      .order('priority_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('action_items')
      .select('*, branches(*)')
      .not('status', 'in', '("แล้วเสร็จ","ยกเลิก")')
      .lte('due_date', todayStr)
      .order('due_date', { ascending: true })
      .limit(8),
    supabase
      .from('km_cases')
      .select('*, branches(*)')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  const reports = (reportsRes.data ?? []) as (MonthlyReport & { branches?: Branch })[]
  const obstacles = (obstaclesRes.data ?? []) as (Obstacle & { branches?: Branch })[]
  const overdueActions = (actionsRes.data ?? []) as (ActionItem & { branches?: Branch })[]
  const kmCases = (kmRes.data ?? []) as (KmCase & { branches?: Branch })[]
  const totalBranches = branchesRes.count ?? 26

  const reportsWithNrw = reports.filter(r => r.nrw_pct !== null)
  const avgNrw =
    reportsWithNrw.length > 0
      ? reportsWithNrw.reduce((s, r) => s + (r.nrw_pct ?? 0), 0) / reportsWithNrw.length
      : null

  const notSubmitted = totalBranches - reports.length
  const totalLeaksPending = reports.reduce((s, r) => s + (r.leaks_pending ?? 0), 0)
  const confirmedKm = kmCases.find(k => k.verification_status === 'ยืนยันแล้ว')

  const monthLabel = formatThaiMonthYearShort(year, month)
  const isEmpty = reports.length === 0 && obstacles.length === 0 && overdueActions.length === 0

  return (
    <div className="space-y-5 max-w-3xl animate-fadein">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Executive Summary</h1>
          <p className="text-sm text-white/40 mt-0.5">
            รายงานสรุปสำหรับผู้บริหาร — ประชุม WSC-R {monthLabel} · กปภ. เขต 10
          </p>
        </div>
        <span className="text-xs text-white/30 border border-white/12 px-3 py-1.5 rounded-lg shrink-0">
          {monthLabel}
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="NRW เฉลี่ยเขต" accent="cyan">
          <p className="num text-2xl font-bold text-cyan-400">
            {avgNrw !== null ? avgNrw.toFixed(1) + '%' : '—'}
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">จาก {reportsWithNrw.length} สาขา</p>
        </KpiCard>
        <KpiCard label="ยังไม่ส่งผล" accent="red">
          <p className="num text-2xl font-bold text-red-400">{notSubmitted}</p>
          <p className="text-[11px] text-white/30 mt-0.5">จาก {totalBranches} สาขา</p>
        </KpiCard>
        <KpiCard label="อุปสรรคเร่งด่วน" accent="amber">
          <p className="num text-2xl font-bold text-amber-400">{obstacles.length}</p>
          <p className="text-[11px] text-white/30 mt-0.5">ล่าช้า / รอสนับสนุน</p>
        </KpiCard>
        <KpiCard label="Action เกินกำหนด" accent="red">
          <p className="num text-2xl font-bold text-red-400">{overdueActions.length}</p>
          <p className="text-[11px] text-white/30 mt-0.5">รายการ</p>
        </KpiCard>
      </div>

      {isEmpty && (
        <div className="glass-card p-12 text-center text-white/30 text-sm">
          ยังไม่มีข้อมูลสำหรับเดือนนี้ — เริ่มกรอกผลรายเดือนและบันทึกอุปสรรคเพื่อดูสรุป
        </div>
      )}

      {/* สถานการณ์ */}
      <ExecSection title="สถานการณ์" color="cyan">
        <p className="text-sm text-white/60 leading-relaxed">
          เขต 10 มีค่าเฉลี่ย NRW {monthLabel} อยู่ที่{' '}
          <b className="text-white">
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
              {' '}มีจุดรั่วค้างซ่อม <b className="text-white">{totalLeaksPending} จุด</b>
            </>
          )}
        </p>
      </ExecSection>

      {/* ประเด็นสำคัญ */}
      {obstacles.length > 0 && (
        <ExecSection title="ประเด็นสำคัญ" color="amber">
          <ol className="space-y-2">
            {obstacles.slice(0, 3).map((obs, i) => (
              <li key={obs.id} className="text-sm text-white/60 leading-relaxed">
                <b>{i + 1}.</b>{' '}
                <b className="text-white">
                  {obs.branches?.name_th} — {obs.obstacle_type}
                </b>
                {obs.data_quality_impact && (
                  <span className="text-white/50"> — {obs.data_quality_impact}</span>
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
              <li key={action.id} className="text-sm text-white/60 flex items-start gap-2">
                <span className="num text-red-400 text-xs font-mono shrink-0 mt-0.5">
                  {action.code}
                </span>
                <span>
                  {action.branches?.name_th && (
                    <b className="text-white/80">{action.branches.name_th} — </b>
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
          <p className="text-sm text-white/60 leading-relaxed">
            <b className="text-white">{confirmedKm.branches?.name_th}</b>
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
                <b className="text-white">{confirmedKm.water_saved_daily.toLocaleString()} ลบ.ม./วัน</b>
              </>
            )}
            {confirmedKm.applicable_branches && confirmedKm.applicable_branches.length > 0 && (
              <>
                {' '}— เขตควรขยายผลไปสาขา{' '}
                <b className="text-white">{confirmedKm.applicable_branches.join(' · ')}</b>
              </>
            )}
          </p>
        </ExecSection>
      ) : kmCases.length > 0 ? (
        <ExecSection title="KM / กรณีศึกษาที่กำลังติดตาม" color="green">
          <ul className="space-y-1.5">
            {kmCases.map(km => (
              <li key={km.id} className="text-sm text-white/60 flex items-center gap-2">
                <TrendingDown size={13} className="text-green-400 shrink-0" />
                <b className="text-white/80">{km.branches?.name_th}</b>
                {' — '}{km.title}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/8 text-white/40 border border-white/10 shrink-0">
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
              <li key={action.id} className="text-sm text-white/60">
                <b className="text-white/80">{i + 1}. {action.title}</b>
                {action.owner && <span className="text-white/40"> — {action.owner}</span>}
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
              <div key={r.id} className="flex items-center gap-3">
                <b className="text-white/80 text-sm">{r.branches?.name_th}</b>
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

function KpiCard({
  label,
  accent,
  children,
}: {
  label: string
  accent: 'cyan' | 'amber' | 'red' | 'green'
  children: React.ReactNode
}) {
  const topBorder: Record<string, string> = {
    cyan: 'border-t-cyan-500/70',
    amber: 'border-t-amber-500/70',
    red: 'border-t-red-500/70',
    green: 'border-t-green-500/70',
  }
  return (
    <div className={cn('glass-card-sm p-4 border-t-2', topBorder[accent])}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-1">{children}</div>
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
