'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Branch, UserProfile } from '@/lib/types'
import { submitFiveTopicsReport } from '@/app/actions/five-topics'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'

interface Props {
  branches: Branch[]
  profile: UserProfile | null
}

const TOPIC_COLORS = ['cyan', 'blue', 'violet', 'amber', 'green']
const TOPIC_BADGE_CLASSES: Record<string, string> = {
  cyan:   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  blue:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  amber:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  green:  'bg-green-500/20 text-green-300 border-green-500/30',
}

const TOPICS = [
  { no: 1, title: 'การวิเคราะห์พื้นที่หาท่อแตกท่อรั่ว', subtitle: 'Step Test พร้อมตรวจ Zero Test' },
  { no: 2, title: 'การสำรวจน้ำสูญเสียเชิงรุก', subtitle: 'Active Leakage Control (ALC)' },
  { no: 3, title: 'การ PM ระบบจ่ายน้ำ', subtitle: 'Preventive Maintenance' },
  { no: 4, title: 'การระบายตะกอนระบบท่อจ่ายน้ำ', subtitle: 'Flushing / Sediment Discharge' },
  { no: 5, title: 'การเปลี่ยนมาตรวัดน้ำชำรุด', subtitle: 'Water Meter Replacement (MM-01)' },
]

const INPUT_CLASS =
  'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60'
const TEXTAREA_CLASS =
  'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none'
const LABEL_CLASS = 'block text-sm text-white/60 mb-1.5'

export function FiveTopicsForm({ branches, profile }: Props) {
  const router = useRouter()
  const now = new Date()
  const isBranch = ['branch_manager', 'branch_staff'].includes(profile?.role ?? '')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    branch_id: profile?.branch_id ?? '',
    report_year: now.getFullYear(),
    report_month: now.getMonth() + 1,
    t1_dma_count: '',
    t1_conducted_date: '',
    t1_notes: '',
    t2_frequency: '',
    t2_leak_points: '',
    t2_water_loss_m3h: '',
    t2_notes: '',
    t3_dma_pm_count: '',
    t3_prv_pm_count: '',
    t3_notes: '',
    t4_flush_points: '',
    t4_volume_m3: '',
    t4_notes: '',
    t5_meters_replaced: '',
    t5_notes: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.branch_id) { toast.error('กรุณาเลือกสาขา'); return }
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
    const result = await submitFiveTopicsReport(fd)
    if (result.success) {
      toast.success('บันทึกรายงาน 5 หัวข้อ สำเร็จ')
      router.push('/five-topics')
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Branch / Year / Month selector */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="font-semibold text-white">เลือกสาขา &amp; เดือน</h2>

        {!isBranch && (
          <div>
            <label className={LABEL_CLASS}>สาขา</label>
            <select
              value={form.branch_id}
              onChange={(e) => set('branch_id', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
            >
              <option value="">— เลือกสาขา —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name_th} ({b.code})</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>ปี (พ.ศ.)</label>
            <select
              value={form.report_year}
              onChange={(e) => set('report_year', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
            >
              {[0, 1, 2].map((offset) => {
                const y = now.getFullYear() - offset
                return <option key={y} value={y}>{toThaiYear(y)}</option>
              })}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS}>เดือน</label>
            <select
              value={form.report_month}
              onChange={(e) => set('report_month', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{getThaiMonthName(m)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ข้อ 1: Step Test */}
      <TopicCard no={1} color={TOPIC_COLORS[0]}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>จำนวน DMA ที่ดำเนินการ</label>
            <input type="number" min="0" placeholder="0"
              value={form.t1_dma_count} onChange={(e) => set('t1_dma_count', e.target.value)}
              className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>วันที่ดำเนินการ</label>
            <input type="date"
              value={form.t1_conducted_date} onChange={(e) => set('t1_conducted_date', e.target.value)}
              className={INPUT_CLASS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>หมายเหตุ</label>
          <textarea rows={2} placeholder="บันทึกเพิ่มเติม..."
            value={form.t1_notes} onChange={(e) => set('t1_notes', e.target.value)}
            className={TEXTAREA_CLASS} />
        </div>
      </TopicCard>

      {/* ข้อ 2: ALC */}
      <TopicCard no={2} color={TOPIC_COLORS[1]}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>จำนวนครั้ง/เดือน</label>
            <input type="number" min="0" placeholder="0"
              value={form.t2_frequency} onChange={(e) => set('t2_frequency', e.target.value)}
              className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>จุดรั่วที่พบ</label>
            <input type="number" min="0" placeholder="0"
              value={form.t2_leak_points} onChange={(e) => set('t2_leak_points', e.target.value)}
              className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>ปริมาณน้ำสูญเสีย (ลบ.ม./ชม.)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.t2_water_loss_m3h} onChange={(e) => set('t2_water_loss_m3h', e.target.value)}
              className={INPUT_CLASS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>หมายเหตุ</label>
          <textarea rows={2} placeholder="บันทึกเพิ่มเติม..."
            value={form.t2_notes} onChange={(e) => set('t2_notes', e.target.value)}
            className={TEXTAREA_CLASS} />
        </div>
      </TopicCard>

      {/* ข้อ 3: PM */}
      <TopicCard no={3} color={TOPIC_COLORS[2]}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>จำนวน DMA ที่ PM</label>
            <input type="number" min="0" placeholder="0"
              value={form.t3_dma_pm_count} onChange={(e) => set('t3_dma_pm_count', e.target.value)}
              className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>จำนวน PRV ที่ PM</label>
            <input type="number" min="0" placeholder="0"
              value={form.t3_prv_pm_count} onChange={(e) => set('t3_prv_pm_count', e.target.value)}
              className={INPUT_CLASS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>หมายเหตุ</label>
          <textarea rows={2} placeholder="บันทึกเพิ่มเติม..."
            value={form.t3_notes} onChange={(e) => set('t3_notes', e.target.value)}
            className={TEXTAREA_CLASS} />
        </div>
      </TopicCard>

      {/* ข้อ 4: Sediment Flush */}
      <TopicCard no={4} color={TOPIC_COLORS[3]}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLASS}>จำนวนจุดระบาย</label>
            <input type="number" min="0" placeholder="0"
              value={form.t4_flush_points} onChange={(e) => set('t4_flush_points', e.target.value)}
              className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>ปริมาณน้ำรวม (ลบ.ม./เดือน)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00"
              value={form.t4_volume_m3} onChange={(e) => set('t4_volume_m3', e.target.value)}
              className={INPUT_CLASS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>หมายเหตุ</label>
          <textarea rows={2} placeholder="บันทึกเพิ่มเติม..."
            value={form.t4_notes} onChange={(e) => set('t4_notes', e.target.value)}
            className={TEXTAREA_CLASS} />
        </div>
      </TopicCard>

      {/* ข้อ 5: Meter Replacement */}
      <TopicCard no={5} color={TOPIC_COLORS[4]}>
        <div>
          <label className={LABEL_CLASS}>จำนวนมาตรที่เปลี่ยน</label>
          <input type="number" min="0" placeholder="0"
            value={form.t5_meters_replaced} onChange={(e) => set('t5_meters_replaced', e.target.value)}
            className={`${INPUT_CLASS} max-w-xs`} />
        </div>
        <div>
          <label className={LABEL_CLASS}>หมายเหตุ</label>
          <textarea rows={2} placeholder="บันทึกเพิ่มเติม..."
            value={form.t5_notes} onChange={(e) => set('t5_notes', e.target.value)}
            className={TEXTAREA_CLASS} />
        </div>
      </TopicCard>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting || !form.branch_id}
          className="px-8 py-2.5 text-sm bg-green-500 hover:bg-green-400 text-[#061327] font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          {submitting ? 'กำลังบันทึก...' : 'ยืนยันและส่งรายงาน'}
        </button>
      </div>
    </form>
  )
}

function TopicCard({
  no,
  color,
  children,
}: {
  no: number
  color: string
  children: React.ReactNode
}) {
  const badgeClass = TOPIC_BADGE_CLASSES[color] ?? TOPIC_BADGE_CLASSES['cyan']
  const topic = TOPICS[no - 1]
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${badgeClass}`}>
          {no}
        </span>
        <div>
          <p className="font-semibold text-white text-sm leading-snug">{topic.title}</p>
          <p className="text-xs text-white/40 mt-0.5">{topic.subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
