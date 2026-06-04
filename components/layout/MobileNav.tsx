'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, ClipboardList, Calendar, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_NAV = [
  { href: '/dashboard', label: 'ภาพรวม',  icon: LayoutDashboard },
  { href: '/ranking',   label: 'อันดับ',   icon: BarChart3 },
  { href: '/monthly',   label: 'รายงาน',   icon: ClipboardList },
  { href: '/meeting',   label: 'วาระ/มติ', icon: Calendar },
  { href: '/plans',     label: 'แผน',      icon: Target },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50"
      style={{
        background: 'rgba(5,9,26,.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(71,130,255,.16)',
        boxShadow: '0 -4px 24px rgba(0,0,0,.50)',
      }}
    >
      <div className="flex">
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium transition-all'
              )}
              style={{ color: isActive ? '#93C5FD' : '#3D5380' }}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
                  style={{ background: '#4782FF', boxShadow: '0 0 8px rgba(71,130,255,.70)' }}
                />
              )}
              <Icon size={20} style={{ color: isActive ? '#4782FF' : 'currentColor' }} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
