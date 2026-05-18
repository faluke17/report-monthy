interface Props {
  avgNrw: number | null
  totalAreas: number
  totalObstacles: number
  leaksRepaired: number
  leaksPending: number
}

export function BranchSummaryHeader({ avgNrw, totalAreas, totalObstacles, leaksRepaired, leaksPending }: Props) {
  const nrwColor =
    avgNrw == null ? 'text-white/30'
    : avgNrw <= 20 ? 'text-green-400'
    : avgNrw <= 25 ? 'text-amber-400'
    : 'text-red-400'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="glass-card-sm p-4 accent-bar-cyan">
        <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">NRW เฉลี่ย</p>
        <p className={`text-2xl font-bold num ${nrwColor}`}>
          {avgNrw != null ? `${avgNrw.toFixed(1)}%` : '—'}
        </p>
        <p className="text-[10px] text-white/30 mt-0.5">หลังดำเนินการ</p>
      </div>

      <div className="glass-card-sm p-4 accent-bar-teal">
        <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">พื้นที่รายงาน</p>
        <p className="text-2xl font-bold num text-[#2dd4bf]">{totalAreas}</p>
        <p className="text-[10px] text-white/30 mt-0.5">พื้นที่</p>
      </div>

      <div className="glass-card-sm p-4 accent-bar-amber">
        <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">อุปสรรค</p>
        <p className={`text-2xl font-bold num ${totalObstacles > 0 ? 'text-amber-400' : 'text-white/30'}`}>
          {totalObstacles}
        </p>
        <p className="text-[10px] text-white/30 mt-0.5">รายการ</p>
      </div>

      <div className="glass-card-sm p-4 accent-bar-green">
        <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wide">ซ่อม / ค้าง</p>
        <p className="text-2xl font-bold num">
          <span className="text-green-400">{leaksRepaired}</span>
          <span className="text-sm text-white/30 mx-1">/</span>
          <span className="text-yellow-400">{leaksPending}</span>
        </p>
        <p className="text-[10px] text-white/30 mt-0.5">จุด</p>
      </div>
    </div>
  )
}
