'use client'

import { cn } from '@/lib/utils'
import { formatThaiDate } from '@/lib/utils/date-th'
import type { DirectiveBranchStatus, TrafficLight } from '@/lib/types'

const LIGHT_CLASSES: Record<TrafficLight, string> = {
  green:  'bg-emerald-500 border-emerald-400/50',
  yellow: 'bg-amber-400 border-amber-300/50',
  red:    'bg-red-500 border-red-400/50',
  grey:   'bg-white/15 border-white/20',
}

const ROW_CLASSES: Record<TrafficLight, string> = {
  green:  'text-emerald-400',
  yellow: 'text-amber-400',
  red:    'text-red-400',
  grey:   'text-white/25',
}

interface Props {
  branchStatuses: DirectiveBranchStatus[]
  dueDate: string | null
  expanded?: boolean
}

export function DirectiveTrafficMatrix({ branchStatuses, expanded = false }: Props) {
  if (branchStatuses.length === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-white/10 border border-white/15" />
        <span className="text-[10px] text-white/25">ยังไม่ได้ส่งมอบหมาย</span>
      </div>
    )
  }

  // Dot view — compact (default)
  if (!expanded) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {branchStatuses.map(bs => {
          const key = bs.action_item_id ?? bs.branch_costcenter
          const label = bs.branch_name.slice(0, 2)
          const title = [
            bs.branch_name,
            bs.action_status ? `สถานะ: ${bs.action_status}` : '',
            `ความก้าวหน้า: ${bs.progress_pct}%`,
            bs.last_updated_at ? `อัพเดต: ${formatThaiDate(bs.last_updated_at, true)}` : 'ยังไม่มีการอัพเดต',
            bs.days_overdue !== null && bs.days_overdue > 0 ? `เกินกำหนด ${bs.days_overdue} วัน` : '',
          ].filter(Boolean).join('\n')

          return (
            <div
              key={key}
              title={title}
              className={cn(
                'w-7 h-7 rounded-full border text-[9px] font-bold text-white/80 flex items-center justify-center cursor-default transition-transform hover:scale-110',
                LIGHT_CLASSES[bs.traffic_light]
              )}
            >
              {label}
            </div>
          )
        })}
      </div>
    )
  }

  // List view — expanded (admin view)
  return (
    <div className="space-y-1">
      {branchStatuses.map(bs => {
        const key = bs.action_item_id ?? bs.branch_costcenter
        const done = bs.traffic_light === 'green' && bs.progress_pct === 100
        return (
          <div
            key={key}
            className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/3 border border-white/6"
          >
            <div className={cn('w-2 h-2 rounded-full shrink-0', {
              'bg-emerald-400': bs.traffic_light === 'green',
              'bg-amber-400':   bs.traffic_light === 'yellow',
              'bg-red-400':     bs.traffic_light === 'red',
              'bg-white/20':    bs.traffic_light === 'grey',
            })} />

            <span className={cn('text-xs w-28 shrink-0 truncate', ROW_CLASSES[bs.traffic_light])}>
              {bs.branch_name}
            </span>

            <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', done ? 'bg-emerald-500' : 'bg-cyan-500/70')}
                style={{ width: `${bs.progress_pct}%` }}
              />
            </div>

            <span className="num text-[10px] text-white/50 w-8 text-right shrink-0">
              {bs.progress_pct}%
            </span>

            {bs.days_overdue !== null && bs.days_overdue > 0 && (
              <span className="text-[9px] text-red-400 shrink-0">เกิน {bs.days_overdue}ว</span>
            )}

            {bs.last_updated_at && (
              <span className="text-[9px] text-white/25 shrink-0 hidden sm:block">
                {formatThaiDate(bs.last_updated_at, true)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
