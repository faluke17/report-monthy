'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Meeting, MeetingAcknowledgment, MeetingResolution, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'
import { MeetingAgendaForm } from '@/components/forms/MeetingAgendaForm'
import { MeetingResolutionForm } from '@/components/forms/MeetingResolutionForm'
import { ResolutionCard } from './ResolutionCard'
import { StatusPill } from '@/components/shared/StatusPill'
import { CodeBadge } from '@/components/shared/CodeBadge'
import { AckButton } from '@/components/shared/AckButton'
import { MeetingAckSummary } from '@/components/dashboard/MeetingAckSummary'
import { formatThaiDate, isOverdue, daysUntil } from '@/lib/utils/date-th'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import {
  Plus, Calendar, MapPin, Link2, Users, FileText, CheckCircle,
} from 'lucide-react'

type Tab = 'schedule' | 'agenda' | 'resolution' | 'followup'

const TYPE_COLOR: Record<string, string> = {
  'WSC-R/NRW Monthly':    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'ประชุมเร่งรัดอุปสรรค': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'KM Practice':           'bg-violet-500/20 text-violet-300 border-violet-500/30',
}

const ALL_BRANCH_NAMES = PWA_BRANCHES.map((b) => b.name_th)

interface MeetingCardProps {
  m: Meeting
  showAck: boolean
  isAdmin: boolean
  branchName: string | null
  ackedSet: Set<string>
  myAcks: MeetingAcknowledgment[]
  acksByMeeting: Record<string, MeetingAcknowledgment[]>
}

function MeetingCard({ m, showAck, isAdmin, branchName, ackedSet, myAcks, acksByMeeting }: MeetingCardProps) {
  const days = daysUntil(m.scheduled_date)
  const typeClass = TYPE_COLOR[m.meeting_type] ?? 'bg-white/10 text-white/50 border-white/15'
  const isAcked = ackedSet.has(m.id)
  const myAck = myAcks.find((a) => a.meeting_id === m.id)
  const acks = acksByMeeting[m.id] ?? []

  return (
    <div className="glass-card-sm p-5 border-l-4 border-cyan-500/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {m.meeting_type && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${typeClass}`}>
                {m.meeting_type}
              </span>
            )}
            {days !== null && days <= 7 && m.status === 'กำหนดแล้ว' && (
              <span className="text-[11px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                {days === 0 ? 'วันนี้' : `อีก ${days} วัน`}
              </span>
            )}
          </div>

          <p className="font-bold text-white text-sm leading-snug">{m.title}</p>

          <div className="space-y-0.5">
            <p className="text-xs text-white/50 flex items-center gap-1.5">
              <Calendar size={11} className="text-white/30" />
              {formatThaiDate(m.scheduled_date)} · {m.scheduled_time.slice(0, 5)} น.
            </p>
            {m.location && (
              <p className="text-xs text-white/45 flex items-center gap-1.5">
                <MapPin size={11} className="text-white/30" />
                {m.location}
              </p>
            )}
            {m.meeting_link && (
              <a
                href={m.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 truncate"
              >
                <Link2 size={11} />
                {m.meeting_link}
              </a>
            )}
          </div>

          {(m.target_audience || m.prep_required) && (
            <div className="border-t border-white/8 pt-2 space-y-1">
              {m.target_audience && (
                <p className="text-xs text-white/40 flex items-center gap-1.5">
                  <Users size={11} className="text-white/25" />
                  กลุ่มเป้าหมาย: <span className="text-white/60">{m.target_audience}</span>
                </p>
              )}
              {m.prep_required && (
                <p className="text-xs text-amber-400 flex items-start gap-1.5">
                  <FileText size={11} className="mt-0.5 shrink-0" />
                  {m.prep_required}
                </p>
              )}
              {m.notification_message && (
                <p className="text-xs text-white/40">{m.notification_message}</p>
              )}
            </div>
          )}
        </div>

        {showAck && (
          <div className="shrink-0">
            {isAdmin ? (
              <MeetingAckSummary acks={acks} allBranches={ALL_BRANCH_NAMES} />
            ) : (
              branchName && (
                isAcked ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg">
                    <CheckCircle size={12} />
                    <span>
                      รับทราบแล้ว
                      {myAck && (
                        <span className="block text-[10px] text-emerald-400/60">
                          {new Date(myAck.acknowledged_at).toLocaleDateString('th-TH', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <AckButton meetingId={m.id} />
                )
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  latestMeeting: Meeting | null
  prevMeeting: Meeting | null
  latestResolutions: MeetingResolution[]
  prevResolutions: MeetingResolution[]
  upcomingMeetings: Meeting[]
  pastMeetings: Meeting[]
  acksByMeeting: Record<string, MeetingAcknowledgment[]>
  myAcks: MeetingAcknowledgment[]
  isAdmin: boolean
  branchName: string | null
  agendaHeader: MeetingAgendaHeader | null
  agendaSubitems: MeetingAgendaSubItem[]
}

export function MeetingView({
  latestMeeting,
  prevMeeting,
  latestResolutions,
  prevResolutions,
  upcomingMeetings,
  pastMeetings,
  acksByMeeting,
  myAcks,
  isAdmin,
  branchName,
  agendaHeader,
  agendaSubitems,
}: Props) {
  const [tab, setTab] = useState<Tab>('schedule')
  const [showResolutionForm, setShowResolutionForm] = useState(false)

  const ackedSet = new Set(myAcks.map((a) => a.meeting_id))

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'schedule',   label: 'ตารางประชุม',        count: upcomingMeetings.length },
    { key: 'agenda',     label: 'วาระการประชุม' },
    { key: 'resolution', label: 'มติ / ข้อสั่งการ',   count: latestResolutions.length },
    { key: 'followup',   label: 'ติดตามมติเดือนก่อน', count: prevResolutions.length },
  ]

  return (
    <div className="space-y-5 animate-fadein">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">วาระ / มติ / สั่งการ</h1>
          {latestMeeting ? (
            <>
              <p className="text-sm text-white/40 mt-0.5">{latestMeeting.title}</p>
              <p className="text-xs text-white/30 mt-0.5">
                {formatThaiDate(latestMeeting.scheduled_date)} · {latestMeeting.scheduled_time.slice(0, 5)} น.
                {latestMeeting.location && ` · ${latestMeeting.location}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-white/40 mt-0.5">ติดตามวาระการประชุมและมติสั่งการ</p>
          )}
        </div>
        {latestMeeting && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <CodeBadge code={latestMeeting.code} />
            <StatusPill status={latestMeeting.status} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-3 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              tab === t.key
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'text-white/40 hover:text-white/70 border border-transparent'
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  tab === t.key ? 'bg-cyan-500/25 text-cyan-300' : 'bg-white/10 text-white/40'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ Tab 0: ตารางประชุม ══ */}
      {tab === 'schedule' && (
        <div className="space-y-6 max-w-2xl">
          {isAdmin && (
            <div className="flex justify-end">
              <Link
                href="/meeting/setup"
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                <Plus size={15} />
                สร้างการประชุม
              </Link>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">การประชุมที่กำหนดไว้</h2>
            {upcomingMeetings.length === 0 ? (
              <div className="glass-card-sm p-8 text-center text-white/30 text-sm">
                ยังไม่มีการประชุมที่กำหนดไว้
                {isAdmin && (
                  <div className="mt-3">
                    <Link
                      href="/meeting/setup"
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      <Plus size={12} /> สร้างการประชุมใหม่
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              upcomingMeetings.map((m) => (
                <MeetingCard
                  key={m.id} m={m} showAck
                  isAdmin={isAdmin} branchName={branchName}
                  ackedSet={ackedSet} myAcks={myAcks} acksByMeeting={acksByMeeting}
                />
              ))
            )}
          </div>

          {pastMeetings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">ประชุมล่าสุด</h2>
              {pastMeetings.map((m) => (
                <MeetingCard
                  key={m.id} m={m} showAck={false}
                  isAdmin={isAdmin} branchName={branchName}
                  ackedSet={ackedSet} myAcks={myAcks} acksByMeeting={acksByMeeting}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ Tab 1: วาระการประชุม ══ */}
      {tab === 'agenda' && (
        !latestMeeting ? (
          <div className="glass-card p-12 text-center">
            <p className="text-white/30 mb-3 text-sm">ยังไม่มีการประชุม</p>
            <Link
              href="/meeting/setup"
              className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} />
              สร้างการประชุม
            </Link>
          </div>
        ) : (
          <MeetingAgendaForm
            meeting={latestMeeting}
            initialHeader={agendaHeader}
            initialSubitems={agendaSubitems}
            isAdmin={isAdmin}
          />
        )
      )}

      {/* ══ Tab 2: มติ / ข้อสั่งการ ══ */}
      {tab === 'resolution' && (
        !latestMeeting ? (
          <div className="glass-card p-12 text-center text-white/30 text-sm">
            ยังไม่มีการประชุม
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-white/40">
                ข้อสั่งการจาก{' '}
                <b className="text-white/60">{latestMeeting.title}</b>
                {latestResolutions.length > 0 && (
                  <span className="ml-2 text-white/25">({latestResolutions.length} ข้อ)</span>
                )}
              </p>
              {isAdmin && (
                <button
                  onClick={() => setShowResolutionForm(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                    showResolutionForm
                      ? 'bg-white/8 text-white/50 border-white/15 hover:bg-white/12'
                      : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25'
                  )}
                >
                  <Plus size={13} />
                  {showResolutionForm ? 'ยกเลิก' : 'เพิ่มข้อสั่งการ'}
                </button>
              )}
            </div>

            {/* Add form (collapsed by default) */}
            {isAdmin && showResolutionForm && (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/3 p-4 space-y-3">
                <p className="text-xs font-semibold text-cyan-400/80">เพิ่มข้อสั่งการใหม่</p>
                <MeetingResolutionForm
                  meeting={latestMeeting}
                  sequenceStart={latestResolutions.length + 1}
                  onSaved={() => setShowResolutionForm(false)}
                />
              </div>
            )}

            {/* Resolution list */}
            {latestResolutions.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <p className="text-white/30 text-sm">ยังไม่มีข้อสั่งการสำหรับการประชุมนี้</p>
                {isAdmin && !showResolutionForm && (
                  <button
                    onClick={() => setShowResolutionForm(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    สร้างข้อสั่งการแรก
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {latestResolutions.map(r => (
                  <ResolutionCard
                    key={r.id}
                    r={r}
                    isAdmin={isAdmin}
                    branchName={branchName}
                  />
                ))}
              </div>
            )}
          </div>
        )
      )}

      {/* ══ Tab 3: ติดตามมติเดือนก่อน ══ */}
      {tab === 'followup' && (
        <div className="space-y-4">
          {prevMeeting ? (
            <>
              <p className="text-xs text-white/40">
                ติดตามมติจาก:{' '}
                <b className="text-white/60">{prevMeeting.title}</b>
                {' '}· {formatThaiDate(prevMeeting.scheduled_date)}
              </p>

              {prevResolutions.length === 0 ? (
                <div className="glass-card p-10 text-center text-white/30 text-sm">
                  ไม่มีข้อสั่งการที่บันทึกไว้จากการประชุมครั้งก่อน
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/3">
                          <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-2.5">ลำดับ</th>
                          <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-3 py-2.5">ข้อสั่งการ</th>
                          <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-3 py-2.5">ผู้รับผิดชอบ</th>
                          <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-3 py-2.5">กำหนด</th>
                          <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-3 py-2.5 pr-4">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/6">
                        {prevResolutions.map(r => {
                          const done = r.status === 'แล้วเสร็จ' || r.status === 'ปิดประเด็น'
                          const overdue = isOverdue(r.due_date) && !done
                          return (
                            <tr
                              key={r.id}
                              className={cn('hover:bg-white/3 transition-colors', done ? 'opacity-55' : '')}
                            >
                              <td className="px-4 py-3 num text-xs font-bold text-cyan-400">#{r.sequence_no}</td>
                              <td className="px-3 py-3 text-sm text-white max-w-xs">{r.title}</td>
                              <td className="px-3 py-3 text-xs text-white/45">{r.responsible_party || '—'}</td>
                              <td className="px-3 py-3">
                                {r.due_date ? (
                                  <span className={cn('num text-xs', overdue ? 'text-red-400' : 'text-white/40')}>
                                    {formatThaiDate(r.due_date, true)}
                                  </span>
                                ) : (
                                  <span className="text-white/20">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 pr-4">
                                <StatusPill status={r.status} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-10 text-center text-white/30 text-sm">
              ยังไม่มีการประชุมก่อนหน้า
            </div>
          )}
        </div>
      )}
    </div>
  )
}
