'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import type {
  ActionResult,
  DirectiveProgressFormData,
  ResolutionStepFormData,
  DirectiveSummary,
  DirectiveKpis,
  DirectiveBranchStatus,
  TrafficLight,
} from '@/lib/types'

export async function logDirectiveProgress(
  data: DirectiveProgressFormData,
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const { error: logErr } = await supabase
    .from('resolution_progress_log')
    .insert({
      resolution_id: data.resolution_id,
      action_item_id: data.action_item_id ?? null,
      branch_costcenter: data.branch_costcenter,
      branch_name: data.branch_name,
      progress_pct: data.progress_pct,
      note: data.note?.trim() ?? null,
      updated_by: session.username,
    })

  if (logErr) return { success: false, error: logErr.message }

  const newStatus =
    data.progress_pct === 100 ? 'แล้วเสร็จ' :
    data.progress_pct === 0   ? 'รอดำเนินการ' :
                                 'ระหว่างดำเนินการ'

  await supabase
    .from('meeting_resolutions')
    .update({
      progress_pct: data.progress_pct,
      progress_note: data.note?.trim() ?? null,
      progress_updated_at: new Date().toISOString(),
      progress_updated_by: session.username,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.resolution_id)

  if (data.action_item_id) {
    const actionStatus =
      data.progress_pct === 100 ? 'แล้วเสร็จ' :
      data.progress_pct > 0     ? 'ระหว่างดำเนินการ' :
                                   'รอดำเนินการ'

    await supabase
      .from('action_items')
      .update({
        status: actionStatus,
        notes: data.note?.trim() ?? null,
        ...(data.progress_pct === 100 ? { completed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.action_item_id)
  }

  revalidatePath('/action')
  revalidatePath('/meeting')

  return { success: true }
}

export async function getDirectiveSummaries(
  meetingId?: string,
): Promise<DirectiveSummary[]> {
  const supabase = await createClient()

  let resQuery = supabase
    .from('meeting_resolutions')
    .select('*')
    .order('created_at', { ascending: false })

  if (meetingId) {
    resQuery = resQuery.eq('meeting_id', meetingId)
  }

  const { data: resolutions } = await resQuery
  if (!resolutions || resolutions.length === 0) return []

  const resolutionIds = resolutions.map(r => r.id)

  const [
    { data: actionItems },
    { data: progressLogs },
    { data: steps },
  ] = await Promise.all([
    supabase
      .from('action_items')
      .select('*, branches(name_th, code)')
      .in('resolution_id', resolutionIds),
    supabase
      .from('resolution_progress_log')
      .select('*')
      .in('resolution_id', resolutionIds)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('resolution_steps')
      .select('*')
      .in('resolution_id', resolutionIds)
      .order('step_no', { ascending: true }),
  ])

  const now = Date.now()
  const sevenDaysMs = 7 * 86400000

  return resolutions.map(resolution => {
    const linkedActions = (actionItems ?? []).filter(
      (a: { resolution_id: string }) => a.resolution_id === resolution.id,
    )
    const resLogs = (progressLogs ?? []).filter(
      (l: { resolution_id: string }) => l.resolution_id === resolution.id,
    )
    const resSteps = (steps ?? []).filter(
      (s: { resolution_id: string }) => s.resolution_id === resolution.id,
    )

    const branchStatuses: DirectiveBranchStatus[] = linkedActions.map((action: {
      id: string
      branches: { name_th: string; code: string } | null
      status: string
      due_date: string | null
    }) => {
      const nameTh = action.branches?.name_th ?? ''
      const pwaB = PWA_BRANCHES.find(b => b.name_th === nameTh)
      const costcenter = pwaB?.costcenter ?? ''

      const branchLog = resLogs.find(
        (l: { action_item_id: string | null }) => l.action_item_id === action.id,
      ) ?? resLogs.find(
        (l: { branch_costcenter: string }) => l.branch_costcenter === costcenter,
      ) ?? null

      let daysOverdue: number | null = null
      if (
        resolution.due_date &&
        action.status !== 'แล้วเสร็จ' &&
        new Date(resolution.due_date).getTime() < now
      ) {
        daysOverdue = Math.floor(
          (now - new Date(resolution.due_date).getTime()) / 86400000,
        )
      }

      const lastUpdated = branchLog?.created_at ?? null
      const daysSinceUpdate = lastUpdated
        ? Math.floor((now - new Date(lastUpdated).getTime()) / 86400000)
        : null

      let trafficLight: TrafficLight = 'grey'
      if (action.status === 'แล้วเสร็จ') {
        trafficLight = 'green'
      } else if (daysOverdue !== null && daysOverdue > 0) {
        trafficLight = 'red'
      } else if (daysSinceUpdate !== null && daysSinceUpdate * 86400000 > sevenDaysMs) {
        trafficLight = 'yellow'
      } else if (action.status === 'ระหว่างดำเนินการ') {
        trafficLight = 'green'
      } else if (action.status === 'รอดำเนินการ') {
        trafficLight = 'yellow'
      }

      const logPct = branchLog?.progress_pct ?? null
      const progress_pct =
        action.status === 'แล้วเสร็จ' ? 100 :
        logPct !== null ? logPct :
        resolution.progress_pct

      return {
        branch_costcenter: costcenter,
        branch_name: nameTh || action.branches?.name_th || '',
        action_item_id: action.id,
        action_status: action.status as DirectiveBranchStatus['action_status'],
        progress_pct,
        last_updated_at: lastUpdated,
        last_updated_by: branchLog?.updated_by ?? null,
        days_overdue: daysOverdue,
        traffic_light: trafficLight,
      }
    })

    // If no action items, build a single entry from resolution itself
    if (branchStatuses.length === 0 && resolution.responsible_branch) {
      const pwaB = PWA_BRANCHES.find(b => b.costcenter === resolution.responsible_branch)
      const done = resolution.status === 'แล้วเสร็จ' || resolution.status === 'ปิดประเด็น'
      let daysOverdue: number | null = null
      if (resolution.due_date && !done && new Date(resolution.due_date).getTime() < now) {
        daysOverdue = Math.floor((now - new Date(resolution.due_date).getTime()) / 86400000)
      }
      const latestLog = resLogs[0] ?? null
      const daysSinceUpdate = latestLog
        ? Math.floor((now - new Date(latestLog.created_at).getTime()) / 86400000)
        : null

      let trafficLight: TrafficLight = 'grey'
      if (done) trafficLight = 'green'
      else if (daysOverdue !== null && daysOverdue > 0) trafficLight = 'red'
      else if (daysSinceUpdate !== null && daysSinceUpdate * 86400000 > sevenDaysMs) trafficLight = 'yellow'
      else if (resolution.progress_pct > 0) trafficLight = 'green'
      else trafficLight = 'yellow'

      branchStatuses.push({
        branch_costcenter: resolution.responsible_branch,
        branch_name: pwaB?.name_th ?? resolution.responsible_branch,
        action_item_id: null,
        action_status: null,
        progress_pct: resolution.progress_pct,
        last_updated_at: resLogs[0]?.created_at ?? null,
        last_updated_by: resLogs[0]?.updated_by ?? null,
        days_overdue: daysOverdue,
        traffic_light: trafficLight,
      })
    }

    return {
      resolution,
      branch_statuses: branchStatuses,
      latest_log: resLogs[0] ?? null,
      steps: resSteps,
    }
  })
}

export async function getDirectiveKpis(): Promise<DirectiveKpis> {
  const supabase = await createClient()

  const { data: resolutions } = await supabase
    .from('meeting_resolutions')
    .select('id, status, due_date, progress_updated_at')

  const rows = resolutions ?? []
  const now = new Date()
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const total = rows.length
  const completed = rows.filter(r =>
    r.status === 'แล้วเสร็จ' || r.status === 'ปิดประเด็น',
  ).length
  const delayed = rows.filter(r =>
    r.due_date &&
    new Date(r.due_date) < now &&
    r.status !== 'แล้วเสร็จ' &&
    r.status !== 'ปิดประเด็น',
  ).length
  const unresponsive = rows.filter(r =>
    r.status !== 'แล้วเสร็จ' &&
    r.status !== 'ปิดประเด็น' &&
    (!r.progress_updated_at || r.progress_updated_at < sevenDaysAgo),
  ).length
  const on_track = Math.max(0, total - completed - delayed - unresponsive)

  return { total, on_track, delayed, completed, unresponsive }
}

export async function createResolutionStep(
  data: ResolutionStepFormData,
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const { error } = await supabase.from('resolution_steps').insert({
    resolution_id: data.resolution_id,
    step_no: data.step_no,
    title: data.title,
    description: data.description ?? null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/action')
  revalidatePath('/meeting')
  return { success: true }
}

export async function toggleResolutionStep(
  stepId: string,
  isComplete: boolean,
): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session) return { success: false, error: 'ไม่ได้รับอนุญาต' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('resolution_steps')
    .update({
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
      completed_by: isComplete ? session.username : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stepId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/action')
  return { success: true }
}
