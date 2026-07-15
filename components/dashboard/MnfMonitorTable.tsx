import type { MnfAlertStatus, MnfEmaLatest } from '@/lib/types'

const STATUS_ORDER: Record<MnfAlertStatus, number> = {
  red_spike: 0,
  red_accumulated: 1,
  yellow: 2,
  green: 3,
}

const STATUS_LABEL: Record<MnfAlertStatus, string> = {
  red_spike:       'Alert ฉุกเฉิน',
  red_accumulated: 'Alert สะสม',
  yellow:          'เฝ้าระวัง',
  green:           'ปกติ',
}

function StatusBadge({ status }: { status: MnfAlertStatus }) {
  const isRed    = status === 'red_spike' || status === 'red_accumulated'
  const isYellow = status === 'yellow'

  const cls = isRed
    ? 'bg-red-500/15 text-red-400 border border-red-500/40 animate-pulse'
    : isYellow
    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    : 'bg-green-500/15 text-green-400 border border-green-500/20'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

interface Props {
  rows: MnfEmaLatest[]
}

export function MnfMonitorTable({ rows }: Props) {
  const sorted = [...rows].sort(
    (a, b) => STATUS_ORDER[a.alert_status] - STATUS_ORDER[b.alert_status],
  )

  if (sorted.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-black/30 text-sm">
        ยังไม่มีข้อมูล EMA — กรุณารัน mnf-sync ก่อน
      </div>
    )
  }

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-black/40 border-b border-black/10">
            <th className="text-left px-4 py-3 font-medium">สาขา</th>
            <th className="text-left px-4 py-3 font-medium">Node</th>
            <th className="text-left px-4 py-3 font-medium">วันที่ล่าสุด</th>
            <th className="text-right px-4 py-3 font-medium">MNF Flow</th>
            <th className="text-right px-4 py-3 font-medium">EMA-14</th>
            <th className="text-right px-4 py-3 font-medium">Diff%</th>
            <th className="text-right px-4 py-3 font-medium">ต่อเนื่อง</th>
            <th className="text-left px-4 py-3 font-medium">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const isRed = row.alert_status === 'red_spike' || row.alert_status === 'red_accumulated'
            const diffSign = row.diff_percent > 0 ? '+' : ''
            return (
              <tr
                key={`${row.dmama_branch_id}-${row.logger_id}`}
                className={`border-b border-black/5 hover:bg-black/5 ${isRed ? 'bg-red-500/5' : ''}`}
              >
                <td className="px-4 py-2.5 text-[#12181F] font-medium">{row.branch_name_th ?? String(row.dmama_branch_id)}</td>
                <td className="px-4 py-2.5 text-black/70">{row.node_label}</td>
                <td className="px-4 py-2.5 text-black/50">{row.record_date}</td>
                <td className="px-4 py-2.5 text-right text-black/70">
                  {row.mnf_flow != null ? row.mnf_flow.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-black/50">{row.ema_value.toFixed(2)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${isRed ? 'text-red-400' : row.alert_status === 'yellow' ? 'text-amber-400' : 'text-black/50'}`}>
                  {diffSign}{row.diff_percent.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right text-black/50">
                  {row.consecutive_count > 0 ? `${row.consecutive_count} วัน` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={row.alert_status} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
