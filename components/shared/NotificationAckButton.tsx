'use client'

import { useTransition } from 'react'
import { markNotificationRead } from '@/app/actions/meeting-resolution'
import { CheckCircle2 } from 'lucide-react'

export function NotificationAckButton({ notificationId }: { notificationId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await markNotificationRead(notificationId) })}
      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg hover:bg-cyan-500/25 transition-all disabled:opacity-40"
    >
      <CheckCircle2 size={13} />
      {isPending ? '...' : 'รับทราบ'}
    </button>
  )
}
