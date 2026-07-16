import { z } from 'zod'

// Mirrors the JSON shape produced by the offline standalone tool's
// harvest() (public/pdca-tool.html) — kept as the single source of truth for
// both the dashboard-style-preview page (/pdca/import) and the edit form's
// import button so the two entry points can't drift apart.

const phaseSchema = z.object({
  dist: z.number().nullable().default(0),
  sold: z.number().nullable().default(0),
  mnf: z.number().nullable().default(null),
})

const stepTestSchema = z.object({
  step: z.number().optional(),
  estLoss: z.number().nullable().default(0),
  found: z.number().nullable().default(0),
  repaired: z.number().nullable().default(0),
})

const pdcaItemSchema = z.object({
  title: z.string().default(''),
  detail: z.string().default(''),
})

const obstacleSchema = z.object({
  type: z.string().default(''),
  other: z.string().default(''),
  detail: z.string().default(''),
  plan: z.string().default(''),
  priority: z.enum(['สูง', 'กลาง']).default('กลาง'),
})

const areaSchema = z.object({
  name: z.string().default('(ไม่ระบุชื่อพื้นที่)'),
  before: phaseSchema,
  after: phaseSchema,
  stepTests: z.array(stepTestSchema).default([]),
  leaksFound: z.number().default(0),
  leaksRepaired: z.number().default(0),
  pdcaDo: z.array(pdcaItemSchema).default([]),
  pdcaAct: z.array(pdcaItemSchema).default([]),
  hasObstacle: z.boolean().default(false),
  obstacle: obstacleSchema.nullable().default(null),
})

const meterSchema = z.record(z.string(), z.union([z.string(), z.number()])).nullable().default(null)

export const pdcaImportSchema = z.object({
  meta: z.object({
    branch: z.string().default(''),
    month: z.number().default(0),
    year: z.number().default(0),
  }),
  areas: z.array(areaSchema).default([]),
  meter: meterSchema,
})

export type PdcaImportData = z.infer<typeof pdcaImportSchema>
export type PdcaImportArea = z.infer<typeof areaSchema>

// The offline tool's branch field is free text (placeholder suggests
// "กปภ.สาขาขอนแก่น") while `branches.name_th` in the DB stores just the bare
// name ("ขอนแก่น") — strip the common prefixes before comparing so real
// branch submissions actually auto-match instead of always showing "not found".
const BRANCH_PREFIX_RE = /^(กปภ\.?\s*สาขา|กปภ\.?|สาขา)\s*/i

function normalizeBranchName(name: string): string {
  return name.trim().replace(BRANCH_PREFIX_RE, '').trim()
}

export function matchBranch<T extends { name_th: string }>(branches: T[], rawName: string): T | undefined {
  const target = normalizeBranchName(rawName)
  if (!target) return undefined
  return branches.find((b) => normalizeBranchName(b.name_th) === target)
}

export function parsePdcaImportJson(raw: string): { ok: true; data: PdcaImportData } | { ok: false; error: string } {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'ไฟล์ไม่ใช่ JSON ที่ถูกต้อง กรุณาตรวจสอบไฟล์ .json' }
  }

  const result = pdcaImportSchema.safeParse(json)
  if (!result.success) {
    return { ok: false, error: 'โครงสร้างข้อมูลในไฟล์ไม่ตรงกับที่ระบบรองรับ กรุณาใช้ไฟล์ที่ส่งออกจากเครื่องมือ PDCA รายพื้นที่' }
  }
  if (!result.data.areas.length) {
    return { ok: false, error: 'ไฟล์ไม่มีข้อมูลพื้นที่ กรุณาตรวจสอบไฟล์ .json' }
  }
  return { ok: true, data: result.data }
}

/** metric accessor shared by the KPI tiles + charts — mirrors metricValue() in pdca-tool.html */
export function metricValue(area: PdcaImportArea, phase: 'before' | 'after', metric: 'nrw' | 'mnf'): number | null {
  const o = area[phase]
  if (metric === 'mnf') return o.mnf ?? null
  return o.dist ? ((o.dist - (o.sold ?? 0)) / o.dist) * 100 : null
}

export interface PdcaImportAgg {
  distB: number; soldB: number; distA: number; soldA: number
  found: number; repaired: number
  obHigh: number; obMid: number
  pctB: number | null; pctA: number | null
  lossB: number; lossA: number
  mnfB: number | null; mnfA: number | null
}

/** aggregate totals across all areas — mirrors computeAgg() in pdca-tool.html */
export function computeAgg(data: PdcaImportData): PdcaImportAgg {
  const t = { distB: 0, soldB: 0, distA: 0, soldA: 0, found: 0, repaired: 0, obHigh: 0, obMid: 0 }
  let mnfBSum = 0, mnfBCount = 0, mnfASum = 0, mnfACount = 0

  for (const a of data.areas) {
    t.distB += a.before.dist ?? 0
    t.soldB += a.before.sold ?? 0
    t.distA += a.after.dist ?? 0
    t.soldA += a.after.sold ?? 0
    t.found += a.leaksFound
    t.repaired += a.leaksRepaired
    if (a.before.mnf !== null && a.before.mnf !== undefined) { mnfBSum += a.before.mnf; mnfBCount++ }
    if (a.after.mnf !== null && a.after.mnf !== undefined) { mnfASum += a.after.mnf; mnfACount++ }
    if (a.hasObstacle && a.obstacle) {
      if (a.obstacle.priority === 'สูง') t.obHigh++
      else t.obMid++
    }
  }

  return {
    ...t,
    pctB: t.distB > 0 ? ((t.distB - t.soldB) / t.distB) * 100 : null,
    pctA: t.distA > 0 ? ((t.distA - t.soldA) / t.distA) * 100 : null,
    lossB: t.distB - t.soldB,
    lossA: t.distA - t.soldA,
    mnfB: mnfBCount ? mnfBSum / mnfBCount : null,
    mnfA: mnfACount ? mnfASum / mnfACount : null,
  }
}
