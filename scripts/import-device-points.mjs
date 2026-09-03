// node --env-file=.env.local scripts/import-device-points.mjs "C:/path/to/รายงานความผิดปกติของอุปกรณ์ Data Logger.xlsx"
// Import รายชื่อจุดติดตั้งอุปกรณ์ (DMA/MM/P3) ทางการของแต่ละสาขา เข้า sim_device_points
// ใช้เป็นแหล่งข้อมูล dropdown ในฟอร์มเพิ่ม/แก้ไข SIM หน้า /sims
// (รันครั้งเดียวตอน setup — ใช้ upsert ผูก unique(branch_label, device_point) จึงรันซ้ำได้ปลอดภัย)
//
// นอกจากนำเข้าไฟล์ Excel (source='catalog') สคริปต์จะ backfill จุดติดตั้งที่มีอยู่แล้วใน
// sim_inventory แต่ไม่อยู่ในไฟล์ Excel ด้วย (source='existing') กันไม่ให้ของเดิมหายไปจาก dropdown
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const filePath = process.argv[2]
if (!filePath) {
  console.error('ใช้งาน: node --env-file=.env.local scripts/import-device-points.mjs "<path to .xlsx>"')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function main() {
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const data = rows.slice(2) // ข้ามแถวชื่อเรื่อง + แถวหัวคอลัมน์ ("กปภ.สาขา" / "จุดติดตั้งอุปกรณ์ DMA")

  const { data: branches, error: branchErr } = await supabase.from('branches').select('id, name_th')
  if (branchErr) throw branchErr
  const branchByName = new Map(branches.map((b) => [b.name_th, b.id]))

  const unmatchedBranches = new Set()
  const seen = new Set() // กันแถวซ้ำภายในไฟล์เดียวกัน (branch_label|device_point)
  const catalogRecords = data
    .filter((r) => r[0] && r[1])
    .map((r) => {
      const branchRawStr = String(r[0]).trim()
      const devicePoint = String(r[1]).trim()
      const strippedName = branchRawStr.startsWith('สาขา') ? branchRawStr.slice(4) : branchRawStr
      const branchId = branchByName.get(strippedName) ?? null
      if (!branchId) unmatchedBranches.add(branchRawStr)
      return { branch_id: branchId, branch_label: branchRawStr, device_point: devicePoint, source: 'catalog', created_by: 'import-script' }
    })
    .filter((r) => {
      const key = `${r.branch_label}|${r.device_point}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  if (unmatchedBranches.size > 0) {
    console.warn('⚠ ไม่พบสาขาที่ตรงกับชื่อนี้ใน branches table (บันทึกแบบไม่ผูก branch_id):', [...unmatchedBranches])
  }

  // backfill จาก sim_inventory: จุดติดตั้งที่มีอยู่แล้วแต่ไม่อยู่ในไฟล์ Excel
  const { data: existingSims, error: simErr } = await supabase
    .from('sim_inventory')
    .select('branch_id, branch_label, device_point')
  if (simErr) throw simErr

  const existingRecords = []
  const existingSeen = new Set()
  for (const s of existingSims ?? []) {
    const devicePoint = String(s.device_point ?? '').trim()
    if (!devicePoint) continue
    const key = `${s.branch_label}|${devicePoint}`
    if (seen.has(key) || existingSeen.has(key)) continue
    existingSeen.add(key)
    existingRecords.push({
      branch_id: s.branch_id,
      branch_label: s.branch_label,
      device_point: devicePoint,
      source: 'existing',
      created_by: 'import-script',
    })
  }

  const records = [...catalogRecords, ...existingRecords]
  console.log(`กำลัง import ${catalogRecords.length} จุดจากไฟล์ + backfill ${existingRecords.length} จุดจาก sim_inventory เดิม = ${records.length} แถว...`)

  const CHUNK = 200
  let inserted = 0
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('sim_device_points')
      .upsert(chunk, { onConflict: 'branch_label,device_point', ignoreDuplicates: true })
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
