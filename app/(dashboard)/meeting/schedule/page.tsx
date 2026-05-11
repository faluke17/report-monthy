import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Meeting, MeetingAcknowledgment } from '@/lib/types'
import { formatThaiDate, daysUntil } from '@/lib/utils/date-th'
import { Plus, Calendar, MapPin, Link2, Users, FileText, CheckCircle } from 'lucide-react'
import { MeetingAckSummary } from '@/components/dashboard/MeetingAckSummary'
import { AckButton } from '@/components/shared/AckButton'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'

const ALL_BRANCH_NAMES = PWA_BRANCHES.map((b) => b.name_th)

export const dynamic = 'force-dynamic'

const TYPE_COLOR: Record<string, string> = {
  'WSC-R/NRW Monthly':    'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'ประชุมเร่งรัดอุปสรรค': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'KM Practice':           'bg-violet-500/20 text-violet-300 border-violet-500/30',
}

export default async function MeetingSchedulePage() {
  const supabase = await createClient()
  const session = await getPwaSession()
  const today = new Date().toISOString().split('T')[0]
  const isAdmin = !session?.branch_name

  const { data: upcoming } = await supabase
    .from('meetings')
    .select('*')
    .eq('status', 'กำหนดแล้ว')
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })

  const { data: past } = await supabase
    .from('meetings')
    .select('*')
    .in('status', ['เสร็จสิ้น', 'เลื่อน', 'ยกเลิก'])
    .order('scheduled_date', { ascending: false })
    .limit(5)

  const upcomingRows = (upcoming ?? []) as Meeting[]
  const pastRows = (past ?? []) as Meeting[]
  const allIds = [...upcomingRows, ...pastRows].map((m) => m.id)

  let acksByMeeting: Record<string, MeetingAcknowledgment[]> = {}
  let myAcks: MeetingAcknowledgment[] = []

  if (allIds.length > 0) {
    if (isAdmin) {
      const { data: ackData } = await supabase
        .from('meeting_acknowledgments')
        .select('*')
        .in('meeting_id', allIds)
      const acks = (ackData ?? []) as MeetingAcknowledgment[]
      for (const a of acks) {
        if (!acksByMeeting[a.meeting_id]) acksByMeeting[a.meeting_id] = []
        acksByMeeting[a.meeting_id].push(a)
      }
    } else if (session?.branch_name) {
      const { data: ackData } = await supabase
        .from('meeting_acknowledgments')
        .select('*')
        .in('meeting_id', allIds)
        .eq('branch_name', session.branch_name)
      myAcks = (ackData ?? []) as MeetingAcknowledgment[]
    }
  }

  const ackedSet = new Set(myAcks.map((a) => a.meeting_id))

  function MeetingCard({ m, showAck }: { m: Meeting; showAck: boolean }) {
    const days = daysUntil(m.scheduled_date)
    const typeClass = TYPE_COLOR[m.meeting_type] ?? 'bg-white/10 text-white/50 border-white/15'
    const isAcked = ackedSet.has(m.id)
    const myAck = myAcks.find((a) => a.meeting_id === m.id)
    const acks = acksByMeeting[m.id] ?? []

    return (
      <div className="glass-card-sm p-5 border-l-4 border-cyan-500/60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">

            {/* Header row */}
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

            {/* Title */}
            <p className="font-bold text-white text-sm leading-snug">{m.title}</p>

            {/* Date / Location */}
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

            {/* Audience + Prep */}
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

            {/* Admin: preview link */}
            {isAdmin && (
              <div className="pt-1">
                <Link
                  href={`/meeting/${m.id}/preview`}
                  className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400/70 hover:text-cyan-400 transition-colors"
                >
                  <FileText size={10} />
                  ดูตัวอย่างวาระ
                </Link>
              </div>
            )}
          </div>

          {/* Right: ack status */}
          {showAck && (
            <div className="shrink-0">
              {isAdmin ? (
                <MeetingAckSummary acks={acks} allBranches={ALL_BRANCH_NAMES} />
              ) : (
                session?.branch_name && (
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

  return (
    <div className="space-y-6 max-w-2xl animate-fadein">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">กำหนดการประชุม</h1>
          <p className="text-sm text-white/40 mt-0.5">ตารางและการแจ้งเตือนการประชุม WSC-R</p>
        </div>
        {isAdmin && (
          <Link
            href="/meeting/setup"
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus size={15} />
            สร้างการประชุม
          </Link>
        )}
      </div>

      {/* Upcoming */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">การประชุมที่กำหนดไว้</h2>
        {upcomingRows.length === 0 ? (
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
          upcomingRows.map((m) => <MeetingCard key={m.id} m={m} showAck />)
        )}
      </div>

      {/* Past */}
      {pastRows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">ประชุมล่าสุด</h2>
          {pastRows.map((m) => <MeetingCard key={m.id} m={m} showAck={false} />)}
        </div>
      )}
    </div>
  )
}
