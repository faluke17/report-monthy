import { Meeting } from '@/lib/types'
import { formatThaiDate, formatThaiMonthYearShort } from '@/lib/utils/date-th'

interface UnsubmittedPanelProps {
  nonSubmittedBranches: Array<{ id: string; code: string; name_th: string }>
  totalBranches: number
  reportYear: number
  reportMonth: number
  periodMeeting: Meeting | null
  requirementTitle?: string
  requirementDueDate?: string
}

const MAX_VISIBLE = 6

export function UnsubmittedPanel({
  nonSubmittedBranches,
  totalBranches,
  reportYear,
  reportMonth,
  periodMeeting,
  requirementTitle,
  requirementDueDate,
}: UnsubmittedPanelProps) {
  const count = nonSubmittedBranches.length
  const visible = nonSubmittedBranches.slice(0, MAX_VISIBLE)
  const overflow = count - MAX_VISIBLE

  return (
    <div className="glass-card p-4 pt-5 relative overflow-hidden accent-bar-amber">
      <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40 mb-2">
        {requirementTitle ?? 'สาขาที่ยังไม่ส่งรายงาน'}
      </p>

      {/* Period tag */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="inline-flex items-center text-[11px] bg-white/8 text-white/60 px-2 py-0.5 rounded-full">
          {formatThaiMonthYearShort(reportYear, reportMonth)}
        </span>
        {requirementDueDate ? (
          <span className="text-[11px] text-white/35">
            กำหนดส่ง {new Date(requirementDueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}
          </span>
        ) : periodMeeting ? (
          <span className="text-[11px] text-white/35">
            ก่อนประชุม {formatThaiDate(periodMeeting.scheduled_date, true)}
          </span>
        ) : (
          <span className="text-[11px] text-white/25 italic">ไม่มีการประชุมกำหนด</span>
        )}
      </div>

      {count === 0 ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="num text-3xl font-bold leading-none text-[#4ade80]">ครบ</span>
            <span className="text-sm text-white/40 ml-0.5">ทุกสาขา</span>
          </div>
          <p className="text-[11px] text-[#4ade80]/70 mt-1">ทุกสาขาส่งรายงานแล้ว ✓</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="num text-3xl font-bold leading-none text-[#f6c453]">{count}</span>
            <span className="text-sm text-white/40 ml-0.5">/ {totalBranches} สาขา</span>
          </div>

          <div className="flex flex-wrap mt-3 gap-1">
            {visible.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center px-2 py-0.5 rounded bg-white/8 text-[11px] text-white/70"
              >
                {b.name_th}
              </span>
            ))}
            {overflow > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold text-[#f6c453]">
                +{overflow} สาขา
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
