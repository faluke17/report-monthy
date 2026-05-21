'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MnfAlertStatus, MnfEmaLatest } from '@/lib/types'

const STATUS_ORDER: Record<MnfAlertStatus, number> = {
  red_spike: 0, red_accumulated: 1, yellow: 2, green: 3,
}
const STATUS_LABEL: Record<MnfAlertStatus, string> = {
  red_spike: 'ฉุกเฉิน', red_accumulated: 'สะสม', yellow: 'เฝ้าระวัง', green: 'ปกติ',
}

export type BranchGroup = {
  dmama_branch_id: number
  branch_name_th: string
  nodes: MnfEmaLatest[]
  worstStatus: MnfAlertStatus
  counts: Record<MnfAlertStatus, number>
}

function NodeRow({ row }: { row: MnfEmaLatest }) {
  const isRed = row.alert_status === 'red_spike' || row.alert_status === 'red_accumulated'
  const isYellow = row.alert_status === 'yellow'
  const diffSign = row.diff_percent > 0 ? '+' : ''
  return (
    <tr className={`border-b border-white/5 hover:bg-white/5 text-xs ${isRed ? 'bg-red-500/5' : ''}`}>
      <td className="px-4 py-2 text-white/60">{row.node_label}</td>
      <td className="px-4 py-2 text-white/40">{row.record_date}</td>
      <td className="px-4 py-2 text-right text-white/70">{row.mnf_flow != null ? row.mnf_flow.toFixed(2) : '—'}</td>
      <td className="px-4 py-2 text-right text-white/40">{row.ema_value.toFixed(2)}</td>
      <td className={`px-4 py-2 text-right font-medium ${isRed ? 'text-red-400' : isYellow ? 'text-amber-400' : 'text-white/40'}`}>
        {diffSign}{row.diff_percent.toFixed(1)}%
      </td>
      <td className="px-4 py-2 text-right text-white/40">
        {row.consecutive_count > 0 ? `${row.consecutive_count} วัน` : '—'}
      </td>
      <td className="px-4 py-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
          isRed ? 'bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse'
          : isYellow ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
          : 'bg-green-500/10 text-green-400/70 border border-green-500/15'
        }`}>
          {STATUS_LABEL[row.alert_status]}
        </span>
      </td>
    </tr>
  )
}

function StatusPill({ status, count }: { status: MnfAlertStatus; count: number }) {
  if (count === 0) return null
  const cls = status === 'red_spike' || status === 'red_accumulated'
    ? 'bg-red-500/20 text-red-400'
    : status === 'yellow'
    ? 'bg-amber-500/15 text-amber-400'
    : 'bg-green-500/10 text-green-500/70'
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold num ${cls}`}>
      {count}
    </span>
  )
}

function BranchCard({ group, defaultOpen }: { group: BranchGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const isAlert = group.worstStatus === 'red_spike' || group.worstStatus === 'red_accumulated'
  const isWarn  = group.worstStatus === 'yellow'

  return (
    <div className={`glass-card-sm overflow-hidden ${isAlert ? 'border-l-4 border-red-500' : isWarn ? 'border-l-4 border-amber-500' : 'border-l-4 border-white/10'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={14} className="text-white/30 shrink-0" /> : <ChevronRight size={14} className="text-white/30 shrink-0" />}
          <span className={`text-sm font-semibold ${isAlert ? 'text-red-300' : isWarn ? 'text-amber-300' : 'text-white/70'}`}>
            {group.branch_name_th}
          </span>
          <span className="text-[11px] text-white/25">{group.nodes.length} node</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(['red_spike', 'red_accumulated', 'yellow', 'green'] as MnfAlertStatus[]).map(s => (
            <StatusPill key={s} status={s} count={group.counts[s]} />
          ))}
        </div>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-white/8">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 bg-white/3">
                <th className="text-left px-4 py-2 font-medium">Node</th>
                <th className="text-left px-4 py-2 font-medium">วันที่</th>
                <th className="text-right px-4 py-2 font-medium">MNF</th>
                <th className="text-right px-4 py-2 font-medium">EMA-14</th>
                <th className="text-right px-4 py-2 font-medium">Diff%</th>
                <th className="text-right px-4 py-2 font-medium">ต่อเนื่อง</th>
                <th className="text-left px-4 py-2 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {[...group.nodes]
                .sort((a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status])
                .map(row => <NodeRow key={`${row.dmama_branch_id}-${row.logger_id}`} row={row} />)
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type Filter = 'all' | 'alert' | 'yellow' | 'green'

export function MnfBranchAccordion({ groups }: { groups: BranchGroup[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = groups.filter(g => {
    if (filter === 'alert')  return g.counts.red_spike > 0 || g.counts.red_accumulated > 0
    if (filter === 'yellow') return g.worstStatus === 'yellow'
    if (filter === 'green')  return g.worstStatus === 'green'
    return true
  })

  const alertCount  = groups.filter(g => g.counts.red_spike > 0 || g.counts.red_accumulated > 0).length
  const yellowCount = groups.filter(g => g.worstStatus === 'yellow').length

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all',    label: 'ทั้งหมด',    count: groups.length },
    { key: 'alert',  label: '🔴 Alert',   count: alertCount },
    { key: 'yellow', label: '🟡 เฝ้าระวัง', count: yellowCount },
    { key: 'green',  label: '🟢 ปกติ',    count: groups.length - alertCount - yellowCount },
  ]

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/5 text-white/40 hover:bg-white/8 border border-white/8'
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className="num opacity-60">{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Branch groups */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="glass-card p-8 text-center text-white/30 text-sm">ไม่มีสาขาในหมวดนี้</div>
        )}
        {filtered.map(g => (
          <BranchCard
            key={g.dmama_branch_id}
            group={g}
            defaultOpen={g.worstStatus === 'red_spike' || g.worstStatus === 'red_accumulated'}
          />
        ))}
      </div>
    </div>
  )
}
