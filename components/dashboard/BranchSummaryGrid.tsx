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
  avgNrwBefore: number | null
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

function nrwColor(v: number | null) {
  if (v == null) return { text: 'text-white/25', strip: 'bg-white/10' }
  if (v <= 20)   return { text: 'text-green-400', strip: 'bg-green-500' }
  if (v <= 25)   return { text: 'text-amber-400', strip: 'bg-amber-500' }
  return           { text: 'text-red-400',   strip: 'bg-red-500'   }
}

export function BranchSummaryGrid({ summaries, allRows, canDelete }: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)

  const sheetReports = selectedBranchId
    ? allRows.filter((r) => r.branch_id === selectedBranchId)
    : []

  const submitted    = summaries.filter((s) => s.submitted)
  const notSubmitted = summaries.filter((s) => !s.submitted)
  const total        = summaries.length
  const pct          = total > 0 ? Math.round((submitted.length / total) * 100) : 0

  // KPI aggregates
  const nrwReduced = submitted.filter(
    (s) => s.avgNrwBefore != null && s.avgNrwAfter != null && s.avgNrwAfter < s.avgNrwBefore,
  ).length
  const highPrio   = summaries.reduce((a, s) => a + s.highPriorityObstacles, 0)
  const totalAreas = summaries.reduce((a, s) => a + s.areaCount, 0)

  const progressColor =
    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'

  // Submitted: worst NRW first
  const sortedSubmitted = [...submitted].sort(
    (a, b) => (b.avgNrwAfter ?? -1) - (a.avgNrwAfter ?? -1),
  )

  return (
    <>
      <div className="space-y-5">

        {/* ── KPI Bar ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* ส่งแล้ว */}
          <div className="glass-card-sm p-4 space-y-1">
            <p className="text-xs text-white/40">ส่งแล้ว</p>
            <p className="text-2xl font-bold text-cyan-400 num">
              {submitted.length}
              <span className="text-base font-normal text-white/30"> / {total}</span>
            </p>
            <p className="text-xs text-white/30">สาขา</p>
          </div>

          {/* ลด NRW ได้ */}
          <div className="glass-card-sm p-4 space-y-1">
            <p className="text-xs text-white/40">ลด NRW ได้</p>
            <p className={`text-2xl font-bold num ${nrwReduced > 0 ? 'text-green-400' : 'text-white/25'}`}>
              {nrwReduced}
              <span className="text-base font-normal text-white/30"> / {submitted.length}</span>
            </p>
            <p className="text-xs text-white/30">สาขา (หลัง &lt; ก่อน)</p>
          </div>

          {/* อุปสรรคเร่งด่วน */}
          <div className="glass-card-sm p-4 space-y-1">
            <p className="text-xs text-white/40">อุปสรรคเร่งด่วน</p>
            <p className={`text-2xl font-bold num ${highPrio > 0 ? 'text-red-400' : 'text-white/25'}`}>
              {highPrio}
            </p>
            <p className="text-xs text-white/30">รายการ</p>
          </div>

          {/* พื้นที่รายงาน */}
          <div className="glass-card-sm p-4 space-y-1">
            <p className="text-xs text-white/40">พื้นที่รายงาน</p>
            <p className="text-2xl font-bold text-teal-400 num">{totalAreas}</p>
            <p className="text-xs text-white/30">พื้นที่</p>
          </div>
        </div>

        {/* ── Progress Bar ─────────────────────────── */}
        <div className="glass-card-sm p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60 font-medium">ความคืบหน้าการส่งรายงาน</span>
            <span className="font-bold text-white num">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-white/40 num">
            ส่งแล้ว {submitted.length} / {total} สาขา
            {notSubmitted.length > 0 && ` · รอ ${notSubmitted.length} สาขา`}
          </p>
        </div>

        {/* ── ยังไม่ส่ง ─────────────────────────────── */}
        {notSubmitted.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-400 shrink-0" />
              <p className="text-sm font-semibold text-orange-400">
                ยังไม่ส่ง ({notSubmitted.length} สาขา)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {notSubmitted.map((s) => (
                <div
                  key={s.branch_id}
                  className="flex items-center gap-1.5 border border-orange-500/25 bg-orange-500/5 rounded-lg px-3 py-1.5"
                >
                  <span className="text-[10px] font-bold text-orange-400/60 num">{s.code}</span>
                  <span className="text-sm text-white/70">{s.name_th}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ส่งแล้ว ──────────────────────────────── */}
        {sortedSubmitted.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/60">
              ส่งแล้ว ({sortedSubmitted.length} สาขา) · เรียงตาม NRW สูงสุดก่อน
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sortedSubmitted.map((s) => {
                const { text, strip } = nrwColor(s.avgNrwAfter)
                const hasHighPrio = s.highPriorityObstacles > 0

                return (
                  <button
                    key={s.branch_id}
                    onClick={() => setSelectedBranchId(s.branch_id)}
                    className={`glass-card-sm text-left overflow-hidden transition-all hover:border-cyan-500/30 hover:bg-white/5 cursor-pointer w-full
                      ${hasHighPrio ? 'border-red-500/30' : 'border-white/10'}`}
                  >
                    {/* Colored top strip */}
                    <div className={`h-1 w-full ${strip}`} />

                    <div className="p-4 space-y-3">
                      {/* Code + status */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold num bg-white/10 px-1.5 py-0.5 rounded text-white/50 shrink-0">
                          {s.code}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shrink-0">
                          ส่งแล้ว
                        </span>
                      </div>

                      {/* Branch name */}
                      <p className="text-sm font-semibold text-white leading-tight">{s.name_th}</p>

                      {/* NRW big number */}
                      <div>
                        <p className={`text-3xl font-bold num ${text}`}>
                          {s.avgNrwAfter != null ? `${s.avgNrwAfter.toFixed(1)}%` : '—'}
                        </p>
                        <p className="text-[10px] text-white/30 mt-0.5">NRW หลังดำเนินการ</p>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{s.areaCount} พื้นที่</span>
                        {s.totalObstacles > 0 && (
                          <span className={`flex items-center gap-1 text-xs font-bold ${
                            hasHighPrio ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            <AlertTriangle size={10} />
                            {hasHighPrio
                              ? `${s.highPriorityObstacles} เร่งด่วน`
                              : `${s.totalObstacles} อุปสรรค`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
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
