/**
 * Import script: โครงการปรับปรุง 69
 * อ่านข้อมูลจากไฟล์ Excel แล้ว insert เข้า Supabase โดยตรง
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { read, utils } from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Credentials ──────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://viwzadtjtzaruicqhyod.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpd3phZHRqdHphcnVpY3FoeW9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYwMTExMiwiZXhwIjoyMDkzMTc3MTEyfQ.FxAH42sElk2jdxuAnsGLfvFQrw_iB4ub6f44PiGe4B4'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Excel date converter (handles both BE-as-CE and short-year formats) ───────
function xlToIso(serial) {
  if (!serial || typeof serial !== 'number' || serial < 100) return null
  // Days since Dec 31, 1899
  const d = new Date(Math.round((serial - 1) * 86400000) + new Date(1900, 0, 0).getTime())
  let y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate()
  if (y >= 1960 && y < 1980) y += 57      // "69" short year → 2026 CE
  else if (y >= 2500)        y -= 543      // BE stored as CE → subtract 543
  if (y < 1990 || y > 2100) return null   // still looks wrong → skip
  return `${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
}

function parseDays(v) {
  const n = parseInt(String(v).replace(/[^0-9]/g, ''))
  return isNaN(n) || n <= 0 ? null : n
}

function parseNum(v) {
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) || n <= 0 ? null : n
}

// ── Read Excel ───────────────────────────────────────────────────────────────
const EXCEL_PATH = 'c:/Users/18074/Downloads/โครงการปรับปรุง 69 (1).xlsx'
const wb = read(readFileSync(EXCEL_PATH))
const ws = wb.Sheets[wb.SheetNames[0]]
const rawRows = utils.sheet_to_json(ws, { header: 1, defval: '' })
const allData = rawRows.slice(2).filter(r => r[3] && String(r[3]).trim())

// Propagate budget group name (col 0 is only filled on first row of each group)
let currentGroup = ''
const rows = allData.map(r => {
  if (r[0] && String(r[0]).trim()) currentGroup = String(r[0]).trim()
  return { ...r, _group: currentGroup }
})

// Extract unique group names in order
const groupNames = [...new Set(rows.map(r => r._group).filter(Boolean))]
console.log('Groups:', groupNames)
console.log('Total rows:', rows.length)

// ── Get or create Budget Year 2569 ───────────────────────────────────────────
async function getOrCreateYear() {
  const { data: existing } = await supabase
    .from('budget_years').select('id').eq('fiscal_year', 2569).single()
  if (existing) { console.log('Found year:', existing.id); return existing.id }

  const { data, error } = await supabase.from('budget_years').insert({
    name: 'ปีงบประมาณ 2569',
    fiscal_year: 2569,
    is_active: true,
    created_by: 'import-script',
  }).select('id').single()
  if (error) throw new Error('Create year failed: ' + error.message)
  console.log('Created year:', data.id)
  return data.id
}

// ── Get or create Budget Groups ───────────────────────────────────────────────
async function getOrCreateGroups(yearId) {
  const map = {}
  for (const name of groupNames) {
    const { data: existing } = await supabase
      .from('budget_groups').select('id').eq('budget_year_id', yearId).eq('name', name).single()
    if (existing) { map[name] = existing.id; console.log('Found group:', name); continue }

    const { data, error } = await supabase.from('budget_groups').insert({
      budget_year_id: yearId,
      name,
      created_by: 'import-script',
    }).select('id').single()
    if (error) throw new Error('Create group failed: ' + error.message)
    map[name] = data.id
    console.log('Created group:', name, data.id)
  }
  return map
}

// ── Load branches ─────────────────────────────────────────────────────────────
async function loadBranches() {
  const { data, error } = await supabase.from('branches').select('id, name_th').eq('is_active', true)
  if (error) throw new Error('Load branches: ' + error.message)
  return data
}

function matchBranch(excelName, branches) {
  const v = excelName.trim().replace('ท่าตะโก(น.ไพศาลี)', 'ท่าตะโก')
  return branches.find(b => {
    const n = b.name_th.replace('สาขา', '').trim()
    return n.includes(v) || v.includes(n)
  }) ?? null
}

// ── Main import ───────────────────────────────────────────────────────────────
async function main() {
  const yearId   = await getOrCreateYear()
  const groupMap = await getOrCreateGroups(yearId)
  const branches = await loadBranches()

  let inserted = 0, skipped = 0
  const noMatch = []

  for (const r of rows) {
    const projectName = String(r[3]).trim()
    const branchName  = String(r[2]).trim()
    const groupId     = groupMap[r._group]
    if (!projectName || !groupId) { skipped++; continue }

    const branch = matchBranch(branchName, branches)
    if (!branch) { noMatch.push(branchName); skipped++; continue }

    // Determine current_phase
    const p1 = r[7], p2 = r[8], p2b = r[9], p3 = r[10], p4 = r[11], p5 = r[12], p6 = r[13]
    let phase = 0
    if (p1) phase = 1
    if (p2 || p2b) phase = 2
    if (p3) phase = 3
    if (p4) phase = 4
    if (p5) phase = 5
    if (p6) phase = 6

    // Contract data
    const contractorName = String(r[14]).trim() || null
    const contractNumber = String(r[15]).trim() || null
    const contractDate   = xlToIso(r[16])
    const startDate      = xlToIso(r[17])
    const endDate        = xlToIso(r[18])
    const conDays        = parseDays(r[19])
    const budgetExclVat  = parseNum(r[4])
    const contractInclVat = parseNum(r[6])
    const estimatedPipe  = parseNum(r[34]) || parseNum(r[35])

    // Completion dates (from notes if phase 6)
    let completionSub = null, completionInsp = null
    if (phase === 6 && r[33]) completionSub  = xlToIso(r[33])
    if (phase === 6 && r[34]) completionInsp = xlToIso(r[34])

    // 1. Insert project
    const { data: proj, error: projErr } = await supabase
      .from('budget_projects')
      .insert({
        budget_year_id:   yearId,
        budget_group_id:  groupId,
        branch_id:        branch.id,
        project_name:     projectName,
        budget_excl_vat:  budgetExclVat,
        contract_incl_vat: contractInclVat,
        current_phase:    phase,
        completion_submission_date: completionSub,
        completion_inspection_date: completionInsp,
        created_by: 'import-script',
      })
      .select('id')
      .single()

    if (projErr) {
      console.error('Insert error:', projErr.message, '—', projectName.slice(0, 40))
      skipped++
      continue
    }

    // 2. Insert contract if phase >= 4 and has contract data
    if (phase >= 4 && (contractorName || contractNumber || startDate || endDate)) {
      await supabase.from('project_contracts').insert({
        project_id:           proj.id,
        contractor_name:      contractorName,
        contract_number:      contractNumber,
        contract_date:        contractDate,
        contract_start_date:  startDate,
        contract_end_date:    endDate,
        construction_days:    conDays,
        estimated_pipe_length: estimatedPipe,
        created_by: 'import-script',
      })
    }

    // 3. Insert progress update if phase 5 and has % data (col 25 = latest %)
    const completedPct = parseNum(r[36])
    if (phase === 5 && completedPct && estimatedPipe) {
      const completedLen = Math.round((completedPct / 100) * estimatedPipe * 100) / 100
      if (completedLen > 0) {
        await supabase.from('project_progress_updates').insert({
          project_id:           proj.id,
          reported_date:        new Date().toISOString().split('T')[0],
          pipe_length_completed: completedLen,
          notes: `นำเข้าจาก Excel (${completedPct}%)`,
          created_by: 'import-script',
        })
      }
    }

    inserted++
    process.stdout.write(`\r✓ ${inserted} โครงการ`)
  }

  console.log(`\n\n=== สรุป ===`)
  console.log(`นำเข้าสำเร็จ: ${inserted} โครงการ`)
  console.log(`ข้าม:         ${skipped} รายการ`)
  if (noMatch.length) console.log(`หาสาขาไม่พบ:`, [...new Set(noMatch)])
}

main().catch(e => { console.error(e); process.exit(1) })
