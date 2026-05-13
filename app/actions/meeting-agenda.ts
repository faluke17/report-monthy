'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { ActionResult, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'

type HeaderPayload = Omit<MeetingAgendaHeader, 'id' | 'meeting_id' | 'created_at' | 'updated_at'>
type SubItemPayload = Omit<MeetingAgendaSubItem, 'id'>

export async function saveAgenda(
  meetingId: string,
  header: HeaderPayload,
  subitems: SubItemPayload[],
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (session.costcenter) return { success: false, error: 'ไม่มีสิทธิ์บันทึกวาระ' }

  const supabase = await createClient()

  const { error: hErr } = await supabase
    .from('meeting_agenda_headers')
    .upsert(
      { meeting_id: meetingId, ...header, updated_at: new Date().toISOString() },
      { onConflict: 'meeting_id' },
    )

  if (hErr) return { success: false, error: hErr.message }

  const { error: delErr } = await supabase
    .from('meeting_agenda_subitems')
    .delete()
    .eq('meeting_id', meetingId)

  if (delErr) return { success: false, error: delErr.message }

  if (subitems.length > 0) {
    const { error: insErr } = await supabase
      .from('meeting_agenda_subitems')
      .insert(subitems.map(s => ({ ...s, meeting_id: meetingId })))

    if (insErr) return { success: false, error: insErr.message }
  }

  revalidatePath('/meeting')
  return { success: true }
}
