import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { ObstacleTable } from '@/components/dashboard/ObstacleTable'
import { ObstacleFilterBar } from '@/components/shared/ObstacleFilterBar'
import { Obstacle, Branch } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ObstaclePage({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string; category?: string; closed?: string }>
}) {
  const supabase = await createClient()
  const session = await getPwaSession()

  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th, province_th')
    .eq('is_active', true)

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isBranchUser = !!matchedBranch

  const { branch_id, category, closed } = await searchParams
  const filterBranchId = isBranchUser
    ? matchedBranch.id
    : (branch_id ?? '')
  const filterCategory = category ?? ''
  const showClosed = closed === '1'

  let query = supabase
    .from('obstacles')
    .select('*, branches(*)')
    .order('priority_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (!showClosed) {
    query = query.not('status', 'eq', 'ปิดประเด็น')
  }
  if (filterBranchId) {
    query = query.eq('branch_id', filterBranchId)
  }
  if (filterCategory) {
    query = query.eq('category', filterCategory)
  }

  const { data: obstacles } = await query

  const rows = (obstacles ?? []) as (Obstacle & { branches?: Branch })[]

  return (
    <div className="space-y-5 animate-fadein">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#12181F]">Obstacle Tracker</h1>
          <p className="text-sm text-black/40 mt-0.5">
            ติดตามและแก้ไขอุปสรรค MM / DMA / P3
            {rows.length > 0 && (
              <span className="ml-2 text-black/30">({rows.length} รายการ)</span>
            )}
          </p>
        </div>
        <Link
          href="/obstacle/new"
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#FFFFFF] font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus size={15} />
          รายงานอุปสรรค
        </Link>
      </div>

      <ObstacleFilterBar
        branches={isBranchUser ? [] : branches}
        activeBranchId={filterBranchId}
        activeCategory={filterCategory}
        showClosed={showClosed}
      />

      <div className="glass-card overflow-hidden">
        <ObstacleTable data={rows} canDelete={!isBranchUser} isRegion={!isBranchUser} />
      </div>
    </div>
  )
}
