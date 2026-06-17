
type AccentColor = 'cyan' | 'teal' | 'amber' | 'red' | 'green' | 'purple' | 'blue' | 'sky'

interface KpiCardProps {
  label:        string
  value:        string | number
  unit?:        string
  sub?:         string
  delta?:       number | null
  accentColor?: AccentColor
  loading?:     boolean
  invertDelta?: boolean
}

const ACCENT: Record<AccentColor, {
  val:      string
  glow:     string
  gradient: string
  border:   string
  blob:     string
}> = {
  sky:    {
    val:      '#38BDF8',
    glow:     'rgba(56,189,248,.45)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(7,89,133,.22) 100%)',
    border:   'rgba(56,189,248,.22)',
    blob:     'rgba(56,189,248,.10)',
  },
  cyan:   {
    val:      '#22D3EE',
    glow:     'rgba(34,211,238,.42)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(6,100,120,.22) 100%)',
    border:   'rgba(34,211,238,.20)',
    blob:     'rgba(34,211,238,.09)',
  },
  teal:   {
    val:      '#2DD4BF',
    glow:     'rgba(45,212,191,.40)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(17,94,89,.22) 100%)',
    border:   'rgba(45,212,191,.20)',
    blob:     'rgba(45,212,191,.09)',
  },
  green:  {
    val:      '#4ADE80',
    glow:     'rgba(74,222,128,.40)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(20,83,45,.22) 100%)',
    border:   'rgba(74,222,128,.20)',
    blob:     'rgba(74,222,128,.09)',
  },
  amber:  {
    val:      '#FCD34D',
    glow:     'rgba(252,211,77,.50)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(120,76,0,.24) 100%)',
    border:   'rgba(252,211,77,.22)',
    blob:     'rgba(252,211,77,.10)',
  },
  red:    {
    val:      '#F87171',
    glow:     'rgba(248,113,113,.45)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(100,15,15,.28) 100%)',
    border:   'rgba(248,113,113,.22)',
    blob:     'rgba(248,113,113,.10)',
  },
  purple: {
    val:      '#C084FC',
    glow:     'rgba(192,132,252,.42)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(76,29,149,.24) 100%)',
    border:   'rgba(192,132,252,.20)',
    blob:     'rgba(192,132,252,.09)',
  },
  blue:   {
    val:      '#93C5FD',
    glow:     'rgba(147,197,253,.38)',
    gradient: 'linear-gradient(135deg, rgba(8,18,44,.96) 55%, rgba(30,64,175,.22) 100%)',
    border:   'rgba(147,197,253,.20)',
    blob:     'rgba(147,197,253,.08)',
  },
}

export function KpiCard({
  label, value, unit, sub, delta, accentColor = 'blue', loading, invertDelta = false,
}: KpiCardProps) {
  const a = ACCENT[accentColor]

  const deltaGood = delta !== null && delta !== undefined
    ? (invertDelta ? delta >= 0 : delta <= 0)
    : null

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: a.gradient,
        border: `1px solid ${a.border}`,
        boxShadow: `0 0 0 1px rgba(255,255,255,.03) inset, 0 4px 6px rgba(0,0,0,.40), 0 16px 48px rgba(0,0,0,.50)`,
      }}
    >
      {/* Decorative blob — top-right corner */}
      <div
        aria-hidden
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${a.blob} 0%, transparent 70%)` }}
      />

      {/* Label */}
      <p
        className="relative text-[10px] font-bold tracking-[.14em] uppercase mb-3"
        style={{ color: '#5B7AAF', fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </p>

      {/* Value */}
      <div className="relative flex items-baseline gap-2 mb-1">
        {loading ? (
          <div
            className="h-10 w-32 rounded-xl animate-pulse"
            style={{ background: 'rgba(71,130,255,.10)' }}
          />
        ) : (
          <>
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
              {value}
            </span>
            {unit && (
              <span
                className="text-[14px] font-semibold"
                style={{ color: a.val, opacity: .60 }}
              >
                {unit}
              </span>
            )}
          </>
        )}
      </div>

      {/* Sub / Delta */}
      <div className="relative flex items-center justify-between mt-2.5 gap-2">
        {sub && (
          <p className="text-[11px] leading-tight" style={{ color: '#7B9CCC' }}>
            {sub}
          </p>
        )}
        {delta !== null && delta !== undefined && !loading && (
          <span
            className="text-[11px] font-bold shrink-0"
            style={{
              color: deltaGood ? '#4ADE80' : '#F87171',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {delta === 0
              ? '─'
              : deltaGood
                ? `▼ ${Math.abs(delta).toFixed(2)}`
                : `▲ ${Math.abs(delta).toFixed(2)}`
            }
          </span>
        )}
      </div>

      {/* Subtle bottom glow line */}
      <div
        aria-hidden
        className="absolute bottom-0 left-6 right-6 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${a.val}30, transparent)` }}
      />
    </div>
  )
}
