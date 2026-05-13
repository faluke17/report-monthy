import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Meeting, MeetingAcknowledgment, ResolutionNotification } from '@/lib/types'
import { formatThaiDate, daysUntil } from '@/lib/utils/date-th'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { Calendar, CheckCircle, Clock, FileText, AlertTriangle, BookOpen, Bell } from 'lucide-react'
import { AckButton } from '@/components/shared/AckButton'
import { NotificationAckButton } from '@/components/shared/NotificationAckButton'

export const dynamic = 'force-dynamic'

export default async function NotifyPage() {
  const supabase = await createClient()
  const session = await getPwaSession()
  const today = new Date().toISOString().split('T')[0]

  const branchCostcenter = session?.costcenter || null
  const isRegion = !branchCostcenter

  // Upcoming meetings — only those where admin has sent notification
  const { data } = await supabase
    .from('meetings')
    .select('*')
    .eq('status', 'กำหนดแล้ว')
    .gte('scheduled_date', today)
    .not('notified_at', 'is', null)
    .order('scheduled_date', { ascending: true })

  const meetings = (data ?? []) as Meeting[]

  let myAcks: MeetingAcknowledgment[] = []
  if (session?.costcenter && meetings.length > 0) {
    const meetingIds = meetings.map((m) => m.id)
    const { data: ackData } = await supabase
      .from('meeting_acknowledgments')
      .select('*')
      .in('meeting_id', meetingIds)
      .eq('branch_name', session.branch_name)
    myAcks = (ackData ?? []) as MeetingAcknowledgment[]
  }

  const ackedSet = new Set(myAcks.map((a) => a.meeting_id))

  // Resolution notifications — all branches for region users, own branch for branch users
  let resolutionNotifs: ResolutionNotification[] = []
  {
    let q = supabase
      .from('resolution_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (!isRegion) q = q.eq('branch_costcenter', branchCostcenter)
    const { data: notifData } = await q
    resolutionNotifs = (notifData ?? []) as ResolutionNotification[]
  }

  const unreadCount = resolutionNotifs.filter(n => !n.is_read).length
  const branchLabel = isRegion
    ? 'ทุกสาขา'
    : (PWA_BRANCHES.find(b => b.costcenter === branchCostcenter)?.name_th ?? branchCostcenter)

  return (
    <div className="space-y-6 max-w-2xl animate-fadein">
      <div>
        <h1 className="text-xl font-bold text-white">การแจ้งเตือน</h1>
        <p className="text-sm text-white/40 mt-0.5">ข้อมูลการประชุมและข้อสั่งการ</p>
      </div>

      {/* Resolution notifications */}
      {(branchCostcenter || isRegion) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">ข้อสั่งการสำหรับสาขา</h2>
            {unreadCount > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                {unreadCount} ใหม่
              </span>
            )}
          </div>

          {resolutionNotifs.length === 0 ? (
            <div className="glass-card-sm p-6 text-center text-white/30 text-sm">
              ยังไม่มีข้อสั่งการสำหรับ{isRegion ? 'ทุกสาขา' : `สาขา${branchLabel}`}
            </div>
          ) : (
            <div className="space-y-2">
              {resolutionNotifs.map(n => (
                <div
                  key={n.id}
                  className={`glass-card-sm p-4 border-l-4 transition-opacity ${
                    n.is_read ? 'border-white/15 opacity-60' : 'border-cyan-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Bell size={12} className={n.is_read ? 'text-white/25' : 'text-cyan-400'} />
                        <span className={`text-xs font-semibold ${n.is_read ? 'text-white/50' : 'text-white'}`}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        )}
                      </div>
                      {n.detail && (
                        <p className="text-xs text-white/45 leading-relaxed pl-5 line-clamp-3">{n.detail}</p>
                      )}
                      <p className="text-[10px] text-white/25 pl-5">
                        {new Date(n.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <NotificationAckButton notificationId={n.id} />
                    )}
                    {n.is_read && (
                      <div className="flex items-center gap-1 text-[10px] text-white/25 shrink-0">
                        <CheckCircle size={11} />
                        รับทราบแล้ว
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming meetings */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">การประชุมที่จะถึง</h2>
        {meetings.length === 0 ? (
          <div className="glass-card-sm p-6 text-center text-white/30 text-sm">
            ไม่มีการประชุมที่กำหนดในขณะนี้
          </div>
        ) : (
          meetings.map((m) => {
            const days = daysUntil(m.scheduled_date)
            const isAcked = ackedSet.has(m.id)
            const myAck = myAcks.find((a) => a.meeting_id === m.id)
            return (
              <div key={m.id} className="glass-card-sm p-5 border-l-4 border-cyan-500">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Calendar size={14} className="text-cyan-400 shrink-0" />
                      <span className="font-bold text-white text-sm">{m.title}</span>
                      {days !== null && days <= 7 && (
                        <span className="text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          {days === 0 ? 'วันนี้' : `อีก ${days} วัน`}
                        </span>
                      )}
                      {m.meeting_type && (
                        <span className="text-[11px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                          {m.meeting_type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50">
                      {formatThaiDate(m.scheduled_date)} · {m.scheduled_time.slice(0, 5)} น.
                      {m.location && ` · ${m.location}`}
                    </p>
                    {m.meeting_link && (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 truncate block mt-0.5"
                      >
                        🔗 {m.meeting_link}
                      </a>
                    )}
                    {m.prep_required && (
                      <p className="text-sm text-amber-400 mt-2">⚠ สิ่งที่ต้องเตรียม: {m.prep_required}</p>
                    )}
                    {m.notification_message && (
                      <p className="text-sm text-white/50 mt-1">{m.notification_message}</p>
                    )}
                  </div>

                  {session?.costcenter && (
                    <div className="shrink-0 mt-0.5">
                      {isAcked ? (
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {meetings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Checklist ก่อนประชุม</h2>
          <div className="glass-card p-5 space-y-2">
            {[
              { icon: FileText,      label: 'รายงานรายเดือนล่าสุด',    href: '/monthly/new' },
              { icon: AlertTriangle, label: 'อัปเดตสถานะอุปสรรค',      href: '/obstacle' },
              { icon: CheckCircle,   label: 'อัปเดต Action Items',      href: '/action' },
              { icon: BookOpen,      label: 'เตรียม KM Case (ถ้ามี)',   href: '/km' },
            ].map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              >
                <Icon size={15} className="text-cyan-400 shrink-0" />
                <span className="text-sm text-white">{label}</span>
                <Clock size={12} className="ml-auto text-white/25" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
