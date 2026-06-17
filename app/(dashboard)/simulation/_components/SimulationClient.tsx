'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, FileText,
  CheckCircle, Clock, AlertCircle, ArrowRight,
  Bell, BarChart2,
} from 'lucide-react'

// ─── Mock Data ────────────────────────────────────────────────────

const MOCK_MEETINGS = [
  {
    id: 'm1',
    title: 'ประชุม NRW ครั้งที่ 7/2569',
    type: 'WSC-R/NRW Monthly',
    date: '28 พ.ค. 2569',
    daysLeft: 7,
    reportLabel: 'เม.ย. 2569',
    requirements: [
      {
        id: 'r1',
        title: 'PDCA รายงานเดือน เม.ย. 2569',
        type: 'monthly_report',
        dueDate: '25 พ.ค. 2569',
        submitted: 8,
        total: 26,
      },
      {
        id: 'r2',
        title: 'KM Case ไตรมาส 2',
        type: 'km_case',
        dueDate: '27 พ.ค. 2569',
        submitted: 14,
        total: 26,
      },
    ],
  },
  {
    id: 'm2',
    title: 'ประชุมเร่งรัดอุปสรรค ครั้งที่ 3',
    type: 'ประชุมเร่งรัดอุปสรรค',
    date: '5 มิ.ย. 2569',
    daysLeft: 15,
    reportLabel: null,
    requirements: [],
  },
  {
    id: 'm3',
    title: 'KM Practice — แลกเปลี่ยนเรียนรู้',
    type: 'KM Practice',
    date: '18 มิ.ย. 2569',
    daysLeft: 28,
    reportLabel: null,
    requirements: [
      {
        id: 'r3',
        title: 'KM Case นำเสนอ',
        type: 'km_case',
        dueDate: '15 มิ.ย. 2569',
        submitted: 3,
        total: 26,
      },
    ],
  },
]

const MOCK_BRANCHES_UNSUBMITTED = [
  'สุโขทัย', 'ตาก', 'แม่สอด', 'แม่สะเรียง', 'กำแพงเพชร',
  'นครสวรรค์', 'อุทัยธานี', 'ชัยนาท', 'พิจิตร', 'พิษณุโลก',
  'อุตรดิตถ์', 'แพร่', 'น่าน', 'เพชรบูรณ์', 'ลำปาง',
  'ลำพูน', 'เชียงใหม่', 'เชียงราย',
]

const TYPE_COLOR: Record<string, string> = {
  'WSC-R/NRW Monthly': 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
  'ประชุมเร่งรัดอุปสรรค': 'text-amber-300 bg-amber-500/15 border-amber-500/30',
  'KM Practice': 'text-violet-300 bg-violet-500/15 border-violet-500/30',
}

const REQ_ICON: Record<string, React.ReactNode> = {
  monthly_report: <FileText size={13} className="text-cyan-400" />,
  km_case: <BarChart2 size={13} className="text-violet-400" />,
  five_topics: <FileText size={13} className="text-teal-400" />,
}

// ─── Sliding Meeting Banner ───────────────────────────────────────

function SlidingMeetingBanner() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (paused) return
    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % MOCK_MEETINGS.length)
    }, 4000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [paused])

  const m = MOCK_MEETINGS[active]
  const mainReq = m.requirements[0]

  function go(dir: number) {
    setPaused(true)
    setActive((i) => (i + dir + MOCK_MEETINGS.length) % MOCK_MEETINGS.length)
    setTimeout(() => setPaused(false), 8000)
  }

  return (
    <div className="glass-card-sm border-l-4 border-cyan-500 overflow-hidden">
      {/* Slide content */}
      <div
        className="p-4 transition-all duration-300"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex items-start gap-3">
          <div className="relative mt-1 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Type + countdown */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[m.type] ?? 'text-white/50 bg-white/10 border-white/15'}`}>
                {m.type}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                m.daysLeft <= 7
                  ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                  : 'text-white/40 bg-white/5 border-white/10'
              }`}>
                {m.daysLeft <= 0 ? 'วันนี้' : `อีก ${m.daysLeft} วัน`}
              </span>
              {m.reportLabel && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border text-cyan-300 bg-cyan-500/10 border-cyan-500/25 flex items-center gap-1">
                  <FileText size={10} /> รายงาน {m.reportLabel}
                </span>
              )}
            </div>

            {/* Title + date */}
            <p className="font-semibold text-sm text-white">{m.title}</p>
            <p className="text-xs text-white/45 flex items-center gap-1.5">
              <Calendar size={11} className="text-white/30" />
              {m.date} · 09:00 น. · ห้องประชุมเขต 10
            </p>

            {/* Requirement mini-progress */}
            {mainReq && (
              <div className="flex items-center gap-2 pt-0.5">
                {REQ_ICON[mainReq.type]}
                <span className="text-[11px] text-white/50 flex-1 truncate">{mainReq.title}</span>
                <span className={`text-[11px] font-bold ${
                  mainReq.submitted === mainReq.total ? 'text-green-400' :
                  mainReq.submitted / mainReq.total >= 0.5 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {mainReq.submitted}/{mainReq.total}
                </span>
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      mainReq.submitted / mainReq.total >= 0.7 ? 'bg-green-400' :
                      mainReq.submitted / mainReq.total >= 0.4 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${(mainReq.submitted / mainReq.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => go(-1)}
                className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => go(1)}
                className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {/* Dot indicators */}
            <div className="flex gap-1">
              {MOCK_MEETINGS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setPaused(true); setActive(i); setTimeout(() => setPaused(false), 8000) }}
                  className={`rounded-full transition-all duration-300 ${
                    i === active ? 'w-4 h-1.5 bg-cyan-400' : 'w-1.5 h-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar (auto-advance timer) */}
      {!paused && (
        <div className="h-0.5 bg-white/5">
          <div
            key={active}
            className="h-full bg-cyan-500/50"
            style={{ animation: 'progressBar 4s linear forwards' }}
          />
        </div>
      )}

      <style>{`
        @keyframes progressBar {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}

// ─── Ticket Progress Panel (replaces UnsubmittedPanel) ───────────

function TicketProgressPanel() {
  const req = MOCK_MEETINGS[0].requirements[0]
  const submitted = req.submitted
  const total = req.total
  const pct = Math.round((submitted / total) * 100)
  const unsubmitted = MOCK_BRANCHES_UNSUBMITTED.slice(0, total - submitted)
  const MAX_SHOW = 5

  return (
    <div className="glass-card p-4 pt-5 relative overflow-hidden accent-bar-amber space-y-3">
      <p className="text-[10px] font-bold tracking-[.07em] uppercase text-white/40">
        สถานะ Ticket
      </p>

      {/* Ticket label */}
      <div className="flex items-start gap-2">
        <FileText size={13} className="text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-white leading-snug">{req.title}</p>
          <p className="text-[11px] text-white/35 mt-0.5 flex items-center gap-1">
            <Clock size={10} /> กำหนดส่ง {MOCK_MEETINGS[0].requirements[0].dueDate}
          </p>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-baseline gap-2">
        <span className="num text-3xl font-bold leading-none text-[#f6c453]">
          {total - submitted}
        </span>
        <span className="text-sm text-white/40">/ {total} สาขา ยังไม่ส่ง</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-white/35 mt-1">ส่งแล้ว {pct}% ({submitted}/{total} สาขา)</p>
      </div>

      {/* Branch chips */}
      <div className="flex flex-wrap gap-1">
        {unsubmitted.slice(0, MAX_SHOW).map((b) => (
          <span key={b} className="text-[11px] px-2 py-0.5 rounded bg-white/8 text-white/60">{b}</span>
        ))}
        {unsubmitted.length > MAX_SHOW && (
          <span className="text-[11px] px-2 py-0.5 text-[#f6c453] font-bold">
            +{unsubmitted.length - MAX_SHOW} สาขา
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Branch Ticket View (หน้า /notify มุมสาขา) ───────────────────

function BranchTicketView() {
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({
    r1: false,
    r2: true,   // KM ส่งแล้ว
    r3: false,
  })

  function toggleSubmit(id: string) {
    setSubmitted((p) => ({ ...p, [id]: !p[id] }))
  }

  const meeting = MOCK_MEETINGS[0]

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Meeting header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[meeting.type]}`}>
              {meeting.type}
            </span>
            <span className="text-[11px] text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
              อีก {meeting.daysLeft} วัน
            </span>
          </div>
          <p className="font-bold text-sm text-white">{meeting.title}</p>
          <p className="text-xs text-white/45 mt-0.5 flex items-center gap-1.5">
            <Calendar size={11} className="text-white/30" />
            {meeting.date} · 09:00 น.
          </p>
        </div>
        <Bell size={16} className="text-white/25 shrink-0 mt-1" />
      </div>

      {/* Tickets */}
      <div className="border-t border-white/8 pt-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
          รายการที่ต้องส่ง
        </p>
        {meeting.requirements.map((req) => {
          const done = submitted[req.id]
          return (
            <div
              key={req.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                done
                  ? 'bg-green-500/8 border-green-500/20'
                  : 'bg-white/3 border-white/10'
              }`}
            >
              <div className="shrink-0">
                {done
                  ? <CheckCircle size={16} className="text-green-400" />
                  : <AlertCircle size={16} className="text-amber-400" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-snug ${done ? 'text-white/50 line-through' : 'text-white'}`}>
                  {req.title}
                </p>
                <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                  <Clock size={10} /> กำหนดส่ง {req.dueDate}
                </p>
              </div>

              <div className="shrink-0">
                {done ? (
                  <span className="text-[11px] text-green-400 font-medium">ส่งแล้ว ✓</span>
                ) : (
                  <button
                    onClick={() => toggleSubmit(req.id)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ส่งรายงาน <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-white/25 text-center">
        (จำลอง — ปุ่ม &quot;ส่งรายงาน&quot; จะลิงก์ไปฟอร์มที่ pre-fill ปี/เดือนให้อัตโนมัติ)
      </p>
    </div>
  )
}

// ─── All Requirements Overview ────────────────────────────────────

function AllRequirementsGrid() {
  return (
    <div className="space-y-3">
      {MOCK_MEETINGS.filter((m) => m.requirements.length > 0).map((m) => (
        <div key={m.id} className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${TYPE_COLOR[m.type] ?? 'text-white/40 bg-white/8 border-white/10'}`}>
              {m.type}
            </span>
            <span className="text-xs text-white/60 font-medium">{m.title}</span>
            <span className="text-[11px] text-white/30 ml-auto">{m.date}</span>
          </div>
          <div className="space-y-2">
            {m.requirements.map((req) => {
              const pct = Math.round((req.submitted / req.total) * 100)
              return (
                <div key={req.id} className="flex items-center gap-3">
                  {REQ_ICON[req.type]}
                  <span className="text-[12px] text-white/70 flex-1 truncate">{req.title}</span>
                  <span className={`text-[11px] font-bold w-10 text-right ${
                    req.submitted === req.total ? 'text-green-400' :
                    pct >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {req.submitted}/{req.total}
                  </span>
                  <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        req.submitted === req.total ? 'bg-green-400' :
                        pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30 w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Simulation Layout ───────────────────────────────────────

export function SimulationClient() {
  const [view, setView] = useState<'dashboard' | 'branch'>('dashboard')

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl w-fit">
        {(['dashboard', 'branch'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === v
                ? 'bg-cyan-500 text-[#061327]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            {v === 'dashboard' ? '🖥 มุมเขต (Dashboard)' : '📱 มุมสาขา (/notify)'}
          </button>
        ))}
      </div>

      {view === 'dashboard' ? (
        <div className="space-y-4">
          <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Meeting Banner — sliding อัตโนมัติ ทุก 4 วินาที</p>
          <SlidingMeetingBanner />

          <p className="text-xs text-white/30 uppercase tracking-widest font-bold mt-6">ภาพรวมเขต — นับจาก Ticket</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TicketProgressPanel />
            <AllRequirementsGrid />
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-lg">
          <p className="text-xs text-white/30 uppercase tracking-widest font-bold">มุมสาขา — เห็น Ticket พร้อมปุ่มส่งรายงาน</p>
          <p className="text-[11px] text-white/30">ลองกดปุ่ม &quot;ส่งรายงาน&quot; เพื่อดู state เปลี่ยน</p>
          <BranchTicketView />
        </div>
      )}
    </div>
  )
}
