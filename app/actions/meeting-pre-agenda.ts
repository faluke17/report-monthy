'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { PreAgendaItem, ActionResult } from '@/lib/types'

interface PreAgendaPayload {
  agenda1_note: string | null
  agenda2_ref_meeting_no: string | null
  agenda4_type: 'เรื่องสืบเนื่อง' | 'เรื่องติดตามผลการดำเนินการ'
  items3: PreAgendaItem[]
  items4: PreAgendaItem[]
  items5: PreAgendaItem[]
  items6: PreAgendaItem[]
}

export async function savePreAgenda(
  meetingId: string,
  payload: PreAgendaPayload,
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (session.costcenter) return { success: false, error: 'ไม่มีสิทธิ์' }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('meeting_pre_agenda')
    .upsert(
      {
        meeting_id: meetingId,
        agenda1_note: payload.agenda1_note,
        agenda2_ref_meeting_no: payload.agenda2_ref_meeting_no,
        agenda4_type: payload.agenda4_type,
        items3: payload.items3,
        items4: payload.items4,
        items5: payload.items5,
        items6: payload.items6,
        updated_at: now,
      },
      { onConflict: 'meeting_id' },
    )

  if (error) return { success: false, error: error.message }

  revalidatePath(`/meeting/${meetingId}/agenda`)
  revalidatePath('/meeting')
  return { success: true }
}
