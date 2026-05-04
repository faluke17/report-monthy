'use client'

import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { MonthlyReport, Branch } from '@/lib/types'
import { formatThaiNumber } from '@/lib/utils/date-th'

type RankRow = MonthlyReport & { rank: number; branches?: Branch }

const PILL_CLS: Record<string, string> = {
  'ลดชัด':   'pill-good',
  'ใกล้เป้า': 'pill-warn',
  'ไม่ลด':   'pill-bad',
  'ไม่มีข้อมูล': 'pill-gray',
}

function getStatus(nrw: number | null) {
  if (nrw === null) return 'ไม่มีข้อมูล'
  if (nrw <= 20)   return 'ลดชัด'
  if (nrw <= 23)   return 'ใกล้เป้า'
  return 'ไม่ลด'
}

const columns: ColumnDef<RankRow>[] = [
  {
    key: 'rank',
    header: '#',
    render: (r) => <span className="num text-white/40 text-sm">#{r.rank}</span>,
  },
  {
    key: 'branch',
    header: 'สาขา',
    render: (r) => (
      <div>
        <p className="font-bold text-white text-sm">{r.branches?.name_th}</p>
        <p className="text-[10px] text-white/35 num mt-0.5">{r.branches?.code} · {r.branches?.province_th}</p>
      </div>
    ),
  },
  {
    key: 'nrw_pct',
    header: 'NRW (%)',
    sortable: true,
    render: (r) => {
      const nrw = r.nrw_pct
      const color = nrw === null ? 'text-white/25' : nrw > 20 ? 'text-red-400' : 'text-green-400'
      return (
        <div className="space-y-1">
          <span className={`num font-bold text-sm ${color}`}>
            {nrw !== null ? formatThaiNumber(nrw) + '%' : '—'}
          </span>
          {nrw !== null && (
            <div className="prog-bg" style={{ minWidth: 60 }}>
              <div
                className={`prog-fill ${nrw <= 20 ? 'prog-good' : nrw <= 23 ? 'prog-warn' : 'prog-bad'}`}
                style={{ width: `${Math.min(nrw / 80 * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      )
    },
  },
  {
    key: 'volume_distributed',
    header: 'น้ำจ่าย (ลบ.ม.)',
    sortable: true,
    render: (r) => (
      <span className="num text-white/70 text-sm">
        {r.volume_distributed !== null ? formatThaiNumber(r.volume_distributed, 0) : '—'}
      </span>
    ),
  },
  {
    key: 'mnf_factor',
    header: 'MNF Factor',
    sortable: true,
    render: (r) => (
      <span className={`num text-sm ${(r.mnf_factor ?? 0) > 0.5 ? 'text-amber-400' : 'text-white/70'}`}>
        {r.mnf_factor !== null ? r.mnf_factor.toFixed(3) : '—'}
      </span>
    ),
  },
  {
    key: 'leaks_found',
    header: 'จุดรั่ว พบ/ซ่อม',
    render: (r) => (
      <span className="num text-white/60 text-sm">
        {r.leaks_found ?? 0} / {r.leaks_repaired ?? 0}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'สถานะ',
    render: (r) => {
      const s = getStatus(r.nrw_pct)
      return (
        <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PILL_CLS[s] ?? 'pill-gray'}`}>
          {s}
        </span>
      )
    },
  },
]

interface RankingTableProps {
  data: RankRow[]
}

export function RankingTable({ data }: RankingTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      emptyMessage="ยังไม่มีสาขาส่งรายงานเดือนนี้"
    />
  )
}
