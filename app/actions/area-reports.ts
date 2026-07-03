'use server'

import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { generateRunningCode } from '@/lib/utils/code-gen'
import { ActionResult } from '@/lib/types'

export type StepTestInput = {
  step_no: number
  estimated_loss: number | null
  leaks_found: number
  leaks_repaired: number | null
}

export type AreaObstacleInput = {
  obstacle_type: string
  other_description?: string | null
  obstacle_detail?: string | null
  resolution_plan?: string | null
  impact?: string | null
  region_support_needed?: string | null
  priority_order?: number
}

export type AreaReportInput = {
  branch_id: string
  report_year: number
  report_month: number
  area_name: string
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
  step_tests: StepTestInput[]
  obstacles: AreaObstacleInput[]
}

const TYPE_CATEGORY: Record<string, string> = {
  'MM/DMA Zero Test ไม่ผ่าน': 'MM',
  'Step Test Zero Test ไม่ผ่าน': 'MM',
  'MM/DMA/P3 ชำรุด': 'MM',
  'จุดค้างซ่อม': 'DMA',
  'มาตรผิดปกติ': 'DMA',
  'ปัญหาแรงดันน้ำไหลอ่อน': 'P3',
  'ขาด logger / P3': 'P3',
  'อื่น': 'อื่นๆ',
}

/**
 * Push obstacles entered inside a PDCA area report into the global Obstacle
 * Tracker (`obstacles` table) — one-directional, create-only.
 *
 * Once an obstacle has been pushed for a given area report + obstacle type,
 * it is never touched again from here: all further edits (status, progress,
 * resolution plan, etc.) happen in the Obstacle Tracker (/obstacle), which
 * owns the record from that point on. Re-submitting/editing the PDCA report
 * only creates tracker rows for obstacle types that don't have one yet.
 */
export async function syncObstaclesToTracker(
  supabase: SupabaseClient,
  areaReportId: string,
  branchId: string,
  branchCode: string,
  areaName: string,
  obstacles: AreaObstacleInput[],
  createdBy: string,
) {
  const { data: existing } = await supabase
    .from('obstacles')
    .select('obstacle_type')
    .eq('area_report_id', areaReportId)

  const existingTypes = new Set(((existing ?? []) as { obstacle_type: string }[]).map((r) => r.obstacle_type))

  for (const o of obstacles) {
    if (!o.obstacle_type) continue
    const finalType = o.obstacle_type === 'อื่น' && o.other_description
      ? `อื่น: ${o.other_description}`
      : o.obstacle_type

    if (existingTypes.has(finalType)) continue

    const code = await generateRunningCode('OBS', branchCode, supabase)
    await supabase.from('obstacles').insert({
      code,
      branch_id: branchId,
      area_report_id: areaReportId,
      obstacle_type: finalType,
      category: TYPE_CATEGORY[o.obstacle_type] ?? 'อื่นๆ',
      area: `${areaName}${o.impact ? ' — ' + o.impact : ''}`,
      data_quality_impact: o.obstacle_detail || null,
      resolution_plan: o.resolution_plan || null,
      region_support_needed: o.region_support_needed || null,
      priority_order: o.priority_order ?? 2,
      progress_pct: 0,
      status: 'รายงานใหม่',
      auto_create_action: false,
      send_to_meeting: false,
      show_in_monthly_alert: true,
      created_by: createdBy,
    })
  }
}

export async function submitAreaReports(reports: AreaReportInput[]): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (!reports.length) return { success: false, error: 'ไม่มีข้อมูลพื้นที่' }

  const supabase = await createClient()

  // fetch branch code once (all reports share same branch_id)
  const branchId = reports[0].branch_id
  const { data: branchRow } = await supabase
    .from('branches')
    .select('code')
    .eq('id', branchId)
    .single()
  const branchCode = branchRow?.code ?? 'UNK'

  for (const report of reports) {
    if (!report.branch_id || !report.area_name.trim()) {
      return { success: false, error: 'กรุณาระบุชื่อพื้นที่และสาขา' }
    }

    const { data: areaRow, error: areaError } = await supabase
      .from('area_monthly_reports')
      .upsert(
        {
          branch_id: report.branch_id,
          report_year: report.report_year,
          report_month: report.report_month,
          area_name: report.area_name.trim(),
          water_dist_before: report.water_dist_before ?? null,
          water_sold_before: report.water_sold_before ?? null,
          mnf_before: report.mnf_before ?? null,
          water_dist_after: report.water_dist_after ?? null,
          water_sold_after: report.water_sold_after ?? null,
          mnf_after: report.mnf_after ?? null,
          leaks_repaired: report.leaks_repaired ?? null,
          leaks_pending: report.leaks_pending ?? null,
          pdca_do: report.pdca_do || null,
          pdca_act: report.pdca_act || null,
          status: 'submitted',
          created_by: session.username,
        },
        { onConflict: 'branch_id,report_year,report_month,area_name' }
      )
      .select('id')
      .single()

    if (areaError) return { success: false, error: `พื้นที่ ${report.area_name}: ${areaError.message}` }

    const areaReportId = areaRow.id

    // step tests
    await supabase.from('step_test_results').delete().eq('area_report_id', areaReportId)
    if (report.step_tests.length > 0) {
      const { error: stepError } = await supabase.from('step_test_results').insert(
        report.step_tests.map((s) => ({
          area_report_id: areaReportId,
          step_no: s.step_no,
          estimated_loss: s.estimated_loss,
          leaks_found: s.leaks_found,
          leaks_repaired: s.leaks_repaired,
        }))
      )
      if (stepError) return { success: false, error: stepError.message }
    }

    // area_obstacles
    await supabase.from('area_obstacles').delete().eq('area_report_id', areaReportId)
    if (report.obstacles.length > 0) {
      const { error: obstError } = await supabase.from('area_obstacles').insert(
        report.obstacles.map((o) => ({
          area_report_id: areaReportId,
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

    // sync to global obstacles tracker
    await syncObstaclesToTracker(
      supabase, areaReportId, report.branch_id, branchCode,
      report.area_name, report.obstacles, session.username
    )
  }

  revalidatePath('/pdca')
  revalidatePath('/obstacle')
  revalidatePath('/dashboard')
  return { success: true }
}
