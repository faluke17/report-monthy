'use client'

import Link from 'next/link'
import { Calendar, ExternalLink } from 'lucide-react'
import { Meeting } from '@/lib/types'
import { formatThaiDate } from '@/lib/utils/date-th'

interface MeetingBannerProps {
  meeting: Meeting
}

export function MeetingBanner({ meeting }: MeetingBannerProps) {
  const date = new Date(meeting.scheduled_date)
  const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isWithin7Days = daysUntil <= 7 && daysUntil >= 0

  return (
    <div className="glass-card-sm p-4 border-l-4 border-cyan-500 flex items-start gap-3">
      <div className="relative mt-0.5">
        <div className="pulse-dot bg-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} className="text-cyan-400 shrink-0" />
          <span className="text-sm font-semibold text-white">{meeting.title}</span>
          {isWithin7Days && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
              ใน {daysUntil === 0 ? 'วันนี้' : `${daysUntil} วัน`}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mt-0.5">
          {formatThaiDate(meeting.scheduled_date)} · {meeting.scheduled_time.slice(0, 5)} น.
          {meeting.location && ` · ${meeting.location}`}
        </p>
        {meeting.notification_message && (
          <p className="text-xs text-white/60 mt-1">{meeting.notification_message}</p>
        )}
      </div>
      <Link
        href="/notify"
        className="shrink-0 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
      >
        รายละเอียด <ExternalLink size={11} />
      </Link>
    </div>
  )
}
