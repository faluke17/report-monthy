'use server'

import { createClient } from '@/lib/supabase/server'
import type { MnfAlertStatus } from '@/lib/types'

export type MnfSeriesPoint = {
  node_label: string
  record_date: string
  mnf_flow: number | null
  ema_value: number
  diff_percent: number
  alert_status: MnfAlertStatus
}

export async function getMnfSeriesForBranch(dmamabranchId: number): Promise<MnfSeriesPoint[]> {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('mnf_ema_daily')
    .select('node_label, record_date, mnf_flow, ema_value, diff_percent, alert_status')
    .eq('dmama_branch_id', dmamabranchId)
    .gte('record_date', thirtyDaysAgo)
    .order('record_date', { ascending: true })

  return (data ?? []) as MnfSeriesPoint[]
}
