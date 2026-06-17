'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { submitMeeting } from '@/app/actions/meetings'
import { Calendar, MapPin, Link2, Users, FileText, Bell, Eye, Save, Trash2, Plus, X, ClipboardList } from 'lucide-react'
import { getThaiMonthName } from '@/lib/utils/date-th'
import type { MeetingRequirementType } from '@/lib/types'

const DRAFT_KEY = 'meeting_setup_draft'

const MEETING_TYPES = [
  'WSC-R/NRW Monthly',
  'ประชุมเร่งรัดอุปสรรค',
  'KM Practice',
]

const REQ_TYPES: { value: MeetingRequirementType; label: string; hint: string }[] = [
  { value: 'monthly_report', label: 'รายงาน NRW รายเดือน (PDCA)',  hint: 'ตรวจจากระบบอัตโนมัติ' },
  { value: 'five_topics',    label: 'รายงาน 5 หัวข้อ',             hint: 'ตรวจจากระบบอัตโนมัติ' },
  { value: 'km_case',        label: 'KM Case',                     hint: 'ตรวจจากระบบอัตโนมัติ' },
  { value: 'custom',         label: 'กำหนดเอง',                    hint: 'สาขากดยืนยันเอง' },
]

interface RequirementDraft {
  id: string  // local only
  requirement_type: MeetingRequirementType
  title: string
  description: string
  target_year: number | ''
  target_month: number | ''
  due_date: string
  sort_order: number
}

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

const EMPTY_FORM = {
  title: '',
  meeting_type: '',
  scheduled_date: '',
  scheduled_time: '09:00',
  location: '',
  meeting_link: '',
  target_audience: 'ทุกสาขา',
  prep_required: '',
  notification_message: '',
}

let reqCounter = 0
function newReqId() { return `req_${++reqCounter}` }

export function MeetingSetupForm({ backHref = '/meeting' }: MeetingSetupFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [hasDraft, setHasDraft] = useState(() =>
    typeof window !== 'undefined' && !!localStorage.getItem(DRAFT_KEY)
  )
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [requirements, setRequirements] = useState<RequirementDraft[]>([])
  const [reportMonth, setReportMonth] = useState<number | ''>('')
  const [reportYearBe, setReportYearBe] = useState<number | ''>('')
  const periodAutoSetRef = useRef(false)

  const [form, setForm] = useState(() => {
    if (typeof window === 'undefined') return EMPTY_FORM
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) return { ...EMPTY_FORM, ...JSON.parse(saved) }
    } catch {}
    return EMPTY_FORM
  })

  // auto-suggest report period เมื่อเลือก meeting_type = NRW Monthly + scheduled_date
  useEffect(() => {
    if (form.meeting_type !== 'WSC-R/NRW Monthly' || !form.scheduled_date) return
    if (periodAutoSetRef.current) return
    const d = new Date(form.scheduled_date)
    const m = d.getMonth() + 1
    const suggestMonth = m === 1 ? 12 : m - 1
    const suggestYear  = m === 1 ? d.getFullYear() - 1 : d.getFullYear()
    setReportMonth(suggestMonth)
    setReportYearBe(suggestYear + 543)
    periodAutoSetRef.current = true
  }, [form.scheduled_date, form.meeting_type])

  function set(field: string, value: string) {
    setForm((p: typeof EMPTY_FORM) => {
      const next = { ...p, [field]: value }
      // เมื่อ meeting_type เปลี่ยน → reset period auto-suggest และล้างค่า
      if (field === 'meeting_type') {
        periodAutoSetRef.current = false
        setReportMonth('')
        setReportYearBe('')
      }
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
        setHasDraft(true)
        setLastSaved(new Date())
      }, 800)
      return next
    })
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setForm(EMPTY_FORM)
    setHasDraft(false)
    setLastSaved(null)
    toast.success('ล้างแบบร่างแล้ว')
  }

  function addRequirement() {
    const now = new Date()
    setRequirements((prev) => [
      ...prev,
      {
        id: newReqId(),
        requirement_type: 'monthly_report',
        title: 'รายงาน NRW รายเดือน',
        description: '',
        target_year: now.getFullYear(),
        target_month: now.getMonth() + 1,
        due_date: '',
        sort_order: prev.length,
      },
    ])
  }

  function removeRequirement(id: string) {
    setRequirements((prev) => prev.filter((r) => r.id !== id))
  }

  function setReq<K extends keyof RequirementDraft>(id: string, key: K, value: RequirementDraft[K]) {
    setRequirements((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = { ...r, [key]: value }
        // เมื่อ type เปลี่ยน → ปรับ title default
        if (key === 'requirement_type') {
          const found = REQ_TYPES.find((t) => t.value === value)
          next.title = found?.label ?? ''
        }
        return next
      }),
    )
  }

  const isReadyToPreview = form.title && form.meeting_type && form.scheduled_date

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v as string))
    // แนบ report period ถ้าเป็น NRW Monthly และมีค่า
    if (form.meeting_type === 'WSC-R/NRW Monthly' && reportMonth !== '' && reportYearBe !== '') {
      fd.append('report_month', String(reportMonth))
      fd.append('report_year', String(Number(reportYearBe) - 543)) // BE → AD
    }
    // แนบ requirements เป็น JSON
    const reqPayload = requirements.map(({ id: _, ...r }) => ({
      ...r,
      target_year:  r.target_year  === '' ? null : r.target_year,
      target_month: r.target_month === '' ? null : r.target_month,
      due_date:     r.due_date || null,
      description:  r.description || null,
    }))
    fd.append('requirements_json', JSON.stringify(reqPayload))
    const result = await submitMeeting(fd)
    if (result.success) {
      localStorage.removeItem(DRAFT_KEY)
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

      {/* Draft indicator */}
      {hasDraft && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
          <div className="flex items-center gap-2 text-xs text-amber-400/80">
            <Save size={11} />
            <span>
              แบบร่าง{lastSaved
                ? ` · บันทึกอัตโนมัติ ${lastSaved.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
                : ' · โหลดจากที่บันทึกไว้'}
            </span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="flex items-center gap-1 text-[11px] text-white/30 hover:text-red-400 transition-colors"
          >
            <Trash2 size={10} /> ล้าง
          </button>
        </div>
      )}

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
            <MapPin size={13} /> ช่องทางประชุม
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* รายงานที่ประชุมพิจารณา — แสดงเฉพาะ WSC-R/NRW Monthly */}
      {form.meeting_type === 'WSC-R/NRW Monthly' && (
        <div className="glass-card p-6 space-y-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={15} className="text-cyan-400" />
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">รายงานที่ประชุมพิจารณา</span>
            {reportMonth !== '' && reportYearBe !== '' && (
              <span className="ml-auto text-[11px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                {getThaiMonthName(Number(reportMonth))} {reportYearBe}
              </span>
            )}
          </div>

          <p className="text-xs text-white/40">
            dashboard จะนับสาขาที่ส่ง/ยังไม่ส่งรายงานตามเดือนนี้ — ระบบแนะนำเดือนก่อนวันประชุม
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">เดือนรายงาน</label>
              <select
                value={reportMonth}
                onChange={(e) => {
                  setReportMonth(e.target.value === '' ? '' : Number(e.target.value))
                  periodAutoSetRef.current = true
                }}
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60"
              >
                <option value="">— เลือกเดือน —</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{getThaiMonthName(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">ปี (พ.ศ.)</label>
              <input
                type="number"
                value={reportYearBe}
                onChange={(e) => {
                  setReportYearBe(e.target.value === '' ? '' : Number(e.target.value))
                  periodAutoSetRef.current = true
                }}
                placeholder="เช่น 2569"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>
        </div>
      )}

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

      {/* ส่วนที่ 3 – สิ่งที่ต้องการจากสาขา */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-cyan-400" />
            <span className="text-xs font-bold text-white/50 uppercase tracking-widest">ส่วนที่ 3 — สิ่งที่ต้องการจากสาขา</span>
          </div>
          <button
            type="button"
            onClick={addRequirement}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Plus size={12} /> เพิ่มรายการ
          </button>
        </div>

        {requirements.length === 0 ? (
          <p className="text-sm text-white/25 text-center py-3">
            ยังไม่มีรายการ — กด &quot;เพิ่มรายการ&quot; เพื่อกำหนดสิ่งที่สาขาต้องส่ง
          </p>
        ) : (
          <div className="space-y-3">
            {requirements.map((req) => {
              const typeInfo = REQ_TYPES.find((t) => t.value === req.requirement_type)
              const needsPeriod = req.requirement_type === 'monthly_report' || req.requirement_type === 'five_topics'
              return (
                <div key={req.id} className="border border-white/10 rounded-xl p-4 space-y-3 bg-white/2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Type */}
                      <div>
                        <label className="block text-[11px] text-white/40 mb-1">ประเภท</label>
                        <select
                          value={req.requirement_type}
                          onChange={(e) => setReq(req.id, 'requirement_type', e.target.value as MeetingRequirementType)}
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
                        >
                          {REQ_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {typeInfo && (
                          <p className="text-[10px] text-white/30 mt-0.5">{typeInfo.hint}</p>
                        )}
                      </div>
                      {/* Title */}
                      <div>
                        <label className="block text-[11px] text-white/40 mb-1">ชื่อรายการ</label>
                        <input
                          type="text"
                          value={req.title}
                          onChange={(e) => setReq(req.id, 'title', e.target.value)}
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
                        />
                      </div>
                      {/* Period (monthly/five_topics only) */}
                      {needsPeriod && (
                        <>
                          <div>
                            <label className="block text-[11px] text-white/40 mb-1">ปี (พ.ศ.)</label>
                            <input
                              type="number"
                              value={req.target_year}
                              onChange={(e) => setReq(req.id, 'target_year', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="เช่น 2568"
                              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-white/40 mb-1">เดือน (1–12)</label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={req.target_month}
                              onChange={(e) => setReq(req.id, 'target_month', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="เช่น 5"
                              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
                            />
                          </div>
                        </>
                      )}
                      {/* Due date */}
                      <div className={needsPeriod ? 'sm:col-span-2' : ''}>
                        <label className="block text-[11px] text-white/40 mb-1">กำหนดส่ง (ไม่บังคับ)</label>
                        <input
                          type="date"
                          value={req.due_date}
                          onChange={(e) => setReq(req.id, 'due_date', e.target.value)}
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
                        />
                      </div>
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeRequirement(req.id)}
                      className="mt-5 text-white/25 hover:text-red-400 transition-colors shrink-0"
                      aria-label="ลบรายการ"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
          {submitting ? 'กำลังสร้าง...' : 'สร้างการประชุม — ถัดไป'}
        </button>
      </div>
    </form>
  )
}
