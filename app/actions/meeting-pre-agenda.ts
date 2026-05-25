'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { PreAgendaItem, ActionResult } from '@/lib/types'

const THAI_MONTHS = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

interface PreAgendaPayload {
  agenda1_note: string | null
  agenda2_ref_meeting_no: string | null
  agenda4_type: 'เรื่องสืบเนื่อง' | 'เรื่องติดตามผลการดำเนินการ'
  items3: PreAgendaItem[]
  items4: PreAgendaItem[]
  items5: PreAgendaItem[]
  items6: PreAgendaItem[]
  pdca_ref_month: number | null
  pdca_ref_year: number | null
  pdca_deadline: string | null
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
        pdca_ref_month: payload.pdca_ref_month,
        pdca_ref_year: payload.pdca_ref_year,
        pdca_deadline: payload.pdca_deadline,
        updated_at: now,
      },
      { onConflict: 'meeting_id' },
    )

  if (error) return { success: false, error: error.message }

  // Auto-sync pdca_monthly requirement
  if (payload.pdca_ref_month && payload.pdca_ref_year) {
    // Delete old pdca_monthly requirement for this meeting (if changed)
    await supabase
      .from('meeting_requirements')
      .delete()
      .eq('meeting_id', meetingId)
      .eq('requirement_type', 'pdca_monthly')

    const monthName = THAI_MONTHS[payload.pdca_ref_month] ?? ''
    const buddhistYear = payload.pdca_ref_year + 543
    await supabase.from('meeting_requirements').insert({
      meeting_id: meetingId,
      requirement_type: 'pdca_monthly',
      title: `ส่งรายงานประจำเดือน ${monthName} ${buddhistYear}`,
      description: 'กรุณากรอกรายงานประจำเดือน (NRW / PDCA) ให้ครบก่อนวันประชุม',
      target_year: payload.pdca_ref_year,
      target_month: payload.pdca_ref_month,
      due_date: payload.pdca_deadline,
      sort_order: 1,
    })
  } else {
    // If ref cleared → remove requirement too
    await supabase
      .from('meeting_requirements')
      .delete()
      .eq('meeting_id', meetingId)
      .eq('requirement_type', 'pdca_monthly')
  }

  revalidatePath(`/meeting/${meetingId}/agenda`)
  revalidatePath(`/meeting/${meetingId}/preview`)
  revalidatePath('/meeting')
  revalidatePath('/notify')
  return { success: true }
}
