'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, ClipboardList, Target, AlertTriangle,
  Calendar, BookOpen, Download, ChevronLeft, ChevronRight,
  Droplets, ListChecks, FileText, Crosshair, Activity, Building2, Presentation,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface SidebarStats {
  totalBranches:  number
  submitted:      number
  pending:        number
  openObstacles:  number
  overdueActions: number
  mnfRedCount:    number
}
interface SidebarProps {
  stats?:       SidebarStats
  notifyCount?: number
}

const NAV_GROUPS = [
  {
    label: 'ภาพรวม',
    items: [
      { href: '/dashboard',        label: 'Dashboard เขต',       icon: LayoutDashboard },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/ranking', label: 'Ranking สาขา', icon: BarChart3 }] : []),
      { href: '/mnf-monitor',      label: 'MNF Monitor',         icon: Activity },
      { href: '/report-nrw',       label: 'Report NRW',          icon: Droplets },
      { href: '/project-progress', label: 'ความก้าวหน้าโครงการ', icon: Building2 },
    ],
  },
  {
    label: 'ประชุม WSC-R',
    items: [
      { href: '/meeting',  label: 'วาระ / มติ / สั่งการ', icon: Calendar, exact: true },
      { href: '/action',   label: 'Action Tracker',       icon: Crosshair },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/summary',           label: 'Executive Summary', icon: FileText, badge: 'new' as const }] : []),
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/executive-summary', label: 'บทสรุปผู้บริหาร',   icon: Presentation }] : []),
    ],
  },
  {
    label: 'รายงานรายเดือน',
    items: [
      { href: '/monthly',     label: 'กรอกผล / PDCA',   icon: ClipboardList },
      { href: '/five-topics', label: 'รายงาน 5 หัวข้อ', icon: ListChecks },
      { href: '/obstacle',    label: 'Obstacle Tracker', icon: AlertTriangle },
    ],
  },
  {
    label: 'แผนและ KM',
    items: [
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/plans', label: 'แผนลดน้ำสูญเสีย', icon: Target }] : []),
      { href: '/km',     label: 'KM Best Practice', icon: BookOpen },
      { href: '/export', label: 'Export ข้อมูล',    icon: Download },
    ],
  },
]

export function Sidebar({ stats, notifyCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  const total          = stats?.totalBranches  ?? 26
  const submitted      = stats?.submitted      ?? 0
  const pending        = stats?.pending        ?? 0
  const obstacles      = stats?.openObstacles  ?? 0
  const overdueActions = stats?.overdueActions ?? 0
  const mnfRedCount    = stats?.mnfRedCount    ?? 0
  const pct        = total > 0 ? Math.round((submitted / total) * 100) : 0
  const arcColor   = pct === 100 ? '#4ADE80' : pct >= 60 ? '#38BDF8' : pct >= 30 ? '#FCD34D' : '#F87171'
  const r          = 20
  const circ       = 2 * Math.PI * r
  const dash       = (pct / 100) * circ

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 overflow-y-auto',
        sidebarCollapsed ? 'w-16' : 'w-[220px]'
      )}
      style={{
        background: 'linear-gradient(180deg, #05091E 0%, #040812 100%)',
        borderRight: '1px solid rgba(71,130,255,.15)',
        boxShadow: '4px 0 40px rgba(0,0,0,.50)',
      }}
    >
      {/* ── Brand ── */}
      <div
        className="relative px-4 pt-5 pb-4 shrink-0 overflow-hidden"
        style={{
          borderBottom: '1px solid rgba(71,130,255,.10)',
          background: 'linear-gradient(135deg, rgba(59,130,246,.10) 0%, transparent 60%)',
        }}
      >
        {/* bg glow blob */}
        <div
          aria-hidden
          className="absolute -top-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,.18) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl text-[11px] font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,.30), rgba(56,189,248,.18))',
              border: '1px solid rgba(59,130,246,.45)',
              color: '#93C5FD',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 0 16px rgba(59,130,246,.30), inset 0 1px 0 rgba(255,255,255,.10)',
            }}
          >
            NW
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="text-[13px] font-bold leading-tight tracking-wide" style={{ color: '#E4ECFF' }}>
                WSC-R10
              </p>
              <p className="text-[9px] tracking-[.18em] uppercase mt-px" style={{ color: '#6B8DB8', fontFamily: 'var(--font-mono)' }}>
                NRW Tracker
              </p>
            </div>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="relative brand-badge">PWA · เขต 10</div>
        )}
      </div>

      {/* ── Stats mini-card ── */}
      {!sidebarCollapsed && (
        <div
          className="mx-3 my-3 rounded-xl shrink-0 overflow-hidden"
          style={{
            background: 'rgba(8,14,36,.90)',
            border: '1px solid rgba(71,130,255,.14)',
          }}
        >
          {/* Arc + text */}
          <div className="flex items-center gap-3 px-3 pt-3 pb-2">
            <div className="relative shrink-0">
              <svg width="50" height="50" className="-rotate-90">
                <circle cx="25" cy="25" r={r} fill="none" stroke="rgba(71,130,255,.08)" strokeWidth="3.5" />
                <circle
                  cx="25" cy="25" r={r} fill="none"
                  stroke={arcColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                  style={{
                    transition: 'stroke-dasharray .7s ease',
                    filter: `drop-shadow(0 0 4px ${arcColor}88)`,
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span style={{ color: arcColor, fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {pct}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-[9px] mb-0.5 uppercase tracking-[.12em]" style={{ color: '#4A6490', fontFamily: 'var(--font-mono)' }}>
                ส่งรายงาน
              </p>
              <p style={{ color: '#E4ECFF', fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700, lineHeight: 1 }}>
                {submitted}
                <span style={{ color: '#6B8DB8', fontSize: '11px', fontWeight: 400 }}> / {total}</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-3 pb-2.5">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(71,130,255,.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: arcColor,
                  boxShadow: `0 0 6px ${arcColor}`,
                }}
              />
            </div>
          </div>

          <div className="h-px mx-3" style={{ background: 'rgba(71,130,255,.08)' }} />

          {/* Stats row 1 */}
          <div className="px-3 pt-2.5 pb-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#4A6490', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>ค้าง</p>
              <p style={{ color: pending > 0 ? '#F87171' : '#34D399', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
                {pending}
              </p>
            </div>
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#4A6490', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>อุปสรรค</p>
              <p style={{ color: obstacles > 0 ? '#FCD34D' : '#34D399', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
                {obstacles}
              </p>
            </div>
          </div>
          <div className="h-px mx-3" style={{ background: 'rgba(71,130,255,.06)' }} />
          {/* Stats row 2 */}
          <div className="px-3 pt-2 pb-2.5 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#4A6490', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>Action🔴</p>
              <p style={{ color: overdueActions > 0 ? '#F87171' : '#34D399', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
                {overdueActions}
              </p>
            </div>
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#4A6490', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>MNF🔴</p>
              <p style={{ color: mnfRedCount > 0 ? '#FB923C' : '#34D399', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
                {mnfRedCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-4 mb-1 pt-1">
                <span
                  className="text-[9px] font-bold tracking-[.18em] uppercase shrink-0"
                  style={{ color: '#4A6490', fontFamily: 'var(--font-mono)' }}
                >
                  {group.label}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(71,130,255,.08)' }} />
              </div>
            )}

            {group.items.map((item) => {
              const isActive = 'exact' in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className="group relative flex items-center gap-2.5 mx-2 mb-px py-[7px] px-3 rounded-xl text-[13px] font-medium transition-all duration-150"
                  style={isActive ? {
                    background: 'linear-gradient(90deg, rgba(59,130,246,.18), rgba(59,130,246,.08))',
                    border: '1px solid rgba(59,130,246,.28)',
                    color: '#93C5FD',
                    boxShadow: 'inset 3px 0 0 #3B82F6, 0 0 20px rgba(59,130,246,.08)',
                  } : {
                    border: '1px solid transparent',
                    color: '#6B8DB8',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = 'rgba(71,130,255,.07)'
                      el.style.color = '#8DB4D8'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = ''
                      el.style.color = '#6B8DB8'
                    }
                  }}
                >
                  <Icon
                    size={15}
                    className="shrink-0 transition-colors"
                    style={{ color: isActive ? '#60A5FA' : 'currentColor' }}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!sidebarCollapsed && 'badge' in item && item.badge === 'new' && (
                    <span className="nav-badge-new">ใหม่</span>
                  )}
                  {/* Active indicator dot for collapsed */}
                  {sidebarCollapsed && isActive && (
                    <span
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: '#60A5FA', boxShadow: '0 0 6px #60A5FA' }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Collapse toggle ── */}
      <button
        onClick={toggleSidebar}
        title={sidebarCollapsed ? 'ขยาย' : 'ย่อ'}
        className="flex items-center justify-center h-10 shrink-0 transition-all"
        style={{ borderTop: '1px solid rgba(71,130,255,.09)', color: '#4A6490' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#4782FF' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A6490' }}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
