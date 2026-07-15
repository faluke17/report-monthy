import { Meeting } from '@/lib/types'
import { formatThaiMonthYearShort } from '@/lib/utils/date-th'

interface UnsubmittedPanelProps {
  nonSubmittedBranches: Array<{ id: string; code: string; name_th: string }>
  totalBranches:        number
  reportYear:           number
  reportMonth:          number
  periodMeeting:        Meeting | null
  requirementTitle?:    string
  requirementDueDate?:  string
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr), now = new Date()
  now.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

export function UnsubmittedPanel({
  nonSubmittedBranches, totalBranches, reportYear, reportMonth,
  periodMeeting, requirementTitle, requirementDueDate,
}: UnsubmittedPanelProps) {
  const pending   = nonSubmittedBranches.length
  const submitted = totalBranches - pending
  const pct       = totalBranches > 0 ? Math.round((submitted / totalBranches) * 100) : 0
  const allDone   = pending === 0

  const dueDateStr   = requirementDueDate ?? periodMeeting?.scheduled_date ?? null
  const days         = dueDateStr ? daysUntil(dueDateStr) : null
  const dueDateLabel = dueDateStr
    ? new Date(dueDateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })
    : null
  const isUrgent  = days !== null && days <= 7 && days >= 0
  const isOverdue = days !== null && days < 0

  const accent    = allDone ? '#1E7A5A' : isOverdue ? '#B3392C' : isUrgent ? '#A8721A' : '#0B6E76'
  const bgTint    = allDone
    ? 'rgba(30,122,90,.10)'
    : isOverdue
    ? 'rgba(179,57,44,.12)'
    : 'rgba(11,110,118,.09)'

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: `linear-gradient(135deg, rgba(0,0,0,.96) 55%, ${bgTint} 100%)`,
        border: `1px solid ${accent}28`,
        boxShadow: `inset 4px 0 0 ${accent}, 0 4px 6px rgba(0,0,0,.40), 0 16px 48px rgba(0,0,0,.50)`,
      }}
    >
      {/* Blob */}
      <div
        aria-hidden
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}14 0%, transparent 70%)` }}
      />

      {/* Label */}
      <p className="text-[10px] font-bold tracking-[.14em] uppercase mb-1 relative" style={{ color: '#4B5563', fontFamily: 'var(--font-mono)' }}>
        {requirementTitle ?? 'สถานะการส่งรายงาน'}
      </p>

      {/* Period + due date */}
      <div className="flex items-center gap-2 mb-4 flex-wrap relative">
        <span className="inline-flex text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(11,110,118,.14)', color: '#0B6E76', border: '1px solid rgba(11,110,118,.22)' }}>
          {formatThaiMonthYearShort(reportYear, reportMonth)}
        </span>
        {dueDateLabel && (
          <span className="text-[11px]" style={{ color: isOverdue ? '#B3392C' : isUrgent ? '#A8721A' : '#4B5563' }}>
            กำหนดส่ง {dueDateLabel}
            {days !== null && !allDone && (
              <span className="ml-1 font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                {isOverdue ? `(เกิน ${Math.abs(days)} วัน)` : days === 0 ? '(วันนี้!)' : `(T-${days}d)`}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Big number */}
      <div className="relative flex items-baseline gap-2 mb-3">
        <span
          className="font-bold leading-none"
          style={{
            color: accent,
            fontSize: '44px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-.02em',
            textShadow: `0 0 28px ${accent}50, 0 0 56px ${accent}28`,
          }}
        >
          {submitted}
        </span>
        <span className="text-[14px] font-semibold" style={{ color: accent, opacity: .55 }}>
          / {totalBranches} ส่งแล้ว
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-3">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(11,110,118,.10)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: accent, boxShadow: `0 0 10px ${accent}66` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: '#4B5563', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
          <span className="text-[10px]" style={{ color: allDone ? '#1E7A5A' : '#A8721A' }}>
            {allDone ? '✓ ครบทุกสาขา' : `ค้าง ${pending} สาขา`}
          </span>
        </div>
      </div>

      {/* Branch tags */}
      {!allDone && (
        <div className="relative flex flex-wrap gap-1">
          {nonSubmittedBranches.map(b => (
            <span
              key={b.id}
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
              style={{ background: 'rgba(168,114,26,.08)', border: '1px solid rgba(168,114,26,.20)', color: '#A8721A' }}
            >
              {b.name_th}
            </span>
          ))}
        </div>
      )}

      <div aria-hidden className="absolute bottom-0 left-6 right-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}25, transparent)` }} />
    </div>
  )
}
