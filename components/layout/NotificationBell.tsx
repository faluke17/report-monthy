'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCircle, Clock, ChevronRight, ClipboardList } from 'lucide-react'
import type { MeetingWithRequirements } from '@/lib/types'

const MONTH_TH = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const REQ_TYPE_LINK: Record<string, string> = {
  monthly_report: '/pdca/new',
  five_topics:    '/five-topics',
  km_case:        '/km',
  custom:         '/notify',
}

interface NotificationBellProps {
  notifyCount:      number
  requirementCount: number
  meetings:         MeetingWithRequirements[]
  isRegion:         boolean
}

export function NotificationBell({
  notifyCount, requirementCount, meetings, isRegion,
}: NotificationBellProps) {
  const totalCount = notifyCount + requirementCount
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all"
        aria-label="การแจ้งเตือน"
        style={{ border: '1px solid transparent' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = '#F5F6F8'
          el.style.borderColor = '#E3E7EC'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = ''
          el.style.borderColor = 'transparent'
        }}
      >
        <Bell size={17} style={{ color: totalCount > 0 ? '#A8721A' : '#8896A3' }} />
        {totalCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1"
            style={{
              background: '#B3392C',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 w-[320px] anim-slide-down z-50 overflow-hidden"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E3E7EC',
            borderRadius: '14px',
            boxShadow: '0 12px 36px rgba(18,24,31,.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #E3E7EC' }}
          >
            <div className="flex items-center gap-2">
              <Bell size={13} style={{ color: '#0B6E76' }} />
              <span className="text-[13px] font-semibold" style={{ color: '#12181F' }}>การแจ้งเตือน</span>
            </div>
            {totalCount > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  background: '#FBEAE8',
                  color: '#B3392C',
                  border: '1px solid #B3392C40',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {totalCount} รายการ
              </span>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">

            {/* ── Resolution / meeting-ack section ── */}
            {notifyCount > 0 && (
              <div className="px-3 pt-3 pb-1">
                <p
                  className="text-[9px] font-bold uppercase tracking-[.18em] mb-2 px-1"
                  style={{ color: '#8896A3', fontFamily: 'var(--font-mono)' }}
                >
                  ข้อสั่งการ / ประชุม
                </p>
                <button
                  onClick={() => { setOpen(false); router.push('/notify') }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{ border: '1px solid #B3392C25', background: '#FBEAE8' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F7DDDA' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FBEAE8' }}
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: '#F7DDDA' }}
                  >
                    <Bell size={13} style={{ color: '#B3392C' }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: '#12181F' }}>ข้อสั่งการ / ประชุม</p>
                    <p className="text-[11px]" style={{ color: '#B3392C' }}>{notifyCount} รายการรอรับทราบ</p>
                  </div>
                  <ChevronRight size={13} style={{ color: '#8896A3' }} />
                </button>
              </div>
            )}

            {/* ── Requirements per meeting ── */}
            {meetings.length > 0 && (
              <div className="px-3 pt-3 pb-2">
                <p
                  className="text-[9px] font-bold uppercase tracking-[.18em] mb-2 px-1"
                  style={{ color: '#8896A3', fontFamily: 'var(--font-mono)' }}
                >
                  {isRegion ? 'ภาพรวมการส่งข้อมูล' : 'สิ่งที่ต้องดำเนินการ'}
                </p>
                <div className="space-y-3">
                  {meetings.map((m) => (
                    <div key={m.id} className="space-y-1.5">
                      <p className="text-[11px] font-semibold px-1 truncate" style={{ color: '#4B5563' }}>
                        {m.title}
                      </p>
                      {m.requirements.map((req) => {
                        const fulfilled = isRegion ? req.fulfilled_costcenters.length : (req.is_fulfilled_by_me ? 1 : 0)
                        const total     = isRegion ? 26 : 1
                        const pct       = Math.round((fulfilled / total) * 100)
                        const done      = isRegion ? req.pending_count === 0 : req.is_fulfilled_by_me
                        const href      = REQ_TYPE_LINK[req.requirement_type] ?? '/notify'

                        return (
                          <button
                            key={req.id}
                            onClick={() => { setOpen(false); router.push(href) }}
                            className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                            style={{
                              border: `1px solid ${done ? '#1E7A5A30' : '#E3E7EC'}`,
                              background: done ? '#E7F3EE' : '#F5F6F8',
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = done ? '#DCEEE5' : '#EFF2F5'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = done ? '#E7F3EE' : '#F5F6F8'
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                style={{ background: done ? '#D5EBE1' : '#FBF1E1' }}
                              >
                                {done
                                  ? <CheckCircle size={11} style={{ color: '#1E7A5A' }} />
                                  : <Clock       size={11} style={{ color: '#A8721A' }} />
                                }
                              </span>
                              <span
                                className="text-[12px] font-medium flex-1 truncate"
                                style={{ color: done ? '#4B5563' : '#12181F' }}
                              >
                                {req.title}
                              </span>
                              {!isRegion && !done && (
                                <ChevronRight size={11} style={{ color: '#0B6E76' }} />
                              )}
                            </div>

                            {isRegion && (
                              <div className="pl-7 space-y-1">
                                <div className="h-1 rounded-full overflow-hidden" style={{ background: '#E3E7EC' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${pct}%`,
                                      background: done ? '#1E7A5A' : '#0B6E76',
                                    }}
                                  />
                                </div>
                                <p className="text-[10px]" style={{ color: '#8896A3' }}>
                                  {fulfilled}/{total} สาขา
                                  {req.due_date && (
                                    <span className="ml-2">
                                      ครบ {new Date(req.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                  {req.target_month && (
                                    <span className="ml-1">({MONTH_TH[req.target_month]})</span>
                                  )}
                                </p>
                              </div>
                            )}

                            {!isRegion && req.target_month && (
                              <p className="text-[10px] pl-7" style={{ color: '#8896A3' }}>
                                ข้อมูล {MONTH_TH[req.target_month]}
                                {req.due_date && ` · ครบ ${new Date(req.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {totalCount === 0 && meetings.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 px-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: '#E7F3EE', border: '1px solid #1E7A5A30' }}
                >
                  <CheckCircle size={22} style={{ color: '#1E7A5A' }} />
                </div>
                <p className="text-[13px] text-center" style={{ color: '#4B5563' }}>
                  ไม่มีรายการค้าง
                </p>
                <p className="text-[11px] text-center" style={{ color: '#8896A3' }}>
                  ทุกอย่างเรียบร้อยดี
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: '1px solid #E3E7EC' }}>
            <button
              onClick={() => { setOpen(false); router.push('/notify') }}
              className="w-full flex items-center justify-between px-4 py-2.5 transition-colors text-[12px]"
              style={{ color: '#0B6E76' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F6F8' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
            >
              <span className="flex items-center gap-1.5">
                <ClipboardList size={12} />
                ดูการแจ้งเตือนทั้งหมด
              </span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
