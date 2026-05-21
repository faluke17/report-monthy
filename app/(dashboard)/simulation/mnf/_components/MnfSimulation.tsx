'use client'

import { useState } from 'react'
import { AlertTriangle, Droplets, CheckCircle, X } from 'lucide-react'

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

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK_BRANCHES: MockBranch[] = [
  {
    id: 38, name: 'แม่สอด',
    nodes: [
      { node_label: 'DMA-แม่สอด-01', mnf_flow: 12.4, ema_value: 4.8, diff_percent: 158, consecutive_count: 4, alert_status: 'red_accumulated', record_date: '2026-05-21' },
      { node_label: 'DMA-แม่สอด-02', mnf_flow: 21.0, ema_value: 6.2, diff_percent: 239, consecutive_count: 1, alert_status: 'red_spike', record_date: '2026-05-21' },
      { node_label: 'DMA-แม่สอด-03', mnf_flow: 3.1, ema_value: 2.8, diff_percent: 11, consecutive_count: 0, alert_status: 'green', record_date: '2026-05-21' },
    ],
  },
  {
    id: 37, name: 'ตาก',
    nodes: [
      { node_label: 'DMA-ตาก-01', mnf_flow: 8.9, ema_value: 4.2, diff_percent: 112, consecutive_count: 2, alert_status: 'yellow', record_date: '2026-05-21' },
      { node_label: 'DMA-ตาก-02', mnf_flow: 2.1, ema_value: 1.9, diff_percent: 10, consecutive_count: 0, alert_status: 'green', record_date: '2026-05-21' },
      { node_label: 'DMA-ตาก-03', mnf_flow: 5.6, ema_value: 3.0, diff_percent: 87, consecutive_count: 1, alert_status: 'yellow', record_date: '2026-05-21' },
    ],
  },
  {
    id: 35, name: 'กำแพงเพชร',
    nodes: [
      { node_label: 'DMA-กพ-01', mnf_flow: 6.1, ema_value: 3.8, diff_percent: 61, consecutive_count: 1, alert_status: 'yellow', record_date: '2026-05-21' },
      { node_label: 'DMA-กพ-02', mnf_flow: 2.4, ema_value: 2.2, diff_percent: 9, consecutive_count: 0, alert_status: 'green', record_date: '2026-05-21' },
      { node_label: 'DMA-กพ-03', mnf_flow: 1.8, ema_value: 1.6, diff_percent: 12, consecutive_count: 0, alert_status: 'green', record_date: '2026-05-21' },
      { node_label: 'DMA-กพ-04', mnf_flow: 3.2, ema_value: 2.9, diff_percent: 10, consecutive_count: 0, alert_status: 'green', record_date: '2026-05-21' },
    ],
  },
  {
    id: 45, name: 'พิษณุโลก',
    nodes: [
      { node_label: 'DMA-พล-01', mnf_flow: 7.3, ema_value: 4.5, diff_percent: 62, consecutive_count: 1, alert_status: 'yellow', record_date: '2026-05-21' },
      { node_label: 'DMA-พล-02', mnf_flow: 3.0, ema_value: 2.8, diff_percent: 7, consecutive_count: 0, alert_status: 'green', record_date: '2026-05-21' },
    ],
  },
  { id: 29, name: 'นครสวรรค์', nodes: Array.from({ length: 8 }, (_, i) => ({ node_label: `DMA-นว-0${i+1}`, mnf_flow: 2.1+i*0.3, ema_value: 2.0+i*0.3, diff_percent: 5+i*2, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 39, name: 'สุโขทัย',   nodes: Array.from({ length: 5 }, (_, i) => ({ node_label: `DMA-สท-0${i+1}`, mnf_flow: 1.8+i*0.2, ema_value: 1.7+i*0.2, diff_percent: 6, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 47, name: 'พิจิตร',    nodes: Array.from({ length: 6 }, (_, i) => ({ node_label: `DMA-พจ-0${i+1}`, mnf_flow: 2.5+i*0.1, ema_value: 2.4+i*0.1, diff_percent: 4, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 34, name: 'อุทัยธานี', nodes: Array.from({ length: 4 }, (_, i) => ({ node_label: `DMA-อน-0${i+1}`, mnf_flow: 1.5+i*0.2, ema_value: 1.4+i*0.2, diff_percent: 7, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 33, name: 'ชัยนาท',   nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-ชน-0${i+1}`, mnf_flow: 1.9, ema_value: 1.8, diff_percent: 5, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 30, name: 'ท่าตะโก',  nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-ทต-0${i+1}`, mnf_flow: 1.2, ema_value: 1.1, diff_percent: 9, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 31, name: 'ลาดยาว',   nodes: Array.from({ length: 4 }, (_, i) => ({ node_label: `DMA-ลว-0${i+1}`, mnf_flow: 2.0, ema_value: 1.9, diff_percent: 5, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 32, name: 'พยุหะคีรี',nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-พย-0${i+1}`, mnf_flow: 1.6, ema_value: 1.5, diff_percent: 7, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 50, name: 'เพชรบูรณ์', nodes: Array.from({ length: 5 }, (_, i) => ({ node_label: `DMA-พบ-0${i+1}`, mnf_flow: 2.2, ema_value: 2.1, diff_percent: 5, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 44, name: 'อุตรดิตถ์', nodes: Array.from({ length: 4 }, (_, i) => ({ node_label: `DMA-อต-0${i+1}`, mnf_flow: 1.9, ema_value: 1.8, diff_percent: 6, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 42, name: 'สวรรคโลก',  nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-สว-0${i+1}`, mnf_flow: 1.4, ema_value: 1.3, diff_percent: 8, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 36, name: 'ขาณุวรลักษบุรี', nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-ขน-0${i+1}`, mnf_flow: 1.5, ema_value: 1.4, diff_percent: 7, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 40, name: 'ทุ่งเสลี่ยม', nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ทส-0${i+1}`, mnf_flow: 1.1, ema_value: 1.0, diff_percent: 10, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 41, name: 'ศรีสำโรง',  nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ศส-0${i+1}`, mnf_flow: 1.3, ema_value: 1.2, diff_percent: 8, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 43, name: 'ศรีสัชนาลัย', nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ศน-0${i+1}`, mnf_flow: 1.0, ema_value: 0.9, diff_percent: 11, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 46, name: 'นครไทย',   nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-นท-0${i+1}`, mnf_flow: 1.7, ema_value: 1.6, diff_percent: 6, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 48, name: 'บางมูลนาก', nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-บน-0${i+1}`, mnf_flow: 1.4, ema_value: 1.3, diff_percent: 8, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 49, name: 'ตะพานหิน', nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ตห-0${i+1}`, mnf_flow: 1.2, ema_value: 1.1, diff_percent: 9, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 51, name: 'หล่มสัก',  nodes: Array.from({ length: 3 }, (_, i) => ({ node_label: `DMA-หส-0${i+1}`, mnf_flow: 1.6, ema_value: 1.5, diff_percent: 7, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 52, name: 'ชนแดน',    nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-ชด-0${i+1}`, mnf_flow: 1.3, ema_value: 1.2, diff_percent: 8, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 53, name: 'หนองไผ่',  nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-หผ-0${i+1}`, mnf_flow: 1.1, ema_value: 1.0, diff_percent: 10, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
  { id: 54, name: 'วิเชียรบุรี', nodes: Array.from({ length: 2 }, (_, i) => ({ node_label: `DMA-วบ-0${i+1}`, mnf_flow: 1.2, ema_value: 1.1, diff_percent: 9, consecutive_count: 0, alert_status: 'green' as AlertStatus, record_date: '2026-05-21' })) },
]

function getWorst(nodes: MockNode[]): AlertStatus {
  const order: AlertStatus[] = ['red_spike', 'red_accumulated', 'yellow', 'green']
  for (const s of order) if (nodes.some(n => n.alert_status === s)) return s
  return 'green'
}

function countByStatus(nodes: MockNode[]) {
  return {
    red: nodes.filter(n => n.alert_status === 'red_spike' || n.alert_status === 'red_accumulated').length,
    yellow: nodes.filter(n => n.alert_status === 'yellow').length,
    green: nodes.filter(n => n.alert_status === 'green').length,
  }
}

function BranchCard({ branch, selected, onClick }: {
  branch: MockBranch
  selected: boolean
  onClick: () => void
}) {
  const worst = getWorst(branch.nodes)
  const c = countByStatus(branch.nodes)
  const isRed    = worst === 'red_spike' || worst === 'red_accumulated'
  const isYellow = worst === 'yellow'

  return (
    <button
      onClick={onClick}
      className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer ${
        selected
          ? isRed    ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/40'
          : isYellow ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40'
          :            'bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/30'
          : isRed    ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/15'
          : isYellow ? 'bg-amber-500/8 border-amber-500/30 hover:bg-amber-500/12'
          :            'bg-white/3 border-white/8 hover:bg-white/6'
      }`}
    >
      {isRed && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
      )}
      <p className={`text-xs font-semibold truncate mb-1.5 ${isRed ? 'text-red-300' : isYellow ? 'text-amber-300' : 'text-white/70'}`}>
        {branch.name}
      </p>
      <div className="flex items-center gap-1.5">
        {c.red > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded num">
            🔴 {c.red}
          </span>
        )}
        {c.yellow > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded num">
            🟡 {c.yellow}
          </span>
        )}
        {c.green > 0 && (
          <span className="text-[10px] text-white/30 num">{c.green} node</span>
        )}
      </div>
    </button>
  )
}

function NodeTable({ branch }: { branch: MockBranch }) {
  const sorted = [...branch.nodes].sort((a, b) => {
    const o: Record<AlertStatus, number> = { red_spike: 0, red_accumulated: 1, yellow: 2, green: 3 }
    return o[a.alert_status] - o[b.alert_status]
  })
  const STATUS_LABEL: Record<AlertStatus, string> = {
    red_spike: '🔴 ท่อแตกฉุกเฉิน',
    red_accumulated: '🔴 รั่วสะสม',
    yellow: '🟡 เฝ้าระวัง',
    green: '🟢 ปกติ',
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-white/30 border-b border-white/8">
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
            return (
              <tr key={n.node_label} className={`border-b border-white/5 hover:bg-white/5 ${isRed ? 'bg-red-500/5' : ''}`}>
                <td className="px-4 py-2.5 text-white/70 font-medium">{n.node_label}</td>
                <td className="px-4 py-2.5 text-right text-white/70 num">{n.mnf_flow.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right text-white/40 num">{n.ema_value.toFixed(2)}</td>
                <td className={`px-4 py-2.5 text-right font-bold num ${isRed ? 'text-red-400' : n.alert_status === 'yellow' ? 'text-amber-400' : 'text-white/40'}`}>
                  +{n.diff_percent.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right text-white/40 num">
                  {n.consecutive_count > 0 ? `${n.consecutive_count} วัน` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                    isRed ? 'bg-red-500/15 text-red-300 border-red-500/30 animate-pulse'
                    : n.alert_status === 'yellow' ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
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

      {/* ── Top summary ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={13} className="text-red-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">ต้องดำเนินการ</p>
          </div>
          <p className="text-3xl font-bold text-red-400 num leading-none">{redBranches.length}</p>
          <p className="text-xs text-white/35 mt-1">สาขา มี node Alert</p>
        </div>
        <div className="glass-card p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <Droplets size={13} className="text-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">เฝ้าระวัง</p>
          </div>
          <p className="text-3xl font-bold text-amber-400 num leading-none">{yelBranches.length}</p>
          <p className="text-xs text-white/35 mt-1">สาขา MNF สูงกว่า EMA</p>
        </div>
        <div className="glass-card p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={13} className="text-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">ปกติ</p>
          </div>
          <p className="text-3xl font-bold text-emerald-400 num leading-none">{okBranches.length}</p>
          <p className="text-xs text-white/35 mt-1">สาขา ทุก node ปกติ</p>
        </div>
      </div>

      {/* ── Branch grid ── */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest">26 สาขา · {totalNodes} nodes</p>
          <p className="text-[11px] text-white/25">คลิกสาขาเพื่อดูรายละเอียด</p>
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

      {/* ── Node detail ── */}
      {selectedBranch && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div>
              <p className="text-sm font-bold text-white">สาขา{selectedBranch.name}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{selectedBranch.nodes.length} nodes · คำนวณล่าสุด 21 พ.ค. 69</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 text-white/30 hover:text-white/60 transition-colors">
              <X size={14} />
            </button>
          </div>
          <NodeTable branch={selectedBranch} />
        </div>
      )}

      <p className="text-[11px] text-white/20 text-center">* ข้อมูลจำลอง ไม่ใช่ข้อมูลจริง</p>
    </div>
  )
}
