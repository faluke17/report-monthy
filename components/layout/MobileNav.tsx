'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart3, ClipboardList, CheckSquare, Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_NAV = [
  { href: '/dashboard', label: 'ภาพรวม',  icon: LayoutDashboard },
  { href: '/ranking',   label: 'อันดับ',   icon: BarChart3 },
  { href: '/monthly',   label: 'รายงาน',   icon: ClipboardList },
  { href: '/action',    label: 'Actions',  icon: CheckSquare },
  { href: '/notify',    label: 'แจ้งเตือน', icon: Bell },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-[#0b1d3a] border-t border-white/10 z-50">
      <div className="flex">
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors text-xs',
                isActive ? 'text-cyan-400' : 'text-white/40 hover:text-white/80'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
