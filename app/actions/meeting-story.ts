'use server'

// รายงานการประชุมแบบ "เรื่องเล่า" (meeting story) — อ่านข้อมูลวาระ/มติที่กรอกไว้แล้วผ่านหน้า
// /meeting/[id]/report (MeetingAgendaForm) มาจัดวางใหม่เป็นรูปแบบนิตยสารอ่านง่าย
// ใช้ในหน้า /executive-summary — ไม่ต้องกรอกข้อมูลซ้ำ ดึงจาก meeting_agenda_headers/subitems ที่มีอยู่แล้ว

import { createClient } from '@/lib/supabase/server'
import type { Meeting, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'

export interface MeetingStoryListItem {
  id: string
  code: string
  title: string
  meeting_type: string
  scheduled_date: string
  location: string | null
}

// รายชื่อการประชุมที่มีรายงาน (มี meeting_agenda_headers แล้ว) เรียงล่าสุดก่อน — ใช้แสดงเป็นรายการให้เลือกเปิดอ่าน
export async function getMeetingStoryList(limit = 12): Promise<{ data: MeetingStoryListItem[]; error: string | null }> {
  const supabase = await createClient()

  const { data: headers, error: headerErr } = await supabase
    .from('meeting_agenda_headers')
    .select('meeting_id')

  if (headerErr) return { data: [], error: headerErr.message }

  const ids = (headers ?? []).map((h) => h.meeting_id)
  if (ids.length === 0) return { data: [], error: null }

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id,code,title,meeting_type,scheduled_date,location')
    .in('id', ids)
    .order('scheduled_date', { ascending: false })
    .limit(limit)

  if (error) return { data: [], error: error.message }
  return { data: (meetings ?? []) as MeetingStoryListItem[], error: null }
}

export interface MeetingStoryDetail {
  meeting: Meeting
  header: MeetingAgendaHeader
  subitems: MeetingAgendaSubItem[]
  ackCount: number
}

// รายละเอียดเต็มของการประชุมหนึ่งครั้ง — สำหรับ render หน้ารายงานแบบเต็ม
export async function getMeetingStoryDetail(meetingId: string): Promise<{ data: MeetingStoryDetail | null; error: string | null }> {
  const supabase = await createClient()

  const [meetingRes, headerRes, subitemsRes, ackRes] = await Promise.all([
    supabase.from('meetings').select('*').eq('id', meetingId).single(),
    supabase.from('meeting_agenda_headers').select('*').eq('meeting_id', meetingId).maybeSingle(),
    supabase
      .from('meeting_agenda_subitems')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('agenda_no')
      .order('sort_order'),
    supabase.from('meeting_acknowledgments').select('id', { count: 'exact', head: true }).eq('meeting_id', meetingId),
  ])

  if (meetingRes.error || !meetingRes.data) return { data: null, error: 'ไม่พบข้อมูลการประชุม' }
  if (!headerRes.data) return { data: null, error: 'การประชุมนี้ยังไม่มีรายงานการประชุม (กรอกได้ที่หน้าวาระ/รายงาน)' }

  return {
    data: {
      meeting: meetingRes.data as Meeting,
      header: headerRes.data as MeetingAgendaHeader,
      subitems: (subitemsRes.data ?? []) as MeetingAgendaSubItem[],
      ackCount: ackRes.count ?? 0,
    },
    error: null,
  }
}
