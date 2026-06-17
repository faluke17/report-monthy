'use client'

import { useRouter } from 'next/navigation'
import { MeetingPreAgendaForm } from '@/components/forms/MeetingPreAgendaForm'
import type { Meeting, MeetingPreAgenda } from '@/lib/types'
import type {
  PreviousMeetingRow,
  OpenResolutionRow,
  PdcaSummaryRow,
  ObstacleSummaryRow,
} from '@/components/forms/MeetingPreAgendaForm'

export type { PreviousMeetingRow, OpenResolutionRow, PdcaSummaryRow, ObstacleSummaryRow }

interface Props {
  meeting: Meeting
  initialData: MeetingPreAgenda | null
  previousMeetings: PreviousMeetingRow[]
  openResolutions: OpenResolutionRow[]
  pdcaSummaries: PdcaSummaryRow[]
  obstacleSummaries: ObstacleSummaryRow[]
}

export function MeetingAgendaFormSetup({
  meeting,
  initialData,
  previousMeetings,
  openResolutions,
  pdcaSummaries,
  obstacleSummaries,
}: Props) {
  const router = useRouter()

  function handleSaved(meetingId: string) {
    router.push(`/meeting/${meetingId}/preview`)
  }

  function handleDraftSaved() {
    router.push('/meeting')
  }

  return (
    <MeetingPreAgendaForm
      meeting={meeting}
      initialData={initialData}
      previousMeetings={previousMeetings}
      openResolutions={openResolutions}
      pdcaSummaries={pdcaSummaries}
      obstacleSummaries={obstacleSummaries}
      onSaved={handleSaved}
      onDraftSaved={handleDraftSaved}
    />
  )
}
