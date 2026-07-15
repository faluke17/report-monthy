/**
 * Export node_nrw_monthly (มิ.ย. 2569 / June 2026) ทุกสาขา + DMA → Excel
 * Run: node --env-file=.env.local scripts/export-node-nrw-202606.mjs
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

async function main() {
  console.log('กำลังดึงข้อมูล branches, water_nodes, node_nrw_monthly ...')

  const [branches, nodes, nrwRows] = await Promise.all([
    fetchAll('branches', 'id,code,name_th'),
    fetchAll('water_nodes', 'id,branch_id,node_type,code,name_th,parent_id,status,user_count,is_active,logger_id,self_supply,dmama_area_label'),
    fetchAll('node_nrw_monthly', '*', (q) => q.eq('report_year', YEAR).eq('report_month', MONTH)),
  ])

  const branchMap = new Map(branches.map((b) => [b.id, b]))
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const nrwByNode = new Map(nrwRows.map((r) => [r.water_node_id, r]))

  console.log(`branches=${branches.length}  water_nodes=${nodes.length}  node_nrw_monthly(${YEAR}-${MONTH})=${nrwRows.length}`)

  // เรียงตาม สาขา → MM → DMA/SUB
  const typeOrder = { MM: 0, SUB: 1, DMA: 2, VD: 3 }
  const sortedNodes = [...nodes].sort((a, b) => {
    const ba = branchMap.get(a.branch_id)?.name_th ?? ''
    const bb = branchMap.get(b.branch_id)?.name_th ?? ''
    if (ba !== bb) return ba.localeCompare(bb, 'th')
    if (a.node_type !== b.node_type) return (typeOrder[a.node_type] ?? 9) - (typeOrder[b.node_type] ?? 9)
    return (a.code ?? '').localeCompare(b.code ?? '', 'th')
  })

  const sheetRows = sortedNodes.map((n) => {
    const branch = branchMap.get(n.branch_id)
    const parent = n.parent_id ? nodeMap.get(n.parent_id) : null
    const nrw = nrwByNode.get(n.id)
    return {
      'สาขา': branch?.name_th ?? '',
      'รหัสสาขา': branch?.code ?? '',
      'ประเภท Node': n.node_type,
      'รหัส Node': n.code,
      'ชื่อ Node': n.name_th ?? '',
      'Node แม่': parent?.name_th ?? '',
      'สถานะ': n.status ?? '',
      'จำนวนผู้ใช้น้ำ': n.user_count ?? '',
      'Logger ID': n.logger_id ?? '',
      'จ่ายเอง (self supply)': n.self_supply ? 'ใช่' : '',
      'DMAMA Area Label': n.dmama_area_label ?? '',
      'มีข้อมูล NRW เดือนนี้': nrw ? 'มี' : 'ไม่มี',
      'ปริมาณน้ำจ่ายรวม (gross_flow)': nrw?.gross_flow ?? '',
      'ปริมาณน้ำจ่ายสุทธิ (net_flow)': nrw?.net_flow ?? '',
      'ปริมาณน้ำจำหน่าย (distribute_all)': nrw?.distribute_all ?? '',
      'NRW %': nrw?.nrw_pct ?? '',
      'จำนวนวันที่มีข้อมูล': nrw?.days_data ?? '',
      'จำนวนวันทั้งหมด': nrw?.days_total ?? '',
      'มี Device Fail': nrw?.has_device_fail ? 'ใช่' : '',
      'แหล่งข้อมูล': nrw?.data_source ?? '',
    }
  })

  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.json_to_sheet(sheetRows)
  ws['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 22 },
    { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
  ]
  xlsx.utils.book_append_sheet(wb, ws, `NRW ${MONTH}-${YEAR}`)

  const outPath = path.resolve(__dirname, `../node_nrw_${YEAR}_${String(MONTH).padStart(2, '0')}.xlsx`)
  xlsx.writeFile(wb, outPath)
  console.log(`✅ Export สำเร็จ: ${outPath}`)
  console.log(`   ทั้งหมด ${sheetRows.length} nodes`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
