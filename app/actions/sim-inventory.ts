'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { isSimAllowedUser } from '@/lib/sim-access'
import { ActionResult, SimDevicePoint, SimInventoryFormData, SimInventoryItem } from '@/lib/types'

async function requireSimAccess() {
  const session = await getPwaSession()
  if (!session || !isSimAllowedUser(session.username)) {
    return { session: null, error: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' as const }
  }
  return { session, error: null }
}

// เติมจุดติดตั้งที่ผู้ใช้พิมพ์เข้าไปใหม่ (ยังไม่มีใน catalog) เข้า sim_device_points
// เพื่อให้ขึ้นเป็นตัวเลือก dropdown ในครั้งถัดไป — best-effort เท่านั้น ไม่ทำให้ createSim/updateSim ล้มเหลว
async function ensureDevicePoint(
  supabase: Awaited<ReturnType<typeof createClient>>,
  branchId: string | null,
  branchLabel: string,
  devicePoint: string,
  username: string,
) {
  const point = devicePoint.trim()
  if (!point) return
  const { error } = await supabase
    .from('sim_device_points')
    .upsert(
      { branch_id: branchId, branch_label: branchLabel, device_point: point, source: 'custom', created_by: username },
      { onConflict: 'branch_label,device_point', ignoreDuplicates: true },
    )
  if (error) console.error('[ensureDevicePoint]', error.message)
}

export async function getSimInventory(): Promise<SimInventoryItem[]> {
  const { session } = await requireSimAccess()
  if (!session) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sim_inventory')
    .select('*, branches(*)')
    .order('branch_label', { ascending: true })
    .order('device_point', { ascending: true })
    .order('seq', { ascending: true })

  if (error) {
    console.error('[getSimInventory]', error.message)
    return []
  }
  return (data ?? []) as SimInventoryItem[]
}

// รายการจุดติดตั้งอุปกรณ์ที่รู้จักแล้วของแต่ละสาขา — ใช้เป็นตัวเลือก dropdown ในฟอร์มเพิ่ม/แก้ไข SIM
export async function getDevicePoints(): Promise<SimDevicePoint[]> {
  const { session } = await requireSimAccess()
  if (!session) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sim_device_points')
    .select('branch_id, branch_label, device_point')
    .order('device_point', { ascending: true })

  if (error) {
    console.error('[getDevicePoints]', error.message)
    return []
  }
  return (data ?? []) as SimDevicePoint[]
}

export async function createSim(formData: SimInventoryFormData): Promise<ActionResult<{ id: string }>> {
  const { session, error: accessError } = await requireSimAccess()
  if (!session) return { success: false, error: accessError! }

  if (!formData.branch_label || !formData.device_point || !formData.phone_number) {
    return { success: false, error: 'กรุณากรอกสาขา, จุดติดตั้ง/อุปกรณ์ และเบอร์โทรศัพท์ให้ครบ' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sim_inventory')
    .insert({
      branch_id:    formData.branch_id || null,
      branch_label: formData.branch_label,
      device_point: formData.device_point,
      phone_number: formData.phone_number,
      serial_no:    formData.serial_no || null,
      network:      formData.network || null,
      note:         formData.note || null,
      created_by:   session.username,
      updated_by:   session.username,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  await ensureDevicePoint(supabase, formData.branch_id || null, formData.branch_label, formData.device_point, session.username)

  revalidatePath('/sims')
  return { success: true, data: { id: data.id } }
}

export async function updateSim(id: string, formData: SimInventoryFormData): Promise<ActionResult> {
  const { session, error: accessError } = await requireSimAccess()
  if (!session) return { success: false, error: accessError! }

  if (!formData.branch_label || !formData.device_point || !formData.phone_number) {
    return { success: false, error: 'กรุณากรอกสาขา, จุดติดตั้ง/อุปกรณ์ และเบอร์โทรศัพท์ให้ครบ' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('sim_inventory')
    .update({
      branch_id:    formData.branch_id || null,
      branch_label: formData.branch_label,
      device_point: formData.device_point,
      phone_number: formData.phone_number,
      serial_no:    formData.serial_no || null,
      network:      formData.network || null,
      note:         formData.note || null,
      updated_by:   session.username,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  await ensureDevicePoint(supabase, formData.branch_id || null, formData.branch_label, formData.device_point, session.username)

  revalidatePath('/sims')
  return { success: true }
}

export async function deleteSim(id: string): Promise<ActionResult> {
  const { session, error: accessError } = await requireSimAccess()
  if (!session) return { success: false, error: accessError! }

  const supabase = await createClient()
  const { error } = await supabase.from('sim_inventory').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/sims')
  return { success: true }
}
