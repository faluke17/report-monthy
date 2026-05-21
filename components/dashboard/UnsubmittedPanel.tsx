import { Meeting } from '@/lib/types'
import { formatThaiMonthYearShort } from '@/lib/utils/date-th'

interface UnsubmittedPanelProps {
  nonSubmittedBranches: Array<{ id: string; code: string; name_th: string }>
  totalBranches: number
  reportYear: number
  reportMonth: number
  periodMeeting: Meeting | null
  requirementTitle?: string
  requirementDueDate?: string
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function UnsubmittedPanel({
  nonSubmittedBranches,
  totalBranches,
  reportYear,
  reportMonth,
  periodMeeting,
  requirementTitle,
  requirementDueDate,
}: UnsubmittedPanelProps) {
  const pending = nonSubmittedBranches.length
  const submitted = totalBranches - pending
  const pct = totalBranches > 0 ? Math.round((submitted / totalBranches) * 100) : 0
  const allDone = pending === 0

  // หา due date และ countdown
  const dueDateStr = requirementDueDate ?? periodMeeting?.scheduled_date ?? null
  const days = dueDateStr ? daysUntil(dueDateStr) : null
  const dueDateLabel = dueDateStr
    ? new Date(dueDateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })
    : null

  const isUrgent = days !== null && days <= 7 && days >= 0
  const isOverdue = days !== null && days < 0

  return (
    <div className={`glass-card p-4 pt-5 relative overflow-hidden ${allDone ? 'accent-bar-green' : 'accent-bar-amber'}`}>
      {/* Header */}
      <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40 mb-1">
        {requirementTitle ?? 'สถานะการส่งรายงาน'}
      </p>

      {/* Period + due date */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="inline-flex items-center text-[11px] bg-white/8 text-white/60 px-2 py-0.5 rounded-full">
          {formatThaiMonthYearShort(reportYear, reportMonth)}
        </span>
        {dueDateLabel && (
          <span className={`text-[11px] ${isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-white/35'}`}>
            กำหนดส่ง {dueDateLabel}
            {days !== null && !allDone && (
              <span className="ml-1">
                {isOverdue ? `(เกิน ${Math.abs(days)} วัน)` : days === 0 ? '(วันนี้!)' : `(อีก ${days} วัน)`}
              </span>
            )}
          </span>
        )}
        {!dueDateLabel && (
          <span className="text-[11px] text-white/25 italic">ไม่มีกำหนดส่ง</span>
        )}
      </div>

      {/* Stacked bar */}
      <div className="mb-1.5">
        <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${allDone ? 'bg-emerald-500' : 'bg-emerald-500/80'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Counts row */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className={`num text-2xl font-bold leading-none ${allDone ? 'text-emerald-400' : 'text-emerald-400'}`}>
            {submitted}
          </span>
          <span className="text-[11px] text-white/40">/ {totalBranches} ส่งแล้ว</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-emerald-400/80">{pct}%</span>
          <span className="text-white/20">·</span>
          <span className={allDone ? 'text-emerald-400/60' : 'text-amber-400/80'}>
            {allDone ? 'ครบทุกสาขา' : `ค้าง ${pending}`}
          </span>
        </div>
      </div>

      {/* Pending branches */}
      {allDone ? (
        <p className="text-[11px] text-emerald-400/70">ทุกสาขาส่งรายงานแล้ว ✓</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {nonSubmittedBranches.map((b) => (
            <span
              key={b.id}
              className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/80"
            >
              {b.name_th}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
