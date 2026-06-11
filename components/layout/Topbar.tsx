'use client'

import { usePathname } from 'next/navigation'
import { LogOut, User, ChevronRight } from 'lucide-react'
import { PwaSession } from '@/lib/pwa-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { OnlineIndicator } from '@/components/layout/OnlineIndicator'
import type { MeetingWithRequirements } from '@/lib/types'

interface TopbarProps {
  session: PwaSession
  notifyCount?: number
  requirementCount?: number
  requirementMeetings?: MeetingWithRequirements[]
  isRegion?: boolean
}

const PAGE_META: Record<string, { kicker: string; title: string }> = {
  '/dashboard':          { kicker: 'Executive View',  title: 'ภาพรวมเขต 10' },
  '/ranking':            { kicker: 'Performance',     title: 'Ranking สาขา' },
  '/monthly':            { kicker: 'Monthly Report',  title: 'รายงานรายเดือน' },
  '/plans':              { kicker: 'Plan Tracker',    title: 'แผนลดน้ำสูญเสีย' },
  '/obstacle':           { kicker: 'Issue Tracker',   title: 'Obstacle Tracker' },
  '/action':             { kicker: 'Action Tracker',  title: 'ข้อสั่งการ / Action Items' },
  '/meeting':            { kicker: 'Meeting Hub',     title: 'วาระ / มติ / สั่งการ' },
  '/summary':            { kicker: 'Executive View',  title: 'Executive Summary' },
  '/executive-summary':  { kicker: 'Executive',       title: 'บทสรุปผู้บริหาร' },
  '/mnf-monitor':        { kicker: 'MNF Monitor',     title: 'ตรวจสอบ MNF EMA' },
  '/report-nrw':         { kicker: 'NRW Report',      title: 'รายงาน NRW รายสาขา' },
  '/project-progress':   { kicker: 'Project',         title: 'ความก้าวหน้าโครงการ' },
  '/five-topics':        { kicker: 'Five Topics',     title: 'รายงาน 5 หัวข้อ' },
  '/km':                 { kicker: 'Knowledge Mgmt',  title: 'KM Best Practice' },
  '/export':             { kicker: 'Data Export',     title: 'ส่งออกรายงาน' },
  '/notify':             { kicker: 'Notification',    title: 'การแจ้งเตือน' },
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
  const initials = [session.name?.[0], session.surname?.[0]].filter(Boolean).join('').toUpperCase()
  const role     = session.position_name || session.job_name || 'เจ้าหน้าที่'

  return (
    <header
      className="h-14 md:h-15 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-20"
      style={{
        height: '56px',
        background: 'rgba(4,8,22,.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(71,130,255,.18)',
        boxShadow: '0 1px 0 rgba(59,130,246,.08), 0 4px 24px rgba(0,0,0,.40)',
      }}
    >
      {/* ── Page title (left) ── */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex items-center gap-2 text-[10px]" style={{ color: '#243254', fontFamily: 'var(--font-mono)', letterSpacing: '.10em', textTransform: 'uppercase' }}>
          <span>กปภ.เขต 10</span>
          <ChevronRight size={10} style={{ color: '#243254' }} />
          <span style={{ color: '#4782FF' }}>{meta.kicker}</span>
        </div>
        <div className="hidden sm:block w-px h-4" style={{ background: 'rgba(71,130,255,.18)' }} />
        <p
          className="text-[15px] md:text-[16px] font-semibold leading-tight truncate"
          style={{ color: '#E4ECFF' }}
        >
          {meta.title}
        </p>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-2 shrink-0">
        {session.branch_name && (
          <span className="scope-chip hidden sm:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#4782FF' }} />
            สาขา{session.branch_name}
          </span>
        )}

        <OnlineIndicator
          username={session.username}
          name={session.name}
          surname={session.surname}
          branch_name={session.branch_name ?? ''}
        />

        <NotificationBell
          notifyCount={notifyCount}
          requirementCount={requirementCount}
          meetings={requirementMeetings}
          isRegion={isRegion}
        />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-all"
              style={{ border: '1px solid transparent' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(71,130,255,.08)'
                el.style.borderColor = 'rgba(71,130,255,.18)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = ''
                el.style.borderColor = 'transparent'
              }}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: 'rgba(71,130,255,.18)',
                    color: '#93C5FD',
                    border: '1px solid rgba(71,130,255,.30)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {initials || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-semibold leading-tight" style={{ color: '#E4ECFF' }}>
                  {fullName || 'ผู้ใช้งาน'}
                </p>
                <p className="text-[10px] leading-tight" style={{ color: '#3D5380' }}>
                  {role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="min-w-[220px] anim-slide-down"
            style={{
              background: '#080F25',
              border: '1px solid rgba(71,130,255,.20)',
              boxShadow: '0 16px 48px rgba(0,0,0,.70), 0 0 0 1px rgba(71,130,255,.06) inset',
              borderRadius: '12px',
              color: '#E4ECFF',
            }}
          >
            <DropdownMenuLabel className="pb-2.5 pt-2.5 px-3">
              <p className="text-[13px] font-semibold" style={{ color: '#E4ECFF' }}>{fullName}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#3D5380' }}>{role}</p>
              {session.branch_name && (
                <div
                  className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded text-[10px] font-medium"
                  style={{ background: 'rgba(71,130,255,.12)', color: '#93C5FD', border: '1px solid rgba(71,130,255,.20)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4782FF]" />
                  สาขา{session.branch_name}
                </div>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator style={{ background: 'rgba(71,130,255,.12)', margin: '0' }} />

            <DropdownMenuItem
              className="gap-2.5 cursor-pointer text-[13px] mx-1 my-0.5 rounded-lg px-3"
              style={{ color: '#7B9CCC' }}
            >
              <User size={14} style={{ color: '#4782FF' }} />
              โปรไฟล์
            </DropdownMenuItem>

            <DropdownMenuSeparator style={{ background: 'rgba(71,130,255,.12)', margin: '0' }} />

            <DropdownMenuItem
              className="gap-2.5 cursor-pointer text-[13px] mx-1 my-0.5 rounded-lg px-3"
              style={{ color: '#F87171' }}
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
