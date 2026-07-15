'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, ClipboardList, Calendar, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_NAV = [
  { href: '/executive-summary', label: 'ภาพรวม',  icon: LayoutDashboard },
  ...(process.env.NODE_ENV !== 'production' ? [{ href: '/ranking', label: 'อันดับ', icon: BarChart3 }] : []),
  { href: '/pdca',      label: 'PDCA',      icon: ClipboardList },
  { href: '/meeting',   label: 'วาระ/มติ', icon: Calendar },
  { href: '/plans',     label: 'แผน',      icon: Target },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50"
      style={{
        background: 'rgba(255,255,255,.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #E3E7EC',
        boxShadow: '0 -2px 12px rgba(18,24,31,.06)',
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
              style={{ color: isActive ? '#0B6E76' : '#8896A3' }}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full"
                  style={{ background: '#0B6E76' }}
                />
              )}
              <Icon size={20} style={{ color: isActive ? '#0B6E76' : 'currentColor' }} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
