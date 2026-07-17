'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// One bar per step test — mirrors svgStepChart() in public/pdca-tool.html:
// bar height = estimated loss, color signals whether the step still needs
// attention (gray = no leak found, green = found & fully repaired, red = found & pending).
export interface StepChartPoint {
  label: string
  loss: number
  found: number
  repaired: number
}

function fmt(n: number | null | undefined, dec = 2) {
  if (n == null) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function barColor(found: number, pending: number) {
  if (found === 0) return '#98A2AF'
  return pending > 0 ? '#B3392C' : '#1E7A5A'
}

function StepTooltip({ active, payload }: { active?: boolean; payload?: { payload: StepChartPoint }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const pending = Math.max(0, d.found - d.repaired)
  return (
    <div className="bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-[#12181F] mb-1.5">{d.label}</p>
      <p className="text-black/50">สูญเสียคาดการณ์: <span className="text-black/75 font-medium">{fmt(d.loss)} ลบ.ม./ชม.</span></p>
      <p className="text-black/50">
        จุดรั่วพบ: <span className="text-black/75 font-medium">{d.found}</span>
        {' · ซ่อมแล้ว: '}<span className="text-black/75 font-medium">{d.repaired}</span>
        {' · ค้างซ่อม: '}<span className={`font-medium ${pending > 0 ? 'text-[#B3392C]' : 'text-black/75'}`}>{pending}</span>
      </p>
    </div>
  )
}

export function StepTestChart({ steps }: { steps: StepChartPoint[] }) {
  if (!steps.length) return null

  // Recharts' label-renderer prop type is a loose grab-bag of geometry fields —
  // pull just what we need and reach `steps` via closure instead of threading
  // it through as an extra prop (which recharts' own type doesn't allow).
  function renderTopLabel(props: unknown) {
    const { x = 0, y = 0, width = 0, index = 0 } = props as { x?: number; y?: number; width?: number; index?: number }
    const d = steps[index]
    if (!d) return null
    const pending = Math.max(0, d.found - d.repaired)
    const color = barColor(d.found, pending)
    const cx = x + width / 2
    return (
      <g key={index}>
        {d.found > 0 && (
          <text x={cx} y={y - 16} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
            {`💧 ${d.found}`}
          </text>
        )}
        <text x={cx} y={y - 4} textAnchor="middle" fontSize={9.5} fill="#6B7686">
          {fmt(d.loss)}
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={steps} margin={{ top: 30, right: 8, left: -18, bottom: 4 }} barCategoryGap="34%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: 'rgba(0,0,0,.4)', fontSize: 10.5 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(0,0,0,.4)', fontSize: 10.5 }} axisLine={false} tickLine={false} width={34} />
        <Tooltip content={<StepTooltip />} cursor={{ fill: 'rgba(0,0,0,.03)' }} />
        <Bar dataKey="loss" radius={[4, 4, 0, 0]} maxBarSize={40} label={renderTopLabel}>
          {steps.map((s, i) => (
            <Cell key={i} fill={barColor(s.found, Math.max(0, s.found - s.repaired))} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
