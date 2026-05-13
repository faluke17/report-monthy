'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { ActionResult } from '@/lib/types'

export async function submitMonthlyReport(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const branch_id     = formData.get('branch_id') as string
  const report_year   = parseInt(formData.get('report_year') as string)
  const report_month  = parseInt(formData.get('report_month') as string)
  const plan_id       = formData.get('plan_id') as string || null
  const volume_distributed = parseFloat(formData.get('volume_distributed') as string) || null
  const volume_sold        = parseFloat(formData.get('volume_sold') as string) || null
  const _daysRaw           = parseInt(formData.get('days_in_month') as string)
  const days_in_month      = !isNaN(_daysRaw) && _daysRaw > 0 ? _daysRaw : 30
  const mnf_latest         = parseFloat(formData.get('mnf_latest') as string) || null
  const mnf_measured_date  = formData.get('mnf_measured_date') as string || null
  const daily_supply       = parseFloat(formData.get('daily_supply') as string) || null
  const leaks_found        = parseInt(formData.get('leaks_found') as string) || 0
  const leaks_repaired     = parseInt(formData.get('leaks_repaired') as string) || 0
  const leaks_pending      = parseInt(formData.get('leaks_pending') as string) || 0
  const leaks_repeat       = parseInt(formData.get('leaks_repeat') as string) || 0
  const meters_abnormal    = parseInt(formData.get('meters_abnormal') as string) || 0
  const pdca_do  = formData.get('pdca_do') as string || null
  const pdca_act = formData.get('pdca_act') as string || null

  if (!branch_id) return { success: false, error: 'กรุณาเลือกสาขา' }
  if (!report_year || !report_month) return { success: false, error: 'กรุณาระบุปีและเดือน' }

  const { error } = await supabase
    .from('monthly_reports')
    .upsert({
      branch_id, plan_id, report_year, report_month,
      volume_distributed, volume_sold, days_in_month,
      mnf_latest, mnf_measured_date, daily_supply,
      leaks_found, leaks_repaired, leaks_pending, leaks_repeat, meters_abnormal,
      pdca_do, pdca_act,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      created_by: session.username,
    }, { onConflict: 'branch_id,report_year,report_month' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/')
  revalidatePath('/ranking')
  return { success: true }
}

export async function deleteAreaReport(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (session.costcenter) return { success: false, error: 'ไม่มีสิทธิ์ลบข้อมูล' }

  const supabase = await createClient()
  const { error } = await supabase.from('area_monthly_reports').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/dashboard')
  return { success: true }
}
