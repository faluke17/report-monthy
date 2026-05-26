import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { redirect } from 'next/navigation'
import { BudgetYearList } from '@/components/dashboard/BudgetYearList'
import { BudgetYear } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProjectProgressPage() {
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const isRegion = !session.costcenter

  // ลอง query พร้อม join budget_groups ก่อน — ถ้า table ยังไม่มี ให้ fallback ดึงแค่ budget_years
  const { data: withGroups, error: groupError } = await (supabase as any)
    .from('budget_years')
    .select('*, budget_groups(id, name, budget_projects(id, current_phase, project_contracts(contract_end_date)))')
    .order('fiscal_year', { ascending: false })

  let budgetYears: BudgetYear[] = []

  if (!groupError) {
    budgetYears = (withGroups ?? []) as BudgetYear[]
  } else {
    // Fallback: budget_groups ยังไม่มี — แสดงแค่ปีงบประมาณก่อน
    const { data: simple } = await (supabase as any)
      .from('budget_years')
      .select('*')
      .order('fiscal_year', { ascending: false })
    budgetYears = (simple ?? []) as BudgetYear[]
  }

  return (
    <div className="space-y-5 animate-fadein">
      <BudgetYearList
        budgetYears={budgetYears}
        canCreate={isRegion}
      />
    </div>
  )
}
