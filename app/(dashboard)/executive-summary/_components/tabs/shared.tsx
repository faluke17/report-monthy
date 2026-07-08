import { useEffect, useState } from 'react'

export const THAI_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
export type Tab = 'overview' | 'dma' | 'obstacle' | 'mnf' | 'budget'

// < 768: มือถือ (สลับ layout เป็นแนวตั้ง), 768–1023: iPad/tablet (คง layout 2 คอลัมน์แต่แน่นกว่า desktop)
export function useBreakpoint() {
  const [w, setW] = useState(1280)
  useEffect(() => {
    const onResize = () => setW(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, isTouch: w < 1024, w }
}

export const MONO = 'IBM Plex Mono, monospace'
export const C = {
  bg:      '#04070F',
  panel:   'rgba(10,18,34,0.78)',
  border:  'rgba(34,211,238,0.18)',
  borderH: 'rgba(34,211,238,0.60)',
  row:     'rgba(34,211,238,0.06)',
  text:    '#D2DCE8',
  bright:  '#EAF0F8',
  muted:   '#8DAFC8',
  dim:     '#5A7390',
  accent:  '#22D3EE',
  good:    '#10D9B0',
  warn:    '#F59E0B',
  crit:    '#EF4444',
  blue:    '#3B82F6',
}

export function fmt(n: number | null, dec = 0) {
  if (n == null) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
export function nrwColor(p: number | null) {
  if (p == null) return C.muted
  return p <= 20 ? C.good : p <= 25 ? C.warn : C.crit
}
export function nrwLabel(p: number | null): [string, string] {
  if (p == null) return ['ไม่มีข้อมูล', C.muted]
  if (p <= 20) return ['ผ่านเป้าหมาย', C.good]
  if (p <= 25) return ['เฝ้าระวัง', C.warn]
  return ['วิกฤต', C.crit]
}

export function Corners({ c = C.borderH, s = 8 }: { c?: string; s?: number }) {
  const st: React.CSSProperties = { position: 'absolute', width: s, height: s }
  return (
    <>
      <span style={{ ...st, top: -1, left: -1,   borderTop: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
      <span style={{ ...st, top: -1, right: -1,  borderTop: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
      <span style={{ ...st, bottom: -1, left: -1,  borderBottom: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
      <span style={{ ...st, bottom: -1, right: -1, borderBottom: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
    </>
  )
}

export function Bar({ pct, color = C.accent, thin = false }: { pct: number; color?: string; thin?: boolean }) {
  return (
    <div style={{ height: thin ? 3 : 5, background: 'rgba(34,211,238,0.07)', position: 'relative' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, boxShadow: `0 0 6px ${color}88`, transition: 'width .6s ease' }} />
    </div>
  )
}

// relative=true (default): curr/prev เป็นปริมาตร → แสดง % การเปลี่ยนแปลง
// relative=false: curr/prev เป็นค่า % อยู่แล้ว (เช่น NRW%) → แสดงผลต่างเป็นจุดเปอร์เซ็นต์ตรงๆ ไม่ต้องหาร prev ซ้ำ
export function DeltaBadge({ curr, prev, lo = true, size = 'md', relative = true }: { curr: number | null; prev: number | null; lo?: boolean; size?: 'sm' | 'md' | 'lg'; relative?: boolean }) {
  if (curr == null || prev == null || (relative && prev === 0)) return <span style={{ color: C.muted, fontFamily: MONO, fontSize: size === 'lg' ? 22 : size === 'sm' ? 11 : 15 }}>—</span>
  const d = curr - prev
  const displayVal = relative ? (d / Math.abs(prev)) * 100 : d
  const good = lo ? d < 0 : d > 0
  const color = Math.abs(displayVal) < 0.5 ? C.muted : good ? C.good : C.crit
  const arrow = d > 0.3 ? '▲' : d < -0.3 ? '▼' : '→'
  const fs = size === 'lg' ? 28 : size === 'sm' ? 11 : 18
  return (
    <span style={{ color, fontFamily: MONO, fontWeight: 700, fontSize: fs }}>
      {arrow} {displayVal > 0 ? '+' : ''}{displayVal.toFixed(2)}%
    </span>
  )
}

export const TYPE_COLOR: Record<string, string> = {
  MM: '#22D3EE', DMA: '#10D9B0', SUB: '#A78BFA', VD: '#F59E0B',
}

export const ALERT: Record<string, { color: string; label: string }> = {
  red_spike:       { color: C.crit, label: 'ท่อแตก' },
  red_accumulated: { color: '#F1948A', label: 'รั่วซึม' },
  yellow:          { color: C.warn, label: 'เฝ้าดู' },
  green:           { color: C.good, label: 'ปกติ' },
}
export const PHASES      = ['ยังไม่เริ่ม','ราคากลาง','TOR','พิจารณาผล','เซ็นสัญญา','ดำเนินงาน','แล้วเสร็จ']
export const PHASE_COLOR = ['#4A5568','#9B59B6','#3498DB','#7F8FBF','#E0A020','#1ABC9C', C.good]
export const OBS_STATUS: Record<string, string> = {
  'รายงานใหม่': C.accent, 'ระหว่างแก้': C.warn, 'รอสนับสนุน': C.crit,
  'ล่าช้า': '#E67E22', 'เกินกำหนด': C.crit,
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', background: C.panel, border: `1px solid ${C.border}`, padding: '14px 16px', ...style }}>
      <Corners s={6} c={C.border} />
      {children}
    </div>
  )
}
export function Sec({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: C.accent, fontFamily: MONO, letterSpacing: 1.6, fontWeight: 700 }}>{'// '}{label}</span>
        {right}
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg,${C.borderH},transparent)`, marginTop: 6 }} />
    </div>
  )
}
