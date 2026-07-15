'use client'

import { Check, AlertTriangle } from 'lucide-react'
import { BudgetProject } from '@/lib/types'

export const PHASES = [
  { no: 1, label: 'ราคากลาง' },
  { no: 2, label: 'TOR' },
  { no: 3, label: 'พิจารณาผล' },
  { no: 4, label: 'เซ็นสัญญา' },
  { no: 5, label: 'ดำเนินงาน' },
  { no: 6, label: 'แล้วเสร็จ' },
]

export type MissingField = { label: string }

export function getMissingFields(project: BudgetProject, phaseNo: number): MissingField[] {
  if (project.current_phase < phaseNo) return []

  switch (phaseNo) {
    case 1:
    case 2:
    case 3:
    case 5:
      return []
    case 4: {
      const c = project.project_contracts
      if (!c) return [{ label: 'ข้อมูลสัญญา (ยังไม่บันทึก)' }]
      const missing: MissingField[] = []
      if (!c.contractor_name) missing.push({ label: 'ชื่อผู้รับจ้าง' })
      if (!c.contract_number) missing.push({ label: 'เลขที่สัญญา' })
      if (!c.contract_date) missing.push({ label: 'วันที่สัญญา' })
      if (!c.contract_start_date) missing.push({ label: 'วันเริ่มสัญญา' })
      if (!c.construction_days) missing.push({ label: 'ระยะเวลาก่อสร้าง' })
      return missing
    }
    case 6: {
      const missing: MissingField[] = []
      if (!project.completion_submission_date) missing.push({ label: 'วันส่งงาน' })
      if (!project.completion_inspection_date) missing.push({ label: 'วันตรวจรับงาน' })
      if (!project.certificate_url) missing.push({ label: 'ใบรับรองผลงาน' })
      return missing
    }
    default: return []
  }
}

type PhaseStatus = 'completed' | 'active' | 'pending'

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

function formatDateShort(d: string | null) {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  } catch { return null }
}

interface Props {
  project: BudgetProject
  selectedPhase: number | null
  onSelectPhase: (phase: number) => void
  onTogglePhase?: (phaseNo: 1 | 2 | 3, isCompleted: boolean) => void
  progressPct: number | null
  projectType?: 'pipe' | 'dma'
}

export function PhaseTimeline({
  project, selectedPhase, onSelectPhase, onTogglePhase, progressPct, projectType = 'pipe',
}: Props) {
  const cp = project.current_phase
  // Fill rail from node-1-center toward the active node
  const fillPct = cp === 0 ? 0 : Math.min(cp / (PHASES.length - 1) * 100, 100)

  return (
    <div className="space-y-3">
      {/* ── Horizontal stepper ── */}
      <div className="relative">
        {/* Rail bg — spans from center of first to center of last node (node w=32px → offset 16px = 1rem = Tailwind-4) */}
        <div className="absolute top-4 left-4 right-4 h-px bg-black/8" />

        {/* Rail fill */}
        {fillPct > 0 && (
          <div
            className="absolute top-4 left-4 h-px bg-gradient-to-r from-emerald-500/60 via-emerald-400/40 to-emerald-400/10 transition-[width] duration-700 ease-out"
            style={{ width: `calc((100% - 2rem) * ${fillPct / 100})` }}
          />
        )}

        {/* Nodes */}
        <div className="relative flex justify-between">
          {PHASES.map((phase) => {
            const status = getPhaseStatus(project, phase.no)
            const date = getPhaseCompletedDate(project, phase.no)
            const isSelected = selectedPhase === phase.no
            const isCompleted = status === 'completed'
            const isActive = status === 'active'
            const isPending = status === 'pending'
            const isCheckbox = phase.no <= 3
            const missing = getMissingFields(project, phase.no)
            const hasMissing = missing.length > 0

            const circleColor = isCompleted && !hasMissing
              ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-400'
              : isCompleted && hasMissing
              ? 'bg-amber-500/15 border-amber-400/70 text-amber-400'
              : isActive
              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
              : 'bg-black/4 border-black/10 text-black/18'

            const labelColor = isCompleted && !hasMissing ? 'text-black/45'
              : isCompleted && hasMissing ? 'text-amber-400/80'
              : isActive ? 'text-cyan-400'
              : 'text-black/18'

            return (
              <div key={phase.no} className="flex flex-col items-center gap-1.5 z-10">
                {/* Node circle */}
                <button
                  onClick={() => {
                    if (isPending) return
                    if (isCheckbox) onTogglePhase?.(phase.no as 1 | 2 | 3, isCompleted)
                    else onSelectPhase(phase.no)
                  }}
                  disabled={isPending}
                  aria-label={`ขั้นตอน ${phase.no}: ${phase.label}`}
                  className={[
                    'relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200',
                    circleColor,
                    isSelected
                      ? 'ring-2 ring-cyan-400/40 ring-offset-2 ring-offset-white scale-110 shadow-[0_0_14px_rgba(11,110,118,0.25)]'
                      : '',
                    isPending ? 'cursor-not-allowed' : isCheckbox || !isPending ? 'hover:scale-105 active:scale-95' : '',
                  ].join(' ')}
                >
                  {isCompleted && !hasMissing ? (
                    <Check size={13} strokeWidth={3} />
                  ) : (
                    <span className="font-mono text-[11px]">{phase.no}</span>
                  )}

                  {/* Cyan pulse ring when active */}
                  {isActive && (
                    <span className="absolute inset-[-3px] rounded-full border border-cyan-400/30 animate-ping pointer-events-none" />
                  )}

                  {/* Amber warning dot — only phases 4 & 6 */}
                  {hasMissing && (
                    <span className="absolute -top-[3px] -right-[3px] w-[11px] h-[11px] rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                      <AlertTriangle size={6} className="text-amber-900" />
                    </span>
                  )}
                </button>

                {/* Label + completion date */}
                <div className="flex flex-col items-center gap-0.5 text-center" style={{ maxWidth: 56 }}>
                  <span className={`leading-tight font-semibold text-[10px] ${labelColor}`}>
                    {phase.label}
                  </span>
                  {date && (
                    <span className="text-black/35 leading-none text-[9px]">
                      {formatDateShort(date)}
                    </span>
                  )}
                  {/* Dot under selected node */}
                  {isSelected && (
                    <span className="w-1 h-1 rounded-full bg-cyan-400 mt-0.5 shadow-[0_0_6px_rgba(11,110,118,0.8)]" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Phase 5 pipe-length progress bar ── */}
      {progressPct !== null && projectType === 'pipe' && cp >= 5 && (
        <div className="bg-black/3 rounded-lg px-3 py-2.5 border border-black/6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-black/50 font-semibold">ความคืบหน้าก่อสร้าง</span>
            <span className="text-sm text-cyan-300 font-bold num">{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-black/6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(progressPct, 100)}%`,
                background: progressPct >= 100
                  ? 'linear-gradient(90deg, rgb(52,211,153), rgb(16,185,129))'
                  : 'linear-gradient(90deg, rgb(34,211,238), rgb(6,182,212))',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
