'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ChevronRight, AlertTriangle, Trash2, Pencil, X, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { KpiCard } from './KpiCard'
import { StepTestChart } from './StepTestChart'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { deleteAreaReport } from '@/app/actions/reports'
import { AreaReportEditInline } from './AreaReportEditInline'

interface StepTestResult {
  step_no: number
  estimated_loss?: number | null
  leaks_found?: number | null
  leaks_repaired?: number | null
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

export interface AreaReport {
  id: string
  branch_id: string
  report_year: number
  report_month: number
  area_name: string
  water_dist_before?: number | null
  water_sold_before?: number | null
  mnf_before?: number | null
  water_dist_after?: number | null
  water_sold_after?: number | null
  mnf_after?: number | null
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
  if (pct == null) return <span className="text-black/25 text-xs">—</span>
  const cls = pct <= 20 ? 'text-[#1E7A5A]' : pct <= 25 ? 'text-[#A8721A]' : 'text-[#B3392C]'
  return <span className={`num text-sm font-bold ${cls}`}>{fmt(pct)}%</span>
}

// ── Aggregate + chart helpers — mirrors computeAgg()/metricValue() in
// lib/utils/pdca-import.ts so the "view saved report" popup and the
// "preview a .json before saving" page (/pdca/import) read identically. ──

function metricValue(r: AreaReport, phase: 'before' | 'after', metric: 'nrw' | 'mnf'): number | null {
  if (metric === 'mnf') return (phase === 'before' ? r.mnf_before : r.mnf_after) ?? null
  const dist = phase === 'before' ? r.water_dist_before : r.water_dist_after
  const sold = phase === 'before' ? r.water_sold_before : r.water_sold_after
  return dist ? ((dist - (sold ?? 0)) / dist) * 100 : null
}

interface ReportAgg {
  pctB: number | null; pctA: number | null
  lossB: number; lossA: number
  mnfB: number | null; mnfA: number | null
  found: number; repaired: number
}

function computeAgg(reports: AreaReport[]): ReportAgg {
  let distB = 0, soldB = 0, distA = 0, soldA = 0, found = 0, repaired = 0
  let mnfBSum = 0, mnfBCount = 0, mnfASum = 0, mnfACount = 0

  for (const r of reports) {
    distB += r.water_dist_before ?? 0
    soldB += r.water_sold_before ?? 0
    distA += r.water_dist_after ?? 0
    soldA += r.water_sold_after ?? 0
    repaired += r.leaks_repaired ?? 0
    found += (r.leaks_repaired ?? 0) + (r.leaks_pending ?? 0)
    if (r.mnf_before != null) { mnfBSum += r.mnf_before; mnfBCount++ }
    if (r.mnf_after  != null) { mnfASum += r.mnf_after;  mnfACount++ }
  }

  return {
    pctB: distB > 0 ? ((distB - soldB) / distB) * 100 : null,
    pctA: distA > 0 ? ((distA - soldA) / distA) * 100 : null,
    lossB: distB - soldB,
    lossA: distA - soldA,
    mnfB: mnfBCount ? mnfBSum / mnfBCount : null,
    mnfA: mnfACount ? mnfASum / mnfACount : null,
    found, repaired,
  }
}

function CustomTooltip({ active, payload, label, unit, decimals }: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
  unit: string
  decimals: number
}) {
  if (!active || !payload?.length) return null
  const before = payload.find((p) => p.dataKey === 'before')?.value
  const after = payload.find((p) => p.dataKey === 'after')?.value
  return (
    <div className="bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-[#12181F] mb-1.5">{label}</p>
      <p className="text-black/50">ก่อน: <span className="text-black/75 font-medium">{fmt(before, decimals)} {unit}</span></p>
      <p className="text-black/50">หลัง: <span className="text-[#0B6E76] font-medium">{fmt(after, decimals)} {unit}</span></p>
    </div>
  )
}

function MetricChart({ reports, metric, title }: { reports: AreaReport[]; metric: 'nrw' | 'mnf'; title: string }) {
  const unit = metric === 'mnf' ? 'ลบ.ม./ชม.' : '%'
  const decimals = metric === 'mnf' ? 2 : 1
  const chartData = reports.map((r) => ({
    name: r.area_name.length > 14 ? r.area_name.slice(0, 13) + '…' : r.area_name,
    before: metricValue(r, 'before', metric),
    after: metricValue(r, 'after', metric),
  }))

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="page-kicker">{title}</p>
        <div className="flex items-center gap-4 text-xs text-black/45">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#98A2AF' }} />ก่อน</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#0B6E76' }} />หลัง</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 4 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'rgba(0,0,0,.4)', fontSize: 10.5 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: 'rgba(0,0,0,.4)', fontSize: 10.5 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}${metric === 'mnf' ? '' : '%'}`}
          />
          <Tooltip content={<CustomTooltip unit={unit} decimals={decimals} />} cursor={{ fill: 'rgba(0,0,0,.03)' }} />
          <Bar dataKey="before" fill="#98A2AF" radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar dataKey="after" fill="#0B6E76" radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** free-text pdca_do/pdca_act → numbered bullet items, one per non-empty line — matches the pdca-tool Do/Act list look without needing a schema change */
function toBullets(text?: string | null): string[] {
  if (!text) return []
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-[12px] text-black/30">— ไม่มีข้อมูล —</p>
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 text-[12.5px]">
          <span className="shrink-0 w-4 h-4 rounded-full bg-black/5 border border-black/10 text-[9px] font-bold flex items-center justify-center text-black/40 mt-0.5">{i + 1}</span>
          <p className="text-[#12181F]">{it}</p>
        </div>
      ))}
    </div>
  )
}

// ── One area — styled like the offline PDCA tool's dashboard area card ──
function AreaDashCard({
  report, canEdit, canDelete, onEdit, deletePending, confirming, onConfirmDelete, onCancelDelete, onDelete,
}: {
  report: AreaReport
  canEdit: boolean
  canDelete?: boolean
  onEdit: () => void
  deletePending: boolean
  confirming: boolean
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}) {
  const pB = metricValue(report, 'before', 'nrw')
  const pA = metricValue(report, 'after', 'nrw')
  const mB = report.mnf_before ?? null
  const mA = report.mnf_after ?? null
  const found = (report.leaks_repaired ?? 0) + (report.leaks_pending ?? 0)
  const pending = report.leaks_pending ?? 0
  const lossAfter = (report.water_dist_after ?? 0) - (report.water_sold_after ?? 0)

  const obstacles = report.area_obstacles ?? []
  const hasHighPriority = obstacles.some((o) => o.priority_order === 1)
  const stripe = obstacles.length
    ? (hasHighPriority ? 'accent-bar-red' : 'accent-bar-amber')
    : 'accent-bar-green'

  const steps = [...(report.step_test_results ?? [])].sort((a, b) => a.step_no - b.step_no)

  return (
    <div className={`glass-card p-5 ${stripe}`}>
      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <h3 className="text-[15px] font-bold text-[#12181F] flex-1 min-w-0 truncate">{report.area_name}</h3>
        {obstacles.length > 0 && (
          <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
            hasHighPriority ? 'bg-[#B3392C]/12 text-[#B3392C]' : 'bg-[#A8721A]/10 text-[#A8721A]'
          }`}>
            {hasHighPriority ? '🔴' : '🟡'} อุปสรรค {obstacles.length} รายการ
          </span>
        )}
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
          report.status === 'submitted'
            ? 'bg-[#0B6E76]/12 border-[#0B6E76]/30 text-[#0B6E76]'
            : 'bg-black/5 border-black/15 text-[#4B5563]'
        }`}>
          {report.status === 'submitted' ? 'ส่งแล้ว' : report.status}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 text-[10px] font-semibold text-black/40 hover:text-[#0B6E76] hover:bg-[#0B6E76]/10 px-2 py-0.5 rounded-lg border border-transparent hover:border-[#0B6E76]/20 transition-all"
          >
            <Pencil size={10} />
            แก้ไข
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-sm text-black/50 mb-1.5">
        <span>NRW:</span>
        <span className="num font-bold text-[15px] text-[#12181F]">{pB !== null ? `${fmt(pB, 1)}%` : '—'}</span>
        <span className="text-black/25">→</span>
        <span className="num font-bold text-[15px] text-[#12181F]">{pA !== null ? `${fmt(pA, 1)}%` : '—'}</span>
        {pB !== null && pA !== null && (
          <span className={`num font-bold ${pA <= pB ? 'text-[#1E7A5A]' : 'text-[#B3392C]'}`}>
            {pA <= pB ? '▼' : '▲'} {fmt(Math.abs(pB - pA), 1)} จุด
          </span>
        )}
      </div>

      {(mB !== null || mA !== null) && (
        <div className="flex items-center gap-2 flex-wrap text-sm text-black/50 mb-3">
          <span>MNF:</span>
          <span className="num font-bold text-[15px] text-[#12181F]">{fmt(mB)}</span>
          <span className="text-black/25">→</span>
          <span className="num font-bold text-[15px] text-[#12181F]">{fmt(mA)}</span>
          <span className="text-[11px] text-black/35">ลบ.ม./ชม.</span>
          {mB !== null && mA !== null && (
            <span className={`num font-bold ${mA <= mB ? 'text-[#1E7A5A]' : 'text-[#B3392C]'}`}>
              {mA <= mB ? '▼' : '▲'} {fmt(Math.abs(mB - mA))}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-black/50 mb-4">
        <span>น้ำสูญเสียหลัง: <b className="num text-[#12181F]">{fmt(lossAfter, 0)}</b> ลบ.ม.</span>
        <span>จุดรั่วพบ: <b className="num text-[#12181F]">{found}</b></span>
        <span>ซ่อมแล้ว: <b className="num text-[#12181F]">{report.leaks_repaired ?? 0}</b></span>
        <span>ค้างซ่อม: <b className={`num ${pending > 0 ? 'text-[#B3392C]' : 'text-[#12181F]'}`}>{pending}</b></span>
      </div>

      {steps.length > 0 && (
        <div className="mb-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#0B6E76] mb-1">
            Step Test — สูญเสียคาดการณ์ (ลบ.ม./ชม.)
          </p>
          <div className="flex items-center gap-4 text-[10.5px] text-black/45 mb-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#98A2AF' }} />ไม่มีจุดรั่ว</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1E7A5A' }} />พบ · ซ่อมครบแล้ว</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#B3392C' }} />พบ · ค้างซ่อม</span>
          </div>
          <StepTestChart steps={steps.map((s) => ({
            label: `สเต็ป ${s.step_no}`,
            loss: s.estimated_loss ?? 0,
            found: s.leaks_found ?? 0,
            repaired: s.leaks_repaired ?? 0,
          }))} />
          <details className="mt-1 group">
            <summary className="text-[11px] font-semibold text-[#0B6E76] cursor-pointer select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform">▸</span> แสดงตารางข้อมูล Step Test
            </summary>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-[9.5px] uppercase tracking-wide text-black/35">
                    <th className="text-left font-bold pb-1.5">สเต็ป</th>
                    <th className="text-right font-bold pb-1.5">สูญเสียคาดการณ์</th>
                    <th className="text-right font-bold pb-1.5">พบ</th>
                    <th className="text-right font-bold pb-1.5">ซ่อมแล้ว</th>
                    <th className="text-right font-bold pb-1.5">ค้างซ่อม</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s) => {
                    const stepPending = Math.max(0, (s.leaks_found ?? 0) - (s.leaks_repaired ?? 0))
                    return (
                      <tr key={s.step_no} className="border-t border-black/6">
                        <td className="py-1.5 text-black/60">{s.step_no}</td>
                        <td className="py-1.5 text-right num text-black/70">{fmt(s.estimated_loss, 2)}</td>
                        <td className="py-1.5 text-right num text-black/70">{s.leaks_found ?? 0}</td>
                        <td className="py-1.5 text-right num text-black/70">{s.leaks_repaired ?? 0}</td>
                        <td className={`py-1.5 text-right num font-semibold ${stepPending > 0 ? 'text-[#B3392C]' : 'text-black/30'}`}>{stepPending}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#0B6E76] mb-2">Do — ดำเนินการแล้ว</p>
          <BulletList items={toBullets(report.pdca_do)} />
        </div>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#1E7A5A] mb-2">Act — แผนถัดไป</p>
          <BulletList items={toBullets(report.pdca_act)} />
        </div>
      </div>

      {obstacles.map((obs, i) => (
        <div key={i} className="mt-4 rounded-xl border border-black/8 bg-black/2 p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
              obs.priority_order === 1 ? 'bg-[#B3392C]/12 text-[#B3392C]' : 'bg-[#A8721A]/10 text-[#A8721A]'
            }`}>
              {obs.priority_order === 1 ? '🔴 สูง' : '🟡 กลาง'}
            </span>
            <span className="text-[12.5px] font-bold text-[#12181F]">{obs.obstacle_type || 'ไม่ระบุประเภท'}</span>
          </div>
          {obs.obstacle_detail && (
            <div className="mb-2">
              <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#B3392C] flex items-center gap-1 mb-0.5">
                <AlertTriangle size={11} /> รายละเอียดอุปสรรค
              </p>
              <p className="text-[12.5px] text-black/60">{obs.obstacle_detail}</p>
            </div>
          )}
          {obs.resolution_plan && (
            <div className="mb-2">
              <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#1E7A5A] flex items-center gap-1 mb-0.5">
                แนวทางการแก้ไข
              </p>
              <p className="text-[12.5px] text-black/60">{obs.resolution_plan}</p>
            </div>
          )}
          {obs.region_support_needed && (
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#A8721A] mb-0.5">ต้องการจากเขต</p>
              <p className="text-[12.5px] text-[#A8721A]">{obs.region_support_needed}</p>
            </div>
          )}
        </div>
      ))}

      {canDelete && (
        <div className="pt-4 mt-4 border-t border-black/8">
          {!confirming ? (
            <button
              type="button"
              onClick={onConfirmDelete}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#B3392C]/20 text-[#B3392C]/80 text-xs font-semibold hover:bg-[#B3392C]/10 hover:border-[#B3392C]/40 transition-colors"
            >
              <Trash2 size={12} />
              ลบพื้นที่นี้
            </button>
          ) : (
            <div className="rounded-lg border border-[#B3392C]/40 bg-[#B3392C]/10 p-3 space-y-2">
              <p className="text-xs text-[#B3392C] font-semibold">ยืนยันลบ &ldquo;{report.area_name}&rdquo;?</p>
              <p className="text-[10px] text-black/40">ไม่สามารถกู้คืนได้</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancelDelete}
                  disabled={deletePending}
                  className="flex-1 py-1.5 rounded-lg bg-black/10 text-black/60 text-xs font-semibold hover:bg-black/15 disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                >
                  <X size={12} /> ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deletePending}
                  className="flex-1 py-1.5 rounded-lg bg-[#B3392C] hover:bg-[#9c2f25] text-[#FFFFFF] text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1"
                >
                  <Check size={12} /> {deletePending ? 'กำลังลบ...' : 'ลบเลย'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Shared detail body (used by both AreaReportTable and BranchSummaryGrid) ──
// Styled like the offline PDCA tool's "แดชบอร์ด" tab: KPI row, before/after
// bar charts per area, then one dashboard-style card per area.
export function AreaDetailBody({
  reports,
  canDelete,
}: {
  reports: AreaReport[]
  canDelete?: boolean
}) {
  const router = useRouter()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)

  const branchName = reports[0]?.branches?.name_th ?? ''
  const reportPeriod = reports[0]
    ? `${getThaiMonthName(reports[0].report_month)} ${toThaiYear(reports[0].report_year)}`
    : ''

  const agg = computeAgg(reports)
  const nrwDelta = agg.pctB !== null && agg.pctA !== null ? agg.pctB - agg.pctA : null
  const mnfDelta = agg.mnfB !== null && agg.mnfA !== null ? agg.mnfB - agg.mnfA : null
  const pending = Math.max(0, agg.found - agg.repaired)
  // Only claim a "loss reduced" figure when there's an actual before-baseline —
  // otherwise distB defaults to 0 and lossB - lossA prints a huge, misleading negative.
  const lossReduced = agg.pctB !== null ? agg.lossB - agg.lossA : null

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

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#FFFFFF] border-b border-black/10 p-5 space-y-1">
        <DialogTitle className="text-lg font-bold text-[#12181F]">
          {branchName || 'รายงานพื้นที่'}
        </DialogTitle>
        <p className="text-xs text-black/40">
          {reportPeriod}{reports.length > 0 ? ` · ${reports.length} พื้นที่` : ''}
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard label="จำนวนพื้นที่" value={reports.length} unit="พื้นที่" accentColor="blue" />
          <KpiCard label="NRW เฉลี่ยก่อน" value={agg.pctB !== null ? fmt(agg.pctB, 1) : '—'} unit="%" accentColor="sky" />
          <KpiCard label="NRW เฉลี่ยหลัง" value={agg.pctA !== null ? fmt(agg.pctA, 1) : '—'} unit="%" accentColor="teal" delta={nrwDelta} />
          <KpiCard label="MNF เฉลี่ยหลัง" value={agg.mnfA !== null ? fmt(agg.mnfA, 2) : '—'} unit="ลบ.ม./ชม." accentColor="cyan" delta={mnfDelta} />
          <KpiCard label="น้ำสูญเสียลดลง" value={lossReduced !== null ? fmt(lossReduced, 0) : '—'} unit={lossReduced !== null ? 'ลบ.ม.' : undefined} accentColor="purple" />
          <KpiCard
            label="จุดรั่วค้างซ่อม"
            value={pending}
            sub={`จาก ${agg.found} จุด`}
            accentColor={pending > 0 ? 'red' : 'green'}
          />
        </div>

        {/* Charts */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricChart reports={reports} metric="nrw" title="อัตราน้ำสูญเสีย (NRW%) ก่อน–หลัง รายพื้นที่" />
            <MetricChart reports={reports} metric="mnf" title="MNF ก่อน–หลัง รายพื้นที่ (ลบ.ม./ชม.)" />
          </div>
        )}

        {/* Area cards */}
        <div className="space-y-4">
          {reports.map((report) => {
            if (editingId === report.id) {
              return (
                <div key={report.id} className="glass-card overflow-hidden">
                  <AreaReportEditInline
                    report={report}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null)
                      router.refresh()
                    }}
                  />
                </div>
              )
            }
            return (
              <AreaDashCard
                key={report.id}
                report={report}
                canEdit
                canDelete={canDelete}
                onEdit={() => setEditingId(report.id)}
                deletePending={deletePending}
                confirming={confirmDeleteId === report.id}
                onConfirmDelete={() => setConfirmDeleteId(report.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onDelete={() => handleDelete(report.id)}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Branch-view area list ──────────────────────────────────
interface Props {
  data: AreaReport[]
  showBranch?: boolean
  canDelete?: boolean
}

export function AreaReportTable({ data, showBranch, canDelete }: Props) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)

  const branchReports = selectedBranchId
    ? data.filter((r) => r.branch_id === selectedBranchId)
    : []

  useEffect(() => {
    if (selectedBranchId && branchReports.length === 0) {
      setSelectedBranchId(null)
    }
  }, [selectedBranchId, branchReports.length])

  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-black/30">
        ยังไม่มีรายงาน — กด <strong className="text-black/50">บันทึกใหม่</strong> เพื่อเริ่มต้น
      </div>
    )
  }

  return (
    <>
      <div className="divide-y divide-black/5">
        {data.map((row) => {
          const before = nrw(row.water_dist_before, row.water_sold_before)
          const after  = nrw(row.water_dist_after,  row.water_sold_after)
          const obstCount = row.area_obstacles?.length ?? 0
          const hasHighPriority = row.area_obstacles?.some((o) => o.priority_order === 1)

          return (
            <button
              key={row.id}
              onClick={() => setSelectedBranchId(row.branch_id)}
              className="w-full text-left px-4 py-3.5 hover:bg-black/5 transition-colors flex items-center gap-3 group"
            >
              <div className={`w-1 h-10 rounded-full shrink-0 ${hasHighPriority ? 'bg-[#B3392C]' : 'bg-black/10'}`} />

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#12181F] truncate">{row.area_name}</span>
                  {obstCount > 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      hasHighPriority
                        ? 'bg-[#B3392C]/12 border-[#B3392C]/30 text-[#B3392C]'
                        : 'bg-[#A8721A]/10 border-[#A8721A]/25 text-[#A8721A]'
                    }`}>
                      <AlertTriangle size={9} />
                      {obstCount} อุปสรรค
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-black/40">
                  {showBranch && row.branches && <span>{row.branches.name_th}</span>}
                  <span className="num">{getThaiMonthName(row.report_month)} {toThaiYear(row.report_year)}</span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <NrwChip pct={before} />
                {before != null && after != null && (
                  <>
                    <span className="text-black/20 text-xs">→</span>
                    <NrwChip pct={after} />
                    <span className={`text-[10px] font-bold num ${after < before ? 'text-[#1E7A5A]' : 'text-[#B3392C]'}`}>
                      {after < before ? '▼' : '▲'}{fmt(Math.abs(before - after))}%
                    </span>
                  </>
                )}
              </div>

              <ChevronRight size={14} className="text-black/20 group-hover:text-black/50 transition-colors shrink-0" />
            </button>
          )
        })}
      </div>

      <Dialog open={!!selectedBranchId} onOpenChange={(o) => !o && setSelectedBranchId(null)}>
        <DialogContent className="w-[95vw] max-w-[1100px] max-h-[90vh] bg-[#FFFFFF] border-[#EFF2F5] overflow-y-auto flex flex-col gap-0 p-0 rounded-2xl">
          <AreaDetailBody reports={branchReports} canDelete={canDelete} />
        </DialogContent>
      </Dialog>
    </>
  )
}
