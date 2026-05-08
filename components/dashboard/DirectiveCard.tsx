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
  TrendingUp, Activity, Target,
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
  const { resolution: r, branch_statuses, latest_log } = summary

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

  // Determine if current branch can update
  const myBranchStatus = branch_statuses.find(bs => bs.branch_costcenter === branchCostcenter)
  const canUpdate = isAdmin || !!myBranchStatus

  const borderColor = done
    ? 'border-l-emerald-500/50'
    : overdue
    ? 'border-l-red-500/60'
    : r.priority === 'สูง'
    ? 'border-l-red-400/60'
    : r.priority === 'กลาง'
    ? 'border-l-amber-400/60'
    : 'border-l-cyan-500/40'

  // Overall completion stats
  const totalBranches = branch_statuses.length
  const doneBranches = branch_statuses.filter(bs => bs.action_status === 'แล้วเสร็จ').length
  const delayedBranches = branch_statuses.filter(bs => bs.traffic_light === 'red').length

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
        setShowUpdate(false)
      }
    })
  }

  return (
    <div className={cn(
      'rounded-xl border border-white/10 border-l-4 overflow-hidden transition-opacity',
      borderColor,
      done ? 'opacity-70' : ''
    )}>
      {/* ── Header (always visible) ── */}
      <div className="px-5 pt-4 pb-3 bg-white/2">
        <div className="flex items-start gap-3">
          <span className="num text-xs font-bold text-cyan-400 w-7 shrink-0 text-right pt-0.5">
            #{r.sequence_no}
          </span>

          <div className="flex-1 min-w-0 space-y-2">
            {/* Badges row */}
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
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/12">
                  {r.source}
                </span>
              )}
              {totalBranches > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-white/35 border-white/10">
                  <span className="num">{doneBranches}/{totalBranches}</span> สาขา
                </span>
              )}
              {delayedBranches > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                  ล่าช้า <span className="num">{delayedBranches}</span> สาขา
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-white leading-snug">{r.title}</p>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {r.responsible_dept && (
                <span className="px-2 py-0.5 rounded bg-white/6 border border-white/10 text-white/45">
                  {r.responsible_dept}
                </span>
              )}
              {r.due_date && (
                <span className={cn(
                  'flex items-center gap-1',
                  overdue ? 'text-red-400' : days !== null && days <= 7 ? 'text-amber-400' : 'text-white/40'
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

            {/* Traffic light matrix */}
            <DirectiveTrafficMatrix branchStatuses={branch_statuses} dueDate={r.due_date} />
          </div>

          {/* Status + expand */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <StatusPill status={r.status} />
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-cyan-400 transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              <span>{expanded ? 'ซ่อน' : 'รายละเอียด'}</span>
            </button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="ml-10 mt-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
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
              done ? 'text-emerald-400' : 'text-white/40'
            )}>
              {r.progress_pct}%
            </span>
          </div>
          {r.progress_note && !expanded && (
            <p className="text-[10px] text-white/25 mt-0.5 truncate">{r.progress_note}</p>
          )}
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-white/8 bg-white/1 px-5 py-4 space-y-5">

          {/* Detail text */}
          {r.detail && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">รายละเอียด</p>
              <p className="text-sm text-white/65 leading-relaxed whitespace-pre-line pl-1">{r.detail}</p>
            </div>
          )}

          {/* Per-branch status rows */}
          {branch_statuses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                <Target size={10} />
                ความก้าวหน้าต่อสาขา
              </div>
              {branch_statuses.map(bs => (
                <div
                  key={bs.action_item_id ?? bs.branch_costcenter}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/3 border border-white/6"
                >
                  {/* Traffic dot */}
                  <div className={cn('w-2 h-2 rounded-full shrink-0', {
                    'bg-emerald-400': bs.traffic_light === 'green',
                    'bg-amber-400': bs.traffic_light === 'yellow',
                    'bg-red-400': bs.traffic_light === 'red',
                    'bg-white/20': bs.traffic_light === 'grey',
                  })} />
                  <span className="text-xs text-white/70 w-28 shrink-0 truncate">{bs.branch_name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', {
                        'bg-emerald-500': bs.progress_pct === 100,
                        'bg-cyan-500/70': bs.progress_pct < 100,
                      })}
                      style={{ width: `${bs.progress_pct}%` }}
                    />
                  </div>
                  <span className="num text-[10px] text-white/45 w-8 text-right shrink-0">{bs.progress_pct}%</span>
                  {bs.days_overdue !== null && bs.days_overdue > 0 && (
                    <span className="text-[9px] text-red-400 shrink-0">เกิน {bs.days_overdue}ว</span>
                  )}
                  {bs.last_updated_at && (
                    <span className="text-[9px] text-white/25 shrink-0 hidden sm:block">
                      {formatThaiDate(bs.last_updated_at, true)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress update form */}
          <div className="border-t border-white/8 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={10} />
                ความก้าวหน้ารวม — {r.progress_pct}%
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

            {showUpdate && (
              <div className="space-y-3 pt-2">
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
                          : 'bg-white/5 text-white/35 border-white/10 hover:border-white/25 hover:text-white/60'
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
                  className="w-full bg-[#0c1a30] border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/40 resize-none"
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
                        ? 'bg-white/8 text-white/25 cursor-not-allowed'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
                    )}
                  >
                    {isPending ? 'กำลังบันทึก...' : 'บันทึกความก้าวหน้า'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Progress timeline */}
          {latest_log && (
            <div className="border-t border-white/8 pt-4 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                <Activity size={10} />
                ประวัติการอัพเดต
              </div>
              <DirectiveProgressTimeline logs={[latest_log]} />
            </div>
          )}

          {/* Admin / tracking notes */}
          {(r.admin_notes || r.tracking_notes) && (
            <div className="border-t border-white/8 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {r.admin_notes && (
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">หมายเหตุผู้บริหาร</p>
                  <p className="text-xs text-white/55 leading-relaxed">{r.admin_notes}</p>
                </div>
              )}
              {r.tracking_notes && (
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">การติดตาม</p>
                  <p className="text-xs text-white/55 leading-relaxed">{r.tracking_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
