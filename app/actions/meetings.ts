'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { generateRunningCode } from '@/lib/utils/code-gen'
import { ActionResult } from '@/lib/types'

export async function submitMeeting(formData: FormData): Promise<ActionResult<string>> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const title               = formData.get('title') as string
  const meeting_type        = formData.get('meeting_type') as string
  const scheduled_date      = formData.get('scheduled_date') as string
  const scheduled_time      = formData.get('scheduled_time') as string
  const location            = formData.get('location') as string || null
  const meeting_link        = formData.get('meeting_link') as string || null
  const target_audience     = formData.get('target_audience') as string || 'ทุกสาขา'
  const prep_required       = formData.get('prep_required') as string || null
  const notification_message = formData.get('notification_message') as string || null

  if (!title || !meeting_type || !scheduled_date || !scheduled_time) {
    return { success: false, error: 'กรุณากรอกข้อมูลให้ครบ' }
  }

  const code = await generateRunningCode('MIT', 'R10', supabase)

  const { data: created, error } = await supabase
    .from('meetings')
    .insert({
      code, title, meeting_type, scheduled_date, scheduled_time,
      location, meeting_link, target_audience, prep_required, notification_message,
      status: 'กำหนดแล้ว',
      created_by: session.username,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/meeting')
  revalidatePath('/notify')
  revalidatePath('/dashboard')
  return { success: true, data: created?.id }
}

export async function sendMeetingNotification(meetingId: string): Promise<ActionResult<{ notified_at: string }>> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('meetings')
    .update({ notified_at: now, updated_at: now })
    .eq('id', meetingId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/notify')
  revalidatePath('/meeting')
  revalidatePath('/dashboard')
  return { success: true, data: { notified_at: now } }
}

export async function closeMeeting(meetingId: string): Promise<ActionResult<{ pendingCount: number }>> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('meeting_resolutions')
    .select('*', { count: 'exact', head: true })
    .eq('meeting_id', meetingId)
    .neq('status', 'แล้วเสร็จ')
    .neq('status', 'ปิดประเด็น')

  const { error } = await supabase
    .from('meetings')
    .update({ status: 'เสร็จสิ้น', updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/meeting')
  revalidatePath('/dashboard')
  return { success: true, data: { pendingCount: count ?? 0 } }
}

export async function deleteMeeting(meetingId: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()
  const { error } = await supabase.from('meetings').delete().eq('id', meetingId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/meeting')
  revalidatePath('/notify')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function acknowledgeMeeting(meetingId: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session || !session.costcenter) {
    return { success: false, error: 'เฉพาะผู้ใช้สาขาเท่านั้น' }
  }
  const supabase = await createClient()
  const { error } = await supabase.from('meeting_acknowledgments').upsert({
    meeting_id: meetingId,
    branch_name: session.branch_name,
    acknowledged_by: session.username,
    acknowledged_name: `${session.prefix_name}${session.name} ${session.surname}`.trim(),
  }, { onConflict: 'meeting_id,branch_name' })
  if (error) return { success: false, error: error.message }
  revalidatePath('/notify')
  revalidatePath('/meeting')
  return { success: true }
}
