/**
 * Export NRW ของ MM + DMA (มิ.ย. 2569 / June 2026) แยก sheet ตามสาขา
 * คอลัมน์: สาขา | ประเภท | รหัส | ชื่อ | Node แม่ | น้ำจ่าย | น้ำขาย | นสส | %นสส
 * Run: node --env-file=.env.local scripts/export-mm-nrw-202606.mjs
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

const YEAR = 2026
const MONTH = 6

async function fetchAll(table, select, filters = (q) => q) {
  const PAGE = 1000
  let offset = 0
  const rows = []
  while (true) {
    let q = supabase.from(table).select(select).range(offset, offset + PAGE - 1)
    q = filters(q)
    const { data, error } = await q
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return rows
}

function safeSheetName(name, used) {
  let clean = (name ?? 'ไม่ระบุ').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31)
  let final = clean
  let n = 2
  while (used.has(final)) {
    final = `${clean.slice(0, 28)}_${n}`
    n++
  }
  used.add(final)
  return final
}

async function main() {
  console.log('กำลังดึงข้อมูล branches, water_nodes (MM+DMA), node_nrw_monthly ...')

  const [branches, allNodes, nrwRows] = await Promise.all([
    fetchAll('branches', 'id,code,name_th').then((r) =>
      r.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
    ),
    fetchAll('water_nodes', 'id,branch_id,node_type,code,name_th,parent_id', (q) =>
      q.in('node_type', ['MM', 'DMA'])
    ),
    fetchAll('node_nrw_monthly', 'water_node_id,net_flow,distribute_all,nrw_pct', (q) =>
      q.eq('report_year', YEAR).eq('report_month', MONTH)
    ),
  ])

  const nrwByNode = new Map(nrwRows.map((r) => [r.water_node_id, r]))
  const nodeById = new Map(allNodes.map((n) => [n.id, n]))
  const nodesByBranch = new Map()
  for (const n of allNodes) {
    if (!nodesByBranch.has(n.branch_id)) nodesByBranch.set(n.branch_id, [])
    nodesByBranch.get(n.branch_id).push(n)
  }

  const mmCount = allNodes.filter((n) => n.node_type === 'MM').length
  const dmaCount = allNodes.filter((n) => n.node_type === 'DMA').length
  console.log(`branches=${branches.length}  MM=${mmCount}  DMA=${dmaCount}`)

  const wb = xlsx.utils.book_new()
  const usedNames = new Set()
  let totalRows = 0

  const typeOrder = { MM: 0, DMA: 1 }

  for (const branch of branches) {
    const nodes = (nodesByBranch.get(branch.id) ?? []).sort((a, b) => {
      if (a.node_type !== b.node_type) return typeOrder[a.node_type] - typeOrder[b.node_type]
      return (a.code ?? '').localeCompare(b.code ?? '', 'th')
    })
    if (nodes.length === 0) continue

    const sheetRows = nodes.map((n) => {
      const nrw = nrwByNode.get(n.id)
      const supply = nrw?.net_flow ?? null
      const sold = nrw?.distribute_all ?? null
      const loss = supply != null && sold != null ? Math.round((supply - sold) * 100) / 100 : ''
      const parent = n.parent_id ? nodeById.get(n.parent_id) : null
      return {
        'สาขา': branch.name_th,
        'ประเภท': n.node_type,
        'รหัส': n.code,
        'ชื่อ': n.name_th ?? '',
        'Node แม่': parent?.code ?? '',
        'น้ำจ่าย': supply ?? '',
        'น้ำขาย': sold ?? '',
        'นสส': loss,
        '%นสส': nrw?.nrw_pct ?? '',
      }
    })
    totalRows += sheetRows.length

    const ws = xlsx.utils.json_to_sheet(sheetRows)
    ws['!cols'] = [
      { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    ]
    xlsx.utils.book_append_sheet(wb, ws, safeSheetName(branch.name_th, usedNames))
  }

  const outPath = path.resolve(__dirname, `../mm_nrw_${YEAR}_${String(MONTH).padStart(2, '0')}.xlsx`)
  xlsx.writeFile(wb, outPath)
  console.log(`✅ Export สำเร็จ: ${outPath}`)
  console.log(`   ${wb.SheetNames.length} sheets, รวม ${totalRows} nodes (MM+DMA)`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
