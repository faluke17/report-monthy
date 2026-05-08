import type { MnfAlertStatus } from '@/lib/types'

interface Props {
  counts: Record<MnfAlertStatus, number>
  totalNodes: number
}

export function MnfAlertSummaryBar({ counts, totalNodes }: Props) {
  const items = [
    { key: 'red_spike',      label: 'Alert ฉุกเฉิน', color: 'text-red-400',   bg: 'bg-red-500/15   border-red-500/30' },
    { key: 'red_accumulated',label: 'Alert สะสม',    color: 'text-red-400',   bg: 'bg-red-500/15   border-red-500/30' },
    { key: 'yellow',         label: 'เฝ้าระวัง',     color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
    { key: 'green',          label: 'ปกติ',           color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' },
  ] as const

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ key, label, color, bg }) => (
        <div key={key} className={`glass-card px-4 py-3 border ${bg} flex flex-col gap-1`}>
          <span className={`text-2xl font-bold ${color}`}>{counts[key] ?? 0}</span>
          <span className="text-xs text-white/60">{label}</span>
        </div>
      ))}
      <div className="glass-card px-4 py-3 border border-white/10 flex flex-col gap-1 sm:col-span-4">
        <span className="text-xs text-white/40">ทั้งหมด {totalNodes} node จาก 26 สาขา</span>
      </div>
    </div>
  )
}
