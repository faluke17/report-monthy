'use client'

import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { CodeBadge } from '@/components/shared/CodeBadge'
import { Plan, Branch } from '@/lib/types'

type PlanRow = Plan & { branches?: Branch }

const PRIORITY_PILL: Record<string, string> = {
  'สูง':  'pill-bad',
  'กลาง': 'pill-warn',
  'ต่ำ':  'pill-gray',
}
const STATUS_PILL: Record<string, string> = {
  'รออนุมัติ':         'pill-warn',
  'ระหว่างดำเนินการ':  'pill-info',
  'สำเร็จ':            'pill-good',
  'ล่าช้า':            'pill-bad',
  'ยกเลิก':            'pill-gray',
}

const columns: ColumnDef<PlanRow>[] = [
  {
    key: 'code',
    header: 'รหัส',
    render: (r) => <CodeBadge code={r.code} />,
  },
  {
    key: 'branch',
    header: 'สาขา',
    render: (r) => (
      <div>
        <p className="font-bold text-white text-sm">{r.branches?.name_th}</p>
        <p className="text-[10px] text-white/35">{r.plan_type}</p>
      </div>
    ),
  },
  {
    key: 'approach_group',
    header: 'แนวทาง',
    render: (r) => <span className="text-sm text-white/70">{r.approach_group}</span>,
  },
  {
    key: 'target_nrw',
    header: 'เป้า NRW',
    render: (r) => (
      <div className="text-sm">
        <span className="num font-bold text-white">{r.target_nrw ?? '—'}%</span>
        {r.baseline_nrw && (
          <span className="text-white/35 text-[11px] ml-1">base: {r.baseline_nrw}%</span>
        )}
      </div>
    ),
  },
  {
    key: 'progress_pct',
    header: 'ความคืบหน้า',
    render: (r) => <ProgressBar value={r.progress_pct} showLabel size="sm" />,
  },
  {
    key: 'priority',
    header: 'ความสำคัญ',
    render: (r) => r.priority ? (
      <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PRIORITY_PILL[r.priority] ?? 'pill-gray'}`}>
        {r.priority}
      </span>
    ) : <span className="text-white/25">—</span>,
  },
  {
    key: 'status',
    header: 'สถานะ',
    render: (r) => (
      <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_PILL[r.status] ?? 'pill-gray'}`}>
        {r.status}
      </span>
    ),
  },
]

export function PlansTable({ data }: { data: PlanRow[] }) {
  return <DataTable data={data} columns={columns} emptyMessage="ยังไม่มีแผน" />
}
