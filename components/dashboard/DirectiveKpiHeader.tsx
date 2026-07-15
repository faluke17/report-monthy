import { cn } from '@/lib/utils'
import type { DirectiveKpis } from '@/lib/types'

type StatusFilter = 'all' | 'ระหว่างดำเนินการ' | 'ล่าช้า' | 'แล้วเสร็จ'

type AccentColor = 'cyan' | 'teal' | 'amber' | 'red' | 'green'

interface KpiItem {
  label: string
  value: number
  unit: string
  sub: string
  accent: AccentColor
  filter: StatusFilter
}

// ธีมสว่าง — พื้นการ์ดขาว บาร์สีซ้าย (ตรงกับ .accent-bar-* ใน globals.css) แทน gradient เข้ม+glow เดิม
const ACCENT_STYLES: Record<AccentColor, { val: string; border: string; soft: string; ring: string }> = {
  cyan:  { val: '#0B6E76', border: 'rgba(11,110,118,.35)', soft: 'rgba(11,110,118,.08)', ring: '#0B6E76' },
  teal:  { val: '#0B6E76', border: 'rgba(11,110,118,.35)', soft: 'rgba(11,110,118,.08)', ring: '#0B6E76' },
  amber: { val: '#A8721A', border: 'rgba(168,114,26,.35)', soft: 'rgba(168,114,26,.08)', ring: '#A8721A' },
  red:   { val: '#B3392C', border: 'rgba(179,57,44,.35)',  soft: 'rgba(179,57,44,.08)',  ring: '#B3392C' },
  green: { val: '#1E7A5A', border: 'rgba(30,122,90,.35)',  soft: 'rgba(30,122,90,.08)',  ring: '#1E7A5A' },
}

interface Props {
  kpis: DirectiveKpis
  activeFilter?: StatusFilter
  onFilterChange?: (f: StatusFilter) => void
}

export function DirectiveKpiHeader({ kpis, activeFilter = 'all', onFilterChange }: Props) {
  const items: KpiItem[] = [
    { label: 'ทั้งหมด',        value: kpis.total,        unit: 'ข้อ', sub: 'มติสั่งการ',       accent: 'cyan',  filter: 'all' },
    { label: 'กำลังดำเนินการ', value: kpis.on_track,     unit: 'ข้อ', sub: 'ตามกำหนดเวลา',    accent: 'teal',  filter: 'ระหว่างดำเนินการ' },
    { label: 'ล่าช้า',         value: kpis.delayed,      unit: 'ข้อ', sub: 'เกินกำหนดวัน',    accent: 'red',   filter: 'ล่าช้า' },
    { label: 'แล้วเสร็จ',      value: kpis.completed,    unit: 'ข้อ', sub: 'ปิดประเด็นแล้ว',  accent: 'green', filter: 'แล้วเสร็จ' },
    { label: 'ไม่ตอบสนอง',    value: kpis.unresponsive,  unit: 'ข้อ', sub: 'ไม่อัพเดต >7 วัน', accent: 'amber', filter: 'all' },
  ]

  function handleClick(filter: StatusFilter) {
    if (!onFilterChange) return
    onFilterChange(activeFilter === filter ? 'all' : filter)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {items.map(item => {
        const a = ACCENT_STYLES[item.accent]
        const isActive = activeFilter === item.filter && item.filter !== 'all'
        const isClickable = !!onFilterChange && item.filter !== 'all'

        return (
          <button
            key={item.label}
            onClick={() => handleClick(item.filter)}
            disabled={!isClickable}
            className={cn(
              'glass-card text-left transition-all p-5',
              isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[.99]' : 'cursor-default',
            )}
            style={{
              background: isActive ? a.soft : '#FFFFFF',
              border: isActive ? `2px solid ${a.ring}` : `1px solid ${a.border}`,
            }}
          >
            <p
              className="text-[10px] font-bold tracking-[.14em] uppercase mb-3"
              style={{ color: '#6B7686', fontFamily: 'var(--font-mono)' }}
            >
              {item.label}
              {isActive && (
                <span className="ml-1.5 text-[9px] normal-case tracking-normal opacity-70">● กรอง</span>
              )}
            </p>

            <div className="flex items-baseline gap-2 mb-1">
              <span
                className="font-bold leading-none"
                style={{
                  color: a.val,
                  fontSize: '40px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-.02em',
                }}
              >
                {item.value}
              </span>
              <span className="text-[14px] font-semibold" style={{ color: a.val, opacity: .65 }}>
                {item.unit}
              </span>
            </div>

            <p className="text-[11px] leading-tight mt-2.5" style={{ color: '#6B7686' }}>
              {item.sub}
            </p>
          </button>
        )
      })}
    </div>
  )
}
