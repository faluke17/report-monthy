'use client'

import { formatThaiDate } from '@/lib/utils/date-th'
import type { ResolutionProgressLog } from '@/lib/types'

interface Props {
  logs: ResolutionProgressLog[]
}

export function DirectiveProgressTimeline({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <p className="text-xs text-white/25 text-center py-3">ยังไม่มีการอัพเดตความก้าวหน้า</p>
    )
  }

  return (
    <div className="space-y-2">
      {logs.slice(0, 8).map((log, i) => (
        <div key={log.id} className="flex gap-3 items-start">
          {/* Timeline dot */}
          <div className="flex flex-col items-center shrink-0 pt-1">
            <div className={`w-2 h-2 rounded-full ${
              log.progress_pct === 100 ? 'bg-emerald-400' :
              log.progress_pct >= 50  ? 'bg-cyan-400' :
                                        'bg-white/30'
            }`} />
            {i < logs.length - 1 && (
              <div className="w-px flex-1 min-h-[16px] bg-white/10 mt-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/8 text-white/70 border border-white/10">
                {log.branch_name}
              </span>
              <span className={`num text-[10px] font-bold px-1.5 py-0.5 rounded ${
                log.progress_pct === 100 ? 'bg-emerald-500/15 text-emerald-400' :
                                           'bg-cyan-500/15 text-cyan-400'
              }`}>
                {log.progress_pct}%
              </span>
              <span className="text-[10px] text-white/25">
                {formatThaiDate(log.created_at, true)} · {log.updated_by}
              </span>
            </div>
            {log.note && (
              <p className="text-xs text-white/50 mt-0.5 leading-snug line-clamp-2">{log.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
