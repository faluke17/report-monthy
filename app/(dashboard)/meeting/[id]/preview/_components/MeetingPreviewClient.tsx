'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { closeMeeting, sendMeetingNotification } from '@/app/actions/meetings'
import { cn } from '@/lib/utils'
import type {
  Meeting,
  MeetingAgendaHeader,
  MeetingAgendaSubItem,
  MeetingResolution,
  Obstacle,
  NrwYoyRow,
} from '@/lib/types'
import { formatThaiDate, getThaiMonthName } from '@/lib/utils/date-th'
import { NrwYoyTable } from '@/components/dashboard/NrwYoyTable'
import { NrwYoyChart } from '@/components/dashboard/NrwYoyChart'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { StatusPill } from '@/components/shared/StatusPill'
import { ChevronLeft, Calendar, MapPin, Link2, FileText, CheckCircle2, AlertCircle, Clock, XCircle, Send } from 'lucide-react'

function SendNotificationButton({ meetingId, initialNotifiedAt }: { meetingId: string; initialNotifiedAt: string | null }) {
  const [notifiedAt, setNotifiedAt] = useState(initialNotifiedAt)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSend() {
    startTransition(async () => {
      const res = await sendMeetingNotification(meetingId)
      if (!res.success) { toast.error(res.error); return }
      if (res.data) setNotifiedAt(res.data.notified_at)
      setShowConfirm(false)
      toast.success('ส่งแจ้งเตือนไปยังสาขาเรียบร้อยแล้ว')
      router.refresh()
    })
  }

  if (notifiedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400/80 bg-emerald-500/8 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
        <Send size={11} />
        ส่งแจ้งเตือนแล้ว ·{' '}
        {new Date(notifiedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/10 transition-all"
      >
        <Send size={13} />
        ส่งแจ้งเตือนสาขา
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full space-y-4 border border-white/15">
            <div className="flex items-start gap-3">
              <Send size={20} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">ยืนยันส่งแจ้งเตือน?</p>
                <p className="text-xs text-white/55 leading-relaxed">
                  สาขาจะเห็นการประชุมนี้ในหน้า <strong className="text-white/80">การแจ้งเตือน</strong> ทันที<br />
                  และสามารถกดรับทราบได้
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-sm text-white/40 hover:text-white/70 px-4 py-2 rounded-lg border border-white/10 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSend}
                className="text-sm bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[#061327] font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {isPending ? 'กำลังส่ง...' : 'ยืนยัน ส่งแจ้งเตือน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function CloseMeetingButton({ meetingId }: { meetingId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClose() {
    startTransition(async () => {
      const res = await closeMeeting(meetingId)
      if (res.success) {
        const n = res.data?.pendingCount ?? 0
        toast.success(
          n > 0
            ? `ปิดการประชุมเรียบร้อย · มีมติค้างอยู่ ${n} รายการ จะ carry-over ไปประชุมครั้งถัดไป`
            : 'ปิดการประชุมเรียบร้อย ไม่มีมติค้างอยู่'
        )
        setShowConfirm(false)
        router.push('/meeting')
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
      >
        <CheckCircle2 size={13} />
        ปิดการประชุม
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-sm w-full space-y-4 border border-white/15">
            <div className="flex items-start gap-3">
              <XCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">ยืนยันปิดการประชุม?</p>
                <p className="text-xs text-white/55 leading-relaxed">
                  การประชุมจะถูกเปลี่ยนสถานะเป็น <strong className="text-white/80">เสร็จสิ้น</strong><br />
                  มติ/ข้อสั่งการที่ยังค้างอยู่จะถูก carry-over ไปยังการประชุมครั้งถัดไปโดยอัตโนมัติ
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-sm text-white/40 hover:text-white/70 px-4 py-2 rounded-lg border border-white/10 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleClose}
                className="text-sm bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#061327] font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {isPending ? 'กำลังปิด...' : 'ยืนยัน ปิดการประชุม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const BRANCH_ORDER = [
  'นครสวรรค์', 'ท่าตะโก', 'ลาดยาว', 'พยุหะคีรี',
  'ชัยนาท', 'อุทัยธานี', 'กำแพงเพชร', 'ขาณุวรลักษบุรี',
  'ตาก', 'แม่สอด', 'สุโขทัย', 'ทุ่งเสลี่ยม',
  'ศรีสำโรง', 'สวรรคโลก', 'ศรีสัชนาลัย', 'อุตรดิตถ์',
  'พิษณุโลก', 'นครไทย', 'พิจิตร', 'บางมูลนาก',
  'ตะพานหิน', 'เพชรบูรณ์', 'หล่มสัก', 'ชนแดน',
  'หนองไผ่', 'วิเชียรบุรี',
]

function monthToCount(m: number): number {
  return m >= 10 ? m - 9 : m + 3
}
function monthCountToTarget(n: number): number {
  return n <= 3 ? 9 + n : n - 3
}
function getFiscalMonths(targetMonth: number): number[] {
  if (targetMonth >= 10) return Array.from({ length: targetMonth - 10 + 1 }, (_, i) => i + 10)
  return [...[10, 11, 12], ...Array.from({ length: targetMonth }, (_, i) => i + 1)]
}
function aggregateNrw(rows: any[], months: Set<number>) {
  const map = new Map<string, { produced: number; loss: number }>()
  for (const row of rows) {
    if (!months.has(row.month)) continue
    const loss = Math.max(
      0,
      (row.water_produced ?? 0) - (row.water_sold ?? 0) -
      (row.water_free ?? 0) - (row.blow_off ?? 0)
    )
    const prev = map.get(row.branch_name) ?? { produced: 0, loss: 0 }
    map.set(row.branch_name, {
      produced: prev.produced + (row.water_produced ?? 0),
      loss: prev.loss + loss,
    })
  }
  return map
}
function computeYoyRows(currRaw: any[], prevRaw: any[], monthCount: number): NrwYoyRow[] {
  const target = monthCountToTarget(monthCount)
  const months = new Set(getFiscalMonths(target))
  const curr = aggregateNrw(currRaw, months)
  const prev = aggregateNrw(prevRaw, months)
  return BRANCH_ORDER.map((name) => {
    const c = curr.get(name)
    const p = prev.get(name)
    const curr_rate = c && c.produced > 0 ? (c.loss / c.produced) * 100 : null
    const prev_rate = p && p.produced > 0 ? (p.loss / p.produced) * 100 : null
    return {
      branch_name: name,
      curr_loss: c?.loss ?? null,
      curr_rate,
      curr_produced: c?.produced ?? null,
      prev_loss: p?.loss ?? null,
      prev_rate,
      prev_produced: p?.produced ?? null,
      loss_delta: c && p ? c.loss - p.loss : null,
      rate_delta: curr_rate !== null && prev_rate !== null ? curr_rate - prev_rate : null,
    }
  }).sort((a, b) => {
    if (a.rate_delta === null && b.rate_delta === null) return 0
    if (a.rate_delta === null) return 1
    if (b.rate_delta === null) return -1
    return a.rate_delta - b.rate_delta
  })
}
type AgendaTab = 1 | 2 | 3 | 4 | 5 | 6

const OBSTACLE_STATUS_COLOR: Record<string, string> = {
  'รายงานใหม่':   'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  'ระหว่างแก้':   'text-amber-400 bg-amber-500/15 border-amber-500/30',
  'รอสนับสนุน':   'text-violet-400 bg-violet-500/15 border-violet-500/30',
  'ล่าช้า':        'text-orange-400 bg-orange-500/15 border-orange-500/30',
  'เกินกำหนด':    'text-red-400 bg-red-500/15 border-red-500/30',
}

const CATEGORY_COLOR: Record<string, string> = {
  'MM':   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'DMA':  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'P3':   'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'อื่นๆ': 'bg-white/10 text-white/50 border-white/20',
}

// ─── sub-components ──────────────────────────────────────────────────────────

function AgendaBadge({ no }: { no: number }) {
  const colors = [
    '', // 0 unused
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'bg-green-500/20 text-green-300 border-green-500/30',
    'bg-white/15 text-white/60 border-white/25',
  ]
  return (
    <span className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${colors[no] ?? colors[6]}`}>
      {no}
    </span>
  )
}

function ResolutionBadge({ type, detail }: { type: string; detail: string | null }) {
  if (type === 'รับทราบ') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg w-fit">
        <CheckCircle2 size={12} />
        มติ: รับทราบ
      </div>
    )
  }
  return (
    <div className="text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
      {detail || 'มติ: อื่นๆ'}
    </div>
  )
}

function SubItemCard({ item }: { item: MeetingAgendaSubItem }) {
  return (
    <div className="glass-card-sm p-4 space-y-2">
      <div className="flex items-start gap-2">
        <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50 font-bold mt-0.5">
          {item.item_no}
        </span>
        <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
      </div>
      {item.detail && (
        <p className="text-xs text-white/55 leading-relaxed pl-7">{item.detail}</p>
      )}
      {item.detail_table && item.detail_table.rows.length > 0 && (
        <div className="pl-7 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white/5">
                {item.detail_table.headers.map((h, i) => (
                  <th key={i} className="text-left px-2 py-1.5 text-white/40 font-medium border border-white/8">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.detail_table.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-white/3">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 text-white/70 border border-white/8">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {item.resolution && (
        <div className="pl-7">
          <ResolutionBadge type={item.resolution} detail={item.resolution_detail} />
        </div>
      )}
    </div>
  )
}

function ObstacleCard({ obs }: { obs: Obstacle }) {
  const pct = obs.progress_pct ?? 0
  const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
  const statusClass = OBSTACLE_STATUS_COLOR[obs.status] ?? 'text-white/40 bg-white/5 border-white/15'
  const catClass = CATEGORY_COLOR[obs.category] ?? 'bg-white/10 text-white/40 border-white/15'

  return (
    <div className="glass-card-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catClass}`}>{obs.category}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusClass}`}>{obs.status}</span>
          </div>
          <p className="text-sm font-semibold text-white leading-snug">{obs.obstacle_type}</p>
          {obs.area && <p className="text-xs text-white/40">{obs.area}</p>}
        </div>
        <span className="num text-lg font-bold text-white/70 shrink-0">{pct}%</span>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-white/30">ความคืบหน้า</p>
      </div>

      {obs.resolution_plan && (
        <div className="border-t border-white/8 pt-2">
          <p className="text-[10px] text-white/30 mb-0.5">แนวทางแก้ไข</p>
          <p className="text-xs text-white/60 leading-relaxed">{obs.resolution_plan}</p>
        </div>
      )}

      {obs.region_support_needed && (
        <div className="flex items-start gap-1.5 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
          <AlertCircle size={11} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300/80 leading-relaxed">{obs.region_support_needed}</p>
        </div>
      )}

      {obs.due_date && (
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <Clock size={10} />
          กำหนด {formatThaiDate(obs.due_date, true)}
        </div>
      )}
    </div>
  )
}

// ─── main props ───────────────────────────────────────────────────────────────

interface Props {
  meeting: Meeting
  agendaHeader: MeetingAgendaHeader | null
  agendaSubitems: MeetingAgendaSubItem[]
  prevMeeting: Meeting | null
  prevResolutions: MeetingResolution[]
  obstacles: Obstacle[]
  nrwCurrRaw: any[]
  nrwPrevRaw: any[]
  nrwFiscalYear: number
  nrwMonth: number
}

export function MeetingPreviewClient({
  meeting,
  agendaHeader,
  agendaSubitems,
  prevMeeting,
  prevResolutions,
  obstacles,
  nrwCurrRaw,
  nrwPrevRaw,
  nrwFiscalYear,
  nrwMonth,
}: Props) {
  const [activeTab, setActiveTab] = useState<AgendaTab>(1)
  const [selectedBranch, setSelectedBranch] = useState<string>('') // '' = all
  const [selectedMonths, setSelectedMonths] = useState(() => monthToCount(nrwMonth))

  const agenda4Label = agendaHeader?.agenda4_type ?? 'เรื่องสืบเนื่อง'
  const hasAgenda6 = agenda4Label === 'เรื่องสืบเนื่อง'

  // Group obstacles by branch name for quick lookup
  const obstaclesByBranch = useMemo(() => {
    const map = new Map<string, Obstacle[]>()
    for (const obs of obstacles) {
      const name = obs.branches?.name_th ?? 'ไม่ระบุ'
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(obs)
    }
    return map
  }, [obstacles])

  // Branches sorted by PWA_BRANCHES order, with obstacle counts
  const branchList = useMemo(() => {
    return PWA_BRANCHES.map((b) => ({
      name: b.name_th,
      count: obstaclesByBranch.get(b.name_th)?.length ?? 0,
    }))
  }, [obstaclesByBranch])

  const visibleObstacles = useMemo(() => {
    if (!selectedBranch) return obstacles
    return obstaclesByBranch.get(selectedBranch) ?? []
  }, [selectedBranch, obstacles, obstaclesByBranch])

  const items = (no: number) => agendaSubitems.filter((s) => s.agenda_no === no)

  const nrwYoyRows = useMemo(
    () => computeYoyRows(nrwCurrRaw, nrwPrevRaw, selectedMonths),
    [nrwCurrRaw, nrwPrevRaw, selectedMonths]
  )

  const TABS: { key: AgendaTab; label: string }[] = [
    { key: 1, label: 'วาระ 1' },
    { key: 2, label: 'วาระ 2' },
    { key: 3, label: 'วาระ 3' },
    { key: 4, label: 'วาระ 4' },
    { key: 5, label: 'วาระ 5' },
    ...(hasAgenda6 ? [{ key: 6 as AgendaTab, label: 'วาระ 6' }] : []),
  ]

  return (
    <div className="space-y-5 animate-fadein">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href={`/meeting`}
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          วาระ / มติ
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/60">ตรวจสอบวาระ</span>
      </div>

      {/* Meeting Header */}
      <div className="glass-card p-5 sm:p-6 accent-bar-cyan">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Left: title + meta */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="page-kicker mb-1">ดูตัวอย่างวาระการประชุม</p>
              <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">{meeting.title}</h1>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-white/30" />
                {formatThaiDate(meeting.scheduled_date)} · {meeting.scheduled_time.slice(0, 5)} น.
              </div>
              {meeting.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-white/30" />
                  {meeting.location}
                </div>
              )}
              {meeting.meeting_link && (
                <a
                  href={meeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 max-w-xs truncate"
                >
                  <Link2 size={13} />
                  {meeting.meeting_link}
                </a>
              )}
            </div>
          </div>
          {/* Right: status + action */}
          <div className="flex lg:flex-col items-center lg:items-end gap-3 shrink-0">
            <StatusPill status={meeting.status} />
            <Link
              href={`/meeting/${meeting.id}/agenda`}
              className="text-sm text-white/50 hover:text-white/80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-all"
            >
              <FileText size={13} />
              แก้ไขวาระ
            </Link>
            {meeting.status !== 'เสร็จสิ้น' && meeting.status !== 'ยกเลิก' && (
              <SendNotificationButton meetingId={meeting.id} initialNotifiedAt={meeting.notified_at} />
            )}
            {meeting.status !== 'เสร็จสิ้น' && meeting.status !== 'ยกเลิก' && (
              <CloseMeetingButton meetingId={meeting.id} />
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/8">
          <p className="text-xs text-white/30">
            {agendaHeader ? `${TABS.length} วาระ · กรอกข้อมูลแล้ว` : 'ยังไม่ได้กรอกวาระ'}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 border-b border-white/10 pb-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeTab === t.key
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ วาระ 1 ══ */}
      {activeTab === 1 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AgendaBadge no={1} />
            <div>
              <p className="font-bold text-white">ประธานแจ้งที่ประชุมทราบ</p>
              <p className="text-xs text-white/40 mt-0.5">วาระที่ 1</p>
            </div>
          </div>

          {agendaHeader?.agenda1_detail ? (
            <div className="glass-card-sm p-4 space-y-3">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {agendaHeader.agenda1_detail}
              </p>
              <div className="border-t border-white/8 pt-3">
                <ResolutionBadge
                  type={agendaHeader.agenda1_resolution ?? 'รับทราบ'}
                  detail={agendaHeader.agenda1_resolution_detail}
                />
              </div>
            </div>
          ) : (
            <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
              ยังไม่ได้กรอกรายละเอียดวาระที่ 1
            </div>
          )}
        </div>
      )}

      {/* ══ วาระ 2 ══ */}
      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AgendaBadge no={2} />
            <div>
              <p className="font-bold text-white">
                รับรองรายงานการประชุม
                {agendaHeader?.agenda2_meeting_no && (
                  <span className="text-white/60"> ครั้งที่ {agendaHeader.agenda2_meeting_no}</span>
                )}
              </p>
              <p className="text-xs text-white/40 mt-0.5">วาระที่ 2</p>
            </div>
          </div>

          {prevMeeting ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Calendar size={12} className="text-white/30" />
                <p className="text-xs text-white/40">
                  รายงานจาก: <span className="text-white/60">{prevMeeting.title}</span>
                  {' '}· {formatThaiDate(prevMeeting.scheduled_date)}
                </p>
              </div>

              {prevResolutions.length === 0 ? (
                <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
                  ไม่มีมติบันทึกไว้จากการประชุมครั้งก่อน
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {prevResolutions.map((r) => {
                    const done = r.status === 'แล้วเสร็จ' || r.status === 'ปิดประเด็น'
                    return (
                      <div
                        key={r.id}
                        className={cn('glass-card-sm p-4 space-y-2', done && 'opacity-50')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="num text-xs font-bold text-cyan-400 shrink-0 mt-0.5">
                              #{r.sequence_no}
                            </span>
                            <div className="min-w-0 space-y-1">
                              <p className="text-sm text-white font-medium leading-snug">{r.title}</p>
                              {r.detail && (
                                <p className="text-xs text-white/50 leading-relaxed">{r.detail}</p>
                              )}
                            </div>
                          </div>
                          <StatusPill status={r.status} />
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-white/35 pl-5">
                          {r.responsible_branch && <span>สาขา: {r.responsible_branch}</span>}
                          {r.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {formatThaiDate(r.due_date, true)}
                            </span>
                          )}
                          {r.progress_pct > 0 && (
                            <span className="text-amber-400">{r.progress_pct}%</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {agendaHeader && (
                <div className="pt-1">
                  <ResolutionBadge
                    type={agendaHeader.agenda2_resolution ?? 'รับทราบ'}
                    detail={agendaHeader.agenda2_resolution_detail}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
              ไม่พบรายงานการประชุมครั้งก่อน
            </div>
          )}
        </div>
      )}

      {/* ══ วาระ 3 ══ */}
      {activeTab === 3 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AgendaBadge no={3} />
            <div>
              <p className="font-bold text-white">เรื่องเพื่อทราบ</p>
              <p className="text-xs text-white/40 mt-0.5">วาระที่ 3</p>
            </div>
          </div>

          {items(3).length === 0 ? (
            <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
              ยังไม่มีรายการเรื่องเพื่อทราบ
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items(3).map((item) => <SubItemCard key={item.id ?? item.item_no} item={item} />)}
            </div>
          )}

          {/* NRW YoY Comparison */}
          {(() => {
            const hasAnyData = nrwCurrRaw.length > 0 || nrwPrevRaw.length > 0
            if (!hasAnyData) return null

            const prevYear = nrwFiscalYear - 1
            const targetMonth = monthCountToTarget(selectedMonths)
            const startMonthLabel = `${getThaiMonthName(10, true)}${prevYear % 100}`
            const endMonthLabel = `${getThaiMonthName(targetMonth, true)}${targetMonth >= 10 ? prevYear % 100 : nrwFiscalYear % 100}`

            // District-level averages from computed rows
            const totCurrLoss = nrwYoyRows.reduce((s, r) => s + (r.curr_loss ?? 0), 0)
            const totPrevLoss = nrwYoyRows.reduce((s, r) => s + (r.prev_loss ?? 0), 0)
            const totCurrProd = nrwYoyRows.reduce((s, r) => s + (r.curr_produced ?? 0), 0)
            const totPrevProd = nrwYoyRows.reduce((s, r) => s + (r.prev_produced ?? 0), 0)
            const distCurrRate = totCurrProd > 0 ? (totCurrLoss / totCurrProd) * 100 : null
            const distPrevRate = totPrevProd > 0 ? (totPrevLoss / totPrevProd) * 100 : null
            const distDelta = distCurrRate !== null && distPrevRate !== null ? distCurrRate - distPrevRate : null
            const improvedCount = nrwYoyRows.filter((r) => (r.rate_delta ?? 0) < -0.001).length
            const worsenedCount = nrwYoyRows.filter((r) => (r.rate_delta ?? 0) > 0.001).length

            return (
              <div className="space-y-5 pt-3 border-t border-white/8">
                {/* Section header + filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-400" style={{ boxShadow: '0 0 8px rgba(167,139,250,0.5)' }} />
                      <p className="text-sm font-bold text-white">
                        เปรียบเทียบน้ำสูญเสีย ปีงบ {prevYear} vs {nrwFiscalYear}
                      </p>
                    </div>
                    <span className="text-[10px] text-white/40 px-2.5 py-1 rounded-full border border-white/12 bg-white/4 font-medium">
                      {startMonthLabel} – {endMonthLabel}
                    </span>
                  </div>

                  {/* Month count filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-white/30 shrink-0">สะสม</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => setSelectedMonths(n)}
                          className={cn(
                            'num text-[11px] w-7 h-6 rounded-md border transition-all font-medium',
                            selectedMonths === n
                              ? 'bg-violet-500/25 text-violet-300 border-violet-500/50 shadow-[0_0_6px_rgba(167,139,250,0.2)]'
                              : 'text-white/30 border-white/10 hover:border-white/25 hover:text-white/60'
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-white/30 shrink-0">เดือน</span>
                  </div>
                </div>

                {/* Summary stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Prev year rate */}
                  <div className="glass-card-sm p-4 sm:p-5 space-y-2 border border-blue-500/15">
                    <p className="text-xs text-blue-400/60 font-medium">NRW% เขต ปีงบ {prevYear}</p>
                    <p className="num text-3xl sm:text-4xl font-bold text-blue-300 leading-none">
                      {distPrevRate !== null ? distPrevRate.toFixed(2) : '—'}
                      <span className="text-base font-normal text-blue-300/50 ml-1">%</span>
                    </p>
                  </div>
                  {/* Curr year rate */}
                  <div className="glass-card-sm p-4 sm:p-5 space-y-2 border border-orange-500/15">
                    <p className="text-xs text-orange-400/70 font-medium">NRW% เขต ปีงบ {nrwFiscalYear}</p>
                    <p className="num text-3xl sm:text-4xl font-bold text-orange-300 leading-none">
                      {distCurrRate !== null ? distCurrRate.toFixed(2) : '—'}
                      <span className="text-base font-normal text-orange-300/50 ml-1">%</span>
                    </p>
                  </div>
                  {/* Delta */}
                  <div className={cn(
                    'glass-card-sm p-4 sm:p-5 space-y-2',
                    distDelta !== null && distDelta < 0
                      ? 'border border-emerald-500/20'
                      : distDelta !== null && distDelta > 0
                      ? 'border border-red-500/20'
                      : 'border border-white/8'
                  )}>
                    <p className="text-xs text-white/40 font-medium">เปลี่ยนแปลง NRW%</p>
                    {distDelta !== null ? (
                      <p className={cn(
                        'num text-3xl sm:text-4xl font-bold leading-none',
                        distDelta < 0 ? 'text-emerald-400' : distDelta > 0 ? 'text-red-400' : 'text-white/50'
                      )}>
                        {distDelta < 0 ? '▼' : distDelta > 0 ? '▲' : ''}
                        {' '}{Math.abs(distDelta).toFixed(2)}
                        <span className="text-base font-normal ml-1 opacity-60">%</span>
                      </p>
                    ) : (
                      <p className="num text-3xl sm:text-4xl font-bold text-white/20 leading-none">—</p>
                    )}
                  </div>
                  {/* Branch counts */}
                  <div className="glass-card-sm p-4 sm:p-5 space-y-2 border border-violet-500/15">
                    <p className="text-xs text-violet-400/60 font-medium">ผลงานรายสาขา</p>
                    <div className="flex items-baseline gap-2">
                      <span className="num text-3xl sm:text-4xl font-bold text-emerald-400 leading-none">{improvedCount}</span>
                      <span className="text-xs text-emerald-400/60">ดีขึ้น</span>
                      <span className="text-white/15 mx-1">/</span>
                      <span className="num text-3xl sm:text-4xl font-bold text-red-400 leading-none">{worsenedCount}</span>
                      <span className="text-xs text-red-400/60">แย่ลง</span>
                    </div>
                  </div>
                </div>

                {/* Chart + Table — side by side on large screens */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                  <NrwYoyChart rows={nrwYoyRows} fiscalYear={nrwFiscalYear} />
                  <NrwYoyTable rows={nrwYoyRows} fiscalYear={nrwFiscalYear} monthCount={selectedMonths} />
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ══ วาระ 4: สืบเนื่อง / อุปสรรค ══ */}
      {activeTab === 4 && (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <AgendaBadge no={4} />
            <div>
              <p className="font-bold text-white">{agenda4Label}</p>
              <p className="text-xs text-white/40 mt-0.5">วาระที่ 4 · อุปสรรคและการติดตาม</p>
            </div>
          </div>

          {/* Agenda sub-items from form (if any) */}
          {items(4).length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">รายการในวาระ</p>
              {items(4).map((item) => <SubItemCard key={item.id ?? item.item_no} item={item} />)}
            </div>
          )}

          {/* Branch obstacle browser */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                อุปสรรคตามสาขา
              </p>
              <span className="text-[10px] text-white/25">{obstacles.length} รายการทั้งหมด</span>
            </div>

            {/* Branch selector */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedBranch('')}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-all',
                  selectedBranch === ''
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    : 'text-white/40 border-white/15 hover:border-white/30 hover:text-white/60'
                )}
              >
                ทั้งหมด
                <span className="ml-1.5 num opacity-60">{obstacles.length}</span>
              </button>

              {branchList.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setSelectedBranch(b.name)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-all',
                    selectedBranch === b.name
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : b.count > 0
                      ? 'text-white/60 border-white/20 hover:border-white/40 hover:text-white/80'
                      : 'text-white/20 border-white/8 hover:text-white/35'
                  )}
                >
                  {b.name}
                  {b.count > 0 && (
                    <span className={cn(
                      'ml-1.5 num',
                      selectedBranch === b.name ? 'opacity-100' : 'opacity-50'
                    )}>
                      {b.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Obstacles list */}
            {visibleObstacles.length === 0 ? (
              <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
                {selectedBranch ? `สาขา${selectedBranch}ไม่มีอุปสรรคที่เปิดอยู่` : 'ไม่มีอุปสรรคที่เปิดอยู่'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {visibleObstacles.map((obs) => (
                  <div key={obs.id} className="space-y-1">
                    {!selectedBranch && obs.branches?.name_th && (
                      <p className="text-[10px] text-white/30 px-1 font-medium">
                        สาขา{obs.branches.name_th}
                      </p>
                    )}
                    <ObstacleCard obs={obs} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ วาระ 5 ══ */}
      {activeTab === 5 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AgendaBadge no={5} />
            <div>
              <p className="font-bold text-white">
                {hasAgenda6 ? 'ผลการดำเนินการ / PDCA' : 'เรื่องอื่นๆ'}
              </p>
              <p className="text-xs text-white/40 mt-0.5">วาระที่ 5</p>
            </div>
          </div>

          {items(5).length === 0 ? (
            <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
              ยังไม่มีรายการในวาระที่ 5
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items(5).map((item) => <SubItemCard key={item.id ?? item.item_no} item={item} />)}
            </div>
          )}
        </div>
      )}

      {/* ══ วาระ 6 ══ */}
      {activeTab === 6 && hasAgenda6 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AgendaBadge no={6} />
            <div>
              <p className="font-bold text-white">เรื่องอื่นๆ</p>
              <p className="text-xs text-white/40 mt-0.5">วาระที่ 6</p>
            </div>
          </div>

          {items(6).length === 0 ? (
            <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
              ยังไม่มีรายการในวาระที่ 6
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items(6).map((item) => <SubItemCard key={item.id ?? item.item_no} item={item} />)}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
