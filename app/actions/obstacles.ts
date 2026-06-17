'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { generateRunningCode } from '@/lib/utils/code-gen'
import { ActionResult } from '@/lib/types'

export async function submitObstacle(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const branch_id             = formData.get('branch_id') as string
  const category              = formData.get('category') as string
  const obstacle_type         = formData.get('obstacle_type') as string
  const data_quality_impact   = formData.get('data_quality_impact') as string || null
  const resolution_plan       = formData.get('resolution_plan') as string || null
  const area                  = formData.get('area') as string || null
  const region_support_needed = formData.get('region_support_needed') as string || null
  const priority_order        = parseInt(formData.get('priority_order') as string) || 2
  const progress_pct          = parseInt(formData.get('progress_pct') as string) || 0
  const due_date              = formData.get('due_date') as string || null
  const status                = formData.get('status') as string || 'รายงานใหม่'
  const auto_create_action    = formData.get('auto_create_action') === 'true'
  const send_to_meeting       = formData.get('send_to_meeting') === 'true'
  const show_in_monthly_alert = formData.get('show_in_monthly_alert') === 'true'
  const report_month          = parseInt(formData.get('report_month') as string) || null
  const report_year           = parseInt(formData.get('report_year') as string) || null

  if (!branch_id || !obstacle_type || !category) {
    return { success: false, error: 'กรุณากรอกข้อมูลให้ครบ' }
  }

  const { data: branch } = await supabase.from('branches').select('code').eq('id', branch_id).single()
  if (!branch) return { success: false, error: 'ไม่พบสาขา' }

  const code = await generateRunningCode('OBS', branch.code, supabase)

  const { error } = await supabase.from('obstacles').insert({
    code, branch_id, category, obstacle_type, area,
    data_quality_impact, resolution_plan, region_support_needed,
    priority_order, progress_pct, due_date, status,
    auto_create_action, send_to_meeting, show_in_monthly_alert,
    report_month, report_year,
    created_by: session.username,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/obstacle')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateObstacleProgress(
  id: string,
  progress_pct: number,
  status: string,
  resolution_plan?: string,
  region_support_needed?: string,
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  if (session.costcenter) {
    const { data: obs } = await supabase
      .from('obstacles')
      .select('branches!inner(name_th)')
      .eq('id', id)
      .single()
    if (!obs) return { success: false, error: 'ไม่พบรายการ' }
    const ownerBranch = (obs.branches as unknown as { name_th: string }).name_th
    if (ownerBranch !== session.branch_name) {
      return { success: false, error: 'ไม่มีสิทธิ์แก้ไขข้อมูลของสาขาอื่น' }
    }
  }

  const { error } = await supabase
    .from('obstacles')
    .update({ progress_pct, status, resolution_plan, region_support_needed })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/obstacle')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteObstacle(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (session.costcenter) return { success: false, error: 'ไม่มีสิทธิ์ลบข้อมูล' }

  const supabase = await createClient()
  const { error } = await supabase.from('obstacles').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/obstacle')
  revalidatePath('/dashboard')
  return { success: true }
}
