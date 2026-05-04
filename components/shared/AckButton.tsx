'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { acknowledgeMeeting } from '@/app/actions/meetings'
import { CheckCircle, Loader2 } from 'lucide-react'

interface AckButtonProps {
  meetingId: string
}

export function AckButton({ meetingId }: AckButtonProps) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await acknowledgeMeeting(meetingId)
      if (result.success) {
        toast.success('บันทึกการรับทราบเรียบร้อย')
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1.5 text-xs bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {pending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <CheckCircle size={12} />
      )}
      กดรับทราบ
    </button>
  )
}
