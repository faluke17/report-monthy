'use client'

import { useState } from 'react'
import { formatThaiDate } from '@/lib/utils/date-th'
import type { ResolutionProgressLog } from '@/lib/types'

const INITIAL_SHOW = 5

interface Props {
  logs: ResolutionProgressLog[]
}

export function DirectiveProgressTimeline({ logs }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  if (logs.length === 0) {
    return (
      <p className="text-xs text-black/25 text-center py-3">ยังไม่มีการอัพเดตความก้าวหน้า</p>
    )
  }

  const visible = showAll ? logs : logs.slice(0, INITIAL_SHOW)

  return (
    <div className="space-y-2">
      {visible.map((log, i) => {
        const noteExpanded = expandedNote === log.id
        return (
          <div key={log.id} className="flex gap-3 items-start">
            <div className="flex flex-col items-center shrink-0 pt-1">
              <div className={`w-2 h-2 rounded-full ${
                log.progress_pct === 100 ? 'bg-emerald-400' :
                log.progress_pct >= 50  ? 'bg-cyan-400' :
                                          'bg-black/30'
              }`} />
              {i < visible.length - 1 && (
                <div className="w-px flex-1 min-h-[16px] bg-black/10 mt-1" />
              )}
            </div>

            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/8 text-black/70 border border-black/10">
                  {log.branch_name}
                </span>
                <span className={`num text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  log.progress_pct === 100 ? 'bg-emerald-500/15 text-emerald-400' :
                                             'bg-cyan-500/15 text-cyan-400'
                }`}>
                  {log.progress_pct}%
                </span>
                <span className="text-[10px] text-black/25">
                  {formatThaiDate(log.created_at, true)} · {log.updated_by}
                </span>
              </div>
              {log.note && (
                <button
                  onClick={() => setExpandedNote(noteExpanded ? null : log.id)}
                  className="text-left mt-0.5 w-full"
                >
                  <p className={`text-xs text-black/50 leading-snug ${noteExpanded ? '' : 'line-clamp-2'}`}>
                    {log.note}
                  </p>
                  {log.note.length > 80 && (
                    <span className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors">
                      {noteExpanded ? 'ย่อ' : 'ดูเพิ่ม'}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {logs.length > INITIAL_SHOW && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full text-center text-[11px] text-black/30 hover:text-cyan-400 transition-colors pt-1 border-t border-black/8"
        >
          {showAll ? 'แสดงน้อยลง' : `ดูทั้งหมด ${logs.length} รายการ`}
        </button>
      )}
    </div>
  )
}
