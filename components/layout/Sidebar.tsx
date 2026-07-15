'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, ClipboardList, Target, AlertTriangle,
  Calendar, BookOpen, Download, ChevronLeft, ChevronRight,
  Droplets, ListChecks, FileText, Crosshair, Activity, Building2, Presentation, GitBranch, Network,
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
      { href: '/executive-summary',   label: 'บทสรุปผู้บริหาร',     icon: Presentation },
      { href: '/mnf-monitor',         label: 'MNF Monitor',          icon: Activity },
      { href: '/report-nrw',          label: 'Report NRW',           icon: Droplets },
      { href: '/water-tree',          label: 'ผังจ่ายน้ำ',            icon: GitBranch },
      { href: '/project-progress',    label: 'ความก้าวหน้าโครงการ',  icon: Building2 },
      { href: '/pipeline',            label: 'Pipeline Monitor',      icon: Network },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/ranking', label: 'Ranking สาขา', icon: BarChart3 }] : []),
    ],
  },
  {
    label: 'ประชุม WSC-R',
    items: [
      { href: '/meeting', label: 'วาระ / มติ / สั่งการ', icon: Calendar, exact: true },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/action',  label: 'Action Tracker',  icon: Crosshair }] : []),
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/summary', label: 'Exec. Summary', icon: FileText, badge: 'new' as const }] : []),
    ],
  },
  {
    label: 'รายงานรายเดือน',
    items: [
      { href: '/pdca',     label: 'กรอกผล / PDCA',   icon: ClipboardList },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/five-topics', label: 'รายงาน 5 หัวข้อ', icon: ListChecks }] : []),
      { href: '/obstacle', label: 'Obstacle Tracker', icon: AlertTriangle },
    ],
  },
  {
    label: 'แผนและ KM',
    items: [
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/plans', label: 'แผนลดน้ำสูญเสีย', icon: Target }] : []),
      { href: '/km',       label: 'KM Best Practice', icon: BookOpen },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/export', label: 'Export ข้อมูล', icon: Download }] : []),
    ],
  },
]

export function Sidebar({ stats, notifyCount: _notifyCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  const total          = stats?.totalBranches  ?? 26
  const submitted      = stats?.submitted      ?? 0
  const pending        = stats?.pending        ?? 0
  const obstacles      = stats?.openObstacles  ?? 0
  const overdueActions = stats?.overdueActions ?? 0
  const mnfRedCount    = stats?.mnfRedCount    ?? 0
  const pct        = total > 0 ? Math.round((submitted / total) * 100) : 0
  const arcColor   = pct === 100 ? '#1E7A5A' : pct >= 60 ? '#2B5C86' : pct >= 30 ? '#A8721A' : '#B3392C'
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
        background: '#FFFFFF',
        borderRight: '1px solid #E3E7EC',
      }}
    >
      {/* ── Brand ── */}
      <div
        className="relative px-4 pt-5 pb-4 shrink-0 overflow-hidden"
        style={{
          borderBottom: '1px solid #E3E7EC',
          background: 'linear-gradient(135deg, #EAF1F0 0%, transparent 60%)',
        }}
      >
        <div className="relative flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl text-[11px] font-bold"
            style={{
              background: '#0B6E76',
              color: '#FFFFFF',
              fontFamily: 'var(--font-mono)',
            }}
          >
            NW
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="text-[13px] font-bold leading-tight tracking-wide" style={{ color: '#12181F' }}>
                WSC-R10
              </p>
              <p className="text-[9px] tracking-[.18em] uppercase mt-px" style={{ color: '#6B7686', fontFamily: 'var(--font-mono)' }}>
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
            background: '#FFFFFF',
            border: '1px solid #E3E7EC',
            boxShadow: '0 1px 2px rgba(18,24,31,.04)',
          }}
        >
          {/* Arc + text */}
          <div className="flex items-center gap-3 px-3 pt-3 pb-2">
            <div className="relative shrink-0">
              <svg width="50" height="50" className="-rotate-90">
                <circle cx="25" cy="25" r={r} fill="none" stroke="#EFF2F5" strokeWidth="3.5" />
                <circle
                  cx="25" cy="25" r={r} fill="none"
                  stroke={arcColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                  style={{ transition: 'stroke-dasharray .7s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span style={{ color: arcColor, fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {pct}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-[9px] mb-0.5 uppercase tracking-[.12em]" style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)' }}>
                ส่งรายงาน
              </p>
              <p style={{ color: '#12181F', fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700, lineHeight: 1 }}>
                {submitted}
                <span style={{ color: '#8896A3', fontSize: '11px', fontWeight: 400 }}> / {total}</span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-3 pb-2.5">
            <div className="h-[3px] rounded-full overflow-hidden" style={{ background: '#EFF2F5' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: arcColor }}
              />
            </div>
          </div>

          <div className="h-px mx-3" style={{ background: '#E3E7EC' }} />

          {/* Stats row 1 */}
          <div className="px-3 pt-2.5 pb-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>ค้าง</p>
              <p style={{ color: pending > 0 ? '#B3392C' : '#1E7A5A', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
                {pending}
              </p>
            </div>
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>อุปสรรค</p>
              <p style={{ color: obstacles > 0 ? '#A8721A' : '#1E7A5A', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
                {obstacles}
              </p>
            </div>
          </div>
          <div className="h-px mx-3" style={{ background: '#E3E7EC' }} />
          {/* Stats row 2 */}
          <div className="px-3 pt-2 pb-2.5 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>Action ค้าง</p>
              <p style={{ color: overdueActions > 0 ? '#B3392C' : '#1E7A5A', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
                {overdueActions}
              </p>
            </div>
            <div>
              <p className="text-[9px] mb-0.5" style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.10em' }}>MNF แดง</p>
              <p style={{ color: mnfRedCount > 0 ? '#B5651D' : '#1E7A5A', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, lineHeight: 1 }}>
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
                  style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)' }}
                >
                  {group.label}
                </span>
                <div className="flex-1 h-px" style={{ background: '#E3E7EC' }} />
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
                    background: '#EAF1F0',
                    border: '1px solid #0B6E7640',
                    color: '#0B6E76',
                    boxShadow: 'inset 3px 0 0 #0B6E76',
                  } : {
                    border: '1px solid transparent',
                    color: '#4B5563',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = '#F5F6F8'
                      el.style.color = '#12181F'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = ''
                      el.style.color = '#4B5563'
                    }
                  }}
                >
                  <Icon
                    size={15}
                    className="shrink-0 transition-colors"
                    style={{ color: isActive ? '#0B6E76' : 'currentColor' }}
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
                      style={{ background: '#0B6E76' }}
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
        style={{ borderTop: '1px solid #E3E7EC', color: '#98A2AF' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0B6E76' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#98A2AF' }}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
