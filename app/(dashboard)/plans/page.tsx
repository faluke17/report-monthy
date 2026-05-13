import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PlansTable } from '@/components/dashboard/PlansTable'
import { Plan, Branch } from '@/lib/types'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('*, branches(*)')
    .order('created_at', { ascending: false })

  const rows = (plans ?? []) as (Plan & { branches?: Branch })[]

  return (
    <div className="space-y-5 animate-fadein">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">แผนลดน้ำสูญเสีย</h1>
          <p className="text-sm text-white/40 mt-0.5">จัดการแผน NRW ของแต่ละสาขา</p>
        </div>
        <Link
          href="/plans/new"
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus size={15} />
          สร้างแผนใหม่
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <PlansTable data={rows} />
      </div>
    </div>
  )
}
