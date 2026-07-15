'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, Circle } from 'lucide-react'
import { toggleResolutionStep, createResolutionStep } from '@/app/actions/directive'
import { cn } from '@/lib/utils'
import type { ResolutionStep } from '@/lib/types'

interface Props {
  steps: ResolutionStep[]
  resolutionId: string
  isAdmin: boolean
}

export function DirectiveStepsPanel({ steps, resolutionId, isAdmin }: Props) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleToggle(stepId: string, currentState: boolean) {
    startTransition(async () => {
      await toggleResolutionStep(stepId, !currentState)
    })
  }

  function handleAdd() {
    if (!newTitle.trim()) return
    const nextNo = (steps.length > 0 ? Math.max(...steps.map(s => s.step_no)) : 0) + 1
    startTransition(async () => {
      await createResolutionStep({
        resolution_id: resolutionId,
        step_no: nextNo,
        title: newTitle.trim(),
      })
      setNewTitle('')
      setShowAddForm(false)
    })
  }

  if (steps.length === 0 && !isAdmin) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-black/30 uppercase tracking-wider">ขั้นตอนการดำเนินการ</span>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
          >
            <Plus size={10} />
            เพิ่มขั้นตอน
          </button>
        )}
      </div>

      {steps.length === 0 ? (
        <p className="text-xs text-black/25 text-center py-2">ยังไม่มีขั้นตอน</p>
      ) : (
        <div className="space-y-1.5">
          {steps.map(step => (
            <button
              key={step.id}
              onClick={() => handleToggle(step.id, step.is_complete)}
              disabled={isPending}
              className={cn(
                'w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all',
                step.is_complete
                  ? 'bg-emerald-500/8 border-emerald-500/20 opacity-70'
                  : 'bg-black/3 border-black/8 hover:bg-black/6 hover:border-black/15'
              )}
            >
              <div className="mt-0.5 shrink-0">
                {step.is_complete ? (
                  <Check size={13} className="text-emerald-400" />
                ) : (
                  <Circle size={13} className="text-black/25" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-xs leading-snug',
                  step.is_complete ? 'line-through text-black/35' : 'text-black/70'
                )}>
                  <span className="num text-black/30 mr-1">{step.step_no}.</span>
                  {step.title}
                </p>
                {step.completed_at && step.completed_by && (
                  <p className="text-[10px] text-emerald-400/60 mt-0.5">
                    เสร็จสิ้น · {step.completed_by}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="ชื่อขั้นตอน..."
            className="flex-1 bg-[#FFFFFF] border border-black/15 rounded-lg px-3 py-1.5 text-xs text-[#12181F] placeholder:text-black/20 focus:outline-none focus:border-cyan-500/40"
          />
          <button
            onClick={handleAdd}
            disabled={isPending || !newTitle.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 hover:bg-cyan-500/25 disabled:opacity-40 transition-colors"
          >
            บันทึก
          </button>
        </div>
      )}
    </div>
  )
}
