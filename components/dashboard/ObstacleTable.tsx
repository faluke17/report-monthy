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
    accent: '#4782FF',
    glow:   'shadow-[0_0_24px_rgba(71,130,255,.10)]',
    badge:  'bg-[#4782FF]/12 border-[#4782FF]/30 text-[#93C5FD]',
    border: 'border-l-[#4782FF]',
  },
  DMA:  {
    accent: '#22D3EE',
    glow:   'shadow-[0_0_24px_rgba(34,211,238,.10)]',
    badge:  'bg-[#22D3EE]/12 border-[#22D3EE]/30 text-[#22D3EE]',
    border: 'border-l-[#22D3EE]',
  },
  P3:   {
    accent: '#A78BFA',
    glow:   'shadow-[0_0_24px_rgba(167,139,250,.10)]',
    badge:  'bg-[#A78BFA]/12 border-[#A78BFA]/30 text-[#A78BFA]',
    border: 'border-l-[#A78BFA]',
  },
  อื่นๆ: {
    accent: '#7B9CCC',
    glow:   '',
    badge:  'bg-white/5 border-white/15 text-[#7B9CCC]',
    border: 'border-l-[#3D5380]',
  },
}
function getCat(cat: string) { return CATEGORY_COLOR[cat] ?? CATEGORY_COLOR['อื่นๆ'] }

const PRIORITY_META: Record<number, { dot: string; badge: string; label: string; urgentGlow: string }> = {
  1: {
    dot:        'bg-[#F87171]',
    badge:      'bg-[#F87171]/12 border-[#F87171]/30 text-[#F87171]',
    label:      'เร่งด่วน',
    urgentGlow: 'shadow-[inset_0_0_0_1px_rgba(248,113,113,.12)]',
  },
  2: {
    dot:        'bg-[#FCD34D]/80',
    badge:      'bg-[#FCD34D]/10 border-[#FCD34D]/25 text-[#FCD34D]',
    label:      'ปกติ',
    urgentGlow: '',
  },
}
function getPri(order: number | null) { return PRIORITY_META[order ?? 2] ?? PRIORITY_META[2] }

const ENTRY_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  branch_update: { dot: 'bg-[#22D3EE]', badge: 'bg-[#22D3EE]/12 border-[#22D3EE]/30 text-[#22D3EE]', label: 'สาขา' },
  region_note:   { dot: 'bg-[#FCD34D]', badge: 'bg-[#FCD34D]/12 border-[#FCD34D]/30 text-[#FCD34D]', label: 'เขต'  },
  system:        { dot: 'bg-[#3D5380]', badge: 'bg-white/5 border-white/10 text-[#7B9CCC]',           label: 'ระบบ' },
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
    <p className="text-[10px] font-bold text-[#7B9CCC] uppercase tracking-[.18em] font-mono">
      {children}
    </p>
  )
}

function DetailRow({ label, value, accent }: { label: string; value?: string | null; accent?: string }) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-[#1E2E50] bg-[#0a1228] overflow-hidden">
      <div
        className="px-3.5 py-2 border-b border-[#1E2E50] flex items-center gap-2"
        style={{ background: accent ? `${accent}0D` : 'rgba(71,130,255,.04)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent ?? '#7B9CCC' }} />
        <p className="text-xs font-semibold text-[#E4ECFF]">{label}</p>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm text-[#E4ECFF] leading-relaxed whitespace-pre-wrap">{value}</p>
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
      <span className="text-xs text-[#7B9CCC] num w-7 text-right">{value}%</span>
    </div>
  )
}

function LogTimeline({ logs }: { logs: ObstacleProgressLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[#3D5380]">ยังไม่มีการอัพเดท</p>
      </div>
    )
  }
  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[#1E2E50]" />
      <div className="space-y-5">
        {logs.map((log, i) => {
          const s = ENTRY_STYLE[log.entry_type] ?? ENTRY_STYLE.system
          return (
            <div key={log.id} className="relative">
              <div className={`absolute -left-5 top-[5px] w-3.5 h-3.5 rounded-full border-[3px] border-[#070E22] ${s.dot}`} />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.badge}`}>
                    {s.label}
                  </span>
                  {i === 0 && !log.is_closed && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4782FF]/10 border border-[#4782FF]/25 text-[#93C5FD]">
                      ล่าสุด
                    </span>
                  )}
                  {log.is_closed && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#34D399]/12 border border-[#34D399]/30 text-[#34D399]">
                      ✓ ปิดประเด็น
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#E4ECFF] leading-relaxed">{log.message}</p>
                {log.progress_pct !== null && <ProgressMini value={log.progress_pct} />}
                <p className="text-[11px] text-[#3D5380]">
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
        <p className="text-sm text-[#3D5380]">ไม่มีอุปสรรคที่รอดำเนินการ</p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y divide-[#1E2E50]">
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
                isClosed ? 'border-l-[#1E2E50] opacity-60' : cat.border,
                isUrgent
                  ? 'hover:bg-[#F87171]/5 bg-[#F87171]/[.03]'
                  : 'hover:bg-[#4782FF]/5',
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
                      isClosed ? 'text-[#3D5380] line-through' : 'text-[#E4ECFF]'
                    }`}>
                      {row.obstacle_type}
                    </span>
                  </div>

                  {/* meta */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-medium text-[#7B9CCC]">{row.branches?.name_th}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cat.badge}`}>
                      {row.category}
                    </span>
                    {row.due_date && (
                      <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-[#F87171] font-medium' : 'text-[#7B9CCC]'}`}>
                        {overdue && <AlertCircle size={10} />}
                        กำหนด {formatThaiDate(row.due_date, true)}
                      </span>
                    )}
                    {isStale && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FCD34D]/10 border border-[#FCD34D]/25 text-[#FCD34D] flex items-center gap-1">
                        <Clock size={9} /> {staleDays}ว. ไม่มีอัพเดท
                      </span>
                    )}
                    {row.last_log_message && !isClosed && (
                      <span className="text-xs text-[#3D5380] italic truncate max-w-[220px]">
                        "{row.last_log_message}"
                      </span>
                    )}
                    {isClosed && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#34D399]/10 border border-[#34D399]/25 text-[#34D399]">
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
                  <ChevronRight size={15} className="text-[#3D5380] group-hover:text-[#7B9CCC] transition-colors" />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Dialog ──────────────────────────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="w-[98vw] max-w-[1400px] bg-[#070E22] border-[#1E2E50] p-0 gap-0 max-h-[92vh] flex flex-col rounded-2xl overflow-hidden">
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
                  className="px-7 pt-5 pb-5 border-b border-[#1E2E50] shrink-0"
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
                      <DialogTitle className="text-2xl font-bold text-[#E4ECFF] leading-snug">
                        {selected.obstacle_type}
                      </DialogTitle>
                      <p className="text-sm text-[#7B9CCC] mt-1 font-medium">{selected.branches?.name_th}</p>
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
                      <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue(selected.due_date) ? 'text-[#F87171]' : 'text-[#7B9CCC]'}`}>
                        {isOverdue(selected.due_date) && <AlertCircle size={11} />}
                        กำหนด {formatThaiDate(selected.due_date, true)}
                      </span>
                    )}
                    {isClosed && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#34D399]/12 border border-[#34D399]/30 text-[#34D399]">
                        ✓ ปิดประเด็นแล้ว
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Body ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

                  {/* ซ้าย: รายละเอียด */}
                  <div className="sm:w-[36%] px-7 py-6 space-y-5 border-b sm:border-b-0 sm:border-r border-[#1E2E50] overflow-y-auto">
                    <SectionLabel>รายละเอียด</SectionLabel>
                    <DetailRow label="รายละเอียดอุปสรรค"    value={selected.data_quality_impact} accent={cat.accent} />
                    <DetailRow label="ผลกระทบ / พื้นที่"    value={selected.area}                 accent={cat.accent} />
                    <DetailRow label="แนวทางการแก้ไข"       value={selected.resolution_plan}      accent={cat.accent} />
                    <DetailRow label="สิ่งที่ต้องการจากเขต" value={selected.region_support_needed} accent={cat.accent} />

                    {(selected.progress_pct ?? 0) > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-[#7B9CCC]">ความคืบหน้ารวม</p>
                        <ProgressMini value={selected.progress_pct ?? 0} />
                      </div>
                    )}

                    {canDelete && (
                      <div className="pt-3 border-t border-[#1E2E50]">
                        {!confirmDelete ? (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#F87171]/20 text-[#F87171] text-sm font-semibold hover:bg-[#F87171]/8 transition-colors"
                          >
                            <Trash2 size={13} /> ลบอุปสรรคนี้
                          </button>
                        ) : (
                          <div className="rounded-xl border border-[#F87171]/30 bg-[#F87171]/6 p-4 space-y-3">
                            <p className="text-sm text-[#F87171] text-center font-bold">ยืนยันการลบ?</p>
                            <p className="text-xs text-[#7B9CCC] text-center">ไม่สามารถกู้คืนได้</p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                disabled={deletePending}
                                className="flex-1 py-2 rounded-lg bg-white/5 text-[#7B9CCC] text-sm font-semibold hover:bg-white/8 disabled:opacity-40 transition-colors"
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deletePending}
                                className="flex-1 py-2 rounded-lg bg-[#F87171] hover:bg-[#f98585] text-white text-sm font-bold disabled:opacity-40 transition-colors"
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
                        <p className="text-sm text-[#3D5380] py-4">กำลังโหลด...</p>
                      ) : (
                        <LogTimeline logs={logs} />
                      )}
                    </div>

                    {/* Add log */}
                    {!isClosed && (
                      <div className="px-7 py-5 border-t border-[#1E2E50] space-y-3 shrink-0 bg-[#040A18]">
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
                                    entryType === t ? s.badge : 'bg-white/4 border-[#1E2E50] text-[#3D5380] hover:text-[#7B9CCC]'
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
                          className="w-full bg-[#0C1535] border border-[#1E2E50] rounded-xl px-4 py-3 text-sm text-[#E4ECFF] placeholder:text-[#3D5380] focus:outline-none focus:border-[#4782FF]/50 resize-none"
                        />

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPct((v) => !v)}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              showPct ? 'text-[#93C5FD]' : 'text-[#3D5380] hover:text-[#7B9CCC]'
                            }`}
                          >
                            <SlidersHorizontal size={11} /> ระบุ %
                          </button>
                          <label className="flex items-center gap-2 cursor-pointer ml-auto">
                            <input
                              type="checkbox"
                              checked={closingNow}
                              onChange={(e) => setClosingNow(e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-[#34D399] cursor-pointer"
                            />
                            <span className={`text-xs font-semibold transition-colors ${closingNow ? 'text-[#34D399]' : 'text-[#7B9CCC]'}`}>
                              ปิดประเด็น
                            </span>
                          </label>
                        </div>

                        {showPct && (
                          <div className="space-y-2 bg-[#0C1535] rounded-xl p-3 border border-[#1E2E50]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#7B9CCC]">ความคืบหน้า</span>
                              <span className="text-sm font-bold num text-[#E4ECFF]">{pct ?? 0}%</span>
                            </div>
                            <input
                              type="range" min={0} max={100} step={5}
                              value={pct ?? 0}
                              onChange={(e) => setPct(Number(e.target.value))}
                              className="w-full h-1 rounded-full appearance-none cursor-pointer accent-[#4782FF]"
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
                          className="w-full py-3 font-bold text-sm rounded-xl disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-white"
                          style={{
                            background: message.trim()
                              ? `linear-gradient(135deg, ${cat.accent}, ${cat.accent}cc)`
                              : undefined,
                            backgroundColor: !message.trim() ? '#1E2E50' : undefined,
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
