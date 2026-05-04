import { cn } from '@/lib/utils'

type AccentColor = 'cyan' | 'teal' | 'amber' | 'red' | 'green' | 'purple'

interface KpiCardProps {
  label: string
  value: string | number
  unit?: string
  sub?: string
  delta?: number | null
  accentColor?: AccentColor
  loading?: boolean
  invertDelta?: boolean
}

const ACCENT: Record<AccentColor, { bar: string; val: string }> = {
  cyan:   { bar: 'accent-bar-cyan',   val: 'text-[#7dd3fc]' },
  teal:   { bar: 'accent-bar-teal',   val: 'text-[#2dd4bf]' },
  amber:  { bar: 'accent-bar-amber',  val: 'text-[#f6c453]' },
  red:    { bar: 'accent-bar-red',    val: 'text-[#fb7185]' },
  green:  { bar: 'accent-bar-green',  val: 'text-[#4ade80]' },
  purple: { bar: 'accent-bar-purple', val: 'text-[#a5b4fc]' },
}

export function KpiCard({
  label, value, unit, sub, delta, accentColor = 'cyan', loading, invertDelta = false,
}: KpiCardProps) {
  const { bar, val } = ACCENT[accentColor]

  const deltaGood = delta !== null && delta !== undefined
    ? (invertDelta ? delta >= 0 : delta <= 0)
    : null

  return (
    <div className={cn('glass-card p-4 pt-5 relative overflow-hidden', bar)}>
      <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40 mb-2">{label}</p>

      <div className="flex items-baseline gap-1.5">
        {loading ? (
          <div className="h-8 w-28 bg-white/10 rounded animate-pulse" />
        ) : (
          <>
            <span className={cn('num text-3xl font-bold leading-none', val)}>{value}</span>
            {unit && <span className="text-sm text-white/40 ml-0.5">{unit}</span>}
          </>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5 gap-2">
        {sub && <p className="text-[11px] text-white/35 leading-tight">{sub}</p>}
        {delta !== null && delta !== undefined && !loading && (
          <span className={cn(
            'num text-[11px] font-bold shrink-0',
            deltaGood ? 'text-green-400' : 'text-red-400'
          )}>
            {delta === 0 ? '—' : deltaGood ? `▼ ${Math.abs(delta).toFixed(2)}` : `▲ ${Math.abs(delta).toFixed(2)}`}
          </span>
        )}
      </div>
    </div>
  )
}
