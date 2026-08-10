'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LossSeriesPoint } from '@/app/actions/executive-summary'
import { C, MONO, fmt, Card, Sec } from './shared'

// ย่อตัวเลขแกน Y ให้สั้นพออยู่ในความกว้างจำกัด (ค่าน้ำมักมีหลักแสน-ล้าน)
function fmtAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}k`
  return `${Math.round(n)}`
}

const SERIES = [
  { key: 'water_produced' as const, label: 'น้ำผลิตจ่าย', color: C.blue },
  { key: 'water_sold' as const,     label: 'น้ำจำหน่าย',   color: C.good },
  { key: 'water_loss' as const,     label: 'น้ำสูญเสีย',    color: C.crit },
]

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color, fontFamily: MONO }}>
      <span style={{ width: 12, height: 0, borderTop: `2px solid ${color}`, display: 'inline-block' }} />
      {label}
    </span>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { dataKey: string; value: number | null; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, padding: '8px 10px', fontFamily: MONO, boxShadow: '0 4px 14px rgba(18,24,31,.08)' }}>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{label}</div>
      {SERIES.map(({ key, label: sLabel, color }) => {
        const p = payload.find((x) => x.dataKey === key)
        if (!p || p.value == null) return null
        return (
          <div key={key} style={{ fontSize: 11, color, marginBottom: 2 }}>
            {sLabel}: {fmt(Math.round(p.value))} m³
          </div>
        )
      })}
    </div>
  )
}

export function CumulativeLossChart({ series }: { series: LossSeriesPoint[] }) {
  const hasData = series.some((p) => p.water_produced != null)

  if (!hasData) {
    return (
      <Card style={{ textAlign: 'center', padding: 50 }}>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>{'// ยังไม่มีข้อมูลน้ำผลิตจ่าย/จำหน่าย/สูญเสีย'}</div>
      </Card>
    )
  }

  const startLabel = series[0]?.month_label ?? ''
  const endLabel = series[series.length - 1]?.month_label ?? ''
  const last = [...series].reverse().find((p) => p.water_produced != null) ?? null

  // เดือนเยอะ (ตั้งแต่ปีงบ 2567 ถึงปัจจุบัน) — โชว์ป้ายแกน X แบบเว้นช่วง กันตัวหนังสือทับกัน
  const tickInterval = series.length > 24 ? 2 : series.length > 12 ? 1 : 0

  return (
    <Card>
      <Sec
        label={`น้ำผลิตจ่าย/จำหน่าย/สูญเสีย — ${startLabel} ถึง ${endLabel}`}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {SERIES.map(({ key, label, color }) => <LegendDot key={key} color={color} label={label} />)}
          </div>
        }
      />

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={series} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(11,110,118,0.10)" vertical={false} />
          <XAxis
            dataKey="month_label"
            tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }}
            axisLine={{ stroke: C.border }}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: C.dim, fontSize: 9, fontFamily: MONO }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={fmtAxis}
            domain={[0, (max: number) => Math.ceil(max * 1.15)]}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(11,110,118,0.25)', strokeWidth: 1 }}
            content={<ChartTooltip />}
          />
          {SERIES.map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2.2}
              dot={{ r: 2.4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 4.5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* สรุปค่าล่าสุด */}
      {last && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', marginTop: 4, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          {SERIES.map(({ key, label, color }) => (
            <div key={key}>
              <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginBottom: 3 }}>{label} ({last.month_label})</div>
              <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: MONO }}>
                {last[key] != null ? `${fmt(Math.round(last[key] as number))} m³` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
