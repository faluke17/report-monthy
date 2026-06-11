'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useOnlinePresence, type PresenceUser } from '@/hooks/useOnlinePresence'

interface OnlineIndicatorProps {
  username: string
  name: string
  surname: string
  branch_name: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'เพิ่งเข้า'
  if (diff < 3600) return `${Math.floor(diff / 60)} นาที`
  return `${Math.floor(diff / 3600)} ชม.`
}

function UserRow({ user, tick }: { user: PresenceUser; tick: number }) {
  const initials = [user.name?.[0], user.surname?.[0]].filter(Boolean).join('').toUpperCase()
  const isRegion = !user.branch_name
  const label = isRegion ? 'ส่วนเขต' : `สาขา${user.branch_name}`

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: 'rgba(71,130,255,.04)' }}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
        style={{
          background: isRegion ? 'rgba(52,211,153,.15)' : 'rgba(71,130,255,.15)',
          color: isRegion ? '#34D399' : '#93C5FD',
          border: `1px solid ${isRegion ? 'rgba(52,211,153,.25)' : 'rgba(71,130,255,.25)'}`,
        }}
      >
        {initials || 'U'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium leading-tight truncate" style={{ color: '#E4ECFF' }}>
          {user.name} {user.surname}
        </p>
        <p className="text-[10px] leading-tight mt-0.5" style={{ color: '#3D5380' }}>
          {label}
        </p>
      </div>

      {/* tick ใช้เพื่อ force re-render ให้ timeAgo อัปเดต */}
      <span key={tick} className="text-[10px] shrink-0" style={{ color: '#3D5380' }}>
        {timeAgo(user.joined_at)}
      </span>
    </div>
  )
}

export function OnlineIndicator({ username, name, surname, branch_name }: OnlineIndicatorProps) {
  const users = useOnlinePresence({ username, name, surname, branch_name })
  const count = users.length

  // อัปเดต time label ทุก 30 วิ
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 outline-none transition-all"
          style={{ border: '1px solid transparent' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'rgba(52,211,153,.08)'
            el.style.borderColor = 'rgba(52,211,153,.20)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = ''
            el.style.borderColor = 'transparent'
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: '#34D399' }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: '#34D399' }}
            />
          </span>
          <Users size={13} style={{ color: '#34D399' }} />
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#34D399' }}>
            {count}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[260px] p-0 overflow-hidden"
        style={{
          background: '#080F25',
          border: '1px solid rgba(71,130,255,.20)',
          boxShadow: '0 16px 48px rgba(0,0,0,.70), 0 0 0 1px rgba(71,130,255,.06) inset',
          borderRadius: '12px',
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid rgba(71,130,255,.10)' }}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#34D399' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#34D399' }} />
            </span>
            <span className="text-[11px] font-semibold" style={{ color: '#34D399' }}>
              ออนไลน์อยู่
            </span>
          </div>
          <span
            className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(52,211,153,.12)', color: '#34D399' }}
          >
            {count} คน
          </span>
        </div>

        <div className="p-2 flex flex-col gap-1 max-h-[280px] overflow-y-auto">
          {count === 0 ? (
            <p className="text-center text-[12px] py-4" style={{ color: '#3D5380' }}>
              ไม่มีผู้ใช้ออนไลน์
            </p>
          ) : (
            users.map((u) => (
              <UserRow key={u.username} user={u} tick={tick} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
