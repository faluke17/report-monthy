'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { logDirectiveProgress } from '@/app/actions/directive'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { StatusPill } from '@/components/shared/StatusPill'
import { formatThaiDate, isOverdue, daysUntil } from '@/lib/utils/date-th'
import type { MeetingResolution } from '@/lib/types'
import {
  ChevronDown, ChevronUp, TrendingUp, AlertCircle, CheckCircle2,
  FileText, MessageSquare, Clock,
} from 'lucide-react'

const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const

interface Props {
  r: MeetingResolution
  isAdmin: boolean
  branchName: string | null
}

export function ResolutionCard({ r, isAdmin, branchName }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)
  const [pct, setPct] = useState(r.progress_pct)
  const [note, setNote] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [isPending, startTransition] = useTransition()

  const done = r.status === 'แล้วเสร็จ' || r.status === 'ปิดประเด็น'
  const overdue = isOverdue(r.due_date) && !done
  const days = r.due_date ? daysUntil(r.due_date) : null

  const branchCostcenter = PWA_BRANCHES.find(b => b.name_th === branchName)?.costcenter
  const canUpdate = isAdmin || (!!branchCostcenter && r.responsible_branch === branchCostcenter)

  const branchLabel = r.responsible_branch
    ? (PWA_BRANCHES.find(b => b.costcenter === r.responsible_branch)?.name_th ?? r.responsible_branch)
    : null

  const borderColor = done
    ? 'border-l-emerald-500/50'
    : overdue
    ? 'border-l-red-500/60'
    : r.priority === 'สูง'
    ? 'border-l-red-400/60'
    : r.priority === 'กลาง'
    ? 'border-l-amber-400/60'
    : 'border-l-cyan-500/40'

  function handleSave() {
    setSaveError(null)
    setSaveOk(false)
    // Use responsible branch when admin updates, otherwise use session branch
    const effectiveCostcenter = branchCostcenter ?? r.responsible_branch ?? ''
    const effectiveBranchName = branchName ?? (
      r.responsible_branch
        ? (PWA_BRANCHES.find(b => b.costcenter === r.responsible_branch)?.name_th ?? r.responsible_branch)
        : ''
    )
    startTransition(async () => {
      const result = await logDirectiveProgress({
        resolution_id: r.id,
        branch_costcenter: effectiveCostcenter,
        branch_name: effectiveBranchName,
        progress_pct: pct,
        note,
      })
      if (!result.success) {
        setSaveError(result.error)
      } else {
        setSaveOk(true)
        setNote('')
        setShowUpdate(false)
      }
    })
  }

  return (
    <div className={cn(
      'rounded-xl border border-black/10 border-l-4 overflow-hidden transition-opacity',
      borderColor,
      done ? 'opacity-65' : ''
    )}>

      {/* ── Compact header (always visible) ── */}
      <div className="px-5 pt-4 pb-3 bg-black/2">
        <div className="flex items-start gap-3">
          <span className="num text-xs font-bold text-cyan-400 w-7 shrink-0 text-right pt-0.5">
            #{r.sequence_no}
          </span>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {r.priority && (
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                  r.priority === 'สูง'
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                )}>
                  {r.priority}
                </span>
              )}
              {r.source && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-black/5 text-black/40 border-black/12">
                  {r.source}
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-[#12181F] leading-snug">{r.title}</p>

            {/* Meta */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {branchLabel && (
                <span className="text-black/55 font-medium">{branchLabel}</span>
              )}
              {branchLabel && r.responsible_dept && <span className="text-black/20">·</span>}
              {r.responsible_dept && (
                <span className="px-2 py-0.5 rounded bg-black/6 border border-black/10 text-black/45">
                  {r.responsible_dept}
                </span>
              )}
              {r.due_date && (
                <>
                  <span className="text-black/20">·</span>
                  <span className={cn(
                    'flex items-center gap-1',
                    overdue ? 'text-red-400' : days !== null && days <= 7 ? 'text-amber-400' : 'text-black/40'
                  )}>
                    <Clock size={10} />
                    ครบ {formatThaiDate(r.due_date, true)}
                    {days !== null && !done && (
                      <span className="text-[10px] opacity-70">
                        {overdue
                          ? `(เกิน ${Math.abs(days)} วัน)`
                          : days === 0 ? '(วันนี้)'
                          : `(อีก ${days} วัน)`}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status + expand toggle */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <StatusPill status={r.status} />
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[10px] text-black/30 hover:text-cyan-400 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{expanded ? 'ซ่อน' : 'รายละเอียด'}</span>
            </button>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="ml-10 mt-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-black/8 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  done ? 'bg-emerald-500' : 'bg-cyan-500/70'
                )}
                style={{ width: `${r.progress_pct}%` }}
              />
            </div>
            <span className={cn(
              'num text-[10px] font-bold w-8 text-right',
              done ? 'text-emerald-400' : 'text-black/40'
            )}>
              {r.progress_pct}%
            </span>
          </div>
          {r.progress_note && !expanded && (
            <p className="text-[10px] text-black/25 mt-0.5 truncate">{r.progress_note}</p>
          )}
        </div>
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-black/8 bg-black/1 px-5 py-4 space-y-4">

          {/* Detail */}
          {r.detail && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30 uppercase tracking-wider">
                <FileText size={10} />
                รายละเอียด / สิ่งที่ต้องทำ
              </div>
              <p className="text-sm text-black/70 leading-relaxed whitespace-pre-line pl-4">{r.detail}</p>
            </div>
          )}

          {/* Admin notes + tracking */}
          {(r.admin_notes || r.tracking_notes) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {r.admin_notes && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30 uppercase tracking-wider">
                    <MessageSquare size={10} />
                    หมายเหตุผู้บริหาร
                  </div>
                  <p className="text-xs text-black/60 leading-relaxed pl-4">{r.admin_notes}</p>
                </div>
              )}
              {r.tracking_notes && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30 uppercase tracking-wider">
                    <TrendingUp size={10} />
                    การติดตาม
                  </div>
                  <p className="text-xs text-black/60 leading-relaxed pl-4">{r.tracking_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Full progress section */}
          <div className="space-y-2 pt-1 border-t border-black/8">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-black/30 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={10} />
                ความก้าวหน้า — {r.progress_pct}%
              </span>
              {canUpdate && !done && (
                <button
                  onClick={() => { setShowUpdate(v => !v); setSaveError(null); setSaveOk(false) }}
                  className="text-[10px] text-cyan-400/70 hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  {showUpdate ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {showUpdate ? 'ซ่อนฟอร์ม' : 'อัพเดทความก้าวหน้า'}
                </button>
              )}
            </div>

            <div className="h-2 rounded-full bg-black/8 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  done ? 'bg-emerald-500' : 'bg-cyan-500/70'
                )}
                style={{ width: `${r.progress_pct}%` }}
              />
            </div>

            {r.progress_note && (
              <p className="text-xs text-black/40 leading-relaxed">
                {r.progress_note}
                {r.progress_updated_at && (
                  <span className="text-black/20 ml-1.5">
                    · {new Date(r.progress_updated_at).toLocaleDateString('th-TH', {
                      day: 'numeric', month: 'short',
                    })}
                    {r.progress_updated_by && ` · ${r.progress_updated_by}`}
                  </span>
                )}
              </p>
            )}

            {/* Progress update form */}
            {showUpdate && (
              <div className="mt-2 space-y-3 pt-3 border-t border-black/8">
                <div className="flex gap-1.5">
                  {PROGRESS_STEPS.map(step => (
                    <button
                      key={step}
                      onClick={() => setPct(step)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        pct === step
                          ? step === 100
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          : 'bg-black/5 text-black/35 border-black/10 hover:border-black/25 hover:text-black/60'
                      )}
                    >
                      {step}%
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="รายละเอียดความก้าวหน้า..."
                  className="w-full bg-[#FFFFFF] border border-black/15 rounded-lg px-3 py-2 text-xs text-[#12181F] placeholder:text-black/20 focus:outline-none focus:border-cyan-500/40 resize-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <div>
                    {saveError && (
                      <span className="flex items-center gap-1 text-[11px] text-red-400">
                        <AlertCircle size={11} /> {saveError}
                      </span>
                    )}
                    {saveOk && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 size={11} /> บันทึกแล้ว
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      isPending
                        ? 'bg-black/8 text-black/25 cursor-not-allowed'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
                    )}
                  >
                    {isPending ? 'กำลังบันทึก...' : 'บันทึกความก้าวหน้า'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
