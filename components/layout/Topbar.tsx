'use client'

import { usePathname } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { PwaSession } from '@/lib/pwa-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/layout/NotificationBell'
import type { MeetingWithRequirements } from '@/lib/types'

interface TopbarProps {
  session: PwaSession
  notifyCount?: number
  requirementCount?: number
  requirementMeetings?: MeetingWithRequirements[]
  isRegion?: boolean
}

const PAGE_META: Record<string, { kicker: string; title: string }> = {
  '/dashboard': { kicker: 'Executive View', title: 'ภาพรวมเขต 10' },
  '/ranking':   { kicker: 'Performance',   title: 'Ranking สาขา' },
  '/monthly':   { kicker: 'Monthly Report', title: 'รายงานรายเดือน' },
  '/plans':     { kicker: 'Plan Tracker',   title: 'แผนลดน้ำสูญเสีย' },
  '/obstacle':  { kicker: 'Issue Tracker',  title: 'Obstacle Tracker' },
  '/action':    { kicker: 'Action Tracker', title: 'ข้อสั่งการ / Action Items' },
  '/meeting':   { kicker: 'Meeting Hub',    title: 'วาระ / มติ / สั่งการ' },
  '/summary':   { kicker: 'Executive View', title: 'Executive Summary' },
  '/notify':    { kicker: 'Notification',   title: 'การแจ้งเตือน' },
  '/km':        { kicker: 'Knowledge Mgmt', title: 'KM Best Practice' },
  '/export':    { kicker: 'Data Export',    title: 'ส่งออกรายงาน' },
}

export function Topbar({
  session,
  notifyCount = 0,
  requirementCount = 0,
  requirementMeetings = [],
  isRegion = false,
}: TopbarProps) {
  const pathname = usePathname()

  const meta = Object.entries(PAGE_META).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? { kicker: 'NRW Tracker', title: 'กปภ.เขต 10' }

  async function handleSignOut() {
    await fetch('/api/auth/pwa-logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const fullName = `${session.name} ${session.surname}`.trim()
  const initials = [session.name[0], session.surname[0]].filter(Boolean).join('').toUpperCase()

  return (
    <header
      className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-10 backdrop-blur-xl"
      style={{
        background: 'rgba(3,6,13,.92)',
        borderBottom: '1px solid rgba(0,229,255,.18)',
        boxShadow: '0 1px 24px -4px rgba(0,229,255,.12)',
      }}
    >
      <div className="flex flex-col gap-0.5">
        <p className="page-kicker hidden sm:block">{meta.kicker}</p>
        <p className="text-[15px] md:text-[17px] font-bold text-white leading-tight">{meta.title}</p>
      </div>

      <div className="flex items-center gap-3">
        {session.branch_name && (
          <span className="scope-chip hidden sm:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            สาขา{session.branch_name}
          </span>
        )}

        <NotificationBell
          notifyCount={notifyCount}
          requirementCount={requirementCount}
          meetings={requirementMeetings}
          isRegion={isRegion}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1.5 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                  {initials || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-white leading-tight">{fullName || 'ผู้ใช้งาน'}</p>
                <p className="text-[11px] text-white/35">{session.position_name || session.job_name || 'เจ้าหน้าที่'}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#050912] border-[rgba(0,229,255,.18)] text-white min-w-[210px]"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(0,229,255,.06) inset' }}
          >
            <DropdownMenuLabel className="pb-2">
              <p className="text-sm font-semibold text-white">{fullName}</p>
              <p className="text-[11px] text-white/50 font-normal mt-0.5">
                {session.position_name || session.job_name || 'เจ้าหน้าที่'}
              </p>
              {session.branch_name && (
                <p className="text-[11px] text-cyan-400/70 font-normal">สาขา{session.branch_name}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="gap-2 cursor-pointer hover:bg-[rgba(0,229,255,.07)] focus:bg-[rgba(0,229,255,.07)] text-sm">
              <User size={14} />
              โปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 text-sm"
              onClick={handleSignOut}
            >
              <LogOut size={14} />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
