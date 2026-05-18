'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AreaDetailSheetBody, AreaReport } from './AreaReportTable'
import { Branch } from '@/lib/types'

export interface BranchSummaryItem {
  branch_id: string
  name_th: string
  code: string
  areaCount: number
  submitted: boolean
  avgNrwAfter: number | null
  highPriorityObstacles: number
  totalObstacles: number
}

interface Props {
  branches: Branch[]
  summaries: BranchSummaryItem[]
  allRows: AreaReport[]
  canDelete: boolean
}

export function BranchSummaryGrid({ summaries, allRows, canDelete }: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)

  const sheetReports = selectedBranchId
    ? allRows.filter((r) => r.branch_id === selectedBranchId)
    : []

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {summaries.map((s) => {
          const nrwColor =
            s.avgNrwAfter == null ? 'text-white/25'
            : s.avgNrwAfter <= 20 ? 'text-green-400'
            : s.avgNrwAfter <= 25 ? 'text-amber-400'
            : 'text-red-400'

          const hasHighPrio = s.highPriorityObstacles > 0

          return (
            <button
              key={s.branch_id}
              onClick={() => s.submitted && setSelectedBranchId(s.branch_id)}
              disabled={!s.submitted}
              className={`glass-card-sm p-4 text-left space-y-2.5 transition-all text-sm w-full
                ${s.submitted
                  ? `hover:border-cyan-500/30 hover:bg-white/5 cursor-pointer ${hasHighPrio ? 'border-red-500/25' : ''}`
                  : 'opacity-40 cursor-default'
                }`}
            >
              {/* Code + status pill */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold num bg-white/10 px-1.5 py-0.5 rounded text-white/50 shrink-0">
                  {s.code}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                  s.submitted
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-white/30'
                }`}>
                  {s.submitted ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}
                </span>
              </div>

              {/* Branch name */}
              <p className="text-sm font-semibold text-white leading-tight">{s.name_th}</p>

              {/* NRW */}
              {s.submitted ? (
                <p className={`text-xl font-bold num ${nrwColor}`}>
                  {s.avgNrwAfter != null ? `${s.avgNrwAfter.toFixed(1)}%` : '—'}
                </p>
              ) : (
                <p className="text-sm text-white/20">ไม่มีข้อมูล</p>
              )}

              {/* Footer: areas + obstacles */}
              <div className="flex items-center gap-2 text-[10px] text-white/40">
                {s.submitted && <span>{s.areaCount} พื้นที่</span>}
                {s.totalObstacles > 0 && (
                  <span className={`flex items-center gap-0.5 font-bold ${
                    hasHighPrio ? 'text-red-300' : 'text-amber-300'
                  }`}>
                    <AlertTriangle size={9} />
                    {s.totalObstacles}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <Sheet open={!!selectedBranchId} onOpenChange={(o) => !o && setSelectedBranchId(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[50vw] bg-[#0c1a30] border-white/10 overflow-y-auto flex flex-col gap-0 p-0"
        >
          {sheetReports.length > 0 && (
            <AreaDetailSheetBody reports={sheetReports} canDelete={canDelete} />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
