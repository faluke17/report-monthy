'use server'

import { createClient } from '@/lib/supabase/server'

export interface NrwAreaStat {
  id: string
  dmama_branch_id: number
  report_year: number
  report_month: number
  area_label: string
  area_name: string
  outbound: number | null
  distribute_all: number | null
  fetched_at: string
}

export async function getNrwAreaStats(
  dmamabranchId: number,
  year: number,
  month: number,
): Promise<NrwAreaStat[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('nrw_area_stats')
    .select('*')
    .eq('dmama_branch_id', dmamabranchId)
    .eq('report_year', year)
    .eq('report_month', month)
    .order('area_label')
  return (data ?? []) as NrwAreaStat[]
}

export async function getLatestNrwAreaStats(dmamabranchId: number): Promise<NrwAreaStat[]> {
  const supabase = await createClient()
  const { data: latest } = await supabase
    .from('nrw_area_stats')
    .select('report_year, report_month')
    .eq('dmama_branch_id', dmamabranchId)
    .order('report_year', { ascending: false })
    .order('report_month', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return []
  return getNrwAreaStats(dmamabranchId, latest.report_year, latest.report_month)
}
