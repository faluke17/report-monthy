import { createClient } from '@/lib/supabase/server'
import { FiveTopicsReport } from '@/lib/types'
import { getThaiMonthName, toThaiYear, formatThaiDate } from '@/lib/utils/date-th'
import { CheckCircle2, Circle, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { StatusPill } from '@/components/shared/StatusPill'

export const dynamic = 'force-dynamic'

// ─── Inline helpers ───────────────────────────────────────────────────────────

function NoteBlock({ text }: { text: string | null | undefined }) {
  if (!text) return null
  return (
    <div className="flex gap-2 items-start bg-black/3 rounded-xl p-3 mt-1">
      <span className="text-[10px] text-black/30 shrink-0 mt-0.5 font-bold tracking-wide uppercase">หมายเหตุ</span>
      <p className="text-xs text-black/55 leading-relaxed">{text}</p>
    </div>
  )
}

function MetricBlock({
  label, value, unit, color,
}: {
  label: string; value: number | null | undefined; unit?: string; color: string
}) {
  return (
    <div className="bg-black/3 rounded-xl p-3">
      <p className="text-[10px] text-black/40 mb-1.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`num text-2xl font-bold ${color}`}>
          {value != null ? value.toLocaleString() : '—'}
        </span>
        {unit && <span className="text-xs text-black/30">{unit}</span>}
      </div>
    </div>
  )
}

function EmptyTopic() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center opacity-40">
      <Circle size={24} className="text-black/30" />
      <p className="text-sm text-black/40">ไม่มีข้อมูล</p>
    </div>
  )
}

function TopicCard({
  no, title, subtitle, filled, accentClass, children,
}: {
  no: number; title: string; subtitle: string; filled: boolean
  accentClass: string; children: React.ReactNode
}) {
  const badgeColors: Record<number, string> = {
    1: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    2: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    3: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    4: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    5: 'bg-green-500/20 text-green-300 border-green-500/30',
  }
  return (
    <div className={`glass-card p-5 space-y-4 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${badgeColors[no]}`}>
            {no}
          </span>
          <div>
            <p className="font-semibold text-[#12181F] text-sm leading-snug">{title}</p>
            <p className="text-xs text-black/40 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {filled
          ? <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />
          : <Circle size={18} className="text-black/20 shrink-0 mt-0.5" />}
      </div>
      <div className="border-t border-black/8" />
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FiveTopicsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('five_topics_reports')
    .select('*, branches(name_th, code)')
    .eq('id', id)
    .single()

  if (!data) notFound()

  const r = data as FiveTopicsReport

  // derived values
  const t1Filled = r.t1_dma_count != null
  const t2Filled = r.t2_leak_points != null
  const t3Filled = r.t3_dma_pm_count != null
  const t4Filled = r.t4_flush_points != null
  const t5Filled = r.t5_meters_replaced != null
  const filledCount = [t1Filled, t2Filled, t3Filled, t4Filled, t5Filled].filter(Boolean).length

  const repairRatio =
    r.t2_leak_points && r.t2_repaired_points != null && r.t2_leak_points > 0
      ? Math.round((r.t2_repaired_points / r.t2_leak_points) * 100)
      : null

  const t3Total =
    (r.t3_dma_pm_count ?? 0) + (r.t3_prv_pm_count ?? 0) + (r.t3_p3_pm_count ?? 0)

  // chip data per topic
  const chips = [
    {
      no: 1, label: 'Step Test', filled: t1Filled,
      value: r.t1_dma_count, unit: 'DMA', color: 'text-cyan-300',
      accent: 'accent-bar-cyan',
    },
    {
      no: 2, label: 'ALC', filled: t2Filled,
      value: r.t2_leak_points, unit: 'จุด', color: 'text-blue-300',
      accent: 'border-t-[3px] border-blue-400',
    },
    {
      no: 3, label: 'PM', filled: t3Filled,
      value: t3Filled ? t3Total : null, unit: 'แห่ง', color: 'text-violet-300',
      accent: 'accent-bar-purple',
    },
    {
      no: 4, label: 'Flushing', filled: t4Filled,
      value: r.t4_flush_points, unit: 'จุด', color: 'text-amber-300',
      accent: 'accent-bar-amber',
    },
    {
      no: 5, label: 'มาตร', filled: t5Filled,
      value: r.t5_meters_replaced, unit: 'เครื่อง', color: 'text-green-300',
      accent: 'accent-bar-green',
    },
  ]

  const badgeColors: Record<number, string> = {
    1: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    2: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    3: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    4: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    5: 'bg-green-500/20 text-green-300 border-green-500/30',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadein">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/five-topics"
          className="flex items-center gap-1 text-sm text-black/50 hover:text-[#12181F] transition-colors"
        >
          <ChevronLeft size={16} />
          รายงาน 5 หัวข้อ
        </Link>
        <span className="text-black/20">/</span>
        <span className="text-sm text-[#12181F]">{r.branches?.name_th}</span>
      </div>

      {/* Hero Header */}
      <div className="glass-card p-6 space-y-4 accent-bar-cyan">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="page-kicker mb-1">รายงาน 5 หัวข้อ NRW</p>
            <h1 className="text-xl font-bold text-[#12181F]">{r.branches?.name_th}</h1>
            <p className="text-sm text-black/40 mt-0.5">
              {getThaiMonthName(r.report_month)} {toThaiYear(r.report_year)}
              {r.branches?.code && (
                <span className="ml-2 text-black/25">{r.branches.code}</span>
              )}
            </p>
          </div>
          <StatusPill
            status={r.status === 'submitted' ? 'ส่งแล้ว' : 'แบบร่าง'}
            variant={r.status === 'submitted' ? 'good' : 'warn'}
          />
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            label="หัวข้อที่ดำเนินการ"
            value={filledCount}
            unit="/ 5"
            sub="หัวข้อมาตรฐาน กปภ."
            accentColor="cyan"
          />
          <KpiCard
            label="จุดรั่วซ่อมแล้ว"
            value={r.t2_repaired_points ?? '—'}
            unit={r.t2_repaired_points != null ? 'จุด' : undefined}
            sub="ALC ข้อ 2"
            accentColor="green"
          />
          <KpiCard
            label="มาตรที่เปลี่ยน"
            value={r.t5_meters_replaced ?? '—'}
            unit={r.t5_meters_replaced != null ? 'เครื่อง' : undefined}
            sub="MM-01 ข้อ 5"
            accentColor="teal"
          />
        </div>

        {r.submitted_at && (
          <p className="text-[11px] text-black/30">
            บันทึกโดย {r.created_by ?? '—'} · {formatThaiDate(r.submitted_at)}
          </p>
        )}
      </div>

      {/* Topic Overview Strip */}
      <div className="grid grid-cols-5 gap-2">
        {chips.map((c) => (
          <div
            key={c.no}
            className={`glass-card-sm p-3 flex flex-col items-center gap-1.5 text-center ${c.accent} ${!c.filled ? 'opacity-50' : ''}`}
          >
            <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${badgeColors[c.no]}`}>
              {c.no}
            </span>
            <span className="text-[9px] text-black/40 leading-tight">{c.label}</span>
            {c.filled
              ? <CheckCircle2 size={14} className="text-green-400" />
              : <Circle size={14} className="text-black/20" />}
            <span className={`num text-sm font-bold ${c.filled ? c.color : 'text-black/25'}`}>
              {c.value != null ? c.value.toLocaleString() : '—'}
            </span>
            {c.value != null && (
              <span className="text-[9px] text-black/30">{c.unit}</span>
            )}
          </div>
        ))}
      </div>

      {/* ─── Topic 1: Step Test ─── */}
      <TopicCard
        no={1}
        title="การวิเคราะห์พื้นที่หาท่อแตกท่อรั่ว"
        subtitle="Step Test พร้อมตรวจ Zero Test"
        filled={t1Filled}
        accentClass="accent-bar-cyan"
      >
        {t1Filled ? (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="num text-4xl font-bold text-cyan-300">
                {r.t1_dma_count?.toLocaleString() ?? '—'}
              </span>
              <span className="text-black/40 text-sm">DMA</span>
            </div>

            {r.t1_areas && r.t1_areas.length > 0 && (
              <div>
                <p className="page-kicker mb-2">พื้นที่ที่ดำเนินการ</p>
                <div className="space-y-1.5">
                  {r.t1_areas.map((a, i) => (
                    <div key={i} className="glass-card-sm flex justify-between items-center px-3 py-2">
                      <span className="text-sm text-black/80">{a.area_name || '—'}</span>
                      <span className="num text-xs text-black/40">
                        {a.conducted_date ? formatThaiDate(a.conducted_date) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!r.t1_areas || r.t1_areas.length === 0) && r.t1_conducted_date && (
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-black/50">วันที่ดำเนินการ</span>
                <span className="text-black/70">{formatThaiDate(r.t1_conducted_date)}</span>
              </div>
            )}

            <NoteBlock text={r.t1_notes} />
          </div>
        ) : <EmptyTopic />}
      </TopicCard>

      {/* ─── Topic 2: ALC ─── */}
      <TopicCard
        no={2}
        title="การสำรวจน้ำสูญเสียเชิงรุก"
        subtitle="Active Leakage Control (ALC)"
        filled={t2Filled}
        accentClass="border-t-[3px] border-blue-400"
      >
        {t2Filled ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MetricBlock label="จุดรั่วที่พบ" value={r.t2_leak_points} unit="จุด" color="text-blue-300" />
              <MetricBlock label="ซ่อมแล้วเสร็จ" value={r.t2_repaired_points} unit="จุด" color="text-green-300" />
            </div>

            {repairRatio != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-black/40">อัตราซ่อมสำเร็จ</span>
                  <span className="num text-black/70 font-semibold">{repairRatio}%</span>
                </div>
                <div className="prog-bg">
                  <div
                    className={`prog-fill ${repairRatio >= 80 ? 'prog-good' : repairRatio >= 50 ? 'prog-warn' : 'prog-bad'}`}
                    style={{ width: `${Math.min(repairRatio, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1 divide-y divide-black/5">
              {r.t2_frequency != null && (
                <div className="flex justify-between text-sm py-1.5">
                  <span className="text-black/50">จำนวนครั้ง/เดือน</span>
                  <span className="num text-black/80">{r.t2_frequency} ครั้ง</span>
                </div>
              )}
              {r.t2_water_loss_m3h != null && (
                <div className="flex justify-between text-sm py-1.5">
                  <span className="text-black/50">ปริมาณน้ำสูญเสีย</span>
                  <span className="num text-black/80">{r.t2_water_loss_m3h?.toLocaleString()} ลบ.ม./ชม.</span>
                </div>
              )}
            </div>

            <NoteBlock text={r.t2_notes} />
          </div>
        ) : <EmptyTopic />}
      </TopicCard>

      {/* ─── Topic 3: PM ─── */}
      <TopicCard
        no={3}
        title="การ PM ระบบจ่ายน้ำ"
        subtitle="Preventive Maintenance"
        filled={t3Filled}
        accentClass="accent-bar-purple"
      >
        {t3Filled ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <MetricBlock label="DMA" value={r.t3_dma_pm_count} unit="แห่ง" color="text-violet-300" />
              <MetricBlock label="PRV" value={r.t3_prv_pm_count} unit="แห่ง" color="text-violet-300" />
              <MetricBlock label="P3" value={r.t3_p3_pm_count} unit="แห่ง" color="text-violet-300" />
            </div>
            <div className="flex justify-between text-sm py-1.5 border-t border-black/8 pt-3">
              <span className="text-black/50">รวมทั้งหมด</span>
              <span className="num text-[#12181F] font-bold">{t3Total} แห่ง</span>
            </div>
            <NoteBlock text={r.t3_notes} />
          </div>
        ) : <EmptyTopic />}
      </TopicCard>

      {/* ─── Topic 4: Flushing ─── */}
      <TopicCard
        no={4}
        title="การระบายตะกอนระบบท่อจ่ายน้ำ"
        subtitle="Flushing / Sediment Discharge"
        filled={t4Filled}
        accentClass="accent-bar-amber"
      >
        {t4Filled ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MetricBlock label="จำนวนจุดระบาย" value={r.t4_flush_points} unit="จุด" color="text-amber-300" />
              <MetricBlock label="ปริมาณน้ำรวม" value={r.t4_volume_m3} unit="ลบ.ม." color="text-amber-300" />
            </div>
            <NoteBlock text={r.t4_notes} />
          </div>
        ) : <EmptyTopic />}
      </TopicCard>

      {/* ─── Topic 5: Meter Replacement ─── */}
      <TopicCard
        no={5}
        title="การเปลี่ยนมาตรวัดน้ำชำรุด"
        subtitle="Water Meter Replacement (MM-01)"
        filled={t5Filled}
        accentClass="accent-bar-green"
      >
        {t5Filled ? (
          <div className="space-y-2">
            <div className="flex flex-col items-center py-4 gap-1">
              <span className="num text-5xl font-bold text-green-300">
                {r.t5_meters_replaced?.toLocaleString()}
              </span>
              <span className="text-black/40 text-sm">เครื่อง</span>
              <p className="text-[11px] text-black/25 mt-1">มาตรวัดน้ำชำรุดที่เปลี่ยนแทนแล้ว (MM-01)</p>
            </div>
            <NoteBlock text={r.t5_notes} />
          </div>
        ) : <EmptyTopic />}
      </TopicCard>

    </div>
  )
}
