import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { ObstacleForm } from '@/components/forms/ObstacleForm'
import { Branch, Plan, UserProfile } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'

export default async function NewObstaclePage() {
  const supabase = await createClient()
  const session = await getPwaSession()

  const [branchesResult, plansResult] = await Promise.all([
    supabase.from('branches').select('*').eq('is_active', true).order('name_th'),
    supabase.from('plans').select('id, code, plan_type, branch_id').not('status', 'eq', 'ยกเลิก'),
  ])

  const branches = sortByPwaBranches((branchesResult.data ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const profile = {
    branch_id: matchedBranch?.id ?? null,
    role: session?.branch_name ? 'branch_staff' : 'region_admin',
  } as UserProfile

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">รายงานอุปสรรค</h1>
        <p className="text-sm text-white/40 mt-0.5">แจ้งปัญหาที่ส่งผลต่อคุณภาพข้อมูล NRW</p>
      </div>
      <ObstacleForm
        branches={branches}
        profile={profile}
        plans={(plansResult.data ?? []) as Partial<Plan>[]}
      />
    </div>
  )
}
