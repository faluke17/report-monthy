'use client'

import { CheckCircle2, Circle, CheckSquare, Square } from 'lucide-react'
import { BudgetProject } from '@/lib/types'

export const PHASES = [
  { no: 1, label: 'ราคากลาง',          short: 'ราคากลาง' },
  { no: 2, label: 'TOR',               short: 'TOR' },
  { no: 3, label: 'พิจารณาผล',         short: 'พิจารณาผล' },
  { no: 4, label: 'เซ็นสัญญา',         short: 'สัญญา' },
  { no: 5, label: 'ดำเนินงานก่อสร้าง', short: 'ก่อสร้าง' },
  { no: 6, label: 'งานแล้วเสร็จ',      short: 'เสร็จ' },
]

type PhaseStatus = 'completed' | 'active' | 'pending' | 'locked'

export function getPhaseStatus(project: BudgetProject, phaseNo: number): PhaseStatus {
  if (phaseNo === 6) {
    return project.current_phase === 6 ? 'completed' : project.current_phase === 5 ? 'active' : 'pending'
  }
  if (phaseNo <= project.current_phase) return 'completed'
  if (phaseNo === project.current_phase + 1) return 'active'
  return 'pending'
}

export function getPhaseCompletedDate(project: BudgetProject, phaseNo: number): string | null {
  switch (phaseNo) {
    case 1: return project.phase1_completed_at
    case 2: return project.phase2_completed_at
    case 3: return project.phase3_completed_at
    case 4: return project.project_contracts?.contract_date ?? null
    case 5: return null
    case 6: return project.completion_inspection_date
    default: return null
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

interface Props {
  project: BudgetProject
  selectedPhase: number | null
  onSelectPhase: (phase: number) => void
  onTogglePhase?: (phaseNo: 1 | 2 | 3, isCompleted: boolean) => void
  progressPct: number | null
  projectType?: 'pipe' | 'dma'
}

export function PhaseTimeline({ project, selectedPhase, onSelectPhase, onTogglePhase, progressPct, projectType = 'pipe' }: Props) {
  return (
    <div className="space-y-1">
      {PHASES.map((phase, idx) => {
        const status     = getPhaseStatus(project, phase.no)
        const date       = getPhaseCompletedDate(project, phase.no)
        const isSelected = selectedPhase === phase.no
        const isLast     = idx === PHASES.length - 1
        const isCheckbox = phase.no <= 3
        const isCompleted = status === 'completed'

        return (
          <div key={phase.no} className="relative">
            {/* Connector line */}
            {!isLast && (
              <div
                className="absolute left-[11px] top-7 w-0.5 h-4 z-0"
                style={{ background: isCompleted ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)' }}
              />
            )}

            {/* Phase 1-3: checkbox row */}
            {isCheckbox ? (
              <button
                onClick={() => onTogglePhase?.(phase.no as 1|2|3, isCompleted)}
                className="relative z-10 w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/4 border border-transparent transition-all group"
              >
                <span className="shrink-0">
                  {isCompleted ? (
                    <CheckSquare size={20} className="text-emerald-400" />
                  ) : (
                    <Square size={20} className="text-white/20 group-hover:text-white/40 transition-colors" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-400' : 'text-white/40'}`}>
                    {phase.no}. {phase.label}
                  </p>
                  {date && <p className="text-[11px] text-white/30 mt-0.5">{formatDate(date)}</p>}
                </div>
                {isCompleted && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    เสร็จ
                  </span>
                )}
              </button>
            ) : (
              /* Phase 4-6: expand form row */
              <button
                onClick={() => onSelectPhase(phase.no)}
                className={`relative z-10 w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : 'hover:bg-white/4 border border-transparent'
                }`}
              >
                <span className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : status === 'active' ? (
                    <Circle size={20} className="text-cyan-400" style={{ fill: 'rgba(34,211,238,0.2)' }} />
                  ) : (
                    <Circle size={20} className="text-white/20" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isCompleted ? 'text-emerald-400' : status === 'active' ? 'text-cyan-300' : 'text-white/35'
                  }`}>
                    {phase.no}. {phase.label}
                  </p>
                  {date && <p className="text-[11px] text-white/30 mt-0.5">{formatDate(date)}</p>}
                  {phase.no === 5 && status !== 'pending' && progressPct !== null && projectType === 'pipe' && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${Math.min(progressPct, 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-cyan-400 num shrink-0">{progressPct}%</span>
                    </div>
                  )}
                </div>
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isCompleted ? 'bg-emerald-500/15 text-emerald-400'
                  : status === 'active' ? 'bg-cyan-500/15 text-cyan-400'
                  : 'bg-white/5 text-white/20'
                }`}>
                  {isCompleted ? 'เสร็จ' : status === 'active' ? 'กำลังดำเนิน' : 'รอ'}
                </span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
