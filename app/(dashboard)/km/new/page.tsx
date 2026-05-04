import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch } from '@/lib/types'
import { KmForm } from '@/components/forms/KmForm'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function KmNewPage() {
  const supabase = await createClient()
  const session = await getPwaSession()

  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th, province_th')
    .eq('is_active', true)
    .order('name_th')

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isRegionAdmin = !session?.branch_name

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/km" className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors">
          <ChevronLeft size={16} />
          KM
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white">เพิ่ม KM Case</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">เพิ่ม KM Best Practice ใหม่</h1>
        <p className="text-sm text-white/40 mt-0.5">
          บันทึกกรณีศึกษาที่ประสบความสำเร็จในการลด NRW เพื่อแบ่งปันกับสาขาอื่น
        </p>
      </div>

      <KmForm
        branches={branches}
        userBranchId={matchedBranch?.id}
        isRegionAdmin={isRegionAdmin}
      />
    </div>
  )
}
