'use client'

import { useMemo } from 'react'
import type { BranchExecutiveSummary } from '@/app/actions/executive-summary'

const THAI_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const PHASES = [
  { label: 'ยังไม่เริ่ม', color: 'rgba(255,255,255,0.3)' },
  { label: 'ราคากลาง',   color: '#a78bfa' },
  { label: 'TOR',        color: '#60a5fa' },
  { label: 'พิจารณาผล', color: '#818cf8' },
  { label: 'เซ็นสัญญา', color: '#fbbf24' },
  { label: 'ดำเนินงาน', color: '#22d3ee' },
  { label: 'แล้วเสร็จ', color: '#34d399' },
]

function sevColor(pct: number | null) {
  if (pct === null) return { c: '#64748B', sev: 'grey' }
  if (pct <= 20) return { c: '#10D9B0', sev: 'ok' }
  if (pct <= 25) return { c: '#F59E0B', sev: 'warn' }
  return { c: '#EF4444', sev: 'crit' }
}

// ── Corner brackets ──────────────────────────────────────────────
function Corners({ color = 'rgba(34,211,238,0.6)' }: { color?: string }) {
  const s: React.CSSProperties = { position: 'absolute', width: 10, height: 10, borderColor: color }
  return (
    <>
      <span style={{ ...s, top: -1, left: -1,  borderTop: '1px solid', borderLeft: '1px solid' }} />
      <span style={{ ...s, top: -1, right: -1, borderTop: '1px solid', borderRight: '1px solid' }} />
      <span style={{ ...s, bottom: -1, left: -1, borderBottom: '1px solid', borderLeft: '1px solid' }} />
      <span style={{ ...s, bottom: -1, right: -1, borderBottom: '1px solid', borderRight: '1px solid' }} />
    </>
  )
}

// ── Section header ────────────────────────────────────────────────
function SectHeader({ code, label, right }: { code: string; label: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.025)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, color: 'rgba(34,211,238,0.8)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.6 }}>◆ {code}</span>
        <span style={{ fontSize: 12, color: '#CBD5E1', letterSpacing: 0.3 }}>{label}</span>
      </div>
      {right}
    </div>
  )
}

// ── NRW Semicircular Gauge ────────────────────────────────────────
function LossGauge({ value, color }: { value: number | null; color: string }) {
  const max = 30
  const pct = Math.min((value ?? 0) / max, 1)
  const angle = pct * 180
  const r = 78, cx = 105, cy = 105
  const rad = (angle * Math.PI) / 180
  const endX = cx - r * Math.cos(Math.PI - rad)
  const endY = cy - r * Math.sin(Math.PI - rad)
  const startX = cx - r, startY = cy
  const largeArc = angle > 180 ? 1 : 0

  // Target tick at 20%
  const targetAngle = (20 / max) * Math.PI
  const tx1 = cx - (r - 12) * Math.cos(targetAngle)
  const ty1 = cy - (r - 12) * Math.sin(targetAngle)
  const tx2 = cx - (r + 7) * Math.cos(targetAngle)
  const ty2 = cy - (r + 7) * Math.sin(targetAngle)

  return (
    <div style={{ position: 'relative', width: 210, height: 122, margin: '0 auto' }}>
      <svg width="210" height="122" viewBox="0 0 210 122">
        {/* BG arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(34,211,238,0.1)" strokeWidth="9" />
        {/* Tick marks */}
        {[...Array(11)].map((_, i) => {
          const a = (i / 10) * Math.PI
          return (
            <line key={i}
              x1={cx - (r - 11) * Math.cos(a)} y1={cy - (r - 11) * Math.sin(a)}
              x2={cx - (r + 5) * Math.cos(a)}  y2={cy - (r + 5) * Math.sin(a)}
              stroke="rgba(34,211,238,0.28)" strokeWidth="1"
            />
          )
        })}
        {/* Value arc */}
        {value !== null && (
          <path d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
            fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        )}
        {/* Target line at 20% */}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#34d399" strokeWidth="2" />
        <text x={tx2 - 2} y={ty2 - 4} fontSize="7" fill="#34d399" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">20%</text>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <div style={{ fontSize: 42, fontWeight: 600, color, textShadow: `0 0 18px ${color}`, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1 }}>
          {value !== null ? value.toFixed(1) : '—'}<span style={{ fontSize: 16, marginLeft: 2, opacity: 0.7 }}>%</span>
        </div>
        <div style={{ fontSize: 9, color: '#64748B', marginTop: 4, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.2 }}>
          เป้าหมาย ≤ 20.0%
        </div>
      </div>
    </div>
  )
}

// ── 12-month SVG sparkline ────────────────────────────────────────
function NrwSparkline({ data, color }: { data: { nrw_pct: number | null }[]; color: string }) {
  const pts = useMemo(() => {
    const valid = data.map((d) => d.nrw_pct)
    const allNull = valid.every((v) => v === null)
    if (allNull) return null
    const nums = valid.map((v) => v ?? 0)
    const min = Math.min(...nums.filter((_, i) => valid[i] !== null), 0) * 0.9
    const max = Math.max(...nums.filter((_, i) => valid[i] !== null), 30) * 1.05
    const range = max - min || 1
    const w = 100, h = 44, px = 4, py = 4
    const iw = w - px * 2, ih = h - py * 2
    return data.map((d, i) => ({
      x: px + (i / (data.length - 1)) * iw,
      y: d.nrw_pct !== null ? py + ih - ((d.nrw_pct - min) / range) * ih : null,
      v: d.nrw_pct,
    }))
  }, [data])

  if (!pts) return <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#64748B' }}>ไม่มีข้อมูล</div>

  const validPts = pts.filter((p) => p.y !== null) as { x: number; y: number; v: number }[]
  if (validPts.length < 2) return null
  const path = validPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${path} L ${validPts[validPts.length - 1].x} 48 L ${validPts[0].x} 48 Z`

  return (
    <svg viewBox="0 0 100 44" preserveAspectRatio="none" style={{ width: '100%', height: 44 }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Target line at 20% — compute y position */}
      <line x1="0" x2="100" y1="14" y2="14" stroke="rgba(52,211,153,0.3)" strokeWidth="0.5" strokeDasharray="2 2" />
      <path d={area} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 2px ${color})` }} vectorEffect="non-scaling-stroke" />
      <circle cx={validPts[validPts.length - 1].x} cy={validPts[validPts.length - 1].y} r="2" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} className="anim-blink-crit" />
    </svg>
  )
}

// ── Main HUD Panel ────────────────────────────────────────────────
interface Props {
  data: BranchExecutiveSummary
  animKey: number
}

export function BranchSummaryPanel({ data, animKey }: Props) {
  const { branch, nrw, pdca, budget_2569 } = data
  const { c: color, sev } = sevColor(nrw.current_pct)
  const sevLabel = sev === 'ok' ? 'ในเกณฑ์' : sev === 'warn' ? 'เฝ้าระวัง' : sev === 'crit' ? 'เกินเกณฑ์' : 'ไม่มีข้อมูล'
  const sevLabelColor = sev === 'ok' ? '#10D9B0' : sev === 'warn' ? '#F59E0B' : sev === 'crit' ? '#EF4444' : '#64748B'

  const delta = nrw.current_pct !== null && nrw.prev_month_pct !== null
    ? nrw.current_pct - nrw.prev_month_pct : null

  const repairRatio = nrw.leaks_found > 0
    ? Math.round((nrw.leaks_repaired / nrw.leaks_found) * 100) : null

  const reportLabel = nrw.report_month
    ? `${THAI_MONTHS[nrw.report_month]} ${nrw.report_year}`
    : 'ไม่มีข้อมูล'

  return (
    <div key={animKey} className="anim-holo-in" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 12, gap: 10 }}>

      {/* ── Identity bar ── */}
      <div style={{ position: 'relative', padding: '10px 16px', background: 'linear-gradient(90deg, rgba(34,211,238,0.09), rgba(34,211,238,0.02))', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Corners />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, border: '1px solid rgba(34,211,238,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,211,238,0.05)', position: 'relative' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.85)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.7))' }}>
              <path d="M12 2.5c-3 4-6 7.5-6 11a6 6 0 0012 0c0-3.5-3-7-6-11z" /><path d="M9 13a3 3 0 003 3" strokeOpacity="0.45" />
            </svg>
            <Corners />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(34,211,238,0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.5 }}>{branch.code} · {branch.province_th}</div>
            <div style={{ fontSize: 22, color: '#E2E8F0', fontWeight: 500, lineHeight: 1.15, marginTop: 2 }}>สาขา{branch.name_th}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>รายงานล่าสุด</div>
            <div style={{ fontSize: 16, color: '#E2E8F0', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500, marginTop: 1 }}>{reportLabel}</div>
          </div>
          <div style={{ width: 1, height: 34, background: 'rgba(34,211,238,0.2)' }} />
          <div style={{ padding: '7px 14px', border: `1px solid ${sevLabelColor}55`, background: `${sevLabelColor}12` }}>
            <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>สถานะ NRW</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: sevLabelColor, textShadow: `0 0 10px ${sevLabelColor}`, marginTop: 2 }}>{sevLabel}</div>
          </div>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 10, minHeight: 0 }}>

        {/* ═══ COL 1: ภาพรวมน้ำสูญเสีย ═══ */}
        <div className="anim-data-rise" style={{ display: 'flex', flexDirection: 'column', gap: 8, animationDelay: '0.05s' }}>
          <div style={{ position: 'relative', background: 'rgba(7,11,22,0.6)', border: '1px solid rgba(34,211,238,0.18)' }}>
            <Corners />
            <SectHeader code="MOD-01" label="ปริมาณน้ำสูญเสีย"
              right={
                <span style={{ padding: '2px 9px', fontSize: 10, letterSpacing: 0.8, background: `${color}18`, border: `1px solid ${color}55`, color, fontFamily: 'IBM Plex Mono, monospace' }}>
                  {sevLabel.toUpperCase()}
                </span>
              }
            />
            <div style={{ padding: '12px 12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <LossGauge value={nrw.current_pct} color={color} />
              {/* Delta + MNF */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, width: '100%', marginTop: 10 }}>
                <div style={{ padding: '10px 12px', background: 'rgba(7,11,22,0.6)', border: '1px solid rgba(34,211,238,0.13)', position: 'relative' }}>
                  <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>vs เดือนก่อน</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                    <span style={{ fontSize: 20, color: delta === null ? '#64748B' : delta < 0 ? '#10D9B0' : delta > 0 ? '#EF4444' : '#64748B', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, textShadow: delta !== null && delta !== 0 ? `0 0 10px ${delta < 0 ? '#10D9B0' : '#EF4444'}` : 'none' }}>
                      {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
                    </span>
                    {delta !== null && <span style={{ fontSize: 11, color: '#64748B' }}>%</span>}
                  </div>
                  <div style={{ fontSize: 9, color: '#64748B', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {delta === null ? 'ไม่มีข้อมูล' : delta < 0 ? '▼ ดีขึ้น' : delta > 0 ? '▲ แย่ลง' : '→ คงที่'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: 'rgba(7,11,22,0.6)', border: '1px solid rgba(34,211,238,0.13)' }}>
                  <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>MNF Factor</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
                    <span style={{ fontSize: 20, color: nrw.mnf_factor === null ? '#64748B' : nrw.mnf_factor <= 0.5 ? '#10D9B0' : nrw.mnf_factor <= 0.8 ? '#F59E0B' : '#EF4444', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
                      {nrw.mnf_factor !== null ? nrw.mnf_factor.toFixed(2) : '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: '#64748B', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {nrw.mnf_factor === null ? 'ไม่มีข้อมูล' : nrw.mnf_factor <= 0.5 ? 'ปกติ' : nrw.mnf_factor <= 0.8 ? 'เฝ้าระวัง' : 'สูงเกินเกณฑ์'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trend + leaks */}
          <div style={{ position: 'relative', flex: 1, background: 'rgba(7,11,22,0.6)', border: '1px solid rgba(34,211,238,0.18)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Corners />
            <SectHeader code="MOD-02" label="แนวโน้ม 12 เดือน + ท่อรั่ว" />
            <div style={{ padding: 10, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <NrwSparkline data={nrw.trend_12m} color={color} />
              <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>-12 เดือน</span><span style={{ color: 'rgba(52,211,153,0.6)' }}>เส้น = เป้า 20%</span><span>ปัจจุบัน</span>
              </div>
              {/* Leak stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: 'rgba(34,211,238,0.1)', marginTop: 10 }}>
                {[
                  { label: 'พบรั่ว', val: nrw.leaks_found, c: 'rgba(34,211,238,0.8)' },
                  { label: 'ซ่อมแล้ว', val: nrw.leaks_repaired, c: '#10D9B0' },
                  { label: 'ค้างซ่อม', val: nrw.leaks_pending, c: nrw.leaks_pending > 0 ? '#EF4444' : '#64748B' },
                ].map(({ label, val, c }) => (
                  <div key={label} style={{ padding: '8px 10px', background: 'rgba(7,11,22,0.7)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>{label}</div>
                    <div style={{ fontSize: 20, color: c, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, marginTop: 2, textShadow: `0 0 8px ${c}` }}>{val}</div>
                  </div>
                ))}
              </div>
              {repairRatio !== null && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>
                    <span>อัตราซ่อม</span><span>{repairRatio}%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(34,211,238,0.08)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${repairRatio}%`, background: repairRatio >= 80 ? 'linear-gradient(90deg,#10D9B088,#10D9B0)' : repairRatio >= 50 ? 'linear-gradient(90deg,#F59E0B88,#F59E0B)' : 'linear-gradient(90deg,#EF444488,#EF4444)', borderRadius: 99, boxShadow: `0 0 6px ${repairRatio >= 80 ? '#10D9B0' : repairRatio >= 50 ? '#F59E0B' : '#EF4444'}55` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ COL 2: PDCA ═══ */}
        <div className="anim-data-rise" style={{ animationDelay: '0.15s', position: 'relative', background: 'rgba(7,11,22,0.6)', border: '1px solid rgba(34,211,238,0.18)', display: 'flex', flexDirection: 'column' }}>
          <Corners />
          <SectHeader code="MOD-03" label="PDCA เดือนล่าสุด"
            right={pdca?.report_month ? <span style={{ fontSize: 10, color: 'rgba(34,211,238,0.6)', fontFamily: 'IBM Plex Mono, monospace' }}>{THAI_MONTHS[pdca.report_month]} {pdca.report_year}</span> : null}
          />
          <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
            {pdca ? (
              <>
                {/* D */}
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, border: '1px solid rgba(34,211,238,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,211,238,0.06)', position: 'relative', flexShrink: 0 }}>
                      <Corners color="rgba(34,211,238,0.4)" />
                      <span style={{ fontSize: 13, color: 'rgba(34,211,238,0.9)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>D</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8', letterSpacing: 0.3 }}>สิ่งที่ดำเนินการ (Do)</span>
                  </div>
                  <div style={{ padding: '12px 14px', background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.14)', borderLeft: '2px solid rgba(34,211,238,0.6)', minHeight: 60 }}>
                    {pdca.do_text ? (
                      <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{pdca.do_text}</p>
                    ) : (
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>ไม่มีข้อมูล</p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(139,92,246,0.4), transparent)' }} />

                {/* A */}
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, border: '1px solid rgba(139,92,246,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.06)', position: 'relative', flexShrink: 0 }}>
                      <Corners color="rgba(139,92,246,0.4)" />
                      <span style={{ fontSize: 13, color: 'rgba(139,92,246,0.9)', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>A</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8', letterSpacing: 0.3 }}>การปรับปรุงแก้ไข (Act)</span>
                  </div>
                  <div style={{ padding: '12px 14px', background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.14)', borderLeft: '2px solid rgba(139,92,246,0.6)', minHeight: 60 }}>
                    {pdca.act_text ? (
                      <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{pdca.act_text}</p>
                    ) : (
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>ไม่มีข้อมูล</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, border: '1px solid rgba(34,211,238,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Corners />
                  <span style={{ fontSize: 22, color: 'rgba(34,211,238,0.3)' }}>P</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace' }}>NO PDCA DATA</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>ยังไม่ได้กรอก PDCA</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ COL 3: งบประมาณ 2569 ═══ */}
        <div className="anim-data-rise" style={{ animationDelay: '0.25s', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative', background: 'rgba(7,11,22,0.6)', border: '1px solid rgba(34,211,238,0.18)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Corners />
            <SectHeader code="MOD-04" label="งบประมาณปี 2569" />

            {budget_2569 ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* KPI 4 tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(34,211,238,0.1)' }}>
                  {[
                    { label: 'ทั้งหมด',     val: budget_2569.total,                                     c: 'rgba(34,211,238,0.8)' },
                    { label: 'แล้วเสร็จ',   val: budget_2569.by_phase[6],                               c: '#34d399' },
                    { label: 'กำลังดำเนิน', val: budget_2569.by_phase[4] + budget_2569.by_phase[5],     c: '#22d3ee' },
                    { label: 'เกินกำหนด',   val: budget_2569.overdue,                                   c: budget_2569.overdue > 0 ? '#EF4444' : '#64748B' },
                  ].map(({ label, val, c }) => (
                    <div key={label} style={{ padding: '10px 12px', background: 'rgba(7,11,22,0.7)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>{label}</div>
                      <div style={{ fontSize: 24, color: c, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, marginTop: 2, textShadow: `0 0 10px ${c}55` }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 5 }}>
                    <span>ความก้าวหน้าโดยรวม</span>
                    <span style={{ color: '#E2E8F0' }}>{budget_2569.done_pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(34,211,238,0.07)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${budget_2569.done_pct}%`, background: budget_2569.done_pct >= 80 ? 'linear-gradient(90deg,#34d39988,#34d399)' : budget_2569.done_pct >= 40 ? 'linear-gradient(90deg,#fbbf2488,#fbbf24)' : 'linear-gradient(90deg,#22d3ee88,#22d3ee)', borderRadius: 99, boxShadow: `0 0 6px ${budget_2569.done_pct >= 80 ? '#34d399' : budget_2569.done_pct >= 40 ? '#fbbf24' : '#22d3ee'}55` }} />
                  </div>
                </div>

                {/* Phase stacked bar */}
                {budget_2569.total > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8, marginBottom: 6 }}>PHASE DISTRIBUTION</div>
                    <div style={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden', gap: 1 }}>
                      {PHASES.map((ph, i) => {
                        const count = budget_2569.by_phase[i] ?? 0
                        if (count === 0) return null
                        return (
                          <div key={i} title={`${ph.label}: ${count}`}
                            style={{ flex: count, background: ph.color, boxShadow: `0 0 4px ${ph.color}66` }}
                          />
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
                      {PHASES.map((ph, i) => {
                        const count = budget_2569.by_phase[i] ?? 0
                        if (count === 0) return null
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 6, height: 6, background: ph.color, borderRadius: 1 }} />
                            <span style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'IBM Plex Mono, monospace' }}>{ph.label}</span>
                            <span style={{ fontSize: 10, color: ph.color, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Overdue alert */}
                {budget_2569.overdue > 0 && (
                  <div className="anim-blink-crit" style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M12 2L2 22h20L12 2z" /><line x1="12" y1="9" x2="12" y2="14" /><line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span style={{ fontSize: 11, color: '#F87171' }}>{budget_2569.overdue} โครงการเกินกำหนดสัญญา</span>
                  </div>
                )}

                {/* Project list */}
                {budget_2569.projects.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8, marginBottom: 6 }}>PROJECT REGISTRY</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {budget_2569.projects.map((p, i) => (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center',
                          padding: '8px 10px',
                          background: p.overdue ? 'rgba(239,68,68,0.06)' : 'rgba(7,11,22,0.6)',
                          border: `1px solid ${p.overdue ? 'rgba(239,68,68,0.35)' : 'rgba(34,211,238,0.1)'}`,
                        }}>
                          <div style={{ width: 6, height: 6, background: PHASES[p.phase]?.color ?? '#64748B', borderRadius: 1 }} />
                          <span style={{ fontSize: 11, color: '#CBD5E1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>{p.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 9, color: PHASES[p.phase]?.color ?? '#64748B', fontFamily: 'IBM Plex Mono, monospace', background: `${PHASES[p.phase]?.color ?? '#64748B'}11`, border: `1px solid ${PHASES[p.phase]?.color ?? '#64748B'}33`, padding: '1px 6px' }}>
                              {PHASES[p.phase]?.label ?? `P${p.phase}`}
                            </span>
                            {p.overdue && <span className="anim-blink-crit" style={{ fontSize: 9, color: '#F87171', fontFamily: 'IBM Plex Mono, monospace' }}>OVERDUE</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {budget_2569.total === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace' }}>NO PROJECTS REGISTERED</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>NO BUDGET DATA</div>
                <div style={{ fontSize: 12, color: '#475569' }}>ไม่มีโครงการงบประมาณปี 2569</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
