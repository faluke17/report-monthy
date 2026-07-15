interface ObstacleStatusRow { status: string; count: number }
interface ObstacleSummaryPanelProps { total: number; breakdown: ObstacleStatusRow[] }

const STATUS_CFG: Record<string, { color: string; bar: string }> = {
  'เกินกำหนด':  { color: '#B3392C', bar: '#B3392C' },
  'ล่าช้า':     { color: '#A8721A', bar: '#A8721A' },
  'รอสนับสนุน': { color: '#0B6E76', bar: '#0B6E76' },
  'ระหว่างแก้': { color: '#0B6E76', bar: '#0B6E76' },
  'รายงานใหม่': { color: '#6B7686', bar: '#4B5563' },
}

export function ObstacleSummaryPanel({ total, breakdown }: ObstacleSummaryPanelProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,.96) 55%, rgba(179,57,44,.18) 100%)',
        border: '1px solid rgba(179,57,44,.20)',
        boxShadow: 'inset 4px 0 0 #B3392C, 0 4px 6px rgba(0,0,0,.40), 0 16px 48px rgba(0,0,0,.50)',
      }}
    >
      <div aria-hidden className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(179,57,44,.12) 0%, transparent 70%)' }} />

      <p className="relative text-[10px] font-bold tracking-[.14em] uppercase mb-1" style={{ color: '#4B5563', fontFamily: 'var(--font-mono)' }}>
        อุปสรรคทั้งหมด
      </p>

      <div className="relative flex items-baseline gap-2 mb-0.5">
        <span
          className="font-bold leading-none"
          style={{
            color: '#B3392C', fontSize: '44px', fontFamily: 'var(--font-mono)',
            letterSpacing: '-.02em',
            textShadow: '0 0 28px rgba(179,57,44,.50), 0 0 56px rgba(179,57,44,.28)',
          }}
        >
          {total}
        </span>
        <span className="text-[14px] font-semibold" style={{ color: '#B3392C', opacity: .55 }}>รายการ</span>
      </div>
      <p className="relative text-[11px] mb-4" style={{ color: '#4B5563' }}>เฉพาะที่ยังไม่ปิดประเด็น</p>

      <div className="relative space-y-2.5">
        {breakdown.map(({ status, count }) => {
          const cfg = STATUS_CFG[status] ?? { color: '#6B7686', bar: '#4B5563' }
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={status} className="flex items-center gap-3">
              <span className="text-[11px] w-20 shrink-0 font-medium" style={{ color: cfg.color }}>{status}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(11,110,118,.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: cfg.bar, boxShadow: `0 0 6px ${cfg.bar}55` }}
                />
              </div>
              <span className="text-[12px] font-bold w-5 text-right shrink-0" style={{ color: '#12181F', fontFamily: 'var(--font-mono)' }}>
                {count}
              </span>
            </div>
          )
        })}
      </div>

      <div aria-hidden className="absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(179,57,44,.22), transparent)' }} />
    </div>
  )
}
