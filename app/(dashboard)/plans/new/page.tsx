import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PlanForm } from '@/components/forms/PlanForm'
import { Branch, UserProfile } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'

export default async function NewPlanPage() {
  const supabase = await createClient()
  const session = await getPwaSession()

  const [{ data }, { data: usersData }] = await Promise.all([
    supabase.from('branches').select('*').eq('is_active', true).order('name_th'),
    supabase.from('users_profile').select('id, full_name, branch_id').eq('is_active', true).order('full_name'),
  ])
  const branches = sortByPwaBranches((data ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const profile = {
    branch_id: matchedBranch?.id ?? null,
    role: session?.costcenter ? 'branch_staff' : 'region_admin',
  } as UserProfile

  const branchUsers = (usersData ?? []) as { id: string; full_name: string | null; branch_id: string | null }[]

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#12181F]">สร้างแผนลดน้ำสูญเสีย</h1>
        <p className="text-sm text-black/40 mt-0.5">กำหนดเป้าหมายและแนวทางการลด NRW</p>
      </div>
      <PlanForm branches={branches} profile={profile} branchUsers={branchUsers} />
    </div>
  )
}
