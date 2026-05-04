import { MonthlyReport, Branch } from '@/lib/types'

interface TrafficLightGridProps {
  reports: MonthlyReport[]
  branches: Branch[]
  targetNrw?: number
}

export function TrafficLightGrid({ reports, branches, targetNrw = 20 }: TrafficLightGridProps) {
  function getLight(branchId: string): 'green' | 'yellow' | 'red' | 'grey' {
    const report = reports.find((r) => r.branch_id === branchId)
    if (!report || report.nrw_pct === null) return 'grey'
    if (report.nrw_pct <= targetNrw)     return 'green'
    if (report.nrw_pct <= targetNrw + 3) return 'yellow'
    return 'red'
  }

  const counts = {
    green:  branches.filter((b) => getLight(b.id) === 'green').length,
    yellow: branches.filter((b) => getLight(b.id) === 'yellow').length,
    red:    branches.filter((b) => getLight(b.id) === 'red').length,
    grey:   branches.filter((b) => getLight(b.id) === 'grey').length,
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
        <h3 className="text-sm font-bold text-white">Traffic Light — สถานะสาขา</h3>
      </div>

      {/* 4 cells */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { key: 'green',  count: counts.green,  label: 'ลดได้ตามเป้า',      cls: 'tl-green',  num: 'text-green-400' },
          { key: 'yellow', count: counts.yellow, label: 'ต้องติดตาม',         cls: 'tl-yellow', num: 'text-amber-400' },
          { key: 'red',    count: counts.red,    label: 'ไม่ลด / ต้อง Act',   cls: 'tl-red',    num: 'text-red-400'   },
          { key: 'grey',   count: counts.grey,   label: 'ยังไม่ส่งข้อมูล',   cls: 'tl-grey',   num: 'text-white/40'  },
        ].map(({ key, count, label, cls, num }) => (
          <div key={key} className={`${cls} rounded-xl border py-3 text-center`}>
            <div className={`num text-2xl font-bold leading-none ${num}`}>{count}</div>
            <div className={`text-[11px] mt-1 ${num} opacity-80`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Branch dots */}
      <div className="flex flex-wrap gap-1.5">
        {branches.map((branch) => {
          const light = getLight(branch.id)
          return (
            <div
              key={branch.id}
              title={`${branch.name_th} (${branch.code})`}
              className={`w-8 h-8 rounded-lg border text-[9px] flex items-center justify-center font-mono font-bold
                ${light === 'green'  ? 'tl-green  text-green-400'   : ''}
                ${light === 'yellow' ? 'tl-yellow text-amber-400'   : ''}
                ${light === 'red'    ? 'tl-red    text-red-400'     : ''}
                ${light === 'grey'   ? 'tl-grey   text-white/30'    : ''}
              `}
            >
              {branch.code.slice(0, 3)}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-white/25 mt-3">
        เกณฑ์: ดี = NRW ≤ {targetNrw}% · เตือน = ≤ {targetNrw + 3}% · ไม่ดี = เกิน {targetNrw + 3}%
      </p>
    </div>
  )
}
