'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, ChevronLeft, ArrowRight, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatThaiDate, getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { createClient } from '@/lib/supabase/client'
import type { FiveTopicsReport } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SBranch    = { id: string; name_th: string; code: string }
type SMonthly   = { branch_id: string; nrw_pct: number | null; leaks_pending?: number; branches?: { name_th: string; code: string } }
type SFiveTopic = { id: string; branch_id: string; t1_dma_count: number | null; t2_leak_points: number | null; t3_dma_pm_count: number | null; t4_flush_points: number | null; t5_meters_replaced: number | null; branches?: { name_th: string; code: string } }
type SObstacle  = { id: string; obstacle_type: string; status: string; data_quality_impact?: string | null; branches?: { name_th: string } }
type SAction    = { id: string; code: string; title: string; due_date: string | null; owner: string | null; branches?: { name_th: string } }

interface AreaObstacle {
  obstacle_type: string
  obstacle_detail?: string | null
  resolution_plan?: string | null
  region_support_needed?: string | null
  priority_order?: number | null
}

interface AreaReport {
  id: string
  area_name: string
  water_dist_before?: number | null
  water_sold_before?: number | null
  mnf_before?: number | null
  water_dist_after?: number | null
  water_sold_after?: number | null
  mnf_after?: number | null
  pdca_do?: string | null
  pdca_act?: string | null
  area_obstacles?: AreaObstacle[]
}

interface Props {
  avgNrw: number | null
  reportsWithNrwCount: number
  allBranches: SBranch[]
  reports: SMonthly[]
  fiveTopics: SFiveTopic[]
  obstacles: SObstacle[]
  overdueActions: SAction[]
  year: number
  month: number
}

type PanelKey = 'monthly' | 'five' | 'obstacle' | 'action'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nrwColor(pct: number | null) {
  if (pct === null) return 'text-white/30'
  if (pct > 23)    return 'text-red-400'
  if (pct > 20)    return 'text-amber-400'
  return 'text-green-400'
}

function calcNrw(dist?: number | null, sold?: number | null) {
  if (!dist) return null
  return ((dist - (sold ?? 0)) / dist) * 100
}

function fmtNum(n: number | null | undefined, dec = 1) {
  if (n == null) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function NrwChip({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-white/25 text-sm num">—</span>
  const cls = pct <= 20 ? 'text-green-400' : pct <= 25 ? 'text-amber-400' : 'text-red-400'
  return <span className={`num text-lg font-bold ${cls}`}>{fmtNum(pct)}%</span>
}

// ─── Drawer shell ─────────────────────────────────────────────────────────────

function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-1/2 flex flex-col bg-[#070e1c] border-l border-white/10 shadow-2xl animate-fadein">
        {children}
      </div>
    </>
  )
}

function DrawerHeader({ title, subtitle, onClose, onBack }: {
  title: string; subtitle?: string; onClose: () => void; onBack?: () => void
}) {
  return (
    <div className="flex items-start justify-between p-5 border-b border-white/8 shrink-0">
      <div className="flex items-start gap-2">
        {onBack && (
          <button onClick={onBack} className="p-1.5 -ml-1 mt-0.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all shrink-0">
            <ChevronLeft size={16} />
          </button>
        )}
        <div>
          <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <button onClick={onClose} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/8 transition-all shrink-0">
        <X size={18} />
      </button>
    </div>
  )
}

// ─── Monthly drawer content ───────────────────────────────────────────────────

interface BranchAgg {
  distBefore: number; soldBefore: number
  distAfter:  number; soldAfter:  number
  mnfBefores: number[]; mnfAfters: number[]
  areas: number
}

function MonthlyDrawerContent({ reports, year, month, onSelect }: {
  reports: SMonthly[]; year: number; month: number; onSelect: (branchId: string) => void
}) {
  const [aggMap, setAggMap] = useState<Record<string, BranchAgg>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reports.length === 0) { setLoading(false); return }
    createClient()
      .from('area_monthly_reports')
      .select('branch_id, water_dist_before, water_sold_before, mnf_before, water_dist_after, water_sold_after, mnf_after')
      .in('branch_id', reports.map(r => r.branch_id))
      .eq('report_year', year)
      .eq('report_month', month)
      .eq('status', 'submitted')
      .then(({ data }) => {
        const map: Record<string, BranchAgg> = {}
        for (const row of (data ?? []) as any[]) {
          if (!map[row.branch_id]) map[row.branch_id] = { distBefore: 0, soldBefore: 0, distAfter: 0, soldAfter: 0, mnfBefores: [], mnfAfters: [], areas: 0 }
          const a = map[row.branch_id]
          a.areas++
          if (row.water_dist_before) a.distBefore += row.water_dist_before
          if (row.water_sold_before) a.soldBefore += row.water_sold_before
          if (row.water_dist_after)  a.distAfter  += row.water_dist_after
          if (row.water_sold_after)  a.soldAfter  += row.water_sold_after
          if (row.mnf_before != null) a.mnfBefores.push(row.mnf_before)
          if (row.mnf_after  != null) a.mnfAfters.push(row.mnf_after)
        }
        setAggMap(map)
        setLoading(false)
      })
  }, [reports.length, year, month])

  if (reports.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-white/30 text-sm">ยังไม่มีสาขาส่งรายงานประจำเดือน</div>
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30">
        <Loader2 size={24} className="animate-spin" />
        <p className="text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {reports.map(r => {
          const agg = aggMap[r.branch_id]
          const nrwB = agg && agg.distBefore > 0 ? ((agg.distBefore - agg.soldBefore) / agg.distBefore) * 100 : null
          const nrwA = agg && agg.distAfter  > 0 ? ((agg.distAfter  - agg.soldAfter)  / agg.distAfter)  * 100 : null
          const mnfB = agg && agg.mnfBefores.length > 0 ? agg.mnfBefores.reduce((s, v) => s + v, 0) / agg.mnfBefores.length : null
          const mnfA = agg && agg.mnfAfters.length  > 0 ? agg.mnfAfters.reduce((s, v) => s + v, 0)  / agg.mnfAfters.length  : null
          const nrwImproved = nrwB != null && nrwA != null && nrwA < nrwB
          const mnfImproved = mnfB != null && mnfA != null && mnfA < mnfB

          return (
            <button
              key={r.branch_id}
              onClick={() => onSelect(r.branch_id)}
              className="w-full text-left px-5 py-4 hover:bg-white/3 transition-colors flex items-start gap-3 group"
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{r.branches?.name_th ?? '—'}</span>
                  {agg && <span className="text-[10px] text-white/25">{agg.areas} พื้นที่</span>}
                </div>

                {/* Metrics row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {/* NRW */}
                  {(nrwB != null || nrwA != null) && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/30">NRW</span>
                      {nrwB != null && <span className="num text-xs text-white/50">{fmtNum(nrwB)}%</span>}
                      {nrwB != null && nrwA != null && <span className="text-white/20 text-[10px]">→</span>}
                      {nrwA != null && (
                        <span className={cn('num text-xs font-bold', nrwA <= 20 ? 'text-green-400' : nrwA <= 25 ? 'text-amber-400' : 'text-red-400')}>
                          {fmtNum(nrwA)}%
                        </span>
                      )}
                      {nrwB != null && nrwA != null && (
                        <span className={cn('num text-[10px] font-bold', nrwImproved ? 'text-green-400' : 'text-red-400')}>
                          {nrwImproved ? '▼' : '▲'}{fmtNum(Math.abs(nrwA - nrwB))}
                        </span>
                      )}
                    </div>
                  )}
                  {/* MNF */}
                  {(mnfB != null || mnfA != null) && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[10px] text-white/30">MNF</span>
                      {mnfB != null && <span className="num text-xs text-white/50">{fmtNum(mnfB, 2)}</span>}
                      {mnfB != null && mnfA != null && <span className="text-white/20 text-[10px]">→</span>}
                      {mnfA != null && (
                        <span className={cn('num text-xs font-bold', mnfImproved ? 'text-green-400' : 'text-red-400')}>
                          {fmtNum(mnfA, 2)}
                        </span>
                      )}
                      {mnfB != null && mnfA != null && (
                        <span className={cn('num text-[10px] font-bold', mnfImproved ? 'text-green-400' : 'text-red-400')}>
                          {mnfImproved ? '▼' : '▲'}{fmtNum(Math.abs(mnfA - mnfB), 2)}
                        </span>
                      )}
                      <span className="text-[9px] text-white/20">ลบ.ม./ชม.</span>
                    </div>
                  )}
                  {!agg && <span className="text-[11px] text-white/20">ไม่มีข้อมูลตัวเลข</span>}
                </div>
              </div>

              <ChevronDown size={14} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-1 -rotate-90" />
            </button>
          )
        })}
      </div>
      <div className="shrink-0 border-t border-white/8 px-5 py-3 flex justify-end">
        <Link href={`/monthly?year=${year}&month=${month}`} className="inline-flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-300 transition-colors">
          ดูรายงานทั้งหมด <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

// ─── Monthly drawer — branch detail ──────────────────────────────────────────

function MonthlyBranchDetailContent({ branchId, year, month }: { branchId: string; year: number; month: number }) {
  const [areas, setAreas]     = useState<AreaReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    createClient()
      .from('area_monthly_reports')
      .select('id, area_name, water_dist_before, water_sold_before, mnf_before, water_dist_after, water_sold_after, mnf_after, pdca_do, pdca_act, area_obstacles(*)')
      .eq('branch_id', branchId)
      .eq('report_year', year)
      .eq('report_month', month)
      .eq('status', 'submitted')
      .order('area_name')
      .then(({ data }) => { setAreas((data as AreaReport[]) ?? []); setLoading(false) })
  }, [branchId, year, month])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30">
        <Loader2 size={24} className="animate-spin" />
        <p className="text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  if (areas.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-white/30 text-sm">ไม่พบข้อมูลพื้นที่</div>
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 space-y-4">
        {areas.map(area => {
          const nrwBefore = calcNrw(area.water_dist_before, area.water_sold_before)
          const nrwAfter  = calcNrw(area.water_dist_after,  area.water_sold_after)
          const obstCount = area.area_obstacles?.length ?? 0
          const hasAnyData = area.water_dist_before || area.water_dist_after || area.water_sold_before || area.water_sold_after || area.mnf_before || area.mnf_after

          // rows: [label, before, after, lowerIsBetter]
          const compRows: { label: string; before: number | null | undefined; after: number | null | undefined; unit: string; lowerBetter: boolean; dec: number }[] = [
            { label: 'อัตราน้ำสูญเสีย', before: nrwBefore,            after: nrwAfter,           unit: '%',           lowerBetter: true,  dec: 1 },
            { label: 'น้ำขาย',          before: area.water_sold_before, after: area.water_sold_after, unit: 'ลบ.ม.',   lowerBetter: false, dec: 0 },
            { label: 'MNF',             before: area.mnf_before,        after: area.mnf_after,        unit: 'ลบ.ม./ชม.', lowerBetter: true, dec: 2 },
          ]

          return (
            <div key={area.id} className="glass-card p-4 space-y-4 accent-bar-cyan">
              {/* Area header */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white text-sm leading-snug">{area.area_name}</h3>
                {obstCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-300 font-bold shrink-0">
                    {obstCount} อุปสรรค
                  </span>
                )}
              </div>

              {/* Metrics comparison table */}
              {hasAnyData && (
                <div className="space-y-1.5">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[10px] font-bold uppercase tracking-widest text-white/25 px-0.5">
                    <span />
                    <span className="text-right w-16">ก่อน</span>
                    <span className="text-right w-16">หลัง</span>
                    <span className="text-right w-14">เปลี่ยน</span>
                  </div>
                  {compRows.map(row => {
                    const hasBefore = row.before != null
                    const hasAfter  = row.after  != null
                    if (!hasBefore && !hasAfter) return null
                    const delta = hasBefore && hasAfter ? (row.after! - row.before!) : null
                    const improved = delta != null && (row.lowerBetter ? delta < 0 : delta > 0)
                    const deltaColor = delta === null ? 'text-white/20' : improved ? 'text-green-400' : 'text-red-400'
                    return (
                      <div key={row.label} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-baseline bg-white/3 rounded-lg px-3 py-2">
                        <span className="text-[11px] text-white/50">{row.label}</span>
                        <span className="num text-sm font-semibold text-white/70 text-right w-16">
                          {hasBefore ? `${fmtNum(row.before, row.dec)}` : '—'}
                          {hasBefore && <span className="text-[9px] text-white/30 ml-0.5">{row.unit}</span>}
                        </span>
                        <span className="num text-sm font-semibold text-white/70 text-right w-16">
                          {hasAfter ? `${fmtNum(row.after, row.dec)}` : '—'}
                          {hasAfter && <span className="text-[9px] text-white/30 ml-0.5">{row.unit}</span>}
                        </span>
                        <span className={cn('num text-xs font-bold text-right w-14', deltaColor)}>
                          {delta != null
                            ? `${delta < 0 ? '▼' : '▲'} ${fmtNum(Math.abs(delta), row.dec)}`
                            : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* PDCA */}
              {(area.pdca_do || area.pdca_act) && (
                <div className="space-y-2 border-t border-white/8 pt-3">
                  <p className="text-[10px] font-bold text-blue-400/50 uppercase tracking-widest">Do / Act</p>
                  {area.pdca_do && (
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">D — สิ่งที่ดำเนินการ</p>
                      <p className="text-sm text-white/75 leading-relaxed">{area.pdca_do}</p>
                    </div>
                  )}
                  {area.pdca_act && (
                    <div>
                      <p className="text-[10px] text-white/30 mb-1">A — แผนเดือนถัดไป</p>
                      <p className="text-sm text-white/75 leading-relaxed">{area.pdca_act}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Obstacles */}
              {area.area_obstacles && area.area_obstacles.length > 0 && (
                <div className="space-y-2 border-t border-white/8 pt-3">
                  <p className="text-[10px] font-bold text-orange-400/50 uppercase tracking-widest">อุปสรรค</p>
                  {area.area_obstacles.map((obs, i) => (
                    <div key={i} className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/90">{obs.obstacle_type}</span>
                        <span className={cn('ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
                          obs.priority_order === 1
                            ? 'bg-red-500/20 border-red-500/35 text-red-300'
                            : 'bg-amber-500/20 border-amber-500/35 text-amber-300')}>
                          {obs.priority_order === 1 ? 'สูง' : 'กลาง'}
                        </span>
                      </div>
                      {obs.obstacle_detail && <p className="text-xs text-white/55 leading-relaxed">{obs.obstacle_detail}</p>}
                      {obs.resolution_plan && (
                        <div>
                          <p className="text-[10px] text-white/30">แนวทางแก้ไข</p>
                          <p className="text-xs text-white/65">{obs.resolution_plan}</p>
                        </div>
                      )}
                      {obs.region_support_needed && (
                        <div>
                          <p className="text-[10px] text-white/30">ต้องการจากเขต</p>
                          <p className="text-xs text-amber-300/80">{obs.region_support_needed}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Five Topics drawer — list view ──────────────────────────────────────────

function FiveTopicsListContent({ submitted, year, month, onSelect }: {
  submitted: SFiveTopic[]; year: number; month: number; onSelect: (id: string) => void
}) {
  if (submitted.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-white/30 text-sm">ยังไม่มีสาขาส่งรายงาน 5 หัวข้อ</div>
  }
  const COLS = [
    { label: 'ข้อ 1\nStep Test', key: 't1_dma_count'       as const },
    { label: 'ข้อ 2\nALC',       key: 't2_leak_points'     as const },
    { label: 'ข้อ 3\nPM',        key: 't3_dma_pm_count'   as const },
    { label: 'ข้อ 4\nFlushing',  key: 't4_flush_points'   as const },
    { label: 'ข้อ 5\nมาตร',      key: 't5_meters_replaced' as const },
  ]
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="sticky top-0 bg-[#070e1c] z-10">
            <tr className="border-b border-white/10 text-white/40 text-xs">
              <th className="px-5 py-3 text-left font-medium">สาขา</th>
              {COLS.map(c => (
                <th key={c.key} className="px-2 py-3 text-center font-medium whitespace-pre-line leading-tight">{c.label}</th>
              ))}
              <th className="px-2 py-3 text-center font-medium">ครบ</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {submitted.map(r => {
              const vals   = COLS.map(c => r[c.key])
              const filled = vals.filter(v => v != null).length
              return (
                <tr key={r.branch_id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-2.5 text-white/80 font-medium">{r.branches?.name_th ?? '—'}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-2 py-2.5 text-center">
                      {v != null
                        ? <span className="num text-xs text-green-300 font-semibold">{v.toLocaleString()}</span>
                        : <Circle size={10} className="text-white/20 mx-auto" />}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-center">
                    <span className={cn('num text-xs font-bold', filled === 5 ? 'text-green-400' : 'text-amber-400')}>{filled}/5</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => onSelect(r.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400/60 hover:text-cyan-300 border border-cyan-500/15 hover:border-cyan-400/30 hover:bg-cyan-500/5 px-2 py-0.5 rounded-lg transition-all"
                    >
                      ดู <ArrowRight size={10} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t border-white/8 px-5 py-3 flex justify-end">
        <Link href={`/five-topics?year=${year}&month=${month}`} className="inline-flex items-center gap-1.5 text-xs text-green-400/70 hover:text-green-300 transition-colors">
          ดูรายงานทั้งหมด <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

// ─── Five Topics drawer — individual detail ───────────────────────────────────

const BADGE_COLORS: Record<number, string> = {
  1: 'bg-cyan-500/20   text-cyan-300   border-cyan-500/30',
  2: 'bg-blue-500/20   text-blue-300   border-blue-500/30',
  3: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  4: 'bg-amber-500/20  text-amber-300  border-amber-500/30',
  5: 'bg-green-500/20  text-green-300  border-green-500/30',
}

function NoteBlock({ text }: { text: string | null | undefined }) {
  if (!text) return null
  return (
    <div className="flex gap-2 items-start bg-white/3 rounded-xl p-3 mt-1">
      <span className="text-[10px] text-white/30 shrink-0 mt-0.5 font-bold tracking-wide uppercase">หมายเหตุ</span>
      <p className="text-xs text-white/55 leading-relaxed">{text}</p>
    </div>
  )
}

function MetricBlock({ label, value, unit, color }: {
  label: string; value: number | null | undefined; unit?: string; color: string
}) {
  return (
    <div className="bg-white/3 rounded-xl p-3">
      <p className="text-[10px] text-white/40 mb-1.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`num text-2xl font-bold ${color}`}>{value != null ? value.toLocaleString() : '—'}</span>
        {unit && <span className="text-xs text-white/30">{unit}</span>}
      </div>
    </div>
  )
}

function EmptyTopic() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center opacity-40">
      <Circle size={24} className="text-white/30" />
      <p className="text-sm text-white/40">ไม่มีข้อมูล</p>
    </div>
  )
}

function DrawerTopicCard({ no, title, subtitle, filled, accentClass, children }: {
  no: number; title: string; subtitle: string; filled: boolean; accentClass: string; children: React.ReactNode
}) {
  return (
    <div className={`glass-card p-4 space-y-3 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${BADGE_COLORS[no]}`}>{no}</span>
          <div>
            <p className="font-semibold text-white text-sm leading-snug">{title}</p>
            <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {filled ? <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" /> : <Circle size={16} className="text-white/20 shrink-0 mt-0.5" />}
      </div>
      <div className="border-t border-white/8" />
      {children}
    </div>
  )
}

function FiveTopicDetailContent({ id }: { id: string }) {
  const [data, setData]       = useState<FiveTopicsReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    createClient()
      .from('five_topics_reports')
      .select('*, branches(name_th, code)')
      .eq('id', id)
      .single()
      .then(({ data: row }) => { setData((row as FiveTopicsReport) ?? null); setLoading(false) })
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30">
        <Loader2 size={24} className="animate-spin" />
        <p className="text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  const r = data
  if (!r) return <div className="flex-1 flex items-center justify-center text-white/30 text-sm">ไม่พบข้อมูล</div>

  const t1Filled = r.t1_dma_count != null
  const t2Filled = r.t2_leak_points != null
  const t3Filled = r.t3_dma_pm_count != null
  const t4Filled = r.t4_flush_points != null
  const t5Filled = r.t5_meters_replaced != null
  const filledCount = [t1Filled, t2Filled, t3Filled, t4Filled, t5Filled].filter(Boolean).length

  const repairRatio = t2Filled && r.t2_repaired_points != null && r.t2_leak_points! > 0
    ? Math.round((r.t2_repaired_points! / r.t2_leak_points!) * 100)
    : null
  const t3Total = (r.t3_dma_pm_count ?? 0) + (r.t3_prv_pm_count ?? 0) + (r.t3_p3_pm_count ?? 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 space-y-4">

        {/* Status + meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
            r.status === 'submitted' ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25')}>
            <CheckCircle2 size={11} />
            {r.status === 'submitted' ? 'ส่งแล้ว' : 'แบบร่าง'}
          </span>
          <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border',
            filledCount === 5 ? 'bg-green-500/10 text-green-400/80 border-green-500/20' : 'bg-white/5 text-white/40 border-white/10')}>
            กรอกข้อมูล {filledCount}/5 หัวข้อ
          </span>
          {r.submitted_at && <span className="text-[11px] text-white/25 ml-auto">{formatThaiDate(r.submitted_at)}</span>}
        </div>

        {/* Overview strip */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { no: 1, label: 'Step Test', filled: t1Filled, value: r.t1_dma_count,       unit: 'DMA',     color: 'text-cyan-300',   accent: 'accent-bar-cyan'   },
            { no: 2, label: 'ALC',       filled: t2Filled, value: r.t2_leak_points,      unit: 'จุด',     color: 'text-blue-300',   accent: 'border-t-[2px] border-blue-400' },
            { no: 3, label: 'PM',        filled: t3Filled, value: t3Filled ? t3Total : null, unit: 'แห่ง', color: 'text-violet-300', accent: 'accent-bar-purple' },
            { no: 4, label: 'Flushing',  filled: t4Filled, value: r.t4_flush_points,     unit: 'จุด',     color: 'text-amber-300',  accent: 'accent-bar-amber'  },
            { no: 5, label: 'มาตร',      filled: t5Filled, value: r.t5_meters_replaced,  unit: 'เครื่อง', color: 'text-green-300',  accent: 'accent-bar-green'  },
          ].map(c => (
            <div key={c.no} className={cn('glass-card-sm p-2 flex flex-col items-center gap-1 text-center', c.accent, !c.filled && 'opacity-40')}>
              <span className={cn('w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold', BADGE_COLORS[c.no])}>{c.no}</span>
              <span className="text-[8px] text-white/40 leading-tight">{c.label}</span>
              {c.filled ? <CheckCircle2 size={12} className="text-green-400" /> : <Circle size={12} className="text-white/20" />}
              <span className={cn('num text-xs font-bold', c.filled ? c.color : 'text-white/20')}>
                {c.value != null ? c.value.toLocaleString() : '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Topic 1 */}
        <DrawerTopicCard no={1} title="การวิเคราะห์พื้นที่หาท่อแตกท่อรั่ว" subtitle="Step Test พร้อมตรวจ Zero Test" filled={t1Filled} accentClass="accent-bar-cyan">
          {t1Filled ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="num text-4xl font-bold text-cyan-300">{r.t1_dma_count?.toLocaleString() ?? '—'}</span>
                <span className="text-white/40 text-sm">DMA</span>
              </div>
              {r.t1_areas && r.t1_areas.length > 0 && (
                <div>
                  <p className="page-kicker mb-2">พื้นที่ที่ดำเนินการ</p>
                  <div className="space-y-1.5">
                    {r.t1_areas.map((a, i) => (
                      <div key={i} className="glass-card-sm flex justify-between items-center px-3 py-2">
                        <span className="text-sm text-white/80">{a.area_name || '—'}</span>
                        <span className="num text-xs text-white/40">{a.conducted_date ? formatThaiDate(a.conducted_date) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!r.t1_areas || r.t1_areas.length === 0) && r.t1_conducted_date && (
                <div className="flex justify-between text-sm py-1.5">
                  <span className="text-white/50">วันที่ดำเนินการ</span>
                  <span className="text-white/70">{formatThaiDate(r.t1_conducted_date)}</span>
                </div>
              )}
              <NoteBlock text={r.t1_notes} />
            </div>
          ) : <EmptyTopic />}
        </DrawerTopicCard>

        {/* Topic 2 */}
        <DrawerTopicCard no={2} title="การสำรวจน้ำสูญเสียเชิงรุก" subtitle="Active Leakage Control (ALC)" filled={t2Filled} accentClass="border-t-[3px] border-blue-400">
          {t2Filled ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricBlock label="จุดรั่วที่พบ"  value={r.t2_leak_points}     unit="จุด" color="text-blue-300" />
                <MetricBlock label="ซ่อมแล้วเสร็จ" value={r.t2_repaired_points} unit="จุด" color="text-green-300" />
              </div>
              {repairRatio != null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">อัตราซ่อมสำเร็จ</span>
                    <span className="num text-white/70 font-semibold">{repairRatio}%</span>
                  </div>
                  <div className="prog-bg">
                    <div className={`prog-fill ${repairRatio >= 80 ? 'prog-good' : repairRatio >= 50 ? 'prog-warn' : 'prog-bad'}`} style={{ width: `${Math.min(repairRatio, 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="space-y-1 divide-y divide-white/5">
                {r.t2_frequency != null && (
                  <div className="flex justify-between text-sm py-1.5">
                    <span className="text-white/50">จำนวนครั้ง/เดือน</span>
                    <span className="num text-white/80">{r.t2_frequency} ครั้ง</span>
                  </div>
                )}
                {r.t2_water_loss_m3h != null && (
                  <div className="flex justify-between text-sm py-1.5">
                    <span className="text-white/50">ปริมาณน้ำสูญเสีย</span>
                    <span className="num text-white/80">{r.t2_water_loss_m3h.toLocaleString()} ลบ.ม./ชม.</span>
                  </div>
                )}
              </div>
              <NoteBlock text={r.t2_notes} />
            </div>
          ) : <EmptyTopic />}
        </DrawerTopicCard>

        {/* Topic 3 */}
        <DrawerTopicCard no={3} title="การ PM ระบบจ่ายน้ำ" subtitle="Preventive Maintenance" filled={t3Filled} accentClass="accent-bar-purple">
          {t3Filled ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <MetricBlock label="DMA" value={r.t3_dma_pm_count} unit="แห่ง" color="text-violet-300" />
                <MetricBlock label="PRV" value={r.t3_prv_pm_count} unit="แห่ง" color="text-violet-300" />
                <MetricBlock label="P3"  value={r.t3_p3_pm_count}  unit="แห่ง" color="text-violet-300" />
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-white/8 pt-3">
                <span className="text-white/50">รวมทั้งหมด</span>
                <span className="num text-white font-bold">{t3Total} แห่ง</span>
              </div>
              <NoteBlock text={r.t3_notes} />
            </div>
          ) : <EmptyTopic />}
        </DrawerTopicCard>

        {/* Topic 4 */}
        <DrawerTopicCard no={4} title="การระบายตะกอนระบบท่อจ่ายน้ำ" subtitle="Flushing / Sediment Discharge" filled={t4Filled} accentClass="accent-bar-amber">
          {t4Filled ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MetricBlock label="จำนวนจุดระบาย" value={r.t4_flush_points} unit="จุด"   color="text-amber-300" />
                <MetricBlock label="ปริมาณน้ำรวม"  value={r.t4_volume_m3}    unit="ลบ.ม." color="text-amber-300" />
              </div>
              <NoteBlock text={r.t4_notes} />
            </div>
          ) : <EmptyTopic />}
        </DrawerTopicCard>

        {/* Topic 5 */}
        <DrawerTopicCard no={5} title="การเปลี่ยนมาตรวัดน้ำชำรุด" subtitle="Water Meter Replacement (MM-01)" filled={t5Filled} accentClass="accent-bar-green">
          {t5Filled ? (
            <div className="space-y-2">
              <div className="flex flex-col items-center py-4 gap-1">
                <span className="num text-5xl font-bold text-green-300">{r.t5_meters_replaced?.toLocaleString()}</span>
                <span className="text-white/40 text-sm">เครื่อง</span>
                <p className="text-[11px] text-white/25 mt-1">มาตรวัดน้ำชำรุดที่เปลี่ยนแทนแล้ว (MM-01)</p>
              </div>
              <NoteBlock text={r.t5_notes} />
            </div>
          ) : <EmptyTopic />}
        </DrawerTopicCard>

      </div>
    </div>
  )
}

// ─── Obstacle drawer content ──────────────────────────────────────────────────

function ObstacleDrawerContent({ obstacles }: { obstacles: SObstacle[] }) {
  if (obstacles.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-white/30 text-sm">ไม่มีอุปสรรคเร่งด่วน</div>
  }
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {obstacles.map((obs, i) => (
          <div key={obs.id} className="flex gap-3 items-start p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl">
            <span className="num text-sm text-amber-400/50 shrink-0 w-5 text-right mt-0.5 font-bold">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-sm font-semibold text-white/90">{obs.branches?.name_th}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  {obs.obstacle_type}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                  {obs.status}
                </span>
              </div>
              {obs.data_quality_impact && (
                <p className="text-sm text-white/50 leading-relaxed">{obs.data_quality_impact}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-white/8 px-5 py-3 flex justify-end">
        <Link href="/obstacle" className="inline-flex items-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-300 transition-colors">
          ดูอุปสรรคทั้งหมด <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

// ─── Action drawer content ────────────────────────────────────────────────────

function ActionDrawerContent({ actions }: { actions: SAction[] }) {
  if (actions.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-white/30 text-sm">ไม่มี Action เกินกำหนด</div>
  }
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {actions.map(action => (
          <div key={action.id} className="flex gap-3 items-start p-4 bg-red-500/5 border border-red-500/15 rounded-xl">
            <span className="num text-xs text-red-400 font-mono shrink-0 mt-0.5 w-14 pt-0.5">{action.code}</span>
            <div className="flex-1 min-w-0">
              {action.branches?.name_th && <p className="text-[11px] text-white/40 mb-1">{action.branches.name_th}</p>}
              <p className="text-sm text-white/85 leading-snug font-medium">{action.title}</p>
              {action.owner && <p className="text-xs text-white/30 mt-1">{action.owner}</p>}
            </div>
            {action.due_date && (
              <span className="num text-[11px] text-red-400/80 shrink-0 whitespace-nowrap mt-0.5">
                ครบ {formatThaiDate(action.due_date, true)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-white/8 px-5 py-3 flex justify-end">
        <Link href="/action" className="inline-flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-300 transition-colors">
          ดู Action ทั้งหมด <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SummaryCards({
  avgNrw, reportsWithNrwCount, allBranches, reports, fiveTopics, obstacles, overdueActions, year, month,
}: Props) {
  const [openPanel, setOpenPanel]             = useState<PanelKey | null>(null)
  const [selectedFiveId, setSelectedFiveId]   = useState<string | null>(null)
  const [selectedMonthlyBranchId, setSelectedMonthlyBranchId] = useState<string | null>(null)

  const totalBranches    = allBranches.length
  const submittedIds     = new Set(reports.map(r => r.branch_id))
  const notSubmitted     = allBranches.filter(b => !submittedIds.has(b.id))
  const fiveIds          = new Set(fiveTopics.map(r => r.branch_id))
  const fiveNotSubmitted = allBranches.filter(b => !fiveIds.has(b.id))

  function openDrawer(key: PanelKey) {
    setOpenPanel(key)
    setSelectedFiveId(null)
    setSelectedMonthlyBranchId(null)
  }

  function closeDrawer() {
    setOpenPanel(null)
    setSelectedFiveId(null)
    setSelectedMonthlyBranchId(null)
  }

  // Drawer title per state
  const drawerTitle = (() => {
    if (openPanel === 'monthly' && selectedMonthlyBranchId)
      return reports.find(r => r.branch_id === selectedMonthlyBranchId)?.branches?.name_th ?? 'รายงานประจำเดือน'
    if (openPanel === 'monthly')  return 'รายงานประจำเดือน / PDCA'
    if (openPanel === 'five' && selectedFiveId) return fiveTopics.find(r => r.id === selectedFiveId)?.branches?.name_th ?? 'รายงาน 5 หัวข้อ'
    if (openPanel === 'five')     return 'รายงาน 5 หัวข้อ NRW'
    if (openPanel === 'obstacle') return 'อุปสรรคเร่งด่วน'
    if (openPanel === 'action')   return 'Action Items เกินกำหนด'
    return ''
  })()

  const drawerSubtitle = (() => {
    if (openPanel === 'monthly' && selectedMonthlyBranchId) return `รายงานประจำเดือน · ${getThaiMonthName(month)} ${toThaiYear(year)}`
    if (openPanel === 'five' && selectedFiveId) return `รายงาน 5 หัวข้อ · ${getThaiMonthName(month)} ${toThaiYear(year)}`
    return `${getThaiMonthName(month)} ${toThaiYear(year)} · กปภ. เขต 10`
  })()

  const BORDER: Record<PanelKey, string> = {
    monthly:  'border-t-cyan-500/60',
    five:     'border-t-green-500/60',
    obstacle: 'border-t-amber-500/60',
    action:   'border-t-red-500/60',
  }
  const ACTIVE_RING: Record<PanelKey, string> = {
    monthly:  'ring-1 ring-cyan-500/40  shadow-[0_0_20px_rgba(125,211,252,0.10)]',
    five:     'ring-1 ring-green-500/40 shadow-[0_0_20px_rgba(74,222,128,0.10)]',
    obstacle: 'ring-1 ring-amber-500/40 shadow-[0_0_20px_rgba(246,196,83,0.10)]',
    action:   'ring-1 ring-red-500/40   shadow-[0_0_20px_rgba(251,113,133,0.10)]',
  }

  function CardBtn({ id, label, sub, children }: { id: PanelKey; label: string; sub: string; children: React.ReactNode }) {
    const isOpen = openPanel === id
    return (
      <button
        onClick={() => openDrawer(id)}
        className={cn(
          'glass-card-sm px-4 pt-3 pb-3 border-t-2 text-left transition-all duration-200 w-full group cursor-pointer flex flex-col h-full',
          BORDER[id], isOpen && ACTIVE_RING[id],
        )}
      >
        {/* Label — fixed height 2 lines */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 leading-tight min-h-[2rem] flex items-start">
          {label}
        </p>
        {/* Numbers — bottom-aligned so baseline matches across all cards */}
        <div className="flex-1 flex items-end mt-1">
          {children}
        </div>
        {/* Footer + chevron */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-white/25">{sub}</p>
          <ChevronDown size={11} className="text-white/20 group-hover:text-white/50 transition-colors" />
        </div>
      </button>
    )
  }

  return (
    <>
      {/* Card row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-stretch">

        {/* NRW — non-clickable, same flex structure */}
        <div className="glass-card-sm px-4 pt-3 pb-3 border-t-2 border-t-cyan-500/70 flex flex-col h-full">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 leading-tight min-h-[2rem] flex items-start">
            NRW เฉลี่ยเขต
          </p>
          <div className="flex-1 flex items-end mt-1">
            <div>
              <p className="num text-2xl font-bold text-cyan-400">{avgNrw !== null ? avgNrw.toFixed(1) + '%' : '—'}</p>
              <p className="text-[10px] text-cyan-400/50 mt-0.5">ค่าเฉลี่ย</p>
            </div>
          </div>
          <p className="text-[10px] text-white/25 mt-2">จาก {reportsWithNrwCount} สาขา</p>
        </div>

        <CardBtn id="monthly" label="รายงานประจำเดือน / PDCA" sub={`จาก ${totalBranches} สาขา`}>
          <div className="flex items-end gap-3">
            <div>
              <p className="num text-2xl font-bold text-green-400">{reports.length}</p>
              <p className="text-[10px] text-green-400/60 mt-0.5">ส่งแล้ว</p>
            </div>
            <div className="w-px h-7 bg-white/10" />
            <div>
              <p className="num text-2xl font-bold text-red-400">{notSubmitted.length}</p>
              <p className="text-[10px] text-red-400/60 mt-0.5">ยังไม่ส่ง</p>
            </div>
          </div>
        </CardBtn>

        <CardBtn id="five" label="5 หัวข้อ NRW" sub={`จาก ${totalBranches} สาขา`}>
          <div className="flex items-end gap-3">
            <div>
              <p className="num text-2xl font-bold text-green-400">{fiveTopics.length}</p>
              <p className="text-[10px] text-green-400/60 mt-0.5">ส่งแล้ว</p>
            </div>
            <div className="w-px h-7 bg-white/10" />
            <div>
              <p className="num text-2xl font-bold text-red-400">{fiveNotSubmitted.length}</p>
              <p className="text-[10px] text-red-400/60 mt-0.5">ยังไม่ส่ง</p>
            </div>
          </div>
        </CardBtn>

        <CardBtn id="obstacle" label="อุปสรรคเร่งด่วน" sub="ล่าช้า / รอสนับสนุน">
          <div className="w-full flex justify-center">
            <div className="text-center">
              <p className="num text-2xl font-bold text-amber-400">{obstacles.length}</p>
              <p className="text-[10px] text-amber-400/60 mt-0.5">ประเด็น</p>
            </div>
          </div>
        </CardBtn>

        <CardBtn id="action" label="Action เกินกำหนด" sub="เกินกำหนดการ">
          <div className="w-full flex justify-center">
            <div className="text-center">
              <p className="num text-2xl font-bold text-red-400">{overdueActions.length}</p>
              <p className="text-[10px] text-red-400/60 mt-0.5">รายการ</p>
            </div>
          </div>
        </CardBtn>
      </div>

      {/* Side drawer */}
      <Drawer open={openPanel !== null} onClose={closeDrawer}>
        <DrawerHeader
          title={drawerTitle}
          subtitle={drawerSubtitle}
          onClose={closeDrawer}
          onBack={
            selectedMonthlyBranchId ? () => setSelectedMonthlyBranchId(null) :
            selectedFiveId          ? () => setSelectedFiveId(null) :
            undefined
          }
        />

        {openPanel === 'monthly' && !selectedMonthlyBranchId && (
          <MonthlyDrawerContent reports={reports} year={year} month={month} onSelect={setSelectedMonthlyBranchId} />
        )}
        {openPanel === 'monthly' && selectedMonthlyBranchId && (
          <MonthlyBranchDetailContent branchId={selectedMonthlyBranchId} year={year} month={month} />
        )}
        {openPanel === 'five' && !selectedFiveId && (
          <FiveTopicsListContent submitted={fiveTopics} year={year} month={month} onSelect={setSelectedFiveId} />
        )}
        {openPanel === 'five' && selectedFiveId && (
          <FiveTopicDetailContent id={selectedFiveId} />
        )}
        {openPanel === 'obstacle' && (
          <ObstacleDrawerContent obstacles={obstacles} />
        )}
        {openPanel === 'action' && (
          <ActionDrawerContent actions={overdueActions} />
        )}
      </Drawer>
    </>
  )
}
