'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { Branch, WaterNodeOption } from '@/lib/types'
import { submitAreaReports } from '@/app/actions/area-reports'
import type { AreaReportInput } from '@/app/actions/area-reports'
import { WaterNodeSelect } from '@/components/forms/WaterNodeSelect'

const OBSTACLE_TYPES = [
  'MM/DMA Zero Test ไม่ผ่าน',
  'Step Test Zero Test ไม่ผ่าน',
  'MM/DMA/P3 ชำรุด',
  'จุดค้างซ่อม',
  'มาตรผิดปกติ',
  'ปัญหาแรงดันน้ำไหลอ่อน',
  'ขาด logger / P3',
  'อื่น',
]

const REPAIR_STATUS = ['รอซ่อม', 'ซ่อมแล้ว', 'ซ่อมไม่ได้'] as const
type RepairStatus = (typeof REPAIR_STATUS)[number]

interface StepRow {
  step_no: number
  estimated_loss: string
  leaks_found: string
  repair_status: RepairStatus
}

interface ObstacleRow {
  obstacle_type: string
  other_description: string
  obstacle_detail: string
  resolution_plan: string
  impact: string
  region_support_needed: string
  priority: 'สูง' | 'กลาง'
}

interface AreaSet {
  key: string
  expanded: boolean
  area_name: string
  water_dist_before: string
  water_sold_before: string
  mnf_before: string
  step_tests: StepRow[]
  water_dist_after: string
  water_sold_after: string
  mnf_after: string
  pdca_do: string
  pdca_act: string
  has_obstacle: boolean
  obstacles: ObstacleRow[]
}

function newArea(index: number): AreaSet {
  return {
    key: `a_${Date.now()}_${index}`,
    expanded: true,
    area_name: '',
    water_dist_before: '',
    water_sold_before: '',
    mnf_before: '',
    step_tests: [{ step_no: 1, estimated_loss: '', leaks_found: '0', repair_status: 'รอซ่อม' }],
    water_dist_after: '',
    water_sold_after: '',
    mnf_after: '',
    pdca_do: '',
    pdca_act: '',
    has_obstacle: false,
    obstacles: [{ obstacle_type: '', other_description: '', obstacle_detail: '', resolution_plan: '', impact: '', region_support_needed: '', priority: 'กลาง' as const }],
  }
}

function calcNrw(dist: string, sold: string) {
  const d = parseFloat(dist)
  const s = parseFloat(sold)
  if (!d) return null
  return { loss: d - s, pct: ((d - s) / d) * 100 }
}

function fmt(n: number | null, dec = 2) {
  if (n === null) return '-'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

const INPUT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 transition-colors'
const SELECT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer'
const LABEL = 'block text-xs font-semibold text-white/40 uppercase tracking-wide mb-2'

interface Props {
  branches: Branch[]
  userBranchId?: string
  isAdmin: boolean
  mmNodesByBranch: Record<string, WaterNodeOption[]>
}

export function AreaReportForm({ branches, userBranchId, isAdmin, mmNodesByBranch }: Props) {
  const router = useRouter()
  const now = new Date()

  const [branchId, setBranchId] = useState(userBranchId ?? '')
  const [reportYear, setReportYear] = useState(now.getFullYear())
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1)
  const [areas, setAreas] = useState<AreaSet[]>([newArea(0)])
  const [submitting, setSubmitting] = useState(false)

  function patchArea(key: string, patch: Partial<AreaSet>) {
    setAreas((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
  }

  function addStep(key: string) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return {
          ...a,
          step_tests: [
            ...a.step_tests,
            { step_no: a.step_tests.length + 1, estimated_loss: '', leaks_found: '0', repair_status: 'รอซ่อม' },
          ],
        }
      })
    )
  }

  function patchStep(key: string, idx: number, patch: Partial<StepRow>) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return { ...a, step_tests: a.step_tests.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
      })
    )
  }

  function removeStep(key: string, idx: number) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return {
          ...a,
          step_tests: a.step_tests
            .filter((_, i) => i !== idx)
            .map((s, i) => ({ ...s, step_no: i + 1 })),
        }
      })
    )
  }

  function addObstacle(key: string) {
    setAreas((prev) =>
      prev.map((a) =>
        a.key === key
          ? { ...a, obstacles: [...a.obstacles, { obstacle_type: '', other_description: '', obstacle_detail: '', resolution_plan: '', impact: '', region_support_needed: '', priority: 'กลาง' as const }] }
          : a
      )
    )
  }

  function patchObstacle(key: string, idx: number, patch: Partial<ObstacleRow>) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return { ...a, obstacles: a.obstacles.map((o, i) => (i === idx ? { ...o, ...patch } : o)) }
      })
    )
  }

  function removeObstacle(key: string, idx: number) {
    setAreas((prev) =>
      prev.map((a) =>
        a.key === key ? { ...a, obstacles: a.obstacles.filter((_, i) => i !== idx) } : a
      )
    )
  }

  async function handleSubmit() {
    if (!branchId) { toast.error('กรุณาเลือกสาขา'); return }
    const missing = areas.find((a) => !a.area_name.trim())
    if (missing) { toast.error('กรุณาระบุชื่อพื้นที่ทุกพื้นที่'); return }

    setSubmitting(true)

    const payload: AreaReportInput[] = areas.map((a) => ({
      branch_id: branchId,
      report_year: reportYear,
      report_month: reportMonth,
      area_name: a.area_name.trim(),
      water_dist_before: parseFloat(a.water_dist_before) || null,
      water_sold_before: parseFloat(a.water_sold_before) || null,
      mnf_before: parseFloat(a.mnf_before) || null,
      water_dist_after: parseFloat(a.water_dist_after) || null,
      water_sold_after: parseFloat(a.water_sold_after) || null,
      mnf_after: parseFloat(a.mnf_after) || null,
      pdca_do: a.pdca_do || null,
      pdca_act: a.pdca_act || null,
      step_tests: a.step_tests.map((s) => ({
        step_no: s.step_no,
        estimated_loss: parseFloat(s.estimated_loss) || null,
        leaks_found: parseInt(s.leaks_found) || 0,
        repair_status: s.repair_status,
      })),
      obstacles: a.has_obstacle
        ? a.obstacles
            .filter((o) => o.obstacle_type)
            .map((o) => ({
              obstacle_type: o.obstacle_type,
              other_description: o.obstacle_type === 'อื่น' ? o.other_description || null : null,
              obstacle_detail: o.obstacle_detail || null,
              resolution_plan: o.resolution_plan || null,
              impact: o.impact || null,
              region_support_needed: o.region_support_needed || null,
              priority_order: o.priority === 'สูง' ? 1 : 2,
            }))
        : [],
    }))

    const result = await submitAreaReports(payload)
    if (result.success) {
      toast.success('บันทึกรายงานสำเร็จ')
      router.push('/monthly')
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      {/* ─── Header: branch / year / month ─── */}
      <div className="glass-card overflow-hidden">
        {/* accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500/60 to-transparent" />

        <div className="p-6 space-y-5">
          <p className="text-[11px] font-bold text-cyan-400/70 uppercase tracking-widest">
            ข้อมูลทั่วไป
          </p>

          {isAdmin && (
            <div>
              <label className={LABEL}>สาขา <span className="text-red-400 normal-case">*</span></label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={SELECT}>
                <option value="">— เลือกสาขา —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name_th}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>เดือน</label>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(Number(e.target.value))}
                className={SELECT}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{getThaiMonthName(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>ปี (พ.ศ.)</label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
                className={SELECT}
              >
                {[0, 1, 2].map((off) => {
                  const y = now.getFullYear() - off
                  return <option key={y} value={y}>{toThaiYear(y)}</option>
                })}
              </select>
            </div>
          </div>

          {/* summary pill */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span className="text-sm text-cyan-300/90">
              {getThaiMonthName(reportMonth)} {toThaiYear(reportYear)}
              {isAdmin && branchId && (
                <span className="text-cyan-400/60">
                  {' · '}{branches.find((b) => b.id === branchId)?.name_th}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Area sets ─── */}
      {areas.map((area, areaIdx) => {
        const before = calcNrw(area.water_dist_before, area.water_sold_before)
        const after = calcNrw(area.water_dist_after, area.water_sold_after)

        return (
          <div key={area.key} className="glass-card">
            {/* Area header */}
            <div
              className="flex items-center gap-3 p-5 cursor-pointer select-none"
              onClick={() => patchArea(area.key, { expanded: !area.expanded })}
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
                {areaIdx + 1}
              </div>
              <span className="flex-1 text-sm font-semibold text-white truncate">
                {area.area_name || (
                  <span className="text-white/30 font-normal">พื้นที่ที่ {areaIdx + 1}</span>
                )}
              </span>
              {areas.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAreas((prev) => prev.filter((a) => a.key !== area.key))
                  }}
                  className="text-red-400/50 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {area.expanded ? (
                <ChevronUp size={15} className="text-white/30 shrink-0" />
              ) : (
                <ChevronDown size={15} className="text-white/30 shrink-0" />
              )}
            </div>

            {area.expanded && (
              <div className="border-t border-white/10 px-5 pb-6 space-y-6">

                {/* Part 1 ─ พื้นที่ */}
                <section className="pt-5">
                  <p className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest mb-3">
                    ส่วนที่ 1 — พื้นที่
                  </p>
                  <WaterNodeSelect
                    key={branchId}
                    branchId={branchId}
                    initialMmNodes={mmNodesByBranch[branchId] ?? []}
                    value={area.area_name}
                    onChange={(label) => patchArea(area.key, { area_name: label })}
                  />
                </section>

                {/* Part 2 ─ ก่อนดำเนินการ */}
                <section>
                  <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest mb-2">
                    ส่วนที่ 2 — ก่อนดำเนินการ
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL}>น้ำจ่าย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_dist_before}
                        onChange={(e) => patchArea(area.key, { water_dist_before: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>น้ำขาย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_sold_before}
                        onChange={(e) => patchArea(area.key, { water_sold_before: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>MNF (ลบ.ม./ชม.)</label>
                      <input
                        type="number"
                        value={area.mnf_before}
                        onChange={(e) => patchArea(area.key, { mnf_before: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                  </div>
                  {before && (
                    <div className="mt-2 flex gap-5 text-xs bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-white/50">
                        น้ำสูญเสีย:{' '}
                        <strong className="text-white/80 num">{fmt(before.loss, 0)} ลบ.ม.</strong>
                      </span>
                      <span className="text-white/50">
                        NRW:{' '}
                        <strong className={`num ${before.pct > 20 ? 'text-red-400' : 'text-green-400'}`}>
                          {fmt(before.pct)}%
                        </strong>
                      </span>
                    </div>
                  )}
                </section>

                {/* Part 3 ─ Step Test */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest">
                      ส่วนที่ 3 — ผล Step Test
                    </p>
                    <button
                      onClick={() => addStep(area.key)}
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <Plus size={12} />
                      เพิ่มสเต็ป
                    </button>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-[36px_1fr_72px_116px_28px] gap-2 text-[10px] text-white/35 px-1 mb-1">
                    <span className="text-center">สเต็ป</span>
                    <span>สูญเสียคาดการณ์ (m³/hr)</span>
                    <span>จุดรั่ว</span>
                    <span>สถานะ</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {area.step_tests.map((step, si) => (
                      <div
                        key={si}
                        className="grid grid-cols-[36px_1fr_72px_116px_28px] gap-2 items-center"
                      >
                        <div className="text-xs text-white/40 font-mono text-center">{step.step_no}</div>
                        <input
                          type="number"
                          value={step.estimated_loss}
                          onChange={(e) => patchStep(area.key, si, { estimated_loss: e.target.value })}
                          placeholder="0.000"
                          className={INPUT}
                        />
                        <input
                          type="number"
                          min="0"
                          value={step.leaks_found}
                          onChange={(e) => patchStep(area.key, si, { leaks_found: e.target.value })}
                          className={INPUT}
                        />
                        <select
                          value={step.repair_status}
                          onChange={(e) =>
                            patchStep(area.key, si, { repair_status: e.target.value as RepairStatus })
                          }
                          className={SELECT}
                        >
                          {REPAIR_STATUS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeStep(area.key, si)}
                          disabled={area.step_tests.length === 1}
                          className="text-red-400/40 hover:text-red-400 disabled:opacity-20 transition-colors flex items-center justify-center"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Part 4 ─ หลังดำเนินการ */}
                <section>
                  <p className="text-[10px] font-bold text-green-400/60 uppercase tracking-widest mb-2">
                    ส่วนที่ 4 — หลังดำเนินการ
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL}>น้ำจ่าย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_dist_after}
                        onChange={(e) => patchArea(area.key, { water_dist_after: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>น้ำขาย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_sold_after}
                        onChange={(e) => patchArea(area.key, { water_sold_after: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>MNF (ลบ.ม./ชม.)</label>
                      <input
                        type="number"
                        value={area.mnf_after}
                        onChange={(e) => patchArea(area.key, { mnf_after: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                  </div>
                  {after && (
                    <div className="mt-2 flex flex-wrap gap-5 text-xs bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-white/50">
                        น้ำสูญเสีย:{' '}
                        <strong className="text-white/80 num">{fmt(after.loss, 0)} ลบ.ม.</strong>
                      </span>
                      <span className="text-white/50">
                        NRW:{' '}
                        <strong className={`num ${after.pct > 20 ? 'text-red-400' : 'text-green-400'}`}>
                          {fmt(after.pct)}%
                        </strong>
                      </span>
                      {before && (
                        <span className="text-white/50">
                          ผลต่าง:{' '}
                          <strong
                            className={`num ${after.pct < before.pct ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {after.pct < before.pct ? '▼' : '▲'} {fmt(Math.abs(before.pct - after.pct))}%
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </section>

                {/* Part 5 ─ Do / Act */}
                <section>
                  <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mb-2">
                    ส่วนที่ 5 — Do / Act
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL}>D (Do) — สิ่งที่ดำเนินการ</label>
                      <textarea
                        value={area.pdca_do}
                        onChange={(e) => patchArea(area.key, { pdca_do: e.target.value })}
                        rows={2}
                        placeholder="ระบุกิจกรรมที่ดำเนินการในช่วงเวลานี้..."
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                      />
                    </div>
                    <div>
                      <label className={LABEL}>A (Act) — แผนเดือนถัดไป</label>
                      <textarea
                        value={area.pdca_act}
                        onChange={(e) => patchArea(area.key, { pdca_act: e.target.value })}
                        rows={2}
                        placeholder="ระบุแผนที่จะดำเนินการถัดไป..."
                        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Part 6 ─ อุปสรรค */}
                <section>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest">
                      ส่วนที่ 6 — อุปสรรค
                    </p>
                    <button
                      onClick={() => patchArea(area.key, { has_obstacle: !area.has_obstacle })}
                      className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-xs border transition-colors ${
                        area.has_obstacle
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                          : 'bg-white/5 border-white/15 text-white/40'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                          area.has_obstacle ? 'bg-orange-400 border-orange-400' : 'border-white/30'
                        }`}
                      />
                      {area.has_obstacle ? 'มีอุปสรรค' : 'ไม่มีอุปสรรค'}
                    </button>
                  </div>

                  {area.has_obstacle && (
                    <div className="space-y-3">
                      {area.obstacles.map((obs, oi) => (
                        <div key={oi} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
                          {/* header row */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-orange-400/60 font-bold">อุปสรรคที่ {oi + 1}</span>
                            {area.obstacles.length > 1 && (
                              <button
                                onClick={() => removeObstacle(area.key, oi)}
                                className="ml-auto text-red-400/40 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* ประเภท */}
                          <div>
                            <label className={LABEL}>อุปสรรคเรื่อง</label>
                            <select
                              value={obs.obstacle_type}
                              onChange={(e) => patchObstacle(area.key, oi, { obstacle_type: e.target.value })}
                              className={SELECT}
                            >
                              <option value="">— เลือกประเภทอุปสรรค —</option>
                              {OBSTACLE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          {/* ระดับความเร่งด่วน */}
                          <div>
                            <label className={LABEL}>ระดับความเร่งด่วน</label>
                            <div className="flex gap-2">
                              {(['สูง', 'กลาง'] as const).map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => patchObstacle(area.key, oi, { priority: lvl })}
                                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    obs.priority === lvl
                                      ? lvl === 'สูง'
                                        ? 'bg-red-500/20 border-red-500/60 text-red-300'
                                        : 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                                      : 'bg-white/5 border-white/15 text-white/40'
                                  }`}
                                >
                                  {lvl === 'สูง' ? '🔴' : '🟡'} {lvl}
                                </button>
                              ))}
                            </div>
                          </div>

                          {obs.obstacle_type === 'อื่น' && (
                            <div>
                              <label className={LABEL}>ระบุอุปสรรค</label>
                              <input
                                type="text"
                                value={obs.other_description}
                                onChange={(e) => patchObstacle(area.key, oi, { other_description: e.target.value })}
                                placeholder="ระบุอุปสรรคที่พบ..."
                                className={INPUT}
                              />
                            </div>
                          )}

                          {/* รายละเอียดอุปสรรค */}
                          <div>
                            <label className={LABEL}>รายละเอียดอุปสรรค</label>
                            <textarea
                              value={obs.obstacle_detail}
                              onChange={(e) => patchObstacle(area.key, oi, { obstacle_detail: e.target.value })}
                              rows={2}
                              placeholder="อธิบายสภาพปัญหาที่พบ..."
                              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>

                          {/* แนวทางการแก้ไข */}
                          <div>
                            <label className={LABEL}>แนวทางการแก้ไข</label>
                            <textarea
                              value={obs.resolution_plan}
                              onChange={(e) => patchObstacle(area.key, oi, { resolution_plan: e.target.value })}
                              rows={2}
                              placeholder="ระบุแนวทางที่จะดำเนินการแก้ไข..."
                              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>

                          {/* ผลกระทบที่ได้รับ */}
                          <div>
                            <label className={LABEL}>ผลกระทบที่ได้รับ</label>
                            <textarea
                              value={obs.impact}
                              onChange={(e) => patchObstacle(area.key, oi, { impact: e.target.value })}
                              rows={2}
                              placeholder="ผลกระทบต่อการให้บริการหรือข้อมูล NRW..."
                              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>

                          {/* สิ่งที่ต้องการจากเขต */}
                          <div>
                            <label className={LABEL}>สิ่งที่ต้องการความช่วยเหลือจากเขต</label>
                            <textarea
                              value={obs.region_support_needed}
                              onChange={(e) => patchObstacle(area.key, oi, { region_support_needed: e.target.value })}
                              rows={2}
                              placeholder="ระบุสิ่งที่ต้องการให้เขตช่วยเหลือ (หากมี)..."
                              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => addObstacle(area.key)}
                        className="flex items-center gap-1 text-xs text-orange-400/70 hover:text-orange-400 transition-colors"
                      >
                        <Plus size={12} />
                        เพิ่มอุปสรรค
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )
      })}

      {/* Add area */}
      <button
        onClick={() => setAreas((prev) => [...prev, newArea(prev.length)])}
        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-sm text-white/40 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={14} />
        เพิ่มพื้นที่
      </button>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-1">
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm text-white/60 hover:text-white border border-white/15 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 text-sm bg-green-500 hover:bg-green-400 text-[#061327] font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          {submitting ? 'กำลังบันทึก...' : `บันทึก ${areas.length} พื้นที่`}
        </button>
      </div>
    </div>
  )
}
