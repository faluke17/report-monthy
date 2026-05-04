'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { useRealtimeActionItems } from '@/hooks/useRealtimeData'
import { useRole } from '@/hooks/useRole'
import { useAppStore } from '@/store/useAppStore'
import { ActionItem } from '@/lib/types'
import { StatusPill } from '@/components/shared/StatusPill'
import { CodeBadge } from '@/components/shared/CodeBadge'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { formatThaiDate, isOverdue } from '@/lib/utils/date-th'

const KANBAN_COLUMNS = [
  { key: 'รอดำเนินการ',     label: 'รอดำเนินการ',     color: 'border-white/20' },
  { key: 'ระหว่างดำเนินการ', label: 'ระหว่างดำเนินการ', color: 'border-cyan-500/40' },
  { key: 'รออนุมัติ',       label: 'รออนุมัติ',        color: 'border-amber-500/40' },
  { key: 'แล้วเสร็จ',       label: 'แล้วเสร็จ',        color: 'border-green-500/40' },
]

export default function ActionPage() {
  const { branchId, isRegion } = useRole()
  const { actionViewMode, setActionViewMode } = useAppStore()
  const { data: actions, loading } = useRealtimeActionItems(isRegion ? null : branchId)

  const tableColumns: ColumnDef<ActionItem>[] = [
    { key: 'code', header: 'รหัส', render: (r) => <CodeBadge code={r.code} /> },
    {
      key: 'title',
      header: 'รายการ',
      render: (r) => <div className="text-sm text-white">{r.title}</div>,
    },
    { key: 'owner', header: 'ผู้รับผิดชอบ', render: (r) => <span className="text-sm text-white/70">{r.owner}</span> },
    {
      key: 'due_date',
      header: 'กำหนด',
      sortable: true,
      render: (r) => (
        <span className={`text-sm num ${isOverdue(r.due_date) && r.status !== 'แล้วเสร็จ' ? 'text-red-400' : 'text-white/60'}`}>
          {r.due_date ? formatThaiDate(r.due_date, true) : '—'}
        </span>
      ),
    },
    { key: 'status', header: 'สถานะ', render: (r) => <StatusPill status={r.status} /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Action Items</h1>
          <p className="text-sm text-white/50 mt-0.5">ติดตามรายการที่ต้องดำเนินการ</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-white/15 rounded-lg overflow-hidden">
            <button
              onClick={() => setActionViewMode('kanban')}
              className={`p-2 transition-colors ${actionViewMode === 'kanban' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
              title="Kanban view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setActionViewMode('table')}
              className={`p-2 transition-colors ${actionViewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
              title="Table view"
            >
              <List size={16} />
            </button>
          </div>
          <Link
            href="/action/new"
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            เพิ่มรายการ
          </Link>
        </div>
      </div>

      {actionViewMode === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colItems = actions.filter((a) => a.status === col.key)
            return (
              <div key={col.key} className={`glass-card-sm border-t-2 ${col.color} p-4 space-y-3`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">{col.label}</h3>
                  <span className="text-xs num bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                    {colItems.length}
                  </span>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
                  </div>
                ) : colItems.length === 0 ? (
                  <p className="text-xs text-white/25 text-center py-4">ไม่มีรายการ</p>
                ) : (
                  colItems.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white/5 rounded-lg p-3 border transition-colors hover:bg-white/10 ${
                        isOverdue(item.due_date) && item.status !== 'แล้วเสร็จ'
                          ? 'border-red-500/30'
                          : 'border-white/10'
                      }`}
                    >
                      <p className="text-sm text-white leading-snug">{item.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-white/40 font-mono">{item.owner}</span>
                        {item.due_date && (
                          <span className={`text-xs num ${isOverdue(item.due_date) && item.status !== 'แล้วเสร็จ' ? 'text-red-400' : 'text-white/40'}`}>
                            {formatThaiDate(item.due_date, true)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <DataTable
            data={actions}
            columns={tableColumns}
            loading={loading}
            emptyMessage="ไม่มี Action Items"
          />
        </div>
      )}
    </div>
  )
}
