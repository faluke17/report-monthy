'use client'

import { useRouter } from 'next/navigation'
import { MeetingPreAgendaForm } from '@/components/forms/MeetingPreAgendaForm'
import type { Meeting, MeetingPreAgenda } from '@/lib/types'
import type {
  PreviousMeetingRow,
  OpenResolutionRow,
  PdcaSummaryRow,
} from '@/components/forms/MeetingPreAgendaForm'

export type { PreviousMeetingRow, OpenResolutionRow, PdcaSummaryRow }

interface Props {
  meeting: Meeting
  initialData: MeetingPreAgenda | null
  previousMeetings: PreviousMeetingRow[]
  openResolutions: OpenResolutionRow[]
  pdcaSummaries: PdcaSummaryRow[]
}

export function MeetingAgendaFormSetup({
  meeting,
  initialData,
  previousMeetings,
  openResolutions,
  pdcaSummaries,
}: Props) {
  const router = useRouter()

  function handleSaved(meetingId: string) {
    router.push(`/meeting/${meetingId}/report`)
  }

  return (
    <MeetingPreAgendaForm
      meeting={meeting}
      initialData={initialData}
      previousMeetings={previousMeetings}
      openResolutions={openResolutions}
      pdcaSummaries={pdcaSummaries}
      onSaved={handleSaved}
    />
  )
}
