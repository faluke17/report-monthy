'use client'

import { useState, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Table2, X, Pencil, CheckCircle, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Meeting, MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'
import { saveAgenda } from '@/app/actions/meeting-agenda'

// ─── style constants ──────────────────────────────────────────────────────────

const INPUT =
  'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60'
const TEXTAREA =
  'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-500/60 resize-none'
const SELECT =
  'bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60'
const LABEL = 'block text-xs text-white/45 mb-1.5 font-medium uppercase tracking-wider'

// ─── types ────────────────────────────────────────────────────────────────────

type Resolution = 'รับทราบ' | 'อื่นๆ'
type ViewMode = 'view' | 'edit'

interface DetailTable {
  headers: string[]
  colWidths: number[]
  rows: string[][]
}

interface SubItem {
  id?: string
  title: string
  detail: string
  showTable: boolean
  detailTable: DetailTable
  resolution: Resolution
  resolutionDetail: string
}

interface FormState {
  startTime: '09:00' | '13:00'
  agenda1Detail: string
  agenda1Resolution: Resolution
  agenda1ResolutionDetail: string
  agenda2MeetingNo: string
  agenda2Resolution: Resolution
  agenda2ResolutionDetail: string
  agenda4Type: 'เรื่องสืบเนื่อง' | 'เรื่องติดตามผลการดำเนินการ'
  items3: SubItem[]
  items4: SubItem[]
  items5: SubItem[]
  items6: SubItem[]
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_COL_W = 160

function emptyTable(): DetailTable {
  return {
    headers: ['หัวข้อ', 'รายละเอียด', 'หมายเหตุ'],
    colWidths: [160, 220, 140],
    rows: [['', '', '']],
  }
}

function emptySubItem(): SubItem {
  return { title: '', detail: '', showTable: false, detailTable: emptyTable(), resolution: 'รับทราบ', resolutionDetail: '' }
}

function initState(header: MeetingAgendaHeader | null, subitems: MeetingAgendaSubItem[]): FormState {
  function itemsFor(agendaNo: number): SubItem[] {
    const matching = subitems.filter(s => s.agenda_no === agendaNo).sort((a, b) => a.sort_order - b.sort_order)
    if (matching.length === 0) return [emptySubItem()]
    return matching.map(s => {
      const dt = s.detail_table
      return {
        id: s.id,
        title: s.title,
        detail: s.detail ?? '',
        showTable: dt !== null,
        detailTable: dt
          ? { headers: dt.headers, colWidths: dt.colWidths ?? dt.headers.map(() => DEFAULT_COL_W), rows: dt.rows }
          : emptyTable(),
        resolution: (s.resolution as Resolution) ?? 'รับทราบ',
        resolutionDetail: s.resolution_detail ?? '',
      }
    })
  }
  return {
    startTime: (header?.start_time as '09:00' | '13:00') ?? '09:00',
    agenda1Detail: header?.agenda1_detail ?? '',
    agenda1Resolution: (header?.agenda1_resolution as Resolution) ?? 'รับทราบ',
    agenda1ResolutionDetail: header?.agenda1_resolution_detail ?? '',
    agenda2MeetingNo: header?.agenda2_meeting_no ?? '',
    agenda2Resolution: (header?.agenda2_resolution as Resolution) ?? 'รับทราบ',
    agenda2ResolutionDetail: header?.agenda2_resolution_detail ?? '',
    agenda4Type: (header?.agenda4_type as FormState['agenda4Type']) ?? 'เรื่องสืบเนื่อง',
    items3: itemsFor(3),
    items4: itemsFor(4),
    items5: itemsFor(5),
    items6: itemsFor(6),
  }
}

// ─── shared edit-mode sub-components ─────────────────────────────────────────

function ResolutionBlock({
  value, detail, onChange,
}: { value: Resolution; detail: string; onChange: (v: Resolution, d: string) => void }) {
  return (
    <div className="space-y-2">
      <label className={LABEL}>มติที่ประชุม</label>
      <select className={SELECT} value={value} onChange={e => onChange(e.target.value as Resolution, detail)}>
        <option value="รับทราบ">รับทราบ</option>
        <option value="อื่นๆ">อื่นๆ</option>
      </select>
      {value === 'อื่นๆ' && (
        <textarea className={TEXTAREA} rows={2} placeholder="ระบุมติที่ประชุม..." value={detail}
          onChange={e => onChange(value, e.target.value)} />
      )}
    </div>
  )
}

function TableEditor({ table, onChange }: { table: DetailTable; onChange: (t: DetailTable) => void }) {
  const resizeRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null)
  // Always reflects latest table to avoid stale closure in drag handler
  const tableRef = useRef(table)
  tableRef.current = table

  function startResize(e: React.MouseEvent, col: number) {
    e.preventDefault()
    document.body.style.userSelect = 'none'
    resizeRef.current = { col, startX: e.clientX, startWidth: tableRef.current.colWidths[col] }
    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return
      const w = Math.max(60, resizeRef.current.startWidth + ev.clientX - resizeRef.current.startX)
      const colWidths = [...tableRef.current.colWidths]
      colWidths[resizeRef.current.col] = w
      onChange({ ...tableRef.current, colWidths })
    }
    function onUp() {
      resizeRef.current = null
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function setHeader(col: number, val: string) {
    const headers = [...table.headers]; headers[col] = val; onChange({ ...table, headers })
  }
  function addColumn() {
    onChange({
      headers: [...table.headers, `คอลัมน์ ${table.headers.length + 1}`],
      colWidths: [...table.colWidths, DEFAULT_COL_W],
      rows: table.rows.map(r => [...r, '']),
    })
  }
  function removeColumn(col: number) {
    if (table.headers.length <= 1) return
    onChange({
      headers: table.headers.filter((_, i) => i !== col),
      colWidths: table.colWidths.filter((_, i) => i !== col),
      rows: table.rows.map(r => r.filter((_, i) => i !== col)),
    })
  }
  function setCell(row: number, col: number, val: string) {
    const rows = table.rows.map(r => [...r]); rows[row][col] = val; onChange({ ...table, rows })
  }
  function addRow() {
    onChange({ ...table, rows: [...table.rows, table.headers.map(() => '')] })
  }
  function removeRow(row: number) {
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== row) })
  }

  const totalW = table.colWidths.reduce((s, w) => s + w, 0) + 36

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-white/12">
        <table
          className="text-sm border-collapse"
          style={{ tableLayout: 'fixed', width: totalW + 'px' }}
        >
          <colgroup>
            {table.colWidths.map((w, i) => <col key={i} style={{ width: w + 'px' }} />)}
            <col style={{ width: '36px' }} />
          </colgroup>
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {table.headers.map((h, ci) => (
                <th
                  key={ci}
                  className="relative border-r border-white/10 last:border-r-0 overflow-hidden"
                >
                  <div className="flex items-center pl-2 pr-4 py-1.5 gap-1">
                    <input
                      className="flex-1 min-w-0 bg-transparent text-xs text-white/70 font-semibold focus:outline-none focus:text-white"
                      value={h}
                      onChange={e => setHeader(ci, e.target.value)}
                      placeholder="หัวข้อ"
                    />
                    <button type="button" onClick={() => removeColumn(ci)}
                      className="shrink-0 text-white/20 hover:text-red-400 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                  {/* Resize handle — straddles right border */}
                  <div
                    onMouseDown={e => startResize(e, ci)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-cyan-500/50 transition-colors"
                  />
                </th>
              ))}
              <th className="border-l border-white/10 text-center">
                <button type="button" onClick={addColumn}
                  className="text-cyan-400/60 hover:text-cyan-400 transition-colors p-1" title="เพิ่มคอลัมน์">
                  <Plus size={12} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-white/6 last:border-0 group/row">
                {row.map((cell, ci) => (
                  <td key={ci}
                    className="border-r border-white/6 last:border-r-0 px-2 py-1 overflow-hidden">
                    <input
                      className="w-full bg-transparent text-xs text-white/80 focus:outline-none focus:text-white"
                      value={cell}
                      onChange={e => setCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border-l border-white/6 text-center">
                  <button type="button" onClick={() => removeRow(ri)}
                    className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover/row:opacity-100 p-1">
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={addRow}
        className="text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors flex items-center gap-1">
        <Plus size={11} /> เพิ่มแถว
      </button>
    </div>
  )
}

function DetailEditor({
  text, table, showTable, onChangeText, onToggleTable, onChangeTable,
}: {
  text: string; table: DetailTable; showTable: boolean
  onChangeText: (v: string) => void; onToggleTable: (s: boolean) => void; onChangeTable: (t: DetailTable) => void
}) {
  return (
    <div className="space-y-2">
      <textarea className={TEXTAREA} rows={3} placeholder="รายละเอียด..." value={text}
        onChange={e => onChangeText(e.target.value)} />
      <button type="button"
        onClick={() => onToggleTable(!showTable)}
        className={cn(
          'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors',
          showTable
            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            : 'text-white/35 border-white/12 hover:text-white/60 hover:border-white/20',
        )}>
        <Table2 size={11} />
        {showTable ? 'ซ่อนตาราง' : 'เพิ่มตาราง'}
      </button>
      {showTable && <TableEditor table={table} onChange={onChangeTable} />}
    </div>
  )
}

function SubItemGroup({
  agendaNo, label, items, onChange,
}: { agendaNo: number; label: string; items: SubItem[]; onChange: (items: SubItem[]) => void }) {
  function update(idx: number, patch: Partial<SubItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function add() { onChange([...items, emptySubItem()]) }
  function remove(idx: number) {
    onChange(items.length <= 1 ? [emptySubItem()] : items.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-white/3 rounded-xl p-4 border border-white/8 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyan-400/70 shrink-0">{agendaNo}.{idx + 1}</span>
            <input className={cn(INPUT, 'flex-1')} placeholder={`${label} ${agendaNo}.${idx + 1}...`}
              value={item.title} onChange={e => update(idx, { title: e.target.value })} />
            {items.length > 1 && (
              <button type="button" onClick={() => remove(idx)}
                className="text-white/25 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div>
            <label className={LABEL}>รายละเอียด</label>
            <DetailEditor
              text={item.detail} table={item.detailTable} showTable={item.showTable}
              onChangeText={v => update(idx, { detail: v })}
              onToggleTable={s => update(idx, { showTable: s })}
              onChangeTable={t => update(idx, { detailTable: t })}
            />
          </div>
          <ResolutionBlock value={item.resolution} detail={item.resolutionDetail}
            onChange={(v, d) => update(idx, { resolution: v, resolutionDetail: d })} />
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex items-center gap-1.5 text-xs text-cyan-400/60 hover:text-cyan-400 border border-dashed border-white/12 hover:border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors">
        <Plus size={12} /> เพิ่ม {agendaNo}.{items.length + 1}
      </button>
    </div>
  )
}

// ─── view-mode sub-components ─────────────────────────────────────────────────

function ResolutionBadge({ value, detail }: { value: Resolution; detail: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-white/35 font-medium">มติที่ประชุม :</span>
      {value === 'รับทราบ' ? (
        <span className="inline-flex items-center gap-1 text-xs bg-teal-500/15 text-teal-400 border border-teal-500/25 px-2.5 py-0.5 rounded-full">
          <CheckCircle size={10} /> รับทราบ
        </span>
      ) : (
        <span className="text-xs text-white/65">{detail || 'อื่นๆ'}</span>
      )}
    </div>
  )
}

function TableView({ table }: { table: DetailTable }) {
  // strip fully-empty trailing rows
  const rows = [...table.rows]
  while (rows.length > 0 && rows[rows.length - 1].every(c => !c.trim())) rows.pop()

  return (
    <div className="overflow-x-auto overflow-hidden rounded-xl border border-white/10 mt-1">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-white/12" style={{ background: 'rgba(6,147,227,0.09)' }}>
            {table.headers.map((h, i) => (
              <th key={i}
                style={{ minWidth: Math.max(table.colWidths[i] ?? 100, 60) + 'px' }}
                className="px-3 py-2.5 text-left text-xs font-bold text-cyan-300/90 border-r border-white/8 last:border-r-0 leading-snug">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={table.headers.length}
                className="px-3 py-4 text-xs text-white/25 italic text-center">
                ไม่มีข้อมูล
              </td>
            </tr>
          ) : rows.map((row, ri) => (
            <tr key={ri}
              className={cn(
                'border-b border-white/6 last:border-0',
                ri % 2 === 1 ? 'bg-white/[0.02]' : '',
              )}>
              {row.map((cell, ci) => (
                <td key={ci}
                  className="px-3 py-2.5 text-xs text-white/80 border-r border-white/6 last:border-r-0 align-middle whitespace-pre-wrap break-words leading-relaxed">
                  {cell || <span className="text-white/20">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AgendaNumBadge({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/35 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
  )
}

function SubItemsView({ agendaNo, items }: { agendaNo: number; items: SubItem[] }) {
  const filled = items.filter(it => it.title.trim() || it.detail.trim())
  if (filled.length === 0) return <p className="text-sm text-white/25 italic px-1">ไม่มีรายการ</p>
  return (
    <div className="divide-y divide-white/6">
      {filled.map((item, idx) => (
        <div key={idx} className="py-4 first:pt-0 space-y-2">
          <p className="text-sm font-semibold text-white">
            <span className="text-cyan-400/70 mr-2 font-bold">{agendaNo}.{idx + 1}</span>
            {item.title}
          </p>
          {item.detail && (
            <p className="text-sm text-white/70 pl-5 whitespace-pre-wrap leading-relaxed">{item.detail}</p>
          )}
          {item.showTable && item.detailTable.rows.length > 0 && (
            <div className="pl-5">
              <TableView table={item.detailTable} />
            </div>
          )}
          <div className="pl-5">
            <ResolutionBadge value={item.resolution} detail={item.resolutionDetail} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── accordion card ───────────────────────────────────────────────────────────

function AccordionCard({
  n, title, expanded, onToggle, isAdmin, onEdit, children,
}: {
  n: number; title: React.ReactNode; expanded: boolean
  onToggle: () => void; isAdmin: boolean; onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Compact header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/3 transition-colors"
      >
        <AgendaNumBadge n={n} />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">วาระที่ {n}</span>
          <div className="text-sm font-semibold text-white leading-snug truncate">{title}</div>
        </div>
        <ChevronDown
          size={14}
          className={cn('text-white/35 transition-transform duration-200 shrink-0', expanded && 'rotate-180')}
        />
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-white/8">
          <div className="px-5 py-4">{children}</div>
          {isAdmin && (
            <div className="px-5 pb-4 flex justify-end border-t border-white/6 pt-3">
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center gap-1.5 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Pencil size={11} /> แก้ไขวาระทั้งหมด
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── view mode layout ─────────────────────────────────────────────────────────

function AgendaViewMode({ state, meeting, isAdmin, onEdit }: {
  state: FormState; meeting: Meeting; isAdmin: boolean; onEdit: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const agenda5Label = state.agenda4Type === 'เรื่องสืบเนื่อง' ? 'เรื่องติดตามผลการดำเนินการ' : 'เรื่องอื่นๆ'
  const showAgenda6 = state.agenda4Type === 'เรื่องสืบเนื่อง'
  const totalAgendas = showAgenda6 ? 6 : 5

  return (
    <div className="max-w-3xl">
      <div className="glass-card overflow-hidden">

        {/* ── Compact header — always visible, click to toggle ── */}
        <button
          type="button"
          onClick={() => setExpanded(p => !p)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
        >
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs text-white/35 font-medium">
              วาระการประชุม · เริ่มเวลา {state.startTime} น. · {totalAgendas} วาระ
            </p>
            <p className="text-sm font-bold text-white truncate">{meeting.title}</p>
            {!expanded && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'ประธานแจ้งที่ประชุมทราบ',
                  `รับรองรายงาน ครั้งที่ ${state.agenda2MeetingNo || '—'}`,
                  'เพื่อทราบ',
                  state.agenda4Type,
                  agenda5Label,
                  ...(showAgenda6 ? ['อื่นๆ'] : []),
                ].map((label, i) => (
                  <span key={i}
                    className="text-[10px] bg-white/5 border border-white/10 text-white/45 px-2 py-0.5 rounded-full">
                    {i + 1}. {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ChevronDown
            size={15}
            className={cn('text-white/35 transition-transform duration-200 shrink-0', expanded && 'rotate-180')}
          />
        </button>

        {/* ── Expanded: all agendas ── */}
        {expanded && (
          <div className="border-t border-white/8 divide-y divide-white/6">

            {/* วาระ 1 */}
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <AgendaNumBadge n={1} />
                <span className="text-xs font-semibold text-white/70">เรื่องประธานแจ้งที่ประชุมทราบ</span>
              </div>
              <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed pl-8">
                {state.agenda1Detail || <span className="text-white/25 italic">—</span>}
              </p>
              <div className="pl-8">
                <ResolutionBadge value={state.agenda1Resolution} detail={state.agenda1ResolutionDetail} />
              </div>
            </div>

            {/* วาระ 2 */}
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <AgendaNumBadge n={2} />
                <span className="text-xs font-semibold text-white/70">
                  เรื่องรับรองรายงานการประชุมครั้งที่{' '}
                  <span className="text-cyan-400">{state.agenda2MeetingNo || '—'}</span>
                </span>
              </div>
              <div className="pl-8">
                <ResolutionBadge value={state.agenda2Resolution} detail={state.agenda2ResolutionDetail} />
              </div>
            </div>

            {/* วาระ 3 */}
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <AgendaNumBadge n={3} />
                <span className="text-xs font-semibold text-white/70">เรื่องเพื่อทราบ</span>
              </div>
              <div className="pl-8">
                <SubItemsView agendaNo={3} items={state.items3} />
              </div>
            </div>

            {/* วาระ 4 */}
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <AgendaNumBadge n={4} />
                <span className="text-xs font-semibold text-white/70">{state.agenda4Type}</span>
              </div>
              <div className="pl-8">
                <SubItemsView agendaNo={4} items={state.items4} />
              </div>
            </div>

            {/* วาระ 5 */}
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <AgendaNumBadge n={5} />
                <span className="text-xs font-semibold text-white/70">{agenda5Label}</span>
              </div>
              <div className="pl-8">
                <SubItemsView agendaNo={5} items={state.items5} />
              </div>
            </div>

            {/* วาระ 6 (conditional) */}
            {showAgenda6 && (
              <div className="px-5 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AgendaNumBadge n={6} />
                  <span className="text-xs font-semibold text-white/70">เรื่องอื่นๆ</span>
                </div>
                <div className="pl-8">
                  <SubItemsView agendaNo={6} items={state.items6} />
                </div>
              </div>
            )}

            {/* Footer */}
            {isAdmin && (
              <div className="px-5 py-3 flex justify-end bg-white/2">
                <button type="button" onClick={onEdit}
                  className="flex items-center gap-1.5 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 px-3 py-1.5 rounded-lg transition-colors">
                  <Pencil size={11} /> แก้ไขวาระ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── edit mode layout ─────────────────────────────────────────────────────────

function AgendaEditMode({ state, setState, meeting, isAdmin, isPending, onSave, onCancel }: {
  state: FormState
  setState: React.Dispatch<React.SetStateAction<FormState>>
  meeting: Meeting
  isAdmin: boolean
  isPending: boolean
  onSave: () => void
  onCancel: () => void
}) {
  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState(prev => ({ ...prev, [key]: val }))
  }

  const agenda5Label = state.agenda4Type === 'เรื่องสืบเนื่อง' ? 'เรื่องติดตามผลการดำเนินการ' : 'เรื่องอื่นๆ'
  const showAgenda6 = state.agenda4Type === 'เรื่องสืบเนื่อง'

  return (
    <div className="space-y-1.5 max-w-3xl">
      {/* Start time */}
      <div className="glass-card p-5">
        <label className={LABEL}>เริ่มประชุมเวลา</label>
        <select className={SELECT} value={state.startTime}
          onChange={e => set('startTime', e.target.value as '09:00' | '13:00')}>
          <option value="09:00">09.00 น.</option>
          <option value="13:00">13.00 น.</option>
        </select>
      </div>

      {/* Agenda 1 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AgendaNumBadge n={1} /> วาระที่ 1 : เรื่องประธานแจ้งที่ประชุมทราบ
        </h3>
        <div>
          <label className={LABEL}>รายละเอียด</label>
          <textarea className={TEXTAREA} rows={3} placeholder="รายละเอียดที่ประธานแจ้ง..." value={state.agenda1Detail}
            onChange={e => set('agenda1Detail', e.target.value)} />
        </div>
        <ResolutionBlock value={state.agenda1Resolution} detail={state.agenda1ResolutionDetail}
          onChange={(v, d) => { set('agenda1Resolution', v); set('agenda1ResolutionDetail', d) }} />
      </div>

      {/* Agenda 2 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
          <AgendaNumBadge n={2} />
          <span>วาระที่ 2 : เรื่องรับรองรายงานการประชุมครั้งที่</span>
          <input
            className="w-28 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-sm text-white font-mono text-center focus:outline-none focus:border-cyan-500/60"
            placeholder="ครั้งที่..." value={state.agenda2MeetingNo}
            onChange={e => set('agenda2MeetingNo', e.target.value)} />
        </h3>
        <ResolutionBlock value={state.agenda2Resolution} detail={state.agenda2ResolutionDetail}
          onChange={(v, d) => { set('agenda2Resolution', v); set('agenda2ResolutionDetail', d) }} />
      </div>

      {/* Agenda 3 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AgendaNumBadge n={3} /> วาระที่ 3 : เรื่องเพื่อทราบ
        </h3>
        <SubItemGroup agendaNo={3} label="เรื่องเพื่อทราบ" items={state.items3}
          onChange={items => set('items3', items)} />
      </div>

      {/* Agenda 4 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
          <AgendaNumBadge n={4} />
          <span>วาระที่ 4 :</span>
          <select className={cn(SELECT, 'text-sm font-semibold')} value={state.agenda4Type}
            onChange={e => set('agenda4Type', e.target.value as FormState['agenda4Type'])}>
            <option value="เรื่องสืบเนื่อง">เรื่องสืบเนื่อง</option>
            <option value="เรื่องติดตามผลการดำเนินการ">เรื่องติดตามผลการดำเนินการ</option>
          </select>
        </h3>
        <SubItemGroup agendaNo={4} label={state.agenda4Type} items={state.items4}
          onChange={items => set('items4', items)} />
      </div>

      {/* Agenda 5 */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AgendaNumBadge n={5} /> วาระที่ 5 : {agenda5Label}
        </h3>
        <SubItemGroup agendaNo={5} label={agenda5Label} items={state.items5}
          onChange={items => set('items5', items)} />
      </div>

      {/* Agenda 6 (conditional) */}
      {showAgenda6 && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AgendaNumBadge n={6} /> วาระที่ 6 : เรื่องอื่นๆ
          </h3>
          <SubItemGroup agendaNo={6} label="เรื่องอื่นๆ" items={state.items6}
            onChange={items => set('items6', items)} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="text-sm text-white/40 hover:text-white/70 px-4 py-2 rounded-xl border border-white/10 transition-colors">
          ยกเลิก
        </button>
        <button type="button" disabled={isPending} onClick={onSave}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[#061327] font-semibold px-5 py-2 rounded-xl text-sm transition-colors">
          {isPending ? 'กำลังบันทึก...' : 'บันทึกวาระการประชุม'}
        </button>
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  meeting: Meeting
  initialHeader: MeetingAgendaHeader | null
  initialSubitems: MeetingAgendaSubItem[]
  isAdmin: boolean
  onSaved?: (meetingId: string) => void
}

export function MeetingAgendaForm({ meeting, initialHeader, initialSubitems, isAdmin, onSaved }: Props) {
  const [state, setState] = useState<FormState>(() => initState(initialHeader, initialSubitems))
  const [mode, setMode] = useState<ViewMode>(() => (initialHeader ? 'view' : 'edit'))
  const [isPending, startTransition] = useTransition()

  function buildSubItems(items: SubItem[], agendaNo: number): Omit<MeetingAgendaSubItem, 'id'>[] {
    return items
      .filter(it => it.title.trim() || it.detail.trim())
      .map((it, idx) => ({
        meeting_id: meeting.id,
        agenda_no: agendaNo,
        item_no: idx + 1,
        title: it.title,
        detail: it.detail || null,
        detail_table: it.showTable ? it.detailTable : null,
        resolution: it.resolution,
        resolution_detail: it.resolution === 'อื่นๆ' ? it.resolutionDetail : null,
        sort_order: idx,
      }))
  }

  function handleSave() {
    startTransition(async () => {
      const header: Omit<MeetingAgendaHeader, 'id' | 'meeting_id' | 'created_at' | 'updated_at'> = {
        start_time: state.startTime,
        agenda1_detail: state.agenda1Detail || null,
        agenda1_resolution: state.agenda1Resolution,
        agenda1_resolution_detail: state.agenda1Resolution === 'อื่นๆ' ? state.agenda1ResolutionDetail : null,
        agenda2_meeting_no: state.agenda2MeetingNo || null,
        agenda2_resolution: state.agenda2Resolution,
        agenda2_resolution_detail: state.agenda2Resolution === 'อื่นๆ' ? state.agenda2ResolutionDetail : null,
        agenda4_type: state.agenda4Type,
      }
      const subitems = [
        ...buildSubItems(state.items3, 3),
        ...buildSubItems(state.items4, 4),
        ...buildSubItems(state.items5, 5),
        ...buildSubItems(state.items6, 6),
      ]
      const res = await saveAgenda(meeting.id, header, subitems)
      if (res.success) {
        toast.success('บันทึกวาระการประชุมเรียบร้อย')
        if (onSaved) {
          onSaved(meeting.id)
        } else {
          setMode('view')
        }
      } else {
        toast.error(res.error)
      }
    })
  }

  if (!isAdmin && !initialHeader) {
    return (
      <div className="glass-card p-12 text-center text-white/30 text-sm">
        ยังไม่มีข้อมูลวาระการประชุม
      </div>
    )
  }

  if (mode === 'view') {
    return (
      <AgendaViewMode
        state={state}
        meeting={meeting}
        isAdmin={isAdmin}
        onEdit={() => setMode('edit')}
      />
    )
  }

  return (
    <AgendaEditMode
      state={state}
      setState={setState}
      meeting={meeting}
      isAdmin={isAdmin}
      isPending={isPending}
      onSave={handleSave}
      onCancel={() => setMode('view')}
    />
  )
}
