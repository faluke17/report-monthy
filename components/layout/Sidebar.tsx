'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, ClipboardList, Target, AlertTriangle,
  CheckSquare, Calendar, Bell, BookOpen, Download, ChevronLeft, ChevronRight,
  Droplets, ListChecks, FileText,
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
      { href: '/action',           label: 'Action Tracker',       icon: CheckSquare },
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

      {/* Side Stats */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-white/10 space-y-1.5 shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/40">สาขาทั้งหมด</span>
            <span className="num text-[13px] font-semibold text-white">{stats?.totalBranches ?? 26}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/40">ส่งผลแล้ว</span>
            <span className="num text-[13px] font-semibold text-teal-400">{stats?.submitted ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/40">ยังไม่ส่ง ⚠</span>
            <span className="num text-[13px] font-semibold text-red-400">{stats?.pending ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-white/40">อุปสรรคเปิดอยู่</span>
            <span className="num text-[13px] font-semibold text-amber-400">{stats?.openObstacles ?? '—'}</span>
          </div>
        </div>
      )}

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
