// node --env-file=.env.local scripts/import-sim-inventory.mjs "C:/path/to/SIM Data Logger Inventory Management.xlsx"
// Import ข้อมูล SIM & Data Logger Inventory จากไฟล์ Excel ต้นฉบับเข้า sim_inventory
// (รันครั้งเดียวตอน setup หน้า /sims — ถ้ารันซ้ำจะ insert ซ้ำ เพราะไม่มี unique key ให้ upsert)
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const filePath = process.argv[2]
if (!filePath) {
  console.error('ใช้งาน: node --env-file=.env.local scripts/import-sim-inventory.mjs "<path to .xlsx>"')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

function normalizeNetwork(v) {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null
  const upper = s.toUpperCase()
  if (['AIS', 'TRUE', 'DTAC'].includes(upper)) return upper
  return s
}

async function main() {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const data = rows.slice(2) // ข้ามแถวชื่อเรื่อง + แถวหัวคอลัมน์

  const { data: branches, error: branchErr } = await supabase.from('branches').select('id, name_th')
  if (branchErr) throw branchErr
  const branchByName = new Map(branches.map((b) => [b.name_th, b.id]))

  const unmatchedBranches = new Set()
  const records = data
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => {
      const [seq, , branchRaw, devicePoint, phone, serial, network] = r
      const branchRawStr = String(branchRaw ?? '').trim()
      const strippedName = branchRawStr.startsWith('สาขา') ? branchRawStr.slice(4) : branchRawStr
      const branchId = branchByName.get(strippedName) ?? null
      if (!branchId && branchRawStr && branchRawStr !== '-' && branchRawStr !== 'งานน้ำสูญเสีย กรจ.10') {
        unmatchedBranches.add(branchRawStr)
      }
      return {
        seq: Number(seq) || null,
        branch_id: branchId,
        branch_label: branchRawStr || '-',
        device_point: String(devicePoint ?? '').trim(),
        phone_number: String(phone ?? '').trim() || null,
        // Serial No. เก็บเป็น TEXT เสมอ — เลข ICCID ยาว (>15 หลัก) บางแถวถูก Excel ปัดเศษ
        // ไปแล้วตั้งแต่ไฟล์ต้นฉบับ (คอลัมน์เป็น number type) กู้คืนความแม่นยำที่หายไม่ได้
        serial_no: serial === '' || serial === null || serial === undefined ? null : String(serial),
        network: normalizeNetwork(network),
        created_by: 'import-script',
        updated_by: 'import-script',
      }
    })

  if (unmatchedBranches.size > 0) {
    console.warn('⚠ ไม่พบสาขาที่ตรงกับชื่อนี้ใน branches table (บันทึกแบบไม่ผูก branch_id):', [...unmatchedBranches])
  }

  console.log(`กำลัง import ${records.length} แถว...`)

  const CHUNK = 200
  let inserted = 0
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const { error } = await supabase.from('sim_inventory').insert(chunk)
    if (error) throw error
    inserted += chunk.length
    console.log(`  ...${inserted}/${records.length}`)
  }

  console.log(`✅ import สำเร็จ ${inserted} แถว`)
}

main().catch((e) => {
  console.error('❌ import ล้มเหลว:', e.message)
  process.exit(1)
})
