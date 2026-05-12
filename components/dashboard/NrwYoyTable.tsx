'use client'

import type { NrwYoyRow } from '@/lib/types'
import { formatThaiNumber } from '@/lib/utils/date-th'

function fmt(v: number | null, decimals = 2): string {
  if (v === null) return '—'
  return formatThaiNumber(v, decimals)
}

function RankBadge({ rank, delta, total }: { rank: number; delta: number | null; total: number }) {
  const base = 'inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold num border'
  if (delta !== null && delta < -0.001 && rank <= 3) {
    const color = rank === 1
      ? 'text-emerald-200 bg-emerald-500/25 border-emerald-500/40 shadow-[0_0_6px_rgba(52,211,153,0.2)]'
      : rank === 2
      ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
      : 'text-green-300 bg-green-500/10 border-green-500/20'
    return <span className={`${base} ${color}`}>{rank}</span>
  }
  if (delta !== null && delta > 0.001 && rank > total - 3) {
    return <span className={`${base} text-red-300 bg-red-500/15 border-red-500/25`}>{rank}</span>
  }
  return <span className="text-white/25 num text-[11px] w-6 inline-block text-center">{rank}</span>
}

function DeltaCell({ delta, maxAbs }: { delta: number | null; maxAbs: number }) {
  if (delta === null) return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-white/20 text-xs">—</span>
    </div>
  )
  const isImproved = delta < -0.001
  const isWorsened = delta > 0.001
  const pct = maxAbs > 0 ? Math.min(Math.abs(delta) / maxAbs * 100, 100) : 0
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="w-10 h-0.5 rounded-full bg-white/8 relative overflow-hidden shrink-0">
        <div
          className={`absolute top-0 h-full rounded-full ${isImproved ? 'bg-emerald-400' : 'bg-red-400'}`}
          style={{
            width: `${pct}%`,
            left: isImproved ? `${100 - pct}%` : '0%',
          }}
        />
      </div>
      <span className={`num text-xs font-bold tracking-tight whitespace-nowrap ${
        isImproved ? 'text-emerald-400' : isWorsened ? 'text-red-400' : 'text-white/40'
      }`}>
        {isImproved ? '▼' : isWorsened ? '▲' : ''}
        {Math.abs(delta).toFixed(2)}%
      </span>
    </div>
  )
}

interface Props {
  rows: NrwYoyRow[]
  fiscalYear: number
  monthCount: number
}

export function NrwYoyTable({ rows, fiscalYear, monthCount }: Props) {
  const prevYear = fiscalYear - 1
  const mc = Math.max(monthCount, 1)

  // Monthly avg per branch helpers
  const avgLoss = (v: number | null) => (v !== null ? v / mc : null)

  // District averages
  const withCurr = rows.filter(r => r.curr_loss !== null)
  const withPrev = rows.filter(r => r.prev_loss !== null)
  const totCurrLoss = rows.reduce((s, r) => s + (r.curr_loss ?? 0), 0)
  const totPrevLoss = rows.reduce((s, r) => s + (r.prev_loss ?? 0), 0)
  const totCurrProd = rows.reduce((s, r) => s + (r.curr_produced ?? 0), 0)
  const totPrevProd = rows.reduce((s, r) => s + (r.prev_produced ?? 0), 0)

  // Average monthly per branch across district
  const distAvgCurrLoss = withCurr.length > 0 ? (totCurrLoss / mc) / withCurr.length : null
  const distAvgPrevLoss = withPrev.length > 0 ? (totPrevLoss / mc) / withPrev.length : null
  const distCurrRate = totCurrProd > 0 ? (totCurrLoss / totCurrProd) * 100 : null
  const distPrevRate = totPrevProd > 0 ? (totPrevLoss / totPrevProd) * 100 : null
  const distRateDelta = distCurrRate !== null && distPrevRate !== null ? distCurrRate - distPrevRate : null

  const maxAbs = Math.max(...rows.map(r => Math.abs(r.rate_delta ?? 0)), 0.01)

  const rowTint = (delta: number | null) => {
    if (delta === null) return ''
    if (delta < -1.5) return 'bg-emerald-500/10'
    if (delta < -0.001) return 'bg-emerald-500/5'
    if (delta > 1.5) return 'bg-red-500/10'
    if (delta > 0.001) return 'bg-red-500/5'
    return ''
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/8">
      <table className="w-full text-xs border-collapse min-w-[580px]">
        <thead>
          {/* Group headers */}
          <tr className="bg-white/3 border-b border-white/6">
            <th colSpan={2} className="px-2 py-1" />
            {/* น้ำสูญเสีย group */}
            <th colSpan={2} className="px-2 py-1 text-center border-l border-white/8">
              <span className="text-[9px] font-semibold text-white/40 tracking-wide">
                น้ำสูญเสีย (ลบ.ม./เดือน)
              </span>
            </th>
            {/* NRW% group */}
            <th colSpan={2} className="px-2 py-1 text-center border-l border-white/8">
              <span className="text-[9px] font-semibold text-white/40 tracking-wide">
                NRW%
              </span>
            </th>
            <th className="px-2 py-1 border-l border-white/8" />
          </tr>
          {/* Column headers */}
          <tr className="bg-white/5 border-b border-white/10">
            <th className="px-2 py-1.5 text-white/30 font-medium text-center w-7">#</th>
            <th className="px-2 py-1.5 text-left text-white/50 font-medium">สาขา</th>
            {/* น้ำสูญเสีย pair */}
            <th className="px-2 py-1.5 text-right text-blue-300/60 font-medium border-l border-white/8">
              <span className="text-[10px]">{prevYear}</span>
            </th>
            <th className="px-2 py-1.5 text-right text-orange-300/70 font-medium">
              <span className="text-[10px]">{fiscalYear}</span>
            </th>
            {/* NRW% pair */}
            <th className="px-2 py-1.5 text-right text-blue-300/60 font-medium border-l border-white/8">
              <span className="text-[10px]">{prevYear}</span>
            </th>
            <th className="px-2 py-1.5 text-right text-orange-300/70 font-medium">
              <span className="text-[10px]">{fiscalYear}</span>
            </th>
            {/* Delta */}
            <th className="px-2 py-1.5 text-right text-white/40 font-medium border-l border-white/8">
              เปลี่ยนแปลง
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.branch_name}
              className={`border-b border-white/5 hover:bg-white/3 transition-colors ${rowTint(row.rate_delta)}`}
            >
              <td className="px-2 py-1 text-center">
                <RankBadge rank={i + 1} delta={row.rate_delta} total={rows.length} />
              </td>
              <td className="px-2 py-1 text-white/80 font-medium whitespace-nowrap">{row.branch_name}</td>
              {/* น้ำสูญเสีย pair */}
              <td className="px-2 py-1 text-right num text-blue-200/55 border-l border-white/5">{fmt(avgLoss(row.prev_loss), 0)}</td>
              <td className="px-2 py-1 text-right num text-orange-200/65">{fmt(avgLoss(row.curr_loss), 0)}</td>
              {/* NRW% pair */}
              <td className="px-2 py-1 text-right num text-blue-200/55 border-l border-white/5">{fmt(row.prev_rate)}</td>
              <td className="px-2 py-1 text-right num text-orange-200/65">{fmt(row.curr_rate)}</td>
              <td className="px-2 py-1 text-right border-l border-white/5">
                <DeltaCell delta={row.rate_delta} maxAbs={maxAbs} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-white/12 bg-gradient-to-r from-white/5 to-transparent">
            <td className="px-2 py-2 text-white/20 text-center text-[9px]">x̄</td>
            <td className="px-2 py-2">
              <div className="text-white/50 font-semibold text-xs">ค่าเฉลี่ยเขต</div>
              <div className="text-white/25 text-[9px] mt-0.5">
                {withCurr.length}/{rows.length} สาขา · {mc} เดือน
              </div>
            </td>
            {/* น้ำสูญเสีย pair */}
            <td className="px-2 py-2 text-right num text-blue-200/60 font-semibold border-l border-white/8">{fmt(distAvgPrevLoss, 0)}</td>
            <td className="px-2 py-2 text-right num text-orange-200/70 font-semibold">{fmt(distAvgCurrLoss, 0)}</td>
            {/* NRW% pair */}
            <td className="px-2 py-2 text-right num text-blue-200/60 font-semibold border-l border-white/8">{fmt(distPrevRate)}</td>
            <td className="px-2 py-2 text-right num text-orange-200/70 font-semibold">{fmt(distCurrRate)}</td>
            <td className="px-2 py-2 text-right border-l border-white/8">
              <DeltaCell delta={distRateDelta} maxAbs={maxAbs} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
