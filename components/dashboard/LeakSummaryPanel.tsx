interface LeakSummaryPanelProps {
  leaksFound:    number
  leaksRepaired: number
  leaksPending:  number
  repairRatio:   number
}

export function LeakSummaryPanel({ leaksFound, leaksRepaired, leaksPending, repairRatio }: LeakSummaryPanelProps) {
  const accent  = repairRatio >= 67 ? '#1E7A5A' : repairRatio >= 34 ? '#A8721A' : '#B3392C'
  const bgTint  = repairRatio >= 67 ? 'rgba(30,122,90,.10)' : repairRatio >= 34 ? 'rgba(168,114,26,.10)' : 'rgba(179,57,44,.10)'
  const barClr  = repairRatio >= 67 ? '#1E7A5A' : repairRatio >= 34 ? '#A8721A' : '#B3392C'

  const COLS = [
    { label: 'พบ',       value: leaksFound,    color: '#0B6E76' },
    { label: 'ซ่อมแล้ว', value: leaksRepaired, color: '#1E7A5A' },
    { label: 'ค้างซ่อม', value: leaksPending,  color: leaksPending > 0 ? '#A8721A' : '#8896A3' },
  ]

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background: `linear-gradient(135deg, rgba(0,0,0,.96) 55%, ${bgTint} 100%)`,
        border: `1px solid ${accent}22`,
        boxShadow: `inset 4px 0 0 ${accent}, 0 4px 6px rgba(0,0,0,.40), 0 16px 48px rgba(0,0,0,.50)`,
      }}
    >
      <div aria-hidden className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)` }} />

      <p className="relative text-[10px] font-bold tracking-[.14em] uppercase mb-4" style={{ color: '#4B5563', fontFamily: 'var(--font-mono)' }}>
        จุดรั่วไหล ภาพรวมเขต
      </p>

      <div className="relative grid grid-cols-3 gap-2 mb-5">
        {COLS.map(({ label, value, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-xl py-3"
            style={{ background: 'rgba(11,110,118,.06)', border: '1px solid rgba(11,110,118,.10)' }}
          >
            <span className="text-[10px] uppercase tracking-wide" style={{ color: '#8896A3' }}>{label}</span>
            <span
              className="font-bold leading-none"
              style={{ color, fontSize: '28px', fontFamily: 'var(--font-mono)', textShadow: `0 0 16px ${color}44` }}
            >
              {value}
            </span>
            <span className="text-[10px]" style={{ color: '#8896A3' }}>จุด</span>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="relative">
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(11,110,118,.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${repairRatio}%`, background: barClr, boxShadow: `0 0 10px ${barClr}55` }}
          />
        </div>
        <p className="text-[11px] mt-2" style={{ color: '#4B5563' }}>
          ซ่อมแล้ว
          <span className="font-bold mx-1" style={{ color: accent, fontFamily: 'var(--font-mono)' }}>
            {repairRatio}%
          </span>
          ({leaksRepaired}/{leaksFound} จุด)
        </p>
      </div>

      <div aria-hidden className="absolute bottom-0 left-6 right-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}22, transparent)` }} />
    </div>
  )
}
