'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AreaDetailBody, AreaReport } from './AreaReportTable'
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
  if (v == null) return { text: 'text-black/25', strip: 'bg-black/10' }
  if (v <= 20)   return { text: 'text-[#1E7A5A]', strip: 'bg-[#1E7A5A]' }
  if (v <= 25)   return { text: 'text-[#A8721A]', strip: 'bg-[#A8721A]' }
  return           { text: 'text-[#B3392C]',   strip: 'bg-[#B3392C]'   }
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
    pct >= 80 ? 'bg-[#1E7A5A]' : pct >= 50 ? 'bg-[#A8721A]' : 'bg-[#B3392C]'

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
            <p className="text-xs text-black/40">ส่งแล้ว</p>
            <p className="text-2xl font-bold text-[#0B6E76] num">
              {submitted.length}
              <span className="text-base font-normal text-black/30"> / {total}</span>
            </p>
            <p className="text-xs text-black/30">สาขา</p>
          </div>

          {/* ลด NRW ได้ */}
          <div className="glass-card-sm p-4 space-y-1">
            <p className="text-xs text-black/40">ลด NRW ได้</p>
            <p className={`text-2xl font-bold num ${nrwReduced > 0 ? 'text-[#1E7A5A]' : 'text-black/25'}`}>
              {nrwReduced}
              <span className="text-base font-normal text-black/30"> / {submitted.length}</span>
            </p>
            <p className="text-xs text-black/30">สาขา (หลัง &lt; ก่อน)</p>
          </div>

          {/* อุปสรรคเร่งด่วน */}
          <div className="glass-card-sm p-4 space-y-1">
            <p className="text-xs text-black/40">อุปสรรคเร่งด่วน</p>
            <p className={`text-2xl font-bold num ${highPrio > 0 ? 'text-[#B3392C]' : 'text-black/25'}`}>
              {highPrio}
            </p>
            <p className="text-xs text-black/30">รายการ</p>
          </div>

          {/* พื้นที่รายงาน */}
          <div className="glass-card-sm p-4 space-y-1">
            <p className="text-xs text-black/40">พื้นที่รายงาน</p>
            <p className="text-2xl font-bold text-[#0B6E76] num">{totalAreas}</p>
            <p className="text-xs text-black/30">พื้นที่</p>
          </div>
        </div>

        {/* ── Progress Bar ─────────────────────────── */}
        <div className="glass-card-sm p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-black/60 font-medium">ความคืบหน้าการส่งรายงาน</span>
            <span className="font-bold text-[#12181F] num">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-black/40 num">
            ส่งแล้ว {submitted.length} / {total} สาขา
            {notSubmitted.length > 0 && ` · รอ ${notSubmitted.length} สาขา`}
          </p>
        </div>

        {/* ── ยังไม่ส่ง ─────────────────────────────── */}
        {notSubmitted.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#A8721A] shrink-0" />
              <p className="text-sm font-semibold text-[#A8721A]">
                ยังไม่ส่ง ({notSubmitted.length} สาขา)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {notSubmitted.map((s) => (
                <div
                  key={s.branch_id}
                  className="flex items-center gap-1.5 border border-[#A8721A]/25 bg-[#A8721A]/5 rounded-lg px-3 py-1.5"
                >
                  <span className="text-[10px] font-bold text-[#A8721A] num">{s.code}</span>
                  <span className="text-sm text-black/70">{s.name_th}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ส่งแล้ว ──────────────────────────────── */}
        {sortedSubmitted.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-black/60">
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
                    className={`glass-card-sm text-left overflow-hidden transition-all hover:border-[#0B6E76]/30 hover:bg-black/5 cursor-pointer w-full
                      ${hasHighPrio ? 'border-[#B3392C]/30' : 'border-black/10'}`}
                  >
                    {/* Colored top strip */}
                    <div className={`h-1 w-full ${strip}`} />

                    <div className="p-4 space-y-3">
                      {/* Code + status */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold num bg-black/10 px-1.5 py-0.5 rounded text-black/50 shrink-0">
                          {s.code}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-[#0B6E76]/12 border-[#0B6E76]/30 text-[#0B6E76] shrink-0">
                          ส่งแล้ว
                        </span>
                      </div>

                      {/* Branch name */}
                      <p className="text-sm font-semibold text-[#12181F] leading-tight">{s.name_th}</p>

                      {/* NRW big number */}
                      <div>
                        <p className={`text-3xl font-bold num ${text}`}>
                          {s.avgNrwAfter != null ? `${s.avgNrwAfter.toFixed(1)}%` : '—'}
                        </p>
                        <p className="text-[10px] text-black/30 mt-0.5">NRW หลังดำเนินการ</p>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-black/40">{s.areaCount} พื้นที่</span>
                        {s.totalObstacles > 0 && (
                          <span className={`flex items-center gap-1 text-xs font-bold ${
                            hasHighPrio ? 'text-[#B3392C]' : 'text-[#A8721A]'
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

      <Dialog open={!!selectedBranchId} onOpenChange={(o) => !o && setSelectedBranchId(null)}>
        <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90vh] bg-[#FFFFFF] border-[#EFF2F5] overflow-y-auto flex flex-col gap-0 p-0 rounded-2xl">
          {sheetReports.length > 0 && (
            <AreaDetailBody reports={sheetReports} canDelete={canDelete} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
