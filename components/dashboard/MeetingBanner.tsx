'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Calendar, ExternalLink, FileText, ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import { Meeting, RequirementWithStatus } from '@/lib/types'
import { formatThaiDate, formatThaiMonthYearShort } from '@/lib/utils/date-th'

function daysUntilDate(dateStr: string): number {
  const d = new Date(dateStr), now = new Date()
  now.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

interface MeetingSlideProps {
  meeting:      Meeting
  requirements: RequirementWithStatus[]
}

function MeetingSlide({ meeting, requirements }: MeetingSlideProps) {
  const days          = daysUntilDate(meeting.scheduled_date)
  const hasReportPeriod = meeting.report_month !== null && meeting.report_year !== null
  const isUrgent      = days <= 3
  const isSoon        = days <= 7 && days > 3

  const totalReqs   = requirements.length
  const pendingReqs = requirements.filter(r => r.pending_count > 0).length
  const hasReqs     = totalReqs > 0

  const urgencyColor = isUrgent ? '#B3392C' : isSoon ? '#A8721A' : '#0B6E76'

  return (
    <div className="flex items-start gap-3 py-3.5 px-4">
      {/* Status dot */}
      <div className="relative mt-1 shrink-0">
        <div
          className="pulse-dot"
          style={{ background: urgencyColor, color: urgencyColor }}
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Title + urgency */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-semibold truncate" style={{ color: '#12181F' }}>
            {meeting.title}
          </span>
          {days <= 7 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
              style={{
                background: isUrgent ? 'rgba(179,57,44,.14)' : 'rgba(168,114,26,.12)',
                color: isUrgent ? '#B3392C' : '#A8721A',
                border: `1px solid ${isUrgent ? 'rgba(179,57,44,.26)' : 'rgba(168,114,26,.24)'}`,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {days === 0 ? 'วันนี้' : `T-${days}d`}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-[11px] flex items-center gap-1" style={{ color: '#4B5563' }}>
            <Calendar size={10} style={{ color: '#8896A3' }} />
            {formatThaiDate(meeting.scheduled_date, true)} · {meeting.scheduled_time.slice(0, 5)} น.
            {meeting.location && ` · ${meeting.location}`}
          </p>

          {hasReportPeriod && (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded"
              style={{
                background: 'rgba(11,110,118,.12)',
                color: '#0B6E76',
                border: '1px solid rgba(11,110,118,.22)',
              }}
            >
              <FileText size={9} />
              รายงาน {formatThaiMonthYearShort(meeting.report_year!, meeting.report_month!)}
            </span>
          )}

          {hasReqs && (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded"
              style={pendingReqs === 0
                ? { background: 'rgba(30,122,90,.10)',  color: '#1E7A5A', border: '1px solid rgba(30,122,90,.24)' }
                : { background: 'rgba(168,114,26,.10)',  color: '#A8721A', border: '1px solid rgba(168,114,26,.24)' }
              }
            >
              {pendingReqs === 0
                ? <><CheckCircle size={9} /> ครบทุกข้อ</>
                : <><Clock size={9} /> รอ {pendingReqs}/{totalReqs} ข้อ</>
              }
            </span>
          )}
        </div>

        {meeting.notification_message && (
          <p className="text-[11px]" style={{ color: '#4B5563' }}>{meeting.notification_message}</p>
        )}
      </div>

      <Link
        href="/notify"
        className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all"
        style={{ color: '#0B6E76' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(11,110,118,.12)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
        title="ดูรายละเอียด"
      >
        <ExternalLink size={12} />
      </Link>
    </div>
  )
}

interface MeetingBannerProps {
  meetings:                  Meeting[]
  requirementsByMeetingId:   Record<string, RequirementWithStatus[]>
}

export function MeetingBanner({ meetings, requirementsByMeetingId }: MeetingBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused]             = useState(false)
  const intervalRef                      = useRef<ReturnType<typeof setInterval> | null>(null)
  const total                            = meetings.length

  useEffect(() => {
    if (total <= 1 || paused) return
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % total)
    }, 4500)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [total, paused])

  if (total === 0) return null

  const prev    = () => setCurrentIndex(i => (i - 1 + total) % total)
  const next    = () => setCurrentIndex(i => (i + 1) % total)
  const meeting = meetings[currentIndex]
  const days    = daysUntilDate(meeting.scheduled_date)
  const reqs    = requirementsByMeetingId[meeting.id] ?? []

  const accentColor = days <= 3 ? '#B3392C' : days <= 7 ? '#A8721A' : '#0B6E76'

  return (
    <div
      className="glass-card-sm overflow-hidden"
      style={{ borderLeft: `3px solid ${accentColor}` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <MeetingSlide meeting={meeting} requirements={reqs} />

      {total > 1 && (
        <div
          className="flex items-center justify-between px-4 pb-3 pt-0"
          style={{ borderTop: '1px solid rgba(11,110,118,.08)' }}
        >
          <div className="flex items-center gap-1.5">
            {meetings.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className="rounded-full transition-all"
                style={{
                  width:  i === currentIndex ? '16px' : '6px',
                  height: '6px',
                  background: i === currentIndex ? '#0B6E76' : 'rgba(11,110,118,.25)',
                }}
                aria-label={`ไปยังการประชุม ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#8896A3' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0B6E76' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8896A3' }}
              aria-label="ก่อนหน้า"
            >
              <ChevronLeft size={13} />
            </button>
            <span
              className="text-[10px] min-w-[28px] text-center"
              style={{ color: '#8896A3', fontFamily: 'var(--font-mono)' }}
            >
              {currentIndex + 1}/{total}
            </span>
            <button
              onClick={next}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: '#8896A3' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0B6E76' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8896A3' }}
              aria-label="ถัดไป"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
