'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, ExternalLink, FileText, ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import { Meeting, RequirementWithStatus } from '@/lib/types'
import { formatThaiDate, formatThaiMonthYearShort } from '@/lib/utils/date-th'

function daysUntilDate(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

interface MeetingSlideProps {
  meeting: Meeting
  requirements: RequirementWithStatus[]
}

function MeetingSlide({ meeting, requirements }: MeetingSlideProps) {
  const days = daysUntilDate(meeting.scheduled_date)
  const hasReportPeriod = meeting.report_month !== null && meeting.report_year !== null
  const isUrgent = days <= 7

  const totalReqs = requirements.length
  const pendingReqs = requirements.filter(r => r.pending_count > 0).length
  const hasReqs = totalReqs > 0

  return (
    <div className="flex items-start gap-3 py-3 px-4">
      <div className="relative mt-1 shrink-0">
        <div className="pulse-dot bg-cyan-400" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white truncate">{meeting.title}</span>
          {isUrgent && (
            <span className="text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full shrink-0">
              {days === 0 ? 'วันนี้' : `อีก ${days} วัน`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-white/50 flex items-center gap-1">
            <Calendar size={11} className="text-white/30" />
            {formatThaiDate(meeting.scheduled_date, true)} · {meeting.scheduled_time.slice(0, 5)} น.
            {meeting.location && ` · ${meeting.location}`}
          </p>

          {hasReportPeriod && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              <FileText size={10} />
              รายงาน {formatThaiMonthYearShort(meeting.report_year!, meeting.report_month!)}
            </span>
          )}

          {hasReqs && (
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
              pendingReqs === 0
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {pendingReqs === 0
                ? <><CheckCircle size={10} /> ครบทุกข้อ</>
                : <><Clock size={10} /> รอ {pendingReqs}/{totalReqs} ข้อ</>
              }
            </span>
          )}
        </div>

        {meeting.notification_message && (
          <p className="text-xs text-white/50">{meeting.notification_message}</p>
        )}
      </div>

      <Link
        href="/notify"
        className="shrink-0 text-xs text-cyan-400/70 hover:text-cyan-400 flex items-center gap-1 transition-colors"
      >
        <ExternalLink size={11} />
      </Link>
    </div>
  )
}

interface MeetingBannerProps {
  meetings: Meeting[]
  requirementsByMeetingId: Record<string, RequirementWithStatus[]>
}

export function MeetingBanner({ meetings, requirementsByMeetingId }: MeetingBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const total = meetings.length

  useEffect(() => {
    if (total <= 1 || paused) return
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total)
    }, 4000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [total, paused])

  if (total === 0) return null

  const prev = () => setCurrentIndex((i) => (i - 1 + total) % total)
  const next = () => setCurrentIndex((i) => (i + 1) % total)

  const meeting = meetings[currentIndex]
  const reqs = requirementsByMeetingId[meeting.id] ?? []

  return (
    <div
      className="glass-card-sm border-l-4 border-cyan-500"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <MeetingSlide meeting={meeting} requirements={reqs} />

      {total > 1 && (
        <div className="flex items-center justify-between px-4 pb-3 pt-0">
          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {meetings.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`rounded-full transition-all ${
                  i === currentIndex
                    ? 'w-4 h-1.5 bg-cyan-400'
                    : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`ไปยังการประชุม ${i + 1}`}
              />
            ))}
          </div>

          {/* Arrow controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="p-1 text-white/30 hover:text-white/70 transition-colors"
              aria-label="ก่อนหน้า"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-white/25 min-w-[32px] text-center">
              {currentIndex + 1}/{total}
            </span>
            <button
              onClick={next}
              className="p-1 text-white/30 hover:text-white/70 transition-colors"
              aria-label="ถัดไป"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
