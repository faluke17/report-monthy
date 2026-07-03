'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateAreaReport } from '@/app/actions/reports'
import type { AreaReport } from './AreaReportTable'

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

const REPAIR_STATUSES = ['รอซ่อม', 'ซ่อมแล้ว', 'ซ่อมไม่ได้']

interface StepRow {
  step_no: number
  estimated_loss: string
  leaks_found: string
  leaks_repaired: string
  repair_status: string
}

interface ObstacleRow {
  obstacle_type: string
  other_description: string
  obstacle_detail: string
  resolution_plan: string
  impact: string
  region_support_needed: string
  priority: 1 | 2
}

const INPUT = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 transition-colors'
const LABEL = 'block text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-1.5'

interface Props {
  report: AreaReport
  onCancel: () => void
  onSaved: () => void
}

export function AreaReportEditInline({ report, onCancel, onSaved }: Props) {
  const [saving, startSave] = useTransition()

  const [waterDistBefore, setWaterDistBefore] = useState(String(report.water_dist_before ?? ''))
  const [waterSoldBefore, setWaterSoldBefore] = useState(String(report.water_sold_before ?? ''))
  const [mnfBefore, setMnfBefore] = useState(String(report.mnf_before ?? ''))
  const [waterDistAfter, setWaterDistAfter] = useState(String(report.water_dist_after ?? ''))
  const [waterSoldAfter, setWaterSoldAfter] = useState(String(report.water_sold_after ?? ''))
  const [mnfAfter, setMnfAfter] = useState(String(report.mnf_after ?? ''))
  const [leaksRepaired, setLeaksRepaired] = useState(String(report.leaks_repaired ?? ''))
  const [leaksPending, setLeaksPending] = useState(String(report.leaks_pending ?? ''))
  const [pdcaDo, setPdcaDo] = useState(report.pdca_do ?? '')
  const [pdcaAct, setPdcaAct] = useState(report.pdca_act ?? '')

  const [steps, setSteps] = useState<StepRow[]>(() => {
    const existing = report.step_test_results ?? []
    if (existing.length === 0) {
      return [{ step_no: 1, estimated_loss: '', leaks_found: '0', leaks_repaired: '0', repair_status: 'รอซ่อม' }]
    }
    return existing.map((s, i) => ({
      step_no: s.step_no ?? i + 1,
      estimated_loss: String(s.estimated_loss ?? ''),
      leaks_found: String(s.leaks_found ?? 0),
      leaks_repaired: '0',
      repair_status: s.repair_status ?? 'รอซ่อม',
    }))
  })

  const [hasObstacle, setHasObstacle] = useState((report.area_obstacles?.length ?? 0) > 0)
  const [obstacles, setObstacles] = useState<ObstacleRow[]>(() =>
    (report.area_obstacles ?? []).length > 0
      ? report.area_obstacles!.map((o) => ({
          obstacle_type: o.obstacle_type,
          other_description: '',
          obstacle_detail: o.obstacle_detail ?? '',
          resolution_plan: o.resolution_plan ?? '',
          impact: o.impact ?? '',
          region_support_needed: o.region_support_needed ?? '',
          priority: o.priority_order === 1 ? 1 : 2,
        }))
      : [{ obstacle_type: '', other_description: '', obstacle_detail: '', resolution_plan: '', impact: '', region_support_needed: '', priority: 2 }]
  )

  function addStep() {
    setSteps((prev) => [...prev, { step_no: prev.length + 1, estimated_loss: '', leaks_found: '0', leaks_repaired: '0', repair_status: 'รอซ่อม' }])
  }

  function patchStep(idx: number, patch: Partial<StepRow>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_no: i + 1 })))
  }

  function addObstacle() {
    setObstacles((prev) => [...prev, { obstacle_type: '', other_description: '', obstacle_detail: '', resolution_plan: '', impact: '', region_support_needed: '', priority: 2 }])
  }

  function patchObstacle(idx: number, patch: Partial<ObstacleRow>) {
    setObstacles((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  }

  function removeObstacle(idx: number) {
    setObstacles((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    if (hasObstacle) {
      const incomplete = obstacles.some((o) =>
        !o.obstacle_type &&
        (o.obstacle_detail.trim() || o.resolution_plan.trim() || o.impact.trim() || o.region_support_needed.trim())
      )
      if (incomplete) {
        toast.error('กรุณาเลือก "ประเภท" อุปสรรค มิฉะนั้นข้อมูลอุปสรรคจะไม่ถูกบันทึก')
        return
      }
    }
    startSave(async () => {
      const result = await updateAreaReport(report.id, {
        water_dist_before: parseFloat(waterDistBefore) || null,
        water_sold_before: parseFloat(waterSoldBefore) || null,
        mnf_before: parseFloat(mnfBefore) || null,
        water_dist_after: parseFloat(waterDistAfter) || null,
        water_sold_after: parseFloat(waterSoldAfter) || null,
        mnf_after: parseFloat(mnfAfter) || null,
        leaks_repaired: leaksRepaired !== '' ? parseInt(leaksRepaired) : null,
        leaks_pending: leaksPending !== '' ? parseInt(leaksPending) : null,
        pdca_do: pdcaDo.trim() || null,
        pdca_act: pdcaAct.trim() || null,
        step_tests: steps.map((s) => ({
          step_no: s.step_no,
          estimated_loss: parseFloat(s.estimated_loss) || null,
          leaks_found: parseInt(s.leaks_found) || 0,
          leaks_repaired: s.leaks_repaired !== '' ? parseInt(s.leaks_repaired) : null,
          repair_status: s.repair_status || null,
        })),
        obstacles: hasObstacle
          ? obstacles
              .filter((o) => o.obstacle_type)
              .map((o) => ({
                obstacle_type: o.obstacle_type,
                other_description: o.obstacle_type === 'อื่น' ? o.other_description || null : null,
                obstacle_detail: o.obstacle_detail || null,
                resolution_plan: o.resolution_plan || null,
                impact: o.impact || null,
                region_support_needed: o.region_support_needed || null,
                priority_order: o.priority,
              }))
          : [],
      })

      if (result.success) {
        toast.success('บันทึกสำเร็จ')
        onSaved()
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">{report.area_name}</p>
          <p className="text-[10px] text-cyan-400/60 mt-0.5">โหมดแก้ไข</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white border border-white/15 rounded-lg transition-colors disabled:opacity-40"
          >
            <X size={12} />
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-bold rounded-lg disabled:opacity-40 transition-colors"
          >
            <Check size={12} />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* ก่อนดำเนินการ */}
      <section>
        <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest mb-2">ก่อนดำเนินการ</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={LABEL}>น้ำจ่าย (ลบ.ม.)</label>
            <input type="number" value={waterDistBefore} onChange={(e) => setWaterDistBefore(e.target.value)} placeholder="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>น้ำขาย (ลบ.ม.)</label>
            <input type="number" value={waterSoldBefore} onChange={(e) => setWaterSoldBefore(e.target.value)} placeholder="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>MNF (m³/hr)</label>
            <input type="number" value={mnfBefore} onChange={(e) => setMnfBefore(e.target.value)} placeholder="0" className={INPUT} />
          </div>
        </div>
      </section>

      {/* Step Test */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest">Step Test</p>
          <button type="button" onClick={addStep} className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            <Plus size={11} /> เพิ่มสเต็ป
          </button>
        </div>
        <div className="grid grid-cols-[24px_1fr_56px_56px_80px_20px] gap-1.5 text-[9px] text-white/25 px-0.5 mb-1">
          <span />
          <span>สูญเสีย (m³/hr)</span>
          <span className="text-center">จุดรั่ว</span>
          <span className="text-center">ซ่อมแล้ว</span>
          <span>สถานะ</span>
          <span />
        </div>
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="grid grid-cols-[24px_1fr_56px_56px_80px_20px] gap-1.5 items-center">
              <span className="text-xs text-white/40 font-mono text-center">{s.step_no}</span>
              <input
                type="number"
                value={s.estimated_loss}
                onChange={(e) => patchStep(i, { estimated_loss: e.target.value })}
                placeholder="0.000"
                className={INPUT}
              />
              <input
                type="number"
                min="0"
                value={s.leaks_found}
                onChange={(e) => patchStep(i, { leaks_found: e.target.value })}
                className={INPUT}
              />
              <input
                type="number"
                min="0"
                value={s.leaks_repaired}
                onChange={(e) => patchStep(i, { leaks_repaired: e.target.value })}
                className={INPUT}
              />
              <select
                value={s.repair_status}
                onChange={(e) => patchStep(i, { repair_status: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
              >
                {REPAIR_STATUSES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeStep(i)}
                disabled={steps.length === 1}
                className="text-red-400/40 hover:text-red-400 disabled:opacity-20 transition-colors flex items-center justify-center"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* หลังดำเนินการ */}
      <section>
        <p className="text-[10px] font-bold text-green-400/60 uppercase tracking-widest mb-2">หลังดำเนินการ</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={LABEL}>น้ำจ่าย (ลบ.ม.)</label>
            <input type="number" value={waterDistAfter} onChange={(e) => setWaterDistAfter(e.target.value)} placeholder="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>น้ำขาย (ลบ.ม.)</label>
            <input type="number" value={waterSoldAfter} onChange={(e) => setWaterSoldAfter(e.target.value)} placeholder="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>MNF (m³/hr)</label>
            <input type="number" value={mnfAfter} onChange={(e) => setMnfAfter(e.target.value)} placeholder="0" className={INPUT} />
          </div>
        </div>
      </section>

      {/* จุดรั่วรวม */}
      <section>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">จุดรั่วรวม</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL}>ซ่อมแล้ว (จุด)</label>
            <input type="number" min="0" value={leaksRepaired} onChange={(e) => setLeaksRepaired(e.target.value)} placeholder="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>ค้างซ่อม (จุด)</label>
            <input type="number" min="0" value={leaksPending} onChange={(e) => setLeaksPending(e.target.value)} placeholder="0" className={INPUT} />
          </div>
        </div>
      </section>

      {/* PDCA Do */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-md bg-cyan-500/25 border border-cyan-500/40 flex items-center justify-center text-[10px] font-black text-cyan-300">D</span>
          <p className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-widest">Do — สิ่งที่ดำเนินการ</p>
        </div>
        <textarea
          value={pdcaDo}
          onChange={(e) => setPdcaDo(e.target.value)}
          rows={4}
          placeholder="บันทึกสิ่งที่ดำเนินการไปแล้ว..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
        />
      </section>

      {/* PDCA Act */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-md bg-emerald-500/25 border border-emerald-500/40 flex items-center justify-center text-[10px] font-black text-emerald-300">A</span>
          <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest">Act — แผนเดือนถัดไป</p>
        </div>
        <textarea
          value={pdcaAct}
          onChange={(e) => setPdcaAct(e.target.value)}
          rows={4}
          placeholder="บันทึกแผนงานเดือนถัดไป..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
        />
      </section>

      {/* อุปสรรค */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <p className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest">อุปสรรค</p>
          <button
            type="button"
            onClick={() => setHasObstacle((h) => !h)}
            className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-xs border transition-colors ${
              hasObstacle
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                : 'bg-white/5 border-white/15 text-white/40'
            }`}
          >
            <span className={`w-3 h-3 rounded-full border-2 transition-colors ${hasObstacle ? 'bg-orange-400 border-orange-400' : 'border-white/30'}`} />
            {hasObstacle ? 'มีอุปสรรค' : 'ไม่มีอุปสรรค'}
          </button>
        </div>

        {hasObstacle && (
          <div className="space-y-3">
            {obstacles.map((obs, oi) => (
              <div key={oi} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-orange-400/60 font-bold">อุปสรรคที่ {oi + 1}</span>
                  <button type="button" onClick={() => removeObstacle(oi)} className="text-red-400/40 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div>
                  <label className={LABEL}>ประเภท</label>
                  <select
                    value={obs.obstacle_type}
                    onChange={(e) => patchObstacle(oi, { obstacle_type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                  >
                    <option value="">— เลือก —</option>
                    {OBSTACLE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {obs.obstacle_type === 'อื่น' && (
                  <div>
                    <label className={LABEL}>ระบุอุปสรรค</label>
                    <input type="text" value={obs.other_description} onChange={(e) => patchObstacle(oi, { other_description: e.target.value })} placeholder="ระบุ..." className={INPUT} />
                  </div>
                )}
                <div className="flex gap-2">
                  {([1, 2] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => patchObstacle(oi, { priority: lvl })}
                      className={`flex-1 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        obs.priority === lvl
                          ? lvl === 1
                            ? 'bg-red-500/20 border-red-500/60 text-red-300'
                            : 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'bg-white/5 border-white/15 text-white/40'
                      }`}
                    >
                      {lvl === 1 ? '🔴 สูง' : '🟡 กลาง'}
                    </button>
                  ))}
                </div>
                <div>
                  <label className={LABEL}>รายละเอียด</label>
                  <textarea value={obs.obstacle_detail} onChange={(e) => patchObstacle(oi, { obstacle_detail: e.target.value })} rows={2} placeholder="อธิบายสภาพปัญหา..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 resize-none" />
                </div>
                <div>
                  <label className={LABEL}>แนวทางแก้ไข</label>
                  <textarea value={obs.resolution_plan} onChange={(e) => patchObstacle(oi, { resolution_plan: e.target.value })} rows={2} placeholder="แนวทางที่จะดำเนินการ..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 resize-none" />
                </div>
                <div>
                  <label className={LABEL}>สิ่งที่ต้องการจากเขต</label>
                  <textarea value={obs.region_support_needed} onChange={(e) => patchObstacle(oi, { region_support_needed: e.target.value })} rows={2} placeholder="(ถ้ามี)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 resize-none" />
                </div>
              </div>
            ))}
            <button type="button" onClick={addObstacle} className="flex items-center gap-1 text-xs text-orange-400/70 hover:text-orange-400 transition-colors">
              <Plus size={11} /> เพิ่มอุปสรรค
            </button>
          </div>
        )}
      </section>

      {/* Bottom save button (repeat for long forms) */}
      <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs text-white/50 hover:text-white border border-white/15 rounded-lg transition-colors disabled:opacity-40"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-bold rounded-lg disabled:opacity-40 transition-colors"
        >
          <Check size={12} />
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  )
}
