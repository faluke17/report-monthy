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

// สาย mono ใช้เฉพาะตัวเลข/รหัสสาขา — sans ตามหลังกันตัวอักษรไทยไม่มี glyph ใน Space Mono
export const MONO = 'var(--font-mono), var(--font-sans)'
export const SANS = 'var(--font-sans)'
export const C = {
  bg:      '#F5F6F8',
  panel:   '#FFFFFF',
  border:  '#E3E7EC',
  borderH: '#AFC9C7',
  row:     '#EFF2F5',
  text:    '#3F4A56',
  bright:  '#12181F',
  muted:   '#6B7686',
  dim:     '#98A2AF',
  accent:  '#0B6E76',
  good:    '#1E7A5A',
  warn:    '#A8721A',
  crit:    '#B3392C',
  blue:    '#2B5C86',
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

// เดิมเป็นกรอบมุมสไตล์ cyber-HUD — ธีมใหม่ตัดออกเพื่อความสะอาด เหลือไว้เป็น no-op กันพัง call site เดิม
export function Corners(props: { c?: string; s?: number }) {
  void props
  return null
}

export function Bar({ pct, color = C.accent, thin = false }: { pct: number; color?: string; thin?: boolean }) {
  return (
    <div style={{ height: thin ? 4 : 6, background: C.row, borderRadius: 99, position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: 'width .6s ease' }} />
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
  MM: '#0B6E76', DMA: '#1E7A5A', SUB: '#6B4FA0', VD: '#A8721A',
}

export const ALERT: Record<string, { color: string; label: string }> = {
  red_spike:       { color: C.crit, label: 'ท่อแตก' },
  red_accumulated: { color: '#B85A50', label: 'รั่วซึม' },
  yellow:          { color: C.warn, label: 'เฝ้าดู' },
  green:           { color: C.good, label: 'ปกติ' },
}
export const PHASES      = ['ยังไม่เริ่ม','ราคากลาง','TOR','พิจารณาผล','เซ็นสัญญา','ดำเนินงาน','แล้วเสร็จ']
export const PHASE_COLOR = ['#8A94A3','#6B4FA0','#2B5C86','#4A6FA5','#A8721A','#0B6E76', C.good]
export const OBS_STATUS: Record<string, string> = {
  'รายงานใหม่': C.accent, 'ระหว่างแก้': C.warn, 'รอสนับสนุน': C.crit,
  'ล่าช้า': '#B5651D', 'เกินกำหนด': C.crit,
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 1px 2px rgba(18,24,31,0.05)', padding: '14px 16px', ...style }}>
      {children}
    </div>
  )
}
export function Sec({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: SANS, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
        {right}
      </div>
      <div style={{ height: 1, background: C.border, marginTop: 6 }} />
    </div>
  )
}
