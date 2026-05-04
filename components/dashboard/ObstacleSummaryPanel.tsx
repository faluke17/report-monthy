interface ObstacleStatusRow {
  status: string
  count: number
}

interface ObstacleSummaryPanelProps {
  total: number
  breakdown: ObstacleStatusRow[]
}

const STATUS_STYLE: Record<string, { label: string; bar: string }> = {
  'เกินกำหนด':  { label: 'text-red-400',    bar: 'bg-red-400' },
  'ล่าช้า':     { label: 'text-amber-400',  bar: 'bg-amber-400' },
  'รอสนับสนุน': { label: 'text-cyan-400',   bar: 'bg-cyan-400' },
  'ระหว่างแก้': { label: 'text-teal-400',   bar: 'bg-teal-400' },
  'รายงานใหม่': { label: 'text-white/50',   bar: 'bg-white/30' },
}

export function ObstacleSummaryPanel({ total, breakdown }: ObstacleSummaryPanelProps) {
  return (
    <div className="glass-card p-4 pt-5 relative overflow-hidden accent-bar-red">
      <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40 mb-2">
        อุปสรรคทั้งหมด
      </p>

      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="num text-3xl font-bold leading-none text-[#fb7185]">{total}</span>
        <span className="text-sm text-white/40 ml-0.5">รายการ</span>
      </div>
      <p className="text-[11px] text-white/30 mb-3">เฉพาะที่ยังไม่ปิดประเด็น</p>

      <div className="space-y-2">
        {breakdown.map(({ status, count }) => {
          const style = STATUS_STYLE[status] ?? { label: 'text-white/50', bar: 'bg-white/30' }
          const pct = total > 0 ? (count / total) * 100 : 0

          return (
            <div key={status} className="flex items-center gap-2">
              <span className={`text-[11px] w-20 shrink-0 ${style.label}`}>{status}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${style.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-white/60 w-5 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
