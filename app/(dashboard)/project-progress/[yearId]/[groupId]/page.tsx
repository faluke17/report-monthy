import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ProjectProgressTable } from '@/components/dashboard/ProjectProgressTable'
import { BudgetProject, Branch } from '@/lib/types'
import { getBranchByCostcenter, sortByPwaBranches } from '@/lib/utils/pwa-branches'

export const dynamic = 'force-dynamic'

export default async function GroupProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ yearId: string; groupId: string }>
  searchParams: Promise<{ project?: string }>
}) {
  const { yearId, groupId } = await params
  const { project: defaultProjectId } = await searchParams
  const session = await getPwaSession()
  if (!session) redirect('/login')

  const supabase = await createClient()
  const isRegion = !session.costcenter
  const isAdmin  = isRegion

  // Fetch budget year + group names
  const [{ data: year }, { data: group }] = await Promise.all([
    (supabase as any).from('budget_years').select('id, name').eq('id', yearId).single(),
    (supabase as any).from('budget_groups').select('id, name').eq('id', groupId).single(),
  ])

  if (!year || !group) notFound()

  // Fetch projects with all joined data
  const { data: rawProjects } = await (supabase as any)
    .from('budget_projects')
    .select(`
      *,
      branches(id, code, name_th),
      project_contracts(*),
      project_progress_updates(id, reported_date, pipe_length_completed, notes, created_by, created_at)
    `)
    .eq('budget_group_id', groupId)
    .order('created_at', { ascending: false })

  // Branches list — sorted by PWA order
  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th')
    .eq('is_active', true)
  const branches = sortByPwaBranches((branchData ?? []) as Branch[])

  // Find session branch_id for branch users
  let sessionBranchId: string | null = null
  if (!isRegion && session.costcenter) {
    const pwaB = getBranchByCostcenter(session.costcenter)
    if (pwaB) {
      const branchRow = branches.find((b: { name_th: string; id: string }) => b.name_th === pwaB.name_th)
      sessionBranchId = branchRow?.id ?? null
    }
  }

  // For branch users, filter to their branch only
  let projects = (rawProjects ?? []) as BudgetProject[]
  if (sessionBranchId) {
    projects = projects.filter(p => p.branch_id === sessionBranchId)
  }

  return (
    <div className="space-y-5 animate-fadein">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link href="/project-progress" className="text-black/40 hover:text-black/70 transition-colors">
          ความก้าวหน้าโครงการ
        </Link>
        <span className="text-black/20">/</span>
        <Link href={`/project-progress/${yearId}`} className="text-black/40 hover:text-black/70 transition-colors">
          {year.name}
        </Link>
        <span className="text-black/20">/</span>
        <span className="text-black/60">{group.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#12181F]">{group.name}</h1>
        <p className="text-sm text-black/40 mt-0.5">{year.name}</p>
      </div>

      <ProjectProgressTable
        projects={projects}
        yearId={yearId}
        groupId={groupId}
        groupName={group.name}
        branches={branches}
        sessionBranchId={sessionBranchId}
        isRegion={isRegion}
        isAdmin={isAdmin}
        defaultProjectId={defaultProjectId}
      />
    </div>
  )
}
