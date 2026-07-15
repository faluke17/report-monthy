'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface PresenceUser {
  username: string
  name: string
  surname: string
  branch_name: string
  joined_at: string
}

interface UseOnlinePresenceOptions {
  username: string
  name: string
  surname: string
  branch_name: string
}

const MAX_RETRIES  = 5
const BASE_DELAY   = 2000  // 2s → 4s → 8s → 16s → 32s

export function useOnlinePresence(me: UseOnlinePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const channelRef  = useRef<RealtimeChannel | null>(null)
  const retryRef    = useRef(0)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountRef  = useRef(false)
  const connectRef  = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    if (unmountRef.current) return

    const supabase = createClient()

    // ปิด channel เก่าก่อนถ้ามี
    if (channelRef.current) {
      channelRef.current.untrack()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase.channel('room:online_users', {
      config: { presence: { key: me.username } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        const seen  = new Set<string>()
        const users: PresenceUser[] = Object.values(state)
          .flatMap(s => s)
          .filter(u => {
            if (seen.has(u.username)) return false
            seen.add(u.username)
            return true
          })
        setOnlineUsers(users)
      })
      .subscribe(async (status, err) => {
        if (unmountRef.current) return

        if (status === 'SUBSCRIBED') {
          retryRef.current = 0   // reset retry count on success
          await channel.track({
            username:    me.username,
            name:        me.name,
            surname:     me.surname,
            branch_name: me.branch_name,
            joined_at:   new Date().toISOString(),
          })
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const attempt = retryRef.current
          if (attempt >= MAX_RETRIES) {
            // หยุด retry — ไม่ crash แค่ไม่แสดง online users
            if (process.env.NODE_ENV === 'development') {
              console.warn('[OnlinePresence] gave up after', MAX_RETRIES, 'retries', err?.message ?? status)
            }
            return
          }
          retryRef.current = attempt + 1
          const delay = BASE_DELAY * Math.pow(2, attempt)   // exponential backoff
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[OnlinePresence] ${status} — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`)
          }
          timerRef.current = setTimeout(() => connectRef.current(), delay)
        }
      })

    channelRef.current = channel
  }, [me.username, me.name, me.surname, me.branch_name])

  connectRef.current = connect

  useEffect(() => {
    unmountRef.current = false
    retryRef.current   = 0
    connect()

    return () => {
      unmountRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      const supabase = createClient()
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [connect])

  return onlineUsers
}
