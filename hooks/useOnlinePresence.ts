'use client'

import { useEffect, useRef, useState } from 'react'
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

export function useOnlinePresence(me: UseOnlinePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel('room:online_users', {
      config: { presence: { key: me.username } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        // presenceState คืน array ต่อ key (1 user หลาย tab → หลาย entry)
        // deduplicate โดยเก็บแค่ entry แรกของแต่ละ username
        const seen = new Set<string>()
        const users: PresenceUser[] = Object.values(state)
          .flatMap((s) => s)
          .filter((u) => {
            if (seen.has(u.username)) return false
            seen.add(u.username)
            return true
          })
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            username: me.username,
            name: me.name,
            surname: me.surname,
            branch_name: me.branch_name,
            joined_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.username])

  return onlineUsers
}
