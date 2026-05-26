'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { ActionResult } from '@/lib/types'

function fullName(session: Awaited<ReturnType<typeof getPwaSession>>) {
  if (!session) return ''
  return [session.prefix_name, session.name, session.surname].filter(Boolean).join('').trim() || session.username
}

// ─── Budget Years ────────────────────────────────────────────────────────────

export async function createBudgetYear(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const name        = (formData.get('name') as string)?.trim()
  const fiscal_year = parseInt(formData.get('fiscal_year') as string)

  if (!name)            return { success: false, error: 'กรุณากรอกชื่อปีงบประมาณ' }
  if (isNaN(fiscal_year)) return { success: false, error: 'กรุณากรอกปี พ.ศ.' }

  const { error } = await (supabase as any).from('budget_years').insert({
    name,
    fiscal_year,
    created_by: fullName(session),
  })
  if (error) {
    if (error.message.includes('duplicate key') || error.code === '23505')
      return { success: false, error: `ปีงบประมาณ ${fiscal_year} มีอยู่แล้ว` }
    return { success: false, error: error.message }
  }

  revalidatePath('/project-progress')
  return { success: true }
}

export async function updateBudgetYear(
  id: string,
  patch: { name?: string; is_active?: boolean }
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const { error } = await (supabase as any).from('budget_years').update(patch).eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress')
  return { success: true }
}

export async function deleteBudgetYear(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const { error } = await (supabase as any).from('budget_years').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress')
  return { success: true }
}

// ─── Budget Groups ────────────────────────────────────────────────────────────

export async function createBudgetGroup(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const budget_year_id = formData.get('budget_year_id') as string
  const name           = (formData.get('name') as string)?.trim()

  if (!budget_year_id) return { success: false, error: 'ไม่พบปีงบประมาณ' }
  if (!name)           return { success: false, error: 'กรุณากรอกชื่องบประมาณ' }

  const { error } = await (supabase as any).from('budget_groups').insert({
    budget_year_id,
    name,
    created_by: fullName(session),
  })
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

export async function deleteBudgetGroup(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const { error } = await (supabase as any).from('budget_groups').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(formData: FormData): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const budget_year_id    = formData.get('budget_year_id') as string
  const budget_group_id   = formData.get('budget_group_id') as string
  const branch_id         = formData.get('branch_id') as string
  const project_name      = (formData.get('project_name') as string)?.trim()
  const code              = (formData.get('code') as string)?.trim() || null
  const budget_excl_vat   = parseFloat(formData.get('budget_excl_vat') as string) || null
  const contract_incl_vat = parseFloat(formData.get('contract_incl_vat') as string) || null

  if (!budget_year_id)  return { success: false, error: 'ไม่พบปีงบประมาณ' }
  if (!budget_group_id) return { success: false, error: 'ไม่พบชื่องบประมาณ' }
  if (!branch_id)       return { success: false, error: 'กรุณาเลือกสาขา' }
  if (!project_name)    return { success: false, error: 'กรุณากรอกชื่อโครงการ' }

  const { error } = await (supabase as any).from('budget_projects').insert({
    code,
    budget_year_id,
    budget_group_id,
    branch_id,
    project_name,
    budget_excl_vat,
    contract_incl_vat,
    current_phase: 0,
    created_by: fullName(session),
  })
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const { error } = await (supabase as any).from('budget_projects').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

// ─── Phase 1-3: Simple milestones ────────────────────────────────────────────

export async function updateProjectPhase(
  id: string,
  phase: 1 | 2 | 3,
  formData: FormData
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const completed_at = formData.get(`phase${phase}_completed_at`) as string || null
  const notes        = (formData.get(`phase${phase}_notes`) as string) || null

  const patch: Record<string, string | number | null> = {
    [`phase${phase}_completed_at`]: completed_at,
    [`phase${phase}_notes`]:        notes,
  }

  // Auto-advance current_phase if this phase is newly completed
  const { data: project } = await (supabase as any)
    .from('budget_projects').select('current_phase').eq('id', id).single()

  if (completed_at && project && project.current_phase < phase) {
    patch['current_phase'] = phase
  }

  const { error } = await (supabase as any).from('budget_projects').update(patch).eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

// ─── Phase 4: Contract ────────────────────────────────────────────────────────

export async function upsertProjectContract(
  projectId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const estimated_pipe_length = parseFloat(formData.get('estimated_pipe_length') as string) || null
  const contractor_name       = (formData.get('contractor_name') as string) || null
  const contract_number       = (formData.get('contract_number') as string) || null
  const contract_date         = (formData.get('contract_date') as string) || null
  const construction_days     = parseInt(formData.get('construction_days') as string) || null
  const contract_start_date   = (formData.get('contract_start_date') as string) || null
  const contract_end_date     = (formData.get('contract_end_date') as string) || null

  const { error } = await (supabase as any).from('project_contracts').upsert({
    project_id: projectId,
    estimated_pipe_length,
    contractor_name,
    contract_number,
    contract_date,
    construction_days,
    contract_start_date,
    contract_end_date,
    created_by: fullName(session),
  }, { onConflict: 'project_id' })

  if (error) return { success: false, error: error.message }

  // Advance to phase 4 if not already there
  const { data: project } = await (supabase as any)
    .from('budget_projects').select('current_phase').eq('id', projectId).single()
  if (project && project.current_phase < 4) {
    await (supabase as any).from('budget_projects').update({ current_phase: 4 }).eq('id', projectId)
  }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

// ─── Phase 5: Advance to construction ────────────────────────────────────────

export async function updateCurrentPhase(id: string, phase: number): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('budget_projects').update({ current_phase: phase }).eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

export async function addProgressUpdate(
  projectId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const reported_date         = (formData.get('reported_date') as string) || new Date().toISOString().split('T')[0]
  const pipe_length_completed = parseFloat(formData.get('pipe_length_completed') as string)
  const notes                 = (formData.get('notes') as string) || null

  if (isNaN(pipe_length_completed) || pipe_length_completed < 0) {
    return { success: false, error: 'กรุณากรอกความยาวท่อที่ถูกต้อง' }
  }

  const { error } = await (supabase as any).from('project_progress_updates').insert({
    project_id: projectId,
    reported_date,
    pipe_length_completed,
    notes,
    created_by: fullName(session),
  })
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}

// ─── Bulk Import ─────────────────────────────────────────────────────────────

export async function bulkCreateProjects(
  yearId: string,
  groupId: string,
  rows: Array<{
    project_name: string
    branch_id: string
    code?: string | null
    budget_excl_vat?: number | null
    contract_incl_vat?: number | null
  }>
): Promise<ActionResult & { inserted?: number; skipped?: number }> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const by = fullName(session)
  const records = rows.map(r => ({
    budget_year_id:   yearId,
    budget_group_id:  groupId,
    branch_id:        r.branch_id,
    project_name:     r.project_name,
    code:             r.code || null,
    budget_excl_vat:  r.budget_excl_vat ?? null,
    contract_incl_vat: r.contract_incl_vat ?? null,
    current_phase:    0,
    created_by:       by,
  }))

  const { error, data } = await (supabase as any)
    .from('budget_projects')
    .insert(records)
    .select('id')

  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true, inserted: (data as unknown[]).length }
}

// ─── End Phase: Completion ────────────────────────────────────────────────────

export async function updateProjectCompletion(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }
  const supabase = await createClient()

  const completion_submission_date = (formData.get('completion_submission_date') as string) || null
  const completion_inspection_date = (formData.get('completion_inspection_date') as string) || null
  const completion_notes           = (formData.get('completion_notes') as string) || null

  const patch: Record<string, string | null | number> = {
    completion_submission_date,
    completion_inspection_date,
    completion_notes,
  }
  if (completion_submission_date) patch['current_phase'] = 6

  const { error } = await (supabase as any).from('budget_projects').update(patch).eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/project-progress', 'layout')
  return { success: true }
}
