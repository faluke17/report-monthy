'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, Save, Target } from 'lucide-react'
import { bulkUpsertNrwBranchTargets } from '@/app/actions/nrw-report'
import { BRANCH_ORDER } from './NrwReportTable'

const INPUT = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 text-right font-mono'

interface Props {
  fiscalYear: number
  initialTargets: Record<string, number | null>
  onClose: () => void
}

export function NrwTargetModal({ fiscalYear, initialTargets, onClose }: Props) {
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      BRANCH_ORDER.map((b) => [b, initialTargets[b]?.toString() ?? ''])
    )
  )

  function setAll(v: string) {
    setValues(Object.fromEntries(BRANCH_ORDER.map((b) => [b, v])))
  }

  function handleSave() {
    const targets = BRANCH_ORDER.map((b) => ({
      branch_name: b,
      target_nrw:  parseFloat(values[b] ?? '') || null,
    }))
    startTransition(async () => {
      const res = await bulkUpsertNrwBranchTargets(targets, fiscalYear)
      if (res.success) {
        toast.success(`บันทึกเป้าหมายปีงบ ${fiscalYear} ครบ 26 สาขาเรียบร้อย`)
        onClose()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-[#061a38] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl animate-fadein">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Target size={16} className="text-cyan-400" />
                ตั้งเป้าหมายปีงบ {fiscalYear}
              </h3>
              <p className="text-xs text-white/40 mt-0.5">กรอกครั้งเดียวใช้ทั้งปี — สามารถใส่เป้าหมายเดียวกันทุกสาขาได้</p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Quick fill */}
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
            <span className="text-xs text-white/40 shrink-0">กรอกเป้าเดียวกันทุกสาขา:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="เช่น 25.00"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 font-mono"
              onChange={(e) => { if (e.target.value) setAll(e.target.value) }}
            />
            <span className="text-xs text-white/30">%</span>
          </div>

          {/* Branch list */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            <div className="space-y-1.5">
              {BRANCH_ORDER.map((branch, idx) => (
                <div key={branch} className="flex items-center gap-3">
                  <span className="text-xs text-white/30 font-mono w-5 shrink-0">{idx + 1}</span>
                  <span className="text-xs text-white flex-1">{branch}</span>
                  <div className="flex items-center gap-1.5 w-28">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="—"
                      value={values[branch] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [branch]: e.target.value }))}
                      className={INPUT}
                    />
                    <span className="text-xs text-white/30">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/10 flex gap-2">
            <button onClick={onClose} disabled={pending}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 disabled:opacity-50">
              ยกเลิก
            </button>
            <button onClick={handleSave} disabled={pending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-50">
              <Save size={13} />
              {pending ? 'กำลังบันทึก...' : 'บันทึกเป้าหมาย 26 สาขา'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
