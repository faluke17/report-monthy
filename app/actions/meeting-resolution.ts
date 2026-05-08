'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { generateRunningCode } from '@/lib/utils/code-gen'
import type { ActionResult, MeetingResolution, MeetingResolutionFormData } from '@/lib/types'

export async function createMeetingResolution(
  data: MeetingResolutionFormData,
): Promise<ActionResult<MeetingResolution>> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const { count, error: countErr } = await supabase
    .from('meeting_resolutions')
    .select('*', { count: 'exact', head: true })
    .eq('meeting_id', data.meeting_id)

  if (countErr) return { success: false, error: countErr.message }

  const sequence_no = (count ?? 0) + 1

  const base = new Date()
  base.setDate(base.getDate() + 1 + data.due_days)
  const due_date = base.toISOString().split('T')[0]

  const { data: row, error } = await supabase
    .from('meeting_resolutions')
    .insert({
      meeting_id: data.meeting_id,
      sequence_no,
      title: data.title,
      detail: data.detail ?? null,
      source: data.source,
      priority: data.priority,
      responsible_branch: data.responsible_branch,
      responsible_party: data.responsible_branch,
      responsible_dept: data.responsible_dept,
      due_date,
      admin_notes: data.admin_notes ?? null,
      tracking_notes: data.tracking_notes ?? null,
      status: 'ระหว่างดำเนินการ',
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  if (data.notify_branch && row) {
    await supabase.from('resolution_notifications').insert({
      resolution_id: row.id,
      meeting_id: data.meeting_id,
      branch_costcenter: data.responsible_branch,
      title: data.title,
      detail: data.detail ?? null,
    })

    // Auto-create linked ActionItem in Action Tracker
    const pwaB = PWA_BRANCHES.find(b => b.costcenter === data.responsible_branch)
    if (pwaB) {
      const { data: branch } = await supabase
        .from('branches')
        .select('id, code')
        .eq('name_th', pwaB.name_th)
        .maybeSingle()

      if (branch) {
        const code = await generateRunningCode('ORD', branch.code, supabase)
        await supabase.from('action_items').insert({
          code,
          branch_id: branch.id,
          meeting_id: data.meeting_id,
          resolution_id: row.id,
          title: `[มติสั่งการ] ${data.title}`,
          detail: data.detail ?? null,
          owner: data.responsible_dept,
          due_date,
          status: 'รอดำเนินการ',
          notes: data.admin_notes ?? null,
          created_by: session.username,
        })
      }
    }
  }

  revalidatePath('/meeting')
  revalidatePath('/notify')
  revalidatePath('/action')
  return { success: true, data: row as MeetingResolution }
}

export async function updateResolutionProgress(
  id: string,
  pct: number,
  note: string,
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const status =
    pct === 100 ? 'แล้วเสร็จ' :
    pct === 0   ? 'รอดำเนินการ' :
                  'ระหว่างดำเนินการ'

  const { error } = await supabase
    .from('meeting_resolutions')
    .update({
      progress_pct: pct,
      progress_note: note.trim() || null,
      progress_updated_at: new Date().toISOString(),
      progress_updated_by: session.username,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/meeting')
  return { success: true }
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('resolution_notifications')
    .update({ is_read: true })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/notify')
  return { success: true }
}
