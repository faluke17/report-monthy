'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, ClipboardList, Calendar, Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_NAV = [
  { href: '/dashboard', label: 'ภาพรวม',  icon: LayoutDashboard },
  { href: '/ranking',   label: 'อันดับ',   icon: BarChart3 },
  { href: '/monthly',   label: 'รายงาน',   icon: ClipboardList },
  { href: '/meeting',   label: 'วาระ/มติ', icon: Calendar },
  { href: '/notify',    label: 'แจ้งเตือน', icon: Bell },
]

export function MobileNav({ notifyCount = 0 }: { notifyCount?: number }) {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-[#0b1d3a] border-t border-white/10 z-50">
      <div className="flex">
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          const hasNotif = item.href === '/notify' && notifyCount > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors text-xs',
                isActive ? 'text-cyan-400' : 'text-white/40 hover:text-white/80'
              )}
            >
              <span className="relative">
                <Icon size={20} />
                {hasNotif && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold bg-red-500 text-white rounded-full px-0.5">
                    {notifyCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
