'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Droplets, CheckCircle, X, TrendingUp, Loader2 } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { MnfAlertStatus, MnfEmaLatest } from '@/lib/types'
import type { BranchGroup } from '@/components/dashboard/MnfBranchAccordion'
import { getMnfSeriesForBranch, type MnfSeriesPoint } from '@/app/actions/mnf-monitor'

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<MnfAlertStatus, number> = {
  red_spike: 0, red_accumulated: 1, yellow: 2, green: 3,
}

const STATUS_LABEL: Record<MnfAlertStatus, string> = {
  red_spike: '🔴 ท่อแตกฉุกเฉิน', red_accumulated: '🔴 รั่วสะสม',
  yellow: '🟡 เฝ้าระวัง',          green: '🟢 ปกติ',
}

function nodeCounts(nodes: MnfEmaLatest[]) {
  return {
    red:    nodes.filter(n => n.alert_status === 'red_spike' || n.alert_status === 'red_accumulated').length,
    yellow: nodes.filter(n => n.alert_status === 'yellow').length,
    green:  nodes.filter(n => n.alert_status === 'green').length,
  }
}

function barFill(s: MnfAlertStatus) {
  if (s === 'red_spike' || s === 'red_accumulated') return '#f87171'
  if (s === 'yellow') return '#fbbf24'
  return '#22d3ee'
}

function fmtDate(d: string) { return d.slice(5).replace('-', '/') }

// ── Chart tooltip ──────────────────────────────────────────────────────────────

interface RCP { name: string; value: number }
interface TProps { active?: boolean; payload?: RCP[]; label?: string }

function ChartTooltip({ active, payload, label }: TProps) {
  if (!active || !payload?.length) return null
  const mnf = payload.find(p => p.name === 'mnf')?.value
  const ema = payload.find(p => p.name === 'ema')?.value
  const diff = mnf != null && ema != null && ema > 0
    ? ((mnf - ema) / ema * 100).toFixed(1) : null
  const dn = diff ? parseFloat(diff) : 0
  return (
    <div className="bg-[#0f1623] border border-white/15 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white/40 mb-1.5 font-medium">{label}</p>
      <p className="text-cyan-300 font-bold">MNF: {mnf?.toFixed(2)} m³/hr</p>
      <p className="text-white/50">EMA-14: {ema?.toFixed(2)} m³/hr</p>
      {diff && (
        <p className={`font-bold mt-0.5 ${dn >= 200 ? 'text-red-400' : dn >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
          Diff: {dn > 0 ? '+' : ''}{diff}%
        </p>
      )}
    </div>
  )
}

// ── NodeChart ──────────────────────────────────────────────────────────────────

type ChartPt = { date: string; mnf: number; ema: number; status: MnfAlertStatus }

function NodeChart({ data, isLoading }: { data: ChartPt[]; isLoading: boolean }) {
  if (isLoading) return (
    <div className="h-52 flex items-center justify-center">
      <Loader2 size={18} className="animate-spin text-white/30" />
    </div>
  )
  if (!data.length) return (
    <div className="h-52 flex items-center justify-center text-xs text-white/25">ยังไม่มีข้อมูลกราฟ (รัน mnf-sync ก่อน)</div>
  )
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} axisLine={false} interval={4} />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} axisLine={false} width={36} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="mnf" name="mnf" maxBarSize={14} radius={[2, 2, 0, 0]}>
          {data.map((pt, i) => <Cell key={i} fill={barFill(pt.status)} fillOpacity={pt.status === 'green' ? 0.55 : 0.85} />)}
        </Bar>
        <Line type="monotone" dataKey="ema" name="ema" stroke="#34d399" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── NodeTable ──────────────────────────────────────────────────────────────────

function NodeTable({ nodes, highlightLabel }: { nodes: MnfEmaLatest[]; highlightLabel: string }) {
  const sorted = [...nodes].sort((a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status])
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/25 border-b border-white/6">
            <th className="text-left px-4 py-2.5 font-medium">Node</th>
            <th className="text-right px-4 py-2.5 font-medium">MNF (m³/hr)</th>
            <th className="text-right px-4 py-2.5 font-medium">EMA-14</th>
            <th className="text-right px-4 py-2.5 font-medium">Diff%</th>
            <th className="text-right px-4 py-2.5 font-medium">ต่อเนื่อง</th>
            <th className="text-left px-4 py-2.5 font-medium">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(n => {
            const isRed = n.alert_status === 'red_spike' || n.alert_status === 'red_accumulated'
            const isYel = n.alert_status === 'yellow'
            const isHL  = n.node_label === highlightLabel
            return (
              <tr key={n.node_label} className={`border-b border-white/5 transition-colors ${isHL ? 'bg-white/6' : isRed ? 'bg-red-500/5 hover:bg-red-500/8' : 'hover:bg-white/4'}`}>
                <td className={`px-4 py-2.5 font-medium ${isHL ? 'text-white' : 'text-white/60'}`}>
                  {n.node_label}
                  {isHL && <span className="ml-1.5 text-[9px] text-white/30 font-normal">(กำลังดูกราฟ)</span>}
                </td>
                <td className="px-4 py-2.5 text-right text-white/70 num">{n.mnf_flow != null ? n.mnf_flow.toFixed(2) : '—'}</td>
                <td className="px-4 py-2.5 text-right text-white/40 num">{n.ema_value.toFixed(2)}</td>
                <td className={`px-4 py-2.5 text-right font-bold num ${isRed ? 'text-red-400' : isYel ? 'text-amber-400' : 'text-white/35'}`}>
                  {n.diff_percent > 0 ? '+' : ''}{n.diff_percent.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right text-white/40 num">
                  {n.consecutive_count > 0 ? `${n.consecutive_count} วัน` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                    isRed ? 'bg-red-500/15 text-red-300 border-red-500/30 animate-pulse'
                    : isYel ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                    : 'bg-green-500/10 text-green-400/60 border-green-500/15'
                  }`}>
                    {STATUS_LABEL[n.alert_status]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── NodeTabs + ChartSection (shared) ───────────────────────────────────────────

function ChartSection({
  nodes, activeLabel, setActiveLabel, seriesRaw, isLoading, lastComputed,
}: {
  nodes: MnfEmaLatest[]
  activeLabel: string
  setActiveLabel: (l: string) => void
  seriesRaw: MnfSeriesPoint[]
  isLoading: boolean
  lastComputed: string | null
}) {
  const node = nodes.find(n => n.node_label === activeLabel) ?? nodes[0]
  const isRed = node?.alert_status === 'red_spike' || node?.alert_status === 'red_accumulated'
  const isYel = node?.alert_status === 'yellow'

  const chartData: ChartPt[] = seriesRaw
    .filter(p => p.node_label === activeLabel)
    .map(p => ({ date: fmtDate(p.record_date), mnf: p.mnf_flow ?? 0, ema: p.ema_value, status: p.alert_status }))

  if (!node) return null
  return (
    <div className="p-4 border-b border-white/8">
      {/* Node tabs */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <TrendingUp size={11} className="text-white/25 shrink-0" />
        <span className="text-[10px] text-white/25 mr-1">เลือก node:</span>
        {[...nodes].sort((a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status]).map(n => {
          const nRed = n.alert_status === 'red_spike' || n.alert_status === 'red_accumulated'
          const nYel = n.alert_status === 'yellow'
          const active = activeLabel === n.node_label
          return (
            <button
              key={n.node_label}
              onClick={() => setActiveLabel(n.node_label)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                active
                  ? nRed ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : nYel ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  :        'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/60'
              }`}
            >
              {n.node_label}
              {(nRed || nYel) && (
                <span className={`ml-1 text-[9px] ${nRed ? 'text-red-400' : 'text-amber-400'}`}>
                  {nRed ? '●' : '○'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Chart header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-white/70">{node.node_label}</p>
          <p className={`text-[11px] mt-0.5 ${isRed ? 'text-red-400' : isYel ? 'text-amber-400' : 'text-emerald-400'}`}>
            {STATUS_LABEL[node.alert_status]}
            {node.consecutive_count > 0 && ` · ต่อเนื่อง ${node.consecutive_count} วัน`}
            {lastComputed && ` · ${lastComputed}`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/30">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm inline-block bg-cyan-400/60" />MNF flow</span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="8" viewBox="0 0 16 8">
              <line x1="0" y1="4" x2="16" y2="4" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 2" />
            </svg>
            EMA-14
          </span>
        </div>
      </div>

      <NodeChart data={chartData} isLoading={isLoading} />

      {/* Summary row */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/6 text-xs">
        <div><p className="text-white/30">MNF วันล่าสุด</p><p className="font-bold text-white num">{node.mnf_flow != null ? node.mnf_flow.toFixed(2) : '—'} m³/hr</p></div>
        <div><p className="text-white/30">EMA-14</p><p className="font-bold text-white/60 num">{node.ema_value.toFixed(2)} m³/hr</p></div>
        <div>
          <p className="text-white/30">เบี่ยงเบน</p>
          <p className={`font-bold num ${isRed ? 'text-red-400' : isYel ? 'text-amber-400' : 'text-emerald-400'}`}>
            {node.diff_percent > 0 ? '+' : ''}{node.diff_percent.toFixed(1)}%
          </p>
        </div>
        <div className="ml-auto"><p className="text-white/30">เกณฑ์</p><p className="text-white/35 text-[11px]">≥50% เฝ้าระวัง / ≥200% แดง</p></div>
      </div>
    </div>
  )
}

// ── Summary cards ──────────────────────────────────────────────────────────────

function SummaryCards({ red, yellow, green, unit }: { red: number; yellow: number; green: number; unit: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="glass-card p-4 border-l-4 border-red-500">
        <div className="flex items-center gap-2 mb-1"><AlertTriangle size={13} className="text-red-400" /><p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">ต้องดำเนินการ</p></div>
        <p className="text-3xl font-bold text-red-400 num leading-none">{red}</p>
        <p className="text-xs text-white/35 mt-1">{unit} มี Alert</p>
      </div>
      <div className="glass-card p-4 border-l-4 border-amber-500">
        <div className="flex items-center gap-2 mb-1"><Droplets size={13} className="text-amber-400" /><p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">เฝ้าระวัง</p></div>
        <p className="text-3xl font-bold text-amber-400 num leading-none">{yellow}</p>
        <p className="text-xs text-white/35 mt-1">{unit} MNF สูงกว่า EMA</p>
      </div>
      <div className="glass-card p-4 border-l-4 border-emerald-500">
        <div className="flex items-center gap-2 mb-1"><CheckCircle size={13} className="text-emerald-400" /><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">ปกติ</p></div>
        <p className="text-3xl font-bold text-emerald-400 num leading-none">{green}</p>
        <p className="text-xs text-white/35 mt-1">{unit} ทุก node ปกติ</p>
      </div>
    </div>
  )
}

// ── RegionView ─────────────────────────────────────────────────────────────────

function RegionView({ groups, lastComputed }: { groups: BranchGroup[]; lastComputed: string | null }) {
  const [selectedId, setSelectedId]   = useState<number | null>(null)
  const [activeLabel, setActiveLabel] = useState('')
  const [seriesRaw, setSeriesRaw]     = useState<MnfSeriesPoint[]>([])
  const [isPending, startTransition]  = useTransition()

  function handleSelect(branchId: number) {
    if (selectedId === branchId) { setSelectedId(null); return }
    setSelectedId(branchId)
    setSeriesRaw([])
    const g = groups.find(g => g.dmama_branch_id === branchId)
    const def = g ? [...g.nodes].sort((a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status])[0]?.node_label ?? '' : ''
    setActiveLabel(def)
    startTransition(async () => {
      const data = await getMnfSeriesForBranch(branchId)
      setSeriesRaw(data)
    })
  }

  const red    = groups.filter(g => g.counts.red_spike > 0 || g.counts.red_accumulated > 0).length
  const yellow = groups.filter(g => g.worstStatus === 'yellow').length
  const ok     = groups.filter(g => g.worstStatus === 'green').length
  const total  = groups.reduce((s, g) => s + g.nodes.length, 0)

  const sorted = [
    ...groups.filter(g => g.counts.red_spike > 0 || g.counts.red_accumulated > 0),
    ...groups.filter(g => g.worstStatus === 'yellow'),
    ...groups.filter(g => g.worstStatus === 'green'),
  ]

  const selGroup = groups.find(g => g.dmama_branch_id === selectedId) ?? null

  return (
    <div className="space-y-5">
      <SummaryCards red={red} yellow={yellow} green={ok} unit="สาขา" />

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{groups.length} สาขา · {total} nodes</p>
          <p className="text-[11px] text-white/25">คลิกสาขาเพื่อดูกราฟ + รายละเอียด</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {sorted.map(g => {
            const c     = g.counts
            const worst = g.worstStatus
            const isRed = worst === 'red_spike' || worst === 'red_accumulated'
            const isYel = worst === 'yellow'
            const sel   = selectedId === g.dmama_branch_id
            return (
              <button
                key={g.dmama_branch_id}
                onClick={() => handleSelect(g.dmama_branch_id)}
                className={`relative text-left p-3 rounded-xl border transition-all ${
                  sel
                    ? isRed ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/40'
                    : isYel ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40'
                    :         'bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/30'
                    : isRed ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/15'
                    : isYel ? 'bg-amber-500/8 border-amber-500/30 hover:bg-amber-500/12'
                    :         'bg-white/3 border-white/8 hover:bg-white/6'
                }`}
              >
                {isRed && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                <p className={`text-xs font-semibold truncate mb-1.5 ${isRed ? 'text-red-300' : isYel ? 'text-amber-300' : 'text-white/70'}`}>
                  {g.branch_name_th}
                </p>
                <div className="flex items-center gap-1.5">
                  {(c.red_spike + c.red_accumulated) > 0 && <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded num">🔴 {c.red_spike + c.red_accumulated}</span>}
                  {c.yellow > 0 && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded num">🟡 {c.yellow}</span>}
                  {c.green > 0  && <span className="text-[10px] text-white/30 num">{c.green} node</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selGroup && (
        <div key={selGroup.dmama_branch_id} className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div>
              <p className="text-sm font-bold text-white">สาขา{selGroup.branch_name_th}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{selGroup.nodes.length} nodes</p>
            </div>
            <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/6 transition-colors">
              <X size={14} />
            </button>
          </div>
          <ChartSection
            nodes={selGroup.nodes}
            activeLabel={activeLabel}
            setActiveLabel={setActiveLabel}
            seriesRaw={seriesRaw}
            isLoading={isPending}
            lastComputed={lastComputed}
          />
          <div>
            <p className="px-4 pt-3 pb-1 text-[10px] text-white/25 font-bold uppercase tracking-widest">ทุก node ในสาขานี้</p>
            <NodeTable nodes={selGroup.nodes} highlightLabel={activeLabel} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── BranchView ─────────────────────────────────────────────────────────────────

function BranchView({
  rows, lastComputed, initialSeries,
}: {
  rows: MnfEmaLatest[]
  lastComputed: string | null
  initialSeries: MnfSeriesPoint[]
}) {
  const defNode = [...rows].sort((a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status])[0]?.node_label ?? ''
  const [activeLabel, setActiveLabel] = useState(defNode)

  const c = nodeCounts(rows)

  return (
    <div className="space-y-5">
      <SummaryCards red={c.red} yellow={c.yellow} green={c.green} unit="node" />

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div>
            <p className="text-sm font-bold text-white">{rows[0]?.branch_name_th ?? ''} · {rows.length} nodes</p>
            <p className="text-[11px] text-white/35 mt-0.5">เลือก node เพื่อดูกราฟ 30 วัน</p>
          </div>
        </div>
        <ChartSection
          nodes={rows}
          activeLabel={activeLabel}
          setActiveLabel={setActiveLabel}
          seriesRaw={initialSeries}
          isLoading={false}
          lastComputed={lastComputed}
        />
        <div>
          <p className="px-4 pt-3 pb-1 text-[10px] text-white/25 font-bold uppercase tracking-widest">ทุก node</p>
          <NodeTable nodes={rows} highlightLabel={activeLabel} />
        </div>
      </div>
    </div>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────────

export type MnfMonitorGridProps = {
  groups: BranchGroup[]
  rows: MnfEmaLatest[]
  isRegion: boolean
  lastComputed: string | null
  initialSeries: MnfSeriesPoint[]
}

export function MnfMonitorGrid({ groups, rows, isRegion, lastComputed, initialSeries }: MnfMonitorGridProps) {
  if (isRegion) return <RegionView groups={groups} lastComputed={lastComputed} />
  return <BranchView rows={rows} lastComputed={lastComputed} initialSeries={initialSeries} />
}
