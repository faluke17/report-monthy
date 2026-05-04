'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { generateRunningCode } from '@/lib/utils/code-gen'
import { ActionResult } from '@/lib/types'

export async function submitAction(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const branch_id   = formData.get('branch_id') as string
  const title       = formData.get('title') as string
  const detail      = formData.get('detail') as string || null
  const owner       = formData.get('owner') as string
  const due_date    = formData.get('due_date') as string || null
  const notes       = formData.get('notes') as string || null

  if (!branch_id || !title || !owner) return { success: false, error: 'กรุณากรอกข้อมูลให้ครบ' }

  const { data: branch } = await supabase.from('branches').select('code').eq('id', branch_id).single()
  if (!branch) return { success: false, error: 'ไม่พบสาขา' }

  const code = await generateRunningCode('ORD', branch.code, supabase)

  const { error } = await supabase.from('action_items').insert({
    code, branch_id, title, detail, owner, due_date, notes,
    status: 'รอดำเนินการ',
    created_by: session.username,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/action')
  return { success: true }
}

export async function updateActionStatus(id: string, status: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'แล้วเสร็จ') updates.completed_at = new Date().toISOString()

  const { error } = await supabase.from('action_items').update(updates).eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/action')
  revalidatePath('/dashboard')
  return { success: true }
}
