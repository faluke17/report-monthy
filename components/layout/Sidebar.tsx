'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { NAV_GROUPS, type SidebarStats } from './nav-groups'
import { SidebarStatsTicker } from './SidebarStatsTicker'
import type { TopWaterSavedResult } from '@/app/actions/nrw-report'

interface SidebarProps {
  stats?:               SidebarStats
  notifyCount?:         number
  latestNrwDataPeriod?: { year: number; month: number } | null
  topWaterSaved?:       TopWaterSavedResult | null
}

export function Sidebar({ stats: _stats, notifyCount: _notifyCount = 0, latestNrwDataPeriod = null, topWaterSaved = null }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        'hidden xl:flex flex-col h-screen sticky top-0 transition-all duration-300 overflow-y-auto',
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

      {/* ── สกู๊ปข่าว (news-scoop ticker, หมุนทุก 5 วิ) ── */}
      {!sidebarCollapsed && (
        <SidebarStatsTicker latestNrwDataPeriod={latestNrwDataPeriod} topWaterSaved={topWaterSaved} />
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_GROUPS.filter((group) => group.items.length > 0).map((group) => (
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
