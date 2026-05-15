'use client'

import { useState, useTransition } from 'react'
import { X, CheckCircle2, PlayCircle, Clock3, Ban, ChevronRight } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { CodeBadge } from '@/components/shared/CodeBadge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Plan, Branch } from '@/lib/types'
import { updatePlan, acknowledgePlan } from '@/app/actions/plans'
import { toast } from 'sonner'

type PlanRow = Plan & { branches?: Branch }

const PRIORITY_PILL: Record<string, string> = {
  'สูง':  'pill-bad',
  'กลาง': 'pill-warn',
  'ต่ำ':  'pill-gray',
}
const STATUS_PILL: Record<string, string> = {
  'รออนุมัติ':         'pill-warn',
  'ระหว่างดำเนินการ':  'pill-info',
  'สำเร็จ':            'pill-good',
  'ล่าช้า':            'pill-bad',
  'ยกเลิก':            'pill-gray',
}

const columns: ColumnDef<PlanRow>[] = [
  {
    key: 'code',
    header: 'รหัส',
    render: (r) => <CodeBadge code={r.code} />,
  },
  {
    key: 'branch',
    header: 'สาขา',
    render: (r) => (
      <div>
        <p className="font-bold text-white text-sm">{r.branches?.name_th}</p>
        <p className="text-[10px] text-white/35">{r.plan_type}</p>
      </div>
    ),
  },
  {
    key: 'approach_group',
    header: 'แนวทาง',
    render: (r) => <span className="text-sm text-white/70">{r.approach_group}</span>,
  },
  {
    key: 'target_nrw',
    header: 'เป้า NRW',
    render: (r) => (
      <div className="text-sm">
        <span className="num font-bold text-white">{r.target_nrw ?? '—'}%</span>
        {r.baseline_nrw && (
          <span className="text-white/35 text-[11px] ml-1">base: {r.baseline_nrw}%</span>
        )}
      </div>
    ),
  },
  {
    key: 'progress_pct',
    header: 'ความคืบหน้า',
    render: (r) => <ProgressBar value={r.progress_pct} showLabel size="sm" />,
  },
  {
    key: 'priority',
    header: 'ความสำคัญ',
    render: (r) => r.priority ? (
      <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PRIORITY_PILL[r.priority] ?? 'pill-gray'}`}>
        {r.priority}
      </span>
    ) : <span className="text-white/25">—</span>,
  },
  {
    key: 'status',
    header: 'สถานะ',
    render: (r) => (
      <div className="flex items-center gap-1.5">
        <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_PILL[r.status] ?? 'pill-gray'}`}>
          {r.status}
        </span>
        <ChevronRight size={12} className="text-white/20" />
      </div>
    ),
  },
]

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-white/30">{label}</span>
      <span className="text-sm text-white/80">{value ?? <span className="text-white/25">—</span>}</span>
    </div>
  )
}

interface PlanDetailSheetProps {
  plan: PlanRow | null
  onClose: () => void
}

function PlanDetailSheet({ plan, onClose }: PlanDetailSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [localProgress, setLocalProgress] = useState<number>(plan?.progress_pct ?? 0)

  if (!plan) return null

  function handleAcknowledge() {
    startTransition(async () => {
      const res = await acknowledgePlan(plan!.id)
      if (res.success) {
        toast.success('รับทราบแผนเรียบร้อย — เริ่มดำเนินการแล้ว')
        onClose()
      } else {
        toast.error(res.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  function handleStatus(newStatus: string) {
    startTransition(async () => {
      const res = await updatePlan(plan!.id, { status: newStatus })
      if (res.success) {
        toast.success(`อัพเดตสถานะเป็น "${newStatus}" แล้ว`)
        onClose()
      } else {
        toast.error(res.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  function handleProgressSave() {
    startTransition(async () => {
      const res = await updatePlan(plan!.id, { progress_pct: localProgress })
      if (res.success) {
        toast.success('บันทึกความคืบหน้าแล้ว')
      } else {
        toast.error(res.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : null

  return (
    <Sheet open={!!plan} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] overflow-y-auto p-0"
        style={{
          background: 'linear-gradient(180deg,#060e1f 0%,#030810 100%)',
          borderLeft: '1px solid rgba(0,229,255,.15)',
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8 sticky top-0 z-10"
          style={{ background: 'rgba(6,14,31,0.97)', backdropFilter: 'blur(12px)' }}>
          <SheetTitle className="sr-only">รายละเอียดแผน</SheetTitle>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CodeBadge code={plan.code} />
                <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_PILL[plan.status] ?? 'pill-gray'}`}>
                  {plan.status}
                </span>
              </div>
              <p className="text-white font-bold text-base leading-tight truncate">{plan.branches?.name_th}</p>
              <p className="text-white/40 text-xs mt-0.5">{plan.plan_type} · {plan.approach_group}</p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors mt-0.5 shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 p-3"
              style={{ background: 'rgba(0,229,255,.04)' }}>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">NRW เป้าหมาย</p>
              <p className="num text-xl font-bold text-[#00e5ff]">{plan.target_nrw ?? '—'}%</p>
              {plan.baseline_nrw != null && (
                <p className="text-[11px] text-white/30 mt-0.5">Baseline: {plan.baseline_nrw}%</p>
              )}
            </div>
            <div className="rounded-xl border border-white/8 p-3"
              style={{ background: 'rgba(139,92,246,.04)' }}>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">MNF เป้าหมาย</p>
              <p className="num text-xl font-bold text-purple-300">{plan.target_mnf ?? '—'}</p>
              {plan.baseline_mnf != null && (
                <p className="text-[11px] text-white/30 mt-0.5">Baseline: {plan.baseline_mnf}</p>
              )}
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-widest text-white/30">ความคืบหน้า</span>
              <span className="num text-sm font-bold text-white/80">{localProgress}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={localProgress}
              onChange={(e) => setLocalProgress(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-white/20 mt-0.5">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
            {localProgress !== plan.progress_pct && (
              <button
                onClick={handleProgressSave}
                disabled={isPending}
                className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: 'rgba(0,229,255,.12)',
                  border: '1px solid rgba(0,229,255,.3)',
                  color: '#00e5ff',
                }}
              >
                {isPending ? 'กำลังบันทึก…' : 'บันทึกความคืบหน้า'}
              </button>
            )}
          </div>

          {/* Plan details */}
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="ผู้สั่งการ" value={plan.ordered_by} />
            <DetailRow label="ผู้รับผิดชอบ" value={plan.pic} />
            <DetailRow label="ความสำคัญ" value={
              plan.priority ? (
                <span className={`pill rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_PILL[plan.priority] ?? 'pill-gray'}`}>
                  {plan.priority}
                </span>
              ) : null
            } />
            <DetailRow label="วันที่เริ่ม" value={fmt(plan.start_date)} />
            <DetailRow label="วันที่สิ้นสุด" value={fmt(plan.end_date)} />
            <DetailRow label="พื้นที่/DMA" value={plan.area} />
            {plan.acknowledged_by && (
              <DetailRow label="ผู้รับทราบ" value={plan.acknowledged_by} />
            )}
            {plan.acknowledged_at && (
              <DetailRow label="รับทราบเมื่อ" value={fmt(plan.acknowledged_at)} />
            )}
          </div>

          {/* Action plan */}
          {plan.action_plan && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">แผนดำเนินการ</p>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap rounded-xl border border-white/8 p-3"
                style={{ background: 'rgba(255,255,255,.02)' }}>
                {plan.action_plan}
              </p>
            </div>
          )}

          {/* Resources */}
          {plan.resources && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2">ทรัพยากร</p>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap rounded-xl border border-white/8 p-3"
                style={{ background: 'rgba(255,255,255,.02)' }}>
                {plan.resources}
              </p>
            </div>
          )}

          {/* Status actions */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">อัพเดตสถานะ</p>
            <div className="grid grid-cols-2 gap-2">
              {plan.status === 'รออนุมัติ' && (
                <button
                  onClick={handleAcknowledge}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors col-span-2"
                  style={{ background: 'rgba(34,211,238,.12)', border: '1px solid rgba(34,211,238,.3)', color: '#22d3ee' }}
                >
                  <PlayCircle size={14} />รับทราบ / เริ่มดำเนินการ
                </button>
              )}
              {plan.status !== 'สำเร็จ' && plan.status !== 'ยกเลิก' && plan.status !== 'รออนุมัติ' && (
                <button
                  onClick={() => handleStatus('สำเร็จ')}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)', color: '#4ade80' }}
                >
                  <CheckCircle2 size={14} />สำเร็จ
                </button>
              )}
              {plan.status === 'ระหว่างดำเนินการ' && (
                <button
                  onClick={() => handleStatus('ล่าช้า')}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.3)', color: '#fb7185' }}
                >
                  <Clock3 size={14} />ล่าช้า
                </button>
              )}
              {plan.status !== 'ยกเลิก' && plan.status !== 'สำเร็จ' && (
                <button
                  onClick={() => handleStatus('ยกเลิก')}
                  disabled={isPending}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(148,163,184,.08)', border: '1px solid rgba(148,163,184,.2)', color: '#94a3b8' }}
                >
                  <Ban size={14} />ยกเลิก
                </button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function PlansTable({ data }: { data: PlanRow[] }) {
  const [selected, setSelected] = useState<PlanRow | null>(null)

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        emptyMessage="ยังไม่มีแผน"
        onRowClick={(row) => setSelected(row)}
      />
      <PlanDetailSheet plan={selected} onClose={() => setSelected(null)} />
    </>
  )
}
