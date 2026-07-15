'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import type { Branch } from '@/lib/types'
import type { BranchNrwSnap, RegionNrwSnap } from '../page'
import type { BranchExecutiveSummary } from '@/app/actions/executive-summary'
import { getExecutiveBranchSummary } from '@/app/actions/executive-summary'
import { BranchSummaryPanel } from './BranchSummaryPanel'
import { useRealtimeBranchReadStats } from '@/hooks/useRealtimeData'
import { getBranchByCostcenter } from '@/lib/utils/pwa-branches'
import { useBreakpoint } from './tabs/shared'

const MONTH_SHORT = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const SANS = 'var(--font-sans)'
const MONO = 'var(--font-mono), var(--font-sans)'
const INK   = '#12181F'
const INK2  = '#4B5563'
const INK3  = '#8896A3'
const LINE  = '#E3E7EC'
const BG    = '#F5F6F8'
const SURF  = '#FFFFFF'

// กลุ่มสถานะสาขา — จัดกลุ่มตายตัวตามที่เขตกำหนด (ไม่ได้คำนวณจาก threshold)
type GroupKey = 'track' | 'crit' | 'watch' | 'general'
type SevFilter = 'all' | GroupKey

const STATUS_GROUPS: { key: GroupKey; label: string; color: string; soft: string; codes: string[] }[] = [
  { key: 'track',   label: 'ติดตาม',    color: '#2B5C86', soft: '#EAF1F8', codes: ['PKM', 'KPP', 'MSO', 'SKT', 'PCT'] },
  { key: 'crit',    label: 'วิกฤต',     color: '#B3392C', soft: '#FBEAE8', codes: ['PBC', 'LOM', 'PYK', 'TAK', 'TPH', 'CNT'] },
  { key: 'watch',   label: 'เฝ้าระวัง', color: '#A8721A', soft: '#FBF1E1', codes: ['BML', 'UTN', 'KNU', 'NKT', 'UTT', 'SWK', 'NKS', 'SSN', 'VCB'] },
  { key: 'general', label: 'ทั่วไป',    color: '#1E7A5A', soft: '#E7F3EE', codes: ['LYW', 'TTK', 'CHN', 'SRR', 'NNP', 'TSL'] },
]

const GROUP_ORDER: GroupKey[] = STATUS_GROUPS.map((g) => g.key)
const GROUP_COLOR: Record<GroupKey, string> = Object.fromEntries(STATUS_GROUPS.map((g) => [g.key, g.color])) as Record<GroupKey, string>
const GROUP_BY_CODE: Record<string, GroupKey> = {}
for (const g of STATUS_GROUPS) for (const c of g.codes) GROUP_BY_CODE[c] = g.key

function groupOf(code: string): GroupKey {
  return GROUP_BY_CODE[code] ?? 'general'
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function thaiDateTime(d: Date) {
  const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return {
    date: `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear() + 543}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

function trendInfo(delta: number | null): { label: string; color: string } {
  if (delta == null) return { label: 'ไม่มีข้อมูลเทียบ', color: INK3 }
  if (delta > 0.05) return { label: `▲ แย่ลง ${delta.toFixed(1)} จุด`, color: '#B3392C' }
  if (delta < -0.05) return { label: `▼ ดีขึ้น ${Math.abs(delta).toFixed(1)} จุด`, color: '#1E7A5A' }
  return { label: '▬ คงที่', color: INK3 }
}

// ย่อตัวเลขปริมาณน้ำให้พอดี sidebar แคบๆ (200px)
function fmtLossCompact(v: number | null): string {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} ล้าน m³`
  if (v >= 1_000) return `${Math.round(v / 1000).toLocaleString('th-TH')}k m³`
  return `${Math.round(v).toLocaleString('th-TH')} m³`
}

// ── มาตรวัดเชิงเส้น — ใช้กับแถวสาขาทุกจุดที่โชว์ %NRW เทียบเป้า 20% ──
function Gauge({ pct, color, height = 8 }: { pct: number | null; color: string; height?: number }) {
  const domain = 40 // สเกลอ้างอิง 0–40% → เป้าหมาย 20% อยู่กึ่งกลางแท่งพอดี
  const width = pct == null ? 0 : Math.max(2, Math.min(100, (pct / domain) * 100))
  return (
    <div style={{ position: 'relative', height, borderRadius: 99, background: '#EBEEF1', overflow: 'hidden', flex: 1, minWidth: 40 }}>
      <div aria-hidden style={{ position: 'absolute', left: '50%', top: -1, bottom: -1, width: 1, background: '#C7CFD7' }} />
      <div style={{ height: '100%', width: `${width}%`, borderRadius: 99, background: color, transition: 'width .5s ease' }} />
    </div>
  )
}

// ── สัญลักษณ์หลักของหน้านี้ — มาตรวัดครึ่งวงกลม (เหมือนหน้าปัดมิเตอร์น้ำ) แสดง NRW% สะสมทั้งเขต ──
// เป้าหมาย 20% อยู่ตำแหน่ง 12 นาฬิกาพอดี (สเกล 0–40%) ให้เทียบง่ายด้วยตา
// ขนาดคุมด้วย container ที่ห่อ (width:100% + aspect-ratio) ไม่ตรึงพิกเซล เพราะใช้ทั้งใน sidebar แคบและ hero มือถือกว้าง
// พื้นหลังแบ่งเป็น 3 โซนสีจาง (ดี/เฝ้าระวัง/วิกฤต) ตามเกณฑ์เดียวกับสีสถานะที่ใช้ทั้งหน้า ให้เทียบตำแหน่งค่าปัจจุบันกับเกณฑ์ได้ด้วยตาโดยไม่ต้องอ่านตัวเลข
function HeroDial({ pct }: { pct: number | null }) {
  const W = 220, H = 122, CX = 110, CY = 102, R = 82, SW = 18
  const domain = 40
  const circumference = 2 * Math.PI * R
  const halfCirc = circumference / 2
  const value = pct == null ? 0 : Math.max(0, Math.min(domain, pct))
  const valueLen = halfCirc * (value / domain)
  const color = pct == null ? '#C7CFD7' : pct <= 20 ? '#1E7A5A' : pct <= 25 ? '#A8721A' : '#B3392C'

  const ZONES = [
    { from: 0,  to: 20, color: '#1E7A5A' },
    { from: 20, to: 25, color: '#A8721A' },
    { from: 25, to: 40, color: '#B3392C' },
  ]
  const dialId = useId()

  // ตำแหน่งปลายเข็ม — angle 180°=9 นาฬิกา (value=0) ไล่ลดลงถึง 0°=3 นาฬิกา (value=domain) ผ่านสุด apex ที่ 90° (12 นาฬิกา)
  const tipRad = ((180 - (value / domain) * 180) * Math.PI) / 180
  const tip = { x: CX + R * Math.cos(tipRad), y: CY - R * Math.sin(tipRad) }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }} aria-hidden>
      <defs>
        <filter id={`${dialId}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1" stdDeviation="2.2" floodColor={color} floodOpacity="0.32" />
        </filter>
      </defs>

      {pct == null ? (
        <circle
          cx={CX} cy={CY} r={R} fill="none" stroke="#EBEEF1" strokeWidth={SW}
          strokeDasharray={`${halfCirc} ${circumference}`} strokeLinecap="round"
          transform={`rotate(180 ${CX} ${CY})`}
        />
      ) : (
        ZONES.map(({ from, to, color: zoneColor }) => {
          const segLen = halfCirc * ((to - from) / domain)
          const offset = halfCirc * (from / domain)
          return (
            <circle
              key={from}
              cx={CX} cy={CY} r={R} fill="none" stroke={zoneColor} strokeOpacity={0.13} strokeWidth={SW}
              strokeLinecap="round"
              strokeDasharray={`${segLen} ${circumference - segLen}`}
              strokeDashoffset={-offset}
              transform={`rotate(180 ${CX} ${CY})`}
            />
          )
        })
      )}

      {/* ขีดเป้าหมาย 20% — ตำแหน่ง apex กึ่งกลางสเกล */}
      <line x1={CX} y1={CY - R - SW / 2 - 3} x2={CX} y2={CY - R + SW / 2 + 3} stroke="#B9C2CB" strokeWidth={2} />

      {pct != null && (
        <>
          <circle
            cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={SW}
            strokeDasharray={`${valueLen} ${circumference}`} strokeLinecap="round"
            transform={`rotate(180 ${CX} ${CY})`}
            filter={`url(#${dialId}-shadow)`}
            style={{ transition: 'stroke-dasharray .7s ease' }}
          />
          <circle cx={tip.x} cy={tip.y} r={SW / 2 - 2} fill="#FFFFFF" stroke={color} strokeWidth={3.5} />
        </>
      )}
    </svg>
  )
}

function BranchRow({ branch, snap, compact, onClick }: {
  branch: Branch
  snap: BranchNrwSnap | undefined
  compact: boolean
  onClick: () => void
}) {
  const color = GROUP_COLOR[groupOf(branch.code)]
  const { label: trendLabel, color: trendColor } = trendInfo(snap?.cum_trend_delta ?? null)
  const pctLabel = snap?.cum_pct != null ? snap.cum_pct.toFixed(1) + '%' : '—'

  if (compact) {
    return (
      <button onClick={onClick} className="exec-row" style={{
        width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: `1px solid ${LINE}`,
        padding: '10px 12px', fontFamily: SANS,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 9, color: INK3, fontFamily: MONO, flexShrink: 0 }}>{branch.code}</span>
            <span style={{ fontSize: 13, color: INK, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{branch.name_th}</span>
          </span>
          <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: 700, color, flexShrink: 0 }}>{pctLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gauge pct={snap?.cum_pct ?? null} color={color} height={6} />
          <span style={{ fontSize: 10, color: trendColor, flexShrink: 0, whiteSpace: 'nowrap' }}>{trendLabel}</span>
        </div>
      </button>
    )
  }

  return (
    <button onClick={onClick} className="exec-row" style={{
      width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(120px,1.4fr) 70px 140px', alignItems: 'center', gap: 14,
      padding: '11px 16px', background: 'transparent', border: 'none', borderBottom: `1px solid ${LINE}`,
      textAlign: 'left', fontFamily: SANS,
    }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 10, color: INK3, fontFamily: MONO, flexShrink: 0 }}>{branch.code}</span>
        <span style={{ fontSize: 13.5, color: INK, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{branch.name_th}</span>
      </span>
      <Gauge pct={snap?.cum_pct ?? null} color={color} />
      <span style={{ fontSize: 13.5, fontFamily: MONO, fontWeight: 700, color, textAlign: 'right' }}>{pctLabel}</span>
      <span style={{ fontSize: 11.5, color: trendColor, textAlign: 'right' }}>{trendLabel}</span>
    </button>
  )
}

// ── ปุ่มกรองแบบ pill รวมกลุ่ม — แทนที่การ์ดใหญ่เดิม ให้เป็น toolbar เดียวกับช่องค้นหา ──
function SevPill({ active, label, count, color, onClick }: {
  active: boolean; label: string; count: number; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px 6px 11px', borderRadius: 99,
      background: active ? color : SURF, border: `1px solid ${active ? color : LINE}`,
      cursor: 'pointer', fontFamily: SANS, transition: 'background .15s, border-color .15s', flexShrink: 0,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: active ? '#FFFFFF' : color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#FFFFFF' : INK2, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: MONO, color: active ? 'rgba(255,255,255,0.85)' : INK3 }}>{count}</span>
    </button>
  )
}

// ── stat chip แบบ label บน/ตัวเลข mono ใหญ่ล่าง — รูปแบบเดียวกับแถบสรุปใน CumulativeLossChart ──
function StatChip({ label, value, unit, color, sub }: {
  label: string; value: string; unit?: string; color: string; sub?: string
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: INK3, fontFamily: MONO, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 21, fontWeight: 800, color, fontFamily: MONO, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: INK3, fontFamily: MONO }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: INK3, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── แถวตัวกรองแนวตั้ง — ใช้ใน sidebar ซ้ายบนจอกว้าง ──
// แถว "ทั้งหมด" แสดงเป็น header หนาๆ คั่นเส้นด้านล่าง ส่วนกลุ่มย่อยมีแถบสัดส่วน (count/total) ให้เห็นการกระจายตัวด้วยตาแทนตัวเลขล้วนๆ
function VFilterRow({ active, label, count, color, total, isTotal, onClick }: {
  active: boolean; label: string; count: number; color: string; total: number; isTotal?: boolean; onClick: () => void
}) {
  if (isTotal) {
    return (
      <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '7px 10px 10px', borderRadius: 7, width: '100%', textAlign: 'left',
        background: active ? SURF : 'transparent', boxShadow: active ? '0 1px 2px rgba(18,24,31,0.06)' : 'none',
        border: 'none', borderBottom: `1px solid ${LINE}`, marginBottom: 6, cursor: 'pointer', fontFamily: SANS,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{label}</span>
        </span>
        <span style={{ fontSize: 12.5, fontFamily: MONO, fontWeight: 700, color: INK }}>{count}</span>
      </button>
    )
  }

  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', gap: 5,
      padding: '6px 10px', borderRadius: 7, width: '100%', textAlign: 'left',
      background: active ? SURF : 'transparent', boxShadow: active ? '0 1px 2px rgba(18,24,31,0.06)' : 'none',
      border: 'none', cursor: 'pointer', fontFamily: SANS,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: INK2 }}>{label}</span>
        </span>
        <span style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color }}>{count}</span>
      </span>
      <div style={{ height: 4, borderRadius: 99, background: '#EBEEF1', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color, transition: 'width .5s ease' }} />
      </div>
    </button>
  )
}

// ── แถวสรุปเร็ว label/value บรรทัดเดียว — ใช้ใน sidebar การ์ด "สรุปเร็ว" ──
function QuickRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '5px 0' }}>
      <span style={{ fontSize: 11, color: INK2 }}>{label}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: MONO, color }}>{value}</span>
    </div>
  )
}

const RATS_RANK_COLOR = ['#A8721A', '#8896A3', '#B5651D']

// ── RATS2 rail widget — ย่อจาก RatsReadingPanel เต็มรูปแบบให้เป็นคอลัมน์เดียว
// พอดีกับความกว้าง rail (RatsReadingPanel เต็มมี md:grid-cols-2 ภายใน ซึ่งอิงความกว้างจอ ไม่ใช่ความกว้าง container
// เอามาใส่ rail แคบๆ ตรงๆ จะบีบจนอ่านยาก เลยทำเวอร์ชันคอลัมน์เดียวแยกต่างหาก) ──
function RatsRailSummary({ yearBe, month }: { yearBe: number; month: number }) {
  const { data: stats, loading, syncing } = useRealtimeBranchReadStats(yearBe, month)
  const label = `${MONTH_SHORT[month]} ${yearBe}`
  const total = stats.length
  const started = stats.filter((s) => s.read_count > 0)
  const pct = total > 0 ? Math.round((started.length / total) * 100) : 0
  const topReaders = [...stats].sort((a, b) => b.read_count - a.read_count).slice(0, 10)
  const maxRead = topReaders[0]?.read_count ?? 1

  return (
    <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, padding: '16px', boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 12.5, color: INK, fontWeight: 700 }}>W.A.T.C.H ผู้ใช้น้ำรายใหญ่</div>
        <div style={{ fontSize: 10.5, color: INK3 }}>{label}</div>
      </div>

      {loading && total === 0 ? (
        <div className="animate-pulse" style={{ height: 96, background: BG, borderRadius: 8 }} />
      ) : total === 0 ? (
        <div style={{ fontSize: 12, color: INK3 }}>ยังไม่มีข้อมูลจาก RATS สำหรับเดือนนี้</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#6B4FA0', fontFamily: MONO, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: 11, color: INK3 }}>
              {started.length}/{total} สาขาเริ่มจดมาตรแล้ว{syncing ? ' · กำลังอัปเดต' : ''}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: '#EBEEF1', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: 'linear-gradient(90deg, #6B4FA0, #4A5FA5)', transition: 'width .6s ease' }} />
          </div>

          <div style={{ fontSize: 10, color: INK3, fontFamily: MONO, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 9 }}>TOP 10 บันทึกมากที่สุด</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {topReaders.map((s, i) => {
              const barPct = maxRead > 0 ? (s.read_count / maxRead) * 100 : 0
              return (
                <div key={s.ba} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(107,79,160,.10)', color: RATS_RANK_COLOR[i] ?? '#6B4FA0',
                    fontSize: 10, fontWeight: 700, fontFamily: MONO,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getBranchByCostcenter(String(s.ba))?.name_th ?? `BA ${s.ba}`}
                      </span>
                      <span style={{ fontSize: 11, color: INK2, fontFamily: MONO, fontWeight: 700, flexShrink: 0 }}>{s.read_count.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: '#EBEEF1', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 99, background: '#6B4FA0' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
interface Props {
  branches: Branch[]
  snapMap: Record<string, BranchNrwSnap>
  regionSnap: RegionNrwSnap
}

export function ExecutiveSummaryClient({ branches, snapMap, regionSnap }: Props) {
  const now = useClock()
  const { date, time } = thaiDateTime(now)
  const { isMobile, w } = useBreakpoint()
  // จอ >=768 มี Sidebar หลักของแอปกิน 220px เสมอ (components/layout/Sidebar.tsx) — ต้องหักออกก่อนคำนวณว่าพอวาง
  // sidebar 208px + rail 300px ของหน้านี้เองมั้ย ไม่งั้น iPad แนวนอน (1024px) จะได้ผลลัพธ์ที่ยังบีบคอลัมน์กลางจนพัง
  // ต้องการอย่างน้อย ~1280px raw viewport ถึงจะเหลือพอสำหรับคอลัมน์กลาง (คำนวณ: 220 sidebar + 80 padding + 556 fixed (208+300+48) + 372 ขั้นต่ำคอลัมน์กลาง ≈ 1228)
  const showSidebarLayout = w >= 1280
  const gap = isMobile ? 20 : 28

  const [pendingBranch, setPendingBranch] = useState<Branch | null>(null)
  const [loadedBranch, setLoadedBranch]   = useState<Branch | null>(null)
  const [summaryData, setSummaryData]     = useState<BranchExecutiveSummary | null>(null)
  const [animKey, setAnimKey]             = useState(0)
  const [sevFilter, setSevFilter]         = useState<SevFilter>('all')

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLoadedBranch(null); setSummaryData(null) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const loadBranch = useCallback(async (branch: Branch) => {
    setPendingBranch(branch)
    setSummaryData(null)
    setLoadedBranch(null)
    const result = await getExecutiveBranchSummary(branch.id)
    setPendingBranch(null)
    if (result.data) {
      setLoadedBranch(branch)
      setSummaryData(result.data)
      setAnimKey((k) => k + 1)
    }
  }, [])

  const trackCount   = branches.filter((b) => groupOf(b.code) === 'track').length
  const critCount    = branches.filter((b) => groupOf(b.code) === 'crit').length
  const watchCount   = branches.filter((b) => groupOf(b.code) === 'watch').length
  const generalCount = branches.filter((b) => groupOf(b.code) === 'general').length

  // สาขาที่แนวโน้มแย่ลงชัดเจน — NRW% เดือนล่าสุดเทียบเดือนเดียวกันปีก่อน (YoY) เพิ่มขึ้น — ไล่จากแย่ลงมากสุด ใช้โชว์เป็น "ต้องจับตา"
  const worsening = branches
    .filter((b) => (snapMap[b.id]?.cum_trend_delta ?? 0) > 0.05)
    .sort((a, b) => (snapMap[b.id]?.cum_trend_delta ?? 0) - (snapMap[a.id]?.cum_trend_delta ?? 0))
  const topConcerns = worsening.slice(0, 10)

  // เรียง: กลุ่ม (ติดตาม→วิกฤต→เฝ้าระวัง→ทั่วไป) แล้วภายในกลุ่มเรียงแนวโน้มแย่ลงก่อน
  const filteredBranches = branches
    .filter((b) => sevFilter === 'all' || groupOf(b.code) === sevFilter)
    .sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(groupOf(a.code)), gb = GROUP_ORDER.indexOf(groupOf(b.code))
      if (ga !== gb) return ga - gb
      const da = snapMap[a.id]?.cum_trend_delta ?? null
      const db = snapMap[b.id]?.cum_trend_delta ?? null
      if (da == null && db == null) return a.name_th.localeCompare(b.name_th, 'th')
      if (da == null) return 1
      if (db == null) return -1
      return db - da
    })

  const byGroup = new Map<GroupKey, Branch[]>()
  for (const b of filteredBranches) {
    const g = groupOf(b.code)
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(b)
  }
  const showGrouped = sevFilter === 'all'

  const periodLabel = regionSnap.latest_month != null
    ? `ข้อมูลเดือน ${MONTH_SHORT[regionSnap.latest_month]} · รายงานแล้ว ${regionSnap.branches_reporting}/${regionSnap.branches_total} สาขา`
    : 'ยังไม่มีข้อมูลเดือนนี้'
  const { label: cumTrendLabel, color: cumTrendColor } = trendInfo(regionSnap.cum_trend_delta)
  const { label: latestTrendLabel } = trendInfo(regionSnap.latest_month_delta)
  const latestColor = regionSnap.latest_month_pct == null ? INK3 : regionSnap.latest_month_pct <= 20 ? '#1E7A5A' : regionSnap.latest_month_pct <= 25 ? '#A8721A' : '#B3392C'
  const targetColor = regionSnap.branches_reporting > 0 && regionSnap.branches_on_target === regionSnap.branches_reporting ? '#1E7A5A' : '#0B6E76'

  // ── ส่วนที่ใช้ซ้ำได้ทั้งเลย์เอาต์มือถือ (สแต็กเดียว) และเดสก์ท็อป (3 คอลัมน์) ──
  const listSection = (
    <div>
      <div style={{ fontSize: 12.5, color: INK2, fontWeight: 700, marginBottom: 8 }}>
        รายชื่อสาขาทั้งหมด <span style={{ color: INK3, fontWeight: 500 }}>({filteredBranches.length})</span>
      </div>
      <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(120px,1.4fr) 70px 140px', gap: 14, padding: '9px 16px', background: '#FAFBFC', borderBottom: `1px solid ${LINE}` }}>
            <span style={{ fontSize: 10.5, color: INK3, fontWeight: 700 }}>สาขา</span>
            <span style={{ fontSize: 10.5, color: INK3, fontWeight: 700 }}>ระดับ NRW% (เป้า 20%)</span>
            <span style={{ fontSize: 10.5, color: INK3, fontWeight: 700, textAlign: 'right' }}>สะสม</span>
            <span style={{ fontSize: 10.5, color: INK3, fontWeight: 700, textAlign: 'right' }}>แนวโน้ม</span>
          </div>
        )}

        {!filteredBranches.length && (
          <div style={{ textAlign: 'center', color: INK3, fontSize: 12, padding: '28px 0' }}>ไม่พบสาขา</div>
        )}

        {showGrouped
          ? STATUS_GROUPS.map(({ key, label, color }) => {
              const group = byGroup.get(key) ?? []
              if (!group.length) return null
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#FAFBFC', borderBottom: `1px solid ${LINE}` }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color, fontWeight: 700 }}>{label}</span>
                    <span style={{ fontSize: 10.5, color: INK3 }}>({group.length})</span>
                  </div>
                  {group.map((b) => (
                    <BranchRow key={b.id} branch={b} snap={snapMap[b.id]} compact={isMobile} onClick={() => loadBranch(b)} />
                  ))}
                </div>
              )
            })
          : filteredBranches.map((b) => (
              <BranchRow key={b.id} branch={b} snap={snapMap[b.id]} compact={isMobile} onClick={() => loadBranch(b)} />
            ))
        }
      </div>
    </div>
  )

  const watchSection = (
    <div>
      <div style={{ fontSize: 12.5, color: INK2, fontWeight: 700, marginBottom: 8 }}>
        ต้องจับตาเป็นพิเศษ{topConcerns.length > 0 ? ` (${worsening.length})` : ''}
      </div>
      {topConcerns.length === 0 ? (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#E7F3EE', border: '1px solid #CDE5DA', fontSize: 12.5, color: '#1E7A5A' }}>
          ✓ ไม่มีสาขาที่แนวโน้มแย่ลงเทียบปีก่อน (YoY)
        </div>
      ) : (
        <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
          {topConcerns.map((b) => (
            <BranchRow key={b.id} branch={b} snap={snapMap[b.id]} compact onClick={() => loadBranch(b)} />
          ))}
        </div>
      )}
    </div>
  )

  const ratsSection = <RatsRailSummary yearBe={now.getFullYear() + 543} month={now.getMonth() + 1} />

  const severityFilters = [
    { key: 'all' as SevFilter,     label: 'ทั้งหมด',   count: branches.length, color: INK2 },
    { key: 'track' as SevFilter,   label: 'ติดตาม',    count: trackCount,   color: GROUP_COLOR.track },
    { key: 'crit' as SevFilter,    label: 'วิกฤต',     count: critCount,    color: GROUP_COLOR.crit },
    { key: 'watch' as SevFilter,   label: 'เฝ้าระวัง', count: watchCount,   color: GROUP_COLOR.watch },
    { key: 'general' as SevFilter, label: 'ทั่วไป',    count: generalCount, color: GROUP_COLOR.general },
  ]

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: BG, fontFamily: SANS }}>
      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 20,
        height: isMobile ? 52 : 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 14px' : '0 28px',
        background: 'rgba(245,246,248,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${LINE}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{
            width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, flexShrink: 0,
            background: '#0B6E76', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width={isMobile ? 15 : 17} height={isMobile ? 15 : 17} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6">
              <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
              <path d="M9 12l2 2 4-4" strokeOpacity="0.85" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 14.5 : 16.5, color: INK, fontWeight: 700, letterSpacing: 0.1, lineHeight: 1.2 }}>บทสรุปผู้บริหาร</div>
            {!isMobile && <div style={{ fontSize: 11, color: INK3, marginTop: 1 }}>การประปาส่วนภูมิภาค เขต 10 · 26 สาขา</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {!isMobile && <div suppressHydrationWarning style={{ fontSize: 11, color: INK3 }}>{date}</div>}
          <div suppressHydrationWarning style={{ fontSize: isMobile ? 12 : 13, color: INK2, fontFamily: MONO, fontWeight: 600 }}>{time} น.</div>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: isMobile ? '18px 14px 40px' : '32px 40px 56px' }}>

        {!showSidebarLayout ? (
          <>
            {/* มือถือ + แท็บเล็ตทุกแนว (รวม iPad แนวนอน 1024–1180px) — รวมหน้าปัด + หัวข้อ + ตัวเลขรองไว้การ์ดเดียว
                sidebar แนวตั้ง 208px + rail 300px ของเดสก์ท็อปจะบีบคอลัมน์กลางจนพัง ถ้าจอไม่กว้างพอ (ดูค่า showSidebarLayout) */}
            <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 14, padding: '20px 18px', marginBottom: gap, boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: 200 }}>
                  <HeroDial pct={regionSnap.cum_pct} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                    <span style={{ fontSize: 34, fontWeight: 800, fontFamily: MONO, color: INK, lineHeight: 1 }}>
                      {regionSnap.cum_pct != null ? regionSnap.cum_pct.toFixed(1) : '—'}
                      <span style={{ fontSize: 14, color: INK3, marginLeft: 2 }}>%</span>
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: INK2, fontWeight: 600 }}>NRW% สะสมปีงบ ({regionSnap.cum_months} ด.)</div>
                <div style={{ fontSize: 11, color: cumTrendColor, marginTop: 2 }}>{cumTrendLabel}</div>
              </div>

              <h1 style={{ fontSize: 19, fontWeight: 700, color: worsening.length > 0 ? '#B3392C' : INK, margin: '18px 0 0', lineHeight: 1.35, textAlign: 'center' }}>
                {worsening.length} สาขามีแนวโน้มแย่ลง
              </h1>
              <p style={{ fontSize: 12, color: INK3, marginTop: 6, textAlign: 'center' }}>{periodLabel}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px 28px', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
                <StatChip label="NRW% เดือนล่าสุด" value={regionSnap.latest_month_pct != null ? regionSnap.latest_month_pct.toFixed(1) : '—'} unit="%" color={latestColor} sub={latestTrendLabel} />
                <StatChip label="น้ำจ่ายเดือนนี้" value={regionSnap.latest_month_produced != null ? Math.round(regionSnap.latest_month_produced).toLocaleString('th-TH') : '—'} unit="m³" color="#2B5C86" />
                <StatChip label="น้ำจำหน่ายเดือนนี้" value={regionSnap.latest_month_sold != null ? Math.round(regionSnap.latest_month_sold).toLocaleString('th-TH') : '—'} unit="m³" color="#1E7A5A" />
                <StatChip label="สาขาผ่านเป้า" value={`${regionSnap.branches_on_target}`} unit={`/ ${regionSnap.branches_reporting || regionSnap.branches_total}`} color={targetColor} />
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: gap - 8 }}>
              {severityFilters.map(({ key, label, count, color }) => (
                <SevPill key={key} active={sevFilter === key} onClick={() => setSevFilter(sevFilter === key ? 'all' : key)} label={label} count={count} color={color} />
              ))}
            </div>

            <div style={{ marginBottom: gap }}>{watchSection}</div>
            <div style={{ marginBottom: gap }}>{listSection}</div>
            <div style={{ marginBottom: gap }}>{ratsSection}</div>
          </>
        ) : (
          /* เดสก์ท็อป — โครง 3 คอลัมน์: sidebar (มาตรวัดย่อ+ตัวกรอง+สรุปเร็ว) | รายชื่อสาขา | rail (จับตา+RATS2) */
          <div style={{ display: 'grid', gridTemplateColumns: '208px 1fr 300px', gap: 24, alignItems: 'start', marginBottom: gap }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 76 }}>
              <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, padding: '16px 14px', boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
                <div style={{ position: 'relative' }}>
                  <HeroDial pct={regionSnap.cum_pct} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, fontFamily: MONO, color: INK, lineHeight: 1 }}>
                      {regionSnap.cum_pct != null ? regionSnap.cum_pct.toFixed(1) : '—'}
                      <span style={{ fontSize: 11, color: INK3, marginLeft: 1 }}>%</span>
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: INK2, fontWeight: 600, textAlign: 'center', marginTop: 2 }}>NRW% สะสม {regionSnap.cum_months} ด.</div>
                <div style={{ fontSize: 10.5, color: cumTrendColor, textAlign: 'center' }}>{cumTrendLabel}</div>
              </div>

              <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, padding: 10, boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
                {severityFilters.map(({ key, label, count, color }) => (
                  <VFilterRow key={key} active={sevFilter === key} onClick={() => setSevFilter(sevFilter === key ? 'all' : key)} label={label} count={count} color={color} total={branches.length} isTotal={key === 'all'} />
                ))}
              </div>

              <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
                <div style={{ fontSize: 9.5, color: INK3, fontFamily: MONO, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>สรุปเร็ว</div>
                <QuickRow label="NRW เดือนนี้" value={regionSnap.latest_month_pct != null ? `${regionSnap.latest_month_pct.toFixed(1)}%` : '—'} color={latestColor} />
                <QuickRow label="น้ำจ่ายเดือนนี้" value={fmtLossCompact(regionSnap.latest_month_produced)} color="#2B5C86" />
                <QuickRow label="น้ำจำหน่ายเดือนนี้" value={fmtLossCompact(regionSnap.latest_month_sold)} color="#1E7A5A" />
                <QuickRow label="ผ่านเป้า" value={`${regionSnap.branches_on_target}/${regionSnap.branches_reporting || regionSnap.branches_total}`} color={targetColor} />
              </div>
            </div>

            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: worsening.length > 0 ? '#B3392C' : INK, margin: 0, lineHeight: 1.35 }}>
                {worsening.length} สาขามีแนวโน้มแย่ลง
              </h1>
              <p style={{ fontSize: 12, color: INK3, marginTop: 6 }}>{periodLabel}</p>

              <div style={{ marginTop: 18 }}>{listSection}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {watchSection}
              {ratsSection}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 10.5, color: INK3, marginTop: 22 }}>
          NRW Tracker · ข้อมูล ณ {date} {time} น.
        </div>
      </main>

      {/* ── Loading overlay ── */}
      {pendingBranch && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(245,246,248,0.9)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <svg className="animate-spin" width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
              <circle cx="12" cy="12" r="10" stroke="#E3E7EC" strokeWidth="3" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="#0B6E76" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div style={{ fontSize: 13, color: INK2 }}>กำลังโหลดข้อมูลสาขา{pendingBranch.name_th}...</div>
          </div>
        </div>
      )}

      {/* ── Detail panel ── */}
      {loadedBranch && summaryData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden' }}>
          <BranchSummaryPanel
            data={summaryData}
            animKey={animKey}
            onBack={() => { setLoadedBranch(null); setSummaryData(null) }}
          />
        </div>
      )}
    </div>
  )
}
