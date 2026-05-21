'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCircle, Clock, ChevronRight, ClipboardList } from 'lucide-react'
import type { MeetingWithRequirements } from '@/lib/types'

const MONTH_TH = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

const REQ_TYPE_LINK: Record<string, string> = {
  monthly_report: '/monthly/new',
  five_topics:    '/five-topics',
  km_case:        '/km',
  custom:         '/notify',
}

interface NotificationBellProps {
  notifyCount: number        // unread resolutions + unacked meetings
  requirementCount: number   // pending requirements
  meetings: MeetingWithRequirements[]
  isRegion: boolean
}

export function NotificationBell({
  notifyCount,
  requirementCount,
  meetings,
  isRegion,
}: NotificationBellProps) {
  const totalCount = notifyCount + requirementCount
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-white/5 transition-colors"
        aria-label="การแจ้งเตือน"
      >
        <Bell size={18} className={totalCount > 0 ? 'text-amber-300' : 'text-white/40'} />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 num">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: 'rgba(5,9,18,.97)',
            border: '1px solid rgba(0,229,255,.18)',
            boxShadow: '0 16px 48px rgba(0,0,0,.7), 0 0 0 1px rgba(0,229,255,.06) inset',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-cyan-400" />
              <span className="text-sm font-bold text-white">การแจ้งเตือน</span>
            </div>
            {totalCount > 0 && (
              <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">
                {totalCount} รายการ
              </span>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {/* ── Section: Resolutions + meeting acks ── */}
            {notifyCount > 0 && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">ข้อสั่งการ / ประชุม</p>
                <button
                  onClick={() => { setOpen(false); router.push('/notify') }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                    <Bell size={13} className="text-red-400" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">ข้อสั่งการ / ประชุม</p>
                    <p className="text-[11px] text-white/40">{notifyCount} รายการรอรับทราบ</p>
                  </div>
                  <ChevronRight size={13} className="text-white/25 shrink-0" />
                </button>
              </div>
            )}

            {/* ── Section: Requirements per meeting ── */}
            {meetings.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">
                  {isRegion ? 'ภาพรวมการส่งข้อมูล' : 'สิ่งที่ต้องดำเนินการ'}
                </p>
                <div className="space-y-3">
                  {meetings.map((m) => (
                    <div key={m.id} className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-white/60 truncate">{m.title}</p>
                      {m.requirements.map((req) => {
                        const fulfilled = isRegion
                          ? req.fulfilled_costcenters.length
                          : req.is_fulfilled_by_me ? 1 : 0
                        const total = isRegion ? 26 : 1
                        const pct = Math.round((fulfilled / total) * 100)
                        const done = isRegion ? req.pending_count === 0 : req.is_fulfilled_by_me
                        const href = REQ_TYPE_LINK[req.requirement_type] ?? '/notify'

                        return (
                          <button
                            key={req.id}
                            onClick={() => { setOpen(false); router.push(href) }}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 transition-colors border border-white/6 group"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500/20' : 'bg-amber-500/15'}`}>
                                {done
                                  ? <CheckCircle size={11} className="text-emerald-400" />
                                  : <Clock size={11} className="text-amber-400" />
                                }
                              </span>
                              <span className={`text-xs font-medium flex-1 truncate ${done ? 'text-white/50' : 'text-white'}`}>
                                {req.title}
                              </span>
                              {!isRegion && !done && (
                                <ChevronRight size={11} className="text-white/25 shrink-0 group-hover:text-cyan-400 transition-colors" />
                              )}
                            </div>

                            {/* Progress (region only) */}
                            {isRegion && (
                              <div className="pl-7 space-y-1">
                                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-white/35">
                                  {fulfilled}/{total} สาขา
                                  {req.due_date && (
                                    <span className="ml-2 text-white/25">
                                      ครบ {new Date(req.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                  {req.target_month && (
                                    <span className="ml-1 text-white/25">({MONTH_TH[req.target_month]})</span>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Branch: show period */}
                            {!isRegion && req.target_month && (
                              <p className="text-[10px] text-white/30 pl-7">
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
              <div className="flex flex-col items-center gap-2 py-8 px-4">
                <CheckCircle size={28} className="text-emerald-400/50" />
                <p className="text-sm text-white/30 text-center">ไม่มีรายการค้างดำเนินการ</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/8 px-4 py-2.5">
            <button
              onClick={() => { setOpen(false); router.push('/notify') }}
              className="w-full flex items-center justify-between text-xs text-cyan-400 hover:text-cyan-300 transition-colors py-0.5"
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
