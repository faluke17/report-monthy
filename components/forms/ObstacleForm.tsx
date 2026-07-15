'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Branch, Plan, UserProfile } from '@/lib/types'
import { submitObstacle } from '@/app/actions/obstacles'

const THAI_MONTHS_FULL = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

function prevMonthYear() {
  const now = new Date()
  const m = now.getMonth() === 0 ? 12 : now.getMonth()
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  return { m, y }
}

const OBSTACLE_TYPES = [
  'MM/DMA Zero Test ไม่ผ่าน',
  'Step Test Zero Test ไม่ผ่าน',
  'MM/DMA/P3 ชำรุด',
  'จุดค้างซ่อม',
  'มาตรผิดปกติ',
  'ปัญหาแรงดันน้ำไหลอ่อน',
  'ขาด logger / P3',
  'อื่น',
] as const

const TYPE_CATEGORY: Record<string, 'MM' | 'DMA' | 'P3' | 'อื่นๆ'> = {
  'MM/DMA Zero Test ไม่ผ่าน': 'MM',
  'Step Test Zero Test ไม่ผ่าน': 'MM',
  'MM/DMA/P3 ชำรุด': 'MM',
  'จุดค้างซ่อม': 'DMA',
  'มาตรผิดปกติ': 'DMA',
  'ปัญหาแรงดันน้ำไหลอ่อน': 'P3',
  'ขาด logger / P3': 'P3',
  'อื่น': 'อื่นๆ',
}

const STATUSES = [
  { value: 'รายงานใหม่',    color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30' },
  { value: 'ระหว่างแก้',   color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30' },
  { value: 'รอสนับสนุน',   color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30' },
  { value: 'ล่าช้า',        color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  { value: 'เกินกำหนด',    color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
  { value: 'ปิดประเด็น',   color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/30' },
] as const

const SELECT = 'w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60'
const TEXTAREA = 'w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60 resize-none'
const LABEL = 'block text-sm text-black/60 mb-1.5'

interface Props {
  branches: Branch[]
  profile: UserProfile | null
  plans: Partial<Plan>[]
}

export function ObstacleForm({ branches, profile, plans: _plans }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const { m: defaultMonth, y: defaultYear } = prevMonthYear()
  const [form, setForm] = useState({
    branch_id: profile?.branch_id ?? '',
    obstacle_type: '',
    other_text: '',
    detail: '',
    resolution_plan: '',
    impact: '',
    region_support_needed: '',
    priority: 'กลาง',
    due_date: '',
    progress_pct: '0',
    status: 'รายงานใหม่',
    auto_create_action: 'true',
    send_to_meeting: 'true',
    show_in_monthly_alert: 'true',
    report_month: String(defaultMonth),
    report_year: String(defaultYear),
  })

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  const isBranch = ['branch_manager', 'branch_staff'].includes(profile?.role ?? '')
  const pct = parseInt(form.progress_pct) || 0
  const statusMeta = STATUSES.find((s) => s.value === form.status) ?? STATUSES[0]
  const isOverdue = form.due_date && new Date(form.due_date) < new Date() && form.status !== 'ปิดประเด็น'

  const finalObstacleType =
    form.obstacle_type === 'อื่น' && form.other_text.trim()
      ? `อื่น: ${form.other_text.trim()}`
      : form.obstacle_type

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.branch_id) { toast.error('กรุณาเลือกสาขา'); return }
    if (!form.obstacle_type) { toast.error('กรุณาเลือกอุปสรรคเรื่อง'); return }
    if (form.obstacle_type === 'อื่น' && !form.other_text.trim()) {
      toast.error('กรุณาระบุรายละเอียดอุปสรรคเรื่องอื่น'); return
    }

    setSubmitting(true)
    const fd = new FormData()
    fd.append('branch_id', form.branch_id)
    fd.append('obstacle_type', finalObstacleType)
    fd.append('category', TYPE_CATEGORY[form.obstacle_type] ?? 'อื่นๆ')
    fd.append('data_quality_impact', form.detail)
    fd.append('resolution_plan', form.resolution_plan)
    fd.append('area', form.impact)
    fd.append('region_support_needed', form.region_support_needed)
    fd.append('priority_order', form.priority === 'สูง' ? '1' : '2')
    fd.append('due_date', form.due_date)
    fd.append('progress_pct', form.progress_pct)
    fd.append('status', form.status)
    fd.append('auto_create_action', form.auto_create_action)
    fd.append('send_to_meeting', form.send_to_meeting)
    fd.append('show_in_monthly_alert', form.show_in_monthly_alert)
    fd.append('report_month', form.report_month)
    fd.append('report_year', form.report_year)

    const result = await submitObstacle(fd)
    if (result.success) {
      toast.success('รายงานอุปสรรคสำเร็จ')
      router.push('/obstacle')
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ─── ส่วนที่ 1: ข้อมูลทั่วไป ─── */}
      <div className="glass-card p-6 space-y-4">
        <p className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest">ส่วนที่ 1 — ข้อมูลทั่วไป</p>

        {!isBranch && (
          <div>
            <label className={LABEL}>สาขา</label>
            <select value={form.branch_id} onChange={(e) => set('branch_id', e.target.value)} className={SELECT}>
              <option value="">— เลือกสาขา —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name_th} ({b.code})</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={LABEL}>อุปสรรคเรื่อง</label>
          <select
            value={form.obstacle_type}
            onChange={(e) => set('obstacle_type', e.target.value)}
            required
            className={SELECT}
          >
            <option value="">— เลือกประเภทอุปสรรค —</option>
            {OBSTACLE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {form.obstacle_type === 'อื่น' && (
          <div>
            <label className={LABEL}>ระบุอุปสรรค</label>
            <input
              type="text"
              value={form.other_text}
              onChange={(e) => set('other_text', e.target.value)}
              placeholder="ระบุอุปสรรคที่พบ..."
              required
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        )}

        <div>
          <label className={LABEL}>เดือนที่รายงาน</label>
          <div className="flex gap-2">
            <select className={SELECT} value={form.report_month} onChange={e => set('report_month', e.target.value)}>
              {THAI_MONTHS_FULL.slice(1).map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select className={SELECT} value={form.report_year} onChange={e => set('report_year', e.target.value)}>
              {[-1, 0, 1].map(d => {
                const y = new Date().getFullYear() + d
                return <option key={y} value={y}>{y + 543}</option>
              })}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>ระดับความเร่งด่วน</label>
          <div className="flex gap-3">
            {(['สูง', 'กลาง'] as const).map((lvl) => {
              const active = form.priority === lvl
              const isHigh = lvl === 'สูง'
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => set('priority', lvl)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                    active
                      ? isHigh
                        ? 'bg-red-500/20 border-red-500/60 text-red-300'
                        : 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-black/5 border-black/15 text-black/40 hover:border-black/30'
                  }`}
                >
                  {isHigh ? '🔴' : '🟡'} {lvl}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ─── ส่วนที่ 2: รายละเอียด ─── */}
      <div className="glass-card p-6 space-y-4">
        <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest">ส่วนที่ 2 — รายละเอียด</p>

        <div>
          <label className={LABEL}>รายละเอียดอุปสรรค</label>
          <textarea
            value={form.detail}
            onChange={(e) => set('detail', e.target.value)}
            rows={3}
            placeholder="อธิบายสภาพปัญหาที่พบ..."
            className={TEXTAREA}
          />
        </div>

        <div>
          <label className={LABEL}>แนวทางการแก้ไข</label>
          <textarea
            value={form.resolution_plan}
            onChange={(e) => set('resolution_plan', e.target.value)}
            rows={3}
            placeholder="ระบุแนวทางหรือแผนที่จะดำเนินการแก้ไข..."
            className={TEXTAREA}
          />
        </div>

        <div>
          <label className={LABEL}>ผลกระทบที่ได้รับ</label>
          <textarea
            value={form.impact}
            onChange={(e) => set('impact', e.target.value)}
            rows={2}
            placeholder="ผลกระทบต่อการให้บริการหรือข้อมูล NRW..."
            className={TEXTAREA}
          />
        </div>

        <div>
          <label className={LABEL}>สิ่งที่ต้องการความช่วยเหลือจากเขต</label>
          <textarea
            value={form.region_support_needed}
            onChange={(e) => set('region_support_needed', e.target.value)}
            rows={2}
            placeholder="ระบุสิ่งที่ต้องการให้เขตช่วยเหลือ (หากมี)..."
            className={TEXTAREA}
          />
        </div>
      </div>

      {/* ─── ส่วนที่ 3: ความก้าวหน้า ─── */}
      <div className="glass-card p-6 space-y-5">
        <p className="text-[10px] font-bold text-green-400/60 uppercase tracking-widest">ส่วนที่ 3 — ความก้าวหน้าการแก้ไข</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>กำหนดแก้ไข</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              className={`${SELECT} ${isOverdue ? 'border-red-500/50 text-red-300' : ''}`}
            />
            {isOverdue && (
              <p className="text-xs text-red-400 mt-1">⚠ เกินกำหนดแล้ว</p>
            )}
          </div>
          <div>
            <label className={LABEL}>สถานะ</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className={SELECT}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.value}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Progress slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={LABEL + ' mb-0'}>ความคืบหน้าการแก้ไข</label>
            <span className="text-lg font-bold num text-[#12181F]">{pct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.progress_pct}
            onChange={(e) => set('progress_pct', e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-black/25 mt-1">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>

        {/* Summary card — ที่ผู้บริหารเห็น */}
        <div className={`rounded-xl border p-4 space-y-3 ${statusMeta.bg}`}>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">สรุปสถานะ — มุมมองผู้บริหาร</p>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold px-3 py-1 rounded-full border ${statusMeta.bg} ${statusMeta.color}`}>
              {form.status}
            </span>
            {form.priority === 'สูง' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300">
                🔴 ด่วน
              </span>
            )}
          </div>
          <div>
            <div className="flex justify-between text-xs text-black/50 mb-1">
              <span>ความคืบหน้า</span>
              <span className="num font-semibold text-[#12181F]">{pct}%</span>
            </div>
            <div className="h-2.5 bg-black/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {form.due_date && (
            <p className={`text-xs ${isOverdue ? 'text-red-400' : 'text-black/50'}`}>
              กำหนดแก้ไข: {new Date(form.due_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              {isOverdue && ' — เกินกำหนดแล้ว'}
            </p>
          )}
        </div>
      </div>

      {/* ─── ตัวเลือกเพิ่มเติม ─── */}
      <div className="glass-card p-5 space-y-3">
        <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">การดำเนินการเพิ่มเติม</p>
        {[
          { key: 'auto_create_action',   label: 'สร้าง Action Item อัตโนมัติ' },
          { key: 'send_to_meeting',      label: 'นำเข้าวาระการประชุม' },
          { key: 'show_in_monthly_alert', label: 'แสดงในการแจ้งเตือนรายเดือน' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form[key as keyof typeof form] === 'true'}
              onChange={(e) => set(key, e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 accent-cyan-500"
            />
            <span className="text-sm text-black/70">{label}</span>
          </label>
        ))}
      </div>

      {/* ─── Actions ─── */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm text-black/60 hover:text-[#12181F] border border-black/15 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-[#FFFFFF] font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          {submitting ? 'กำลังบันทึก...' : 'รายงานอุปสรรค'}
        </button>
      </div>
    </form>
  )
}
