import { cn } from '@/lib/utils'

interface LeakSummaryPanelProps {
  leaksFound: number
  leaksRepaired: number
  leaksPending: number
  repairRatio: number
}

export function LeakSummaryPanel({ leaksFound, leaksRepaired, leaksPending, repairRatio }: LeakSummaryPanelProps) {
  const barColor =
    repairRatio >= 67 ? 'bg-green-400' :
    repairRatio >= 34 ? 'bg-amber-400' :
    'bg-red-400'

  return (
    <div className="glass-card p-4 pt-5 relative overflow-hidden accent-bar-teal">
      <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40 mb-2">
        จุดรั่วไหล ภาพรวมเขต
      </p>

      <div className="grid grid-cols-3 gap-2 my-3">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wide">พบ</span>
          <span className="num text-2xl font-bold text-[#7dd3fc]">{leaksFound}</span>
          <span className="text-[10px] text-white/30">จุด</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wide">ซ่อมแล้ว</span>
          <span className="num text-2xl font-bold text-[#4ade80]">{leaksRepaired}</span>
          <span className="text-[10px] text-white/30">จุด</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-white/40 uppercase tracking-wide">ค้างซ่อม</span>
          <span className={cn('num text-2xl font-bold', leaksPending > 0 ? 'text-[#f6c453]' : 'text-white/40')}>
            {leaksPending}
          </span>
          <span className="text-[10px] text-white/30">จุด</span>
        </div>
      </div>

      <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${repairRatio}%` }}
        />
      </div>
      <p className="text-[11px] text-white/35 mt-1.5">
        ซ่อมแล้ว {repairRatio}% ({leaksRepaired}/{leaksFound} จุด)
      </p>
    </div>
  )
}
