'use client'

import { getBranchByCostcenter } from '@/lib/utils/pwa-branches'
import { useRealtimeBranchReadStats } from '@/hooks/useRealtimeData'

interface RatsReadingPanelProps {
  yearBe: number
  month:  number
}

const THAI_MONTH_SHORT: Record<number, string> = {
  1: 'ม.ค.', 2: 'ก.พ.', 3: 'มี.ค.', 4: 'เม.ย.',
  5: 'พ.ค.', 6: 'มิ.ย.', 7: 'ก.ค.', 8: 'ส.ค.',
  9: 'ก.ย.', 10: 'ต.ค.', 11: 'พ.ย.', 12: 'ธ.ค.',
}

const RANK_STYLE = [
  { badge: 'rgba(218,185,90,.18)', badgeText: '#A8721A', bar: '#A8721A' },   // gold
  { badge: 'rgba(107,118,134,.14)', badgeText: '#6B7686', bar: '#6B7686' },  // silver
  { badge: 'rgba(180,83,9,.18)',    badgeText: '#B5651D', bar: '#B5651D' },  // bronze
  { badge: 'rgba(11,110,118,.10)',  badgeText: '#0B6E76', bar: '#0B6E76' },
  { badge: 'rgba(11,110,118,.10)',  badgeText: '#0B6E76', bar: '#0B6E76' },
]

export function RatsReadingPanel({ yearBe, month }: RatsReadingPanelProps) {
  const { data: stats, loading, syncing } = useRealtimeBranchReadStats(yearBe, month)
  const label = `${THAI_MONTH_SHORT[month]} ${yearBe}`

  const started    = stats.filter(s => s.read_count > 0)
  const notStarted = stats.filter(s => s.read_count === 0)
  const total      = stats.length
  const pct        = total > 0 ? Math.round((started.length / total) * 100) : 0
  const top5       = [...stats].sort((a, b) => b.read_count - a.read_count).slice(0, 5)
  const maxRead    = top5[0]?.read_count ?? 1

  if (loading || (stats.length === 0 && syncing)) {
    return <div className="glass-card p-5 pt-6 h-48 animate-pulse accent-bar-purple" />
  }

  if (stats.length === 0) {
    return (
      <div className="glass-card p-5 pt-6 relative overflow-hidden accent-bar-purple">
        <p className="text-[10px] font-bold tracking-[.10em] uppercase mb-1" style={{ color: '#4B5563', fontFamily: 'var(--font-mono)' }}>
          W.A.T.C.H ผู้ใช้น้ำรายใหญ่
        </p>
        <p className="text-[15px] font-semibold mt-0.5 mb-4" style={{ color: '#12181F' }}>เดือน {label}</p>
        <p className="text-[13px]" style={{ color: '#4B5563' }}>ยังไม่มีข้อมูลจาก RATS สำหรับเดือนนี้</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 pt-6 relative overflow-hidden accent-bar-purple">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold tracking-[.10em] uppercase mb-0.5" style={{ color: '#4B5563', fontFamily: 'var(--font-mono)' }}>
            W.A.T.C.H ผู้ใช้น้ำรายใหญ่
          </p>
          <p className="text-[15px] font-semibold" style={{ color: '#12181F' }}>เดือน {label}</p>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: '#4B5563' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#6B4FA0' }} />
              กำลังอัปเดต
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(107,79,160,.10)',
              color: '#6B4FA0',
              border: '1px solid rgba(107,79,160,.22)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {total} สาขา
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Left: summary ── */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Started */}
            <div
              className="rounded-xl px-4 py-3 flex flex-col gap-1"
              style={{ background: 'rgba(30,122,90,.08)', border: '1px solid rgba(30,122,90,.18)' }}
            >
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#4B5563' }}>เริ่มดำเนินการ</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-bold leading-none" style={{ color: '#1E7A5A', fontFamily: 'var(--font-mono)' }}>
                  {started.length}
                </span>
                <span className="text-[11px]" style={{ color: '#4B5563' }}>สาขา</span>
              </div>
            </div>
            {/* Not started */}
            <div
              className="rounded-xl px-4 py-3 flex flex-col gap-1"
              style={notStarted.length > 0
                ? { background: 'rgba(179,57,44,.08)', border: '1px solid rgba(179,57,44,.18)' }
                : { background: 'rgba(11,110,118,.06)',  border: '1px solid rgba(11,110,118,.12)' }
              }
            >
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#4B5563' }}>ยังไม่ดำเนินการ</p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[28px] font-bold leading-none"
                  style={{ color: notStarted.length > 0 ? '#B3392C' : '#4B5563', fontFamily: 'var(--font-mono)' }}
                >
                  {notStarted.length}
                </span>
                <span className="text-[11px]" style={{ color: '#4B5563' }}>สาขา</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-[11px]" style={{ color: '#4B5563' }}>ความครอบคลุม</p>
              <p className="text-[11px] font-bold" style={{ color: '#6B4FA0', fontFamily: 'var(--font-mono)' }}>{pct}%</p>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(11,110,118,.10)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6B4FA0, #4A5FA5)' }}
              />
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: '#4B5563' }}>
              {started.length} จาก {total} สาขาเริ่มจดมาตรแล้ว
            </p>
          </div>

          {/* Not-started badges */}
          {notStarted.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: '#4B5563' }}>สาขาที่ยังไม่เริ่ม</p>
              <div className="flex flex-wrap gap-1.5">
                {notStarted.map(s => (
                  <span
                    key={s.ba}
                    className="px-2 py-0.5 rounded text-[11px]"
                    style={{ background: 'rgba(179,57,44,.08)', border: '1px solid rgba(179,57,44,.18)', color: '#B3392C' }}
                  >
                    {getBranchByCostcenter(String(s.ba))?.name_th ?? `BA ${s.ba}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: TOP 5 ── */}
        <div>
          <p className="text-[10px] font-bold tracking-[.10em] uppercase mb-3" style={{ color: '#4B5563', fontFamily: 'var(--font-mono)' }}>
            TOP 5 — บันทึกมากที่สุด
          </p>
          <div className="space-y-2.5">
            {top5.map((s, i) => {
              const c       = RANK_STYLE[i]
              const barPct  = maxRead > 0 ? (s.read_count / maxRead) * 100 : 0
              const targetPct = s.target > 0 ? Math.min(Math.round((s.read_count / s.target) * 100), 999) : 0
              return (
                <div key={s.ba} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: c.badge, color: c.badgeText, fontFamily: 'var(--font-mono)' }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[11px] font-medium truncate" style={{ color: '#12181F' }}>
                        {getBranchByCostcenter(String(s.ba))?.name_th ?? `BA ${s.ba}`}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[12px] font-bold" style={{ color: '#12181F', fontFamily: 'var(--font-mono)' }}>
                          {s.read_count.toLocaleString()}
                        </span>
                        <span className="text-[10px]" style={{ color: '#8896A3' }}>/ {s.target}</span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: targetPct >= 100 ? '#1E7A5A' : '#A8721A', fontFamily: 'var(--font-mono)' }}
                        >
                          {targetPct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(11,110,118,.10)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${barPct}%`, background: c.bar }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
