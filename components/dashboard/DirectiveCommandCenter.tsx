'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DirectiveKpiHeader } from './DirectiveKpiHeader'
import { DirectiveCard } from './DirectiveCard'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DirectiveSummary, DirectiveKpis, Meeting } from '@/lib/types'

type StatusFilter = 'all' | 'ระหว่างดำเนินการ' | 'ล่าช้า' | 'แล้วเสร็จ'
type PriorityFilter = 'all' | 'สูง' | 'กลาง'

interface Props {
  initialSummaries: DirectiveSummary[]
  initialKpis: DirectiveKpis
  isAdmin: boolean
  branchCostcenter: string | null
  branchName: string | null
  meetings: Meeting[]
  filterMeetingId?: string | null
}

export function DirectiveCommandCenter({
  initialSummaries,
  initialKpis,
  isAdmin,
  branchCostcenter,
  branchName,
  meetings,
  filterMeetingId: externalMeetingFilter,
}: Props) {
  const router = useRouter()
  const [summaries, setSummaries] = useState(initialSummaries)
  const [kpis, setKpis] = useState(initialKpis)
  const [filterMeeting, setFilterMeeting] = useState<string>(externalMeetingFilter ?? 'all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all')
  const [search, setSearch] = useState('')

  // Sync initial data when props change (after router.refresh)
  useEffect(() => {
    setSummaries(initialSummaries)
    setKpis(initialKpis)
  }, [initialSummaries, initialKpis])

  // Realtime subscription — triggers router.refresh() which re-fetches server data
  const setupRealtime = useCallback(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('directive-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_resolutions' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resolution_progress_log' }, () => {
        router.refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  useEffect(() => {
    const cleanup = setupRealtime()
    return cleanup
  }, [setupRealtime])

  // Filtering
  const filtered = summaries.filter(s => {
    const r = s.resolution

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
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'ระหว่างดำเนินการ', label: 'กำลังดำเนินการ' },
    { key: 'ล่าช้า', label: 'ล่าช้า' },
    { key: 'แล้วเสร็จ', label: 'แล้วเสร็จ' },
  ]

  return (
    <div className="space-y-5">
      {/* KPI header */}
      <DirectiveKpiHeader kpis={kpis} />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Meeting filter */}
        {meetings.length > 0 && !externalMeetingFilter && (
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

        {/* Status filter pills */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
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

        {/* Priority filter */}
        <div className="flex gap-1">
          {(['all', 'สูง', 'กลาง'] as PriorityFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
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

        {/* Search */}
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
          แสดง <span className="num text-white/50">{filtered.length}</span> จาก <span className="num text-white/50">{summaries.length}</span> รายการ
        </p>
      )}

      {/* Directive cards */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-white/30 text-sm">ไม่พบมติสั่งการที่ตรงกับเงื่อนไข</p>
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
