'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogOut, User, FileText } from 'lucide-react'
import { PwaSession } from '@/lib/pwa-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopbarProps {
  session: PwaSession
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

export function Topbar({ session }: TopbarProps) {
  const pathname = usePathname()

  const meta = Object.entries(PAGE_META).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? { kicker: 'NRW Tracker', title: 'กปภ.เขต 10' }

  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/pwa-logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const fullName = `${session.name} ${session.surname}`.trim()
  const initials = [session.name[0], session.surname[0]].filter(Boolean).join('').toUpperCase()

  const showSummaryBtn = pathname !== '/summary'

  return (
    <header
      className="h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10 backdrop-blur-xl"
      style={{
        background: 'rgba(3,6,13,.92)',
        borderBottom: '1px solid rgba(0,229,255,.18)',
        boxShadow: '0 1px 24px -4px rgba(0,229,255,.12)',
      }}
    >
      <div className="flex flex-col gap-0.5">
        <p className="page-kicker">{meta.kicker}</p>
        <p className="text-[17px] font-bold text-white leading-tight">{meta.title}</p>
      </div>

      <div className="flex items-center gap-3">
        {session.branch_name && (
          <span className="scope-chip hidden sm:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            สาขา{session.branch_name}
          </span>
        )}

        {showSummaryBtn && (
          <button
            onClick={() => router.push('/summary')}
            className="hidden sm:flex items-center gap-1.5 text-xs border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <FileText size={13} />
            สรุป 1 หน้า
          </button>
        )}

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
