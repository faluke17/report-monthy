'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitMeeting } from '@/app/actions/meetings'
import { Calendar, MapPin } from 'lucide-react'

const MEETING_TYPES = [
  'WSC-R/NRW Monthly',
  'ประชุมเร่งรัดอุปสรรค',
  'KM Practice',
]

export function ReportNewForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    meeting_type: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    location: '',
  })

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    const result = await submitMeeting(fd)
    if (result.success && result.data) {
      toast.success('สร้างรายงานการประชุม — กรอกวาระได้เลย')
      router.push(`/meeting/${result.data}/report`)
    } else if (!result.success) {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="glass-card p-6 space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">
            หัวข้อการประชุม <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="เช่น ประชุมติดตาม NRW เขต 10 ครั้งที่ 7/2569"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">
              ประเภทการประชุม <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={form.meeting_type}
              onChange={(e) => set('meeting_type', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
            >
              <option value="">— เลือก —</option>
              {MEETING_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">
              วันที่ประชุม <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={form.scheduled_date}
              onChange={(e) => set('scheduled_date', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">เวลา</label>
            <input
              type="time"
              value={form.scheduled_time}
              onChange={(e) => set('scheduled_time', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm text-white/60 mb-1.5">
            <MapPin size={13} /> สถานที่ / ห้องประชุม
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="เช่น ห้องประชุม 1 ชั้น 3"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push('/meeting')}
          className="px-4 py-2.5 text-sm text-white/60 hover:text-white border border-white/15 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-2.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          <Calendar size={14} />
          {submitting ? 'กำลังสร้าง...' : 'ถัดไป — กรอกวาระ 1-6'}
        </button>
      </div>
    </form>
  )
}
