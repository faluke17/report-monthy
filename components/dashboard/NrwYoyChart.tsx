'use client'

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from 'recharts'
import type { NrwYoyRow } from '@/lib/types'

interface Props {
  rows: NrwYoyRow[]
  fiscalYear: number
}

interface ChartEntry {
  name: string
  delta: number
  hasData: boolean
}

function LegendPill({ color, label, branches }: {
  color: 'emerald' | 'red'
  label: string
  branches: string[]
}) {
  const [open, setOpen] = useState(false)
  const isGreen = color === 'emerald'
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border cursor-default select-none transition-all ${
        isGreen
          ? 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/18 hover:border-emerald-500/40'
          : 'bg-red-500/10 border-red-500/25 hover:bg-red-500/18 hover:border-red-500/40'
      }`}>
        <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${isGreen ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className={`text-sm font-semibold ${isGreen ? 'text-emerald-300' : 'text-red-300'}`}>
          {label} {branches.length} สาขา
        </span>
      </div>

      {open && branches.length > 0 && (
        <div
          className={`absolute top-full mt-2 right-0 z-30 rounded-xl border p-3 shadow-2xl min-w-[220px] ${
            isGreen
              ? 'bg-[#04150f]/97 border-emerald-500/25'
              : 'bg-[#150408]/97 border-red-500/25'
          }`}
          style={{ backdropFilter: 'blur(16px)' }}
        >
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
            isGreen ? 'text-emerald-400/60' : 'text-red-400/60'
          }`}>{label}</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {branches.map((name, i) => (
              <div key={name} className="flex items-center gap-1.5 min-w-0">
                <span className={`shrink-0 text-[10px] font-mono ${isGreen ? 'text-emerald-400/40' : 'text-red-400/40'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-xs text-white/75 truncate">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CustomLabel({ x, y, width, height, value }: any) {
  const v = Number(value ?? 0)
  if (Math.abs(v) < 0.01) return null
  const isNeg = v < 0
  const bx = Number(x)
  const bw = Number(width)
  const by = Number(y)
  const bh = Number(height)
  // For negative bars: label goes left of bar start (x), anchor right
  // For positive bars: label goes right of bar end (x+width), anchor left
  const labelX = isNeg ? bx - 5 : bx + bw + 5
  const label = `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
  return (
    <g>
      {/* shadow/outline for contrast */}
      <text
        x={labelX}
        y={by + bh / 2}
        textAnchor={isNeg ? 'end' : 'start'}
        dominantBaseline="middle"
        fill="rgba(0,0,0,0.6)"
        fontSize={10}
        fontWeight={700}
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        stroke="rgba(0,0,0,0.6)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {label}
      </text>
      <text
        x={labelX}
        y={by + bh / 2}
        textAnchor={isNeg ? 'end' : 'start'}
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.92)"
        fontSize={10}
        fontWeight={700}
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
      >
        {label}
      </text>
    </g>
  )
}

function CustomTooltip({ active, payload, label, fiscalYear }: any) {
  if (!active || !payload?.length) return null
  const v = Number(payload[0]?.value ?? 0)
  const isImproved = v < 0
  return (
    <div style={{
      background: 'rgba(8,20,45,0.97)',
      border: `1px solid ${isImproved ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
      borderRadius: 10,
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
      boxShadow: `0 4px 24px ${isImproved ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)'}`,
    }}>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: 12, marginBottom: 6 }}>{label}</p>
      <p style={{ color: isImproved ? '#34d399' : '#f87171', fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>
        {v > 0 ? '▲ +' : '▼ '}{Math.abs(v).toFixed(2)}% NRW
      </p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 4 }}>
        {isImproved ? 'ลดลงจากปีก่อน (ดีขึ้น)' : 'เพิ่มขึ้นจากปีก่อน (แย่ลง)'}
      </p>
    </div>
  )
}

export function NrwYoyChart({ rows, fiscalYear }: Props) {
  const prevYear = fiscalYear - 1

  const data: ChartEntry[] = rows.map((r) => ({
    name: r.branch_name,
    delta: r.rate_delta !== null ? parseFloat(r.rate_delta.toFixed(2)) : 0,
    hasData: r.rate_delta !== null,
  }))

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.delta)), 0.5)
  const domain = [-maxAbs * 1.45, maxAbs * 1.45]
  const chartHeight = Math.max(320, rows.length * 16)

  const improvedBranches = data.filter((d) => d.hasData && d.delta < 0).map((d) => d.name)
  const worsenedBranches = data.filter((d) => d.hasData && d.delta > 0).map((d) => d.name)

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" style={{ boxShadow: '0 0 6px rgba(167,139,250,0.6)' }} />
              <h3 className="text-sm font-bold text-white">
                การเปลี่ยนแปลง NRW% รายสาขา
              </h3>
            </div>
            <p className="text-xs text-white/35 ml-3.5">
              ปีงบ {prevYear} → {fiscalYear} · เรียงจากดีขึ้นมากที่สุด
            </p>
          </div>
          {/* Legend pills */}
          <div className="flex flex-wrap items-center gap-2">
            <LegendPill color="emerald" label="ดีขึ้น" branches={improvedBranches} />
            <LegendPill color="red" label="แย่ลง" branches={worsenedBranches} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-1 sm:px-2 py-4 overflow-x-auto">
        <div style={{ minWidth: 300 }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 2, right: 68, left: 4, bottom: 2 }}
            barCategoryGap="18%"
          >
            <CartesianGrid
              strokeDasharray="1 6"
              stroke="rgba(255,255,255,0.04)"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={domain}
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
              tickCount={7}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={76}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip fiscalYear={fiscalYear} />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
            <ReferenceLine
              x={0}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="0"
            />
            <Bar dataKey="delta" maxBarSize={9} radius={2}>
              {data.map((entry, i) => {
                const intensity = maxAbs > 0 ? Math.min(Math.abs(entry.delta) / maxAbs, 1) : 0
                const opacity = 0.45 + intensity * 0.55
                return (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.delta < -0.001 ? '#34d399' : entry.delta > 0.001 ? '#f87171' : '#6b7280'}
                    fillOpacity={opacity}
                  />
                )
              })}
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
