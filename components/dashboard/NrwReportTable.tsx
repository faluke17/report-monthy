'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, X, Save, Trash2, ClipboardPaste, CheckCircle2, AlertCircle, Target } from 'lucide-react'
import { upsertNrwBranchMonthly, deleteNrwBranchMonthly, bulkUpsertNrwBranchMonthly } from '@/app/actions/nrw-report'
import { NrwTargetModal } from './NrwTargetModal'
import { formatThaiNumber, getThaiMonthName } from '@/lib/utils/date-th'
import type { NrwBranchMonthly } from '@/lib/types'

export const BRANCH_ORDER = [
  'นครสวรรค์', 'ท่าตะโก', 'ลาดยาว', 'พยุหะคีรี',
  'ชัยนาท', 'อุทัยธานี', 'กำแพงเพชร', 'ขาณุวรลักษบุรี',
  'ตาก', 'แม่สอด', 'สุโขทัย', 'ทุ่งเสลี่ยม',
  'ศรีสำโรง', 'สวรรคโลก', 'ศรีสัชนาลัย', 'อุตรดิตถ์',
  'พิษณุโลก', 'นครไทย', 'พิจิตร', 'บางมูลนาก',
  'ตะพานหิน', 'เพชรบูรณ์', 'หล่มสัก', 'ชนแดน',
  'หนองไผ่', 'วิเชียรบุรี',
]

function calcWaterLoss(r: Partial<NrwBranchMonthly>): number | null {
  const p = r.water_produced ?? null
  const s = r.water_sold ?? null
  const f = r.water_free ?? null
  const b = r.blow_off ?? null
  if (p === null) return null
  return Math.max(0, p - (s ?? 0) - (f ?? 0) - (b ?? 0))
}

function calcNrwRate(waterLoss: number | null, waterProduced: number | null): number | null {
  if (waterLoss === null || !waterProduced) return null
  return (waterLoss / waterProduced) * 100
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '—'
  return formatThaiNumber(v, decimals)
}

function nrwColor(rate: number | null, target: number | null): string {
  if (rate === null) return 'text-black/50'
  if (target !== null && rate <= target) return 'text-green-400'
  if (target !== null && rate > target * 1.2) return 'text-red-400'
  return 'text-amber-400'
}

const INPUT = 'w-full bg-black/5 border border-black/10 rounded-lg px-3 py-2 text-sm text-[#12181F] placeholder-white/20 focus:outline-none focus:border-cyan-500/50'
const LABEL = 'block text-xs font-medium text-black/40 uppercase tracking-wide mb-1'
const CALC_BOX = 'w-full bg-black/3 border border-dashed border-black/10 rounded-lg px-3 py-2 text-sm font-mono text-black/70'

// ─── เช็คความผิดปกติ — เทียบอัตราสูญเสียเดือนที่กำลังกรอก กับเดือนก่อนหน้า (ปีงบเดียวกัน ข้ามปีงบตอน ต.ค.) ───

const FISCAL_MONTH_ORDER = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const ANOMALY_RATE_DELTA = 10 // จุด — อัตราสูญเสียเปลี่ยนเกินนี้เทียบเดือนก่อนหน้า ถือว่าน่าสงสัย ต้องยืนยันก่อนบันทึก

interface HistoryEntry { water_loss: number | null; nrw_rate: number | null }
type HistoryMap = Record<string, HistoryEntry>

function historyKey(branchName: string, fiscalYear: number, month: number): string {
  return `${branchName}|${fiscalYear}|${month}`
}

function prevFiscalMonth(fiscalYear: number, month: number): { fiscalYear: number; month: number } {
  const idx = FISCAL_MONTH_ORDER.indexOf(month)
  if (idx <= 0) return { fiscalYear: fiscalYear - 1, month: FISCAL_MONTH_ORDER[FISCAL_MONTH_ORDER.length - 1] }
  return { fiscalYear, month: FISCAL_MONTH_ORDER[idx - 1] }
}

interface AnomalyCheck {
  anomalous: boolean
  prevRate: number | null
  prevMonth: number
  prevFiscalYear: number
}

function checkAnomaly(
  rate: number | null,
  branchName: string,
  fiscalYear: number,
  month: number,
  historyMap: HistoryMap,
): AnomalyCheck {
  const { fiscalYear: prevFY, month: prevM } = prevFiscalMonth(fiscalYear, month)
  const prevRate = historyMap[historyKey(branchName, prevFY, prevM)]?.nrw_rate ?? null
  const anomalous = rate != null && prevRate != null && Math.abs(rate - prevRate) > ANOMALY_RATE_DELTA
  return { anomalous, prevRate, prevMonth: prevM, prevFiscalYear: prevFY }
}

// ─── Excel paste parser ───────────────────────────────────────────────────────

interface ParsedRow {
  rawBranch: string
  branch_name: string
  month?: number
  water_produced: number | null
  water_sold: number | null
  water_free: number | null
  blow_off: number | null
  matched: boolean
}

function toNum(v: string): number | null {
  const n = parseFloat(v.replace(/,/g, '').replace(/\s/g, ''))
  return isNaN(n) ? null : n
}

function cleanCell(s: string): string {
  return s.replace(/^["']|["']$/g, '').trim()
}

function normBranch(s: string): string {
  return s
    .normalize('NFC')
    // remove all whitespace and zero-width chars
    .replace(/\s/g, '')
    // strip common prefixes
    .replace(/^(กปภ[.]?|สาขา|สนง[.]?|กบ[.]?)+/g, '')
    // strip leading numbers e.g. "01." "1 "
    .replace(/^\d+[.]?\s*/g, '')
    .trim()
}

function matchBranch(raw: string): string | undefined {
  const norm = normBranch(raw)
  if (norm.length < 2) return undefined
  // 1. exact after normalize
  const exact = BRANCH_ORDER.find((b) => normBranch(b) === norm)
  if (exact) return exact
  // 2. norm contains full branch name
  const contains = BRANCH_ORDER.find((b) => {
    const nb = normBranch(b)
    return nb.length >= 3 && norm.includes(nb)
  })
  if (contains) return contains
  // 3. branch name contains norm (user short-typed)
  const inside = BRANCH_ORDER.find((b) => {
    const nb = normBranch(b)
    return norm.length >= 3 && nb.includes(norm)
  })
  if (inside) return inside
  return undefined
}

function detectDelimiter(line: string): string {
  const tabs   = (line.match(/\t/g) ?? []).length
  const semis  = (line.match(/;/g) ?? []).length
  if (tabs >= semis) return '\t'
  return ';'
}

function detectColByKeywords(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) =>
    keywords.some((kw) => h.toLowerCase().includes(kw.toLowerCase()))
  )
}

function findBranchColumn(rows: string[][]): number {
  const maxCols = Math.max(...rows.map((r) => r.length), 0)
  let bestCol = 0
  let bestCount = 0
  for (let c = 0; c < maxCols; c++) {
    const count = rows.filter((row) => !!matchBranch(row[c] ?? '')).length
    if (count > bestCount) { bestCount = count; bestCol = c }
  }
  return bestCol
}

function parseExcelPaste(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return []

  const delim = detectDelimiter(lines[0])
  const allRows = lines.map((line) => line.split(delim).map(cleanCell))

  // Route to multi-month parser when first row has English month headers
  if (isMultiMonthHeader(allRows[0])) return parseMultiMonthPaste(allRows)

  // Check if first row is a header (none of its cells match branch names)
  const firstRowBranchHits = allRows[0].filter((c) => !!matchBranch(c)).length
  const firstRowHasKeyword = allRows[0].some((c) =>
    ['สาขา', 'branch', 'ผลิต', 'จำหน่าย', 'blow', 'ชื่อ'].some((k) =>
      c.toLowerCase().includes(k)
    )
  )
  const hasHeader = firstRowBranchHits === 0 || firstRowHasKeyword

  const headerRow = hasHeader ? allRows[0] : null
  const dataRows  = hasHeader ? allRows.slice(1) : allRows
  if (!dataRows.length) return []

  // Find branch column
  let bIdx = 0
  if (headerRow) {
    const fromHeader = detectColByKeywords(headerRow, ['สาขา', 'branch', 'ชื่อ'])
    bIdx = fromHeader >= 0 ? fromHeader : findBranchColumn(dataRows)
  } else {
    bIdx = findBranchColumn(dataRows)
  }

  // Find data columns from header, else positional after bIdx
  let pIdx = -1, sIdx = -1, fIdx = -1, boIdx = -1
  if (headerRow) {
    pIdx  = detectColByKeywords(headerRow, ['ผลิตจ่าย', 'ผลิต', 'produced'])
    sIdx  = detectColByKeywords(headerRow, ['จำหน่าย', 'ขาย', 'sold'])
    fIdx  = detectColByKeywords(headerRow, ['จ่ายฟรี', 'ฟรี', 'free'])
    boIdx = detectColByKeywords(headerRow, ['blow'])
  }

  // Positional fallback: columns in order, skipping bIdx
  const maxC = Math.max(...dataRows.map((r) => r.length), 0)
  const otherCols = Array.from({ length: maxC }, (_, i) => i).filter((i) => i !== bIdx)
  if (pIdx  < 0) pIdx  = otherCols[0] ?? -1
  if (sIdx  < 0) sIdx  = otherCols[1] ?? -1
  if (fIdx  < 0) fIdx  = otherCols[2] ?? -1
  if (boIdx < 0) boIdx = otherCols[3] ?? -1

  return dataRows
    .map((cols) => {
      const rawBranch = cols[bIdx] ?? ''
      const matched   = matchBranch(rawBranch)
      return {
        rawBranch,
        branch_name:    matched ?? rawBranch,
        water_produced: pIdx  >= 0 ? toNum(cols[pIdx]  ?? '') : null,
        water_sold:     sIdx  >= 0 ? toNum(cols[sIdx]  ?? '') : null,
        water_free:     fIdx  >= 0 ? toNum(cols[fIdx]  ?? '') : null,
        blow_off:       boIdx >= 0 ? toNum(cols[boIdx] ?? '') : null,
        matched:        !!matched,
      }
    })
    .filter((r) => r.rawBranch.length > 0)
}

// ─── Multi-month parser (e.g. format with Oct-2025, Nov-2025 column groups) ───

const EN_MONTH: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function parseMonthEn(cell: string): number | null {
  const m = cell.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/)
  return m ? EN_MONTH[m[1]] : null
}

function isMultiMonthHeader(cells: string[]): boolean {
  return cells.filter(c => parseMonthEn(c) !== null).length >= 3
}

function colTypeFromHeader(h: string): 'branch' | 'produced' | 'sold' | 'free' | 'blowoff' | null {
  const l = h.toLowerCase()
  if (['สาขา', 'branch', 'ชื่อ'].some(k => l.includes(k))) return 'branch'
  if (['ผลิตจ่าย', 'ผลิต', 'produced'].some(k => l.includes(k))) return 'produced'
  if (['จำหน่าย', 'ขาย', 'sold'].some(k => l.includes(k))) return 'sold'
  if (['จ่ายฟรี', 'ฟรี', 'free'].some(k => l.includes(k))) return 'free'
  if (l.includes('blow')) return 'blowoff'
  return null
}

function parseMultiMonthPaste(allRows: string[][]): ParsedRow[] {
  if (allRows.length < 3) return []

  const monthRow = allRows[0]
  const typeRow  = allRows[1]
  const dataRows = allRows.slice(2)

  // Map column → month (carry-forward for merged/empty cells)
  let lastM: number | null = null
  const colMonth: (number | null)[] = monthRow.map(c => {
    const m = parseMonthEn(c)
    if (m !== null) lastM = m
    return lastM
  })

  // Map column → data type
  const colType = typeRow.map(colTypeFromHeader)

  // Find branch column
  const bIdx = colType.findIndex(t => t === 'branch')

  // Build month groups: month → { p, s, f, bo } column indices
  const monthGroups: Record<number, { p: number; s: number; f: number; bo: number }> = {}
  colType.forEach((type, i) => {
    const m = colMonth[i]
    if (!m || !type || type === 'branch') return
    if (!monthGroups[m]) monthGroups[m] = { p: -1, s: -1, f: -1, bo: -1 }
    if (type === 'produced') monthGroups[m].p = i
    if (type === 'sold')     monthGroups[m].s = i
    if (type === 'free')     monthGroups[m].f = i
    if (type === 'blowoff')  monthGroups[m].bo = i
  })

  const months = Object.keys(monthGroups).map(Number)
  const result: ParsedRow[] = []

  for (const dataRow of dataRows) {
    const rawBranch = dataRow[bIdx >= 0 ? bIdx : 0] ?? ''
    if (!rawBranch.trim()) continue
    const matched = matchBranch(rawBranch)
    for (const m of months) {
      const g = monthGroups[m]
      result.push({
        rawBranch,
        branch_name:    matched ?? rawBranch,
        month:          m,
        water_produced: g.p >= 0 ? toNum(dataRow[g.p] ?? '') : null,
        water_sold:     g.s >= 0 ? toNum(dataRow[g.s] ?? '') : null,
        water_free:     g.f >= 0 ? toNum(dataRow[g.f] ?? '') : null,
        blow_off:       g.bo >= 0 ? toNum(dataRow[g.bo] ?? '') : null,
        matched:        !!matched,
      })
    }
  }

  return result.filter(r => r.rawBranch.length > 0)
}

// ─────────────────────────────────────────────────────────────────────────────

const MONTH_PATTERNS: [RegExp, number][] = [
  [/ตุลาคม|ต\.ค\.?/,         10],
  [/พฤศจิกายน|พ\.ย\.?/,      11],
  [/ธันวาคม|ธ\.ค\.?/,        12],
  [/มกราคม|ม\.ค\.?/,         1],
  [/กุมภาพันธ์|ก\.พ\.?/,     2],
  [/มีนาคม|มี\.ค\.?/,        3],
  [/เมษายน|เม\.ย\.?/,        4],
  [/พฤษภาคม|พ\.ค\.?/,       5],
  [/มิถุนายน|มิ\.ย\.?/,      6],
  [/กรกฎาคม|ก\.ค\.?/,       7],
  [/สิงหาคม|ส\.ค\.?/,        8],
  [/กันยายน|ก\.ย\.?/,        9],
]

function detectMonthFromText(text: string): number | null {
  for (const [pattern, m] of MONTH_PATTERNS) {
    if (pattern.test(text)) return m
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────

interface SheetState {
  branchName: string
  existing: NrwBranchMonthly | null
}

interface Props {
  rows: NrwBranchMonthly[]
  fiscalYear: number
  month: number
  targets: Record<string, number | null>
  districtTarget?: number | null
  canEdit: boolean
  historyMap: HistoryMap
}

export function NrwReportTable({ rows, fiscalYear, month, targets, districtTarget = null, canEdit, historyMap }: Props) {
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [pending, startTransition] = useTransition()
  const [sheetMonth, setSheetMonth] = useState(month)
  const [form, setForm] = useState({
    water_produced: '',
    water_sold: '',
    water_free: '',
    blow_off: '',
  })
  const [anomalyAck, setAnomalyAck] = useState(false)
  const [targetModalOpen, setTargetModalOpen] = useState(false)

  // Paste from Excel state
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteMonth, setPasteMonth] = useState(month)
  const [pasteAnomalyAck, setPasteAnomalyAck] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [manualMap, setManualMap] = useState<Record<string, string>>({})

  const dataMap = new Map(rows.map((r) => [r.branch_name, r]))

  function openSheet(branchName: string) {
    const existing = dataMap.get(branchName) ?? null
    setSheetMonth(month)
    setForm({
      water_produced: existing?.water_produced?.toString() ?? '',
      water_sold:     existing?.water_sold?.toString() ?? '',
      water_free:     existing?.water_free?.toString() ?? '',
      blow_off:       existing?.blow_off?.toString() ?? '',
    })
    setAnomalyAck(false)
    setSheet({ branchName, existing })
  }

  function closeSheet() { setSheet(null) }

  function handlePastePreview() {
    const result = parseExcelPaste(pasteText)
    if (!result.length) {
      toast.error('ไม่พบข้อมูล — ลองตรวจสอบว่า copy ครบทั้งตาราง หรือลองลบ header แถวแรกออก')
      return
    }
    const detected = detectMonthFromText(pasteText)
    if (detected) setPasteMonth(detected)
    setManualMap({})
    setPasteAnomalyAck(false)
    setParsedRows(result)
  }

  function handlePasteConfirm() {
    if (!parsedRows) return
    const isMulti = parsedRows.some(r => r.month !== undefined)

    if (isMulti) {
      // Apply manual map keyed by rawBranch
      const toSave = parsedRows
        .map((r) => {
          if (r.matched) return r
          const manual = manualMap[r.rawBranch]
          if (manual) return { ...r, branch_name: manual, matched: true }
          return null
        })
        .filter(Boolean) as ParsedRow[]

      if (!toSave.length) {
        toast.error('ไม่พบสาขาที่ตรงกัน — เลือกสาขาในช่อง "ระบุสาขา" ก่อนบันทึก')
        return
      }

      // Group by month
      const byMonth = new Map<number, ParsedRow[]>()
      for (const r of toSave) {
        const m = r.month!
        if (!byMonth.has(m)) byMonth.set(m, [])
        byMonth.get(m)!.push(r)
      }

      startTransition(async () => {
        let totalSaved = 0
        for (const [m, monthRows] of byMonth) {
          const res = await bulkUpsertNrwBranchMonthly(monthRows, fiscalYear, m)
          if (res.success) totalSaved += res.data?.count ?? monthRows.length
          else { toast.error(`เดือน ${getThaiMonthName(m)}: ${res.error}`); return }
        }
        toast.success(`บันทึก ${byMonth.size} เดือน รวม ${totalSaved} รายการเรียบร้อย`)
        resetPaste()
      })
    } else {
      // Single-month
      const toSave = parsedRows
        .map((r, i) => {
          if (r.matched) return r
          const manual = manualMap[String(i)]
          if (manual) return { ...r, branch_name: manual, matched: true }
          return null
        })
        .filter(Boolean) as ParsedRow[]

      if (!toSave.length) {
        toast.error('ไม่พบสาขาที่ตรงกัน — เลือกสาขาในช่อง "ระบุสาขา" ก่อนบันทึก')
        return
      }
      startTransition(async () => {
        const res = await bulkUpsertNrwBranchMonthly(toSave, fiscalYear, pasteMonth)
        if (res.success) {
          toast.success(`บันทึกข้อมูล ${res.data?.count ?? toSave.length} สาขาเรียบร้อย`)
          resetPaste()
        } else {
          toast.error(res.error)
        }
      })
    }
  }

  function resetPaste() {
    setPasteOpen(false)
    setPasteText('')
    setPasteMonth(month)
    setParsedRows(null)
    setManualMap({})
    setPasteAnomalyAck(false)
  }

  const previewLoss = calcWaterLoss({
    water_produced: parseFloat(form.water_produced) || null,
    water_sold:     parseFloat(form.water_sold) || null,
    water_free:     parseFloat(form.water_free) || null,
    blow_off:       parseFloat(form.blow_off) || null,
  })
  const previewTarget = sheet ? (targets[sheet.branchName] ?? null) : null
  const previewRate = calcNrwRate(previewLoss, parseFloat(form.water_produced) || null)
  const previewAnomaly = sheet
    ? checkAnomaly(previewRate, sheet.branchName, fiscalYear, sheetMonth, historyMap)
    : null
  const blockSubmit = !!previewAnomaly?.anomalous && !anomalyAck

  // นับความผิดปกติของทุกแถวที่ parse ได้ (ใช้ทั้ง preview grid/table และ gate ปุ่มยืนยัน)
  const pasteAnomalyCount = (parsedRows ?? []).filter((r, i) => {
    const key = r.month !== undefined ? r.rawBranch : String(i)
    const branchName = r.matched ? r.branch_name : (manualMap[key] ?? null)
    if (!branchName) return false
    const rate = calcNrwRate(calcWaterLoss(r), r.water_produced)
    const targetMonth = r.month ?? pasteMonth
    return checkAnomaly(rate, branchName, fiscalYear, targetMonth, historyMap).anomalous
  }).length
  const blockPasteConfirm = pasteAnomalyCount > 0 && !pasteAnomalyAck

  function handleSubmit() {
    if (!sheet) return
    const fd = new FormData()
    fd.set('branch_name', sheet.branchName)
    fd.set('fiscal_year', String(fiscalYear))
    fd.set('month', String(sheetMonth))
    fd.set('water_produced', form.water_produced)
    fd.set('water_sold', form.water_sold)
    fd.set('water_free', form.water_free)
    fd.set('blow_off', form.blow_off)

    startTransition(async () => {
      const res = await upsertNrwBranchMonthly(fd)
      if (res.success) {
        const monthLabel = sheetMonth !== month
          ? ` (เดือน${getThaiMonthName(sheetMonth)})`
          : ''
        toast.success(`บันทึกข้อมูล ${sheet.branchName}${monthLabel} เรียบร้อย`)
        closeSheet()
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleDelete() {
    if (!sheet?.existing) return
    startTransition(async () => {
      const res = await deleteNrwBranchMonthly(sheet.existing!.id)
      if (res.success) {
        toast.success(`ลบข้อมูล ${sheet.branchName} เรียบร้อย`)
        closeSheet()
      } else {
        toast.error(res.error)
      }
    })
  }

  // District totals
  const totalProduced = rows.reduce((s, r) => s + (r.water_produced ?? 0), 0)
  const totalSold     = rows.reduce((s, r) => s + (r.water_sold ?? 0), 0)
  const totalFree     = rows.reduce((s, r) => s + (r.water_free ?? 0), 0)
  const totalBlowOff  = rows.reduce((s, r) => s + (r.blow_off ?? 0), 0)
  const totalLoss     = Math.max(0, totalProduced - totalSold - totalFree - totalBlowOff)
  const totalRate     = totalProduced > 0 ? (totalLoss / totalProduced) * 100 : null

  return (
    <>
      {/* Toolbar — visible to editor only */}
      {canEdit && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setTargetModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
          >
            <Target size={14} />
            ตั้งเป้าหมายปีงบ {fiscalYear}
          </button>
          <button
            onClick={() => setPasteOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-black/5 text-black/60 border border-black/10 hover:bg-black/10 hover:text-[#12181F] transition-colors"
          >
            <ClipboardPaste size={14} />
            วางจาก Excel
          </button>
        </div>
      )}

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-black/40 border-b border-black/10">
              <th className="text-left px-4 py-3 font-medium w-8">#</th>
              <th className="text-left px-4 py-3 font-medium">สาขา</th>
              <th className="text-right px-4 py-3 font-medium">น้ำผลิตจ่าย<br/><span className="font-normal opacity-60">(ลบ.ม.)</span></th>
              <th className="text-right px-4 py-3 font-medium">น้ำจำหน่าย<br/><span className="font-normal opacity-60">(ลบ.ม.)</span></th>
              <th className="text-right px-4 py-3 font-medium">น้ำจ่ายฟรี<br/><span className="font-normal opacity-60">(ลบ.ม.)</span></th>
              <th className="text-right px-4 py-3 font-medium">Blow off<br/><span className="font-normal opacity-60">(ลบ.ม.)</span></th>
              <th className="text-right px-4 py-3 font-medium">น้ำสูญเสีย*<br/><span className="font-normal opacity-60">(ลบ.ม.)</span></th>
              <th className="text-right px-4 py-3 font-medium">อัตราสูญเสีย*<br/><span className="font-normal opacity-60">(%)</span></th>
              <th className="text-right px-4 py-3 font-medium">เป้าหมาย<br/><span className="font-normal opacity-60">(%)</span></th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {BRANCH_ORDER.map((name, idx) => {
              const r = dataMap.get(name)
              const loss   = r ? calcWaterLoss(r) : null
              const rate   = r ? calcNrwRate(loss, r.water_produced ?? null) : null
              const target = targets[name] ?? null
              const hasData = !!r

              return (
                <tr key={name} className="border-b border-black/5 hover:bg-black/3 transition-colors">
                  <td className="px-4 py-2.5 text-black/30 font-mono">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-[#12181F] font-medium">{name}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-black/70">{fmtNum(r?.water_produced)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-black/70">{fmtNum(r?.water_sold)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-black/70">{fmtNum(r?.water_free)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-black/70">{fmtNum(r?.blow_off)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-black/60">{fmtNum(loss)}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${nrwColor(rate, target)}`}>
                    {rate !== null ? `${fmtNum(rate, 2)}%` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-black/50">
                    {targets[name] != null ? `${fmtNum(targets[name], 2)}%` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canEdit && (
                      <button
                        onClick={() => openSheet(name)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          hasData
                            ? 'bg-black/5 text-black/50 hover:bg-black/10 hover:text-[#12181F]'
                            : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25'
                        }`}
                      >
                        {hasData ? <Pencil size={11} /> : <Plus size={11} />}
                        {hasData ? 'แก้ไข' : 'กรอก'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black/15 bg-black/3">
              <td className="px-4 py-3 text-black/40 font-medium text-xs" colSpan={2}>รวมเขต ({rows.length}/{BRANCH_ORDER.length} สาขา)</td>
              <td className="px-4 py-3 text-right font-mono text-black/80 font-semibold text-xs">{fmtNum(totalProduced)}</td>
              <td className="px-4 py-3 text-right font-mono text-black/80 text-xs">{fmtNum(totalSold)}</td>
              <td className="px-4 py-3 text-right font-mono text-black/80 text-xs">{fmtNum(totalFree)}</td>
              <td className="px-4 py-3 text-right font-mono text-black/80 text-xs">{fmtNum(totalBlowOff)}</td>
              <td className="px-4 py-3 text-right font-mono text-black/70 text-xs">{fmtNum(totalLoss)}</td>
              <td className={`px-4 py-3 text-right font-mono font-bold text-xs ${nrwColor(totalRate, districtTarget)}`}>
                {totalRate !== null ? `${fmtNum(totalRate, 2)}%` : '—'}
              </td>
              <td className="px-4 py-3 text-right font-mono text-cyan-300/70 text-xs font-semibold">
                {districtTarget !== null ? `${fmtNum(districtTarget, 2)}%` : '—'}
              </td>
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
        <p className="px-4 py-2 text-xs text-black/25">* คำนวณอัตโนมัติ: น้ำสูญเสีย = น้ำผลิตจ่าย − น้ำจำหน่าย − น้ำจ่ายฟรี − Blow off</p>
      </div>

      {/* Sheet Sidebar */}
      {sheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={closeSheet} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-[#FFFFFF] border-l border-black/10 z-50 flex flex-col shadow-2xl animate-fadein">
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <div>
                <h3 className="text-sm font-semibold text-[#12181F]">{sheet.branchName}</h3>
                <p className="text-xs text-black/40 mt-0.5">กรอกข้อมูล NRW รายเดือน</p>
              </div>
              <button onClick={closeSheet} className="text-black/40 hover:text-[#12181F]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className={LABEL}>เดือน</label>
                <select
                  value={sheetMonth}
                  onChange={(e) => { setSheetMonth(parseInt(e.target.value)); setAnomalyAck(false) }}
                  className={INPUT}
                >
                  {[10,11,12,1,2,3,4,5,6,7,8,9].map((m) => (
                    <option key={m} value={m}>{getThaiMonthName(m)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>น้ำผลิตจ่าย (ลบ.ม.)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.water_produced}
                  onChange={(e) => { setForm((f) => ({ ...f, water_produced: e.target.value })); setAnomalyAck(false) }}
                  className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>น้ำจำหน่าย (ลบ.ม.)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.water_sold}
                  onChange={(e) => { setForm((f) => ({ ...f, water_sold: e.target.value })); setAnomalyAck(false) }}
                  className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>น้ำจ่ายฟรี (ลบ.ม.)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.water_free}
                  onChange={(e) => { setForm((f) => ({ ...f, water_free: e.target.value })); setAnomalyAck(false) }}
                  className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Blow off (ลบ.ม.)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.blow_off}
                  onChange={(e) => { setForm((f) => ({ ...f, blow_off: e.target.value })); setAnomalyAck(false) }}
                  className={INPUT} />
              </div>
              <div className="pt-2 border-t border-black/10 space-y-2">
                <p className="text-xs text-black/40 font-medium uppercase tracking-wide">ผลคำนวณ (อัตโนมัติ)</p>
                <div>
                  <label className={LABEL}>น้ำสูญเสีย (ลบ.ม.)</label>
                  <div className={CALC_BOX}>{previewLoss !== null ? fmtNum(previewLoss) : '—'}</div>
                </div>
                <div>
                  <label className={LABEL}>อัตราน้ำสูญเสีย (%)</label>
                  <div className={`${CALC_BOX} ${previewRate !== null ? nrwColor(previewRate, previewTarget) : ''}`}>
                    {previewRate !== null ? `${fmtNum(previewRate, 2)}%` : '—'}
                  </div>
                </div>
                {previewTarget != null && (
                  <p className="text-xs text-black/30">
                    เป้าหมายปีงบ {fiscalYear}: <span className="text-black/50">{fmtNum(previewTarget)}%</span>
                  </p>
                )}
              </div>

              {previewAnomaly?.anomalous && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                  <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" />
                    ผิดปกติ — เทียบเดือน{getThaiMonthName(previewAnomaly.prevMonth)}
                  </p>
                  <p className="text-xs text-black/50">
                    เดือนก่อน {previewAnomaly.prevRate !== null ? `${fmtNum(previewAnomaly.prevRate, 2)}%` : '—'}
                    {' → '}เดือนนี้ {previewRate !== null ? `${fmtNum(previewRate, 2)}%` : '—'}
                    {' '}(Δ {previewRate !== null && previewAnomaly.prevRate !== null
                      ? fmtNum(Math.abs(previewRate - previewAnomaly.prevRate), 1)
                      : '—'} จุด) — ตรวจสอบตัวเลขให้แน่ใจก่อนบันทึก
                  </p>
                  <label className="flex items-center gap-2 text-xs text-black/60 cursor-pointer">
                    <input type="checkbox" checked={anomalyAck} onChange={(e) => setAnomalyAck(e.target.checked)} />
                    ยืนยันว่าตัวเลขถูกต้อง
                  </label>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-black/10 flex gap-2">
              {sheet.existing && (
                <button onClick={handleDelete} disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50">
                  <Trash2 size={13} />ลบ
                </button>
              )}
              <button onClick={closeSheet} disabled={pending}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-black/5 text-black/60 border border-black/10 hover:bg-black/10 disabled:opacity-50">
                ยกเลิก
              </button>
              <button onClick={handleSubmit} disabled={pending || blockSubmit}
                title={blockSubmit ? 'กรุณายืนยันความถูกต้องก่อนบันทึก' : undefined}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-50">
                <Save size={13} />
                {pending ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Annual Target Modal */}
      {targetModalOpen && (
        <NrwTargetModal
          fiscalYear={fiscalYear}
          initialTargets={targets}
          initialDistrictTarget={districtTarget}
          onClose={() => setTargetModalOpen(false)}
        />
      )}

      {/* Paste from Excel Modal */}
      {pasteOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={resetPaste} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#FFFFFF] border border-black/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fadein">
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
                <div>
                  <h3 className="text-sm font-semibold text-[#12181F] flex items-center gap-2">
                    <ClipboardPaste size={16} className="text-cyan-400" />
                    วางข้อมูลจาก Excel
                  </h3>
                  <p className="text-xs text-black/40 mt-0.5">
                    Copy ช่วง cell จาก Excel แล้ววางด้านล่าง — ไม่บังคับต้องมี header
                  </p>
                </div>
                <button onClick={resetPaste} className="text-black/40 hover:text-[#12181F]">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div className="bg-black/3 border border-black/10 rounded-xl p-3 text-xs text-black/50 space-y-1">
                  <p className="font-medium text-black/70">รูปแบบที่รองรับ (มี header หรือไม่มีก็ได้):</p>
                  <p>
                    <span className="text-cyan-400/80">สาขา</span>
                    {' | '}น้ำผลิตจ่าย | น้ำจำหน่าย | น้ำจ่ายฟรี | Blow off
                  </p>
                  <p className="text-black/30">ระบบ detect ชื่อสาขา คอลัมน์ และเดือนอัตโนมัติ แม้ลำดับต่างกัน</p>
                </div>

                {/* Month selector — hidden for multi-month format */}
                {!parsedRows?.some(r => r.month !== undefined) && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-black/40 shrink-0">บันทึกเดือน:</span>
                    <select
                      value={pasteMonth}
                      onChange={(e) => { setPasteMonth(parseInt(e.target.value)); setPasteAnomalyAck(false) }}
                      className="flex-1 bg-black/5 border border-black/10 rounded-lg px-3 py-2 text-xs text-[#12181F] focus:outline-none focus:border-cyan-500/50"
                    >
                      {[10,11,12,1,2,3,4,5,6,7,8,9].map((m) => (
                        <option key={m} value={m}>{getThaiMonthName(m)}</option>
                      ))}
                    </select>
                    {parsedRows && detectMonthFromText(pasteText) && (
                      <span className="text-xs text-cyan-400/70 shrink-0">detect อัตโนมัติ</span>
                    )}
                  </div>
                )}

                {!parsedRows && (
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={'วางข้อมูลจาก Excel ที่นี่...\n\nตัวอย่าง (มี header):\nสาขา\tน้ำผลิตจ่าย\tน้ำจำหน่าย\tน้ำจ่ายฟรี\tBlow off\nพิษณุโลก\t1234567\t980000\t5000\t2000\n\nหรือไม่มี header:\nพิษณุโลก\t1234567\t980000\t5000\t2000\n\nถ้ามีชื่อเดือน เช่น "ตุลาคม" ในข้อมูล ระบบจะ detect ให้อัตโนมัติ'}
                    rows={12}
                    className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-xs text-[#12181F] placeholder-white/20 font-mono focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                )}

                {parsedRows && (() => {
                  const isMulti = parsedRows.some(r => r.month !== undefined)

                  if (isMulti) {
                    // ── Multi-month grid preview ──────────────────────────────
                    const months = Array.from(new Set(parsedRows.map(r => r.month!)))
                      .sort((a, b) => (a >= 10 ? a - 10 : a + 14) - (b >= 10 ? b - 10 : b + 14))
                    const uniqueBranches = Array.from(
                      new Map(parsedRows.map(r => [r.rawBranch, r])).values()
                    )
                    const matchedCount = uniqueBranches.filter(r => r.matched || !!manualMap[r.rawBranch]).length
                    const unknownCount = uniqueBranches.filter(r => !r.matched && !manualMap[r.rawBranch]).length

                    const cellAnomaly = (row: ParsedRow, branchName: string) => {
                      const rate = calcNrwRate(calcWaterLoss(row), row.water_produced)
                      return checkAnomaly(rate, branchName, fiscalYear, row.month!, historyMap)
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-black/50">
                            ตรวจพบ <span className="text-cyan-400 font-medium">{months.length} เดือน</span>
                            {' × '}
                            <span className="text-green-400 font-medium">{matchedCount}</span>
                            {unknownCount > 0 && <span className="text-amber-400"> (รอระบุ {unknownCount})</span>}
                            <span className="text-black/30"> / {uniqueBranches.length} สาขา</span>
                          </span>
                          <button onClick={() => setParsedRows(null)} className="text-xs text-black/30 hover:text-[#12181F] underline">แก้ไข</button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-black/10 max-h-72 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[#FFFFFF]">
                              <tr className="text-black/40 border-b border-black/10">
                                <th className="text-left px-3 py-2 min-w-36">สาขา</th>
                                {months.map(m => (
                                  <th key={m} className="px-2 py-2 text-center whitespace-nowrap">{getThaiMonthName(m)}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {uniqueBranches.map((r) => {
                                const isOk = r.matched || !!manualMap[r.rawBranch]
                                return (
                                  <tr key={r.rawBranch} className="border-b border-black/5">
                                    <td className="px-3 py-1.5 min-w-36">
                                      {isOk ? (
                                        <span className="flex items-center gap-1 text-[#12181F]">
                                          <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                                          {manualMap[r.rawBranch] ?? r.branch_name}
                                        </span>
                                      ) : (
                                        <div className="space-y-1">
                                          <span className="flex items-center gap-1">
                                            <AlertCircle size={11} className="text-amber-400 shrink-0" />
                                            <span className="font-mono text-black/40 text-xs truncate max-w-28" title={r.rawBranch}>&ldquo;{r.rawBranch}&rdquo;</span>
                                          </span>
                                          <select
                                            value={manualMap[r.rawBranch] ?? ''}
                                            onChange={(e) => { setManualMap(prev => ({ ...prev, [r.rawBranch]: e.target.value })); setPasteAnomalyAck(false) }}
                                            className="w-full bg-black/5 border border-amber-500/30 rounded px-1.5 py-1 text-xs text-[#12181F] focus:outline-none focus:border-cyan-500/50"
                                          >
                                            <option value="">— ระบุสาขา —</option>
                                            {BRANCH_ORDER.map(b => <option key={b} value={b}>{b}</option>)}
                                          </select>
                                        </div>
                                      )}
                                    </td>
                                    {months.map(m => {
                                      if (!isOk) return <td key={m} className="px-2 py-1.5 text-center"><span className="text-black/20">—</span></td>
                                      const branchName = manualMap[r.rawBranch] ?? r.branch_name
                                      const cellRow = parsedRows.find(pr => pr.rawBranch === r.rawBranch && pr.month === m)
                                      const anomaly = cellRow ? cellAnomaly(cellRow, branchName) : null
                                      return (
                                        <td key={m} className="px-2 py-1.5 text-center">
                                          {anomaly?.anomalous ? (
                                            <span className="text-red-400" title={`เดือนก่อน ${anomaly.prevRate !== null ? fmtNum(anomaly.prevRate, 1) : '—'}%`}>⚠</span>
                                          ) : (
                                            <span className="text-green-400">✓</span>
                                          )}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {pasteAnomalyCount > 0 && (
                          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                            <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                              <AlertCircle size={13} className="shrink-0" />
                              พบ {pasteAnomalyCount} รายการ (สาขา×เดือน) ที่อัตราสูญเสียเปลี่ยนผิดปกติเทียบเดือนก่อนหน้า — ดูสัญลักษณ์ ⚠ ในตาราง
                            </p>
                            <label className="flex items-center gap-2 text-xs text-black/60 cursor-pointer">
                              <input type="checkbox" checked={pasteAnomalyAck} onChange={(e) => setPasteAnomalyAck(e.target.checked)} />
                              ยืนยันว่าตัวเลขถูกต้อง
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // ── Single-month flat preview ──────────────────────────────
                  const autoMatched  = parsedRows.filter(r => r.matched).length
                  const manualCount  = Object.keys(manualMap).length
                  const stillUnknown = parsedRows.filter(r => !r.matched).length - manualCount
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-black/50">
                          อัตโนมัติ <span className="text-green-400 font-medium">{autoMatched}</span>
                          {manualCount > 0 && <span className="text-cyan-400"> + เลือกเอง {manualCount}</span>}
                          {stillUnknown > 0 && <span className="text-amber-400"> / รอระบุ {stillUnknown}</span>}
                          <span className="text-black/30"> จาก {parsedRows.length} แถว</span>
                        </span>
                        <button onClick={() => setParsedRows(null)} className="text-xs text-black/30 hover:text-[#12181F] underline">แก้ไข</button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-black/10 max-h-72 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[#FFFFFF]">
                            <tr className="text-black/40 border-b border-black/10">
                              <th className="text-left px-3 py-2 min-w-40">สาขา</th>
                              <th className="text-right px-3 py-2">ผลิตจ่าย</th>
                              <th className="text-right px-3 py-2">จำหน่าย</th>
                              <th className="text-right px-3 py-2">จ่ายฟรี</th>
                              <th className="text-right px-3 py-2">Blow off</th>
                              <th className="text-right px-3 py-2">อัตราสูญเสีย</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedRows.map((r, i) => {
                              const key    = String(i)
                              const isManual = !!manualMap[key]
                              const isOk   = r.matched || isManual
                              const branchName = isManual ? manualMap[key] : r.branch_name
                              const rate = calcNrwRate(calcWaterLoss(r), r.water_produced)
                              const anomaly = isOk ? checkAnomaly(rate, branchName, fiscalYear, pasteMonth, historyMap) : null
                              return (
                                <tr key={i} className="border-b border-black/5">
                                  <td className="px-3 py-1.5 min-w-40">
                                    {isOk ? (
                                      <span className="flex items-center gap-1 text-[#12181F] font-medium">
                                        <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                                        {isManual ? manualMap[key] : r.branch_name}
                                      </span>
                                    ) : (
                                      <div className="space-y-1">
                                        <span className="flex items-center gap-1">
                                          <AlertCircle size={11} className="text-amber-400 shrink-0" />
                                          <span className="font-mono text-black/40 text-xs truncate max-w-32" title={r.rawBranch}>&ldquo;{r.rawBranch}&rdquo;</span>
                                        </span>
                                        <select
                                          value={manualMap[key] ?? ''}
                                          onChange={(e) => { setManualMap(prev => ({ ...prev, [key]: e.target.value })); setPasteAnomalyAck(false) }}
                                          className="w-full bg-black/5 border border-amber-500/30 rounded px-1.5 py-1 text-xs text-[#12181F] focus:outline-none focus:border-cyan-500/50"
                                        >
                                          <option value="">— ระบุสาขา —</option>
                                          {BRANCH_ORDER.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono text-black/70">{fmtNum(r.water_produced)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono text-black/70">{fmtNum(r.water_sold)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono text-black/70">{fmtNum(r.water_free)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono text-black/70">{fmtNum(r.blow_off)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">
                                    {anomaly?.anomalous ? (
                                      <span className="flex items-center justify-end gap-1 text-red-400" title={`เดือนก่อน ${anomaly.prevRate !== null ? fmtNum(anomaly.prevRate, 1) : '—'}% → ${rate !== null ? fmtNum(rate, 1) : '—'}%`}>
                                        <AlertCircle size={11} className="shrink-0" />
                                        {rate !== null ? `${fmtNum(rate, 1)}%` : '—'}
                                      </span>
                                    ) : (
                                      <span className="text-black/50">{rate !== null ? `${fmtNum(rate, 1)}%` : '—'}</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {pasteAnomalyCount > 0 && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                          <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                            <AlertCircle size={13} className="shrink-0" />
                            พบ {pasteAnomalyCount} สาขาที่อัตราสูญเสียเปลี่ยนผิดปกติเทียบเดือนก่อนหน้า
                          </p>
                          <label className="flex items-center gap-2 text-xs text-black/60 cursor-pointer">
                            <input type="checkbox" checked={pasteAnomalyAck} onChange={(e) => setPasteAnomalyAck(e.target.checked)} />
                            ยืนยันว่าตัวเลขถูกต้อง
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="px-5 py-4 border-t border-black/10 flex gap-2">
                <button onClick={resetPaste}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-black/5 text-black/60 border border-black/10 hover:bg-black/10">
                  ยกเลิก
                </button>
                {!parsedRows ? (
                  <button onClick={handlePastePreview} disabled={!pasteText.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-black/10 text-[#12181F] border border-black/20 hover:bg-black/15 disabled:opacity-40">
                    ตรวจสอบข้อมูล
                  </button>
                ) : (
                  (() => {
                    const isMulti = parsedRows.some(r => r.month !== undefined)
                    const months  = isMulti
                      ? Array.from(new Set(parsedRows.map(r => r.month!))).length
                      : 0
                    const matchedBranches = isMulti
                      ? Array.from(new Map(parsedRows.map(r => [r.rawBranch, r])).values())
                          .filter(r => r.matched || !!manualMap[r.rawBranch]).length
                      : parsedRows.filter(r => r.matched).length + Object.keys(manualMap).length
                    const disabled = pending || matchedBranches === 0 || blockPasteConfirm
                    const label = pending ? 'กำลังบันทึก...'
                      : isMulti ? `บันทึก ${matchedBranches} สาขา × ${months} เดือน`
                      : `บันทึก ${matchedBranches} สาขา`
                    return (
                      <button onClick={handlePasteConfirm} disabled={disabled}
                        title={blockPasteConfirm ? 'กรุณายืนยันความถูกต้องของตัวเลขที่ผิดปกติก่อนบันทึก' : undefined}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 disabled:opacity-50">
                        <Save size={13} />
                        {label}
                      </button>
                    )
                  })()
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
