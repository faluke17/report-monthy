'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { closeMeeting, sendMeetingNotification } from '@/app/actions/meetings'
import { updatePdcaRef } from '@/app/actions/meeting-pre-agenda'
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
import { ChevronLeft, Calendar, MapPin, Link2, FileText, CheckCircle2, AlertCircle, Clock, XCircle, Send, Brain, X, TriangleAlert, Pencil, Check } from 'lucide-react'

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

interface PdcaSummaryRow {
  branch_name: string
  pdca_do: string | null
  pdca_act: string | null
  report_month: number
  report_year: number
  volume_distributed: number | null
  volume_sold: number | null
  mnf_latest: number | null
  mnf_factor: number | null
  nrw_pct: number | null
  leaks_found: number
  leaks_repaired: number
  leaks_pending: number
  leaks_repeat: number
  meters_abnormal: number
}

interface PdcaPrevRow {
  branch_name: string
  volume_distributed: number | null
  volume_sold: number | null
  mnf_latest: number | null
  nrw_pct: number | null
}

interface PdcaAreaRow {
  branch_name: string
  area_name: string
  pdca_do: string | null
  pdca_act: string | null
  report_month: number
  report_year: number
  water_dist_before: number | null
  water_sold_before: number | null
  mnf_before: number | null
  water_dist_after: number | null
  water_sold_after: number | null
  mnf_after: number | null
  leaks_repaired: number
  leaks_pending: number
  step_tests: Array<{
    step_no: number
    estimated_loss: number | null
    leaks_found: number
    leaks_repaired: number | null
  }>
}

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const THAI_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

// ─── Modal helper sub-components ─────────────────────────────────────────────

function ModalSectionLabel({ children, accent }: { children: React.ReactNode; accent?: 'amber' }) {
  const color = accent === 'amber' ? 'rgba(251,191,36,.75)' : 'rgba(255,255,255,.55)'
  const barColor = accent === 'amber' ? 'rgba(251,191,36,.85)' : 'rgba(255,255,255,.45)'
  return (
    <p style={{ fontSize: '11px', fontWeight: 700, color, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'block', width: '3px', height: '13px', borderRadius: '2px', background: barColor, flexShrink: 0 }} />
      {children}
    </p>
  )
}

function ModalStatCard({ label, color, value, unit, sub, delta }: {
  label: string; color: string; value: string; unit?: string; sub?: string; delta?: React.ReactNode
}) {
  const palette: Record<string, { border: string; bg: string; val: string; glow: string }> = {
    blue:   { border: 'rgba(56,189,248,.3)',  bg: 'rgba(56,189,248,.07)',  val: '#38bdf8', glow: 'rgba(56,189,248,.22)' },
    indigo: { border: 'rgba(129,140,248,.28)',bg: 'rgba(129,140,248,.07)', val: '#818cf8', glow: 'rgba(129,140,248,.2)' },
    amber:  { border: 'rgba(251,191,36,.3)',  bg: 'rgba(251,191,36,.07)',  val: '#fbbf24', glow: 'rgba(251,191,36,.22)' },
    red:    { border: 'rgba(248,113,113,.3)', bg: 'rgba(248,113,113,.07)', val: '#f87171', glow: 'rgba(248,113,113,.22)' },
    green:  { border: 'rgba(52,211,153,.28)', bg: 'rgba(52,211,153,.07)',  val: '#34d399', glow: 'rgba(52,211,153,.2)' },
    violet: { border: 'rgba(167,139,250,.28)',bg: 'rgba(167,139,250,.07)', val: '#a78bfa', glow: 'rgba(167,139,250,.2)' },
  }
  const p = palette[color] ?? { border: 'rgba(255,255,255,.1)', bg: 'rgba(255,255,255,.03)', val: '#fff', glow: 'transparent' }
  return (
    <div style={{ borderRadius: '12px', border: `1px solid ${p.border}`, background: p.bg, padding: '12px 14px' }}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.55)', letterSpacing: '.04em', fontWeight: 600, marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1, color: p.val, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 14px ${p.glow}` }}>
        {value}
        {unit && <span style={{ fontSize: '11px', fontWeight: 400, opacity: .6, marginLeft: '3px' }}>{unit}</span>}
      </div>
      {(delta || sub) && (
        <div style={{ fontSize: '11px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px', color: 'rgba(255,255,255,.42)' }}>
          {delta ?? sub}
        </div>
      )}
    </div>
  )
}

function ModalLeakCard({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.03)', padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums', marginBottom: '6px' }}>{val}</div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.52)', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function ModalPdcaBlock({ icon, label, sub, color, text }: {
  icon: string; label: string; sub: string; color: 'blue' | 'emerald'; text: string | null | undefined
}) {
  const p = color === 'blue'
    ? { border: 'rgba(59,130,246,.22)', headBg: 'rgba(59,130,246,.07)', iconBg: 'linear-gradient(135deg,rgba(59,130,246,.38),rgba(59,130,246,.16))', iconBorder: 'rgba(59,130,246,.45)', iconColor: '#93c5fd', iconGlow: 'rgba(59,130,246,.25)', labelColor: '#93c5fd' }
    : { border: 'rgba(16,185,129,.2)', headBg: 'rgba(16,185,129,.06)', iconBg: 'linear-gradient(135deg,rgba(16,185,129,.35),rgba(16,185,129,.14))', iconBorder: 'rgba(16,185,129,.4)', iconColor: '#6ee7b7', iconGlow: 'rgba(16,185,129,.22)', labelColor: '#6ee7b7' }
  return (
    <div style={{ borderRadius: '16px', border: `1px solid ${p.border}`, background: 'rgba(255,255,255,.02)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 18px', background: p.headBg, borderBottom: `1px solid ${p.border}` }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, flexShrink: 0, background: p.iconBg, color: p.iconColor, border: `1px solid ${p.iconBorder}`, boxShadow: `0 0 14px ${p.iconGlow}` }}>{icon}</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: p.labelColor, letterSpacing: '-.15px' }}>{label}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.45)', marginTop: '3px' }}>{sub}</div>
        </div>
      </div>
      {text
        ? <div style={{ padding: '18px', fontSize: '14px', lineHeight: 1.9, color: 'rgba(255,255,255,.85)', whiteSpace: 'pre-wrap' }}>{text}</div>
        : <div style={{ padding: '22px 18px', fontSize: '13px', color: 'rgba(255,255,255,.28)', fontStyle: 'italic', textAlign: 'center' }}>— ไม่ได้กรอก —</div>
      }
    </div>
  )
}

function TrendCard({
  label, unit, beforeStr, afterStr, delta, lowerBetter, borderColor, accentColor,
}: {
  label: string; unit?: string
  beforeStr: string | null; afterStr: string | null; delta: number | null
  lowerBetter?: boolean; borderColor: string; accentColor: string
}) {
  const isGood = delta != null && (lowerBetter ? delta < 0 : delta > 0)
  const isBad  = delta != null && (lowerBetter ? delta > 0 : delta < 0)
  const deltaColor = isGood ? '#34d399' : isBad ? '#f87171' : 'rgba(255,255,255,.3)'
  const deltaBg    = isGood ? 'rgba(52,211,153,.1)' : isBad ? 'rgba(248,113,113,.1)' : 'rgba(255,255,255,.05)'
  const deltaBorder= isGood ? 'rgba(52,211,153,.28)' : isBad ? 'rgba(248,113,113,.28)' : 'rgba(255,255,255,.12)'
  const sign = delta != null ? (delta < 0 ? '▼' : '▲') : null
  return (
    <div style={{ borderRadius: '16px', border: `1px solid ${borderColor}`, background: 'linear-gradient(160deg,rgba(255,255,255,.025) 0%,rgba(255,255,255,.008) 100%)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '11px 15px 0', fontSize: '11px', fontWeight: 700, color: accentColor, letterSpacing: '.05em', textTransform: 'uppercase' }}>
        {label}{unit && <span style={{ fontWeight: 400, opacity: .6, marginLeft: '4px', fontSize: '10px' }}>({unit})</span>}
      </div>
      <div style={{ padding: '10px 15px 15px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.38)', width: '26px', flexShrink: 0 }}>ก่อน</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,.52)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{beforeStr ?? '—'}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)', lineHeight: 1, margin: '3px 0 3px 26px' }}>↓</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.38)', width: '26px', flexShrink: 0 }}>หลัง</span>
          <span style={{ fontSize: '24px', fontWeight: 900, color: accentColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{afterStr ?? '—'}</span>
        </div>
        {delta != null && Math.abs(delta) >= 0.005 && sign && (
          <div style={{ marginLeft: '24px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: deltaColor, background: deltaBg, border: `1px solid ${deltaBorder}`, borderRadius: '6px', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontVariantNumeric: 'tabular-nums' }}>
              {sign} {Math.abs(delta).toFixed(1)}
              {isGood && <span style={{ opacity: .6, fontSize: '10px' }}>ดี</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ModalObstacleCard({ obs }: { obs: Obstacle }) {
  const pct = obs.progress_pct ?? 0
  const progressColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#f87171'
  const catStyle: Record<string, string> = {
    MM: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    DMA: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    P3: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
    'อื่นๆ': 'bg-white/8 text-white/40 border-white/15',
  }
  const statusStyle: Record<string, string> = {
    'รายงานใหม่':  'bg-blue-500/15 text-blue-300 border-blue-500/25',
    'ระหว่างแก้':  'bg-amber-500/15 text-amber-300 border-amber-500/25',
    'รอสนับสนุน':  'bg-orange-500/15 text-orange-300 border-orange-500/25',
    'ล่าช้า':       'bg-red-500/15 text-red-300 border-red-500/25',
    'เกินกำหนด':   'bg-red-800/20 text-red-200 border-red-500/40',
    'ปิดประเด็น':  'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
  }
  const daysLeft = obs.due_date
    ? Math.round((new Date(obs.due_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div style={{ border: '1px solid rgba(251,191,36,.2)', background: 'linear-gradient(135deg,rgba(251,191,36,.06),rgba(251,191,36,.02))', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Head */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderBottom: '1px solid rgba(251,191,36,.1)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-[11px] font-bold text-amber-400/70 font-mono tracking-wider mb-1">{obs.code}</div>
          <div className="text-[14px] font-bold text-yellow-50 leading-snug">{obs.obstacle_type}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${catStyle[obs.category] ?? catStyle['อื่นๆ']}`}>{obs.category}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyle[obs.status] ?? statusStyle['รายงานใหม่']}`}>{obs.status}</span>
        </div>
      </div>
      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '14px 16px' }}>
        {obs.area && (
          <div>
            <div className="text-[10px] font-bold text-amber-500/60 uppercase tracking-wider mb-1">พื้นที่ / โซน</div>
            <div className="text-[13px] text-white/85">📍 {obs.area}</div>
          </div>
        )}
        {obs.data_quality_impact && (
          <div>
            <div className="text-[10px] font-bold text-amber-500/60 uppercase tracking-wider mb-1">ผลกระทบต่อข้อมูล / NRW</div>
            <div className="text-[13px] text-white/85 leading-relaxed">{obs.data_quality_impact}</div>
          </div>
        )}
        {obs.resolution_plan && (
          <div style={{ gridColumn: '1/-1' }}>
            <div className="text-[10px] font-bold text-amber-500/60 uppercase tracking-wider mb-1">แผนแก้ไข / Resolution Plan</div>
            <div className="text-[13px] text-white/85 leading-relaxed">{obs.resolution_plan}</div>
          </div>
        )}
        {obs.region_support_needed && (
          <div style={{ gridColumn: '1/-1' }}>
            <div className="text-[10px] font-bold text-amber-500/60 uppercase tracking-wider mb-1">⚑ ขอสนับสนุนจากเขต</div>
            <div className="text-[13px] text-orange-200 font-semibold leading-relaxed">{obs.region_support_needed}</div>
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderTop: '1px solid rgba(251,191,36,.08)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="text-[11px] text-amber-400/65 whitespace-nowrap font-medium">ความคืบหน้า {pct}%</span>
          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,.07)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(to right,${progressColor}88,${progressColor})`, transition: 'width .5s ease' }} />
          </div>
        </div>
        {daysLeft !== null && (
          daysLeft < 0
            ? <span className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle size={10} />เกินกำหนด {Math.abs(daysLeft)} วัน</span>
            : daysLeft <= 7
            ? <span className="text-orange-400 text-[10px] flex items-center gap-1"><Clock size={10} />เหลือ {daysLeft} วัน</span>
            : <span className="text-white/25 text-[10px]">ครบ {obs.due_date}</span>
        )}
      </div>
    </div>
  )
}

function PdcaDetailModal({
  branchName,
  detail,
  prevDetail,
  branchObstacles,
  oldObsCount,
  branchAreaRows,
  open,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  counterIdx,
  totalBranches,
  refMonth,
  refYear,
}: {
  branchName: string
  detail: PdcaSummaryRow | null
  prevDetail: PdcaPrevRow | null
  branchObstacles: Obstacle[]
  oldObsCount: number
  branchAreaRows: PdcaAreaRow[]
  open: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  counterIdx: number
  totalBranches: number
  refMonth: number | null
  refYear: number | null
}) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null)

  useEffect(() => { setSelectedArea(null) }, [branchName])

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, hasPrev, hasNext, onClose, onPrev, onNext])

  if (!branchName) return null

  // Area-level derived data
  const areaNames = Array.from(new Set(branchAreaRows.map(r => r.area_name).filter(Boolean)))
  const hasMultipleAreas = areaNames.length > 1
  const activeArea = selectedArea ?? (areaNames.length === 1 ? areaNames[0] : null)
  // Fall back to first row when no specific area is selected (handles empty/null area_name)
  const activeAreaRow = activeArea
    ? (branchAreaRows.find(r => r.area_name === activeArea) ?? branchAreaRows[0] ?? null)
    : (branchAreaRows[0] ?? null)

  const hasPdca = activeAreaRow
    ? !!(activeAreaRow.pdca_do || activeAreaRow.pdca_act)
    : !!(detail?.pdca_do || detail?.pdca_act)
  const hasData = detail?.volume_distributed != null
  const daysInMonth = detail ? new Date(detail.report_year, detail.report_month, 0).getDate() : null
  const nrwPct = detail?.nrw_pct ??
    (detail?.volume_distributed && detail?.volume_sold
      ? ((detail.volume_distributed - detail.volume_sold) / detail.volume_distributed * 100)
      : null)

  function nrwFromDist(dist: number | null, sold: number | null) {
    return dist && sold && dist > 0 ? ((dist - sold) / dist * 100) : null
  }
  const beforeNrw = activeAreaRow
    ? nrwFromDist(activeAreaRow.water_dist_before, activeAreaRow.water_sold_before)
    : null
  const afterNrw = activeAreaRow
    ? nrwFromDist(activeAreaRow.water_dist_after, activeAreaRow.water_sold_after)
    : null
  const hasTrend = activeAreaRow && (
    activeAreaRow.water_dist_before != null ||
    activeAreaRow.mnf_before != null
  )
  const hasStepTests = activeAreaRow && activeAreaRow.step_tests.length > 0
  const areaDaysInMonth = activeAreaRow ? new Date(activeAreaRow.report_year, activeAreaRow.report_month, 0).getDate() : null

  function Delta({ curr, prev, decimals = 1 }: { curr: number | null; prev: number | null; decimals?: number }) {
    if (curr == null || prev == null) return null
    const d = curr - prev
    if (Math.abs(d) < 0.005) return <span style={{ color: 'rgba(255,255,255,.25)' }}>— เท่าเดิม</span>
    const good = d < 0
    return (
      <span style={{ color: good ? '#34d399' : '#f87171' }}>
        {d < 0 ? '▼' : '▲'} {Math.abs(d).toFixed(decimals)}
      </span>
    )
  }

  const progPct = totalBranches > 0 ? ((counterIdx + 1) / totalBranches) * 100 : 0

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(2,8,20,.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 50,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .25s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(1060px, 96vw)', maxHeight: '90vh',
          background: '#0b1b30',
          border: '1px solid rgba(255,255,255,.09)',
          borderRadius: '24px',
          boxShadow: '0 0 0 1px rgba(255,255,255,.04), 0 48px 120px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: open ? 'scale(1) translateY(0)' : 'scale(.9) translateY(22px)',
          opacity: open ? 1 : 0,
          transition: 'transform .32s cubic-bezier(.34,1.4,.64,1), opacity .22s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '24px 30px 20px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          flexShrink: 0, position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 130% at -5% 60%, rgba(139,92,246,.16) 0%, transparent 65%), radial-gradient(ellipse 50% 100% at 110% 0%, rgba(59,130,246,.1) 0%, transparent 55%)',
        }}>
          <div className="flex justify-between items-start mb-3">
            <h2 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-.4px', background: 'linear-gradient(135deg,#fff 40%,rgba(196,181,253,.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              สาขา{branchName}
            </h2>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={e => { e.stopPropagation(); onPrev() }} disabled={!hasPrev}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/35 flex items-center justify-center hover:bg-violet-500/15 hover:text-violet-300 hover:border-violet-500/35 disabled:opacity-20 disabled:cursor-default transition-all text-sm">‹</button>
              <button type="button" onClick={e => { e.stopPropagation(); onNext() }} disabled={!hasNext}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/35 flex items-center justify-center hover:bg-violet-500/15 hover:text-violet-300 hover:border-violet-500/35 disabled:opacity-20 disabled:cursor-default transition-all text-sm">›</button>
              <button type="button" onClick={e => { e.stopPropagation(); onClose() }}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/35 flex items-center justify-center hover:bg-white/12 hover:text-white transition-all">
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasPdca
              ? <span className="text-[11px] px-2.5 py-1 rounded-lg border bg-emerald-500/10 text-emerald-400 border-emerald-500/25 font-semibold">✓ ส่ง PDCA แล้ว</span>
              : <span className="text-[11px] px-2.5 py-1 rounded-lg border bg-white/5 text-white/30 border-white/10 font-semibold">ยังไม่ส่ง</span>
            }
            {refMonth && refYear && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg border bg-violet-500/12 text-violet-300 border-violet-500/25 font-semibold">
                {THAI_MONTHS_SHORT[refMonth - 1]} {refYear + 543}
              </span>
            )}
            {branchObstacles.length > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg border bg-amber-500/10 text-amber-300 border-amber-500/25 font-semibold flex items-center gap-1.5">
                <TriangleAlert size={11} /> อุปสรรค {branchObstacles.length} รายการ
              </span>
            )}
          </div>

          {/* Area selector — only when multiple areas */}
          {hasMultipleAreas && (
            <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-white/6">
              <span className="text-[10px] text-white/30 shrink-0">พื้นที่</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setSelectedArea(null) }}
                className={cn(
                  'text-[11px] px-2.5 py-0.5 rounded-lg border transition-all',
                  activeArea === null
                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                    : 'text-white/35 border-white/10 hover:border-white/25 hover:text-white/60'
                )}
              >
                ทุกพื้นที่
              </button>
              {areaNames.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={e => { e.stopPropagation(); setSelectedArea(name) }}
                  className={cn(
                    'text-[11px] px-2.5 py-0.5 rounded-lg border transition-all',
                    activeArea === name
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'text-white/35 border-white/10 hover:border-white/25 hover:text-white/60'
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 30px 24px', display: 'flex', flexDirection: 'column', gap: '20px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,.25) transparent' }}>
          {!hasPdca && !hasData && branchObstacles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl opacity-20 mb-4">📋</div>
              <p className="text-white/30 font-bold text-lg mb-1">ยังไม่มีข้อมูลรายงาน</p>
              <p className="text-white/15 text-sm">สาขา{branchName} ยังไม่ได้ส่งรายงานประจำเดือน</p>
            </div>
          ) : (
            <>
              {/* NRW Stats */}
              {hasData && (
                <div>
                  <ModalSectionLabel>ข้อมูล NRW ประจำเดือน</ModalSectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
                    <ModalStatCard label="น้ำจ่าย / วัน" color="blue"
                      value={detail!.volume_distributed && daysInMonth ? Math.round(detail!.volume_distributed / daysInMonth).toLocaleString('en-US') : '—'}
                      unit="ลบ.ม."
                      sub={detail!.volume_distributed && daysInMonth ? `รวม ${detail!.volume_distributed.toLocaleString('en-US')} · ${daysInMonth} วัน` : undefined}
                    />
                    <ModalStatCard label="น้ำจำหน่าย / วัน" color="indigo"
                      value={detail!.volume_sold && daysInMonth ? Math.round(detail!.volume_sold / daysInMonth).toLocaleString('en-US') : '—'}
                      unit="ลบ.ม."
                      sub={detail!.volume_sold && daysInMonth ? `รวม ${detail!.volume_sold.toLocaleString('en-US')} · ${daysInMonth} วัน` : undefined}
                    />
                    <ModalStatCard label="น้ำสูญเสีย / วัน" color="amber"
                      value={detail!.volume_distributed && detail!.volume_sold && daysInMonth
                        ? Math.round((detail!.volume_distributed - detail!.volume_sold) / daysInMonth).toLocaleString('en-US')
                        : '—'}
                      unit="ลบ.ม."
                      sub={detail!.volume_distributed && detail!.volume_sold && daysInMonth
                        ? `รวม ${(detail!.volume_distributed - detail!.volume_sold).toLocaleString('en-US')}`
                        : undefined}
                    />
                    <ModalStatCard label="% นสส." color={nrwPct != null && nrwPct < 20 ? 'green' : 'red'}
                      value={nrwPct != null ? nrwPct.toFixed(2) : '—'}
                      unit="%"
                    />
                    <ModalStatCard label="MNF ล่าสุด" color="violet"
                      value={detail!.mnf_latest != null ? detail!.mnf_latest.toFixed(1) : '—'}
                      unit="ลบ.ม./ชม."
                    />
                  </div>
                </div>
              )}

              {/* Leak / meter */}
              {hasData && (
                <div>
                  <ModalSectionLabel>ท่อรั่วและมาตรผิดปกติ</ModalSectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
                    <ModalLeakCard label="จุดรั่วพบใหม่" val={detail!.leaks_found} color="#f87171" />
                    <ModalLeakCard label="ซ่อมแล้ว" val={detail!.leaks_repaired} color="#34d399" />
                    <ModalLeakCard label="รอดำเนินการ" val={detail!.leaks_pending} color="#fbbf24" />
                    <ModalLeakCard label="รั่วซ้ำ" val={detail!.leaks_repeat} color="#fb923c" />
                    <ModalLeakCard label="มาตรผิดปกติ" val={detail!.meters_abnormal} color="#a78bfa" />
                  </div>
                </div>
              )}

              {/* Trend summary — before vs after per active area */}
              {hasTrend && activeAreaRow && (
                <div>
                  <ModalSectionLabel>สรุปแนวโน้ม{activeArea ? ` — ${activeArea}` : ''}</ModalSectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                    <TrendCard
                      label="NRW%"
                      beforeStr={beforeNrw != null ? beforeNrw.toFixed(1) + '%' : null}
                      afterStr={afterNrw != null ? afterNrw.toFixed(1) + '%' : null}
                      delta={beforeNrw != null && afterNrw != null ? afterNrw - beforeNrw : null}
                      lowerBetter
                      borderColor="rgba(251,191,36,.2)"
                      accentColor={afterNrw != null && afterNrw < 20 ? '#6ee7b7' : '#fca5a5'}
                    />
                    <TrendCard
                      label="MNF" unit="ลบ.ม./ชม."
                      beforeStr={activeAreaRow.mnf_before != null ? activeAreaRow.mnf_before.toFixed(1) : null}
                      afterStr={activeAreaRow.mnf_after != null ? activeAreaRow.mnf_after.toFixed(1) : null}
                      delta={activeAreaRow.mnf_before != null && activeAreaRow.mnf_after != null ? activeAreaRow.mnf_after - activeAreaRow.mnf_before : null}
                      lowerBetter
                      borderColor="rgba(139,92,246,.2)"
                      accentColor="#c4b5fd"
                    />
                    <TrendCard
                      label="น้ำจ่าย / วัน" unit="ลบ.ม."
                      beforeStr={activeAreaRow.water_dist_before != null && areaDaysInMonth ? Math.round(activeAreaRow.water_dist_before / areaDaysInMonth).toLocaleString('en-US') : null}
                      afterStr={activeAreaRow.water_dist_after != null && areaDaysInMonth ? Math.round(activeAreaRow.water_dist_after / areaDaysInMonth).toLocaleString('en-US') : null}
                      delta={activeAreaRow.water_dist_before != null && activeAreaRow.water_dist_after != null && areaDaysInMonth ? (activeAreaRow.water_dist_after - activeAreaRow.water_dist_before) / areaDaysInMonth : null}
                      lowerBetter
                      borderColor="rgba(59,130,246,.2)"
                      accentColor="#7dd3fc"
                    />
                    <TrendCard
                      label="น้ำจำหน่าย / วัน" unit="ลบ.ม."
                      beforeStr={activeAreaRow.water_sold_before != null && areaDaysInMonth ? Math.round(activeAreaRow.water_sold_before / areaDaysInMonth).toLocaleString('en-US') : null}
                      afterStr={activeAreaRow.water_sold_after != null && areaDaysInMonth ? Math.round(activeAreaRow.water_sold_after / areaDaysInMonth).toLocaleString('en-US') : null}
                      delta={activeAreaRow.water_sold_before != null && activeAreaRow.water_sold_after != null && areaDaysInMonth ? (activeAreaRow.water_sold_after - activeAreaRow.water_sold_before) / areaDaysInMonth : null}
                      borderColor="rgba(16,185,129,.2)"
                      accentColor="#6ee7b7"
                    />
                  </div>
                </div>
              )}

              {/* Step Test Results */}
              {hasStepTests && activeAreaRow && (() => {
                const sorted = [...activeAreaRow.step_tests].sort((a, b) => a.step_no - b.step_no)
                const totalFound = sorted.reduce((s, r) => s + r.leaks_found, 0)
                const totalRepaired = sorted.reduce((s, r) => s + (r.leaks_repaired ?? 0), 0)
                const totalLoss = sorted.reduce((s, r) => s + (r.estimated_loss ?? 0), 0)
                return (
                  <div>
                    <ModalSectionLabel>ผล Step Test{activeArea ? ` — ${activeArea}` : ''}</ModalSectionLabel>
                    <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,.08)', overflow: 'hidden', background: 'rgba(255,255,255,.015)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,.04)' }}>
                            {['Step', 'Loss โดยประมาณ (ลบ.ม./ชม.)', 'จุดรั่วพบ', 'ซ่อมแล้ว', 'ค้างซ่อม'].map(h => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,.50)', fontWeight: 700, fontSize: '11px', letterSpacing: '.04em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,.08)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((s, i) => {
                            const hasLeak = s.leaks_found > 0
                            const repaired = s.leaks_repaired ?? 0
                            const pending = Math.max(0, s.leaks_found - repaired)
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.04)', background: hasLeak ? 'rgba(248,113,113,.04)' : i % 2 === 1 ? 'rgba(255,255,255,.012)' : 'transparent' }}>
                                <td style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,.55)', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', padding: '2px 8px' }}>S{s.step_no}</span>
                                </td>
                                <td style={{ padding: '10px 14px', color: s.estimated_loss != null ? '#fde68a' : 'rgba(255,255,255,.18)', fontVariantNumeric: 'tabular-nums', fontWeight: s.estimated_loss != null ? 700 : 400 }}>
                                  {s.estimated_loss != null ? s.estimated_loss.toFixed(2) : '—'}
                                </td>
                                <td style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums' }}>
                                  {hasLeak
                                    ? <span style={{ color: '#fca5a5', fontWeight: 800 }}>{s.leaks_found} จุด</span>
                                    : <span style={{ color: 'rgba(255,255,255,.2)' }}>0 จุด</span>}
                                </td>
                                <td style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums' }}>
                                  {s.leaks_repaired != null
                                    ? <span style={{ color: '#6ee7b7', fontWeight: 700 }}>{s.leaks_repaired} จุด</span>
                                    : <span style={{ color: 'rgba(255,255,255,.18)' }}>—</span>}
                                </td>
                                <td style={{ padding: '10px 14px', fontVariantNumeric: 'tabular-nums' }}>
                                  {hasLeak
                                    ? <span style={{ color: pending > 0 ? '#fbbf24' : 'rgba(255,255,255,.25)', fontWeight: pending > 0 ? 700 : 400 }}>{pending} จุด</span>
                                    : <span style={{ color: 'rgba(255,255,255,.18)' }}>—</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        {sorted.length > 1 && (
                          <tfoot>
                            <tr style={{ background: 'rgba(255,255,255,.03)', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                              <td style={{ padding: '9px 14px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.04em' }}>รวม</td>
                              <td style={{ padding: '9px 14px', fontSize: '11px', fontWeight: 700, color: totalLoss > 0 ? '#fde68a' : 'rgba(255,255,255,.2)', fontVariantNumeric: 'tabular-nums' }}>
                                {totalLoss > 0 ? totalLoss.toFixed(2) : '—'}
                              </td>
                              <td style={{ padding: '9px 14px', fontSize: '11px', fontWeight: 800, color: totalFound > 0 ? '#fca5a5' : 'rgba(255,255,255,.2)', fontVariantNumeric: 'tabular-nums' }}>
                                {totalFound} จุด
                              </td>
                              <td style={{ padding: '9px 14px', fontSize: '11px', fontWeight: 700, color: totalRepaired > 0 ? '#6ee7b7' : 'rgba(255,255,255,.2)', fontVariantNumeric: 'tabular-nums' }}>
                                {totalRepaired > 0 ? `${totalRepaired} จุด` : '—'}
                              </td>
                              {(() => {
                                const totalPending = sorted.reduce((s, r) => s + Math.max(0, r.leaks_found - (r.leaks_repaired ?? 0)), 0)
                                return (
                                  <td style={{ padding: '9px 14px', fontSize: '11px', fontWeight: totalPending > 0 ? 800 : 400, color: totalPending > 0 ? '#fbbf24' : 'rgba(255,255,255,.2)', fontVariantNumeric: 'tabular-nums' }}>
                                    {totalPending > 0 ? `${totalPending} จุด` : '—'}
                                  </td>
                                )
                              })()}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* PDCA D + A */}
              {hasPdca && (
                <div>
                  <ModalSectionLabel>ผลการดำเนินการ PDCA</ModalSectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <ModalPdcaBlock icon="D" label="Do" sub="สิ่งที่ดำเนินการในเดือนนี้" color="blue"
                      text={activeAreaRow ? activeAreaRow.pdca_do : detail?.pdca_do} />
                    <ModalPdcaBlock icon="A" label="Act" sub="แผนการปรับปรุงต่อไป" color="emerald"
                      text={activeAreaRow ? activeAreaRow.pdca_act : detail?.pdca_act} />
                  </div>
                </div>
              )}

              {/* Obstacles — only ref-month new obstacles */}
              {branchObstacles.length > 0 && (
                <div>
                  <ModalSectionLabel accent="amber">⚠ อุปสรรคที่เปิดในเดือนนี้ ({branchObstacles.length} รายการ)</ModalSectionLabel>
                  <div className="space-y-3">
                    {branchObstacles.map(obs => (
                      <ModalObstacleCard key={obs.id} obs={obs} />
                    ))}
                  </div>
                </div>
              )}

              {/* Reference note for old/continuing obstacles in วาระ 4 */}
              {oldObsCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/15 bg-amber-500/5">
                  <TriangleAlert size={14} className="text-amber-400/70 shrink-0" />
                  <div className="text-[12px] text-amber-300/70 leading-relaxed">
                    มีอุปสรรคสืบเนื่องจากก่อนหน้า <strong className="text-amber-300">{oldObsCount} รายการ</strong>
                    {' '}— ดูรายละเอียดทั้งหมดในวาระที่ 4
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 30px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(255,255,255,.015)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/45 num font-medium">{counterIdx + 1} / {totalBranches} สาขา</span>
            <div style={{ width: '100px', height: '3px', background: 'rgba(255,255,255,.1)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(to right,#7c3aed,#a78bfa)', width: `${progPct}%`, transition: 'width .3s ease' }} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/38">
            <kbd className="bg-white/8 border border-white/15 rounded px-1.5 py-0.5 text-white/50">←</kbd>
            <kbd className="bg-white/8 border border-white/15 rounded px-1.5 py-0.5 text-white/50">→</kbd>
            <span>ข้ามสาขา</span>
            <span className="mx-1 opacity-40">|</span>
            <kbd className="bg-white/8 border border-white/15 rounded px-1.5 py-0.5 text-white/50">Esc</kbd>
            <span>ปิด</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ObstacleDetailModal({
  branchName,
  obstacles,
  open,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  branchName: string
  obstacles: Obstacle[]
  open: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}) {
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, hasPrev, hasNext, onClose, onPrev, onNext])

  if (!branchName) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(2,8,20,.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 50,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .25s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(700px, 96vw)', maxHeight: '90vh',
          background: '#0b1b30',
          border: '1px solid rgba(255,255,255,.09)',
          borderRadius: '24px',
          boxShadow: '0 0 0 1px rgba(255,255,255,.04), 0 48px 120px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: open ? 'scale(1) translateY(0)' : 'scale(.9) translateY(22px)',
          opacity: open ? 1 : 0,
          transition: 'transform .32s cubic-bezier(.34,1.4,.64,1), opacity .22s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px 30px 20px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          flexShrink: 0,
          background: 'radial-gradient(ellipse 80% 130% at -5% 60%, rgba(251,191,36,.12) 0%, transparent 65%)',
        }}>
          <div className="flex justify-between items-start">
            <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-.3px', background: 'linear-gradient(135deg,#fff 40%,rgba(253,224,71,.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              สาขา{branchName}
            </h2>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={e => { e.stopPropagation(); onPrev() }} disabled={!hasPrev}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/35 flex items-center justify-center hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-500/35 disabled:opacity-20 disabled:cursor-default transition-all text-sm">‹</button>
              <button type="button" onClick={e => { e.stopPropagation(); onNext() }} disabled={!hasNext}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/35 flex items-center justify-center hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-500/35 disabled:opacity-20 disabled:cursor-default transition-all text-sm">›</button>
              <button type="button" onClick={e => { e.stopPropagation(); onClose() }}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/35 flex items-center justify-center hover:bg-white/12 hover:text-white transition-all">
                <X size={15} />
              </button>
            </div>
          </div>
          <div className="mt-2">
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
              obstacles.length > 0
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-white/5 text-white/30 border-white/10'
            )}>
              {obstacles.length > 0 ? `${obstacles.length} อุปสรรค` : 'ไม่มีอุปสรรค'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="space-y-3">
          {obstacles.length === 0 ? (
            <div className="text-center text-white/25 text-sm py-12">ไม่มีอุปสรรคที่เปิดอยู่</div>
          ) : (
            obstacles.map(obs => <ModalObstacleCard key={obs.id} obs={obs} />)
          )}
        </div>
      </div>
    </div>
  )
}

function ObstacleBranchPanel({
  obstacles,
  yoyRows,
}: {
  obstacles: Obstacle[]
  yoyRows?: NrwYoyRow[]
}) {
  const [modalBranchName, setModalBranchName] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const yoyMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const r of yoyRows ?? []) map.set(r.branch_name, r.rate_delta)
    return map
  }, [yoyRows])

  const obsByBranch = useMemo(() => {
    const map = new Map<string, Obstacle[]>()
    for (const obs of obstacles) {
      const name = obs.branches?.name_th ?? ''
      if (!name) continue
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(obs)
    }
    return map
  }, [obstacles])

  // Only branches that have obstacles, sorted by delta most negative first
  const branchesWithObs = useMemo(() => {
    return [...PWA_BRANCHES]
      .filter(b => (obsByBranch.get(b.name_th)?.length ?? 0) > 0)
      .sort((a, b) => {
        const da = yoyMap.get(a.name_th) ?? null
        const db = yoyMap.get(b.name_th) ?? null
        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1
        return da - db
      })
  }, [obsByBranch, yoyMap])

  const modalIdx = modalBranchName ? branchesWithObs.findIndex(b => b.name_th === modalBranchName) : -1

  function openModal(name: string) {
    setModalBranchName(name)
    requestAnimationFrame(() => requestAnimationFrame(() => setModalOpen(true)))
  }

  function closeModal() {
    setModalOpen(false)
    setTimeout(() => setModalBranchName(null), 350)
  }

  function navModal(dir: 1 | -1) {
    const idx = modalBranchName ? branchesWithObs.findIndex(b => b.name_th === modalBranchName) : -1
    if (idx < 0) return
    const next = idx + dir
    if (next < 0 || next >= branchesWithObs.length) return
    setModalBranchName(branchesWithObs[next].name_th)
  }

  const modalObstacles = modalBranchName ? (obsByBranch.get(modalBranchName) ?? []) : []

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-500/15 flex-wrap">
        <TriangleAlert size={13} className="text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-300">อุปสรรคตามสาขา</span>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
          obstacles.length > 0
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            : 'bg-white/5 text-white/30 border-white/10'
        )}>
          {obstacles.length} รายการ · {branchesWithObs.length} สาขา
        </span>
      </div>

      {/* Branch cards — only branches with obstacles */}
      <div className="px-4 pb-4 pt-3 flex flex-wrap gap-2">
        {branchesWithObs.length === 0 ? (
          <p className="w-full text-center text-white/25 text-sm py-6">ไม่มีอุปสรรคที่เปิดอยู่</p>
        ) : branchesWithObs.map(b => {
          const obsCount = obsByBranch.get(b.name_th)?.length ?? 0
          const delta = yoyMap.size > 0 ? (yoyMap.get(b.name_th) ?? null) : null
          const nrwGood = delta !== null && delta < -0.001
          const nrwBad  = delta !== null && delta >  0.001

          return (
            <button
              key={b.costcenter}
              type="button"
              onClick={() => openModal(b.name_th)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-150',
                'hover:scale-[1.04] hover:shadow-lg active:scale-[0.97]',
                nrwBad
                  ? 'bg-red-500/18 border-red-500/45 hover:bg-red-500/26 hover:border-red-500/65'
                  : nrwGood
                    ? 'bg-emerald-500/14 border-emerald-500/38 hover:bg-emerald-500/22 hover:border-emerald-500/58'
                    : 'bg-white/4 border-white/10 hover:bg-white/8 hover:border-white/20',
              )}
            >
              <span className={cn(
                'text-[12px] font-bold leading-none',
                nrwBad ? 'text-red-200' : nrwGood ? 'text-emerald-100' : 'text-white/70',
              )}>
                {b.name_th}
              </span>
              <span className="flex items-center gap-0.5 text-amber-400">
                <TriangleAlert size={12} strokeWidth={2.5} />
                <span className="text-[12px] font-extrabold tabular-nums leading-none">{obsCount}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      {branchesWithObs.length > 0 && (
        <div className="flex items-center gap-3 px-4 pb-3 text-[10px] text-white/25 flex-wrap border-t border-white/5 pt-2.5">
          {yoyMap.size > 0 && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/50 inline-block" />
                NRW ดีขึ้น
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500/40 border border-red-500/50 inline-block" />
                NRW แย่ลง
              </span>
            </>
          )}
          <span className="ml-auto text-amber-400/35">กดสาขาเพื่อดูรายละเอียด</span>
        </div>
      )}

      {/* Modal */}
      <ObstacleDetailModal
        branchName={modalBranchName ?? ''}
        obstacles={modalObstacles}
        open={modalOpen}
        onClose={closeModal}
        onPrev={() => navModal(-1)}
        onNext={() => navModal(1)}
        hasPrev={modalIdx > 0}
        hasNext={modalIdx >= 0 && modalIdx < branchesWithObs.length - 1}
      />
    </div>
  )
}

function PdcaBranchPanel({
  allRows,
  refMonth,
  refYear,
  meetingId,
  obstacles = [],
  prevRows = [],
  yoyRows,
  areaRows = [],
}: {
  allRows: PdcaSummaryRow[]
  refMonth: number | null
  refYear: number | null
  meetingId: string
  obstacles?: Obstacle[]
  prevRows?: PdcaPrevRow[]
  yoyRows?: NrwYoyRow[]
  areaRows?: PdcaAreaRow[]
}) {
  const router = useRouter()
  const [modalBranchName, setModalBranchName] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null)
  const [editingRef, setEditingRef] = useState(false)
  const [editMonth, setEditMonth] = useState<number>(refMonth ?? new Date().getMonth() + 1)
  const [editYear, setEditYear] = useState<number>(refYear ?? new Date().getFullYear())
  const [isSavingRef, startSavingRef] = useTransition()

  // branch_name → rate_delta from วาระ 3 chart, used for color coding
  const yoyMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const r of yoyRows ?? []) map.set(r.branch_name, r.rate_delta)
    return map
  }, [yoyRows])

  function handleSaveRef() {
    startSavingRef(async () => {
      const res = await updatePdcaRef(meetingId, editMonth, editYear)
      if (!res.success) { toast.error(res.error); return }
      toast.success(`เชื่อมกับ PDCA เดือน ${THAI_MONTHS_FULL[editMonth - 1]} ${editYear + 543} แล้ว`)
      setEditingRef(false)
      router.refresh()
    })
  }

  const months = useMemo(() => {
    const seen = new Set<string>()
    const result: { month: number; year: number }[] = []
    for (const row of allRows) {
      const key = `${row.report_year}-${row.report_month}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ month: row.report_month, year: row.report_year })
      }
    }
    return result
  }, [allRows])

  const defaultKey = refMonth && refYear
    ? `${refYear}-${refMonth}`
    : (months[0] ? `${months[0].year}-${months[0].month}` : '')
  const currentKey = activeMonthKey ?? defaultKey

  const summaryMap = useMemo(() => {
    if (!currentKey) return new Map<string, PdcaSummaryRow>()
    const [year, month] = currentKey.split('-').map(Number)
    return new Map(
      allRows
        .filter(r => r.report_year === year && r.report_month === month)
        .map(r => [r.branch_name, r])
    )
  }, [allRows, currentKey])

  // Ref-month obstacles count per branch (badge matches what modal shows)
  const obsByBranch = useMemo(() => {
    const map = new Map<string, number>()
    if (!refMonth || !refYear) return map
    const start = new Date(refYear, refMonth - 1, 1)
    const end = new Date(refYear, refMonth, 1)
    for (const obs of obstacles) {
      const name = obs.branches?.name_th ?? ''
      if (!name) continue
      const d = new Date(obs.created_at)
      if (d >= start && d < end) map.set(name, (map.get(name) ?? 0) + 1)
    }
    return map
  }, [obstacles, refMonth, refYear])

  // Prev month map for delta comparison
  const prevMap = useMemo(() => {
    const map = new Map<string, PdcaPrevRow>()
    for (const r of prevRows) map.set(r.branch_name, r)
    return map
  }, [prevRows])

  const submittedCount = useMemo(() => {
    if (!currentKey) return 0
    const [year, month] = currentKey.split('-').map(Number)
    const names = new Set(allRows
      .filter(r => r.report_year === year && r.report_month === month && (r.pdca_do || r.pdca_act))
      .map(r => r.branch_name))
    return names.size
  }, [allRows, currentKey])

  // Modal helpers
  const modalIdx = modalBranchName ? PWA_BRANCHES.findIndex(b => b.name_th === modalBranchName) : -1

  function openModal(name: string) {
    setModalBranchName(name)
    requestAnimationFrame(() => requestAnimationFrame(() => setModalOpen(true)))
  }

  function closeModal() {
    setModalOpen(false)
    setTimeout(() => setModalBranchName(null), 350)
  }

  function navModal(dir: 1 | -1) {
    const idx = modalBranchName ? PWA_BRANCHES.findIndex(b => b.name_th === modalBranchName) : -1
    if (idx < 0) return
    const next = idx + dir
    if (next < 0 || next >= PWA_BRANCHES.length) return
    setModalBranchName(PWA_BRANCHES[next].name_th)
  }

  const modalDetail = modalBranchName ? (summaryMap.get(modalBranchName) ?? null) : null
  const modalPrevDetail = modalBranchName ? (prevMap.get(modalBranchName) ?? null) : null
  const modalAreaRows = useMemo(() => {
    if (!modalBranchName) return []
    // If currentKey is set, filter by year/month; otherwise return all rows for the branch
    if (currentKey) {
      const [year, month] = currentKey.split('-').map(Number)
      const filtered = areaRows.filter(r =>
        r.branch_name === modalBranchName &&
        r.report_year === year &&
        r.report_month === month
      )
      if (filtered.length > 0) return filtered
    }
    // Fallback: any area row for this branch (e.g. when no month filter or data has different key)
    return areaRows.filter(r => r.branch_name === modalBranchName)
  }, [modalBranchName, currentKey, areaRows])

  // Modal obstacles: only those created IN the ref month (new issues for this PDCA period)
  // Old/continuing obstacles belong in วาระ 4, not here
  const { modalObstacles, oldObsCount } = useMemo(() => {
    if (!modalBranchName) return { modalObstacles: [], oldObsCount: 0 }
    const branchObs = obstacles.filter(obs => obs.branches?.name_th === modalBranchName)
    if (!refMonth || !refYear) {
      return { modalObstacles: [], oldObsCount: branchObs.length }
    }
    const start = new Date(refYear, refMonth - 1, 1)
    const end = new Date(refYear, refMonth, 1)
    const refMonthObs = branchObs.filter(obs => {
      const d = new Date(obs.created_at)
      return d >= start && d < end
    })
    const oldObs = branchObs.filter(obs => {
      const d = new Date(obs.created_at)
      return d < start
    })
    return { modalObstacles: refMonthObs, oldObsCount: oldObs.length }
  }, [modalBranchName, obstacles, refMonth, refYear])

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-500/15 flex-wrap">
        <Brain size={13} className="text-violet-400 shrink-0" />
        <span className="text-xs font-semibold text-violet-300">ผลการดำเนินการรายสาขา (PDCA)</span>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {currentKey && (
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full border font-semibold',
            submittedCount >= 26
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : submittedCount > 0
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-white/5 text-white/30 border-white/10'
          )}>
            {submittedCount}/26 ส่งแล้ว
          </span>
        )}
        {obsByBranch.size > 0 && (
          <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
            <TriangleAlert size={9} />
            {obsByBranch.size} สาขามีอุปสรรคค้าง
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {!editingRef && refMonth && refYear && (
            <span className="text-[10px] bg-violet-500/15 text-violet-300 border border-violet-500/25 px-2 py-0.5 rounded-full">
              {THAI_MONTHS_SHORT[refMonth - 1]} {refYear + 543}
            </span>
          )}
          {!editingRef && (
            <button
              type="button"
              onClick={() => {
                setEditMonth(refMonth ?? new Date().getMonth() + 1)
                setEditYear(refYear ?? new Date().getFullYear())
                setEditingRef(true)
              }}
              title="เปลี่ยนเดือน PDCA"
              className="p-1 rounded text-violet-400/50 hover:text-violet-300 hover:bg-violet-500/15 transition-all"
            >
              <Pencil size={11} />
            </button>
          )}
          {editingRef && (
            <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/25 rounded-lg px-2 py-1">
              <select
                className="text-[11px] bg-transparent text-violet-200 outline-none cursor-pointer"
                value={editMonth}
                onChange={e => setEditMonth(Number(e.target.value))}
              >
                {THAI_MONTHS_FULL.map((m, i) => (
                  <option key={i + 1} value={i + 1} className="bg-[#0f1f35] text-white">{m}</option>
                ))}
              </select>
              <input
                type="number"
                className="text-[11px] bg-transparent text-violet-200 outline-none w-14 text-center"
                value={editYear + 543}
                onChange={e => setEditYear(Number(e.target.value) - 543)}
                min={2560}
                max={2580}
              />
              <button
                type="button"
                disabled={isSavingRef}
                onClick={handleSaveRef}
                className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors"
                title="บันทึก"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => setEditingRef(false)}
                className="text-white/30 hover:text-white/60 transition-colors"
                title="ยกเลิก"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Month tabs — only when no ref specified */}
      {!refMonth && months.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-violet-500/10 flex-wrap">
          <span className="text-[10px] text-white/30 shrink-0">เดือน</span>
          {months.map(m => {
            const key = `${m.year}-${m.month}`
            return (
              <button
                key={key}
                type="button"
                onClick={() => { setActiveMonthKey(key); setModalBranchName(null) }}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-md border transition-all',
                  currentKey === key
                    ? 'bg-violet-500/25 text-violet-300 border-violet-500/50'
                    : 'text-white/30 border-white/10 hover:border-violet-500/30 hover:text-violet-300'
                )}
              >
                {THAI_MONTHS_SHORT[m.month - 1]} {m.year + 543}
              </button>
            )
          })}
        </div>
      )}

      {/* Branch badges — color-coded by NRW rate_delta from วาระ 3, sorted most negative first */}
      <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
        {[...PWA_BRANCHES]
          .sort((a, b) => {
            const da = yoyMap.get(a.name_th) ?? null
            const db = yoyMap.get(b.name_th) ?? null
            if (da === null && db === null) return 0
            if (da === null) return 1
            if (db === null) return -1
            return da - db
          })
          .map(b => {
            const obsCount = obsByBranch.get(b.name_th) ?? 0
            const hasObs = obsCount > 0
            const delta = yoyMap.size > 0 ? (yoyMap.get(b.name_th) ?? null) : null
            const nrwGood = delta !== null && delta < -0.001
            const nrwBad  = delta !== null && delta >  0.001

            return (
              <button
                key={b.costcenter}
                type="button"
                onClick={() => openModal(b.name_th)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all duration-150',
                  'hover:scale-[1.04] hover:shadow-lg active:scale-[0.97]',
                  nrwBad
                    ? 'bg-red-500/18 border-red-500/45 hover:bg-red-500/26 hover:border-red-500/65'
                    : nrwGood
                      ? 'bg-emerald-500/14 border-emerald-500/38 hover:bg-emerald-500/22 hover:border-emerald-500/58'
                      : 'bg-white/4 border-white/10 hover:bg-white/8 hover:border-white/20',
                )}
              >
                <span className={cn(
                  'text-[11px] font-bold leading-none',
                  nrwBad ? 'text-red-200' : nrwGood ? 'text-emerald-100' : 'text-white/65',
                )}>
                  {b.name_th}
                </span>
                {hasObs && (
                  <span className="flex items-center gap-0.5 text-[10px] font-extrabold text-amber-400">
                    <TriangleAlert size={9} strokeWidth={2.5} />
                    {obsCount}
                  </span>
                )}
              </button>
            )
          })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 pb-3 text-[10px] text-white/25 flex-wrap border-t border-white/5 pt-2.5">
        {yoyMap.size > 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/50 inline-block" />
              NRW ดีขึ้น
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500/40 border border-red-500/50 inline-block" />
              NRW แย่ลง
            </span>
          </>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_rgba(251,191,36,.5)]" />
          อุปสรรคค้าง
        </span>
        <span className="ml-auto text-violet-400/35">กดสาขาเพื่อดูรายละเอียด</span>
      </div>

      {/* Modal */}
      <PdcaDetailModal
        branchName={modalBranchName ?? ''}
        detail={modalDetail}
        prevDetail={modalPrevDetail}
        branchObstacles={modalObstacles}
        oldObsCount={oldObsCount}
        branchAreaRows={modalAreaRows}
        open={modalOpen}
        onClose={closeModal}
        onPrev={() => navModal(-1)}
        onNext={() => navModal(1)}
        hasPrev={modalIdx > 0}
        hasNext={modalIdx >= 0 && modalIdx < PWA_BRANCHES.length - 1}
        counterIdx={modalIdx}
        totalBranches={PWA_BRANCHES.length}
        refMonth={refMonth}
        refYear={refYear}
      />
    </div>
  )
}

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
    <div className="flex items-stretch rounded-lg border border-emerald-500/25 bg-emerald-500/5 overflow-hidden">
      <span className="shrink-0 flex items-center px-3 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border-r border-emerald-500/20">
        มติ
      </span>
      <p className="flex-1 px-3 py-2.5 text-sm text-emerald-200 leading-relaxed whitespace-pre-wrap">
        {detail || '—'}
      </p>
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

// ─── Past-meeting report modal (Mac-style window) ────────────────────────────

function ModalSection({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  const colorMap: Record<number, { badge: string }> = {
    1: { badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    2: { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    3: { badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    4: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    5: { badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
    6: { badge: 'bg-white/15 text-white/60 border-white/25' },
  }
  const style = colorMap[no] ?? colorMap[6]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={cn('shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold', style.badge)}>{no}</span>
        <div className="h-px flex-1 bg-white/6" />
      </div>
      <p className="text-xs font-bold text-white/50 uppercase tracking-widest pl-11">{title}</p>
      <div className="pl-11 space-y-2">{children}</div>
    </div>
  )
}

interface PastMeetingReportModalProps {
  entry: PastMeetingEntry | null
  open: boolean
  onClose: () => void
}
function PastMeetingReportModal({ entry, open, onClose }: PastMeetingReportModalProps) {
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const meeting = entry?.meeting ?? null
  const agendaHeader = entry?.agendaHeader ?? null
  const agendaSubitems = entry?.agendaSubitems ?? []
  const resolutions = entry?.resolutions ?? []
  const hasReport = entry?.hasReport ?? false
  const subItems = (no: number) => agendaSubitems.filter(s => s.agenda_no === no)
  const hasAgenda6 = agendaHeader?.agenda4_type === 'เรื่องสืบเนื่อง'
  const agenda4Label = agendaHeader?.agenda4_type ?? 'เรื่องสืบเนื่อง'

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(2,8,20,.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 60,
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .2s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(860px, 96vw)', maxHeight: '92vh',
          background: 'linear-gradient(160deg,#0d1f38 0%,#091627 100%)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: '16px',
          boxShadow: '0 0 0 1px rgba(255,255,255,.04), 0 60px 140px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.07)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: open ? 'scale(1) translateY(0)' : 'scale(.95) translateY(16px)',
          opacity: open ? 1 : 0,
          transition: 'transform .28s cubic-bezier(.34,1.4,.64,1), opacity .2s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Mac title bar ── */}
        <div style={{
          height: '44px',
          background: 'rgba(255,255,255,.03)',
          borderBottom: '1px solid rgba(255,255,255,.08)',
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: '8px', flexShrink: 0, userSelect: 'none',
        }}>
          {/* Traffic-light dots */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClose() }}
            title="ปิด"
            style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#ff5f57', border: '1px solid rgba(0,0,0,.3)', cursor: 'pointer', flexShrink: 0 }}
          />
          <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#febc2e', border: '1px solid rgba(0,0,0,.3)', flexShrink: 0 }} />
          <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#28c840', border: '1px solid rgba(0,0,0,.3)', flexShrink: 0 }} />

          <div style={{ flex: 1, textAlign: 'center', fontSize: '12.5px', fontWeight: 600, color: 'rgba(255,255,255,.45)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '0 8px' }}>
            {meeting?.code && <span style={{ fontFamily: 'monospace', marginRight: '8px', opacity: .55 }}>{meeting.code}</span>}
            {meeting?.title ?? ''}
          </div>

          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClose() }}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-white/35 flex items-center justify-center hover:bg-white/12 hover:text-white/70 transition-all shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div
          style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.1) transparent' }}
          className="space-y-6"
        >
          {!meeting ? null : !hasReport || !agendaHeader ? (
            <div className="rounded-xl border border-white/8 bg-white/3 p-12 text-center">
              <FileText size={36} className="mx-auto mb-3 opacity-15" />
              <p className="text-white/30 text-sm font-medium">ยังไม่มีรายงานการประชุมบันทึกไว้</p>
              <p className="text-white/18 text-xs mt-1">กรอกรายงานในหน้า แก้ไขรายงาน</p>
            </div>
          ) : (
            <>
              {/* Meeting info */}
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-white leading-tight">{meeting.title}</h2>
                <div className="flex flex-wrap gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-white/22" />
                    {formatThaiDate(meeting.scheduled_date)} · {meeting.scheduled_time?.slice(0, 5)} น.
                  </span>
                  {meeting.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-white/22" />
                      {meeting.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px bg-white/8" />

              {/* วาระ 1 */}
              <ModalSection no={1} title="ประธานแจ้งที่ประชุมทราบ">
                {agendaHeader.agenda1_detail ? (
                  <>
                    <p className="text-sm text-white/72 leading-relaxed whitespace-pre-wrap">{agendaHeader.agenda1_detail}</p>
                    <ResolutionBadge type={agendaHeader.agenda1_resolution ?? 'รับทราบ'} detail={agendaHeader.agenda1_resolution_detail} />
                  </>
                ) : (
                  <p className="text-sm text-white/22 italic">ไม่ได้กรอกรายละเอียด</p>
                )}
                {subItems(1).map(item => <SubItemCard key={item.id ?? item.item_no} item={item} />)}
              </ModalSection>

              {/* วาระ 2 */}
              <ModalSection no={2} title={`รับรองรายงานการประชุม${agendaHeader.agenda2_meeting_no ? ` ครั้งที่ ${agendaHeader.agenda2_meeting_no}` : ''}`}>
                {subItems(2).length > 0
                  ? subItems(2).map(item => <SubItemCard key={item.id ?? item.item_no} item={item} />)
                  : <p className="text-sm text-white/22 italic">ไม่มีรายการ</p>
                }
                {agendaHeader.agenda2_resolution && (
                  <ResolutionBadge type={agendaHeader.agenda2_resolution} detail={agendaHeader.agenda2_resolution_detail} />
                )}
              </ModalSection>

              {/* วาระ 3 — sub-items only, no NRW chart */}
              <ModalSection no={3} title="เรื่องเพื่อทราบ">
                {subItems(3).length > 0
                  ? subItems(3).map(item => <SubItemCard key={item.id ?? item.item_no} item={item} />)
                  : <p className="text-sm text-white/22 italic">ไม่มีรายการ</p>
                }
              </ModalSection>

              {/* วาระ 4 */}
              <ModalSection no={4} title={agenda4Label}>
                {subItems(4).length > 0
                  ? subItems(4).map(item => <SubItemCard key={item.id ?? item.item_no} item={item} />)
                  : <p className="text-sm text-white/22 italic">ไม่มีรายการ</p>
                }
              </ModalSection>

              {/* วาระ 5 */}
              <ModalSection no={5} title={hasAgenda6 ? 'ผลการดำเนินการ / PDCA' : 'เรื่องอื่นๆ'}>
                {subItems(5).length > 0
                  ? subItems(5).map(item => <SubItemCard key={item.id ?? item.item_no} item={item} />)
                  : <p className="text-sm text-white/22 italic">ไม่มีรายการ</p>
                }
              </ModalSection>

              {/* วาระ 6 */}
              {hasAgenda6 && (
                <ModalSection no={6} title="เรื่องอื่นๆ">
                  {subItems(6).length > 0
                    ? subItems(6).map(item => <SubItemCard key={item.id ?? item.item_no} item={item} />)
                    : <p className="text-sm text-white/22 italic">ไม่มีรายการ</p>
                  }
                </ModalSection>
              )}

              {/* มติ / ข้อสั่งการ */}
              {resolutions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-emerald-500/20" />
                    <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">มติ / ข้อสั่งการ</span>
                    <span className="h-px flex-1 bg-emerald-500/20" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {resolutions.map(r => {
                      const done = r.status === 'แล้วเสร็จ' || r.status === 'ปิดประเด็น'
                      return (
                        <div key={r.id} className={cn('glass-card-sm p-3.5 space-y-2', done && 'opacity-50')}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <span className="num text-xs font-bold text-cyan-400 shrink-0 mt-0.5">#{r.sequence_no}</span>
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-sm text-white font-medium leading-snug">{r.title}</p>
                                {r.detail && <p className="text-xs text-white/45 leading-relaxed">{r.detail}</p>}
                              </div>
                            </div>
                            <StatusPill status={r.status} />
                          </div>
                          {(r.responsible_branch || r.due_date) && (
                            <div className="flex items-center gap-3 text-[11px] text-white/30 pl-5">
                              {r.responsible_branch && <span>สาขา: {r.responsible_branch}</span>}
                              {r.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatThaiDate(r.due_date, true)}
                                </span>
                              )}
                              {r.progress_pct > 0 && <span className="text-amber-400">{r.progress_pct}%</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── main props ───────────────────────────────────────────────────────────────

interface PastMeetingEntry {
  meeting: Meeting
  resolutions: MeetingResolution[]
  hasReport: boolean
  agendaHeader: MeetingAgendaHeader | null
  agendaSubitems: MeetingAgendaSubItem[]
}

interface Props {
  meeting: Meeting
  agendaHeader: MeetingAgendaHeader | null
  agendaSubitems: MeetingAgendaSubItem[]
  pastMeetings: PastMeetingEntry[]
  agenda2RefCode: string | null
  obstacles: Obstacle[]
  nrwCurrRaw: any[]
  nrwPrevRaw: any[]
  nrwFiscalYear: number
  nrwMonth: number
  pdcaAllRows: PdcaSummaryRow[]
  pdcaPrevRows: PdcaPrevRow[]
  pdcaAreaRows: PdcaAreaRow[]
  pdcaRefMonth: number | null
  pdcaRefYear: number | null
}

export function MeetingPreviewClient({
  meeting,
  agendaHeader,
  agendaSubitems,
  pastMeetings,
  agenda2RefCode,
  obstacles,
  nrwCurrRaw,
  nrwPrevRaw,
  nrwFiscalYear,
  nrwMonth,
  pdcaAllRows,
  pdcaPrevRows,
  pdcaAreaRows,
  pdcaRefMonth,
  pdcaRefYear,
}: Props) {
  const [activeTab, setActiveTab] = useState<AgendaTab>(1)
  const [selectedPrevId, setSelectedPrevId] = useState<string | null>(() => {
    // auto-select meeting ที่ตรงกับ agenda2_ref_meeting_no (code ที่กรอกในฟอร์มวาระ)
    if (agenda2RefCode) {
      const match = pastMeetings.find(e => e.meeting.code === agenda2RefCode)
      if (match) return match.meeting.id
    }
    // fallback: meeting ที่มี report เต็ม (hasReport) แล้วค่อย fallback ไป meeting แรก
    return pastMeetings.find(e => e.hasReport)?.meeting.id ?? pastMeetings[0]?.meeting.id ?? null
  })
  const [selectedMonths, setSelectedMonths] = useState(() => monthToCount(nrwMonth))
  const [reportModalEntry, setReportModalEntry] = useState<PastMeetingEntry | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  function openReportModal(entry: PastMeetingEntry) {
    setSelectedPrevId(entry.meeting.id)
    setReportModalEntry(entry)
    requestAnimationFrame(() => requestAnimationFrame(() => setReportModalOpen(true)))
  }

  function closeReportModal() {
    setReportModalOpen(false)
    setTimeout(() => setReportModalEntry(null), 300)
  }

  const agenda4Label = agendaHeader?.agenda4_type ?? 'เรื่องสืบเนื่อง'
  const hasAgenda6 = agenda4Label === 'เรื่องสืบเนื่อง'

  // วาระ 4 (สืบเนื่อง): อุปสรรคที่เปิดก่อนวันประชุม
  const continuingObstacles = useMemo(() => {
    const cutoff = new Date(meeting.scheduled_date)
    return obstacles.filter(obs => new Date(obs.created_at) < cutoff)
  }, [obstacles, meeting.scheduled_date])

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
              href={`/meeting/${meeting.id}/report`}
              className="text-sm text-white/50 hover:text-white/80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 transition-all"
            >
              <FileText size={13} />
              แก้ไขรายงาน
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
      {activeTab === 2 && (() => {
        const selectedEntry = pastMeetings.find(e => e.meeting.id === selectedPrevId) ?? pastMeetings[0] ?? null
        const prevResolutions = selectedEntry?.resolutions ?? []
        return (
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

            {pastMeetings.length === 0 ? (
              <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
                ไม่พบรายงานการประชุมครั้งก่อน
              </div>
            ) : (
              <div className="space-y-3">
                {/* Meeting selector */}
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[10px] text-white/30 shrink-0 mt-1.5">รับรองรายงาน</span>
                  <div className="flex flex-wrap gap-1.5">
                    {pastMeetings.map(e => {
                      const isRef = agenda2RefCode ? e.meeting.code === agenda2RefCode : false
                      const isSelected = selectedPrevId === e.meeting.id
                      return (
                        <button
                          key={e.meeting.id}
                          type="button"
                          onClick={() => openReportModal(e)}
                          className={cn(
                            'text-[11px] px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5',
                            isSelected
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              : 'text-white/40 border-white/10 hover:border-white/25 hover:text-white/60'
                          )}
                        >
                          <span className="font-mono text-[10px] opacity-70">{e.meeting.code}</span>
                          <span>{e.meeting.title}</span>
                          <span className="text-[10px] opacity-60">
                            {formatThaiDate(e.meeting.scheduled_date, true)}
                          </span>
                          {e.hasReport && (
                            <span className={cn(
                              'text-[9px] px-1 py-0.5 rounded border',
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-white/5 text-white/30 border-white/10'
                            )}>
                              มีรายงาน
                            </span>
                          )}
                          {isRef && (
                            <span className={cn(
                              'text-[9px] px-1 py-0.5 rounded border',
                              isSelected
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-amber-500/10 text-amber-400/60 border-amber-500/20'
                            )}>
                              กำหนดรับรอง
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {prevResolutions.length === 0 ? (
                  <div className="glass-card-sm p-6 sm:p-8 text-center text-white/25 text-sm">
                    ไม่มีมติบันทึกไว้จากการประชุมครั้งนี้
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
              </div>
            )}

            {agendaHeader && (
              <ResolutionBadge
                type={agendaHeader.agenda2_resolution ?? 'รับทราบ'}
                detail={agendaHeader.agenda2_resolution_detail}
              />
            )}
          </div>
        )
      })()}

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

          {/* PDCA panel — show here when วาระ 4 = ติดตามผลการดำเนินการ */}
          {!hasAgenda6 && (
            <PdcaBranchPanel allRows={pdcaAllRows} prevRows={pdcaPrevRows} areaRows={pdcaAreaRows} refMonth={pdcaRefMonth} refYear={pdcaRefYear} meetingId={meeting.id} obstacles={continuingObstacles} />
          )}

          <ObstacleBranchPanel obstacles={continuingObstacles} yoyRows={nrwYoyRows} />
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

          {/* PDCA panel — show here when วาระ 5 = ติดตามผลการดำเนินการ, sorted by วาระ 3 chart */}
          {hasAgenda6 && (
            <PdcaBranchPanel allRows={pdcaAllRows} prevRows={pdcaPrevRows} areaRows={pdcaAreaRows} refMonth={pdcaRefMonth} refYear={pdcaRefYear} meetingId={meeting.id} obstacles={continuingObstacles} yoyRows={nrwYoyRows} />
          )}

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

      {/* ══ Past meeting report modal ══ */}
      <PastMeetingReportModal
        entry={reportModalEntry}
        open={reportModalOpen}
        onClose={closeReportModal}
      />

    </div>
  )
}
