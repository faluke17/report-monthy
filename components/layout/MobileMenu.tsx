'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from '@/components/ui/sheet'
import { NAV_GROUPS, type SidebarStats } from './nav-groups'

interface MobileMenuProps {
  stats?: SidebarStats
}

export function MobileMenu({ stats }: MobileMenuProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const total     = stats?.totalBranches ?? 26
  const submitted = stats?.submitted     ?? 0
  const pending   = stats?.pending       ?? 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="xl:hidden flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-all"
          style={{ border: '1px solid #E3E7EC', color: '#4B5563' }}
          aria-label="เปิดเมนู"
        >
          <Menu size={18} />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[280px] p-0 flex flex-col" style={{ background: '#FFFFFF' }}>
        <SheetTitle className="sr-only">เมนูนำทาง</SheetTitle>

        {/* ── Brand ── */}
        <div
          className="px-4 pt-5 pb-4 shrink-0"
          style={{
            borderBottom: '1px solid #E3E7EC',
            background: 'linear-gradient(135deg, #EAF1F0 0%, transparent 60%)',
          }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl text-[11px] font-bold"
              style={{ background: '#0B6E76', color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}
            >
              NW
            </div>
            <div>
              <p className="text-[13px] font-bold leading-tight tracking-wide" style={{ color: '#12181F' }}>
                WSC-R10
              </p>
              <p className="text-[9px] tracking-[.18em] uppercase mt-px" style={{ color: '#6B7686', fontFamily: 'var(--font-mono)' }}>
                NRW Tracker
              </p>
            </div>
          </div>
          <p className="text-[11px] mt-2" style={{ color: '#6B7686' }}>
            ส่งรายงานแล้ว {submitted}/{total} สาขา · ค้าง {pending}
          </p>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="flex items-center gap-2 px-4 mb-1 pt-1">
                <span
                  className="text-[9px] font-bold tracking-[.18em] uppercase shrink-0"
                  style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)' }}
                >
                  {group.label}
                </span>
                <div className="flex-1 h-px" style={{ background: '#E3E7EC' }} />
              </div>

              {group.items.map((item) => {
                const isActive = 'exact' in item && item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 mx-2 mb-px py-2.5 px-3 rounded-xl text-[14px] font-medium transition-all"
                    style={isActive ? {
                      background: '#EAF1F0',
                      border: '1px solid #0B6E7640',
                      color: '#0B6E76',
                      boxShadow: 'inset 3px 0 0 #0B6E76',
                    } : {
                      border: '1px solid transparent',
                      color: '#4B5563',
                    }}
                  >
                    <Icon size={16} className="shrink-0" style={{ color: isActive ? '#0B6E76' : 'currentColor' }} />
                    <span className="truncate flex-1">{item.label}</span>
                    {'badge' in item && item.badge === 'new' && (
                      <span className="nav-badge-new">ใหม่</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
