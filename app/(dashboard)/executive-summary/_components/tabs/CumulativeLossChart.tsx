'use client'

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CumulativeLossPoint } from '@/app/actions/executive-summary'
import { C, MONO, fmt, Card, Sec } from './shared'

const MONTH_LABELS = ['ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.']

function LegendDot({ color, label, dashed }: { color: string; label: string | number; dashed?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color, fontFamily: MONO }}>
      <span style={{ width: 12, height: 0, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`, display: 'inline-block' }} />
      ปีงบ {label}
    </span>
  )
}

function ChartTooltip({ active, payload, label, fiscalYearCurr, fiscalYearPrev }: {
  active?: boolean
  payload?: { dataKey: string; value: number | null }[]
  label?: string
  fiscalYearCurr: number
  fiscalYearPrev: number
}) {
  if (!active || !payload?.length) return null
  const curr = payload.find((p) => p.dataKey === 'curr')
  const prev = payload.find((p) => p.dataKey === 'prev')
  return (
    <div style={{ background: '#070C18', border: `1px solid ${C.border}`, padding: '8px 10px', fontFamily: MONO }}>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{label}</div>
      {curr && (
        <div style={{ fontSize: 11, color: C.good, marginBottom: 2 }}>
          ปีงบ {fiscalYearCurr}: {curr.value != null ? `${fmt(Math.round(curr.value))} m³/ด.` : '—'}
        </div>
      )}
      {prev && (
        <div style={{ fontSize: 11, color: C.crit }}>
          ปีงบ {fiscalYearPrev}: {prev.value != null ? `${fmt(Math.round(prev.value))} m³/ด.` : '—'}
        </div>
      )}
    </div>
  )
}

export function CumulativeLossChart({ fiscalYearCurr, fiscalYearPrev, curr, prev }: {
  fiscalYearCurr: number
  fiscalYearPrev: number
  curr: CumulativeLossPoint[]
  prev: CumulativeLossPoint[]
}) {
  const allVals = [...curr, ...prev].map((p) => p.avg_loss).filter((v): v is number => v != null)

  if (allVals.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 50 }}>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>// ยังไม่มีข้อมูลเพียงพอสำหรับคำนวณน้ำสูญเสียสะสม</div>
      </Card>
    )
  }

  const currByIdx = new Map(curr.map((p) => [p.fiscal_month_index, p]))
  const prevByIdx = new Map(prev.map((p) => [p.fiscal_month_index, p]))
  const chartData = MONTH_LABELS.map((label, i) => {
    const idx = i + 1
    return {
      month: label,
      curr: currByIdx.get(idx)?.avg_loss ?? null,
      prev: prevByIdx.get(idx)?.avg_loss ?? null,
    }
  })

  const lastCurr = [...curr].reverse().find((p) => p.avg_loss != null) ?? null
  const lastPrev = [...prev].reverse().find((p) => p.avg_loss != null) ?? null

  return (
    <Card>
      <Sec
        label={`น้ำสูญเสียสะสมเฉลี่ย — ปีงบ ${fiscalYearCurr} vs ${fiscalYearPrev}`}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LegendDot color={C.good} label={fiscalYearCurr} />
            <LegendDot color={C.crit} label={fiscalYearPrev} dashed />
          </div>
        }
      />

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="lossCurrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.good} stopOpacity={0.32} />
              <stop offset="100%" stopColor={C.good} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(34,211,238,0.08)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }}
            axisLine={{ stroke: C.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => fmt(Math.round(v))}
            domain={[0, (max: number) => Math.ceil(max * 1.15)]}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(34,211,238,0.25)', strokeWidth: 1 }}
            content={<ChartTooltip fiscalYearCurr={fiscalYearCurr} fiscalYearPrev={fiscalYearPrev} />}
          />
          <Line
            type="monotone"
            dataKey="prev"
            stroke={C.crit}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 2.6, fill: C.crit, strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
            connectNulls
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="curr"
            stroke={C.good}
            strokeWidth={2.6}
            fill="url(#lossCurrFill)"
            dot={{ r: 3, fill: C.good, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* สรุปค่าล่าสุด */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', marginTop: 4, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        {[
          { label: `ล่าสุด ปีงบ ${fiscalYearCurr}`, point: lastCurr, c: C.good },
          { label: `ล่าสุด ปีงบ ${fiscalYearPrev}`, point: lastPrev, c: C.crit },
        ].map(({ label, point, c }) => (
          <div key={label}>
            <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: c, fontFamily: MONO }}>
              {point?.avg_loss != null ? `${fmt(Math.round(point.avg_loss))} m³/ด.` : '—'}
            </div>
            {point && (
              <div style={{ fontSize: 9, color: C.muted, fontFamily: MONO }}>เฉลี่ย {point.months_counted} เดือน (ถึง {point.month_label})</div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
