'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { ActionResult } from '@/lib/types'

// Report-level (not per-area) meter/mass-checking activity — mirrors the
// "มาตรวัดน้ำ (ทางเลือก)" section of public/pdca-tool.html.
export type MeterReportInput = {
  branch_id: string
  report_year: number
  report_month: number
  changed_count?: number | null
  recovered_water?: number | null
  recovered_value?: number | null
  meter_size?: string | null
  cumulative_fy?: number | null
  zero_checked?: number | null
  zero_under12?: number | null
  zero_over12?: number | null
  zero_dead?: number | null
  trend_checked?: number | null
  trend_normal?: number | null
  trend_broken?: number | null
  trend_reason?: string | null
  highlow_reported?: number | null
  highlow_abnormal?: number | null
  sample_checked?: number | null
  sample_abnormal?: number | null
  sample_normal?: number | null
  bigmeter_read?: number | null
  watch_followup?: string | null
  project_target?: number | null
  project_done?: number | null
  project_status?: string | null
  temp_desc?: string | null
  temp_volume?: number | null
  temp_value?: number | null
}

export type MeterReportRow = MeterReportInput & { id: string }

export async function upsertMeterReport(input: MeterReportInput): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (!input.branch_id) return { success: false, error: 'กรุณาระบุสาขา' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('area_meter_reports')
    .upsert(
      { ...input, created_by: session.username },
      { onConflict: 'branch_id,report_year,report_month' }
    )

  if (error) return { success: false, error: error.message }
  revalidatePath('/pdca')
  return { success: true }
}

export async function getMeterReport(branchId: string, year: number, month: number): Promise<MeterReportRow | null> {
  if (!branchId) return null
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('area_meter_reports')
    .select('*')
    .eq('branch_id', branchId)
    .eq('report_year', year)
    .eq('report_month', month)
    .maybeSingle()
  return (data as MeterReportRow) ?? null
}

export async function deleteMeterReport(branchId: string, year: number, month: number): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('area_meter_reports')
    .delete()
    .eq('branch_id', branchId)
    .eq('report_year', year)
    .eq('report_month', month)

  if (error) return { success: false, error: error.message }
  revalidatePath('/pdca')
  return { success: true }
}
