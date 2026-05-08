'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, ClipboardList, Target, AlertTriangle,
  Calendar, Bell, BookOpen, Download, ChevronLeft, ChevronRight,
  Droplets, ListChecks, FileText, Crosshair,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface SidebarStats {
  totalBranches: number
  submitted: number
  pending: number
  openObstacles: number
}

interface SidebarProps {
  stats?: SidebarStats
  notifyCount?: number
}

const NAV_GROUPS = [
  {
    label: 'ภาพรวม',
    items: [
      { href: '/dashboard', label: 'Dashboard เขต',    icon: LayoutDashboard },
      { href: '/ranking',   label: 'Ranking สาขา',     icon: BarChart3 },
    ],
  },
  {
    label: 'ประชุม WSC-R',
    items: [
      { href: '/meeting', label: 'วาระ / มติ / สั่งการ', icon: Calendar, exact: true },
      { href: '/action',  label: 'Action Tracker',       icon: Crosshair },
      { href: '/summary',          label: 'Executive Summary',    icon: FileText, badge: 'new' as const },
      { href: '/notify',           label: 'การแจ้งเตือน',          icon: Bell },
    ],
  },
  {
    label: 'รายงานรายเดือน',
    items: [
      { href: '/monthly',      label: 'กรอกผล / PDCA',     icon: ClipboardList },
      { href: '/five-topics',  label: 'รายงาน 5 หัวข้อ',   icon: ListChecks },
      { href: '/obstacle',     label: 'Obstacle Tracker',   icon: AlertTriangle },
    ],
  },
  {
    label: 'แผนและ KM',
    items: [
      { href: '/plans',  label: 'แผนลดน้ำสูญเสีย', icon: Target },
      { href: '/km',     label: 'KM Best Practice', icon: BookOpen },
      { href: '/export', label: 'Export ข้อมูล',    icon: Download },
    ],
  },
]

export function Sidebar({ stats, notifyCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 border-r border-white/10 transition-all duration-300 overflow-y-auto',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
      style={{
        background: 'linear-gradient(180deg,#09224c 0%,#061a38 52%,#041126 100%)',
      }}
    >
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/20 flex items-center justify-center shrink-0">
            <Droplets size={16} className="text-cyan-400" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <p className="text-sm font-bold text-white leading-tight">NRW Tracker</p>
              <p className="text-[10px] text-white/40">กปภ.เขต 10</p>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <div className="brand-badge">PWA10 · NRW V1.0</div>
        )}
      </div>

      {/* Side Stats — health card */}
      {!sidebarCollapsed && (() => {
        const total      = stats?.totalBranches ?? 26
        const submitted  = stats?.submitted     ?? 0
        const pending    = stats?.pending       ?? 0
        const obstacles  = stats?.openObstacles ?? 0
        const pct        = total > 0 ? Math.round((submitted / total) * 100) : 0
        const arcColor   = pct === 100 ? '#4ade80' : pct >= 50 ? '#2dd4bf' : '#fb7185'
        const r          = 20
        const circ       = 2 * Math.PI * r
        const dash       = (pct / 100) * circ

        return (
          <div className="mx-3 my-2.5 shrink-0 rounded-2xl border border-white/8 overflow-hidden"
            style={{ background: 'linear-gradient(145deg,rgba(11,29,58,0.95) 0%,rgba(6,16,36,0.98) 100%)' }}>

            {/* Arc meter row */}
            <div className="flex items-center gap-3 px-3 pt-3 pb-2">
              <div className="relative shrink-0">
                <svg width="50" height="50" className="-rotate-90">
                  <circle cx="25" cy="25" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle
                    cx="25" cy="25" r={r} fill="none"
                    stroke={arcColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    style={{ filter: `drop-shadow(0 0 5px ${arcColor}99)`, transition: 'stroke-dasharray .7s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="num text-[12px] font-bold leading-none" style={{ color: arcColor }}>
                    {pct}%
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-widest text-white/25 mb-0.5">สาขาที่ส่ง</p>
                <p className="num text-[13px] font-bold text-white leading-tight">{submitted}
                  <span className="text-[11px] font-normal text-white/35"> / {total}</span>
                </p>
                <p className="text-[9px] text-white/25 mt-0.5">สาขาประจำเดือนนี้</p>
              </div>
            </div>

            {/* Gradient progress bar */}
            <div className="px-3 pb-2.5">
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${arcColor}99, ${arcColor})`,
                    boxShadow: `0 0 8px ${arcColor}66`,
                  }}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="mx-3 h-px bg-white/6" />

            {/* Stats rows */}
            <div className="px-3 py-2.5 space-y-2">
              {/* ยังไม่ส่ง */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: '#fb7185',
                      boxShadow: pending > 0 ? '0 0 6px #fb718599' : 'none',
                      animation: pending > 0 ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
                    }}
                  />
                  <span className="text-[11px] text-white/40">ยังไม่ส่ง</span>
                </div>
                <span className="num text-[12px] font-semibold text-red-400">
                  {pending}{pending > 0 && <span className="ml-0.5 text-[9px] opacity-50">⚠</span>}
                </span>
              </div>

              {/* อุปสรรค */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: '#f6c453',
                      boxShadow: obstacles > 0 ? '0 0 6px #f6c45399' : 'none',
                      animation: obstacles > 0 ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
                    }}
                  />
                  <span className="text-[11px] text-white/40">อุปสรรคเปิดอยู่</span>
                </div>
                <span className="num text-[12px] font-semibold text-amber-400">{obstacles}</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {!sidebarCollapsed && (
              <p className="px-4 mb-1 text-[9px] font-bold tracking-widest uppercase text-white/25">
                {group.label}
              </p>
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
                  className={cn(
                    'relative flex items-center gap-2.5 mx-2 px-3 py-2 rounded-xl mb-0.5 transition-all text-[13px]',
                    isActive
                      ? 'bg-[rgba(216,180,90,.14)] text-[#ffe4a3] border border-[rgba(216,180,90,.3)]'
                      : 'text-white/45 hover:text-white hover:bg-white/5 border border-transparent'
                  )}
                >
                  <Icon size={17} className="shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!sidebarCollapsed && 'badge' in item && item.badge === 'new' && (
                    <span className="nav-badge-new">ใหม่</span>
                  )}
                  {item.href === '/notify' && notifyCount > 0 && (
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/25 text-red-400 border border-red-500/30',
                      sidebarCollapsed ? 'absolute -top-1 -right-1' : ''
                    )}>
                      {notifyCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-white/10 text-white/30 hover:text-white/70 transition-colors shrink-0"
        title={sidebarCollapsed ? 'ขยาย' : 'ย่อ'}
      >
        {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </aside>
  )
}
