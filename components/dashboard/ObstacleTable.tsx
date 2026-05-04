'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Trash2 } from 'lucide-react'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { CodeBadge } from '@/components/shared/CodeBadge'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Obstacle, Branch } from '@/lib/types'
import { formatThaiDate, isOverdue } from '@/lib/utils/date-th'
import { updateObstacleProgress, deleteObstacle } from '@/app/actions/obstacles'

type ObstacleRow = Obstacle & { branches?: Branch }

const STATUS_OPTS = [
  { value: 'รายงานใหม่',  color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30' },
  { value: 'ระหว่างแก้',  color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30' },
  { value: 'รอสนับสนุน',  color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30' },
  { value: 'ล่าช้า',       color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  { value: 'เกินกำหนด',   color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
  { value: 'ปิดประเด็น',  color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/30' },
]

function statusMeta(s: string) {
  return STATUS_OPTS.find((o) => o.value === s) ?? STATUS_OPTS[0]
}

function priorityLabel(order: number | null) {
  if (order === 1) return { label: 'สูง', cls: 'bg-red-500/20 border-red-500/40 text-red-300' }
  return { label: 'กลาง', cls: 'bg-amber-500/20 border-amber-500/40 text-amber-300' }
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">{label}</p>
      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

export function ObstacleTable({ data, canDelete }: { data: ObstacleRow[]; canDelete?: boolean }) {
  const [selected, setSelected] = useState<ObstacleRow | null>(null)
  const [pct, setPct] = useState(0)
  const [status, setStatus] = useState('')
  const [resolutionPlan, setResolutionPlan] = useState('')
  const [regionSupport, setRegionSupport] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, startTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()

  function openSheet(row: ObstacleRow) {
    setSelected(row)
    setPct(row.progress_pct ?? 0)
    setStatus(row.status)
    setResolutionPlan(row.resolution_plan ?? '')
    setRegionSupport(row.region_support_needed ?? '')
    setConfirmDelete(false)
  }

  function handleClose() {
    setSelected(null)
    setConfirmDelete(false)
  }

  function handleUpdate() {
    if (!selected) return
    startTransition(async () => {
      const result = await updateObstacleProgress(
        selected.id, pct, status, resolutionPlan, regionSupport
      )
      if (result.success) {
        toast.success('อัปเดตความคืบหน้าสำเร็จ')
        setSelected(null)
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  function handleDelete() {
    if (!selected) return
    startDeleteTransition(async () => {
      const result = await deleteObstacle(selected.id)
      if (result.success) {
        toast.success('ลบอุปสรรคสำเร็จ')
        setSelected(null)
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
        setConfirmDelete(false)
      }
    })
  }

  const meta = selected ? statusMeta(status) : null
  const pri  = selected ? priorityLabel(selected.priority_order) : null

  return (
    <>
      {/* ─── Table ─── */}
      {data.length === 0 ? (
        <div className="py-16 text-center text-sm text-white/30">ไม่มีอุปสรรคที่รอดำเนินการ</div>
      ) : (
        <div className="divide-y divide-white/5">
          {data.map((row) => {
            const sm = statusMeta(row.status)
            const overdue = isOverdue(row.due_date)
            return (
              <button
                key={row.id}
                onClick={() => openSheet(row)}
                className="w-full text-left px-4 py-3.5 hover:bg-white/5 transition-colors flex items-center gap-3 group"
              >
                {/* priority stripe */}
                <div className={`w-1 h-10 rounded-full shrink-0 ${
                  row.priority_order === 1 ? 'bg-red-500' : 'bg-amber-400/60'
                }`} />

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CodeBadge code={row.code} />
                    <span className="text-sm font-semibold text-white truncate">
                      {row.obstacle_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span>{row.branches?.name_th}</span>
                    {row.due_date && (
                      <span className={overdue ? 'text-red-400' : ''}>
                        กำหนด {formatThaiDate(row.due_date, true)}
                        {overdue && ' ⚠'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block w-24">
                    <ProgressBar value={row.progress_pct ?? 0} showLabel size="sm" />
                  </div>
                  <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${sm.bg} ${sm.color}`}>
                    {row.status}
                  </span>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Detail Sheet ─── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-[#0c1a30] border-white/10 overflow-y-auto flex flex-col gap-0 p-0"
        >
          {selected && (
            <>
              {/* Header */}
              <div className="p-5 border-b border-white/10 space-y-2">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-2 ${
                    selected.priority_order === 1 ? 'bg-red-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-base font-bold text-white leading-snug">
                      {selected.obstacle_type}
                    </SheetTitle>
                    <p className="text-sm text-white/40 mt-0.5">
                      {selected.branches?.name_th}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CodeBadge code={selected.code} />
                  {pri && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pri.cls}`}>
                      {pri.label === 'สูง' ? '🔴' : '🟡'} {pri.label}
                    </span>
                  )}
                  {selected.due_date && (
                    <span className={`text-xs ${isOverdue(selected.due_date) ? 'text-red-400' : 'text-white/40'}`}>
                      กำหนด {formatThaiDate(selected.due_date, true)}
                      {isOverdue(selected.due_date) && ' ⚠'}
                    </span>
                  )}
                </div>
              </div>

              {/* Detail fields */}
              <div className="p-5 space-y-4 border-b border-white/10">
                <DetailRow label="รายละเอียดอุปสรรค"          value={selected.data_quality_impact} />
                <DetailRow label="ผลกระทบที่ได้รับ"           value={selected.area} />
                <DetailRow label="สิ่งที่ต้องการจากเขต (เดิม)" value={selected.region_support_needed} />
              </div>

              {/* ─── อัปเดตความคืบหน้า ─── */}
              <div className="p-5 space-y-5">
                <p className="text-[10px] font-bold text-green-400/60 uppercase tracking-widest">
                  อัปเดตความคืบหน้า
                </p>

                {/* Progress slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">ความคืบหน้า</span>
                    <span className="text-lg font-bold num text-white">{pct}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={pct}
                    onChange={(e) => setPct(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">สถานะ</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(s.value)}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                          status === s.value
                            ? `${s.bg} ${s.color}`
                            : 'bg-white/5 border-white/10 text-white/35 hover:border-white/25'
                        }`}
                      >
                        {s.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* แนวทางการแก้ไข (editable) */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">แนวทางการแก้ไข</label>
                  <textarea
                    value={resolutionPlan}
                    onChange={(e) => setResolutionPlan(e.target.value)}
                    rows={3}
                    placeholder="อัปเดตแนวทางการแก้ไข..."
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                  />
                </div>

                {/* สิ่งที่ต้องการจากเขต (editable) */}
                <div>
                  <label className="block text-sm text-white/60 mb-1.5">สิ่งที่ต้องการความช่วยเหลือจากเขต</label>
                  <textarea
                    value={regionSupport}
                    onChange={(e) => setRegionSupport(e.target.value)}
                    rows={2}
                    placeholder="อัปเดตสิ่งที่ต้องการ..."
                    className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                  />
                </div>

                {/* Summary card */}
                {meta && (
                  <div className={`rounded-xl border p-4 space-y-2 ${meta.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${meta.color}`}>{status}</span>
                      {pri && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pri.cls}`}>
                          {pri.label === 'สูง' ? '🔴 ด่วน' : '🟡 ปกติ'}
                        </span>
                      )}
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 text-right num">{pct}% เสร็จสิ้น</p>
                  </div>
                )}

                <button
                  onClick={handleUpdate}
                  disabled={pending}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-bold text-sm rounded-lg disabled:opacity-40 transition-colors"
                >
                  {pending ? 'กำลังบันทึก...' : 'บันทึกความคืบหน้า'}
                </button>

                {/* ─── Delete (region only) ─── */}
                {canDelete && (
                  <div className="pt-2 border-t border-white/10">
                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                        ลบอุปสรรคนี้
                      </button>
                    ) : (
                      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-2">
                        <p className="text-sm text-red-300 text-center font-semibold">ยืนยันการลบ?</p>
                        <p className="text-xs text-white/40 text-center">ไม่สามารถกู้คืนได้</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            disabled={deletePending}
                            className="flex-1 py-2 rounded-lg bg-white/10 text-white/60 text-sm font-semibold hover:bg-white/15 disabled:opacity-40 transition-colors"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deletePending}
                            className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                          >
                            {deletePending ? 'กำลังลบ...' : 'ลบเลย'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
