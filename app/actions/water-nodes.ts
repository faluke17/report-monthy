'use server'

import { createClient } from '@/lib/supabase/server'
import type { WaterNodeOption } from '@/lib/types'

export async function getMmByBranch(branchId: string): Promise<WaterNodeOption[]> {
  if (!branchId) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('water_nodes')
    .select('id, branch_id, code, name_th, node_type, user_count')
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
    .select('id, branch_id, code, name_th, node_type, user_count')
    .eq('parent_id', parentId)
    .in('node_type', ['DMA', 'SUB'])
    .eq('is_active', true)
    .order('code')
  return (data ?? []) as WaterNodeOption[]
}
