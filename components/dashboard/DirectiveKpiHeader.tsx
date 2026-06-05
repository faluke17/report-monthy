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

const ACCENT_STYLES: Record<AccentColor, { val: string; glow: string; gradient: string; border: string; blob: string; ring: string }> = {
  cyan:  { val: '#22D3EE', glow: 'rgba(34,211,238,.42)', gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(6,100,120,.22) 100%)', border: 'rgba(34,211,238,.20)', blob: 'rgba(34,211,238,.09)', ring: 'rgba(34,211,238,.50)' },
  teal:  { val: '#2DD4BF', glow: 'rgba(45,212,191,.40)', gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(17,94,89,.22) 100%)',  border: 'rgba(45,212,191,.20)', blob: 'rgba(45,212,191,.09)', ring: 'rgba(45,212,191,.50)' },
  amber: { val: '#FCD34D', glow: 'rgba(252,211,77,.50)',  gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(120,76,0,.24) 100%)',  border: 'rgba(252,211,77,.22)', blob: 'rgba(252,211,77,.10)', ring: 'rgba(252,211,77,.50)' },
  red:   { val: '#F87171', glow: 'rgba(248,113,113,.45)', gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(100,15,15,.28) 100%)', border: 'rgba(248,113,113,.22)', blob: 'rgba(248,113,113,.10)', ring: 'rgba(248,113,113,.50)' },
  green: { val: '#4ADE80', glow: 'rgba(74,222,128,.40)',  gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(20,83,45,.22) 100%)',  border: 'rgba(74,222,128,.20)', blob: 'rgba(74,222,128,.09)', ring: 'rgba(74,222,128,.50)' },
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
              'relative overflow-hidden rounded-2xl p-5 text-left transition-all',
              isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[.99]' : 'cursor-default',
            )}
            style={{
              background: a.gradient,
              border: isActive
                ? `2px solid ${a.ring}`
                : `1px solid ${a.border}`,
              boxShadow: isActive
                ? `0 0 0 1px rgba(255,255,255,.04) inset, 0 4px 6px rgba(0,0,0,.40), 0 0 20px ${a.ring}40`
                : `0 0 0 1px rgba(255,255,255,.03) inset, 0 4px 6px rgba(0,0,0,.40), 0 16px 48px rgba(0,0,0,.50)`,
            }}
          >
            <div
              aria-hidden
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${a.blob} 0%, transparent 70%)` }}
            />

            <p
              className="relative text-[10px] font-bold tracking-[.14em] uppercase mb-3"
              style={{ color: '#5B7AAF', fontFamily: 'var(--font-mono)' }}
            >
              {item.label}
              {isActive && (
                <span className="ml-1.5 text-[9px] normal-case tracking-normal opacity-70">● กรอง</span>
              )}
            </p>

            <div className="relative flex items-baseline gap-2 mb-1">
              <span
                className="font-bold leading-none"
                style={{
                  color: a.val,
                  fontSize: '40px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-.02em',
                  textShadow: `0 0 28px ${a.glow}, 0 0 56px ${a.glow}60`,
                }}
              >
                {item.value}
              </span>
              <span className="text-[14px] font-semibold" style={{ color: a.val, opacity: .60 }}>
                {item.unit}
              </span>
            </div>

            <p className="relative text-[11px] leading-tight mt-2.5" style={{ color: '#7B9CCC' }}>
              {item.sub}
            </p>

            <div
              aria-hidden
              className="absolute bottom-0 left-6 right-6 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${a.val}30, transparent)` }}
            />
          </button>
        )
      })}
    </div>
  )
}
