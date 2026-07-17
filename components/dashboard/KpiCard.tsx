
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

// สีตัวเลข + คลาส accent-bar (globals.css) — ธีมสว่าง การ์ดพื้นขาวมี glass-card ให้อยู่แล้ว
const ACCENT: Record<AccentColor, { val: string; barClass: string }> = {
  sky:    { val: '#0B6E76', barClass: 'accent-bar-sky' },
  cyan:   { val: '#0B6E76', barClass: 'accent-bar-cyan' },
  teal:   { val: '#0B6E76', barClass: 'accent-bar-teal' },
  green:  { val: '#1E7A5A', barClass: 'accent-bar-green' },
  amber:  { val: '#A8721A', barClass: 'accent-bar-amber' },
  red:    { val: '#B3392C', barClass: 'accent-bar-red' },
  purple: { val: '#6B4FA0', barClass: 'accent-bar-purple' },
  blue:   { val: '#2B5C86', barClass: 'accent-bar-blue' },
}

export function KpiCard({
  label, value, unit, sub, delta, accentColor = 'blue', loading, invertDelta = false,
}: KpiCardProps) {
  const a = ACCENT[accentColor]

  const deltaGood = delta !== null && delta !== undefined
    ? (invertDelta ? delta >= 0 : delta <= 0)
    : null

  // Long volume figures (e.g. "-134,180") would blow past a narrow KPI
  // tile at a fixed 40px — shrink the digits to fit instead of overflowing.
  const valueLen = String(value).length
  const valueFontSize = valueLen > 10 ? '22px' : valueLen > 7 ? '28px' : '40px'

  return (
    <div className={`glass-card ${a.barClass} p-5 overflow-hidden`}>
      {/* Label */}
      <p
        className="text-[10px] font-bold tracking-[.14em] uppercase mb-3"
        style={{ color: '#6B7686', fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </p>

      {/* Value */}
      <div className="flex items-baseline flex-wrap gap-x-2 mb-1 min-w-0">
        {loading ? (
          <div
            className="h-10 w-32 rounded-xl animate-pulse"
            style={{ background: '#EFF2F5' }}
          />
        ) : (
          <>
            <span
              className="font-bold leading-none"
              style={{
                color: a.val,
                fontSize: valueFontSize,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-.02em',
              }}
            >
              {value}
            </span>
            {unit && (
              <span
                className="text-[14px] font-semibold"
                style={{ color: a.val, opacity: .65 }}
              >
                {unit}
              </span>
            )}
          </>
        )}
      </div>

      {/* Sub / Delta */}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        {sub && (
          <p className="text-[11px] leading-tight" style={{ color: '#6B7686' }}>
            {sub}
          </p>
        )}
        {delta !== null && delta !== undefined && !loading && (
          <span
            className="text-[11px] font-bold shrink-0"
            style={{
              color: deltaGood ? '#1E7A5A' : '#B3392C',
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
    </div>
  )
}
