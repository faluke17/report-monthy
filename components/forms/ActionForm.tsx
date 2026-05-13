'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Branch, UserProfile } from '@/lib/types'
import { submitAction } from '@/app/actions/actions'

interface Props {
  branches: Branch[]
  profile: UserProfile | null
}

export function ActionForm({ branches, profile }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    branch_id: profile?.branch_id ?? '',
    title: '',
    detail: '',
    owner: '',
    due_date: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    const result = await submitAction(fd)
    if (result.success) {
      toast.success('สร้าง Action Item สำเร็จ')
      router.push('/action')
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
  }

  const isBranch = ['branch_manager', 'branch_staff'].includes(profile?.role ?? '')

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="glass-card p-6 space-y-4">
        {!isBranch && (
          <div>
            <label className="block text-sm text-white/60 mb-1.5">สาขา</label>
            <select value={form.branch_id} onChange={(e) => set('branch_id', e.target.value)} required
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60">
              <option value="">— เลือกสาขา —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name_th} ({b.code})</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-white/60 mb-1.5">ชื่อรายการ <span className="text-red-400">*</span></label>
          <input type="text" required value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="ระบุสิ่งที่ต้องดำเนินการ..."
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60" />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">รายละเอียด</label>
          <textarea value={form.detail} onChange={(e) => set('detail', e.target.value)} rows={3}
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">ผู้รับผิดชอบ <span className="text-red-400">*</span></label>
            <input type="text" required value={form.owner} onChange={(e) => set('owner', e.target.value)} placeholder="ชื่อ-ตำแหน่ง"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">กำหนดแล้วเสร็จ</label>
            <input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 text-sm text-white/60 hover:text-white border border-white/15 rounded-lg transition-colors">
          ยกเลิก
        </button>
        <button type="submit" disabled={submitting}
          className="px-6 py-2.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold rounded-lg disabled:opacity-40 transition-colors">
          {submitting ? 'กำลังบันทึก...' : 'สร้าง Action Item'}
        </button>
      </div>
    </form>
  )
}
