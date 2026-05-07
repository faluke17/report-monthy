'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import { ActionResult, FiveTopicsReport } from '@/lib/types'

function isRegionSession(branchName: string) {
  return !PWA_BRANCHES.some((b) => b.name_th === branchName)
}

export async function submitFiveTopicsReport(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const branch_id    = formData.get('branch_id') as string
  const report_year  = parseInt(formData.get('report_year') as string)
  const report_month = parseInt(formData.get('report_month') as string)

  if (!branch_id)              return { success: false, error: 'กรุณาเลือกสาขา' }
  if (!report_year || !report_month) return { success: false, error: 'กรุณาระบุปีและเดือน' }

  const num = (key: string) => {
    const v = formData.get(key) as string
    const n = parseInt(v)
    return isNaN(n) ? null : n
  }
  const dec = (key: string) => {
    const v = formData.get(key) as string
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }
  const str = (key: string) => (formData.get(key) as string) || null

  const supabase = await createClient()
  // Parse t1_areas JSON
  const t1AreasRaw = formData.get('t1_areas') as string
  let t1Areas: Array<{ area_name: string; conducted_date: string }> | null = null
  try { t1Areas = t1AreasRaw ? JSON.parse(t1AreasRaw) : null } catch { t1Areas = null }
  const t1FirstDate = t1Areas?.find((a) => a.conducted_date)?.conducted_date ?? null

  const { error } = await supabase
    .from('five_topics_reports')
    .upsert({
      branch_id, report_year, report_month,
      t1_dma_count:       t1Areas ? t1Areas.length : num('t1_dma_count'),
      t1_conducted_date:  t1FirstDate ?? str('t1_conducted_date'),
      t1_areas:           t1Areas,
      t1_notes:           str('t1_notes'),
      t2_frequency:        num('t2_frequency'),
      t2_leak_points:      num('t2_leak_points'),
      t2_repaired_points:  num('t2_repaired_points'),
      t2_water_loss_m3h:   dec('t2_water_loss_m3h'),
      t2_notes:            str('t2_notes'),
      t3_dma_pm_count:    num('t3_dma_pm_count'),
      t3_prv_pm_count:    num('t3_prv_pm_count'),
      t3_p3_pm_count:     num('t3_p3_pm_count'),
      t3_notes:           str('t3_notes'),
      t4_flush_points:    num('t4_flush_points'),
      t4_volume_m3:       dec('t4_volume_m3'),
      t4_notes:           str('t4_notes'),
      t5_meters_replaced: num('t5_meters_replaced'),
      t5_notes:           str('t5_notes'),
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      created_by: session.username,
    }, { onConflict: 'branch_id,report_year,report_month' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/five-topics')
  return { success: true }
}

export async function deleteFiveTopicsReport(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (!isRegionSession(session.branch_name)) return { success: false, error: 'ไม่มีสิทธิ์ลบข้อมูล' }

  const supabase = await createClient()
  const { error } = await supabase.from('five_topics_reports').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/five-topics')
  return { success: true }
}

export async function getFiveTopicsReports(
  year: number,
  month: number,
  branchId?: string
): Promise<FiveTopicsReport[]> {
  const supabase = await createClient()
  let query = supabase
    .from('five_topics_reports')
    .select('*, branches(name_th, code)')
    .eq('report_year', year)
    .eq('report_month', month)
    .order('created_at', { ascending: false })

  if (branchId) query = query.eq('branch_id', branchId)

  const { data } = await query
  return (data ?? []) as FiveTopicsReport[]
}
