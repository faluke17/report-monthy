'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Branch, UserProfile, PlanFormData } from '@/lib/types'
import { submitPlan } from '@/app/actions/plans'

const PLAN_TYPES = ['Quick Win', 'Big Win', 'KM Case', 'Corrective']
const APPROACH_GROUPS = [
  'Step Test/Zero Test', 'PRV/Pressure Management', 'DMA Meter ซ่อม/เปลี่ยน',
  'ALC/Acoustic Logger', 'Commercial Loss', 'Booster Pump', 'อื่นๆ',
]

interface Props {
  branches: Branch[]
  profile: UserProfile | null
}

export function PlanForm({ branches, profile }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<Partial<PlanFormData>>({
    branch_id: profile?.branch_id ?? '',
    owner_level: profile?.role === 'region_admin' ? 'region' : 'branch',
    priority: 'กลาง',
  })

  function set(field: string, value: string | number) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)))
    const result = await submitPlan(fd)
    if (result.success) {
      toast.success('สร้างแผนสำเร็จ')
      router.push('/plans')
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
            <select value={form.branch_id ?? ''} onChange={(e) => set('branch_id', e.target.value)} required
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60">
              <option value="">— เลือกสาขา —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name_th} ({b.code})</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">ประเภทแผน</label>
            <select value={form.plan_type ?? ''} onChange={(e) => set('plan_type', e.target.value)} required
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60">
              <option value="">— เลือก —</option>
              {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">ลำดับความสำคัญ</label>
            <select value={form.priority ?? 'กลาง'} onChange={(e) => set('priority', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60">
              {['สูง', 'กลาง', 'ต่ำ'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">กลุ่มแนวทาง</label>
          <select value={form.approach_group ?? ''} onChange={(e) => set('approach_group', e.target.value)} required
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60">
            <option value="">— เลือก —</option>
            {APPROACH_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">NRW Baseline (%)</label>
            <input type="number" step="0.01" value={form.baseline_nrw ?? ''} onChange={(e) => set('baseline_nrw', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/60" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">เป้าหมาย NRW (%)</label>
            <input type="number" step="0.01" value={form.target_nrw ?? ''} onChange={(e) => set('target_nrw', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/60" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">แผนการดำเนินการ</label>
          <textarea value={form.action_plan ?? ''} onChange={(e) => set('action_plan', e.target.value)} rows={3}
            placeholder="อธิบายแนวทางและขั้นตอนการดำเนินการ..."
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none" />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">ผู้รับผิดชอบ</label>
          <input type="text" value={form.pic ?? ''} onChange={(e) => set('pic', e.target.value)} placeholder="ชื่อ-นามสกุล"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">วันเริ่ม</label>
            <input type="date" value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/60" />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">วันสิ้นสุด</label>
            <input type="date" value={form.end_date ?? ''} onChange={(e) => set('end_date', e.target.value)}
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
          {submitting ? 'กำลังบันทึก...' : 'สร้างแผน'}
        </button>
      </div>
    </form>
  )
}
