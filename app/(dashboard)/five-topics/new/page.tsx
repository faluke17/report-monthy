import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch, UserProfile } from '@/lib/types'
import { FiveTopicsForm } from '@/components/forms/FiveTopicsForm'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NewFiveTopicsPage() {
  const supabase = await createClient()
  const session = await getPwaSession()

  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th, province_th')
    .eq('is_active', true)
    .order('name_th')

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)

  const profile = {
    branch_id: matchedBranch?.id ?? null,
    role: session?.branch_name ? 'branch_staff' : 'region_admin',
  } as UserProfile

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/five-topics"
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          รายงาน 5 หัวข้อ
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white">เพิ่มรายงานใหม่</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">บันทึกรายงาน 5 หัวข้อ</h1>
        <p className="text-sm text-white/40 mt-0.5">
          ติดตามกิจกรรมลดน้ำสูญเสีย 5 หัวข้อมาตรฐาน กปภ. เขต 10
        </p>
      </div>

      <FiveTopicsForm branches={branches} profile={profile} />
    </div>
  )
}
