'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitMeeting } from '@/app/actions/meetings'
import { Calendar, MapPin, Link2, Users, FileText, Bell, Eye } from 'lucide-react'

const MEETING_TYPES = [
  'WSC-R/NRW Monthly',
  'ประชุมเร่งรัดอุปสรรค',
  'KM Practice',
]

const TARGET_AUDIENCES = [
  'ทุกสาขา',
  'สาขา NRW สูง',
  'สาขาที่มีอุปสรรค',
]

function formatThaiPreview(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

interface MeetingSetupFormProps {
  backHref?: string
}

export function MeetingSetupForm({ backHref = '/meeting' }: MeetingSetupFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [form, setForm] = useState({
    title: '',
    meeting_type: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    location: '',
    meeting_link: '',
    target_audience: 'ทุกสาขา',
    prep_required: '',
    notification_message: '',
  })

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  const isReadyToPreview = form.title && form.meeting_type && form.scheduled_date

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    const result = await submitMeeting(fd)
    if (result.success) {
      toast.success('สร้างการประชุมเรียบร้อย — กรอกวาระได้เลย')
      const id = result.data
      router.push(id ? `/meeting/${id}/agenda` : backHref)
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ส่วนที่ 1 – รายละเอียดการประชุม */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={15} className="text-cyan-400" />
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">ส่วนที่ 1 — รายละเอียดการประชุม</span>
        </div>

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

        <div className="grid grid-cols-3 gap-4">
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
            <MapPin size={13} /> ช่องทางประชุม
          </label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="สถานที่ / ห้องประชุม"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
            />
            <div className="relative">
              <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="url"
                value={form.meeting_link}
                onChange={(e) => set('meeting_link', e.target.value)}
                placeholder="ลิงก์ประชุมออนไลน์ (Teams/Zoom)"
                className="w-full bg-white/5 border border-white/15 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ส่วนที่ 2 – กลุ่มเป้าหมายและการแจ้งเตือน */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={15} className="text-cyan-400" />
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">ส่วนที่ 2 — กลุ่มเป้าหมายและข้อความแจ้งเตือน</span>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm text-white/60 mb-1.5">
            <Users size={13} /> กลุ่มเป้าหมาย
          </label>
          <select
            value={form.target_audience}
            onChange={(e) => set('target_audience', e.target.value)}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
          >
            {TARGET_AUDIENCES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm text-white/60 mb-1.5">
            <FileText size={13} /> กำหนดให้สาขาเตรียมรายงาน
          </label>
          <textarea
            value={form.prep_required}
            onChange={(e) => set('prep_required', e.target.value)}
            rows={2}
            placeholder="เช่น รายงาน NRW เดือนล่าสุด, สถานะ Action Items, KM Case..."
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm text-white/60 mb-1.5">
            <Bell size={13} /> ข้อความแจ้งเตือน
          </label>
          <textarea
            value={form.notification_message}
            onChange={(e) => set('notification_message', e.target.value)}
            rows={2}
            placeholder="ข้อความที่สาขาจะเห็นในหน้า Notification..."
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
          />
        </div>
      </div>

      {/* Preview Box */}
      {isReadyToPreview && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Eye size={13} />
            {showPreview ? 'ซ่อน' : 'ดูตัวอย่าง'} ข้อความที่สาขาจะได้รับ
          </button>

          {showPreview && (
            <div className="border border-cyan-500/30 rounded-xl bg-cyan-500/5 p-5 space-y-2.5">
              <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest mb-3">ตัวอย่างที่สาขาจะเห็น</p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  {form.meeting_type}
                </span>
              </div>

              <p className="font-bold text-white text-sm">{form.title}</p>

              <p className="text-sm text-white/55">
                {formatThaiPreview(form.scheduled_date)}
                {form.scheduled_time && ` · ${form.scheduled_time} น.`}
                {form.location && ` · ${form.location}`}
              </p>

              {form.meeting_link && (
                <p className="text-xs text-cyan-400 truncate">🔗 {form.meeting_link}</p>
              )}

              <div className="border-t border-white/10 pt-2.5 space-y-1.5">
                <p className="text-xs text-white/40">
                  กลุ่มเป้าหมาย: <span className="text-white/70">{form.target_audience}</span>
                </p>
                {form.prep_required && (
                  <p className="text-xs text-amber-400">
                    ⚠ สิ่งที่ต้องเตรียม: {form.prep_required}
                  </p>
                )}
                {form.notification_message && (
                  <p className="text-xs text-white/55">{form.notification_message}</p>
                )}
              </div>

              <div className="border-t border-white/10 pt-2.5">
                <div className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-white/50 px-3 py-1.5 rounded-lg">
                  ✓ กดรับทราบ (ตัวอย่าง)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="px-4 py-2.5 text-sm text-white/60 hover:text-white border border-white/15 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          {submitting ? 'กำลังสร้าง...' : 'สร้างการประชุม + ส่งแจ้งเตือน'}
        </button>
      </div>
    </form>
  )
}
