'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { logDirectiveProgress } from '@/app/actions/directive'
import { formatThaiDate, isOverdue, daysUntil } from '@/lib/utils/date-th'
import { StatusPill } from '@/components/shared/StatusPill'
import { DirectiveTrafficMatrix } from './DirectiveTrafficMatrix'
import { DirectiveProgressTimeline } from './DirectiveProgressTimeline'
import {
  ChevronDown, ChevronUp, Clock, AlertCircle, CheckCircle2,
  TrendingUp, Activity, Target, CheckCircle,
} from 'lucide-react'
import type { DirectiveSummary } from '@/lib/types'

const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const

interface Props {
  summary: DirectiveSummary
  isAdmin: boolean
  branchCostcenter: string | null
  branchName: string | null
}

export function DirectiveCard({ summary, isAdmin, branchCostcenter, branchName }: Props) {
  const { resolution: r, branch_statuses, logs } = summary

  const [expanded, setExpanded] = useState(false)
  const [pct, setPct] = useState(r.progress_pct)
  const [note, setNote] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveOk, setSaveOk] = useState(false)
  const [isPending, startTransition] = useTransition()

  const done = r.status === 'แล้วเสร็จ' || r.status === 'ปิดประเด็น'
  const overdue = isOverdue(r.due_date) && !done
  const days = r.due_date ? daysUntil(r.due_date) : null

  const myBranchStatus = branch_statuses.find(bs => bs.branch_costcenter === branchCostcenter)
  const canUpdate = isAdmin || !!myBranchStatus

  const totalBranches = branch_statuses.length
  const doneBranches = branch_statuses.filter(bs => bs.action_status === 'แล้วเสร็จ').length
  const delayedBranches = branch_statuses.filter(bs => bs.traffic_light === 'red').length

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
    const effectiveCostcenter = branchCostcenter ?? r.responsible_branch ?? ''
    const effectiveName = branchName ?? myBranchStatus?.branch_name ?? ''
    const actionItemId = myBranchStatus?.action_item_id ?? undefined

    startTransition(async () => {
      const result = await logDirectiveProgress({
        resolution_id: r.id,
        action_item_id: actionItemId,
        branch_costcenter: effectiveCostcenter,
        branch_name: effectiveName,
        progress_pct: pct,
        note,
      })
      if (!result.success) {
        setSaveError(result.error)
      } else {
        setSaveOk(true)
        setNote('')
      }
    })
  }

  return (
    <div className={cn(
      'rounded-xl border border-black/10 border-l-4 overflow-hidden transition-opacity',
      borderColor,
      done && !myBranchStatus ? 'opacity-70' : '',
    )}>

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 bg-black/2">
        <div className="flex items-start gap-3">
          <span className="num text-xs font-bold text-cyan-400 w-7 shrink-0 text-right pt-0.5">
            #{r.sequence_no}
          </span>

          <div className="flex-1 min-w-0 space-y-2">
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
              {isAdmin && totalBranches > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-black/5 text-black/35 border-black/10">
                  <span className="num">{doneBranches}/{totalBranches}</span> สาขา
                </span>
              )}
              {isAdmin && delayedBranches > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                  ล่าช้า <span className="num">{delayedBranches}</span> สาขา
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-[#12181F] leading-snug">{r.title}</p>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {r.responsible_dept && (
                <span className="px-2 py-0.5 rounded bg-black/6 border border-black/10 text-black/45">
                  {r.responsible_dept}
                </span>
              )}
              {r.due_date && (
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
              )}
            </div>

            {/* Traffic dots — admin compact view */}
            {isAdmin && (
              <DirectiveTrafficMatrix
                branchStatuses={branch_statuses}
                dueDate={r.due_date}
                expanded={false}
              />
            )}
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <StatusPill status={r.status} />
            {isAdmin && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-[10px] text-black/30 hover:text-cyan-400 transition-colors"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{expanded ? 'ซ่อน' : 'รายละเอียด'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Overall progress bar */}
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
        </div>
      </div>

      {/* ── Inline update form — branch users (visible by default) ── */}
      {!isAdmin && canUpdate && (
        <div className={cn(
          'px-5 py-3 border-t border-black/8',
          done ? 'bg-emerald-500/5' : 'bg-black/2'
        )}>
          {done ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle size={14} />
              <span>แล้วเสร็จ</span>
              {r.progress_updated_at && (
                <span className="text-[10px] text-emerald-400/50 ml-1">
                  · อัปเดต {formatThaiDate(r.progress_updated_at, true)}
                  {r.progress_updated_by && ` โดย ${r.progress_updated_by}`}
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider">
                อัปเดตความก้าวหน้า
              </p>

              {/* Progress step buttons */}
              <div className="flex gap-1.5">
                {PROGRESS_STEPS.map(step => (
                  <button
                    key={step}
                    onClick={() => { setPct(step); setSaveOk(false) }}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-semibold border transition-all',
                      pct === step
                        ? step === 100
                          ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/50'
                          : 'bg-cyan-500/25 text-cyan-400 border-cyan-500/50'
                        : 'bg-black/5 text-black/35 border-black/10 hover:border-black/25 hover:text-black/60'
                    )}
                  >
                    {step}%
                  </button>
                ))}
              </div>

              {/* Note + save */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={e => { setNote(e.target.value); setSaveOk(false) }}
                  onKeyDown={e => e.key === 'Enter' && !isPending && handleSave()}
                  placeholder="หมายเหตุ (optional)..."
                  className="flex-1 bg-[#FFFFFF] border border-black/15 rounded-lg px-3 py-2 text-xs text-[#12181F] placeholder:text-black/20 focus:outline-none focus:border-cyan-500/40"
                />
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className={cn(
                    'px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                    isPending
                      ? 'bg-black/8 text-black/25 cursor-not-allowed'
                      : saveOk
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
                  )}
                >
                  {isPending ? '...' : saveOk ? '✓ บันทึกแล้ว' : 'บันทึก'}
                </button>
              </div>

              {saveError && (
                <p className="flex items-center gap-1 text-[11px] text-red-400">
                  <AlertCircle size={11} /> {saveError}
                </p>
              )}

              {/* Last update info */}
              {r.progress_updated_at && (
                <p className="text-[10px] text-black/20">
                  อัปเดตล่าสุด: {formatThaiDate(r.progress_updated_at, true)}
                  {r.progress_updated_by && ` · ${r.progress_updated_by}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Admin expanded detail ── */}
      {isAdmin && expanded && (
        <div className="border-t border-black/8 bg-black/1 px-5 py-4 space-y-5">

          {r.detail && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider">รายละเอียด</p>
              <p className="text-sm text-black/65 leading-relaxed whitespace-pre-line pl-1">{r.detail}</p>
            </div>
          )}

          {/* Per-branch list (expanded traffic) */}
          {branch_statuses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30 uppercase tracking-wider">
                <Target size={10} />
                ความก้าวหน้าต่อสาขา
              </div>
              <DirectiveTrafficMatrix
                branchStatuses={branch_statuses}
                dueDate={r.due_date}
                expanded={true}
              />
            </div>
          )}

          {/* Admin update form */}
          <div className="border-t border-black/8 pt-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30 uppercase tracking-wider">
              <TrendingUp size={10} />
              อัปเดตความก้าวหน้า (Admin)
            </div>

            <div className="flex gap-1.5">
              {PROGRESS_STEPS.map(step => (
                <button
                  key={step}
                  onClick={() => { setPct(step); setSaveOk(false) }}
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

            <div className="flex gap-2">
              <textarea
                rows={2}
                value={note}
                onChange={e => { setNote(e.target.value); setSaveOk(false) }}
                placeholder="รายละเอียดความก้าวหน้า..."
                className="flex-1 bg-[#FFFFFF] border border-black/15 rounded-lg px-3 py-2 text-xs text-[#12181F] placeholder:text-black/20 focus:outline-none focus:border-cyan-500/40 resize-none"
              />
              <button
                onClick={handleSave}
                disabled={isPending}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-semibold self-end transition-all shrink-0',
                  isPending
                    ? 'bg-black/8 text-black/25 cursor-not-allowed'
                    : saveOk
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
                )}
              >
                {isPending ? '...' : saveOk ? <CheckCircle2 size={14} /> : 'บันทึก'}
              </button>
            </div>

            {saveError && (
              <p className="flex items-center gap-1 text-[11px] text-red-400">
                <AlertCircle size={11} /> {saveError}
              </p>
            )}
          </div>

          {/* Progress timeline */}
          {logs.length > 0 && (
            <div className="border-t border-black/8 pt-4 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/30 uppercase tracking-wider">
                <Activity size={10} />
                ประวัติการอัพเดต
              </div>
              <DirectiveProgressTimeline logs={logs} />
            </div>
          )}

          {/* Admin / tracking notes */}
          {(r.admin_notes || r.tracking_notes) && (
            <div className="border-t border-black/8 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {r.admin_notes && (
                <div>
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-1">หมายเหตุผู้บริหาร</p>
                  <p className="text-xs text-black/55 leading-relaxed">{r.admin_notes}</p>
                </div>
              )}
              {r.tracking_notes && (
                <div>
                  <p className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-1">การติดตาม</p>
                  <p className="text-xs text-black/55 leading-relaxed">{r.tracking_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
