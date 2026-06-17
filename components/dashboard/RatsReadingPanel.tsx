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
  { badge: 'rgba(218,185,90,.18)', badgeText: '#D4A843', bar: '#D4A843' },   // gold
  { badge: 'rgba(148,163,184,.14)', badgeText: '#94A3B8', bar: '#94A3B8' },  // silver
  { badge: 'rgba(180,83,9,.18)',    badgeText: '#FB923C', bar: '#FB923C' },  // bronze
  { badge: 'rgba(71,130,255,.10)',  badgeText: '#93C5FD', bar: '#4782FF' },
  { badge: 'rgba(71,130,255,.10)',  badgeText: '#93C5FD', bar: '#4782FF' },
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
        <p className="text-[10px] font-bold tracking-[.10em] uppercase mb-1" style={{ color: '#5B7AAF', fontFamily: 'var(--font-mono)' }}>
          การจดมาตร RATS2
        </p>
        <p className="text-[15px] font-semibold mt-0.5 mb-4" style={{ color: '#E4ECFF' }}>เดือน {label}</p>
        <p className="text-[13px]" style={{ color: '#7B9CCC' }}>ยังไม่มีข้อมูลจาก RATS สำหรับเดือนนี้</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-5 pt-6 relative overflow-hidden accent-bar-purple">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold tracking-[.10em] uppercase mb-0.5" style={{ color: '#5B7AAF', fontFamily: 'var(--font-mono)' }}>
            การจดมาตร RATS2
          </p>
          <p className="text-[15px] font-semibold" style={{ color: '#E4ECFF' }}>เดือน {label}</p>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: '#5B7AAF' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#A78BFA' }} />
              กำลังอัปเดต
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(167,139,250,.10)',
              color: '#A78BFA',
              border: '1px solid rgba(167,139,250,.22)',
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
              style={{ background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.18)' }}
            >
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#5B7AAF' }}>เริ่มดำเนินการ</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-bold leading-none" style={{ color: '#34D399', fontFamily: 'var(--font-mono)' }}>
                  {started.length}
                </span>
                <span className="text-[11px]" style={{ color: '#7B9CCC' }}>สาขา</span>
              </div>
            </div>
            {/* Not started */}
            <div
              className="rounded-xl px-4 py-3 flex flex-col gap-1"
              style={notStarted.length > 0
                ? { background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.18)' }
                : { background: 'rgba(71,130,255,.06)',  border: '1px solid rgba(71,130,255,.12)' }
              }
            >
              <p className="text-[10px] uppercase tracking-wide" style={{ color: '#5B7AAF' }}>ยังไม่ดำเนินการ</p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[28px] font-bold leading-none"
                  style={{ color: notStarted.length > 0 ? '#F87171' : '#5B7AAF', fontFamily: 'var(--font-mono)' }}
                >
                  {notStarted.length}
                </span>
                <span className="text-[11px]" style={{ color: '#7B9CCC' }}>สาขา</span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-[11px]" style={{ color: '#7B9CCC' }}>ความครอบคลุม</p>
              <p className="text-[11px] font-bold" style={{ color: '#A78BFA', fontFamily: 'var(--font-mono)' }}>{pct}%</p>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(71,130,255,.10)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #A78BFA, #818CF8)' }}
              />
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: '#5B7AAF' }}>
              {started.length} จาก {total} สาขาเริ่มจดมาตรแล้ว
            </p>
          </div>

          {/* Not-started badges */}
          {notStarted.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: '#5B7AAF' }}>สาขาที่ยังไม่เริ่ม</p>
              <div className="flex flex-wrap gap-1.5">
                {notStarted.map(s => (
                  <span
                    key={s.ba}
                    className="px-2 py-0.5 rounded text-[11px]"
                    style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.18)', color: '#F87171' }}
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
          <p className="text-[10px] font-bold tracking-[.10em] uppercase mb-3" style={{ color: '#5B7AAF', fontFamily: 'var(--font-mono)' }}>
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
                      <span className="text-[11px] font-medium truncate" style={{ color: '#CBD5E1' }}>
                        {getBranchByCostcenter(String(s.ba))?.name_th ?? `BA ${s.ba}`}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[12px] font-bold" style={{ color: '#E4ECFF', fontFamily: 'var(--font-mono)' }}>
                          {s.read_count.toLocaleString()}
                        </span>
                        <span className="text-[10px]" style={{ color: '#3D5380' }}>/ {s.target}</span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: targetPct >= 100 ? '#34D399' : '#FCD34D', fontFamily: 'var(--font-mono)' }}
                        >
                          {targetPct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(71,130,255,.10)' }}>
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
