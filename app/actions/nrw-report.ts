'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { ActionResult } from '@/lib/types'

const NRW_EDITOR_ID = '18074'

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
