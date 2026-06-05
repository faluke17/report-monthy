'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DirectiveKpiHeader } from './DirectiveKpiHeader'
import { DirectiveCard } from './DirectiveCard'
import { Search, Calendar, MapPin, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatThaiDate } from '@/lib/utils/date-th'
import type { DirectiveSummary, DirectiveKpis, Meeting } from '@/lib/types'

type StatusFilter = 'all' | 'ระหว่างดำเนินการ' | 'ล่าช้า' | 'แล้วเสร็จ'
type PriorityFilter = 'all' | 'สูง' | 'กลาง'

const MEETING_TYPE_COLOR: Record<string, string> = {
  'WSC-R/NRW Monthly':    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'ประชุมเร่งรัดอุปสรรค': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'KM Practice':           'bg-violet-500/20 text-violet-300 border-violet-500/30',
}

interface Props {
  initialSummaries: DirectiveSummary[]
  initialKpis: DirectiveKpis
  isAdmin: boolean
  branchCostcenter: string | null
  branchName: string | null
  meetings: Meeting[]
  defaultMeetingId?: string | null
}

export function DirectiveCommandCenter({
  initialSummaries,
  initialKpis,
  isAdmin,
  branchCostcenter,
  branchName,
  meetings,
  defaultMeetingId,
}: Props) {
  const router = useRouter()
  const [filterMeeting, setFilterMeeting] = useState<string>(defaultMeetingId ?? 'all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all')
  const [search, setSearch] = useState('')
  const [showOnlyMine, setShowOnlyMine] = useState(!isAdmin)

  const setupRealtime = useCallback(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('directive-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_resolutions' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resolution_progress_log' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items' }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  useEffect(() => {
    const cleanup = setupRealtime()
    return cleanup
  }, [setupRealtime])

  const activeMeeting = filterMeeting !== 'all'
    ? meetings.find(m => m.id === filterMeeting) ?? null
    : null

  const filtered = initialSummaries.filter(s => {
    const r = s.resolution

    // Branch: show only mine by default
    if (!isAdmin && showOnlyMine && branchCostcenter) {
      const mine = s.branch_statuses.some(bs => bs.branch_costcenter === branchCostcenter)
      if (!mine) return false
    }

    if (filterMeeting !== 'all' && r.meeting_id !== filterMeeting) return false

    if (filterStatus !== 'all') {
      if (filterStatus === 'ล่าช้า') {
        const isDelayed = r.due_date && new Date(r.due_date) < new Date() &&
          r.status !== 'แล้วเสร็จ' && r.status !== 'ปิดประเด็น'
        if (!isDelayed) return false
      } else if (filterStatus === 'แล้วเสร็จ') {
        if (r.status !== 'แล้วเสร็จ' && r.status !== 'ปิดประเด็น') return false
      } else if (filterStatus === 'ระหว่างดำเนินการ') {
        if (r.status !== 'ระหว่างดำเนินการ' && r.status !== 'รอดำเนินการ') return false
      }
    }

    if (filterPriority !== 'all' && r.priority !== filterPriority) return false

    if (search) {
      const q = search.toLowerCase()
      return (
        r.title.toLowerCase().includes(q) ||
        (r.detail ?? '').toLowerCase().includes(q) ||
        (r.responsible_branch ?? '').toLowerCase().includes(q)
      )
    }

    return true
  })

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',              label: 'ทั้งหมด' },
    { key: 'ระหว่างดำเนินการ', label: 'กำลังดำเนินการ' },
    { key: 'ล่าช้า',           label: 'ล่าช้า' },
    { key: 'แล้วเสร็จ',        label: 'แล้วเสร็จ' },
  ]

  // Count mine (for branch user badge)
  const myCount = !isAdmin && branchCostcenter
    ? initialSummaries.filter(s => s.branch_statuses.some(bs => bs.branch_costcenter === branchCostcenter)).length
    : 0

  return (
    <div className="space-y-5">

      {/* Meeting context banner */}
      {activeMeeting && (
        <div className="glass-card-sm px-4 py-3 border-l-4 border-cyan-500/50 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {activeMeeting.meeting_type && (
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border',
                MEETING_TYPE_COLOR[activeMeeting.meeting_type] ?? 'bg-white/10 text-white/50 border-white/15'
              )}>
                {activeMeeting.meeting_type}
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/12">
              {activeMeeting.status}
            </span>
          </div>
          <p className="font-semibold text-white text-sm leading-snug">{activeMeeting.title}</p>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <Calendar size={10} className="text-white/25" />
              {formatThaiDate(activeMeeting.scheduled_date)} · {activeMeeting.scheduled_time.slice(0, 5)} น.
            </span>
            {activeMeeting.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={10} className="text-white/25" />
                {activeMeeting.location}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Branch: my tasks banner */}
      {!isAdmin && branchCostcenter && myCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ListFilter size={13} className="text-cyan-400 shrink-0" />
            <span className="text-xs text-white/60">
              {showOnlyMine
                ? <>แสดงเฉพาะงานของ <span className="text-cyan-400 font-medium">{branchName}</span> ({myCount} รายการ)</>
                : <span className="text-white/40">แสดงมติทั้งหมด</span>
              }
            </span>
          </div>
          <button
            onClick={() => setShowOnlyMine(v => !v)}
            className="text-[11px] font-semibold text-cyan-400/70 hover:text-cyan-400 transition-colors whitespace-nowrap"
          >
            {showOnlyMine ? 'ดูทั้งหมด' : 'แสดงแค่งานของฉัน'}
          </button>
        </div>
      )}

      {/* KPI header — clickable */}
      <DirectiveKpiHeader
        kpis={initialKpis}
        activeFilter={filterStatus}
        onFilterChange={f => setFilterStatus(f)}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {meetings.length > 0 && (
          <select
            value={filterMeeting}
            onChange={e => setFilterMeeting(e.target.value)}
            className="bg-[#0c1a30] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/40"
          >
            <option value="all">ทุกการประชุม</option>
            {meetings.map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(filterStatus === f.key ? 'all' : f.key)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                filterStatus === f.key
                  ? f.key === 'ล่าช้า'
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : f.key === 'แล้วเสร็จ'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                  : 'text-white/35 border-transparent hover:text-white/60 hover:border-white/15'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(['all', 'สูง', 'กลาง'] as PriorityFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(filterPriority === p ? 'all' : p)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs border transition-all',
                filterPriority === p
                  ? p === 'สูง'
                    ? 'bg-red-500/15 text-red-400 border-red-500/25'
                    : p === 'กลาง'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                    : 'bg-white/10 text-white/60 border-white/20'
                  : 'text-white/30 border-transparent hover:text-white/50 hover:border-white/15'
              )}
            >
              {p === 'all' ? 'ทุกระดับ' : p}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหามติ..."
            className="pl-8 pr-3 py-1.5 bg-[#0c1a30] border border-white/12 rounded-lg text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/40 w-44"
          />
        </div>
      </div>

      {/* Result count */}
      {(filterStatus !== 'all' || filterPriority !== 'all' || search || filterMeeting !== 'all') && (
        <p className="text-xs text-white/30">
          แสดง <span className="num text-white/50">{filtered.length}</span> จาก{' '}
          <span className="num text-white/50">{initialSummaries.length}</span> รายการ
        </p>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-white/30 text-sm">ไม่พบมติสั่งการที่ตรงกับเงื่อนไข</p>
          {!isAdmin && showOnlyMine && myCount === 0 && (
            <p className="text-xs text-white/20 mt-1">ยังไม่มีมติที่ถูกมอบหมายให้สาขาของคุณ</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(summary => (
            <DirectiveCard
              key={summary.resolution.id}
              summary={summary}
              isAdmin={isAdmin}
              branchCostcenter={branchCostcenter}
              branchName={branchName}
            />
          ))}
        </div>
      )}
    </div>
  )
}
