/**
 * Seed DMA projects for fiscal year 2569 from Excel data
 * Run: node --env-file=.env.local scripts/seed-dma-69.mjs
 *
 * Creates budget_year 2569, 7 budget_groups, all projects + contracts.
 * Safe to re-run: uses upsert on project names per group to avoid duplicates.
 */

import { createClient } from '@supabase/supabase-js'
import xlsx from 'xlsx'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// Branch name aliases from Excel → system name_th
const BRANCH_ALIAS = {
  'พิษณุโลก(น.วังทอง)':  'พิษณุโลก',
  'พิษณุโลก(น.บ้านกร่าง)': 'พิษณุโลก',
}
function normBranch(name) {
  return BRANCH_ALIAS[name?.trim()] ?? name?.trim()
}

// Convert Excel serial date → 'YYYY-MM-DD'
function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000)
  return d.toISOString().split('T')[0]
}

// Determine current_phase from phase-checkbox columns (indices 8-13) and status text
function getPhase(row) {
  // cols: 8=TOR, 9=E-bidding, 10=พิจารณาผล, 11=รอเซ็นสัญญา, 12=ดำเนินงาน, 13=แล้วเสร็จ
  if (row[13] == 1) return 6
  if (row[12] == 1) return 5
  if (row[11] == 1) return 3
  if (row[10] == 1) return 3
  if (row[9]  == 1) return 2
  if (row[8]  == 1) return 2
  return 1
}

// Budget group data with project rows
const GROUPS = [
  {
    name: 'มาตรวัดน้ำหลัก',
    type: 'dma',
    rows: [2, 3],
  },
  {
    name: 'งานปรับปรุง DMA (มาตรวัดน้ำ + อุปกรณ์ Online)',
    type: 'dma',
    rows: [5, 6, 7, 8, 9],
  },
  {
    name: 'งานติดตั้งอุปกรณ์ PRV / PSV',
    type: 'dma',
    rows: [11, 12],
  },
  {
    name: 'งานปรับปรุงท่อจ่ายน้ำเข้า DMA (Pipe by Part)',
    type: 'dma',
    rows: [14, 15],
  },
  {
    name: 'งบเร่งด่วน 200 ล้าน (อนุมัติ 11 มี.ค.69)',
    type: 'dma',
    rows: [17, 18, 19, 20, 21, 22, 23],
  },
  {
    name: 'งบเร่งด่วน PRV 1 ล้าน',
    type: 'dma',
    rows: [25, 26],
  },
  {
    name: 'งบเร่งด่วน 200 ล้าน (อนุมัติ 3 เม.ย.69)',
    type: 'dma',
    rows: [28],
  },
]

async function main() {
  // 1. Load Excel
  const excelPath = 'c:/Users/18074/Downloads/โครงการ DMA 69.xlsx'
  const wb = xlsx.readFile(excelPath)
  const ws = wb.Sheets['Sheet A']
  const data = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' })
  console.log(`Loaded ${data.length} rows from Excel`)

  // 2. Load all branches
  const { data: branches, error: bErr } = await supabase.from('branches').select('id, name_th').eq('is_active', true)
  if (bErr) throw new Error(`branches: ${bErr.message}`)
  const branchMap = new Map(branches.map(b => [b.name_th, b.id]))
  console.log(`Loaded ${branches.length} branches`)

  // 3. Find or create budget_year 2569
  let { data: yearRow } = await supabase.from('budget_years').select('id, name').eq('fiscal_year', 2569).single()
  if (!yearRow) {
    const { data: inserted, error: yErr } = await supabase.from('budget_years').insert({
      name: 'ปีงบประมาณ 2569',
      fiscal_year: 2569,
      is_active: true,
      created_by: 'seed-dma-69',
    }).select('id, name').single()
    if (yErr) throw new Error(`budget_years insert: ${yErr.message}`)
    yearRow = inserted
    console.log(`Created budget_year: ${yearRow.name}`)
  } else {
    console.log(`Found budget_year: ${yearRow.name} (${yearRow.id})`)
  }

  // 4. Process each group
  for (const grp of GROUPS) {
    // Find or create budget_group
    let { data: grpRow } = await supabase
      .from('budget_groups')
      .select('id')
      .eq('budget_year_id', yearRow.id)
      .eq('name', grp.name)
      .single()

    if (!grpRow) {
      const { data: ins, error: gErr } = await supabase.from('budget_groups').insert({
        budget_year_id: yearRow.id,
        name: grp.name,
        created_by: 'seed-dma-69',
      }).select('id').single()
      if (gErr) throw new Error(`budget_groups insert (${grp.name}): ${gErr.message}`)
      grpRow = ins
      console.log(`  Created group: ${grp.name}`)
    } else {
      console.log(`  Found group: ${grp.name}`)
    }

    // Insert projects
    for (const rowIdx of grp.rows) {
      const row = data[rowIdx]
      if (!row || !row[3]) { console.log(`    Skip empty row ${rowIdx}`); continue }

      const branchNameRaw = row[2]
      const branchName    = normBranch(branchNameRaw)
      const branchId      = branchMap.get(branchName)
      if (!branchId) {
        console.warn(`    ⚠️  Branch not found: "${branchNameRaw}" (row ${rowIdx})`)
        continue
      }

      const projectName     = String(row[3]).trim()
      const budgetExclVat   = row[4] ? parseFloat(row[4]) : null
      const contractInclVat = row[6] ? parseFloat(row[6]) : null
      const currentPhase    = getPhase(row)

      // Check if project already exists
      const { data: existProject } = await supabase
        .from('budget_projects')
        .select('id, current_phase')
        .eq('budget_group_id', grpRow.id)
        .eq('project_name', projectName)
        .single()

      let projectId
      if (existProject) {
        projectId = existProject.id
        // Update phase if newer
        if (currentPhase > existProject.current_phase) {
          await supabase.from('budget_projects').update({ current_phase: currentPhase }).eq('id', projectId)
        }
        console.log(`    ~ Project exists: ${branchName} / ${projectName.slice(0, 40)}`)
      } else {
        const { data: proj, error: pErr } = await supabase.from('budget_projects').insert({
          budget_year_id:   yearRow.id,
          budget_group_id:  grpRow.id,
          branch_id:        branchId,
          project_name:     projectName,
          project_type:     grp.type,
          budget_excl_vat:  budgetExclVat,
          contract_incl_vat: contractInclVat,
          current_phase:    currentPhase,
          created_by:       'seed-dma-69',
        }).select('id').single()
        if (pErr) {
          console.error(`    ❌ Project insert error (row ${rowIdx}): ${pErr.message}`)
          continue
        }
        projectId = proj.id
        console.log(`    + Project: ${branchName} / ${projectName.slice(0, 40)} (phase ${currentPhase})`)
      }

      // Insert contract if data exists (cols 14-19)
      const contractorName = row[14] ? String(row[14]).trim() : null
      const contractNumber = row[15] ? String(row[15]).trim() : null
      const contractDate   = excelDate(row[16])
      const startDate      = excelDate(row[17])
      const endDate        = excelDate(row[18])
      const conDays        = row[19] ? parseInt(row[19]) : null

      const hasContract = contractorName || contractNumber || contractDate

      if (hasContract) {
        const { error: cErr } = await supabase.from('project_contracts').upsert({
          project_id:           projectId,
          contractor_name:      contractorName,
          contract_number:      contractNumber,
          contract_date:        contractDate,
          contract_start_date:  startDate,
          contract_end_date:    endDate,
          construction_days:    conDays,
          created_by:           'seed-dma-69',
        }, { onConflict: 'project_id' })
        if (cErr) console.error(`    ❌ Contract upsert error: ${cErr.message}`)
        else console.log(`      → Contract: ${contractorName ?? '(no name)'}, end ${endDate ?? '-'}`)
      }
    }
  }

  console.log('\n✅ Done seeding DMA projects for 2569')
}

main().catch(e => { console.error(e); process.exit(1) })
