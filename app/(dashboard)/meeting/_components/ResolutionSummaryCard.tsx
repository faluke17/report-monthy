'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatThaiDate, isOverdue, daysUntil } from '@/lib/utils/date-th'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { ArrowRight, Clock } from 'lucide-react'
import type { MeetingResolution } from '@/lib/types'

// ─── Department color map ─────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  'งานบริการ':    'bg-sky-500/15 text-sky-300 border-sky-400/35',
  'งานอำนวยการ': 'bg-violet-500/15 text-violet-300 border-violet-400/35',
  'งานผลิต':     'bg-orange-500/15 text-orange-300 border-orange-400/35',
  'งานจัดเก็บ':  'bg-teal-500/15 text-teal-300 border-teal-400/35',
}
function deptClass(dept: string) {
  return DEPT_COLORS[dept] ?? 'bg-black/8 text-black/65 border-black/15'
}

// ─── Stages ──────────────────────────────────────────────────
const STAGES = ['รอเริ่ม', 'กำลังดำเนินการ', 'ใกล้แล้วเสร็จ', 'เสร็จสิ้น'] as const

function getStageIndex(pct: number, status: string): number {
  if (status === 'แล้วเสร็จ' || status === 'ปิดประเด็น') return 3
  if (pct >= 75) return 2
  if (pct >= 1)  return 1
  return 0
}

// ─── Days badge ───────────────────────────────────────────────
function DaysBadge({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null
  const days = daysUntil(dueDate)
  const over = isOverdue(dueDate)
  if (days === null) return null
  const abs = Math.abs(days)

  const theme = over || days === 0
    ? { bg: 'bg-red-500/15',   border: 'border-red-400/50',   num: 'text-red-300',   sub: 'text-red-400' }
    : days <= 7
    ? { bg: 'bg-amber-500/15', border: 'border-amber-400/50', num: 'text-amber-200', sub: 'text-amber-400' }
    : days <= 14
    ? { bg: 'bg-cyan-500/15',  border: 'border-cyan-400/40',  num: 'text-cyan-200',  sub: 'text-cyan-400' }
    : { bg: 'bg-teal-500/10',  border: 'border-teal-400/35',  num: 'text-teal-200',  sub: 'text-teal-400' }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border px-3 py-3 min-w-[80px] shrink-0',
      theme.bg, theme.border,
    )}>
      <span className={cn('num text-3xl font-black leading-none', theme.num)}>
        {days === 0 ? '!' : abs}
      </span>
      <span className={cn('text-[11px] mt-1.5 font-semibold text-center leading-tight whitespace-pre-line', theme.sub)}>
        {over ? `วัน\nเกินกำหนด` : days === 0 ? 'วันนี้!' : `วัน\nที่เหลือ`}
      </span>
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────
function StageTrack({ pct, status }: { pct: number; status: string }) {
  const done   = status === 'แล้วเสร็จ' || status === 'ปิดประเด็น'
  const active = getStageIndex(pct, status)

  return (
    <div className="flex items-start w-full">
      {STAGES.map((label, i) => {
        const isPast   = i < active
        const isActive = i === active
        const _isFuture = i > active

        return (
          <div key={label} className="flex items-start flex-1">
            {/* Connector line */}
            {i > 0 && (
              <div className={cn(
                'h-[2px] flex-1 mt-[6px] mx-1 rounded-full',
                isPast || isActive ? 'bg-cyan-500/60' : 'bg-black/15',
              )} />
            )}

            <div className="flex flex-col items-center gap-1.5">
              {/* Dot */}
              <div className={cn(
                'w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 shrink-0',
                isActive && done  ? 'bg-emerald-400 border-emerald-300 ring-2 ring-emerald-400/30' :
                isActive          ? 'bg-cyan-400 border-cyan-200 ring-2 ring-cyan-400/30' :
                isPast            ? 'bg-cyan-500/70 border-cyan-400/60' :
                                    'bg-black/10 border-black/25',
              )} />

              {/* Label */}
              <span className={cn(
                'text-[10px] leading-tight text-center max-w-[56px] font-medium',
                isActive && done  ? 'text-emerald-300 font-bold' :
                isActive          ? 'text-cyan-300 font-bold' :
                isPast            ? 'text-black/55' :
                                    'text-black/30',
              )}>
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main card ────────────────────────────────────────────────
interface Props { r: MeetingResolution }

export function ResolutionSummaryCard({ r }: Props) {
  const done    = r.status === 'แล้วเสร็จ' || r.status === 'ปิดประเด็น'
  const overdue = isOverdue(r.due_date) && !done
  const days    = r.due_date ? daysUntil(r.due_date) : null

  const branchLabel = r.responsible_branch
    ? (PWA_BRANCHES.find(b => b.costcenter === r.responsible_branch)?.name_th ?? r.responsible_branch)
    : null

  const { borderL, cardBg } = done
    ? { borderL: 'border-l-emerald-500/70', cardBg: '' }
    : overdue
    ? { borderL: 'border-l-red-500',        cardBg: 'bg-red-500/[0.035]' }
    : r.priority === 'สูง'
    ? { borderL: 'border-l-red-400/80',     cardBg: 'bg-red-500/[0.025]' }
    : r.priority === 'กลาง'
    ? { borderL: 'border-l-amber-400/70',   cardBg: 'bg-amber-500/[0.02]' }
    : { borderL: 'border-l-cyan-500/60',    cardBg: '' }

  const barColor = done
    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
    : overdue
    ? 'bg-gradient-to-r from-red-600 to-red-400'
    : r.progress_pct >= 75
    ? 'bg-gradient-to-r from-cyan-500 to-teal-300'
    : 'bg-gradient-to-r from-cyan-600 to-cyan-400'

  return (
    <Link
      href="/action"
      className={cn(
        'block rounded-xl border border-black/12 border-l-4 transition-all group',
        'hover:border-black/25 hover:shadow-xl hover:shadow-black/25 hover:-translate-y-px',
        borderL, cardBg,
        done ? 'opacity-60' : '',
      )}
    >
      <div className="px-5 pt-4 pb-4 space-y-4">

        {/* ── Row 1: badges ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="num text-xs font-bold text-cyan-400">#{r.sequence_no}</span>

            {r.priority === 'สูง' && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/25 text-red-200 border border-red-400/50 shadow-sm shadow-red-500/15">
                ⚡ สูง
              </span>
            )}
            {r.priority === 'กลาง' && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                กลาง
              </span>
            )}
            {r.source && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/8 text-black/55 border border-black/15">
                {r.source}
              </span>
            )}
          </div>

          {done && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              ✓ เสร็จสิ้น
            </span>
          )}
        </div>

        {/* ── Row 2: title ── */}
        <p className={cn(
          'text-base font-semibold leading-snug tracking-tight transition-colors',
          done ? 'text-black/55' : 'text-[#12181F] group-hover:text-cyan-50',
        )}>
          {r.title}
        </p>

        {/* ── Row 3: branch · dept · due date ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {branchLabel && (
            <span className="text-sm font-semibold text-black/85">{branchLabel}</span>
          )}
          {branchLabel && r.responsible_dept && (
            <span className="text-black/30">·</span>
          )}
          {r.responsible_dept && (
            <span className={cn(
              'text-xs px-2.5 py-0.5 rounded-full border font-semibold',
              deptClass(r.responsible_dept),
            )}>
              {r.responsible_dept}
            </span>
          )}
          {r.due_date && (
            <span className={cn(
              'ml-auto flex items-center gap-1.5 text-xs font-medium',
              overdue              ? 'text-red-300' :
              days !== null && days <= 7 ? 'text-amber-300' :
                                   'text-black/50',
            )}>
              <Clock size={11} />
              ครบ {formatThaiDate(r.due_date, true)}
            </span>
          )}
        </div>

        {/* ── Row 4: days badge + stage + progress ── */}
        <div className="flex items-center gap-4">
          <DaysBadge dueDate={r.due_date} />

          <div className="flex-1 space-y-3">
            <StageTrack pct={r.progress_pct} status={r.status} />

            {/* Progress bar */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-2.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700 shadow-sm', barColor)}
                  style={{ width: `${r.progress_pct}%` }}
                />
              </div>
              <span className={cn(
                'num text-sm font-bold w-10 text-right shrink-0',
                done    ? 'text-emerald-300' :
                overdue ? 'text-red-300' :
                          'text-black/80',
              )}>
                {r.progress_pct}%
              </span>
            </div>

            {r.progress_note && (
              <p className="text-xs text-black/50 truncate leading-snug">{r.progress_note}</p>
            )}
          </div>
        </div>

        {/* ── Row 5: footer ── */}
        <div className="flex items-center justify-between pt-2 border-t border-black/8">
          <span className="text-xs text-black/40">
            {r.progress_updated_at
              ? `อัพเดตล่าสุด ${new Date(r.progress_updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}${r.progress_updated_by ? ` · ${r.progress_updated_by}` : ''}`
              : 'ยังไม่มีการอัพเดต'}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors">
            ดูรายละเอียด / อัพเดต
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

      </div>
    </Link>
  )
}
