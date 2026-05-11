'use client'

import { useRouter } from 'next/navigation'
import { MeetingAgendaForm } from '@/components/forms/MeetingAgendaForm'
import type { Meeting, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'

interface Props {
  meeting: Meeting
  initialHeader: MeetingAgendaHeader | null
  initialSubitems: MeetingAgendaSubItem[]
}

export function MeetingAgendaFormSetup({ meeting, initialHeader, initialSubitems }: Props) {
  const router = useRouter()

  function handleSaved(meetingId: string) {
    router.push(`/meeting/${meetingId}/preview`)
  }

  return (
    <MeetingAgendaForm
      meeting={meeting}
      initialHeader={initialHeader}
      initialSubitems={initialSubitems}
      isAdmin
      onSaved={handleSaved}
    />
  )
}
