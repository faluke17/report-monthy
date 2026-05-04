'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Branch } from '@/lib/types'
import { submitKmCase } from '@/app/actions/km'

const APPROACH_OPTIONS = [
  'ซ่อมท่อรั่ว',
  'เปลี่ยนมาตรวัดน้ำ',
  'ลดแรงดัน (PRV)',
  'DMA Zoning',
  'สำรวจมาตรผิดปกติ',
  'ติดตั้ง Data Logger',
  'อื่น ๆ',
]

const schema = z.object({
  branch_id: z.string().min(1, 'กรุณาเลือกสาขา'),
  plan_id: z.string().optional(),
  title: z.string().min(5, 'ชื่อต้องมีอย่างน้อย 5 ตัวอักษร'),
  key_approach: z.string().min(10, 'กรุณาอธิบายแนวทางหลัก (อย่างน้อย 10 ตัวอักษร)'),
  lessons_learned: z.string().optional(),
  nrw_before: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(100).optional()),
  nrw_after: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).max(100).optional()),
  mnf_before: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).optional()),
  mnf_after: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).optional()),
  water_saved_daily: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).optional()),
  value_saved_monthly: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0).optional()),
})

type FormValues = z.infer<typeof schema>

interface KmFormProps {
  branches: Branch[]
  userBranchId?: string
  isRegionAdmin: boolean
}

export function KmForm({ branches, userBranchId, isRegionAdmin }: KmFormProps) {
  const router = useRouter()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      branch_id: userBranchId ?? '',
    },
  })

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const result = await submitKmCase({
        branch_id: values.branch_id,
        plan_id: values.plan_id,
        title: values.title,
        key_approach: values.key_approach,
        lessons_learned: values.lessons_learned,
        approach_tags: selectedTags,
        nrw_before: values.nrw_before !== undefined ? values.nrw_before : null,
        nrw_after: values.nrw_after !== undefined ? values.nrw_after : null,
        mnf_before: values.mnf_before !== undefined ? values.mnf_before : null,
        mnf_after: values.mnf_after !== undefined ? values.mnf_after : null,
        water_saved_daily: values.water_saved_daily !== undefined ? values.water_saved_daily : null,
        value_saved_monthly: values.value_saved_monthly !== undefined ? values.value_saved_monthly : null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`บันทึก KM Case ${result.data?.code} เรียบร้อย`)
      router.push('/km')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section: ข้อมูลทั่วไป */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-white border-b border-white/10 pb-2">ข้อมูลทั่วไป</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-white/70">สาขา <span className="text-red-400">*</span></label>
            <select
              {...register('branch_id')}
              disabled={!isRegionAdmin && !!userBranchId}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/60 disabled:opacity-50"
            >
              <option value="">-- เลือกสาขา --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_th}
                </option>
              ))}
            </select>
            {errors.branch_id && <p className="text-xs text-red-400">{errors.branch_id.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-white/70">ชื่อ KM Case <span className="text-red-400">*</span></label>
          <input
            {...register('title')}
            placeholder="เช่น การลด NRW ด้วยการติดตั้ง PRV ในเขต DMA-1"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
          />
          {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
        </div>

        {/* Approach tags */}
        <div className="space-y-2">
          <label className="text-sm text-white/70">แนวทาง / วิธีการ</label>
          <div className="flex flex-wrap gap-2">
            {APPROACH_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-500/25 text-purple-300 border-purple-500/50'
                    : 'bg-white/5 text-white/50 border-white/15 hover:border-white/30'
                }`}
              >
                {selectedTags.includes(tag) && <span className="mr-1">✓</span>}
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section: ผลลัพธ์เชิงตัวเลข */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-white border-b border-white/10 pb-2">ผลลัพธ์เชิงตัวเลข</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-white/60">NRW ก่อน (%)</label>
            <input
              {...register('nrw_before')}
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm num placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">NRW หลัง (%)</label>
            <input
              {...register('nrw_after')}
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm num placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">MNF ก่อน (ลบ.ม./ชม.)</label>
            <input
              {...register('mnf_before')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm num placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">MNF หลัง (ลบ.ม./ชม.)</label>
            <input
              {...register('mnf_after')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm num placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-white/60">น้ำที่ประหยัดได้ (ลบ.ม./วัน)</label>
            <input
              {...register('water_saved_daily')}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm num placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/60">มูลค่าที่ประหยัดได้ (บาท/เดือน)</label>
            <input
              {...register('value_saved_monthly')}
              type="number"
              step="1"
              min="0"
              placeholder="0"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm num placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        </div>
      </div>

      {/* Section: รายละเอียด */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-white border-b border-white/10 pb-2">รายละเอียดแนวทาง</h2>

        <div className="space-y-1">
          <label className="text-sm text-white/70">แนวทางหลักที่ใช้ <span className="text-red-400">*</span></label>
          <textarea
            {...register('key_approach')}
            rows={4}
            placeholder="อธิบายแนวทาง วิธีการ และขั้นตอนที่ใช้ในการแก้ไขปัญหา..."
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
          />
          {errors.key_approach && <p className="text-xs text-red-400">{errors.key_approach.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-white/70">บทเรียนที่ได้รับ</label>
          <textarea
            {...register('lessons_learned')}
            rows={3}
            placeholder="สิ่งที่เรียนรู้ ข้อควรระวัง หรือข้อแนะนำสำหรับสาขาอื่น..."
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[#061327] font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {submitting ? 'กำลังบันทึก...' : 'บันทึก KM Case'}
        </button>
      </div>
    </form>
  )
}
