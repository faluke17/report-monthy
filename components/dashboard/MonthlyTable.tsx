'use client'

import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { MonthlyReport, Branch } from '@/lib/types'
import { formatThaiMonthYear, formatThaiNumber } from '@/lib/utils/date-th'

type MonthlyRow = MonthlyReport & { branches?: Branch }

const PILL_CLS: Record<string, string> = {
  draft:     'pill-gray',
  submitted: 'pill-info',
  reviewed:  'pill-good',
}
const PILL_LABEL: Record<string, string> = {
  draft:     'แบบร่าง',
  submitted: 'ส่งแล้ว',
  reviewed:  'ตรวจสอบแล้ว',
}

const columns: ColumnDef<MonthlyRow>[] = [
  {
    key: 'period',
    header: 'เดือน',
    render: (r) => (
      <span className="num text-sm text-white">
        {formatThaiMonthYear(r.report_year, r.report_month)}
      </span>
    ),
  },
  {
    key: 'branch',
    header: 'สาขา',
    render: (r) => (
      <div>
        <p className="font-bold text-white text-sm">{r.branches?.name_th}</p>
        <p className="text-[10px] text-white/35 num">{r.branches?.code}</p>
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
    render: (r) => (
      <span className="num text-sm text-white/70">
        {r.volume_distributed !== null ? formatThaiNumber(r.volume_distributed, 0) : '—'}
      </span>
    ),
  },
  {
    key: 'leaks_found',
    header: 'จุดรั่ว พบ/ซ่อม',
    render: (r) => (
      <span className="num text-sm text-white/60">
        {r.leaks_found ?? 0} / {r.leaks_repaired ?? 0}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'สถานะ',
    render: (r) => (
      <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PILL_CLS[r.status] ?? 'pill-gray'}`}>
        {PILL_LABEL[r.status] ?? r.status}
      </span>
    ),
  },
]

export function MonthlyTable({ data }: { data: MonthlyRow[] }) {
  return <DataTable data={data} columns={columns} emptyMessage="ยังไม่มีรายงาน" />
}
