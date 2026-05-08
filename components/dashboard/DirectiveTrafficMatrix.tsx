'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatThaiDate } from '@/lib/utils/date-th'
import type { DirectiveBranchStatus, TrafficLight } from '@/lib/types'

const LIGHT_CLASSES: Record<TrafficLight, string> = {
  green:  'bg-emerald-500 border-emerald-400/50',
  yellow: 'bg-amber-400 border-amber-300/50',
  red:    'bg-red-500 border-red-400/50',
  grey:   'bg-white/15 border-white/20',
}

interface Props {
  branchStatuses: DirectiveBranchStatus[]
  dueDate: string | null
}

export function DirectiveTrafficMatrix({ branchStatuses, dueDate }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const [tooltipId, setTooltipId] = useState<string | null>(null)

  if (branchStatuses.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-white/10 border border-white/15" />
        <span className="text-[10px] text-white/25">ยังไม่ได้ส่งมอบหมาย</span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5 relative">
      {branchStatuses.map(bs => {
        const key = bs.action_item_id ?? bs.branch_costcenter
        const label = bs.branch_name.slice(0, 4)
        const isOpen = tooltipId === key

        const tooltipLines = [
          bs.branch_name,
          bs.action_status ? `สถานะ: ${bs.action_status}` : '',
          `ความก้าวหน้า: ${bs.progress_pct}%`,
          bs.last_updated_at
            ? `อัพเดต: ${formatThaiDate(bs.last_updated_at, true)}`
            : 'ยังไม่มีการอัพเดต',
          bs.days_overdue !== null && bs.days_overdue > 0
            ? `เกินกำหนด ${bs.days_overdue} วัน`
            : '',
        ].filter(Boolean).join('\n')

        return (
          <div key={key} className="relative">
            <button
              onMouseEnter={() => { setTooltipId(key); setTooltip(tooltipLines) }}
              onMouseLeave={() => { setTooltipId(null); setTooltip(null) }}
              className={cn(
                'w-7 h-7 rounded-full border text-[9px] font-bold text-white/80 flex items-center justify-center transition-transform hover:scale-110',
                LIGHT_CLASSES[bs.traffic_light]
              )}
              title={tooltipLines}
            >
              {label.slice(0, 2)}
            </button>
            {isOpen && tooltip && (
              <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-40 bg-[#0c1a30] border border-white/15 rounded-lg p-2 shadow-xl pointer-events-none">
                {tooltip.split('\n').map((line, i) => (
                  <p key={i} className={cn(
                    'text-[10px] leading-snug',
                    i === 0 ? 'font-semibold text-white/80 mb-1' : 'text-white/50'
                  )}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
