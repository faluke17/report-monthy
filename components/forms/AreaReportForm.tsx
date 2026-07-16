'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, LayoutDashboard } from 'lucide-react'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { Branch, WaterNodeOption } from '@/lib/types'
import { submitAreaReports } from '@/app/actions/area-reports'
import type { AreaReportInput } from '@/app/actions/area-reports'
import { getNodeNrwStats, getNodeMnfStats } from '@/app/actions/water-nodes'
import { WaterNodeSelect } from '@/components/forms/WaterNodeSelect'
import { parsePdcaImportJson, PdcaImportArea, PdcaImportData } from '@/lib/utils/pdca-import'

const PDCA_IMPORT_HANDOFF_KEY = 'pdca_import_handoff'

const OBSTACLE_TYPES = [
  'MM/DMA Zero Test ไม่ผ่าน',
  'Step Test Zero Test ไม่ผ่าน',
  'MM/DMA/P3 ชำรุด',
  'จุดค้างซ่อม',
  'มาตรผิดปกติ',
  'ปัญหาแรงดันน้ำไหลอ่อน',
  'ขาด logger / P3',
  'อื่น',
]

export interface NodeNrwLookup {
  report_year: number
  report_month: number
  gross_flow: number | null
  net_flow: number | null
  distribute_all: number | null
}

interface StepRow {
  step_no: number
  estimated_loss: string
  leaks_found: string
  leaks_repaired: string
}

interface PdcaItem {
  title: string
  detail: string
}

function serializePdca(items: PdcaItem[]): string | null {
  const filled = items.filter((i) => i.title.trim() || i.detail.trim())
  if (!filled.length) return null
  return filled
    .map((item, idx) =>
      item.detail.trim()
        ? `${idx + 1}. ${item.title.trim()}\n   ${item.detail.trim()}`
        : `${idx + 1}. ${item.title.trim()}`
    )
    .join('\n\n')
}

interface ObstacleRow {
  obstacle_type: string
  other_description: string
  obstacle_detail: string
  resolution_plan: string
  impact: string
  region_support_needed: string
  priority: 'สูง' | 'กลาง'
}

interface AreaSet {
  key: string
  expanded: boolean
  area_name: string
  area_code: string
  node_id: string
  logger_id: string | null
  nrw_data_month: { year: number; month: number } | null
  nrw_after_data_month: { year: number; month: number } | null
  manual_input: boolean
  manual_input_after: boolean
  water_dist_before: string
  water_sold_before: string
  mnf_before: string
  step_tests: StepRow[]
  water_dist_after: string
  water_sold_after: string
  mnf_after: string
  pdca_do_items: PdcaItem[]
  pdca_act_items: PdcaItem[]
  has_obstacle: boolean
  obstacles: ObstacleRow[]
}

function newArea(index: number): AreaSet {
  return {
    key: `a_${Date.now()}_${index}`,
    expanded: true,
    area_name: '',
    area_code: '',
    node_id: '',
    logger_id: null,
    nrw_data_month: null,
    nrw_after_data_month: null,
    manual_input: false,
    manual_input_after: false,
    water_dist_before: '',
    water_sold_before: '',
    mnf_before: '',
    step_tests: [{ step_no: 1, estimated_loss: '', leaks_found: '0', leaks_repaired: '0' }],
    water_dist_after: '',
    water_sold_after: '',
    mnf_after: '',
    pdca_do_items: [{ title: '', detail: '' }],
    pdca_act_items: [{ title: '', detail: '' }],
    has_obstacle: false,
    obstacles: [{ obstacle_type: '', other_description: '', obstacle_detail: '', resolution_plan: '', impact: '', region_support_needed: '', priority: 'กลาง' as const }],
  }
}

function mapImportedArea(a: PdcaImportArea, index: number): AreaSet {
  return {
    key: `import_${Date.now()}_${index}`,
    expanded: index === 0,
    area_name: a.name === '(ไม่ระบุชื่อพื้นที่)' ? '' : (a.name || ''),
    area_code: '',
    node_id: '',
    logger_id: null,
    nrw_data_month: null,
    nrw_after_data_month: null,
    manual_input: true,
    manual_input_after: true,
    water_dist_before: a.before?.dist ? String(a.before.dist) : '',
    water_sold_before: a.before?.sold ? String(a.before.sold) : '',
    mnf_before: a.before?.mnf != null ? String(a.before.mnf) : '',
    step_tests: a.stepTests && a.stepTests.length
      ? a.stepTests.map((s, i) => ({
          step_no: s.step ?? i + 1,
          estimated_loss: s.estLoss != null ? String(s.estLoss) : '',
          leaks_found: String(s.found ?? 0),
          leaks_repaired: String(s.repaired ?? 0),
        }))
      : [{ step_no: 1, estimated_loss: '', leaks_found: '0', leaks_repaired: '0' }],
    water_dist_after: a.after?.dist ? String(a.after.dist) : '',
    water_sold_after: a.after?.sold ? String(a.after.sold) : '',
    mnf_after: a.after?.mnf != null ? String(a.after.mnf) : '',
    pdca_do_items: a.pdcaDo && a.pdcaDo.length ? a.pdcaDo : [{ title: '', detail: '' }],
    pdca_act_items: a.pdcaAct && a.pdcaAct.length ? a.pdcaAct : [{ title: '', detail: '' }],
    has_obstacle: !!a.hasObstacle,
    obstacles: a.hasObstacle && a.obstacle
      ? [{
          obstacle_type: a.obstacle.type || '',
          other_description: a.obstacle.other || '',
          obstacle_detail: a.obstacle.detail || '',
          resolution_plan: a.obstacle.plan || '',
          impact: '',
          region_support_needed: '',
          priority: a.obstacle.priority === 'สูง' ? 'สูง' : 'กลาง',
        }]
      : [{ obstacle_type: '', other_description: '', obstacle_detail: '', resolution_plan: '', impact: '', region_support_needed: '', priority: 'กลาง' as const }],
  }
}

function calcNrw(dist: string, sold: string) {
  const d = parseFloat(dist)
  const s = parseFloat(sold)
  if (!d) return null
  return { loss: d - s, pct: ((d - s) / d) * 100 }
}

function fmt(n: number | null, dec = 2) {
  if (n === null) return '-'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}


const INPUT = 'w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm text-[#12181F] font-mono placeholder:text-black/25 focus:outline-none focus:border-cyan-500/50 transition-colors'
const SELECT = 'w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer'
const LABEL = 'block text-xs font-semibold text-black/40 uppercase tracking-wide mb-2'
const CALC_BOX = 'w-full bg-black/3 border border-dashed border-black/10 rounded-xl px-4 py-3 text-sm font-mono text-black/50 min-h-[46px] flex items-center'

type MnfLookup = { report_year: number; report_month: number; avg_mnf: number }

interface Props {
  branches: Branch[]
  userBranchId?: string
  isAdmin: boolean
  mmNodesByBranch: Record<string, WaterNodeOption[]>
  nrwStatsByNodeId: Record<string, NodeNrwLookup[]>
  mnfStatsByLoggerId?: Record<string, MnfLookup[]>
  defaultYear?: number
  defaultMonth?: number
}

export function AreaReportForm({
  branches,
  userBranchId,
  isAdmin,
  mmNodesByBranch,
  nrwStatsByNodeId,
  mnfStatsByLoggerId: mnfStatsByLoggerIdProp = {},
  defaultYear,
  defaultMonth,
}: Props) {
  const router = useRouter()
  const now = new Date()
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const [branchId, setBranchId] = useState(userBranchId ?? '')
  const [reportYear, setReportYear] = useState(defaultYear ?? prevYear)
  const [reportMonth, setReportMonth] = useState(defaultMonth ?? prevMonth)
  const [areas, setAreas] = useState<AreaSet[]>([newArea(0)])
  const [submitting, setSubmitting] = useState(false)
  const [nrwStats, setNrwStats] = useState(nrwStatsByNodeId)
  const [mnfStats, setMnfStats] = useState<Record<string, MnfLookup[]>>(mnfStatsByLoggerIdProp)
  const isFirstRender = useRef(true)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    Promise.all([
      getNodeNrwStats(reportYear, reportMonth),
      getNodeMnfStats(reportYear, reportMonth),
    ]).then(([nrwRows, mnfRows]) => {
      const nrwMap: typeof nrwStatsByNodeId = {}
      for (const r of nrwRows) {
        if (!nrwMap[r.water_node_id]) nrwMap[r.water_node_id] = []
        nrwMap[r.water_node_id].push(r)
      }
      setNrwStats(nrwMap)

      const mnfMap: Record<string, MnfLookup[]> = {}
      for (const r of mnfRows) {
        const key = String(r.logger_id)
        if (!mnfMap[key]) mnfMap[key] = []
        mnfMap[key].push({ report_year: r.report_year, report_month: r.report_month, avg_mnf: r.avg_mnf })
      }
      setMnfStats(mnfMap)
    })
  }, [reportYear, reportMonth])

  // Pick up a JSON file handed off from the /pdca/import preview page (user
  // uploaded there first, then clicked through to fill in this form).
  useEffect(() => {
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem(PDCA_IMPORT_HANDOFF_KEY)
      sessionStorage.removeItem(PDCA_IMPORT_HANDOFF_KEY)
    } catch {
      return
    }
    if (!raw) return
    const result = parsePdcaImportJson(raw)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    applyImportedData(result.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function patchArea(key: string, patch: Partial<AreaSet>) {
    setAreas((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)))
  }

  function handleAreaSelect(areaKey: string, label: string, code: string, nodeId: string, loggerId: string | null) {
    const area = areas.find((a) => a.key === areaKey)
    if (area?.manual_input) {
      patchArea(areaKey, { area_name: label, area_code: code, node_id: nodeId, logger_id: loggerId })
      return
    }
    const nodeRows = nrwStats[nodeId] ?? []
    const yoyStat = nodeRows.find((r) => r.report_year === reportYear - 1 && r.report_month === reportMonth)
    const distBefore = yoyStat?.net_flow ?? yoyStat?.gross_flow

    // MNF: before = เดือนก่อนหน้า, after = เดือนปัจจุบัน
    const mnfPrevMonth = reportMonth === 1 ? 12 : reportMonth - 1
    const mnfPrevYear  = reportMonth === 1 ? reportYear - 1 : reportYear
    const mnfRows  = loggerId ? (mnfStats[loggerId] ?? []) : []
    const mnfBefore = mnfRows.find((r) => r.report_year === mnfPrevYear && r.report_month === mnfPrevMonth)
    const mnfAfter  = mnfRows.find((r) => r.report_year === reportYear  && r.report_month === reportMonth)

    const afterPatch = area?.manual_input_after ? {} : (() => {
      const currentStat = nodeRows.find((r) => r.report_year === reportYear && r.report_month === reportMonth)
      const distAfter = currentStat?.net_flow ?? currentStat?.gross_flow
      return {
        nrw_after_data_month: currentStat ? { year: currentStat.report_year, month: currentStat.report_month } : null,
        water_dist_after: distAfter != null ? String(distAfter) : '',
        water_sold_after: currentStat?.distribute_all != null ? String(currentStat.distribute_all) : '',
        mnf_after: mnfAfter != null ? String(mnfAfter.avg_mnf) : '',
      }
    })()

    patchArea(areaKey, {
      area_name: label,
      area_code: code,
      node_id: nodeId,
      logger_id: loggerId,
      nrw_data_month: yoyStat ? { year: yoyStat.report_year, month: yoyStat.report_month } : null,
      water_dist_before: distBefore != null ? String(distBefore) : '',
      water_sold_before: yoyStat?.distribute_all != null ? String(yoyStat.distribute_all) : '',
      mnf_before: mnfBefore != null ? String(mnfBefore.avg_mnf) : '',
      ...afterPatch,
    })
  }

  function toggleManualInput(areaKey: string, checked: boolean) {
    const area = areas.find((a) => a.key === areaKey)
    if (!area) return
    if (checked) {
      patchArea(areaKey, {
        manual_input: true,
        nrw_data_month: null,
        water_dist_before: '',
        water_sold_before: '',
      })
    } else {
      const nodeRows = nrwStats[area.node_id] ?? []
      const yoyStat = nodeRows.find((r) => r.report_year === reportYear - 1 && r.report_month === reportMonth)
      const distBefore = yoyStat?.net_flow ?? yoyStat?.gross_flow
      patchArea(areaKey, {
        manual_input: false,
        nrw_data_month: yoyStat ? { year: yoyStat.report_year, month: yoyStat.report_month } : null,
        water_dist_before: distBefore != null ? String(distBefore) : '',
        water_sold_before: yoyStat?.distribute_all != null ? String(yoyStat.distribute_all) : '',
      })
    }
  }

  function toggleManualInputAfter(areaKey: string, checked: boolean) {
    const area = areas.find((a) => a.key === areaKey)
    if (!area) return
    if (checked) {
      patchArea(areaKey, {
        manual_input_after: true,
        nrw_after_data_month: null,
        water_dist_after: '',
        water_sold_after: '',
      })
    } else {
      const nodeRows = nrwStats[area.node_id] ?? []
      const currentStat = nodeRows.find((r) => r.report_year === reportYear && r.report_month === reportMonth)
      const distAfter = currentStat?.net_flow ?? currentStat?.gross_flow
      patchArea(areaKey, {
        manual_input_after: false,
        nrw_after_data_month: currentStat ? { year: currentStat.report_year, month: currentStat.report_month } : null,
        water_dist_after: distAfter != null ? String(distAfter) : '',
        water_sold_after: currentStat?.distribute_all != null ? String(currentStat.distribute_all) : '',
      })
    }
  }

  function addStep(key: string) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return {
          ...a,
          step_tests: [
            ...a.step_tests,
            { step_no: a.step_tests.length + 1, estimated_loss: '', leaks_found: '0', leaks_repaired: '0' },
          ],
        }
      })
    )
  }

  function patchStep(key: string, idx: number, patch: Partial<StepRow>) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return { ...a, step_tests: a.step_tests.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }
      })
    )
  }

  function removeStep(key: string, idx: number) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return {
          ...a,
          step_tests: a.step_tests
            .filter((_, i) => i !== idx)
            .map((s, i) => ({ ...s, step_no: i + 1 })),
        }
      })
    )
  }

  function addObstacle(key: string) {
    setAreas((prev) =>
      prev.map((a) =>
        a.key === key
          ? { ...a, obstacles: [...a.obstacles, { obstacle_type: '', other_description: '', obstacle_detail: '', resolution_plan: '', impact: '', region_support_needed: '', priority: 'กลาง' as const }] }
          : a
      )
    )
  }

  function patchObstacle(key: string, idx: number, patch: Partial<ObstacleRow>) {
    setAreas((prev) =>
      prev.map((a) => {
        if (a.key !== key) return a
        return { ...a, obstacles: a.obstacles.map((o, i) => (i === idx ? { ...o, ...patch } : o)) }
      })
    )
  }

  function removeObstacle(key: string, idx: number) {
    setAreas((prev) =>
      prev.map((a) =>
        a.key === key ? { ...a, obstacles: a.obstacles.filter((_, i) => i !== idx) } : a
      )
    )
  }

  type PdcaField = 'pdca_do_items' | 'pdca_act_items'

  function addPdcaItem(key: string, field: PdcaField) {
    setAreas((prev) =>
      prev.map((a) =>
        a.key === key ? { ...a, [field]: [...a[field], { title: '', detail: '' }] } : a
      )
    )
  }

  function removePdcaItem(key: string, field: PdcaField, idx: number) {
    setAreas((prev) =>
      prev.map((a) =>
        a.key === key ? { ...a, [field]: a[field].filter((_, i) => i !== idx) } : a
      )
    )
  }

  function patchPdcaItem(key: string, field: PdcaField, idx: number, patch: Partial<PdcaItem>) {
    setAreas((prev) =>
      prev.map((a) =>
        a.key === key
          ? { ...a, [field]: a[field].map((item, i) => (i === idx ? { ...item, ...patch } : item)) }
          : a
      )
    )
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  function applyImportedData(data: PdcaImportData) {
    const hasExistingData = areas.some(
      (a) => a.area_name.trim() || a.water_dist_before || a.water_sold_before || a.water_dist_after || a.water_sold_after
    )
    if (hasExistingData && !window.confirm('การนำเข้าไฟล์จะแทนที่ข้อมูลที่กรอกอยู่ในฟอร์มนี้ ดำเนินการต่อหรือไม่?')) {
      return
    }

    if (data.meta) {
      if (data.meta.month) setReportMonth(data.meta.month)
      if (data.meta.year) setReportYear(data.meta.year > 2100 ? data.meta.year - 543 : data.meta.year)
      if (isAdmin && data.meta.branch) {
        const branchName = data.meta.branch.trim()
        const matched = branches.find((b) => b.name_th.trim() === branchName)
        if (matched) setBranchId(matched.id)
        else toast.error(`ไม่พบสาขา "${branchName}" ในระบบ กรุณาเลือกสาขาด้วยตนเอง`)
      }
    }

    setAreas(data.areas.map(mapImportedArea))

    if (data.meter && Object.keys(data.meter).some((k) => k !== 'total' && data.meter![k])) {
      toast('ข้อมูลมาตรวัดน้ำในไฟล์นี้ยังไม่รองรับการนำเข้า กรุณาบันทึกด้วยตนเองในโมดูลอื่น')
    }

    toast.success(`นำเข้า ${data.areas.length} พื้นที่ — กรุณาตรวจสอบข้อมูลก่อนบันทึก`)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parsePdcaImportJson(reader.result as string)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      applyImportedData(result.data)
    }
    reader.readAsText(file)
  }

  async function handleSubmit() {
    if (!branchId) { toast.error('กรุณาเลือกสาขา'); return }
    const missing = areas.find((a) => !a.area_name.trim())
    if (missing) { toast.error('กรุณาระบุชื่อพื้นที่ทุกพื้นที่'); return }

    const incompleteObstacle = areas.find((a) =>
      a.has_obstacle &&
      a.obstacles.some((o) =>
        !o.obstacle_type &&
        (o.obstacle_detail.trim() || o.resolution_plan.trim() || o.impact.trim() || o.region_support_needed.trim())
      )
    )
    if (incompleteObstacle) {
      toast.error(`กรุณาเลือก "อุปสรรคเรื่อง" ในพื้นที่ "${incompleteObstacle.area_name || 'ที่ยังไม่ระบุ'}" มิฉะนั้นข้อมูลอุปสรรคจะไม่ถูกบันทึก`)
      return
    }

    setSubmitting(true)

    const payload: AreaReportInput[] = areas.map((a) => ({
      branch_id: branchId,
      report_year: reportYear,
      report_month: reportMonth,
      area_name: a.area_name.trim(),
      water_dist_before: parseFloat(a.water_dist_before) || null,
      water_sold_before: parseFloat(a.water_sold_before) || null,
      mnf_before: parseFloat(a.mnf_before) || null,
      water_dist_after: parseFloat(a.water_dist_after) || null,
      water_sold_after: parseFloat(a.water_sold_after) || null,
      mnf_after: parseFloat(a.mnf_after) || null,
      pdca_do: serializePdca(a.pdca_do_items),
      pdca_act: serializePdca(a.pdca_act_items),
      step_tests: a.step_tests.map((s) => ({
        step_no: s.step_no,
        estimated_loss: parseFloat(s.estimated_loss) || null,
        leaks_found: parseInt(s.leaks_found) || 0,
        leaks_repaired: s.leaks_repaired.trim() === '' ? null : (parseInt(s.leaks_repaired) || 0),
      })),
      obstacles: a.has_obstacle
        ? a.obstacles
            .filter((o) => o.obstacle_type)
            .map((o) => ({
              obstacle_type: o.obstacle_type,
              other_description: o.obstacle_type === 'อื่น' ? o.other_description || null : null,
              obstacle_detail: o.obstacle_detail || null,
              resolution_plan: o.resolution_plan || null,
              impact: o.impact || null,
              region_support_needed: o.region_support_needed || null,
              priority_order: o.priority === 'สูง' ? 1 : 2,
            }))
        : [],
    }))

    const result = await submitAreaReports(payload)
    if (result.success) {
      toast.success('บันทึกรายงานสำเร็จ')
      router.push('/pdca')
    } else {
      toast.error(result.error ?? 'เกิดข้อผิดพลาด')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-4">
      {/* ─── Header: branch / year / month ─── */}
      <div className="glass-card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500/60 to-transparent" />

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-cyan-400/70 uppercase tracking-widest">
              ข้อมูลทั่วไป
            </p>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />
            <div className="flex items-center gap-2">
              <Link
                href="/pdca/import"
                title="ดูสรุปข้อมูลไฟล์ .json เป็นแดชบอร์ดก่อน แล้วค่อยนำเข้ามาที่ฟอร์มนี้"
                className="flex items-center gap-1.5 text-[11px] font-semibold text-black/40 hover:text-[#12181F] border border-black/15 hover:border-black/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                <LayoutDashboard size={12} />
                ดูตัวอย่างแบบแดชบอร์ดก่อน
              </Link>
              <button
                type="button"
                onClick={handleImportClick}
                title="นำเข้าไฟล์ .json ที่ส่งออกจากเครื่องมือ PDCA แบบออฟไลน์"
                className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-500 hover:text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Upload size={12} />
                นำเข้าไฟล์ (.json)
              </button>
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className={LABEL}>สาขา <span className="text-red-400 normal-case">*</span></label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={SELECT}>
                <option value="">— เลือกสาขา —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name_th}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>เดือน</label>
              <select
                value={reportMonth}
                onChange={(e) => setReportMonth(Number(e.target.value))}
                className={SELECT}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{getThaiMonthName(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>ปี (พ.ศ.)</label>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(Number(e.target.value))}
                className={SELECT}
              >
                {[0, 1, 2].map((off) => {
                  const y = now.getFullYear() - off
                  return <option key={y} value={y}>{toThaiYear(y)}</option>
                })}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span className="text-sm text-cyan-300/90">
              รายงานประจำเดือน {getThaiMonthName(reportMonth)} {toThaiYear(reportYear)}
              {isAdmin && branchId && (
                <span className="text-cyan-400/60">
                  {' · '}{branches.find((b) => b.id === branchId)?.name_th}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Area sets ─── */}
      {areas.map((area, areaIdx) => {
        const before = calcNrw(area.water_dist_before, area.water_sold_before)
        const after = calcNrw(area.water_dist_after, area.water_sold_after)

        return (
          <div key={area.key} className="glass-card">
            {/* Area header */}
            <div
              className="flex items-center gap-3 p-5 cursor-pointer select-none"
              onClick={() => patchArea(area.key, { expanded: !area.expanded })}
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
                {areaIdx + 1}
              </div>
              <span className="flex-1 text-sm font-semibold text-[#12181F] truncate">
                {area.area_name || (
                  <span className="text-black/30 font-normal">พื้นที่ที่ {areaIdx + 1}</span>
                )}
              </span>
              {areas.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAreas((prev) => prev.filter((a) => a.key !== area.key))
                  }}
                  className="text-red-400/50 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {area.expanded ? (
                <ChevronUp size={15} className="text-black/30 shrink-0" />
              ) : (
                <ChevronDown size={15} className="text-black/30 shrink-0" />
              )}
            </div>

            {area.expanded && (
              <div className="border-t border-black/10 px-5 pb-6 space-y-6">

                {/* Part 1 ─ พื้นที่ */}
                <section className="pt-5">
                  <p className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest mb-3">
                    ส่วนที่ 1 — พื้นที่
                  </p>
                  <WaterNodeSelect
                    key={branchId}
                    branchId={branchId}
                    initialMmNodes={mmNodesByBranch[branchId] ?? []}
                    value={area.area_name}
                    onChange={(label, code, nodeId, loggerId) => handleAreaSelect(area.key, label, code, nodeId, loggerId)}
                  />
                </section>

                {/* Part 2 ─ ก่อนดำเนินการ */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest">
                      ส่วนที่ 2 — ก่อนดำเนินการ <span className="normal-case text-amber-400/40">(NRW: ปีก่อน · MNF: {getThaiMonthName(reportMonth === 1 ? 12 : reportMonth - 1)} {toThaiYear(reportMonth === 1 ? reportYear - 1 : reportYear)})</span>
                    </p>
                    <div className="flex items-center gap-3">
                      {!area.manual_input && area.area_code && (
                        area.nrw_data_month ? (
                          <span className="text-[10px] text-cyan-400/60">
                            เทียบกับ {getThaiMonthName(area.nrw_data_month.month)}{' '}
                            {toThaiYear(area.nrw_data_month.year)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400/70">
                            ไม่มีข้อมูลปีก่อน — กรอกเอง
                          </span>
                        )
                      )}
                      <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          area.manual_input
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-transparent border-black/25 group-hover:border-black/50'
                        }`}>
                          {area.manual_input && (
                            <svg className="w-2.5 h-2.5 text-[#12181F]" fill="none" viewBox="0 0 10 10">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={area.manual_input}
                          onChange={(e) => toggleManualInput(area.key, e.target.checked)}
                        />
                        <span className={`text-[10px] font-medium transition-colors ${
                          area.manual_input ? 'text-amber-400' : 'text-black/30 group-hover:text-black/50'
                        }`}>
                          กรอกเอง
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Row 1: inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL}>น้ำจ่าย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_dist_before}
                        onChange={(e) => patchArea(area.key, { water_dist_before: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>น้ำขาย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_sold_before}
                        onChange={(e) => patchArea(area.key, { water_sold_before: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>MNF (ลบ.ม./ชม.)</label>
                      <input
                        type="number"
                        value={area.mnf_before}
                        onChange={(e) => patchArea(area.key, { mnf_before: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                  </div>

                  {/* Row 2: calculated display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className={LABEL}>น้ำสูญเสีย (ลบ.ม.)</label>
                      <div className={CALC_BOX}>
                        {before ? (
                          <span className="text-black/80 num">{fmt(before.loss, 2)}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>อัตราน้ำสูญเสีย (%)</label>
                      <div className={CALC_BOX}>
                        {before ? (
                          <span className={`num font-semibold ${before.pct > 20 ? 'text-red-400' : 'text-green-400'}`}>
                            {fmt(before.pct)}%
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Part 3 ─ Step Test */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest">
                      ส่วนที่ 3 — ผล Step Test
                    </p>
                    <button
                      onClick={() => addStep(area.key)}
                      className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <Plus size={12} />
                      เพิ่มสเต็ป
                    </button>
                  </div>

                  <div className="grid grid-cols-[36px_1fr_72px_72px_72px_28px] gap-2 text-[10px] text-black/35 px-1 mb-1">
                    <span className="text-center">สเต็ป</span>
                    <span>สูญเสียคาดการณ์ (m³/hr)</span>
                    <span>จุดรั่ว</span>
                    <span>ซ่อมแล้ว</span>
                    <span>ค้างซ่อม</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {area.step_tests.map((step, si) => {
                      const found = parseInt(step.leaks_found) || 0
                      const repaired = parseInt(step.leaks_repaired) || 0
                      const pending = Math.max(0, found - repaired)
                      return (
                        <div
                          key={si}
                          className="grid grid-cols-[36px_1fr_72px_72px_72px_28px] gap-2 items-center"
                        >
                          <div className="text-xs text-black/40 font-mono text-center">{step.step_no}</div>
                          <input
                            type="number"
                            value={step.estimated_loss}
                            onChange={(e) => patchStep(area.key, si, { estimated_loss: e.target.value })}
                            placeholder="0.000"
                            className={INPUT}
                          />
                          <input
                            type="number"
                            min="0"
                            value={step.leaks_found}
                            onChange={(e) => patchStep(area.key, si, { leaks_found: e.target.value })}
                            className={INPUT}
                          />
                          <input
                            type="number"
                            min="0"
                            value={step.leaks_repaired}
                            onChange={(e) => patchStep(area.key, si, { leaks_repaired: e.target.value })}
                            className={INPUT}
                          />
                          <div className={CALC_BOX}>
                            <span className={`num text-xs ${pending > 0 ? 'text-amber-400' : 'text-black/40'}`}>
                              {found > 0 || repaired > 0 ? pending : '—'}
                            </span>
                          </div>
                          <button
                            onClick={() => removeStep(area.key, si)}
                            disabled={area.step_tests.length === 1}
                            className="text-red-400/40 hover:text-red-400 disabled:opacity-20 transition-colors flex items-center justify-center"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Part 4 ─ หลังดำเนินการ */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-green-400/60 uppercase tracking-widest">
                      ส่วนที่ 4 — หลังดำเนินการ <span className="normal-case text-green-400/40">(ผลดำเนินการปี {toThaiYear(reportYear)})</span>
                    </p>
                    <div className="flex items-center gap-3">
                      {area.nrw_after_data_month && !area.manual_input_after && (
                        <span className="text-[10px] text-green-400/60">
                          ดึงจาก dmama:{' '}
                          {getThaiMonthName(area.nrw_after_data_month.month)}{' '}
                          {toThaiYear(area.nrw_after_data_month.year)}
                        </span>
                      )}
                      <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          area.manual_input_after
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-transparent border-black/25 group-hover:border-black/50'
                        }`}>
                          {area.manual_input_after && (
                            <svg className="w-2.5 h-2.5 text-[#12181F]" fill="none" viewBox="0 0 10 10">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={area.manual_input_after}
                          onChange={(e) => toggleManualInputAfter(area.key, e.target.checked)}
                        />
                        <span className={`text-[10px] font-medium transition-colors ${
                          area.manual_input_after ? 'text-amber-400' : 'text-black/30 group-hover:text-black/50'
                        }`}>
                          กรอกเอง
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Row 1: inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL}>น้ำจ่าย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_dist_after}
                        onChange={(e) => patchArea(area.key, { water_dist_after: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>น้ำขาย (ลบ.ม.)</label>
                      <input
                        type="number"
                        value={area.water_sold_after}
                        onChange={(e) => patchArea(area.key, { water_sold_after: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>MNF (ลบ.ม./ชม.)</label>
                      <input
                        type="number"
                        value={area.mnf_after}
                        onChange={(e) => patchArea(area.key, { mnf_after: e.target.value })}
                        placeholder="0"
                        className={INPUT}
                      />
                    </div>
                  </div>

                  {/* Row 2: calculated display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className={LABEL}>น้ำสูญเสีย (ลบ.ม.)</label>
                      <div className={CALC_BOX}>
                        {after ? (
                          <span className="text-black/80 num">{fmt(after.loss, 2)}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={LABEL}>อัตราน้ำสูญเสีย (%)</label>
                      <div className={CALC_BOX}>
                        {after ? (
                          <span className={`num font-semibold ${after.pct > 20 ? 'text-red-400' : 'text-green-400'}`}>
                            {fmt(after.pct)}%
                            {before && (
                              <span className={`ml-2 text-xs ${after.pct < before.pct ? 'text-green-400' : 'text-red-400'}`}>
                                ({after.pct < before.pct ? '▼' : '▲'} {fmt(Math.abs(before.pct - after.pct))}%)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Part 5 ─ Do / Act */}
                <section className="space-y-5">
                  <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">
                    ส่วนที่ 5 — Do / Act
                  </p>

                  {/* ── D (Do) ── */}
                  <div className="rounded-2xl border border-cyan-500/20 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-500/8 border-b border-cyan-500/15">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-cyan-500/25 border border-cyan-500/40 flex items-center justify-center text-[11px] font-black text-cyan-300">D</span>
                        <span className="text-xs font-semibold text-cyan-300">Do — สิ่งที่ดำเนินการ</span>
                        <span className="text-[10px] text-cyan-400/40">{area.pdca_do_items.length} ข้อ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addPdcaItem(area.key, 'pdca_do_items')}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <Plus size={11} />
                        เพิ่มข้อ
                      </button>
                    </div>
                    {/* Items */}
                    <div className="divide-y divide-black/5">
                      {area.pdca_do_items.map((item, idx) => (
                        <div key={idx} className="px-4 py-3 space-y-2 group">
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/35 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => patchPdcaItem(area.key, 'pdca_do_items', idx, { title: e.target.value })}
                              placeholder="ชื่อหัวข้อ / กิจกรรม..."
                              className="flex-1 bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 text-sm font-medium text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/50 focus:bg-black/8 transition-all"
                            />
                            {area.pdca_do_items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePdcaItem(area.key, 'pdca_do_items', idx)}
                                className="opacity-0 group-hover:opacity-100 text-black/20 hover:text-red-400 transition-all shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          <textarea
                            value={item.detail}
                            onChange={(e) => patchPdcaItem(area.key, 'pdca_do_items', idx, { detail: e.target.value })}
                            rows={2}
                            placeholder="รายละเอียด..."
                            className="w-full bg-black/3 border border-black/8 rounded-lg px-3 py-2 text-sm text-black/65 placeholder:text-black/18 focus:outline-none focus:border-cyan-500/35 focus:bg-black/5 resize-none transition-all ml-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── A (Act) ── */}
                  <div className="rounded-2xl border border-emerald-500/20 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/8 border-b border-emerald-500/15">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-emerald-500/25 border border-emerald-500/40 flex items-center justify-center text-[11px] font-black text-emerald-300">A</span>
                        <span className="text-xs font-semibold text-emerald-300">Act — แผนเดือนถัดไป</span>
                        <span className="text-[10px] text-emerald-400/40">{area.pdca_act_items.length} ข้อ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addPdcaItem(area.key, 'pdca_act_items')}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-all"
                      >
                        <Plus size={11} />
                        เพิ่มข้อ
                      </button>
                    </div>
                    {/* Items */}
                    <div className="divide-y divide-black/5">
                      {area.pdca_act_items.map((item, idx) => (
                        <div key={idx} className="px-4 py-3 space-y-2 group">
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => patchPdcaItem(area.key, 'pdca_act_items', idx, { title: e.target.value })}
                              placeholder="ชื่อหัวข้อ / แผนงาน..."
                              className="flex-1 bg-black/5 border border-black/15 rounded-lg px-3 py-1.5 text-sm font-medium text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-emerald-500/50 focus:bg-black/8 transition-all"
                            />
                            {area.pdca_act_items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePdcaItem(area.key, 'pdca_act_items', idx)}
                                className="opacity-0 group-hover:opacity-100 text-black/20 hover:text-red-400 transition-all shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          <textarea
                            value={item.detail}
                            onChange={(e) => patchPdcaItem(area.key, 'pdca_act_items', idx, { detail: e.target.value })}
                            rows={2}
                            placeholder="รายละเอียด..."
                            className="w-full bg-black/3 border border-black/8 rounded-lg px-3 py-2 text-sm text-black/65 placeholder:text-black/18 focus:outline-none focus:border-emerald-500/35 focus:bg-black/5 resize-none transition-all ml-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Part 6 ─ อุปสรรค */}
                <section>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest">
                      ส่วนที่ 6 — อุปสรรค
                    </p>
                    <button
                      onClick={() => patchArea(area.key, { has_obstacle: !area.has_obstacle })}
                      className={`ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-xs border transition-colors ${
                        area.has_obstacle
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                          : 'bg-black/5 border-black/15 text-black/40'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                          area.has_obstacle ? 'bg-orange-400 border-orange-400' : 'border-black/30'
                        }`}
                      />
                      {area.has_obstacle ? 'มีอุปสรรค' : 'ไม่มีอุปสรรค'}
                    </button>
                  </div>

                  {area.has_obstacle && (
                    <div className="space-y-3">
                      {area.obstacles.map((obs, oi) => (
                        <div key={oi} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-orange-400/60 font-bold">อุปสรรคที่ {oi + 1}</span>
                            {area.obstacles.length > 1 && (
                              <button
                                onClick={() => removeObstacle(area.key, oi)}
                                className="ml-auto text-red-400/40 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          <div>
                            <label className={LABEL}>อุปสรรคเรื่อง</label>
                            <select
                              value={obs.obstacle_type}
                              onChange={(e) => patchObstacle(area.key, oi, { obstacle_type: e.target.value })}
                              className={SELECT}
                            >
                              <option value="">— เลือกประเภทอุปสรรค —</option>
                              {OBSTACLE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className={LABEL}>ระดับความเร่งด่วน</label>
                            <div className="flex gap-2">
                              {(['สูง', 'กลาง'] as const).map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => patchObstacle(area.key, oi, { priority: lvl })}
                                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    obs.priority === lvl
                                      ? lvl === 'สูง'
                                        ? 'bg-red-500/20 border-red-500/60 text-red-300'
                                        : 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                                      : 'bg-black/5 border-black/15 text-black/40'
                                  }`}
                                >
                                  {lvl === 'สูง' ? '🔴' : '🟡'} {lvl}
                                </button>
                              ))}
                            </div>
                          </div>

                          {obs.obstacle_type === 'อื่น' && (
                            <div>
                              <label className={LABEL}>ระบุอุปสรรค</label>
                              <input
                                type="text"
                                value={obs.other_description}
                                onChange={(e) => patchObstacle(area.key, oi, { other_description: e.target.value })}
                                placeholder="ระบุอุปสรรคที่พบ..."
                                className={INPUT}
                              />
                            </div>
                          )}

                          <div>
                            <label className={LABEL}>รายละเอียดอุปสรรค</label>
                            <textarea
                              value={obs.obstacle_detail}
                              onChange={(e) => patchObstacle(area.key, oi, { obstacle_detail: e.target.value })}
                              rows={2}
                              placeholder="อธิบายสภาพปัญหาที่พบ..."
                              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>

                          <div>
                            <label className={LABEL}>แนวทางการแก้ไข</label>
                            <textarea
                              value={obs.resolution_plan}
                              onChange={(e) => patchObstacle(area.key, oi, { resolution_plan: e.target.value })}
                              rows={2}
                              placeholder="ระบุแนวทางที่จะดำเนินการแก้ไข..."
                              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>

                          <div>
                            <label className={LABEL}>ผลกระทบที่ได้รับ</label>
                            <textarea
                              value={obs.impact}
                              onChange={(e) => patchObstacle(area.key, oi, { impact: e.target.value })}
                              rows={2}
                              placeholder="ผลกระทบต่อการให้บริการหรือข้อมูล NRW..."
                              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>

                          <div>
                            <label className={LABEL}>สิ่งที่ต้องการความช่วยเหลือจากเขต</label>
                            <textarea
                              value={obs.region_support_needed}
                              onChange={(e) => patchObstacle(area.key, oi, { region_support_needed: e.target.value })}
                              rows={2}
                              placeholder="ระบุสิ่งที่ต้องการให้เขตช่วยเหลือ (หากมี)..."
                              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] placeholder:text-black/25 focus:outline-none focus:border-cyan-500/60 resize-none"
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => addObstacle(area.key)}
                        className="flex items-center gap-1 text-xs text-orange-400/70 hover:text-orange-400 transition-colors"
                      >
                        <Plus size={12} />
                        เพิ่มอุปสรรค
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        )
      })}

      {/* Add area */}
      <button
        onClick={() => setAreas((prev) => [...prev, newArea(prev.length)])}
        className="w-full py-3 border border-dashed border-black/20 rounded-xl text-sm text-black/40 hover:text-[#12181F] hover:border-black/40 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={14} />
        เพิ่มพื้นที่
      </button>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-1">
        <button
          onClick={() => router.back()}
          className="px-4 py-2.5 text-sm text-black/60 hover:text-[#12181F] border border-black/15 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-6 py-2.5 text-sm bg-green-500 hover:bg-green-400 text-[#FFFFFF] font-semibold rounded-lg disabled:opacity-40 transition-colors"
        >
          {submitting ? 'กำลังบันทึก...' : `บันทึก ${areas.length} พื้นที่`}
        </button>
      </div>
    </div>
  )
}
