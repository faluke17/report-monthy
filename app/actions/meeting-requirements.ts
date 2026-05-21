'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'
import type {
  ActionResult,
  MeetingRequirement,
  MeetingRequirementType,
  RequirementWithStatus,
  MeetingWithRequirements,
} from '@/lib/types'

const TOTAL_BRANCHES = PWA_BRANCHES.length // 26

// Map branch name_th → costcenter (used when querying branch UUID tables)
const NAME_TO_CC = new Map(PWA_BRANCHES.map((b) => [b.name_th, b.costcenter]))

// ──────────────────────────────────────────────
// Helper: ดึง costcenters ที่ fulfilled requirement นี้
// ──────────────────────────────────────────────
async function getFulfilledCostcenters(
  req: MeetingRequirement,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {

  type WithBranch = { branches: { name_th: string } | { name_th: string }[] | null }

  function extractCC(rows: unknown[]): string[] {
    return (rows as WithBranch[]).flatMap((r) => {
      const b = r.branches
      if (!b) return []
      const name = Array.isArray(b) ? b[0]?.name_th : b.name_th
      const cc = name ? NAME_TO_CC.get(name) : undefined
      return cc ? [cc] : []
    })
  }

  if (req.requirement_type === 'monthly_report' && req.target_year && req.target_month) {
    const { data } = await supabase
      .from('area_monthly_reports')
      .select('branch_id, branches!inner(name_th)')
      .eq('report_year', req.target_year)
      .eq('report_month', req.target_month)
      .eq('status', 'submitted')
    return [...new Set(extractCC(data ?? []))]
  }

  if (req.requirement_type === 'five_topics' && req.target_year && req.target_month) {
    const { data } = await supabase
      .from('five_topics_reports')
      .select('branch_id, branches!inner(name_th)')
      .eq('report_year', req.target_year)
      .eq('report_month', req.target_month)
    return extractCC(data ?? [])
  }

  if (req.requirement_type === 'km_case') {
    const { data } = await supabase
      .from('km_cases')
      .select('branch_id, branches!inner(name_th)')
      .gte('created_at', req.created_at)
    return extractCC(data ?? [])
  }

  // custom: ดูจาก fulfillments table
  const { data } = await supabase
    .from('meeting_requirement_fulfillments')
    .select('branch_costcenter')
    .eq('requirement_id', req.id)
  return (data ?? []).map((r) => r.branch_costcenter)
}

// ──────────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────────
export async function createMeetingRequirement(
  meeting_id: string,
  payload: {
    requirement_type: MeetingRequirementType
    title: string
    description?: string
    target_year?: number
    target_month?: number
    due_date?: string
    sort_order?: number
  },
): Promise<ActionResult<MeetingRequirement>> {
  const session = await getPwaSession()
  if (!session || session.costcenter) return { success: false, error: 'ไม่มีสิทธิ์' }
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('meeting_requirements')
    .insert({ meeting_id, ...payload })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/meeting')
  revalidatePath('/notify')
  return { success: true, data: data as MeetingRequirement }
}

export async function deleteMeetingRequirement(id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session || session.costcenter) return { success: false, error: 'ไม่มีสิทธิ์' }
  const supabase = await createClient()
  const { error } = await supabase.from('meeting_requirements').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/meeting')
  revalidatePath('/notify')
  return { success: true }
}

// branch กดยืนยัน "ดำเนินการแล้ว" สำหรับ type=custom
export async function fulfillCustomRequirement(requirement_id: string): Promise<ActionResult> {
  const session = await getPwaSession()
  if (!session || !session.costcenter) return { success: false, error: 'เฉพาะผู้ใช้สาขา' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('meeting_requirement_fulfillments')
    .upsert({
      requirement_id,
      branch_costcenter: session.costcenter,
      fulfilled_by: session.username,
      fulfilled_name: `${session.name} ${session.surname}`.trim(),
    }, { onConflict: 'requirement_id,branch_costcenter' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/notify')
  return { success: true }
}

// ──────────────────────────────────────────────
// Query: ดึง requirements + fulfillment status
// ──────────────────────────────────────────────
export async function getMeetingsWithRequirements(opts?: {
  branchCostcenter?: string | null  // null = region user (all branches)
}): Promise<MeetingWithRequirements[]> {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]

  // ดึง meetings ที่ active (ยังไม่เสร็จ + ยังไม่ผ่านไปนาน)
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, title, scheduled_date')
    .eq('status', 'กำหนดแล้ว')
    .not('notified_at', 'is', null)
    .gte('scheduled_date', thirtyDaysAgo)
    .order('scheduled_date', { ascending: true })

  if (!meetings || meetings.length === 0) return []

  const meetingIds = meetings.map((m) => m.id)
  const { data: reqs } = await supabase
    .from('meeting_requirements')
    .select('*')
    .in('meeting_id', meetingIds)
    .order('sort_order', { ascending: true })

  if (!reqs || reqs.length === 0) return []

  // คำนวณ fulfillment แบบ parallel ต่อทุก requirement
  const enriched = await Promise.all(
    (reqs as MeetingRequirement[]).map(async (req) => {
      const fulfilled = await getFulfilledCostcenters(req, supabase)
      const fulfilledSet = new Set(fulfilled)
      const pending_count = TOTAL_BRANCHES - fulfilledSet.size
      const is_fulfilled_by_me = opts?.branchCostcenter
        ? fulfilledSet.has(opts.branchCostcenter)
        : false
      return {
        ...req,
        fulfilled_costcenters: fulfilled,
        pending_count: Math.max(0, pending_count),
        is_fulfilled_by_me,
      } as RequirementWithStatus
    }),
  )

  // Group by meeting
  return meetings
    .map((m) => {
      const mReqs = enriched.filter((r) => r.meeting_id === m.id)
      const total_pending = opts?.branchCostcenter
        // สาขา: count requirements ที่ตัวเองยังไม่ทำ
        ? mReqs.filter((r) => !r.is_fulfilled_by_me).length
        // เขต: sum ของ pending branches ทุก requirement
        : mReqs.reduce((s, r) => s + r.pending_count, 0)
      return { ...m, requirements: mReqs, total_pending }
    })
    .filter((m) => m.requirements.length > 0)
}

// ──────────────────────────────────────────────
// Count เดียว สำหรับ layout badge
// ──────────────────────────────────────────────
export async function getRequirementsPendingCount(branchCostcenter: string | null): Promise<number> {
  const meetings = await getMeetingsWithRequirements({ branchCostcenter })
  return meetings.reduce((s, m) => s + m.total_pending, 0)
}
