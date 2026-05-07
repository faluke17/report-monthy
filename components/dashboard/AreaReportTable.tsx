'use client'

import { useState, useEffect, useTransition } from 'react'
import { ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { deleteAreaReport } from '@/app/actions/reports'

interface StepTestResult {
  step_no: number
  estimated_loss?: number | null
  leaks_found?: number | null
  repair_status?: string | null
}

interface AreaObstacle {
  obstacle_type: string
  obstacle_detail?: string | null
  resolution_plan?: string | null
  impact?: string | null
  region_support_needed?: string | null
  priority_order?: number | null
}

interface AreaReport {
  id: string
  branch_id: string
  report_year: number
  report_month: number
  area_name: string
  water_dist_before?: number | null
  water_sold_before?: number | null
  water_dist_after?: number | null
  water_sold_after?: number | null
  pdca_do?: string | null
  pdca_act?: string | null
  status: string
  created_at: string
  branches?: { name_th: string; code: string } | null
  leaks_repaired?: number | null
  leaks_pending?: number | null
  area_obstacles?: AreaObstacle[]
  step_test_results?: StepTestResult[]
}

function nrw(dist?: number | null, sold?: number | null) {
  if (!dist) return null
  return ((dist - (sold ?? 0)) / dist) * 100
}

function fmt(n: number | null | undefined, dec = 1) {
  if (n == null) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function NrwChip({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-white/25 text-xs">—</span>
  const cls = pct <= 20 ? 'text-green-400' : pct <= 25 ? 'text-amber-400' : 'text-red-400'
  return <span className={`num text-sm font-bold ${cls}`}>{fmt(pct)}%</span>
}

interface Props {
  data: AreaReport[]
  showBranch?: boolean
  canDelete?: boolean
}

export function AreaReportTable({ data, showBranch, canDelete }: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()

  const branchReports = selectedBranchId
    ? data.filter((r) => r.branch_id === selectedBranchId)
    : []

  // close sheet if branch's reports are all deleted
  useEffect(() => {
    if (selectedBranchId && branchReports.length === 0) {
      setSelectedBranchId(null)
    }
  }, [selectedBranchId, branchReports.length])

  const branchName = branchReports[0]?.branches?.name_th ?? ''
  const reportPeriod = branchReports[0]
    ? `${getThaiMonthName(branchReports[0].report_month)} ${toThaiYear(branchReports[0].report_year)}`
    : ''

  function handleClose() {
    setSelectedBranchId(null)
    setConfirmDeleteId(null)
  }

  function handleDelete(id: string) {
    startDeleteTransition(async () => {
      const result = await deleteAreaReport(id)
      if (result.success) {
        toast.success('ลบรายงานสำเร็จ')
        setConfirmDeleteId(null)
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
        setConfirmDeleteId(null)
      }
    })
  }

  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-white/30">
        ยังไม่มีรายงาน — กด <strong className="text-white/50">บันทึกใหม่</strong> เพื่อเริ่มต้น
      </div>
    )
  }

  return (
    <>
      <div className="divide-y divide-white/5">
        {data.map((row) => {
          const before = nrw(row.water_dist_before, row.water_sold_before)
          const after  = nrw(row.water_dist_after,  row.water_sold_after)
          const obstCount = row.area_obstacles?.length ?? 0
          const hasHighPriority = row.area_obstacles?.some((o) => o.priority_order === 1)

          return (
            <button
              key={row.id}
              onClick={() => { setSelectedBranchId(row.branch_id); setConfirmDeleteId(null) }}
              className="w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors flex items-center gap-3 group"
            >
              {/* priority stripe */}
              <div className={`w-1 h-10 rounded-full shrink-0 ${hasHighPriority ? 'bg-red-500' : 'bg-white/10'}`} />

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white truncate">{row.area_name}</span>
                  {obstCount > 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      hasHighPriority
                        ? 'bg-red-500/15 border-red-500/30 text-red-300'
                        : 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                    }`}>
                      <AlertTriangle size={9} />
                      {obstCount} อุปสรรค
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  {showBranch && row.branches && <span>{row.branches.name_th}</span>}
                  <span className="num">{getThaiMonthName(row.report_month)} {toThaiYear(row.report_year)}</span>
                </div>
              </div>

              {/* NRW before → after */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <NrwChip pct={before} />
                {before != null && after != null && (
                  <>
                    <span className="text-white/20 text-xs">→</span>
                    <NrwChip pct={after} />
                    <span className={`text-[10px] font-bold num ${after < before ? 'text-green-400' : 'text-red-400'}`}>
                      {after < before ? '▼' : '▲'}{fmt(Math.abs(before - after))}%
                    </span>
                  </>
                )}
              </div>

              <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
            </button>
          )
        })}
      </div>

      {/* ─── Detail Sheet (half screen) ─── */}
      <Sheet open={!!selectedBranchId} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[50vw] bg-[#0c1a30] border-white/10 overflow-y-auto flex flex-col gap-0 p-0"
        >
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-[#0c1a30] border-b border-white/10 p-5 space-y-1">
            <SheetTitle className="text-base font-bold text-white">
              {branchName || 'รายงานพื้นที่'}
            </SheetTitle>
            <p className="text-xs text-white/40">
              {reportPeriod}{branchReports.length > 0 ? ` · ${branchReports.length} พื้นที่` : ''}
            </p>
          </div>

          {/* All area reports for this branch */}
          <div className="divide-y divide-white/5">
            {branchReports.map((report) => {
              const before = nrw(report.water_dist_before, report.water_sold_before)
              const after  = nrw(report.water_dist_after,  report.water_sold_after)
              const obstCount = report.area_obstacles?.length ?? 0
              const hasHighPriority = report.area_obstacles?.some((o) => o.priority_order === 1)
              const isConfirmingDelete = confirmDeleteId === report.id

              return (
                <div key={report.id} className="p-5 space-y-4">
                  {/* Area title row */}
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-5 rounded-full shrink-0 ${hasHighPriority ? 'bg-red-500' : 'bg-cyan-500/50'}`} />
                    <span className="text-sm font-bold text-white flex-1 truncate">{report.area_name}</span>
                    {obstCount > 0 && (
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        hasHighPriority
                          ? 'bg-red-500/15 border-red-500/30 text-red-300'
                          : 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                      }`}>
                        <AlertTriangle size={8} />
                        {obstCount}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                      report.status === 'submitted'
                        ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                        : 'bg-white/10 border-white/20 text-white/50'
                    }`}>
                      {report.status === 'submitted' ? 'ส่งแล้ว' : report.status}
                    </span>
                  </div>

                  {/* NRW comparison */}
                  {(report.water_dist_before || report.water_dist_after) && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'ก่อนดำเนินการ', dist: report.water_dist_before, sold: report.water_sold_before },
                        { label: 'หลังดำเนินการ', dist: report.water_dist_after,  sold: report.water_sold_after },
                      ].map(({ label, dist, sold }) => {
                        const pct = nrw(dist, sold)
                        return (
                          <div key={label} className="bg-white/5 rounded-xl p-3 space-y-0.5">
                            <p className="text-[10px] text-white/40">{label}</p>
                            <p className={`text-lg font-bold num ${
                              pct == null ? 'text-white/20' : pct <= 20 ? 'text-green-400' : pct <= 25 ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {pct == null ? '—' : fmt(pct) + '%'}
                            </p>
                            {dist && (
                              <p className="text-[10px] text-white/30 num">
                                {fmt(dist, 0)} / {fmt(sold ?? 0, 0)} ลบ.ม.
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Leak repair summary */}
                  {(report.leaks_repaired != null || report.leaks_pending != null) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-green-400/70 mb-1">ซ่อมแล้ว</p>
                        <p className="text-xl font-bold text-green-400 num">{report.leaks_repaired ?? 0}</p>
                        <p className="text-[10px] text-white/25">จุด</p>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-yellow-400/70 mb-1">ค้างซ่อม</p>
                        <p className="text-xl font-bold text-yellow-400 num">{report.leaks_pending ?? 0}</p>
                        <p className="text-[10px] text-white/25">จุด</p>
                      </div>
                    </div>
                  )}

                  {/* Step Test Results */}
                  {report.step_test_results && report.step_test_results.length > 0 && (() => {
                    const sorted = [...report.step_test_results].sort((a, b) => a.step_no - b.step_no)
                    const totalLoss = sorted.reduce((s, r) => s + (r.estimated_loss ?? 0), 0)
                    const totalLeaks = sorted.reduce((s, r) => s + (r.leaks_found ?? 0), 0)
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest">
                            Step Test ({sorted.length} ขั้น)
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-white/40">
                            <span>รวมสูญเสีย <span className="text-purple-300 font-bold num">{fmt(totalLoss)} m³/hr</span></span>
                            <span>รวมจุด <span className="text-white/70 font-bold num">{totalLeaks}</span></span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-purple-500/15 bg-purple-500/5 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-purple-500/15">
                                <th className="text-left px-3 py-2 text-white/30 font-semibold">ขั้น</th>
                                <th className="text-right px-3 py-2 text-white/30 font-semibold">สูญเสีย (m³/hr)</th>
                                <th className="text-right px-3 py-2 text-white/30 font-semibold">จุดรั่ว</th>
                                <th className="text-left px-3 py-2 text-white/30 font-semibold">สถานะ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-500/10">
                              {sorted.map((s) => (
                                <tr key={s.step_no}>
                                  <td className="px-3 py-2 text-white/60 font-bold num">{s.step_no}</td>
                                  <td className="px-3 py-2 text-right text-white/80 num">
                                    {s.estimated_loss != null ? fmt(s.estimated_loss) : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-white/80 num">
                                    {s.leaks_found ?? 0}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                      s.repair_status === 'ซ่อมแล้ว'
                                        ? 'bg-green-500/20 text-green-300'
                                        : s.repair_status === 'ซ่อมไม่ได้'
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-yellow-500/20 text-yellow-300'
                                    }`}>
                                      {s.repair_status ?? 'รอซ่อม'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()}

                  {/* PDCA Do / Act */}
                  {(report.pdca_do || report.pdca_act) && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">Do / Act</p>
                      {report.pdca_do && (
                        <div>
                          <p className="text-[10px] text-white/35 mb-0.5">D — สิ่งที่ดำเนินการ</p>
                          <p className="text-xs text-white/80 leading-relaxed">{report.pdca_do}</p>
                        </div>
                      )}
                      {report.pdca_act && (
                        <div>
                          <p className="text-[10px] text-white/35 mb-0.5">A — แผนเดือนถัดไป</p>
                          <p className="text-xs text-white/80 leading-relaxed">{report.pdca_act}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Obstacles */}
                  {obstCount > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest">
                        อุปสรรค ({obstCount})
                      </p>
                      {report.area_obstacles!.map((obs, i) => (
                        <div key={i} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{obs.obstacle_type}</span>
                            <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                              obs.priority_order === 1
                                ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            }`}>
                              {obs.priority_order === 1 ? '🔴 สูง' : '🟡 กลาง'}
                            </span>
                          </div>
                          {obs.obstacle_detail && (
                            <p className="text-[11px] text-white/60 leading-relaxed">{obs.obstacle_detail}</p>
                          )}
                          {obs.resolution_plan && (
                            <div>
                              <p className="text-[10px] text-white/35">แนวทางแก้ไข</p>
                              <p className="text-[11px] text-white/70">{obs.resolution_plan}</p>
                            </div>
                          )}
                          {obs.region_support_needed && (
                            <div>
                              <p className="text-[10px] text-white/35">ต้องการจากเขต</p>
                              <p className="text-[11px] text-amber-300/80">{obs.region_support_needed}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Delete (region only) */}
                  {canDelete && (
                    <div className="pt-1">
                      {!isConfirmingDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(report.id)}
                          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-red-500/20 text-red-400/70 text-xs font-semibold hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                        >
                          <Trash2 size={12} />
                          ลบพื้นที่นี้
                        </button>
                      ) : (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-2">
                          <p className="text-xs text-red-300 font-semibold">ยืนยันลบ &ldquo;{report.area_name}&rdquo;?</p>
                          <p className="text-[10px] text-white/40">ไม่สามารถกู้คืนได้</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deletePending}
                              className="flex-1 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs font-semibold hover:bg-white/15 disabled:opacity-40 transition-colors"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(report.id)}
                              disabled={deletePending}
                              className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-bold disabled:opacity-40 transition-colors"
                            >
                              {deletePending ? 'กำลังลบ...' : 'ลบเลย'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
