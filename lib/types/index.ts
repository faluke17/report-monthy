// ============================================================
// Domain Types for WSC-R NRW Tracker
// ============================================================

export type UserRole = 'region_admin' | 'region_viewer' | 'branch_manager' | 'branch_staff'

export interface Branch {
  id: string
  code: string          // e.g. 'SKT', 'PCT'
  name_th: string       // e.g. 'สุโขทัย'
  province_th: string
  region: string        // 'R10'
  is_active: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  full_name: string | null
  role: UserRole
  branch_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // joined
  branches?: Branch | null
}

export interface Plan {
  id: string
  code: string
  branch_id: string
  owner_level: 'region' | 'branch' | null
  plan_type: string
  approach_group: string
  area: string | null
  baseline_nrw: number | null
  baseline_mnf: number | null
  baseline_daily_supply: number | null
  baseline_daily_sale: number | null
  target_nrw: number | null
  target_mnf: number | null
  target_water_save: number | null
  action_plan: string | null
  resources: string | null
  priority: 'สูง' | 'กลาง' | 'ต่ำ' | null
  start_date: string | null
  end_date: string | null
  pic: string | null
  status: 'ระหว่างดำเนินการ' | 'สำเร็จ' | 'ล่าช้า' | 'ยกเลิก' | 'รออนุมัติ'
  progress_pct: number
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  // joined
  branches?: Branch
}

export interface MonthlyReport {
  id: string
  branch_id: string
  plan_id: string | null
  report_year: number
  report_month: number
  volume_distributed: number | null
  volume_sold: number | null
  days_in_month: number
  mnf_latest: number | null
  mnf_measured_date: string | null
  daily_supply: number | null
  // generated columns
  nrw_pct: number | null
  mnf_factor: number | null
  leaks_found: number
  leaks_repaired: number
  leaks_pending: number
  leaks_repeat: number
  meters_abnormal: number
  pdca_do: string | null
  pdca_act: string | null
  status: 'draft' | 'submitted' | 'reviewed'
  submitted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  branches?: Branch
  plans?: Plan | null
}

export interface Obstacle {
  id: string
  code: string
  branch_id: string
  plan_id: string | null
  obstacle_type: string
  category: 'MM' | 'DMA' | 'P3' | 'อื่นๆ'
  area: string | null
  data_quality_impact: string | null
  resolution_plan: string | null
  region_support_needed: string | null
  progress_pct: number
  due_date: string | null
  status: 'รายงานใหม่' | 'ระหว่างแก้' | 'รอสนับสนุน' | 'ล่าช้า' | 'เกินกำหนด' | 'ปิดประเด็น'
  auto_create_action: boolean
  send_to_meeting: boolean
  show_in_monthly_alert: boolean
  priority_order: number | null
  created_by: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  // joined
  branches?: Branch
}

export interface ActionItem {
  id: string
  code: string
  branch_id: string
  plan_id: string | null
  obstacle_id: string | null
  meeting_id: string | null
  resolution_id: string | null
  title: string
  detail: string | null
  owner: string
  due_date: string | null
  status: 'รอดำเนินการ' | 'ระหว่างดำเนินการ' | 'รออนุมัติ' | 'แล้วเสร็จ' | 'เกินกำหนด' | 'ยกเลิก'
  evidence_url: string[] | null
  notes: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  branches?: Branch
  obstacles?: Obstacle | null
}

export interface Meeting {
  id: string
  code: string
  title: string
  meeting_type: string
  scheduled_date: string
  scheduled_time: string
  location: string | null
  meeting_link: string | null
  target_audience: string
  prep_required: string | null
  notification_message: string | null
  status: 'กำหนดแล้ว' | 'เสร็จสิ้น' | 'เลื่อน' | 'ยกเลิก'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MeetingAcknowledgment {
  id: string
  meeting_id: string
  branch_name: string
  acknowledged_by: string
  acknowledged_name: string | null
  acknowledged_at: string
}

export interface MeetingResolution {
  id: string
  meeting_id: string
  sequence_no: number
  title: string
  responsible_party: string | null
  due_date: string | null
  status: string
  notes: string | null
  action_item_id: string | null
  source: string | null
  priority: 'สูง' | 'กลาง' | null
  detail: string | null
  responsible_branch: string | null
  responsible_dept: string | null
  admin_notes: string | null
  tracking_notes: string | null
  progress_pct: number
  progress_note: string | null
  progress_updated_at: string | null
  progress_updated_by: string | null
  created_at: string
  updated_at: string
}

export interface KmCase {
  id: string
  code: string
  branch_id: string
  plan_id: string | null
  title: string
  approach_tags: string[] | null
  nrw_before: number | null
  nrw_after: number | null
  mnf_before: number | null
  mnf_after: number | null
  water_saved_daily: number | null
  value_saved_monthly: number | null
  key_approach: string | null
  lessons_learned: string | null
  applicable_branches: string[] | null
  verification_status: 'รอยืนยันรอบ 1' | 'รอยืนยันรอบ 2' | 'ยืนยันแล้ว'
  verified_rounds: number
  verified_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // joined
  branches?: Branch
}

// ============================================================
// Computed / View Types
// ============================================================

export type NRWStatus = 'good' | 'warn' | 'bad'
export type TrafficLight = 'green' | 'yellow' | 'red' | 'grey'
export type NRWTrend = 'up' | 'down' | 'stable' | 'no_data'

export interface BranchSummary {
  branch: Branch
  latest_report: MonthlyReport | null
  prev_report: MonthlyReport | null
  nrw_trend: NRWTrend
  traffic_light: TrafficLight
  open_obstacles: number
  pending_actions: number
}

export interface KpiSnapshot {
  region_avg_nrw_pct: number | null
  branches_on_target: number
  branches_total: number
  open_obstacles_total: number
  overdue_actions_total: number
  branches_submitted: number
}

// ============================================================
// Form Types (for React Hook Form)
// ============================================================

export interface MonthlyReportFormData {
  branch_id: string
  plan_id?: string
  report_year: number
  report_month: number
  volume_distributed: number
  volume_sold: number
  days_in_month: number
  mnf_latest: number
  mnf_measured_date?: string
  daily_supply: number
  leaks_found: number
  leaks_repaired: number
  leaks_pending: number
  leaks_repeat: number
  meters_abnormal: number
  pdca_do?: string
  pdca_act?: string
}

export interface PlanFormData {
  branch_id: string
  owner_level: 'region' | 'branch'
  plan_type: string
  approach_group: string
  area?: string
  baseline_nrw?: number
  baseline_mnf?: number
  baseline_daily_supply?: number
  baseline_daily_sale?: number
  target_nrw?: number
  target_mnf?: number
  target_water_save?: number
  action_plan?: string
  resources?: string
  priority?: 'สูง' | 'กลาง' | 'ต่ำ'
  start_date?: string
  end_date?: string
  pic?: string
}

export interface ObstacleFormData {
  branch_id: string
  plan_id?: string
  obstacle_type: string
  category: 'MM' | 'DMA' | 'P3' | 'อื่นๆ'
  area?: string
  data_quality_impact?: string
  resolution_plan?: string
  region_support_needed?: string
  progress_pct: number
  due_date?: string
  auto_create_action: boolean
  send_to_meeting: boolean
  show_in_monthly_alert: boolean
}

export interface ActionFormData {
  branch_id: string
  plan_id?: string
  obstacle_id?: string
  title: string
  detail?: string
  owner: string
  due_date?: string
  notes?: string
}

export interface MeetingFormData {
  title: string
  meeting_type: string
  scheduled_date: string
  scheduled_time: string
  location?: string
  meeting_link?: string
  target_audience: string
  prep_required?: string
  notification_message?: string
}

export interface KmFormData {
  branch_id: string
  plan_id?: string
  title: string
  approach_tags?: string[]
  nrw_before?: number | null
  nrw_after?: number | null
  mnf_before?: number | null
  mnf_after?: number | null
  water_saved_daily?: number | null
  value_saved_monthly?: number | null
  key_approach?: string
  lessons_learned?: string
}

// ============================================================
// Water Distribution Node Types
// ============================================================

export interface WaterNode {
  id: string
  branch_id: string
  node_type: 'MM' | 'DMA' | 'SUB' | 'VD'
  code: string
  name_th: string | null
  parent_id: string | null
  status: 'จ่าย' | 'ส่ง' | 'รอปรับโซน' | null
  user_count: number | null
  is_active: boolean
  created_at: string
}

export interface WaterNodeOption {
  id: string
  branch_id: string
  code: string
  name_th: string | null
  node_type: 'MM' | 'DMA' | 'SUB' | 'VD'
  user_count: number | null
}

// ============================================================
// Five Topics Report Types
// ============================================================

export interface FiveTopicsReport {
  id: string
  branch_id: string
  report_year: number
  report_month: number
  t1_dma_count: number | null
  t1_conducted_date: string | null
  t1_areas: Array<{ area_name: string; conducted_date: string }> | null
  t1_notes: string | null
  t2_frequency: number | null
  t2_leak_points: number | null
  t2_repaired_points: number | null
  t2_water_loss_m3h: number | null
  t2_notes: string | null
  t3_dma_pm_count: number | null
  t3_prv_pm_count: number | null
  t3_p3_pm_count: number | null
  t3_notes: string | null
  t4_flush_points: number | null
  t4_volume_m3: number | null
  t4_notes: string | null
  t5_meters_replaced: number | null
  t5_notes: string | null
  status: 'draft' | 'submitted'
  submitted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  branches?: { name_th: string; code: string }
}

// ============================================================
// Server Action Return Types
// ============================================================

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

// ============================================================
// Meeting Agenda Types
// ============================================================

export interface MeetingAgendaHeader {
  id: string
  meeting_id: string
  start_time: '09:00' | '13:00'
  agenda1_detail: string | null
  agenda1_resolution: 'รับทราบ' | 'อื่นๆ'
  agenda1_resolution_detail: string | null
  agenda2_meeting_no: string | null
  agenda2_resolution: 'รับทราบ' | 'อื่นๆ'
  agenda2_resolution_detail: string | null
  agenda4_type: 'เรื่องสืบเนื่อง' | 'เรื่องติดตามผลการดำเนินการ'
  created_at: string
  updated_at: string
}

export interface MeetingAgendaSubItem {
  id?: string
  meeting_id: string
  agenda_no: number
  item_no: number
  title: string
  detail: string | null
  detail_table: { headers: string[]; colWidths?: number[]; rows: string[][] } | null
  resolution: 'รับทราบ' | 'อื่นๆ'
  resolution_detail: string | null
  sort_order: number
}

export interface ResolutionNotification {
  id: string
  resolution_id: string
  meeting_id: string
  branch_costcenter: string
  title: string
  detail: string | null
  is_read: boolean
  created_at: string
}

export interface MeetingResolutionFormData {
  meeting_id: string
  source: string
  priority: 'สูง' | 'กลาง'
  title: string
  detail?: string
  responsible_branch: string
  responsible_dept: string
  due_days: 7 | 15 | 30 | 45 | 60
  admin_notes?: string
  tracking_notes?: string
  notify_branch: boolean
}

// ============================================================
// Directive Tracking System Types
// ============================================================

export interface ResolutionProgressLog {
  id: string
  resolution_id: string
  action_item_id: string | null
  branch_costcenter: string
  branch_name: string
  progress_pct: number
  note: string | null
  updated_by: string
  created_at: string
}

export interface ResolutionStep {
  id: string
  resolution_id: string
  step_no: number
  title: string
  description: string | null
  is_complete: boolean
  completed_at: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
}

export interface DirectiveBranchStatus {
  branch_costcenter: string
  branch_name: string
  action_item_id: string | null
  action_status: ActionItem['status'] | null
  progress_pct: number
  last_updated_at: string | null
  last_updated_by: string | null
  days_overdue: number | null
  traffic_light: TrafficLight
}

export interface DirectiveSummary {
  resolution: MeetingResolution
  branch_statuses: DirectiveBranchStatus[]
  latest_log: ResolutionProgressLog | null
  steps: ResolutionStep[]
}

export interface DirectiveKpis {
  total: number
  on_track: number
  delayed: number
  completed: number
  unresponsive: number
}

export interface DirectiveProgressFormData {
  resolution_id: string
  action_item_id?: string
  branch_costcenter: string
  branch_name: string
  progress_pct: number
  note?: string
}

export interface ResolutionStepFormData {
  resolution_id: string
  step_no: number
  title: string
  description?: string
}
