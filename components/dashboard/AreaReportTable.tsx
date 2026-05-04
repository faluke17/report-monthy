'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, AlertTriangle, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { deleteAreaReport } from '@/app/actions/reports'

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
  area_obstacles?: AreaObstacle[]
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
  const [selected, setSelected] = useState<AreaReport | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletePending, startDeleteTransition] = useTransition()

  function handleClose() {
    setSelected(null)
    setConfirmDelete(false)
  }

  function handleDelete() {
    if (!selected) return
    startDeleteTransition(async () => {
      const result = await deleteAreaReport(selected.id)
      if (result.success) {
        toast.success('ลบรายงานสำเร็จ')
        setSelected(null)
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
        setConfirmDelete(false)
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
              onClick={() => { setSelected(row); setConfirmDelete(false) }}
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

      {/* ─── Detail Sheet ─── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg bg-[#0c1a30] border-white/10 overflow-y-auto flex flex-col gap-0 p-0"
        >
          {selected && (
            <>
              {/* Header */}
              <div className="p-5 border-b border-white/10 space-y-1">
                <SheetTitle className="text-base font-bold text-white">{selected.area_name}</SheetTitle>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  {selected.branches && <span>{selected.branches.name_th}</span>}
                  <span className="num">{getThaiMonthName(selected.report_month)} {toThaiYear(selected.report_year)}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    selected.status === 'submitted'
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                      : 'bg-white/10 border-white/20 text-white/50'
                  }`}>
                    {selected.status === 'submitted' ? 'ส่งแล้ว' : selected.status}
                  </span>
                </div>
              </div>

              {/* NRW comparison */}
              {(selected.water_dist_before || selected.water_dist_after) && (
                <div className="p-5 border-b border-white/10">
                  <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-3">NRW เปรียบเทียบ</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'ก่อนดำเนินการ', dist: selected.water_dist_before, sold: selected.water_sold_before },
                      { label: 'หลังดำเนินการ', dist: selected.water_dist_after,  sold: selected.water_sold_after },
                    ].map(({ label, dist, sold }) => {
                      const pct = nrw(dist, sold)
                      return (
                        <div key={label} className="bg-white/5 rounded-xl p-3 space-y-1">
                          <p className="text-[10px] text-white/40">{label}</p>
                          <p className={`text-xl font-bold num ${
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
                </div>
              )}

              {/* PDCA Do / Act */}
              {(selected.pdca_do || selected.pdca_act) && (
                <div className="p-5 border-b border-white/10 space-y-3">
                  <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">Do / Act</p>
                  {selected.pdca_do && (
                    <div>
                      <p className="text-[10px] text-white/35 mb-1">D — สิ่งที่ดำเนินการ</p>
                      <p className="text-sm text-white/80 leading-relaxed">{selected.pdca_do}</p>
                    </div>
                  )}
                  {selected.pdca_act && (
                    <div>
                      <p className="text-[10px] text-white/35 mb-1">A — แผนเดือนถัดไป</p>
                      <p className="text-sm text-white/80 leading-relaxed">{selected.pdca_act}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Obstacles */}
              {selected.area_obstacles && selected.area_obstacles.length > 0 && (
                <div className="p-5 space-y-3">
                  <p className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest">
                    อุปสรรค ({selected.area_obstacles.length})
                  </p>
                  {selected.area_obstacles.map((obs, i) => (
                    <div key={i} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{obs.obstacle_type}</span>
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          obs.priority_order === 1
                            ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        }`}>
                          {obs.priority_order === 1 ? '🔴 สูง' : '🟡 กลาง'}
                        </span>
                      </div>
                      {obs.obstacle_detail && (
                        <p className="text-xs text-white/60 leading-relaxed">{obs.obstacle_detail}</p>
                      )}
                      {obs.resolution_plan && (
                        <div>
                          <p className="text-[10px] text-white/35">แนวทางแก้ไข</p>
                          <p className="text-xs text-white/70">{obs.resolution_plan}</p>
                        </div>
                      )}
                      {obs.region_support_needed && (
                        <div>
                          <p className="text-[10px] text-white/35">ต้องการจากเขต</p>
                          <p className="text-xs text-amber-300/80">{obs.region_support_needed}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ─── Delete (region only) ─── */}
              {canDelete && (
                <div className="p-5 border-t border-white/10">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      ลบรายงานนี้
                    </button>
                  ) : (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-2">
                      <p className="text-sm text-red-300 text-center font-semibold">ยืนยันการลบ?</p>
                      <p className="text-xs text-white/40 text-center">ไม่สามารถกู้คืนได้</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          disabled={deletePending}
                          className="flex-1 py-2 rounded-lg bg-white/10 text-white/60 text-sm font-semibold hover:bg-white/15 disabled:opacity-40 transition-colors"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deletePending}
                          className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                        >
                          {deletePending ? 'กำลังลบ...' : 'ลบเลย'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
