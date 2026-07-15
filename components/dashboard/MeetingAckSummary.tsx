'use client'

import { useState } from 'react'
import { MeetingAcknowledgment } from '@/lib/types'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'

interface MeetingAckSummaryProps {
  acks: MeetingAcknowledgment[]
  allBranches: string[]
}

export function MeetingAckSummary({ acks, allBranches }: MeetingAckSummaryProps) {
  const [open, setOpen] = useState(false)

  const total = allBranches.length
  const ackedSet = new Set(acks.map((a) => a.branch_name))
  const ackedCount = acks.filter((a) => allBranches.includes(a.branch_name)).length
  const pct = total > 0 ? Math.round((ackedCount / total) * 100) : 0

  const pending = allBranches.filter((b) => !ackedSet.has(b))

  const barColor =
    pct === 100 ? 'bg-emerald-500' :
    pct >= 50   ? 'bg-cyan-500' :
                  'bg-amber-500'

  return (
    <div className="space-y-1.5">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity w-full"
      >
        <CheckCircle2 size={12} className={pct === 100 ? 'text-emerald-400' : 'text-black/40'} />
        <span className={pct === 100 ? 'text-emerald-400' : 'text-black/60'}>
          {ackedCount}/{total} สาขารับทราบ
        </span>
        <span className="text-black/25 text-[10px]">({pct}%)</span>
        <span className="ml-auto text-black/30">
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </span>
      </button>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Expandable detail */}
      {open && (
        <div className="mt-2 bg-black/5 border border-black/10 rounded-xl p-3 space-y-3">

          {/* Acknowledged */}
          {ackedCount > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest">
                รับทราบแล้ว ({ackedCount})
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {acks
                  .filter((a) => allBranches.includes(a.branch_name))
                  .map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={10} />
                        {a.branch_name}
                      </span>
                      <span className="text-black/30 shrink-0">
                        {new Date(a.acknowledged_at).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short',
                        })}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
                ยังไม่รับทราบ ({pending.length})
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {pending.map((b) => (
                  <div key={b} className="flex items-center gap-1 text-[11px] text-black/35">
                    <Circle size={10} />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
