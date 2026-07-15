'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { calcNRW, calcMNFFactor, generateNRWAnalysis } from '@/lib/utils/nrw-calc'
import { formatThaiNumber, getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { Branch, Plan, UserProfile } from '@/lib/types'
import { submitMonthlyReport } from '@/app/actions/reports'

interface Props {
  branches: Branch[]
  profile: UserProfile | null
  plans: Partial<Plan>[]
}

const STEPS = ['เลือกแผน & เดือน', 'ปริมาณน้ำ', 'ผลการดำเนินการ', 'ทบทวน & ส่ง']

export function MonthlyInputForm({ branches, profile, plans }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const now = new Date()
  const isBranch = ['branch_manager', 'branch_staff'].includes(profile?.role ?? '')

  // default = เดือนก่อนหน้า (รายงานที่กรอกในเดือนนี้ = ข้อมูลเดือนที่แล้ว)
  const defaultReportMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const defaultReportYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  // Form state
  const [form, setForm] = useState({
    branch_id: profile?.branch_id ?? '',
    plan_id: '',
    report_year: defaultReportYear,
    report_month: defaultReportMonth,
    volume_distributed: '',
    volume_sold: '',
    days_in_month: '30',
    mnf_latest: '',
    mnf_measured_date: '',
    daily_supply: '',
    leaks_found: '0',
    leaks_repaired: '0',
    leaks_pending: '0',
    leaks_repeat: '0',
    meters_abnormal: '0',
    pdca_do: '',
    pdca_act: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Computed live values
  const dist = parseFloat(form.volume_distributed) || 0
  const sold = parseFloat(form.volume_sold) || 0
  const mnf = parseFloat(form.mnf_latest) || 0
  const daily = parseFloat(form.daily_supply) || 0

  const nrwPct = calcNRW(dist, sold)
  const mnfFactor = calcMNFFactor(mnf, daily)

  const selectedPlan = plans.find((p) => p.id === form.plan_id)
  const analysis = dist > 0
    ? generateNRWAnalysis(nrwPct, null, selectedPlan?.baseline_nrw ?? null, selectedPlan?.target_nrw ?? null, mnfFactor)
    : null

  // Auto-save draft every 30s
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (form.volume_distributed && form.volume_sold) {
        localStorage.setItem('monthly_draft', JSON.stringify(form))
      }
    }, 30000)
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current) }
  }, [form])

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('monthly_draft')
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        if (parsed.branch_id === (profile?.branch_id ?? '')) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setForm(parsed)
          toast.info('กู้คืนแบบร่างที่บันทึกไว้')
        }
      } catch { /* ignore */ }
    }
  }, [])

  async function handleSubmit() {
    setSubmitting(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))

    const result = await submitMonthlyReport(fd)
    if (result.success) {
      localStorage.removeItem('monthly_draft')
      toast.success('บันทึกรายงานสำเร็จ')
      router.push('/pdca')
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
  }

  const branchName = branches.find((b) => b.id === form.branch_id)?.name_th ?? '—'

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-cyan-500 text-[#FFFFFF]' :
              'bg-black/10 text-black/40'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-[#12181F]' : 'text-black/40'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-black/10" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 0 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-[#12181F]">เลือกแผน & เดือนที่รายงาน</h2>

          {!isBranch && (
            <div>
              <label className="block text-sm text-black/60 mb-1.5">สาขา</label>
              <select
                value={form.branch_id}
                onChange={(e) => set('branch_id', e.target.value)}
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
              >
                <option value="">— เลือกสาขา —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name_th} ({b.code})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-black/60 mb-1.5">ปี (พ.ศ.)</label>
              <select
                value={form.report_year}
                onChange={(e) => set('report_year', e.target.value)}
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
              >
                {[0, 1, 2].map((offset) => {
                  const y = now.getFullYear() - offset
                  return <option key={y} value={y}>{toThaiYear(y)}</option>
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm text-black/60 mb-1.5">เดือน</label>
              <select
                value={form.report_month}
                onChange={(e) => set('report_month', e.target.value)}
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{getThaiMonthName(m)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-black/60 mb-1.5">แผน (ไม่บังคับ)</label>
            <select
              value={form.plan_id}
              onChange={(e) => set('plan_id', e.target.value)}
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
            >
              <option value="">— ไม่ระบุแผน —</option>
              {plans
                .filter((p) => !form.branch_id || p.branch_id === form.branch_id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.plan_type}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 1 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-[#12181F]">ปริมาณน้ำ</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-black/60 mb-1.5">น้ำจ่าย (ลบ.ม.)</label>
              <input
                type="number"
                value={form.volume_distributed}
                onChange={(e) => set('volume_distributed', e.target.value)}
                placeholder="0"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] font-mono placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-sm text-black/60 mb-1.5">น้ำขาย (ลบ.ม.)</label>
              <input
                type="number"
                value={form.volume_sold}
                onChange={(e) => set('volume_sold', e.target.value)}
                placeholder="0"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] font-mono placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-sm text-black/60 mb-1.5">MNF ล่าสุด (ลบ.ม./ชม.)</label>
              <input
                type="number"
                value={form.mnf_latest}
                onChange={(e) => set('mnf_latest', e.target.value)}
                placeholder="0"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] font-mono placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-sm text-black/60 mb-1.5">น้ำจ่ายรายวัน (ลบ.ม./วัน)</label>
              <input
                type="number"
                value={form.daily_supply}
                onChange={(e) => set('daily_supply', e.target.value)}
                placeholder="0"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] font-mono placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          {/* Live NRW preview */}
          {dist > 0 && (
            <div className={`rounded-xl p-4 border ${
              nrwPct <= (selectedPlan?.target_nrw ?? 20) ? 'bg-green-500/10 border-green-500/30' :
              nrwPct <= (selectedPlan?.target_nrw ?? 20) + 3 ? 'bg-amber-500/10 border-amber-500/30' :
              'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-black/60">NRW คำนวณแบบ Realtime</span>
                <span className={`text-2xl font-bold num ${
                  nrwPct <= 20 ? 'text-green-400' : nrwPct <= 23 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {formatThaiNumber(nrwPct)}%
                </span>
              </div>
              <div className="flex gap-4 text-xs text-black/50">
                <span>น้ำสูญเสีย: <strong className="num text-black/80">{formatThaiNumber(dist - sold, 0)} ลบ.ม.</strong></span>
                <span>MNF Factor: <strong className="num text-black/80">{mnfFactor.toFixed(3)}</strong></span>
              </div>
              {analysis && (
                <div className="mt-3 pt-3 border-t border-black/10">
                  <p className="text-xs font-semibold text-[#12181F]">{analysis.title}</p>
                  <p className="text-xs text-black/60 mt-1">{analysis.text}</p>
                  <p className="text-xs text-cyan-400 mt-1">→ {analysis.next}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {step === 2 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-[#12181F]">ผลการดำเนินการ</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: 'leaks_found', label: 'จุดรั่วพบใหม่' },
              { key: 'leaks_repaired', label: 'ซ่อมแล้ว' },
              { key: 'leaks_pending', label: 'รอดำเนินการ' },
              { key: 'leaks_repeat', label: 'รั่วซ้ำ' },
              { key: 'meters_abnormal', label: 'มาตรผิดปกติ' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm text-black/60 mb-1.5">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] font-mono focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm text-black/60 mb-1.5">D (Do) — สิ่งที่ทำเดือนนี้</label>
            <textarea
              value={form.pdca_do}
              onChange={(e) => set('pdca_do', e.target.value)}
              rows={3}
              placeholder="ระบุกิจกรรมที่ดำเนินการในเดือนนี้..."
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-black/60 mb-1.5">A (Act) — แผนเดือนถัดไป</label>
            <textarea
              value={form.pdca_act}
              onChange={(e) => set('pdca_act', e.target.value)}
              rows={3}
              placeholder="ระบุแผนที่จะดำเนินการเดือนถัดไป..."
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60 resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 3 && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-[#12181F]">ทบทวนก่อนส่ง</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-black/10">
              <span className="text-black/60">สาขา</span>
              <span className="text-[#12181F] font-medium">{branchName}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-black/10">
              <span className="text-black/60">เดือน</span>
              <span className="text-[#12181F] num">{getThaiMonthName(form.report_month)} {toThaiYear(form.report_year)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-black/10">
              <span className="text-black/60">น้ำจ่าย</span>
              <span className="text-[#12181F] num">{formatThaiNumber(dist, 0)} ลบ.ม.</span>
            </div>
            <div className="flex justify-between py-2 border-b border-black/10">
              <span className="text-black/60">น้ำขาย</span>
              <span className="text-[#12181F] num">{formatThaiNumber(sold, 0)} ลบ.ม.</span>
            </div>
            <div className="flex justify-between py-2 border-b border-black/10">
              <span className="text-black/60">NRW (%)</span>
              <span className={`num font-bold ${nrwPct <= 20 ? 'text-green-400' : 'text-red-400'}`}>
                {formatThaiNumber(nrwPct)}%
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-black/60">MNF Factor</span>
              <span className="text-[#12181F] num">{mnfFactor.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="px-4 py-2.5 text-sm text-black/60 hover:text-[#12181F] border border-black/15 rounded-lg disabled:opacity-30 transition-colors"
        >
          ย้อนกลับ
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 0 && !form.branch_id}
            className="px-6 py-2.5 text-sm bg-cyan-500 hover:bg-cyan-400 text-[#FFFFFF] font-semibold rounded-lg disabled:opacity-40 transition-colors"
          >
            ถัดไป
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 text-sm bg-green-500 hover:bg-green-400 text-[#FFFFFF] font-semibold rounded-lg disabled:opacity-40 transition-colors"
          >
            {submitting ? 'กำลังบันทึก...' : 'ยืนยันและส่ง'}
          </button>
        )}
      </div>
    </div>
  )
}
