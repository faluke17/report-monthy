'use server'

import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import type { WaterNode, WaterNodeOption } from '@/lib/types'

export async function getMmByBranch(branchId: string): Promise<WaterNodeOption[]> {
  if (!branchId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('water_nodes')
    .select('id, branch_id, code, name_th, node_type, user_count, logger_id')
    .eq('branch_id', branchId)
    .eq('node_type', 'MM')
    .eq('is_active', true)
    .order('code')
  return (data ?? []) as WaterNodeOption[]
}

export async function getChildNodes(parentId: string): Promise<WaterNodeOption[]> {
  if (!parentId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('water_nodes')
    .select('id, branch_id, code, name_th, node_type, user_count, logger_id')
    .eq('parent_id', parentId)
    .in('node_type', ['DMA', 'SUB'])
    .eq('is_active', true)
    .order('code')
  return (data ?? []) as WaterNodeOption[]
}

// ── Fetch node NRW stats for a given year/month pair ─────────────────────────
export type NodeNrwStat = {
  water_node_id: string
  report_year: number
  report_month: number
  gross_flow: number | null
  net_flow: number | null
  distribute_all: number | null
}

// ── Fetch monthly average MNF per logger for a given year/month pair ──────────
export type MnfMonthlyStat = {
  logger_id: number
  report_year: number
  report_month: number
  avg_mnf: number
}

export async function getNodeMnfStats(year: number, month: number): Promise<MnfMonthlyStat[]> {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year

  // ลอง call RPC function ก่อน (ถ้า migration รันแล้ว) — คืน aggregate โดยตรง
  const supabase = await createClient()
  const { data: rpcData, error: rpcError } = await (supabase as any)
    .rpc('get_mnf_monthly_avg', { p_year: year, p_month: month })
  if (!rpcError && Array.isArray(rpcData)) return rpcData as MnfMonthlyStat[]

  // fallback: fetch + paginate ทั้งสองเดือนพร้อมกัน แล้ว avg ใน JS
  async function fetchMonth(y: number, m: number) {
    const PAGE = 1000
    const rows: { logger_id: number; report_year: number; report_month: number; mnf_flow: number | null }[] = []
    let offset = 0
    while (true) {
      const { data } = await (supabase as any)
        .from('mnf_daily')
        .select('logger_id, report_year, report_month, mnf_flow')
        .eq('report_year', y)
        .eq('report_month', m)
        .range(offset, offset + PAGE - 1)
      if (!data?.length) break
      rows.push(...data)
      if (data.length < PAGE) break
      offset += PAGE
    }
    return rows
  }

  const [currRows, prevRows] = await Promise.all([
    fetchMonth(year, month),
    fetchMonth(prevYear, prevMonth),
  ])

  const map = new Map<string, { sum: number; count: number; logger_id: number; report_year: number; report_month: number }>()
  for (const row of [...currRows, ...prevRows]) {
    if (row.mnf_flow == null) continue
    const key = `${row.logger_id}_${row.report_year}_${row.report_month}`
    const existing = map.get(key)
    if (existing) { existing.sum += row.mnf_flow; existing.count++ }
    else map.set(key, { sum: row.mnf_flow, count: 1, logger_id: row.logger_id, report_year: row.report_year, report_month: row.report_month })
  }
  return Array.from(map.values()).map((v) => ({
    logger_id: v.logger_id,
    report_year: v.report_year,
    report_month: v.report_month,
    avg_mnf: Math.round((v.sum / v.count) * 100) / 100,
  }))
}

export async function getNodeNrwStats(year: number, month: number): Promise<NodeNrwStat[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('node_nrw_monthly')
    .select('water_node_id, report_year, report_month, gross_flow, net_flow, distribute_all')
    .in('report_year', [year - 1, year])
    .eq('report_month', month)
  return (data ?? []) as NodeNrwStat[]
}

// ── Update existing node ───────────────────────────────────────────────────────
export async function updateWaterNode(
  id: string,
  data: {
    name_th?: string | null
    logger_id?: string | null
    dmama_area_label?: string | null
    self_supply?: boolean
    status?: WaterNode['status']
    user_count?: number | null
  }
): Promise<{ error?: string }> {
  const session = await getPwaSession()
  if (!session) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('water_nodes')
    .update({ ...data, updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

// ── Create new node ────────────────────────────────────────────────────────────
export async function createWaterNode(data: {
  branch_id: string
  node_type: WaterNode['node_type']
  code: string
  name_th: string
  parent_id?: string | null
  status?: WaterNode['status']
  user_count?: number | null
  logger_id?: string | null
  self_supply?: boolean
  dmama_area_label?: string | null
}): Promise<{ data?: WaterNode; error?: string }> {
  const session = await getPwaSession()
  if (!session) return { error: 'Unauthorized' }

  const supabase = await createClient()

  // ตรวจ duplicate code ในสาขาเดียวกัน
  const { data: existing } = await supabase
    .from('water_nodes')
    .select('id')
    .eq('branch_id', data.branch_id)
    .eq('code', data.code.trim().toUpperCase())
    .single()

  if (existing) return { error: `รหัส ${data.code} มีอยู่แล้วในสาขานี้` }

  const { data: created, error } = await supabase
    .from('water_nodes')
    .insert({
      branch_id:        data.branch_id,
      node_type:        data.node_type,
      code:             data.code.trim().toUpperCase(),
      name_th:          data.name_th.trim() || null,
      parent_id:        data.parent_id ?? null,
      status:           data.status ?? 'จ่าย',
      user_count:       data.user_count ?? null,
      logger_id:        data.logger_id?.trim() || null,
      self_supply:      data.self_supply ?? false,
      dmama_area_label: data.dmama_area_label?.trim() || null,
      is_active:        true,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: created as WaterNode }
}

// ── Deactivate (soft delete) ───────────────────────────────────────────────────
export async function deactivateWaterNode(id: string): Promise<{ error?: string }> {
  const session = await getPwaSession()
  if (!session) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('water_nodes')
    .update({ is_active: false } as Record<string, unknown>)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}
