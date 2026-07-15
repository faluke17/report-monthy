'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { ChevronRight, Trash2, MessageSquarePlus, SlidersHorizontal, AlertCircle, Clock } from 'lucide-react'
import { CodeBadge } from '@/components/shared/CodeBadge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Obstacle, Branch, ObstacleProgressLog } from '@/lib/types'
import { formatThaiDate, isOverdue } from '@/lib/utils/date-th'
import { addProgressLog, getProgressLogs, deleteObstacle } from '@/app/actions/obstacles'

type ObstacleRow = Obstacle & { branches?: Branch }

// ── design tokens ──────────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<string, { accent: string; glow: string; badge: string; border: string }> = {
  MM:   {
    accent: '#0B6E76',
    glow:   'shadow-[0_0_24px_rgba(11,110,118,.10)]',
    badge:  'bg-[#0B6E76]/12 border-[#0B6E76]/30 text-[#0B6E76]',
    border: 'border-l-[#0B6E76]',
  },
  DMA:  {
    accent: '#0B6E76',
    glow:   'shadow-[0_0_24px_rgba(11,110,118,.10)]',
    badge:  'bg-[#0B6E76]/12 border-[#0B6E76]/30 text-[#0B6E76]',
    border: 'border-l-[#0B6E76]',
  },
  P3:   {
    accent: '#6B4FA0',
    glow:   'shadow-[0_0_24px_rgba(107,79,160,.10)]',
    badge:  'bg-[#6B4FA0]/12 border-[#6B4FA0]/30 text-[#6B4FA0]',
    border: 'border-l-[#6B4FA0]',
  },
  อื่นๆ: {
    accent: '#4B5563',
    glow:   '',
    badge:  'bg-black/5 border-black/15 text-[#4B5563]',
    border: 'border-l-[#8896A3]',
  },
}
function getCat(cat: string) { return CATEGORY_COLOR[cat] ?? CATEGORY_COLOR['อื่นๆ'] }

const PRIORITY_META: Record<number, { dot: string; badge: string; label: string; urgentGlow: string }> = {
  1: {
    dot:        'bg-[#B3392C]',
    badge:      'bg-[#B3392C]/12 border-[#B3392C]/30 text-[#B3392C]',
    label:      'เร่งด่วน',
    urgentGlow: 'shadow-[inset_0_0_0_1px_rgba(179,57,44,.12)]',
  },
  2: {
    dot:        'bg-[#A8721A]/80',
    badge:      'bg-[#A8721A]/10 border-[#A8721A]/25 text-[#A8721A]',
    label:      'ปกติ',
    urgentGlow: '',
  },
}
function getPri(order: number | null) { return PRIORITY_META[order ?? 2] ?? PRIORITY_META[2] }

const ENTRY_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  branch_update: { dot: 'bg-[#0B6E76]', badge: 'bg-[#0B6E76]/12 border-[#0B6E76]/30 text-[#0B6E76]', label: 'สาขา' },
  region_note:   { dot: 'bg-[#A8721A]', badge: 'bg-[#A8721A]/12 border-[#A8721A]/30 text-[#A8721A]', label: 'เขต'  },
  system:        { dot: 'bg-[#8896A3]', badge: 'bg-black/5 border-black/10 text-[#4B5563]',           label: 'ระบบ' },
}

// ── helpers ────────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear() + 543}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ── sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-[#4B5563] uppercase tracking-[.18em] font-mono">
      {children}
    </p>
  )
}

function DetailRow({ label, value, accent }: { label: string; value?: string | null; accent?: string }) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-[#EFF2F5] bg-[#FFFFFF] overflow-hidden">
      <div
        className="px-3.5 py-2 border-b border-[#EFF2F5] flex items-center gap-2"
        style={{ background: accent ? `${accent}0D` : 'rgba(11,110,118,.04)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent ?? '#4B5563' }} />
        <p className="text-xs font-semibold text-[#12181F]">{label}</p>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm text-[#12181F] leading-relaxed whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  )
}

function ProgressMini({ value }: { value: number }) {
  const cls = value >= 80 ? 'prog-good' : value >= 40 ? 'prog-warn' : 'prog-bad'
  return (
    <div className="flex items-center gap-2">
      <div className="prog-bg flex-1 max-w-[90px]">
        <div className={`prog-fill ${cls}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-[#4B5563] num w-7 text-right">{value}%</span>
    </div>
  )
}

function LogTimeline({ logs }: { logs: ObstacleProgressLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[#8896A3]">ยังไม่มีการอัพเดท</p>
      </div>
    )
  }
  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[#EFF2F5]" />
      <div className="space-y-5">
        {logs.map((log, i) => {
          const s = ENTRY_STYLE[log.entry_type] ?? ENTRY_STYLE.system
          return (
            <div key={log.id} className="relative">
              <div className={`absolute -left-5 top-[5px] w-3.5 h-3.5 rounded-full border-[3px] border-[#FFFFFF] ${s.dot}`} />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.badge}`}>
                    {s.label}
                  </span>
                  {i === 0 && !log.is_closed && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0B6E76]/10 border border-[#0B6E76]/25 text-[#0B6E76]">
                      ล่าสุด
                    </span>
                  )}
                  {log.is_closed && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1E7A5A]/12 border border-[#1E7A5A]/30 text-[#1E7A5A]">
                      ✓ ปิดประเด็น
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#12181F] leading-relaxed">{log.message}</p>
                {log.progress_pct !== null && <ProgressMini value={log.progress_pct} />}
                <p className="text-[11px] text-[#8896A3]">
                  {formatDateTime(log.created_at)} · {log.created_by}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── main ───────────────────────────────────────────────────────────────────────

export function ObstacleTable({
  data,
  canDelete,
  isRegion,
}: {
  data: ObstacleRow[]
  canDelete?: boolean
  isRegion?: boolean
}) {
  const [selected, setSelected]           = useState<ObstacleRow | null>(null)
  const [logs, setLogs]                   = useState<ObstacleProgressLog[]>([])
  const [logsLoading, setLogsLoading]     = useState(false)
  const [message, setMessage]             = useState('')
  const [pct, setPct]                     = useState<number | null>(null)
  const [showPct, setShowPct]             = useState(false)
  const [closingNow, setClosingNow]       = useState(false)
  const [entryType, setEntryType]         = useState<'branch_update' | 'region_note'>('branch_update')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, startTransition]        = useTransition()
  const [deletePending, startDeleteTrans] = useTransition()

  useEffect(() => {
    if (!selected) { setLogs([]); return }
    setLogsLoading(true)
    getProgressLogs(selected.id).then((r) => { setLogs(r.data); setLogsLoading(false) })
  }, [selected?.id])

  function openDialog(row: ObstacleRow) {
    setSelected(row)
    setMessage(''); setPct(null); setShowPct(false)
    setClosingNow(false); setEntryType('branch_update'); setConfirmDelete(false)
  }
  function handleClose() { setSelected(null); setConfirmDelete(false) }

  function handleSubmitLog() {
    if (!selected || !message.trim()) return
    startTransition(async () => {
      const result = await addProgressLog(
        selected.id, message.trim(), showPct ? pct : null, closingNow, entryType,
      )
      if (result.success) {
        toast.success('บันทึกความคืบหน้าสำเร็จ')
        const { data: fresh } = await getProgressLogs(selected.id)
        setLogs(fresh)
        setMessage(''); setPct(null); setShowPct(false); setClosingNow(false)
        if (closingNow) setSelected(null)
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  function handleDelete() {
    if (!selected) return
    startDeleteTrans(async () => {
      const result = await deleteObstacle(selected.id)
      if (result.success) { toast.success('ลบอุปสรรคสำเร็จ'); setSelected(null) }
      else { toast.error(result.error ?? 'เกิดข้อผิดพลาด'); setConfirmDelete(false) }
    })
  }

  // ── list ─────────────────────────────────────────────────────────────────────

  if (data.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[#8896A3]">ไม่มีอุปสรรคที่รอดำเนินการ</p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y divide-[#EFF2F5]">
        {data.map((row) => {
          const cat       = getCat(row.category)
          const pri       = getPri(row.priority_order)
          const overdue   = isOverdue(row.due_date)
          const staleDays = daysSince(row.last_log_at ?? row.created_at)
          const isStale   = staleDays > 14 && row.status !== 'ปิดประเด็น'
          const isClosed  = row.status === 'ปิดประเด็น'
          const isUrgent  = row.priority_order === 1 && !isClosed

          return (
            <button
              key={row.id}
              onClick={() => openDialog(row)}
              className={[
                'w-full text-left px-5 py-4 transition-all group',
                'border-l-[3px]',
                isClosed ? 'border-l-[#EFF2F5] opacity-60' : cat.border,
                isUrgent
                  ? 'hover:bg-[#B3392C]/5 bg-[#B3392C]/[.03]'
                  : 'hover:bg-[#0B6E76]/5',
                cat.glow,
              ].join(' ')}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">

                  {/* title */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <CodeBadge code={row.code} />
                    {isUrgent && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${pri.badge} animate-pulse`}>
                        ด่วน
                      </span>
                    )}
                    <span className={`text-[15px] font-semibold leading-snug ${
                      isClosed ? 'text-[#8896A3] line-through' : 'text-[#12181F]'
                    }`}>
                      {row.obstacle_type}
                    </span>
                  </div>

                  {/* meta */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-medium text-[#4B5563]">{row.branches?.name_th}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cat.badge}`}>
                      {row.category}
                    </span>
                    {row.due_date && (
                      <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-[#B3392C] font-medium' : 'text-[#4B5563]'}`}>
                        {overdue && <AlertCircle size={10} />}
                        กำหนด {formatThaiDate(row.due_date, true)}
                      </span>
                    )}
                    {isStale && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#A8721A]/10 border border-[#A8721A]/25 text-[#A8721A] flex items-center gap-1">
                        <Clock size={9} /> {staleDays}ว. ไม่มีอัพเดท
                      </span>
                    )}
                    {row.last_log_message && !isClosed && (
                      <span className="text-xs text-[#8896A3] italic truncate max-w-[220px]">
                        &quot;{row.last_log_message}&quot;
                      </span>
                    )}
                    {isClosed && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#1E7A5A]/10 border border-[#1E7A5A]/25 text-[#1E7A5A]">
                        ✓ ปิดแล้ว
                      </span>
                    )}
                  </div>
                </div>

                {/* right */}
                <div className="flex items-center gap-3 shrink-0">
                  {!isClosed && (
                    <div className="hidden sm:block w-24">
                      <ProgressMini value={row.progress_pct ?? 0} />
                    </div>
                  )}
                  <ChevronRight size={15} className="text-[#8896A3] group-hover:text-[#4B5563] transition-colors" />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Dialog ──────────────────────────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="w-[98vw] max-w-[1400px] bg-[#FFFFFF] border-[#EFF2F5] p-0 gap-0 max-h-[92vh] flex flex-col rounded-2xl overflow-hidden">
          {selected && (() => {
            const cat = getCat(selected.category)
            const pri = getPri(selected.priority_order)
            const isClosed = selected.status === 'ปิดประเด็น'
            return (
              <>
                {/* ── Colored top accent strip ──────────────────────────── */}
                <div
                  className="h-[3px] w-full shrink-0"
                  style={{ background: `linear-gradient(90deg, ${cat.accent}, transparent)` }}
                />

                {/* ── Header ───────────────────────────────────────────────── */}
                <div
                  className="px-7 pt-5 pb-5 border-b border-[#EFF2F5] shrink-0"
                  style={{
                    background: `radial-gradient(ellipse 60% 100% at 0% 50%, ${cat.accent}0D, transparent)`,
                  }}
                >
                  <div className="flex items-start gap-4 pr-8">
                    {/* category accent bar */}
                    <div
                      className="mt-1 w-1 h-12 rounded-full shrink-0"
                      style={{ background: cat.accent }}
                    />
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-2xl font-bold text-[#12181F] leading-snug">
                        {selected.obstacle_type}
                      </DialogTitle>
                      <p className="text-sm text-[#4B5563] mt-1 font-medium">{selected.branches?.name_th}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-3 pl-5">
                    <CodeBadge code={selected.code} />
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                      style={{ background: `${cat.accent}18`, borderColor: `${cat.accent}40`, color: cat.accent }}
                    >
                      {selected.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${pri.badge}`}>
                      {selected.priority_order === 1 ? '🔴' : '🟡'} {pri.label}
                    </span>
                    {selected.due_date && (
                      <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue(selected.due_date) ? 'text-[#B3392C]' : 'text-[#4B5563]'}`}>
                        {isOverdue(selected.due_date) && <AlertCircle size={11} />}
                        กำหนด {formatThaiDate(selected.due_date, true)}
                      </span>
                    )}
                    {isClosed && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#1E7A5A]/12 border border-[#1E7A5A]/30 text-[#1E7A5A]">
                        ✓ ปิดประเด็นแล้ว
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Body ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

                  {/* ซ้าย: รายละเอียด */}
                  <div className="sm:w-[36%] px-7 py-6 space-y-5 border-b sm:border-b-0 sm:border-r border-[#EFF2F5] overflow-y-auto">
                    <SectionLabel>รายละเอียด</SectionLabel>
                    <DetailRow label="รายละเอียดอุปสรรค"    value={selected.data_quality_impact} accent={cat.accent} />
                    <DetailRow label="ผลกระทบ / พื้นที่"    value={selected.area}                 accent={cat.accent} />
                    <DetailRow label="แนวทางการแก้ไข"       value={selected.resolution_plan}      accent={cat.accent} />
                    <DetailRow label="สิ่งที่ต้องการจากเขต" value={selected.region_support_needed} accent={cat.accent} />

                    {(selected.progress_pct ?? 0) > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-[#4B5563]">ความคืบหน้ารวม</p>
                        <ProgressMini value={selected.progress_pct ?? 0} />
                      </div>
                    )}

                    {canDelete && (
                      <div className="pt-3 border-t border-[#EFF2F5]">
                        {!confirmDelete ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#B3392C]/20 text-[#B3392C] text-sm font-semibold hover:bg-[#B3392C]/8 transition-colors"
                          >
                            <Trash2 size={13} /> ลบอุปสรรคนี้
                          </button>
                        ) : (
                          <div className="rounded-xl border border-[#B3392C]/30 bg-[#B3392C]/6 p-4 space-y-3">
                            <p className="text-sm text-[#B3392C] text-center font-bold">ยืนยันการลบ?</p>
                            <p className="text-xs text-[#4B5563] text-center">ไม่สามารถกู้คืนได้</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                disabled={deletePending}
                                className="flex-1 py-2 rounded-lg bg-black/5 text-[#4B5563] text-sm font-semibold hover:bg-black/8 disabled:opacity-40 transition-colors"
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deletePending}
                                className="flex-1 py-2 rounded-lg bg-[#B3392C] hover:bg-[#B3392C] text-[#12181F] text-sm font-bold disabled:opacity-40 transition-colors"
                              >
                                {deletePending ? 'กำลังลบ...' : 'ลบเลย'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ขวา: timeline + form */}
                  <div className="flex-1 flex flex-col min-h-0">

                    {/* Timeline */}
                    <div className="flex-1 px-7 py-6 overflow-y-auto space-y-4">
                      <SectionLabel>ความคืบหน้า</SectionLabel>
                      {logsLoading ? (
                        <p className="text-sm text-[#8896A3] py-4">กำลังโหลด...</p>
                      ) : (
                        <LogTimeline logs={logs} />
                      )}
                    </div>

                    {/* Add log */}
                    {!isClosed && (
                      <div className="px-7 py-5 border-t border-[#EFF2F5] space-y-3 shrink-0 bg-[#FFFFFF]">
                        {isRegion && (
                          <div className="flex gap-2">
                            {(['branch_update', 'region_note'] as const).map((t) => {
                              const s = ENTRY_STYLE[t]
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setEntryType(t)}
                                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    entryType === t ? s.badge : 'bg-black/4 border-[#EFF2F5] text-[#8896A3] hover:text-[#4B5563]'
                                  }`}
                                >
                                  {s.label}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={2}
                          placeholder="บันทึกความคืบหน้า เช่น ช่างลงพื้นที่แล้ว รอผลทดสอบ..."
                          className="w-full bg-[#FFFFFF] border border-[#EFF2F5] rounded-xl px-4 py-3 text-sm text-[#12181F] placeholder:text-[#8896A3] focus:outline-none focus:border-[#0B6E76]/50 resize-none"
                        />

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPct((v) => !v)}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              showPct ? 'text-[#0B6E76]' : 'text-[#8896A3] hover:text-[#4B5563]'
                            }`}
                          >
                            <SlidersHorizontal size={11} /> ระบุ %
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer ml-auto">
                            <input
                              type="checkbox"
                              checked={closingNow}
                              onChange={(e) => setClosingNow(e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-[#1E7A5A] cursor-pointer"
                            />
                            <span className={`text-xs font-semibold transition-colors ${closingNow ? 'text-[#1E7A5A]' : 'text-[#4B5563]'}`}>
                              ปิดประเด็น
                            </span>
                          </label>
                        </div>

                        {showPct && (
                          <div className="space-y-2 bg-[#FFFFFF] rounded-xl p-3 border border-[#EFF2F5]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#4B5563]">ความคืบหน้า</span>
                              <span className="text-sm font-bold num text-[#12181F]">{pct ?? 0}%</span>
                            </div>
                            <input
                              type="range" min={0} max={100} step={5}
                              value={pct ?? 0}
                              onChange={(e) => setPct(Number(e.target.value))}
                              className="w-full h-1 rounded-full appearance-none cursor-pointer accent-[#0B6E76]"
                            />
                            <div className="prog-bg">
                              <div
                                className={`prog-fill ${(pct ?? 0) >= 80 ? 'prog-good' : (pct ?? 0) >= 40 ? 'prog-warn' : 'prog-bad'}`}
                                style={{ width: `${pct ?? 0}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleSubmitLog}
                          disabled={pending || !message.trim()}
                          className="w-full py-3 font-bold text-sm rounded-xl disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-[#12181F]"
                          style={{
                            background: message.trim()
                              ? `linear-gradient(135deg, ${cat.accent}, ${cat.accent}cc)`
                              : undefined,
                            backgroundColor: !message.trim() ? '#EFF2F5' : undefined,
                          }}
                        >
                          <MessageSquarePlus size={14} />
                          {pending ? 'กำลังบันทึก...' : 'บันทึกความคืบหน้า'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
