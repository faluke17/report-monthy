'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { ActionResult } from '@/lib/types'
import type { AreaObstacleInput } from '@/app/actions/area-reports'
import { syncObstaclesToTracker } from '@/app/actions/area-reports'

export type UpdateAreaReportInput = {
  water_dist_before?: number | null
  water_sold_before?: number | null
  mnf_before?: number | null
  water_dist_after?: number | null
  water_sold_after?: number | null
  mnf_after?: number | null
  leaks_repaired?: number | null
  leaks_pending?: number | null
  pdca_do?: string | null
  pdca_act?: string | null
  step_tests: Array<{
    step_no: number
    estimated_loss: number | null
    leaks_found: number
    leaks_repaired: number | null
    repair_status: string | null
  }>
  obstacles: AreaObstacleInput[]
}

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

  revalidatePath('/')
  revalidatePath('/ranking')
  revalidatePath('/pdca')
  return { success: true }
}

export async function updateAreaReport(id: string, data: UpdateAreaReportInput): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const { data: areaRow } = await supabase
    .from('area_monthly_reports')
    .select('branch_id, area_name, branches(code)')
    .eq('id', id)
    .single()

  const { error: updateError } = await supabase
    .from('area_monthly_reports')
    .update({
      water_dist_before: data.water_dist_before ?? null,
      water_sold_before: data.water_sold_before ?? null,
      mnf_before: data.mnf_before ?? null,
      water_dist_after: data.water_dist_after ?? null,
      water_sold_after: data.water_sold_after ?? null,
      mnf_after: data.mnf_after ?? null,
      leaks_repaired: data.leaks_repaired ?? null,
      leaks_pending: data.leaks_pending ?? null,
      pdca_do: data.pdca_do || null,
      pdca_act: data.pdca_act || null,
    })
    .eq('id', id)

  if (updateError) return { success: false, error: updateError.message }

  await supabase.from('step_test_results').delete().eq('area_report_id', id)
  if (data.step_tests.length > 0) {
    const { error: stepError } = await supabase.from('step_test_results').insert(
      data.step_tests.map((s) => ({
        area_report_id: id,
        step_no: s.step_no,
        estimated_loss: s.estimated_loss,
        leaks_found: s.leaks_found,
        leaks_repaired: s.leaks_repaired,
        repair_status: s.repair_status,
      }))
    )
    if (stepError) return { success: false, error: stepError.message }
  }

  await supabase.from('area_obstacles').delete().eq('area_report_id', id)
  if (data.obstacles.length > 0) {
    const { error: obstError } = await supabase.from('area_obstacles').insert(
      data.obstacles.map((o) => ({
        area_report_id: id,
        obstacle_type: o.obstacle_type,
        other_description: o.other_description || null,
        obstacle_detail: o.obstacle_detail || null,
        resolution_plan: o.resolution_plan || null,
        impact: o.impact || null,
        region_support_needed: o.region_support_needed || null,
        priority_order: o.priority_order ?? 2,
      }))
    )
    if (obstError) return { success: false, error: obstError.message }
  }

  // sync to global obstacles tracker (previously only saved to area_obstacles,
  // so edits made here never showed up in Obstacle Tracker /obstacle)
  if (areaRow?.branch_id) {
    const branchCode = (areaRow.branches as unknown as { code: string } | null)?.code ?? 'UNK'
    await syncObstaclesToTracker(
      supabase, id, areaRow.branch_id, branchCode,
      areaRow.area_name ?? '', data.obstacles, session.username
    )
  }

  revalidatePath('/pdca')
  revalidatePath('/obstacle')
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
  return { success: true }
}
