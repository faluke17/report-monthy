interface Props {
  avgNrw: number | null
  totalAreas: number
  totalObstacles: number
  leaksRepaired: number
  leaksPending: number
}

export function BranchSummaryHeader({ avgNrw, totalAreas, totalObstacles, leaksRepaired, leaksPending }: Props) {
  const nrwColor =
    avgNrw == null ? 'text-black/30'
    : avgNrw <= 20 ? 'text-[#1E7A5A]'
    : avgNrw <= 25 ? 'text-[#A8721A]'
    : 'text-[#B3392C]'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="glass-card-sm p-4 accent-bar-cyan">
        <p className="text-[10px] text-black/40 mb-1 uppercase tracking-wide">NRW เฉลี่ย</p>
        <p className={`text-2xl font-bold num ${nrwColor}`}>
          {avgNrw != null ? `${avgNrw.toFixed(1)}%` : '—'}
        </p>
        <p className="text-[10px] text-black/30 mt-0.5">หลังดำเนินการ</p>
      </div>

      <div className="glass-card-sm p-4 accent-bar-teal">
        <p className="text-[10px] text-black/40 mb-1 uppercase tracking-wide">พื้นที่รายงาน</p>
        <p className="text-2xl font-bold num text-[#0B6E76]">{totalAreas}</p>
        <p className="text-[10px] text-black/30 mt-0.5">พื้นที่</p>
      </div>

      <div className="glass-card-sm p-4 accent-bar-amber">
        <p className="text-[10px] text-black/40 mb-1 uppercase tracking-wide">อุปสรรค</p>
        <p className={`text-2xl font-bold num ${totalObstacles > 0 ? 'text-[#A8721A]' : 'text-black/30'}`}>
          {totalObstacles}
        </p>
        <p className="text-[10px] text-black/30 mt-0.5">รายการ</p>
      </div>

      <div className="glass-card-sm p-4 accent-bar-green">
        <p className="text-[10px] text-black/40 mb-1 uppercase tracking-wide">ซ่อม / ค้าง</p>
        <p className="text-2xl font-bold num">
          <span className="text-[#1E7A5A]">{leaksRepaired}</span>
          <span className="text-sm text-black/30 mx-1">/</span>
          <span className="text-[#A8721A]">{leaksPending}</span>
        </p>
        <p className="text-[10px] text-black/30 mt-0.5">จุด</p>
      </div>
    </div>
  )
}
