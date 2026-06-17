'use client'

import { useRouter } from 'next/navigation'
import { MeetingAgendaForm } from '@/components/forms/MeetingAgendaForm'
import type { Meeting, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'

export interface PreviousMeetingRow {
  id: string
  code: string
  title: string
  scheduled_date: string
}

export interface OpenResolutionRow {
  id: string
  meeting_id: string
  title: string
  responsible_branch: string | null
  due_date: string | null
  status: string
  progress_pct: number
  sequence_no: number
}

export interface PdcaSummaryRow {
  branch_name: string
  pdca_do: string | null
  pdca_act: string | null
  report_month: number
  report_year: number
}

interface Props {
  meeting: Meeting
  initialHeader: MeetingAgendaHeader | null
  initialSubitems: MeetingAgendaSubItem[]
  previousMeetings: PreviousMeetingRow[]
  openResolutions: OpenResolutionRow[]
  pdcaSummaries: PdcaSummaryRow[]
}

export function MeetingReportFormSetup({
  meeting,
  initialHeader,
  initialSubitems,
  previousMeetings,
  openResolutions,
  pdcaSummaries,
}: Props) {
  const router = useRouter()

  function handleSaved() {
    router.push('/meeting')
  }

  return (
    <MeetingAgendaForm
      meeting={meeting}
      initialHeader={initialHeader}
      initialSubitems={initialSubitems}
      isAdmin
      onSaved={handleSaved}
      previousMeetings={previousMeetings}
      openResolutions={openResolutions}
      pdcaSummaries={pdcaSummaries}
    />
  )
}
