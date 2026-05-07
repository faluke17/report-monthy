'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { createMeetingResolution } from '@/app/actions/meeting-resolution'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Meeting, MeetingResolutionFormData } from '@/lib/types'
import { AlertCircle, CheckCircle2, Eye } from 'lucide-react'

const SOURCES = [
  'ข้อสั่งการจากผู้บริหารเขต',
  'วาระการประชุม',
  'กรอกข้อมูล/PDCA',
  'Obstacle Tracker',
] as const

const DEPTS = ['งานบริการ', 'งานอำนวยการ', 'งานผลิต', 'งานจัดเก็บ'] as const
const DUE_DAYS = [7, 15, 30, 45, 60] as const

type DueDays = 7 | 15 | 30 | 45 | 60

interface FormState {
  source: string
  priority: 'สูง' | 'กลาง' | ''
  title: string
  detail: string
  responsible_branch: string
  responsible_dept: string
  due_days: DueDays | 0
  admin_notes: string
  tracking_notes: string
  notify_branch: boolean
}

const EMPTY: FormState = {
  source: '',
  priority: '',
  title: '',
  detail: '',
  responsible_branch: '',
  responsible_dept: '',
  due_days: 0,
  admin_notes: '',
  tracking_notes: '',
  notify_branch: false,
}

function calcDueDate(dueDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + 1 + dueDays)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
}

const fieldClass =
  'w-full bg-[#0c1a30] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 resize-none'

const labelClass = 'block text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5'

const sectionClass = 'space-y-3 p-4 rounded-xl bg-white/3 border border-white/8'

interface Props {
  meeting: Meeting
  sequenceStart: number
  onSaved: () => void
}

export function MeetingResolutionForm({ meeting, sequenceStart, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canPreview = form.title.trim().length > 0
  const selectedBranchName = PWA_BRANCHES.find(b => b.costcenter === form.responsible_branch)?.name_th ?? ''

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
    setError(null)
    setSaved(false)
  }

  function handleSubmit() {
    if (!form.source) return setError('กรุณาเลือกแหล่งที่มา')
    if (!form.priority) return setError('กรุณาเลือกระดับความสำคัญ')
    if (!form.title.trim()) return setError('กรุณากรอกหัวข้อสั่งการ')
    if (!form.responsible_branch) return setError('กรุณาเลือกสาขา')
    if (!form.responsible_dept) return setError('กรุณาเลือกหน่วยงานที่รับผิดชอบ')
    if (!form.due_days) return setError('กรุณาเลือกวันครบกำหนด')

    const payload: MeetingResolutionFormData = {
      meeting_id: meeting.id,
      source: form.source,
      priority: form.priority as 'สูง' | 'กลาง',
      title: form.title.trim(),
      detail: form.detail.trim() || undefined,
      responsible_branch: form.responsible_branch,
      responsible_dept: form.responsible_dept,
      due_days: form.due_days as DueDays,
      admin_notes: form.admin_notes.trim() || undefined,
      tracking_notes: form.tracking_notes.trim() || undefined,
      notify_branch: form.notify_branch,
    }

    startTransition(async () => {
      const result = await createMeetingResolution(payload)
      if (!result.success) {
        setError(result.error)
      } else {
        setSaved(true)
        setForm(EMPTY)
        onSaved()
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Section 1 */}
      <div className={sectionClass}>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">ที่มาและความสำคัญ</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>แหล่งที่มา</label>
            <Select value={form.source} onValueChange={v => set('source', v)}>
              <SelectTrigger className="h-9 bg-[#0c1a30] border-white/15 text-sm text-white focus:ring-cyan-500/30 focus:border-cyan-500/50">
                <SelectValue placeholder="เลือกแหล่งที่มา" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c1a30] border-white/15">
                {SOURCES.map(s => (
                  <SelectItem key={s} value={s} className="text-white focus:bg-white/10">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={labelClass}>ระดับความสำคัญ</label>
            <Select value={form.priority} onValueChange={v => set('priority', v as 'สูง' | 'กลาง')}>
              <SelectTrigger className="h-9 bg-[#0c1a30] border-white/15 text-sm text-white focus:ring-cyan-500/30 focus:border-cyan-500/50">
                <SelectValue placeholder="เลือกระดับ" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c1a30] border-white/15">
                <SelectItem value="สูง" className="text-white focus:bg-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                    สูง
                  </span>
                </SelectItem>
                <SelectItem value="กลาง" className="text-white focus:bg-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    กลาง
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className={labelClass}>หัวข้อสั่งการ</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="ระบุหัวข้อสั่งการ..."
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>รายละเอียด / สิ่งที่ต้องทำ</label>
          <textarea
            rows={3}
            value={form.detail}
            onChange={e => set('detail', e.target.value)}
            placeholder="อธิบายรายละเอียดและสิ่งที่ต้องดำเนินการ..."
            className={fieldClass}
          />
        </div>
      </div>

      {/* Section 2 */}
      <div className={sectionClass}>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">ผู้รับผิดชอบและกำหนดการ</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>สาขา</label>
            <Select value={form.responsible_branch} onValueChange={v => set('responsible_branch', v)}>
              <SelectTrigger className="h-9 bg-[#0c1a30] border-white/15 text-sm text-white focus:ring-cyan-500/30 focus:border-cyan-500/50">
                <SelectValue placeholder="เลือกสาขา" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c1a30] border-white/15 max-h-60">
                {PWA_BRANCHES.map(b => (
                  <SelectItem key={b.costcenter} value={b.costcenter} className="text-white focus:bg-white/10">
                    {b.name_th}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={labelClass}>หน่วยงาน</label>
            <Select value={form.responsible_dept} onValueChange={v => set('responsible_dept', v)}>
              <SelectTrigger className="h-9 bg-[#0c1a30] border-white/15 text-sm text-white focus:ring-cyan-500/30 focus:border-cyan-500/50">
                <SelectValue placeholder="เลือกหน่วยงาน" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c1a30] border-white/15">
                {DEPTS.map(d => (
                  <SelectItem key={d} value={d} className="text-white focus:bg-white/10">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className={labelClass}>วันครบกำหนด</label>
            <Select
              value={form.due_days ? String(form.due_days) : ''}
              onValueChange={v => set('due_days', Number(v) as DueDays)}
            >
              <SelectTrigger className="h-9 bg-[#0c1a30] border-white/15 text-sm text-white focus:ring-cyan-500/30 focus:border-cyan-500/50">
                <SelectValue placeholder="เลือก" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c1a30] border-white/15">
                {DUE_DAYS.map(d => (
                  <SelectItem key={d} value={String(d)} className="text-white focus:bg-white/10">
                    {d} วัน
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 3 */}
      <div className={sectionClass}>
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">หมายเหตุ</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>หมายเหตุผู้บริหาร</label>
            <textarea
              rows={3}
              value={form.admin_notes}
              onChange={e => set('admin_notes', e.target.value)}
              placeholder="หมายเหตุจากผู้บริหาร..."
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>การติดตาม</label>
            <textarea
              rows={3}
              value={form.tracking_notes}
              onChange={e => set('tracking_notes', e.target.value)}
              placeholder="แนวทางการติดตามผล..."
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {canPreview && (
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-cyan-500/20 bg-cyan-500/8">
            <Eye size={13} className="text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400">สรุปข้อสั่งการ (Preview)</span>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="num text-xs font-bold text-cyan-400">#{sequenceStart}</span>
              {form.priority && (
                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full border',
                  form.priority === 'สูง'
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                )}>
                  {form.priority}
                </span>
              )}
              {form.source && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border bg-white/5 text-white/50 border-white/15">
                  {form.source}
                </span>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-white leading-snug">{form.title}</p>
              {form.detail && (
                <p className="text-xs text-white/50 mt-1 whitespace-pre-line">{form.detail}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {selectedBranchName && (
                <p className="text-white/40">
                  สาขา: <span className="text-white/70">{selectedBranchName}</span>
                </p>
              )}
              {form.responsible_dept && (
                <p className="text-white/40">
                  หน่วยงาน: <span className="text-white/70">{form.responsible_dept}</span>
                </p>
              )}
              {form.due_days > 0 && (
                <p className="text-white/40">
                  กำหนดส่ง: <span className="text-cyan-400/80">{calcDueDate(form.due_days)}</span>
                </p>
              )}
            </div>

            {(form.admin_notes || form.tracking_notes) && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-white/8 pt-2">
                {form.admin_notes && (
                  <p className="text-white/40">
                    หมายเหตุ: <span className="text-white/60">{form.admin_notes}</span>
                  </p>
                )}
                {form.tracking_notes && (
                  <p className="text-white/40">
                    ติดตาม: <span className="text-white/60">{form.tracking_notes}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notify checkbox + submit */}
          <div className="px-4 py-3 border-t border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.notify_branch}
                onChange={e => set('notify_branch', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-[#0c1a30] accent-cyan-500"
              />
              <span className="text-xs text-white/60">
                ส่งแจ้งเตือนไปยังสาขา
                {selectedBranchName && (
                  <span className="text-cyan-400 font-medium ml-1">{selectedBranchName}</span>
                )}
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={isPending}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                isPending
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-[#061327]'
              )}
            >
              {isPending ? 'กำลังบันทึก...' : 'บันทึกข้อสั่งการ'}
            </button>
          </div>
        </div>
      )}

      {/* Feedback messages */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
          <AlertCircle size={13} />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
          <CheckCircle2 size={13} />
          บันทึกข้อสั่งการเรียบร้อยแล้ว
        </div>
      )}
    </div>
  )
}
