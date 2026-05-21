'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Loader2 } from 'lucide-react'
import { fulfillCustomRequirement } from '@/app/actions/meeting-requirements'

export function RequirementFulfillButton({ requirementId }: { requirementId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleFulfill() {
    setLoading(true)
    const result = await fulfillCustomRequirement(requirementId)
    if (result.success) {
      setDone(true)
      toast.success('บันทึกเรียบร้อย')
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0">
        <CheckCircle size={12} />
        ดำเนินการแล้ว
      </div>
    )
  }

  return (
    <button
      onClick={handleFulfill}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
      ดำเนินการแล้ว
    </button>
  )
}
