'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, Droplets, CheckCircle, X, TrendingUp } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

type AlertStatus = 'red_spike' | 'red_accumulated' | 'yellow' | 'green'

type MockNode = {
  node_label: string
  mnf_flow: number
  ema_value: number
  diff_percent: number
  consecutive_count: number
  alert_status: AlertStatus
  record_date: string
}

type MockBranch = {
  id: number
  name: string
  nodes: MockNode[]
}

type DayPoint = {
  date: string
  mnf: number
  ema: number
  status: AlertStatus
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_BRANCHES: MockBranch[] = [
  {
    id: 38, name: 'แม่สอด',
    nodes: [
      { node_label: 'DMA-แม่สอด-01', mnf_flow: 12.4, ema_value: 4.8, diff_percent: 158, consecutive_count: 4, alert_status: 'red_accumulated', record_date: '2026-05-21' },
      { node_label: 'DMA-แม่สอด-02', mnf_flow: 21.0, ema_value: 6.2, diff_percent: 239, consecutive_count: 1, alert_status: 'red_spike',      record_date: '2026-05-21' },
      { node_label: 'DMA-แม่สอด-03', mnf_flow: 3.1,  ema_value: 2.8, diff_percent: 11,  consecutive_count: 0, alert_status: 'green',           record_date: '2026-05-21' },
    ],
  },
  {
    id: 37, name: 'ตาก',
    nodes: [
      { node_label: 'DMA-ตาก-01', mnf_flow: 8.9, ema_value: 4.2, diff_percent: 112, consecutive_count: 2, alert_status: 'yellow', record_date: '2026-05-21' },
      { node_label: 'DMA-ตาก-02', mnf_flow: 2.1, ema_value: 1.9, diff_percent: 10,  consecutive_count: 0, alert_status: 'green',  record_date: '2026-05-21' },
      { node_label: 'DMA-ตาก-03', mnf_flow: 5.6, ema_value: 3.0, diff_percent: 87,  consecutive_count: 1, alert_status: 'yellow', record_date: '2026-05-21' },
    ],
  },
  {
    id: 35, name: 'กำแพงเพชร',
    nodes: [
      { node_label: 'DMA-กพ-01', mnf_flow: 6.1, ema_value: 3.8, diff_percent: 61, consecutive_count: 1, alert_status: 'yellow', record_date: '2026-05-21' },
      { node_label: 'DMA-กพ-02', mnf_flow: 2.4, ema_value: 2.2, diff_percent: 9,  consecutive_count: 0, alert_status: 'green',  record_date: '2026-05-21' },
      { node_label: 'DMA-กพ-03', mnf_flow: 1.8, ema_value: 1.6, diff_percent: 12, consecutive_count: 0, alert_status: 'green',  record_date: '2026-05-21' },
      { node_label: 'DMA-กพ-04', mnf_flow: 3.2, ema_value: 2.9, diff_percent: 10, consecutive_count: 0, alert_status: 'green',  record_date: '2026-05-21' },
    ],
  },
  {
    id: 45, name: 'พิษณุโลก',
    nodes: [
      { node_label: 'DMA-พล-01', mnf_flow: 7.3, ema_value: 4.5, diff_percent: 62, consecutive_count: 1, alert_status: 'yellow', record_date: '2026-05-21' },
      { node_label: 'DMA-พล-02', mnf_flow: 3.0, ema_value: 2.8, diff_percent: 7,  consecutive_count: 0, alert_status: 'green',  record_date: '2026-05-21' },
    ],
  },
  { id: 29, name: 'นครสวรรค์',   nodes: Array.from({ length: 8 }, (_, i) => ({ node_label: `DMA-นว-0${i+1}`, mnf_flow: 2.1+i*0.3, ema_value: 2.0+i*0.3, diff_percent: 5+i*2, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 39, name: 'สุโขทัย',     nodes: Array.from({ length: 5 }, (_, i) => ({ node_label: `DMA-สท-0${i+1}`, mnf_flow: 1.8+i*0.2, ema_value: 1.7+i*0.2, diff_percent: 6,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 47, name: 'พิจิตร',      nodes: Array.from({ length: 6 }, (_, i) => ({ node_label: `DMA-พจ-0${i+1}`, mnf_flow: 2.5+i*0.1, ema_value: 2.4+i*0.1, diff_percent: 4,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 34, name: 'อุทัยธานี',   nodes: Array.from({ length: 4 }, (_, i) => ({ node_label: `DMA-อน-0${i+1}`, mnf_flow: 1.5+i*0.2, ema_value: 1.4+i*0.2, diff_percent: 7,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 33, name: 'ชัยนาท',     nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-ชน-0${i+1}`, mnf_flow: 1.9,       ema_value: 1.8,       diff_percent: 5,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 30, name: 'ท่าตะโก',    nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-ทต-0${i+1}`, mnf_flow: 1.2,       ema_value: 1.1,       diff_percent: 9,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 31, name: 'ลาดยาว',     nodes: Array.from({ length: 4 }, (_, i) => ({ node_label: `DMA-ลว-0${i+1}`, mnf_flow: 2.0,       ema_value: 1.9,       diff_percent: 5,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 32, name: 'พยุหะคีรี',  nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-พย-0${i+1}`, mnf_flow: 1.6,       ema_value: 1.5,       diff_percent: 7,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 50, name: 'เพชรบูรณ์',  nodes: Array.from({ length: 5 }, (_, i) => ({ node_label: `DMA-พบ-0${i+1}`, mnf_flow: 2.2,       ema_value: 2.1,       diff_percent: 5,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 44, name: 'อุตรดิตถ์',  nodes: Array.from({ length: 4 }, (_, i) => ({ node_label: `DMA-อต-0${i+1}`, mnf_flow: 1.9,       ema_value: 1.8,       diff_percent: 6,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 42, name: 'สวรรคโลก',   nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-สว-0${i+1}`, mnf_flow: 1.4,       ema_value: 1.3,       diff_percent: 8,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 36, name: 'ขาณุวรลักษบุรี', nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-ขน-0${i+1}`, mnf_flow: 1.5, ema_value: 1.4,       diff_percent: 7,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 40, name: 'ทุ่งเสลี่ยม', nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ทส-0${i+1}`, mnf_flow: 1.1,      ema_value: 1.0,       diff_percent: 10,    consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 41, name: 'ศรีสำโรง',   nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ศส-0${i+1}`, mnf_flow: 1.3,       ema_value: 1.2,       diff_percent: 8,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 43, name: 'ศรีสัชนาลัย', nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ศน-0${i+1}`, mnf_flow: 1.0,      ema_value: 0.9,       diff_percent: 11,    consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 46, name: 'นครไทย',     nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-นท-0${i+1}`, mnf_flow: 1.7,       ema_value: 1.6,       diff_percent: 6,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 48, name: 'บางมูลนาก',  nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-บน-0${i+1}`, mnf_flow: 1.4,       ema_value: 1.3,       diff_percent: 8,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 49, name: 'ตะพานหิน',  nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ตห-0${i+1}`, mnf_flow: 1.2,       ema_value: 1.1,       diff_percent: 9,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 51, name: 'หล่มสัก',    nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-หส-0${i+1}`, mnf_flow: 1.6,       ema_value: 1.5,       diff_percent: 7,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 52, name: 'ชนแดน',      nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ชด-0${i+1}`, mnf_flow: 1.3,       ema_value: 1.2,       diff_percent: 8,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 53, name: 'หนองไผ่',    nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-หผ-0${i+1}`, mnf_flow: 1.1,       ema_value: 1.0,       diff_percent: 10,    consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 54, name: 'วิเชียรบุรี', nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-วบ-0${i+1}`, mnf_flow: 1.2,      ema_value: 1.1,       diff_percent: 9,     consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function pr(n: number): number {
  // deterministic pseudo-random (no Math.random — stable across renders)
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function genSeries(node: MockNode, seed: number): DayPoint[] {
  const base = node.ema_value
  const now = new Date('2026-05-21')
  let ema = base * 0.75
  return Array.from({ length: 30 }, (_, idx) => {
    const daysAgo = 29 - idx
    const d = new Date(now)
    d.setDate(d.getDate() - daysAgo)
    const date = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`

    let mnf: number
    let status: AlertStatus = 'green'
    const v = 0.85 + pr(seed + idx * 17) * 0.30

    if (node.alert_status === 'red_accumulated' && daysAgo < node.consecutive_count) {
      const prog = (node.consecutive_count - daysAgo) / node.consecutive_count
      mnf = base * (1 + (node.diff_percent / 100) * prog) * (0.92 + pr(seed + idx * 13) * 0.12)
      status = 'red_accumulated'
    } else if (node.alert_status === 'red_spike' && daysAgo === 0) {
      mnf = node.mnf_flow
      status = 'red_spike'
    } else if (node.alert_status === 'yellow' && daysAgo <= 1) {
      mnf = node.mnf_flow * (daysAgo === 0 ? 1 : 0.78)
      status = 'yellow'
    } else {
      mnf = base * v
    }

    mnf = +mnf.toFixed(2)
    ema  = +(mnf * 0.1333 + ema * 0.8667).toFixed(2)
    return { date, mnf, ema, status }
  })
}

function getWorst(nodes: MockNode[]): AlertStatus {
  const order: AlertStatus[] = ['red_spike', 'red_accumulated', 'yellow', 'green']
  for (const s of order) if (nodes.some(n => n.alert_status === s)) return s
  return 'green'
}

function countByStatus(nodes: MockNode[]) {
  return {
    red:    nodes.filter(n => n.alert_status === 'red_spike' || n.alert_status === 'red_accumulated').length,
    yellow: nodes.filter(n => n.alert_status === 'yellow').length,
    green:  nodes.filter(n => n.alert_status === 'green').length,
  }
}

const STATUS_LABEL: Record<AlertStatus, string> = {
  red_spike: '🔴 ท่อแตกฉุกเฉิน', red_accumulated: '🔴 รั่วสะสม',
  yellow: '🟡 เฝ้าระวัง', green: '🟢 ปกติ',
}

const STATUS_ORDER: Record<AlertStatus, number> = {
  red_spike: 0, red_accumulated: 1, yellow: 2, green: 3,
}

function barFill(status: AlertStatus): string {
  if (status === 'red_spike' || status === 'red_accumulated') return '#B3392C'
  if (status === 'yellow') return '#A8721A'
  return '#0B6E76'
}

// ── Custom chart tooltip ───────────────────────────────────────────────────────

interface RCPayload { name: string; value: number }
interface TooltipProps { active?: boolean; payload?: RCPayload[]; label?: string }

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const mnf = payload.find(p => p.name === 'mnf')?.value
  const ema = payload.find(p => p.name === 'ema')?.value
  const diff = mnf != null && ema != null && ema > 0
    ? ((mnf - ema) / ema * 100).toFixed(1) : null
  const diffNum = diff != null ? parseFloat(diff) : 0
  return (
    <div className="bg-[#FFFFFF] border border-black/15 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-black/40 mb-1.5 font-medium">{label}</p>
      <p className="text-cyan-300 font-bold">MNF: {mnf?.toFixed(2)} m³/hr</p>
      <p className="text-black/50">EMA-14: {ema?.toFixed(2)} m³/hr</p>
      {diff != null && (
        <p className={`font-bold mt-0.5 ${diffNum >= 200 ? 'text-red-400' : diffNum >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
          Diff: {diffNum > 0 ? '+' : ''}{diff}%
        </p>
      )}
    </div>
  )
}

// ── BranchCard ─────────────────────────────────────────────────────────────────

function BranchCard({ branch, selected, onClick }: {
  branch: MockBranch; selected: boolean; onClick: () => void
}) {
  const worst = getWorst(branch.nodes)
  const c     = countByStatus(branch.nodes)
  const isRed = worst === 'red_spike' || worst === 'red_accumulated'
  const isYel = worst === 'yellow'

  return (
    <button
      onClick={onClick}
      className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer ${
        selected
          ? isRed ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/40'
          : isYel ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40'
          :         'bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/30'
          : isRed ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/15'
          : isYel ? 'bg-amber-500/8 border-amber-500/30 hover:bg-amber-500/12'
          :         'bg-black/3 border-black/8 hover:bg-black/6'
      }`}
    >
      {isRed && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />}
      <p className={`text-xs font-semibold truncate mb-1.5 ${isRed ? 'text-red-300' : isYel ? 'text-amber-300' : 'text-black/70'}`}>
        {branch.name}
      </p>
      <div className="flex items-center gap-1.5">
        {c.red > 0    && <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded num">🔴 {c.red}</span>}
        {c.yellow > 0 && <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded num">🟡 {c.yellow}</span>}
        {c.green > 0  && <span className="text-[10px] text-black/30 num">{c.green} node</span>}
      </div>
    </button>
  )
}

// ── NodeChart ──────────────────────────────────────────────────────────────────

function NodeChart({ node, seed }: { node: MockNode; seed: number }) {
  const data = useMemo(() => genSeries(node, seed), [node.node_label, seed]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'rgba(0,0,0,0.25)', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: 'rgba(0,0,0,0.25)', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="mnf" name="mnf" maxBarSize={14} radius={[2, 2, 0, 0]}>
          {data.map((pt, i) => (
            <Cell key={i} fill={barFill(pt.status)} fillOpacity={pt.status === 'green' ? 0.55 : 0.85} />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="ema"
          name="ema"
          stroke="#1E7A5A"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="5 3"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── NodeTable ──────────────────────────────────────────────────────────────────

function NodeTable({ branch, highlightLabel }: { branch: MockBranch; highlightLabel: string }) {
  const sorted = [...branch.nodes].sort((a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status])
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-black/25 border-b border-black/6">
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
              <tr
                key={n.node_label}
                className={`border-b border-black/5 transition-colors ${
                  isHL ? 'bg-black/6' : isRed ? 'bg-red-500/5 hover:bg-red-500/8' : 'hover:bg-black/4'
                }`}
              >
                <td className={`px-4 py-2.5 font-medium ${isHL ? 'text-[#12181F]' : 'text-black/60'}`}>
                  {n.node_label}
                  {isHL && <span className="ml-1.5 text-[9px] text-black/30 font-normal">(กำลังดูกราฟ)</span>}
                </td>
                <td className="px-4 py-2.5 text-right text-black/70 num">{n.mnf_flow.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right text-black/40 num">{n.ema_value.toFixed(2)}</td>
                <td className={`px-4 py-2.5 text-right font-bold num ${isRed ? 'text-red-400' : isYel ? 'text-amber-400' : 'text-black/35'}`}>
                  +{n.diff_percent.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right text-black/40 num">
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

// ── BranchDetail ───────────────────────────────────────────────────────────────

function BranchDetail({ branch, onClose }: { branch: MockBranch; onClose: () => void }) {
  // auto-select worst node
  const defaultLabel = [...branch.nodes].sort((a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status])[0].node_label
  const [activeLabel, setActiveLabel] = useState(defaultLabel)

  const node = branch.nodes.find(n => n.node_label === activeLabel) ?? branch.nodes[0]
  const isRed = node.alert_status === 'red_spike' || node.alert_status === 'red_accumulated'
  const isYel = node.alert_status === 'yellow'

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/8">
        <div>
          <p className="text-sm font-bold text-[#12181F]">สาขา{branch.name}</p>
          <p className="text-[11px] text-black/35 mt-0.5">{branch.nodes.length} nodes · คำนวณล่าสุด 21 พ.ค. 69</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-black/30 hover:text-black/60 hover:bg-black/6 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Chart section */}
      <div className="p-4 border-b border-black/8">
        {/* Node selector tabs */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <TrendingUp size={11} className="text-black/25 shrink-0" />
          <span className="text-[10px] text-black/25 mr-1">เลือก node:</span>
          {branch.nodes.map(n => {
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
                    : 'bg-black/5 border-black/8 text-black/40 hover:bg-black/8 hover:text-black/60'
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
            <p className="text-xs font-semibold text-black/70">{node.node_label}</p>
            <p className={`text-[11px] mt-0.5 ${isRed ? 'text-red-400' : isYel ? 'text-amber-400' : 'text-emerald-400'}`}>
              {STATUS_LABEL[node.alert_status]}
              {node.consecutive_count > 0 && ` · ต่อเนื่อง ${node.consecutive_count} วัน`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-black/30">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2.5 rounded-sm inline-block bg-cyan-400/60" />
              MNF flow
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="16" height="8" viewBox="0 0 16 8">
                <line x1="0" y1="4" x2="16" y2="4" stroke="#1E7A5A" strokeWidth="1.5" strokeDasharray="4 2" />
              </svg>
              EMA-14
            </span>
          </div>
        </div>

        {/* Recharts */}
        <NodeChart node={node} seed={branch.id * 97 + node.node_label.length * 13} />

        {/* Diff summary below chart */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/6 text-xs">
          <div>
            <p className="text-black/30">MNF วันล่าสุด</p>
            <p className="font-bold text-[#12181F] num">{node.mnf_flow.toFixed(2)} m³/hr</p>
          </div>
          <div>
            <p className="text-black/30">EMA-14</p>
            <p className="font-bold text-black/60 num">{node.ema_value.toFixed(2)} m³/hr</p>
          </div>
          <div>
            <p className="text-black/30">เบี่ยงเบน</p>
            <p className={`font-bold num ${isRed ? 'text-red-400' : isYel ? 'text-amber-400' : 'text-emerald-400'}`}>
              +{node.diff_percent.toFixed(1)}%
            </p>
          </div>
          <div className="ml-auto">
            <p className="text-black/30">เกณฑ์แจ้งเตือน</p>
            <p className="text-black/40 num text-[11px]">≥50% = เหลือง / ≥200% = แดง</p>
          </div>
        </div>
      </div>

      {/* Node table */}
      <div>
        <p className="px-4 pt-3 pb-1 text-[10px] text-black/25 font-bold uppercase tracking-widest">ทุก node ในสาขานี้</p>
        <NodeTable branch={branch} highlightLabel={activeLabel} />
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export function MnfSimulation() {
  const [selected, setSelected] = useState<number | null>(38) // แม่สอด default

  const totalNodes  = MOCK_BRANCHES.reduce((s, b) => s + b.nodes.length, 0)
  const redBranches = MOCK_BRANCHES.filter(b => ['red_spike','red_accumulated'].includes(getWorst(b.nodes)))
  const yelBranches = MOCK_BRANCHES.filter(b => getWorst(b.nodes) === 'yellow')
  const okBranches  = MOCK_BRANCHES.filter(b => getWorst(b.nodes) === 'green')

  const sorted = [
    ...MOCK_BRANCHES.filter(b => ['red_spike','red_accumulated'].includes(getWorst(b.nodes))),
    ...MOCK_BRANCHES.filter(b => getWorst(b.nodes) === 'yellow'),
    ...MOCK_BRANCHES.filter(b => getWorst(b.nodes) === 'green'),
  ]

  const selectedBranch = MOCK_BRANCHES.find(b => b.id === selected) ?? null

  return (
    <div className="space-y-5">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={13} className="text-red-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">ต้องดำเนินการ</p>
          </div>
          <p className="text-3xl font-bold text-red-400 num leading-none">{redBranches.length}</p>
          <p className="text-xs text-black/35 mt-1">สาขา มี node Alert</p>
        </div>
        <div className="glass-card p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <Droplets size={13} className="text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">เฝ้าระวัง</p>
          </div>
          <p className="text-3xl font-bold text-amber-400 num leading-none">{yelBranches.length}</p>
          <p className="text-xs text-black/35 mt-1">สาขา MNF สูงกว่า EMA</p>
        </div>
        <div className="glass-card p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={13} className="text-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">ปกติ</p>
          </div>
          <p className="text-3xl font-bold text-emerald-400 num leading-none">{okBranches.length}</p>
          <p className="text-xs text-black/35 mt-1">สาขา ทุก node ปกติ</p>
        </div>
      </div>

      {/* ── Branch grid ── */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-black/40 uppercase tracking-widest">26 สาขา · {totalNodes} nodes</p>
          <p className="text-[11px] text-black/25">คลิกสาขาเพื่อดูกราฟ + รายละเอียด</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {sorted.map(b => (
            <BranchCard
              key={b.id}
              branch={b}
              selected={selected === b.id}
              onClick={() => setSelected(selected === b.id ? null : b.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Branch detail + chart ── */}
      {selectedBranch && (
        <BranchDetail
          key={selectedBranch.id}
          branch={selectedBranch}
          onClose={() => setSelected(null)}
        />
      )}

      <p className="text-[11px] text-black/20 text-center">* ข้อมูลจำลอง ไม่ใช่ข้อมูลจริง</p>
    </div>
  )
}
