import { SupabaseClient } from '@supabase/supabase-js'

type CodePrefix = 'PLN' | 'ORD' | 'OBS' | 'MIT' | 'KM'

const TABLE_MAP: Record<CodePrefix, string> = {
  PLN: 'plans',
  ORD: 'action_items',
  OBS: 'obstacles',
  MIT: 'meetings',
  KM:  'km_cases',
}

/**
 * Generate a sequential code e.g. PLN-R10-0001, OBS-SKT-0006
 * @param prefix  PLN | ORD | OBS | MIT | KM
 * @param branchCode  branch code (e.g. 'SKT') or 'R10' for region-level
 * @param supabase  Supabase client instance
 */
export async function generateRunningCode(
  prefix: CodePrefix,
  branchCode: string,
  supabase: SupabaseClient
): Promise<string> {
  const scope = branchCode.toUpperCase()
  const table = TABLE_MAP[prefix]

  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .like('code', `${prefix}-${scope}-%`)

  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `${prefix}-${scope}-${seq}`
}
