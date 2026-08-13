'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { LossSeriesPoint } from '@/app/actions/executive-summary'
import { C, MONO, SANS, fmt, Card, Sec } from './shared'

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

type SeriesKey = typeof SERIES[number]['key']

// ค่าเฉลี่ย N เดือนแรก/ท้ายสุดที่มีข้อมูลจริงในช่วงที่แสดง — ใช้เทียบ "ต้นช่วง vs ท้ายช่วง" แทนจุดเดียว
// กันความผันผวนของเดือนใดเดือนหนึ่ง (ตามที่เห็นในกราฟ) บิดเบือนภาพรวมแนวโน้มทั้งช่วง
function windowAvg(points: LossSeriesPoint[], key: SeriesKey, take: number, fromStart: boolean): number | null {
  const valid = points.filter((p) => p[key] != null)
  if (!valid.length) return null
  const slice = fromStart ? valid.slice(0, take) : valid.slice(-take)
  return slice.reduce((s, p) => s + (p[key] as number), 0) / slice.length
}

function pctChangeOf(early: number | null, late: number | null): number | null {
  if (early == null || late == null || early === 0) return null
  return ((late - early) / Math.abs(early)) * 100
}

function fmtSigned(n: number, dec = 1): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(dec)}`
}

// ตัวเลขไฮไลต์ในประโยคบรรยาย
function Num({ children, color }: { children: React.ReactNode; color?: string }) {
  return <strong style={{ color: color ?? C.bright, fontFamily: MONO, fontWeight: 800 }}>{children}</strong>
}

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

  // เดือนเยอะ (ตั้งแต่ปีงบ 2567 ถึงปัจจุบัน) — โชว์ป้ายแกน X แบบเว้นช่วง กันตัวหนังสือทับกัน
  const tickInterval = series.length > 24 ? 2 : series.length > 12 ? 1 : 0

  // สรุปแนวโน้มทั้งช่วง — เทียบเฉลี่ยต้นช่วงกับท้ายช่วง (สูงสุด 3 เดือน) แทนตัวเลขจุดสุดท้ายที่ซ้ำกับปลายเส้นบนกราฟ
  const validCount = series.filter((p) => p.water_produced != null).length
  const take = Math.max(1, Math.min(3, Math.floor(validCount / 2)))
  const early = {
    produced: windowAvg(series, 'water_produced', take, true),
    sold: windowAvg(series, 'water_sold', take, true),
    loss: windowAvg(series, 'water_loss', take, true),
  }
  const late = {
    produced: windowAvg(series, 'water_produced', take, false),
    sold: windowAvg(series, 'water_sold', take, false),
    loss: windowAvg(series, 'water_loss', take, false),
  }
  const producedChange = pctChangeOf(early.produced, late.produced)
  const soldChange = pctChangeOf(early.sold, late.sold)
  const earlyRatio = early.produced && early.produced > 0 && early.loss != null ? (early.loss / early.produced) * 100 : null
  const lateRatio = late.produced && late.produced > 0 && late.loss != null ? (late.loss / late.produced) * 100 : null
  const ratioChange = earlyRatio != null && lateRatio != null ? lateRatio - earlyRatio : null

  const ratioWorse = ratioChange != null && ratioChange > 0.5
  const ratioBetter = ratioChange != null && ratioChange < -0.5
  const ratioWord = ratioChange == null ? null : ratioWorse ? 'แย่ลง' : ratioBetter ? 'ดีขึ้น' : 'ค่อนข้างคงที่'
  const ratioColor = ratioChange == null ? C.dim : ratioWorse ? C.crit : ratioBetter ? C.good : C.dim

  // ประโยคอธิบายสาเหตุ — เทียบอัตราเพิ่มของน้ำผลิตจ่ายกับน้ำจำหน่าย เพื่อชี้ว่าส่วนต่างที่ขยาย/หดคือตัวขับสัดส่วนสูญเสีย
  let causeNode: React.ReactNode = null
  if (producedChange != null && soldChange != null) {
    const gap = producedChange - soldChange
    if (Math.abs(gap) < 1.5) {
      causeNode = <>น้ำผลิตจ่ายและน้ำจำหน่ายเพิ่มขึ้นในอัตราใกล้เคียงกัน (<Num color={C.blue}>{fmtSigned(producedChange)}%</Num> และ <Num color={C.good}>{fmtSigned(soldChange)}%</Num>)</>
    } else if (gap > 0) {
      causeNode = (
        <>
          น้ำผลิตจ่ายเพิ่มขึ้น <Num color={C.blue}>{fmtSigned(producedChange)}%</Num> แต่น้ำจำหน่ายเพิ่มเพียง <Num color={C.good}>{fmtSigned(soldChange)}%</Num>
          {ratioWorse ? ' — ส่วนต่างที่ขยายนี้คือสาเหตุหลักของสัดส่วนสูญเสียที่เพิ่มขึ้น' : ''}
        </>
      )
    } else {
      causeNode = (
        <>
          น้ำจำหน่ายเพิ่มขึ้น <Num color={C.good}>{fmtSigned(soldChange)}%</Num> เร็วกว่าน้ำผลิตจ่ายที่เพิ่ม <Num color={C.blue}>{fmtSigned(producedChange)}%</Num>
          {ratioBetter ? ' — ทำให้สัดส่วนสูญเสียลดลง' : ''}
        </>
      )
    }
  }

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

      {/* สรุปแนวโน้มแบบประโยคบรรยาย — เทียบต้นช่วงกับท้ายช่วง (เฉลี่ย {take} เดือน) แทนตัวเลขจุดสุดท้ายที่ซ้ำกับปลายเส้นบนกราฟ
          ห่อเป็นกล่อง callout สีตามทิศทาง (แดง=แย่ลง/เขียว=ดีขึ้น/เทา=คงที่) แยกจากกราฟชัดเจน แทนที่จะเป็นข้อความลอยท้ายการ์ด */}
      {earlyRatio != null && lateRatio != null && (
        <div style={{
          marginTop: 14, padding: '13px 16px', borderRadius: 10,
          background: ratioWorse ? '#FBEAE8' : ratioBetter ? '#E7F3EE' : C.row,
          borderLeft: `3px solid ${ratioColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{
              width: 19, height: 19, borderRadius: '50%', flexShrink: 0, background: ratioColor, color: '#FFFFFF',
              fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} aria-hidden>
              {ratioWorse ? '▲' : ratioBetter ? '▼' : '▬'}
            </span>
            <span style={{ fontSize: 10.5, color: ratioColor, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: MONO }}>
              สัดส่วนสูญเสีย{ratioWord ? `${ratioWord} ${Math.abs(ratioChange!).toFixed(1)} จุด` : ''} ตลอดช่วง {startLabel}–{endLabel}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.85, fontFamily: SANS }}>
            สัดส่วนสูญเสียขยับจาก <Num>{earlyRatio.toFixed(1)}%</Num> เป็น <Num color={ratioColor}>{lateRatio.toFixed(1)}%</Num>
            {causeNode && <> ขณะที่{causeNode}</>}
          </p>
        </div>
      )}
    </Card>
  )
}
