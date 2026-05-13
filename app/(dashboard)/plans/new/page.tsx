import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PlanForm } from '@/components/forms/PlanForm'
import { Branch, UserProfile } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'

export default async function NewPlanPage() {
  const supabase = await createClient()
  const session = await getPwaSession()

  const { data } = await supabase.from('branches').select('*').eq('is_active', true).order('name_th')
  const branches = sortByPwaBranches((data ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const profile = {
    branch_id: matchedBranch?.id ?? null,
    role: session?.costcenter ? 'branch_staff' : 'region_admin',
  } as UserProfile

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">สร้างแผนลดน้ำสูญเสีย</h1>
        <p className="text-sm text-white/40 mt-0.5">กำหนดเป้าหมายและแนวทางการลด NRW</p>
      </div>
      <PlanForm branches={branches} profile={profile} />
    </div>
  )
}
