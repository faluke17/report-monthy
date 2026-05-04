import { cn } from '@/lib/utils'
import { getBranchByCostcenter } from '@/lib/utils/pwa-branches'

interface BranchReadStat {
  ba: number
  read_count: number
  cust_count: number
  target: number
}

interface RatsReadingPanelProps {
  stats: BranchReadStat[]
  yearBe: number
  month: number
}

const THAI_MONTH_SHORT: Record<number, string> = {
  1: 'ม.ค.', 2: 'ก.พ.', 3: 'มี.ค.', 4: 'เม.ย.',
  5: 'พ.ค.', 6: 'มิ.ย.', 7: 'ก.ค.', 8: 'ส.ค.',
  9: 'ก.ย.', 10: 'ต.ค.', 11: 'พ.ย.', 12: 'ธ.ค.',
}

const RANK_COLORS = [
  { ring: 'ring-[#d8b45a]', badge: 'bg-[#d8b45a]/20 text-[#d8b45a]', bar: 'bg-[#d8b45a]' },
  { ring: 'ring-[#9ca3af]', badge: 'bg-[#9ca3af]/20 text-[#9ca3af]', bar: 'bg-[#9ca3af]' },
  { ring: 'ring-[#b45309]', badge: 'bg-[#b45309]/30 text-[#fb923c]', bar: 'bg-[#fb923c]' },
  { ring: 'ring-white/10',  badge: 'bg-white/8 text-white/50',        bar: 'bg-[#7dd3fc]' },
  { ring: 'ring-white/10',  badge: 'bg-white/8 text-white/50',        bar: 'bg-[#7dd3fc]' },
]

export function RatsReadingPanel({ stats, yearBe, month }: RatsReadingPanelProps) {
  const label = `${THAI_MONTH_SHORT[month]} ${yearBe}`

  const started    = stats.filter((s) => s.read_count > 0)
  const notStarted = stats.filter((s) => s.read_count === 0)
  const total      = stats.length
  const pct        = total > 0 ? Math.round((started.length / total) * 100) : 0

  const top5 = [...stats]
    .sort((a, b) => b.read_count - a.read_count)
    .slice(0, 5)

  const maxRead = top5[0]?.read_count ?? 1

  return (
    <div className="glass-card p-5 pt-6 relative overflow-hidden accent-bar-purple">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40">
            การจดมาตร RATS2
          </p>
          <p className="text-base font-semibold text-white/80 mt-0.5">เดือน {label}</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#a5b4fc]/10 text-[#a5b4fc] ring-1 ring-[#a5b4fc]/25">
          {total} สาขา
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Left: summary ── */}
        <div className="space-y-4">
          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#4ade80]/8 ring-1 ring-[#4ade80]/20 px-4 py-3 flex flex-col gap-1">
              <p className="text-[10px] text-white/40 uppercase tracking-wide">เริ่มดำเนินการ</p>
              <div className="flex items-baseline gap-1.5">
                <span className="num text-3xl font-bold text-[#4ade80]">{started.length}</span>
                <span className="text-xs text-white/35">สาขา</span>
              </div>
            </div>
            <div className={cn(
              'rounded-xl px-4 py-3 flex flex-col gap-1 ring-1',
              notStarted.length > 0
                ? 'bg-[#fb7185]/8 ring-[#fb7185]/20'
                : 'bg-white/5 ring-white/10'
            )}>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">ยังไม่ดำเนินการ</p>
              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  'num text-3xl font-bold',
                  notStarted.length > 0 ? 'text-[#fb7185]' : 'text-white/40'
                )}>
                  {notStarted.length}
                </span>
                <span className="text-xs text-white/35">สาขา</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-[11px] text-white/40">ความครอบคลุม</p>
              <p className="text-[11px] font-bold text-[#a5b4fc]">{pct}%</p>
            </div>
            <div className="h-2.5 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#a5b4fc] to-[#7dd3fc] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1.5">
              {started.length} จาก {total} สาขาเริ่มจดมาตรแล้ว
            </p>
          </div>

          {/* Not-started badges */}
          {notStarted.length > 0 && (
            <div>
              <p className="text-[10px] text-white/35 mb-1.5 uppercase tracking-wide">สาขาที่ยังไม่เริ่ม</p>
              <div className="flex flex-wrap gap-1.5">
                {notStarted.map((s) => (
                  <span
                    key={s.ba}
                    className="px-2 py-0.5 rounded bg-[#fb7185]/10 ring-1 ring-[#fb7185]/20 text-[11px] text-[#fb7185]/80"
                  >
                    {getBranchByCostcenter(String(s.ba))?.name_th ?? `BA ${s.ba}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: TOP 5 ── */}
        <div>
          <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40 mb-3">
            TOP 5 — บันทึกมากที่สุด
          </p>
          <div className="space-y-2.5">
            {top5.map((s, i) => {
              const c = RANK_COLORS[i]
              const barPct = maxRead > 0 ? (s.read_count / maxRead) * 100 : 0
              const targetPct = s.target > 0 ? Math.min(Math.round((s.read_count / s.target) * 100), 999) : 0
              return (
                <div key={s.ba} className="flex items-center gap-3">
                  {/* Rank badge */}
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ring-1',
                    c.badge, c.ring
                  )}>
                    {i + 1}
                  </span>

                  {/* Bar + label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[11px] text-white/70 font-medium">
                        {getBranchByCostcenter(String(s.ba))?.name_th ?? `BA ${s.ba}`}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="num text-[12px] font-bold text-white/90">{s.read_count.toLocaleString()}</span>
                        <span className="text-[10px] text-white/30">/ {s.target}</span>
                        <span className={cn(
                          'text-[10px] font-bold px-1 rounded',
                          targetPct >= 100 ? 'text-[#4ade80]' : 'text-[#f6c453]'
                        )}>
                          {targetPct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', c.bar)}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
