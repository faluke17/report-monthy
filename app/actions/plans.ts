'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { generateRunningCode } from '@/lib/utils/code-gen'
import { ActionResult } from '@/lib/types'

export async function submitPlan(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const branch_id    = formData.get('branch_id') as string
  const owner_level  = formData.get('owner_level') as 'region' | 'branch'
  const plan_type    = formData.get('plan_type') as string
  const approach_group = formData.get('approach_group') as string
  const area         = formData.get('area') as string || null
  const baseline_nrw = parseFloat(formData.get('baseline_nrw') as string) || null
  const target_nrw   = parseFloat(formData.get('target_nrw') as string) || null
  const baseline_mnf = parseFloat(formData.get('baseline_mnf') as string) || null
  const target_mnf   = parseFloat(formData.get('target_mnf') as string) || null
  const action_plan  = formData.get('action_plan') as string || null
  const resources    = formData.get('resources') as string || null
  const priority     = formData.get('priority') as string || null
  const start_date   = formData.get('start_date') as string || null
  const end_date     = formData.get('end_date') as string || null
  const pic          = formData.get('pic') as string || null

  if (!branch_id) return { success: false, error: 'กรุณาเลือกสาขา' }
  if (!plan_type || !approach_group) return { success: false, error: 'กรุณากรอกข้อมูลให้ครบ' }

  // Get branch code for code generation
  const { data: branch } = await supabase.from('branches').select('code').eq('id', branch_id).single()
  if (!branch) return { success: false, error: 'ไม่พบสาขา' }

  const scope = owner_level === 'region' ? 'R10' : branch.code
  const code = await generateRunningCode('PLN', scope, supabase)

  const { error } = await supabase.from('plans').insert({
    code, branch_id, owner_level, plan_type, approach_group, area,
    baseline_nrw, target_nrw, baseline_mnf, target_mnf,
    action_plan, resources, priority, start_date, end_date, pic,
    status: 'รออนุมัติ',
    created_by: session.username,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/plans')
  return { success: true }
}
