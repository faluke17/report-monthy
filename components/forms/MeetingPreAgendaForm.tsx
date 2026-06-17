'use client'

import { useState, useTransition, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, AlertCircle, Brain, X, Save, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Meeting, MeetingPreAgenda, PreAgendaItem } from '@/lib/types'
import { savePreAgenda } from '@/app/actions/meeting-pre-agenda'
import { formatThaiDate } from '@/lib/utils/date-th'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'

// ─── re-export types used by the page ────────────────────────────────────────

export interface PreviousMeetingRow {
  id: string
  code: string
  title: string
  scheduled_date: string
}

export interface OpenResolutionRow {
  id: string
  meeting_id: string
  title: string
  responsible_branch: string | null
  due_date: string | null
  status: string
  progress_pct: number
  sequence_no: number
}

export interface PdcaSummaryRow {
  branch_name: string
  pdca_do: string | null
  pdca_act: string | null
  report_month: number
  report_year: number
}

export interface ObstacleSummaryRow {
  branch_name: string
  obstacle_type: string
  category: string
  data_quality_impact: string | null
  resolution_plan: string | null
  status: string
  priority_order: number
  report_month: number
  report_year: number
}

// ─── style constants ──────────────────────────────────────────────────────────

const INPUT =
  'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60'
const TEXTAREA =
  'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none'
const SELECT =
  'bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60'
const LABEL = 'block text-xs text-white/45 mb-1.5 font-medium uppercase tracking-wider'

// ─── state ────────────────────────────────────────────────────────────────────

interface FormState {
  agenda1Note: string
  agenda2RefMeetingNo: string
  agenda4Type: 'เรื่องสืบเนื่อง' | 'เรื่องติดตามผลการดำเนินการ'
  items3: PreAgendaItem[]
  items4: PreAgendaItem[]
  items5: PreAgendaItem[]
  items6: PreAgendaItem[]
  pdcaRefMonth: number | null
  pdcaRefYear: number | null
  pdcaDeadline: string
}

function initState(data: MeetingPreAgenda | null, previousMeetings: PreviousMeetingRow[]): FormState {
  if (!data) {
    return {
      agenda1Note: '',
      agenda2RefMeetingNo: previousMeetings[0]?.code ?? '',
      agenda4Type: 'เรื่องสืบเนื่อง',
      items3: [{ title: '' }],
      items4: [{ title: '' }],
      items5: [{ title: '' }],
      items6: [{ title: '' }],
      pdcaRefMonth: null,
      pdcaRefYear: null,
      pdcaDeadline: '',
    }
  }
  return {
    agenda1Note: data.agenda1_note ?? '',
    agenda2RefMeetingNo: data.agenda2_ref_meeting_no ?? '',
    agenda4Type: data.agenda4_type,
    items3: data.items3.length ? data.items3 : [{ title: '' }],
    items4: data.items4.length ? data.items4 : [{ title: '' }],
    items5: data.items5.length ? data.items5 : [{ title: '' }],
    items6: data.items6.length ? data.items6 : [{ title: '' }],
    pdcaRefMonth: data.pdca_ref_month ?? null,
    pdcaRefYear: data.pdca_ref_year ?? null,
    pdcaDeadline: data.pdca_deadline ?? '',
  }
}

// ─── reference panels (read-only) ─────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  'รอดำเนินการ':        'text-blue-400 bg-blue-500/10 border-blue-500/25',
  'ระหว่างดำเนินการ':   'text-amber-400 bg-amber-500/10 border-amber-500/25',
  'แล้วเสร็จ':          'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  'ปิดประเด็น':         'text-white/40 bg-white/5 border-white/15',
}

function OpenResolutionsPanel({ resolutions }: { resolutions: OpenResolutionRow[] }) {
  const [collapsed, setCollapsed] = useState(false)
  if (resolutions.length === 0) return null
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(p => !p)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-amber-500/8 transition-colors"
      >
        <AlertCircle size={13} className="text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-300 flex-1">
          มติ/ข้อสั่งการที่ยังค้างอยู่ — {resolutions.length} รายการ
        </span>
        <ChevronDown size={12} className={cn('text-amber-400/60 transition-transform', collapsed && 'rotate-180')} />
      </button>
      {!collapsed && (
        <div className="border-t border-amber-500/15 px-4 py-3 space-y-2">
          {resolutions.map(res => {
            const pct = res.progress_pct ?? 0
            const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
            const statusCls = STATUS_COLOR[res.status] ?? 'text-white/40 bg-white/5 border-white/15'
            return (
              <div key={res.id} className="bg-white/3 rounded-lg px-3 py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-white/90 leading-snug flex-1">{res.title}</p>
                  <span className={cn('shrink-0 text-[10px] px-2 py-0.5 rounded-full border', statusCls)}>
                    {res.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-white/35">
                  {res.responsible_branch && <span>{res.responsible_branch}</span>}
                  {res.due_date && <span>กำหนด {formatThaiDate(res.due_date, true)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                    <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-white/40 tabular-nums shrink-0">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

const OBSTACLE_STATUS_COLOR: Record<string, string> = {
  'รายงานใหม่':       'text-blue-400 bg-blue-500/10 border-blue-500/25',
  'ระหว่างแก้':       'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  'รอสนับสนุน':       'text-amber-400 bg-amber-500/10 border-amber-500/25',
  'ล่าช้า':           'text-orange-400 bg-orange-500/10 border-orange-500/25',
  'เกินกำหนด':        'text-red-400 bg-red-500/10 border-red-500/25',
}

function PdcaBranchPanel({ summaries, obstacles = [] }: { summaries: PdcaSummaryRow[], obstacles?: ObstacleSummaryRow[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const summaryMap = new Map(summaries.map(s => [s.branch_name, s]))
  const obstacleMap = new Map<string, ObstacleSummaryRow[]>()
  for (const obs of obstacles) {
    if (!obstacleMap.has(obs.branch_name)) obstacleMap.set(obs.branch_name, [])
    obstacleMap.get(obs.branch_name)!.push(obs)
  }

  const detail = selected ? summaryMap.get(selected) : null
  const branchObstacles = selected ? (obstacleMap.get(selected) ?? []) : []

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-500/15">
        <Brain size={13} className="text-violet-400 shrink-0" />
        <span className="text-xs font-semibold text-violet-300">ผลการดำเนินการรายสาขา (PDCA + อุปสรรค)</span>
        {obstacles.length > 0 && (
          <span className="ml-1 text-[10px] bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded-full">
            อุปสรรค {obstacles.length}
          </span>
        )}
        {selected && (
          <button type="button" onClick={() => setSelected(null)} className="ml-auto text-[10px] text-white/30 hover:text-white/60 transition-colors">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        {PWA_BRANCHES.map(b => {
          const hasPdca = summaryMap.has(b.name_th) && (summaryMap.get(b.name_th)?.pdca_do || summaryMap.get(b.name_th)?.pdca_act)
          const hasObs = obstacleMap.has(b.name_th)
          const active = selected === b.name_th
          return (
            <button
              key={b.costcenter}
              type="button"
              onClick={() => setSelected(active ? null : b.name_th)}
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-all relative',
                active
                  ? 'bg-violet-500/25 text-violet-300 border-violet-500/50'
                  : hasPdca || hasObs
                    ? 'bg-white/5 text-white/70 border-white/15 hover:border-violet-500/30 hover:text-violet-300'
                    : 'bg-transparent text-white/25 border-white/8 hover:text-white/40',
              )}
            >
              {b.name_th}
              {hasObs && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-400" />}
            </button>
          )
        })}
      </div>
      {selected && (
        <div className="border-t border-violet-500/15 px-4 py-3 space-y-3">
          {/* PDCA */}
          {detail && (detail.pdca_do || detail.pdca_act) ? (
            <>
              <p className="text-[10px] text-violet-400/70 font-semibold uppercase tracking-wider">
                {selected} · {THAI_MONTHS_SHORT[(detail.report_month - 1)]} {detail.report_year + 543}
              </p>
              {detail.pdca_do && (
                <div className="space-y-1">
                  <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">D — Do</p>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{detail.pdca_do}</p>
                </div>
              )}
              {detail.pdca_act && (
                <div className="space-y-1">
                  <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">A — Act</p>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{detail.pdca_act}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-white/30 italic">ยังไม่มีข้อมูล PDCA สำหรับสาขา{selected}</p>
          )}

          {/* Obstacles */}
          {branchObstacles.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/8">
              <p className="text-[10px] text-red-400/70 font-semibold uppercase tracking-wider">อุปสรรค — {branchObstacles.length} รายการ</p>
              {branchObstacles.map((obs, i) => {
                const statusCls = OBSTACLE_STATUS_COLOR[obs.status] ?? 'text-white/40 bg-white/5 border-white/15'
                return (
                  <div key={i} className="bg-white/3 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-white/85">{obs.obstacle_type}</p>
                      <span className={cn('shrink-0 text-[10px] px-2 py-0.5 rounded-full border', statusCls)}>
                        {obs.status}
                      </span>
                    </div>
                    {obs.data_quality_impact && (
                      <p className="text-[11px] text-white/50 leading-relaxed">{obs.data_quality_impact}</p>
                    )}
                    {obs.resolution_plan && (
                      <p className="text-[11px] text-cyan-400/70 leading-relaxed">แนวทาง: {obs.resolution_plan}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PDCA reference month picker ─────────────────────────────────────────────

const THAI_MONTHS_FULL = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

function PdcaRefPicker({
  refMonth, refYear, deadline,
  onChangeMonth, onChangeYear, onChangeDeadline,
}: {
  refMonth: number | null
  refYear: number | null
  deadline: string
  onChangeMonth: (v: number | null) => void
  onChangeYear: (v: number | null) => void
  onChangeDeadline: (v: string) => void
}) {
  const now = new Date()
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
  const hasRef = refMonth && refYear
  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-500/15">
        <Brain size={13} className="text-violet-400 shrink-0" />
        <span className="text-xs font-semibold text-violet-300">PDCA ที่จะนำเสนอในประชุม</span>
        {hasRef && (
          <span className="ml-auto text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
            {THAI_MONTHS_FULL[refMonth!]} {(refYear! + 543)}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-[11px] text-white/40 leading-relaxed">
          ระบุเดือนที่ต้องการนำ PDCA มาเสนอ — ระบบจะส่งแจ้งเตือนไปทุกสาขาให้กรอกรายงานเดือนนั้นก่อนประชุม
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className={SELECT}
            value={refMonth ?? ''}
            onChange={e => onChangeMonth(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— เลือกเดือน —</option>
            {THAI_MONTHS_FULL.slice(1).map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            className={SELECT}
            value={refYear ?? ''}
            onChange={e => onChangeYear(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— เลือกปี —</option>
            {years.map(y => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>กำหนดส่งข้อมูล (ไม่บังคับ)</label>
          <input
            type="date"
            className={cn(INPUT, 'max-w-xs')}
            value={deadline}
            onChange={e => onChangeDeadline(e.target.value)}
          />
        </div>
        {hasRef && (
          <button
            type="button"
            onClick={() => { onChangeMonth(null); onChangeYear(null); onChangeDeadline('') }}
            className="text-[10px] text-white/30 hover:text-red-400 transition-colors"
          >
            ล้างค่า
          </button>
        )}
      </div>
    </div>
  )
}

// ─── agenda item group ────────────────────────────────────────────────────────

function AgendaNumBadge({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/35 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  )
}

function ItemGroup({
  agendaNo,
  label,
  items,
  onChange,
}: {
  agendaNo: number
  label: string
  items: PreAgendaItem[]
  onChange: (items: PreAgendaItem[]) => void
}) {
  function update(idx: number, title: string) {
    onChange(items.map((it, i) => (i === idx ? { title } : it)))
  }
  function add() { onChange([...items, { title: '' }]) }
  function remove(idx: number) {
    onChange(items.length <= 1 ? [{ title: '' }] : items.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs font-bold text-cyan-400/60 shrink-0 w-6">{agendaNo}.{idx + 1}</span>
          <input
            className={cn(INPUT, 'flex-1')}
            placeholder={`${label} ${agendaNo}.${idx + 1}...`}
            value={item.title}
            onChange={e => update(idx, e.target.value)}
          />
          {items.length > 1 && (
            <button type="button" onClick={() => remove(idx)} className="text-white/25 hover:text-red-400 transition-colors shrink-0">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-cyan-400/60 hover:text-cyan-400 border border-dashed border-white/12 hover:border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Plus size={11} /> เพิ่ม {agendaNo}.{items.length + 1}
      </button>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  meeting: Meeting
  initialData: MeetingPreAgenda | null
  previousMeetings: PreviousMeetingRow[]
  openResolutions: OpenResolutionRow[]
  pdcaSummaries: PdcaSummaryRow[]
  obstacleSummaries?: ObstacleSummaryRow[]
  onSaved?: (meetingId: string) => void
  onDraftSaved?: (meetingId: string) => void
}

export function MeetingPreAgendaForm({
  meeting,
  initialData,
  previousMeetings,
  openResolutions,
  pdcaSummaries,
  obstacleSummaries = [],
  onSaved,
  onDraftSaved,
}: Props) {
  const [state, setState] = useState<FormState>(() => initState(initialData, previousMeetings))
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState(prev => ({ ...prev, [key]: val }))
  }

  const agenda5Label = state.agenda4Type === 'เรื่องสืบเนื่อง' ? 'เรื่องติดตามผลการดำเนินการ' : 'เรื่องอื่นๆ'
  const showAgenda6 = state.agenda4Type === 'เรื่องสืบเนื่อง'

  function buildPayload() {
    return {
      agenda1_note: state.agenda1Note || null,
      agenda2_ref_meeting_no: state.agenda2RefMeetingNo || null,
      agenda4_type: state.agenda4Type,
      items3: state.items3.filter(it => it.title.trim()),
      items4: state.items4.filter(it => it.title.trim()),
      items5: state.items5.filter(it => it.title.trim()),
      items6: state.items6.filter(it => it.title.trim()),
      pdca_ref_month: state.pdcaRefMonth,
      pdca_ref_year: state.pdcaRefYear,
      pdca_deadline: state.pdcaDeadline || null,
    }
  }

  function handleSave() {
    startTransition(async () => {
      const res = await savePreAgenda(meeting.id, buildPayload())
      if (res.success) {
        toast.success('บันทึกวาระการประชุมเรียบร้อย')
        onSaved?.(meeting.id)
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleDraftSave() {
    startTransition(async () => {
      const res = await savePreAgenda(meeting.id, buildPayload())
      if (res.success) {
        toast.success('บันทึกแบบร่างแล้ว')
        onDraftSaved?.(meeting.id)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <div className="space-y-1.5 max-w-3xl">

      {/* วาระ 1 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AgendaNumBadge n={1} /> วาระที่ 1 : เรื่องประธานแจ้งที่ประชุมทราบ
        </h3>
        <div>
          <label className={LABEL}>หัวข้อที่จะแจ้ง</label>
          <textarea
            className={TEXTAREA}
            rows={3}
            placeholder="ระบุเรื่องที่ประธานจะแจ้ง..."
            value={state.agenda1Note}
            onChange={e => set('agenda1Note', e.target.value)}
          />
        </div>
      </div>

      {/* วาระ 2 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AgendaNumBadge n={2} /> วาระที่ 2 : เรื่องรับรองรายงานการประชุม
        </h3>
        <div>
          <label className={LABEL}>รับรองรายงานการประชุมครั้งที่</label>
          {previousMeetings.length > 0 ? (
            <select
              className={SELECT}
              value={state.agenda2RefMeetingNo}
              onChange={e => set('agenda2RefMeetingNo', e.target.value)}
            >
              <option value="">— ไม่ระบุ —</option>
              {previousMeetings.map(m => (
                <option key={m.id} value={m.code}>
                  {m.code} · {m.title} ({formatThaiDate(m.scheduled_date, true)})
                </option>
              ))}
            </select>
          ) : (
            <input
              className={SELECT}
              placeholder="รหัส/ครั้งที่..."
              value={state.agenda2RefMeetingNo}
              onChange={e => set('agenda2RefMeetingNo', e.target.value)}
            />
          )}
        </div>
      </div>

      {/* วาระ 3 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AgendaNumBadge n={3} /> วาระที่ 3 : เรื่องเพื่อทราบ
        </h3>
        <div>
          <label className={LABEL}>รายการเพื่อทราบ</label>
          <ItemGroup agendaNo={3} label="เรื่องเพื่อทราบ" items={state.items3} onChange={items => set('items3', items)} />
        </div>
      </div>

      {/* วาระ 4 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
          <AgendaNumBadge n={4} />
          <span>วาระที่ 4 :</span>
          <select
            className={cn(SELECT, 'text-sm font-semibold')}
            value={state.agenda4Type}
            onChange={e => set('agenda4Type', e.target.value as FormState['agenda4Type'])}
          >
            <option value="เรื่องสืบเนื่อง">เรื่องสืบเนื่อง</option>
            <option value="เรื่องติดตามผลการดำเนินการ">เรื่องติดตามผลการดำเนินการ</option>
          </select>
        </h3>
        <OpenResolutionsPanel resolutions={openResolutions} />
        {state.agenda4Type === 'เรื่องติดตามผลการดำเนินการ' && (
          <>
            <PdcaRefPicker
              refMonth={state.pdcaRefMonth}
              refYear={state.pdcaRefYear}
              deadline={state.pdcaDeadline}
              onChangeMonth={v => set('pdcaRefMonth', v)}
              onChangeYear={v => set('pdcaRefYear', v)}
              onChangeDeadline={v => set('pdcaDeadline', v)}
            />
            <PdcaBranchPanel summaries={pdcaSummaries} obstacles={obstacleSummaries} />
          </>
        )}
        <div>
          <label className={LABEL}>รายการวาระที่ 4</label>
          <ItemGroup agendaNo={4} label={state.agenda4Type} items={state.items4} onChange={items => set('items4', items)} />
        </div>
      </div>

      {/* วาระ 5 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AgendaNumBadge n={5} /> วาระที่ 5 : {agenda5Label}
        </h3>
        {state.agenda4Type === 'เรื่องสืบเนื่อง' && (
          <>
            <PdcaRefPicker
              refMonth={state.pdcaRefMonth}
              refYear={state.pdcaRefYear}
              deadline={state.pdcaDeadline}
              onChangeMonth={v => set('pdcaRefMonth', v)}
              onChangeYear={v => set('pdcaRefYear', v)}
              onChangeDeadline={v => set('pdcaDeadline', v)}
            />
            <PdcaBranchPanel summaries={pdcaSummaries} obstacles={obstacleSummaries} />
          </>
        )}
        <div>
          <label className={LABEL}>รายการวาระที่ 5</label>
          <ItemGroup agendaNo={5} label={agenda5Label} items={state.items5} onChange={items => set('items5', items)} />
        </div>
      </div>

      {/* วาระ 6 */}
      {showAgenda6 && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AgendaNumBadge n={6} /> วาระที่ 6 : เรื่องอื่นๆ
          </h3>
          <ItemGroup agendaNo={6} label="เรื่องอื่นๆ" items={state.items6} onChange={items => set('items6', items)} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleDraftSave}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-white/20 text-white/60 hover:text-white hover:border-white/40 rounded-xl transition-colors disabled:opacity-40"
        >
          <Save size={14} />
          {isPending ? 'กำลังบันทึก...' : 'บันทึกแบบร่าง'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[#061327] font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
        >
          {isPending ? 'กำลังบันทึก...' : 'บันทึกและถัดไป'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
