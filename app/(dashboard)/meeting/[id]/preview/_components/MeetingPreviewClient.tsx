'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type {
  Meeting,
  MeetingAgendaHeader,
  MeetingAgendaSubItem,
  MeetingResolution,
  Obstacle,
} from '@/lib/types'
import { formatThaiDate } from '@/lib/utils/date-th'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { StatusPill } from '@/components/shared/StatusPill'
import { ChevronLeft, Calendar, MapPin, Link2, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

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
}

export function MeetingPreviewClient({
  meeting,
  agendaHeader,
  agendaSubitems,
  prevMeeting,
  prevResolutions,
  obstacles,
}: Props) {
  const [activeTab, setActiveTab] = useState<AgendaTab>(1)
  const [selectedBranch, setSelectedBranch] = useState<string>('') // '' = all

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

  const TABS: { key: AgendaTab; label: string }[] = [
    { key: 1, label: 'วาระ 1' },
    { key: 2, label: 'วาระ 2' },
    { key: 3, label: 'วาระ 3' },
    { key: 4, label: 'วาระ 4' },
    { key: 5, label: 'วาระ 5' },
    ...(hasAgenda6 ? [{ key: 6 as AgendaTab, label: 'วาระ 6' }] : []),
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadein">

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
      <div className="glass-card p-5 space-y-4 accent-bar-cyan">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="page-kicker">ดูตัวอย่างวาระการประชุม</p>
            <h1 className="text-lg font-bold text-white leading-snug">{meeting.title}</h1>
          </div>
          <StatusPill status={meeting.status} />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-white/50">
            <Calendar size={12} className="text-white/30" />
            {formatThaiDate(meeting.scheduled_date)} · {meeting.scheduled_time.slice(0, 5)} น.
          </div>
          {meeting.location && (
            <div className="flex items-center gap-2 text-white/50">
              <MapPin size={12} className="text-white/30" />
              {meeting.location}
            </div>
          )}
          {meeting.meeting_link && (
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 col-span-2 truncate"
            >
              <Link2 size={12} />
              {meeting.meeting_link}
            </a>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/8">
          <p className="text-xs text-white/30">
            {agendaHeader ? `${TABS.length} วาระ · กรอกข้อมูลแล้ว` : 'ยังไม่ได้กรอกวาระ'}
          </p>
          <Link
            href={`/meeting`}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <FileText size={11} />
            แก้ไขวาระ
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-white/10 pb-3 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
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
            <div className="glass-card-sm p-8 text-center text-white/25 text-sm">
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
                <div className="glass-card-sm p-8 text-center text-white/25 text-sm">
                  ไม่มีมติบันทึกไว้จากการประชุมครั้งก่อน
                </div>
              ) : (
                <div className="space-y-2">
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
            <div className="glass-card-sm p-8 text-center text-white/25 text-sm">
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
            <div className="glass-card-sm p-8 text-center text-white/25 text-sm">
              ยังไม่มีรายการเรื่องเพื่อทราบ
            </div>
          ) : (
            <div className="space-y-3">
              {items(3).map((item) => <SubItemCard key={item.id ?? item.item_no} item={item} />)}
            </div>
          )}
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
              <div className="glass-card-sm p-8 text-center text-white/25 text-sm">
                {selectedBranch ? `สาขา${selectedBranch}ไม่มีอุปสรรคที่เปิดอยู่` : 'ไม่มีอุปสรรคที่เปิดอยู่'}
              </div>
            ) : (
              <div className="space-y-3">
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
            <div className="glass-card-sm p-8 text-center text-white/25 text-sm">
              ยังไม่มีรายการในวาระที่ 5
            </div>
          ) : (
            <div className="space-y-3">
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
            <div className="glass-card-sm p-8 text-center text-white/25 text-sm">
              ยังไม่มีรายการในวาระที่ 6
            </div>
          ) : (
            <div className="space-y-3">
              {items(6).map((item) => <SubItemCard key={item.id ?? item.item_no} item={item} />)}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
