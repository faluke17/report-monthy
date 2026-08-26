'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { ActionResult } from '@/lib/types'

const NRW_EDITOR_ID = '18074'

// ลำดับเดือนจริงของปีงบไทย: ต.ค.-ธ.ค. ของปีก่อนหน้า แล้วต่อด้วย ม.ค.-ก.ย. ของปีงบนั้น
const FISCAL_MONTH_ORDER = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export interface TopWaterSavedBranch {
  branch_name:  string
  startLoss:    number
  endLoss:      number
  savedVolume:  number // ลบ.ม./เดือน ที่ลดได้ (บวก = ลดลง)
}

export interface TopWaterSavedResult {
  branches:    TopWaterSavedBranch[]
  fiscalYear:  number // พ.ศ.
  startMonth:  number
  endMonth:    number
}

/**
 * สาขาที่ลด "ปริมาณ" น้ำสูญเสีย (ลบ.ม./เดือน) ได้มากที่สุด เทียบเดือนแรกกับเดือนล่าสุด
 * ของปีงบล่าสุดที่มีข้อมูลใน nrw_branch_monthly — ใช้แสดงในสกู๊ปข่าว Sidebar
 */
export async function getTopWaterSavedBranches(limit = 3): Promise<TopWaterSavedResult | null> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: latestRow } = await (supabase as any)
    .from('nrw_branch_monthly')
    .select('fiscal_year')
    .order('fiscal_year', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!latestRow) return null
  const fiscalYear = latestRow.fiscal_year as number

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('nrw_branch_monthly')
    .select('branch_name, month, water_produced, water_sold, water_free, blow_off')
    .eq('fiscal_year', fiscalYear)
  if (!rows || rows.length === 0) return null

  const presentMonths = new Set<number>(rows.map((r: { month: number }) => r.month))
  const orderedMonths = FISCAL_MONTH_ORDER.filter((m) => presentMonths.has(m))
  if (orderedMonths.length < 2) return null
  const startMonth = orderedMonths[0]
  const endMonth = orderedMonths[orderedMonths.length - 1]

  interface Row {
    branch_name: string
    month: number
    water_produced: number | null
    water_sold: number | null
    water_free: number | null
    blow_off: number | null
  }

  const lossAt = (branchName: string, month: number): number | null => {
    const r = (rows as Row[]).find((x) => x.branch_name === branchName && x.month === month)
    if (!r || r.water_produced == null) return null
    return Math.max(0, r.water_produced - (r.water_sold ?? 0) - (r.water_free ?? 0) - (r.blow_off ?? 0))
  }

  const branchNames = [...new Set((rows as Row[]).map((r) => r.branch_name))]
  const results: TopWaterSavedBranch[] = []
  for (const name of branchNames) {
    const startLoss = lossAt(name, startMonth)
    const endLoss = lossAt(name, endMonth)
    if (startLoss === null || endLoss === null) continue
    results.push({ branch_name: name, startLoss, endLoss, savedVolume: startLoss - endLoss })
  }

  results.sort((a, b) => b.savedVolume - a.savedVolume)

  return {
    branches: results.slice(0, limit),
    fiscalYear,
    startMonth,
    endMonth,
  }
}

async function requireEditor(): Promise<{ success: false; error: string } | null> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  if (session.username !== NRW_EDITOR_ID) return { success: false, error: 'ไม่มีสิทธิ์แก้ไขข้อมูล NRW' }
  return null
}

export async function upsertNrwBranchMonthly(formData: FormData): Promise<ActionResult> {
  const denied = await requireEditor()
  if (denied) return denied

  const branch_name    = formData.get('branch_name') as string
  const fiscal_year    = parseInt(formData.get('fiscal_year') as string)
  const month          = parseInt(formData.get('month') as string)
  const water_produced = parseFloat(formData.get('water_produced') as string) || null
  const water_sold     = parseFloat(formData.get('water_sold') as string) || null
  const water_free     = parseFloat(formData.get('water_free') as string) || null
  const blow_off       = parseFloat(formData.get('blow_off') as string) || null

  if (!branch_name || !fiscal_year || !month) {
    return { success: false, error: 'ข้อมูลไม่ครบถ้วน' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('nrw_branch_monthly' as any)
    .upsert(
      {
        branch_name,
        fiscal_year,
        month,
        water_produced,
        water_sold,
        water_free,
        blow_off,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'branch_name,fiscal_year,month' },
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/report-nrw')
  return { success: true }
}

interface BulkRow {
  branch_name: string
  water_produced: number | null
  water_sold: number | null
  water_free: number | null
  blow_off: number | null
}

export async function bulkUpsertNrwBranchMonthly(
  rows: BulkRow[],
  fiscal_year: number,
  month: number,
): Promise<ActionResult<{ count: number }>> {
  const denied = await requireEditor()
  if (denied) return denied
  if (!rows.length) return { success: false, error: 'ไม่มีข้อมูลที่จะบันทึก' }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const records = rows.map((r) => ({
    branch_name:    r.branch_name,
    fiscal_year,
    month,
    water_produced: r.water_produced,
    water_sold:     r.water_sold,
    water_free:     r.water_free,
    blow_off:       r.blow_off,
    updated_at:     now,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('nrw_branch_monthly')
    .upsert(records, { onConflict: 'branch_name,fiscal_year,month' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/report-nrw')
  return { success: true, data: { count: records.length } }
}

export async function bulkUpsertNrwBranchTargets(
  targets: { branch_name: string; target_nrw: number | null }[],
  fiscal_year: number,
): Promise<ActionResult<{ count: number }>> {
  const denied = await requireEditor()
  if (denied) return denied
  if (!targets.length) return { success: false, error: 'ไม่มีข้อมูล' }

  const supabase = await createClient()
  const now = new Date().toISOString()

  const records = targets.map((t) => ({
    branch_name: t.branch_name,
    fiscal_year,
    target_nrw:  t.target_nrw,
    updated_at:  now,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('nrw_branch_target')
    .upsert(records, { onConflict: 'branch_name,fiscal_year' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/report-nrw')
  return { success: true, data: { count: records.length } }
}

export async function deleteNrwBranchMonthly(id: string): Promise<ActionResult> {
  const denied = await requireEditor()
  if (denied) return denied

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('nrw_branch_monthly').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/report-nrw')
  return { success: true }
}
