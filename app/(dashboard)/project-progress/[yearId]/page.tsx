import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { BudgetGroupList } from '@/components/dashboard/BudgetGroupList'
import { BudgetGroup } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function YearGroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ yearId: string }>
  searchParams: Promise<{ type?: string }>
}) {
  const { yearId } = await params
  const { type }   = await searchParams
  const initialType = (type === 'pipe' || type === 'dma') ? type : 'all'
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const isRegion = !session.costcenter

  // Fetch budget year
  const { data: year } = await (supabase as any)
    .from('budget_years')
    .select('id, name, fiscal_year')
    .eq('id', yearId)
    .single()

  if (!year) notFound()

  // Fetch budget groups with full project summaries for stats
  const { data: budgetGroups } = await (supabase as any)
    .from('budget_groups')
    .select('*, budget_projects(id, project_name, code, project_type, current_phase, budget_excl_vat, contract_incl_vat, project_contracts(contract_end_date, estimated_pipe_length))')
    .eq('budget_year_id', yearId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-5 animate-fadein">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/project-progress" className="text-white/40 hover:text-white/70 transition-colors">
          ความก้าวหน้าโครงการ
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white/60">{year.name}</span>
      </div>

      <BudgetGroupList
        budgetGroups={(budgetGroups ?? []) as BudgetGroup[]}
        yearId={yearId}
        yearName={year.name}
        canCreate={isRegion}
        initialType={initialType}
      />
    </div>
  )
}
