'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { generateRunningCode } from '@/lib/utils/code-gen'
import { KmFormData, ActionResult } from '@/lib/types'

export async function submitKmCase(formData: KmFormData): Promise<ActionResult<{ id: string; code: string }>> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
  const supabase = await createClient()

  const { data: branch } = await supabase
    .from('branches')
    .select('code')
    .eq('id', formData.branch_id)
    .single()

  const branchCode = branch?.code ?? 'R10'
  const code = await generateRunningCode('KM', branchCode, supabase)

  const { data, error } = await supabase
    .from('km_cases')
    .insert({
      code,
      branch_id: formData.branch_id,
      plan_id: formData.plan_id || null,
      title: formData.title,
      approach_tags: formData.approach_tags?.length ? formData.approach_tags : null,
      nrw_before: formData.nrw_before ?? null,
      nrw_after: formData.nrw_after ?? null,
      mnf_before: formData.mnf_before ?? null,
      mnf_after: formData.mnf_after ?? null,
      water_saved_daily: formData.water_saved_daily ?? null,
      value_saved_monthly: formData.value_saved_monthly ?? null,
      key_approach: formData.key_approach || null,
      lessons_learned: formData.lessons_learned || null,
      verification_status: 'รอยืนยันรอบ 1',
      created_by: session.username,
    })
    .select('id, code')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/km')
  return { success: true, data: { id: data.id, code: data.code } }
}
