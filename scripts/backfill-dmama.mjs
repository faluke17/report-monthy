// node --env-file=.env.local scripts/backfill-dmama.mjs
// Backfill 5 months of NRW data for all 26 branches:
//   Nov 2025, Dec 2025, Jan 2026, Feb 2026, Mar 2026
import { createClient } from '@supabase/supabase-js'

const DMAMA_API = 'https://dmama.pwa.co.th/api'
const SECTOR_ID = process.env.DMAMA_SECTOR_ID ?? '1'
const DISTRICT_ID = process.env.DMAMA_DISTRICT_ID ?? '10'

const MONTHS = [
  { year: 2025, month: 11 },
  { year: 2025, month: 12 },
  { year: 2026, month: 1  },
  { year: 2026, month: 2  },
  { year: 2026, month: 3  },
  { year: 2026, month: 4  },
]

const PWA_BRANCHES = [
  { name_th: 'นครสวรรค์',      dmama_branch_id: 29 },
  { name_th: 'ท่าตะโก',        dmama_branch_id: 30 },
  { name_th: 'ลาดยาว',         dmama_branch_id: 31 },
  { name_th: 'พยุหะคีรี',      dmama_branch_id: 32 },
  { name_th: 'ชัยนาท',         dmama_branch_id: 33 },
  { name_th: 'อุทัยธานี',      dmama_branch_id: 34 },
  { name_th: 'กำแพงเพชร',      dmama_branch_id: 35 },
  { name_th: 'ขาณุวรลักษบุรี', dmama_branch_id: 36 },
  { name_th: 'ตาก',            dmama_branch_id: 37 },
  { name_th: 'แม่สอด',         dmama_branch_id: 38 },
  { name_th: 'สุโขทัย',        dmama_branch_id: 39 },
  { name_th: 'ทุ่งเสลี่ยม',   dmama_branch_id: 40 },
  { name_th: 'ศรีสำโรง',       dmama_branch_id: 41 },
  { name_th: 'สวรรคโลก',       dmama_branch_id: 42 },
  { name_th: 'ศรีสัชนาลัย',   dmama_branch_id: 43 },
  { name_th: 'อุตรดิตถ์',      dmama_branch_id: 44 },
  { name_th: 'พิษณุโลก',       dmama_branch_id: 45 },
  { name_th: 'นครไทย',         dmama_branch_id: 46 },
  { name_th: 'พิจิตร',         dmama_branch_id: 47 },
  { name_th: 'บางมูลนาก',      dmama_branch_id: 48 },
  { name_th: 'ตะพานหิน',       dmama_branch_id: 49 },
  { name_th: 'เพชรบูรณ์',      dmama_branch_id: 50 },
  { name_th: 'หล่มสัก',        dmama_branch_id: 51 },
  { name_th: 'ชนแดน',          dmama_branch_id: 52 },
  { name_th: 'หนองไผ่',        dmama_branch_id: 53 },
  { name_th: 'วิเชียรบุรี',    dmama_branch_id: 54 },
]

function parseNumber(val) {
  if (!val) return null
  const n = parseFloat(val.replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function cleanLabel(label) {
  return label.replace(/[├└│]/g, '').replace(/\s+/g, ' ').trim()
}

function getDateRange(year, month) {
  const pad = (n) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${pad(month)}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

async function dmamaLogin() {
  const res = await fetch(`${DMAMA_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.DMAMA_USERNAME,
      password: process.env.DMAMA_PASSWORD,
      accept: true,
    }),
  })
  if (!res.ok) throw new Error(`dmama login HTTP ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('dmama login: no access_token')
  return data.access_token
}

async function fetchBranchNrw(token, branchId, from, to) {
  const params = new URLSearchParams({
    sector_id: SECTOR_ID,
    district_id: DISTRICT_ID,
    branch_id: String(branchId),
    from, to,
    date: from,
    frequency: '1440',
    year: from,
    filter_type: 'dma',
    m5: 'false',
    is_target: 'false',
    branches_has_formula: 'false',
    branch_is_potential: 'false',
    branch_is_hire_management: 'false',
    show_ois: 'true',
  })
  const res = await fetch(`${DMAMA_API}/report/non_revenue_water?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data.dataset ?? []
}

async function syncMonth(token, supabase, year, month) {
  const { from, to } = getDateRange(year, month)
  const pad = (n) => String(n).padStart(2, '0')
  console.log(`\n  [${year}-${pad(month)}] ${from} → ${to}`)

  const results = await Promise.allSettled(
    PWA_BRANCHES.map((b) => fetchBranchNrw(token, b.dmama_branch_id, from, to))
  )

  const records = []
  const fetched_at = new Date().toISOString()

  results.forEach((result, i) => {
    const branch = PWA_BRANCHES[i]
    if (result.status === 'rejected') {
      console.warn(`    WARN ${branch.name_th}(${branch.dmama_branch_id}): ${result.reason}`)
      return
    }
    for (const item of result.value) {
      records.push({
        dmama_branch_id: branch.dmama_branch_id,
        report_year: year,
        report_month: month,
        area_label: item.label,
        area_name: cleanLabel(item.label),
        outbound: parseNumber(item.value?.outbound),
        distribute_all: parseNumber(item.value?.distribute_all),
        fetched_at,
      })
    }
  })

  const ok = results.filter((r) => r.status === 'fulfilled').length
  const fail = results.filter((r) => r.status === 'rejected').length
  console.log(`  branches: ${ok} OK${fail ? ` / ${fail} FAIL` : ''} — ${records.length} records`)

  if (records.length === 0) return 0

  const { error } = await supabase
    .from('nrw_area_stats')
    .upsert(records, { onConflict: 'dmama_branch_id,report_year,report_month,area_label' })

  if (error) throw new Error(`Supabase upsert [${year}-${pad(month)}]: ${error.message}`)
  return records.length
}

async function main() {
  console.log('=== dmama NRW Backfill ===')
  console.log(`Months: ${MONTHS.map(m => `${m.year}-${String(m.month).padStart(2,'0')}`).join(', ')}`)
  console.log(`Branches: ${PWA_BRANCHES.length}`)

  const token = await dmamaLogin()
  console.log('Login OK\n')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  let total = 0
  for (const { year, month } of MONTHS) {
    const count = await syncMonth(token, supabase, year, month)
    total += count
  }

  console.log(`\n=== Done — ${total} records total ===`)
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })
