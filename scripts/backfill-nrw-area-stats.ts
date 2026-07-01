/**
 * Backfill nrw_area_stats
 * ช่วง ต.ค. 2567 (Oct 2024) → พ.ค. 2569 (May 2026)
 *
 * รัน: npx tsx scripts/backfill-nrw-area-stats.ts
 * หรือ production: BASE_URL=https://your-app.vercel.app npx tsx scripts/backfill-nrw-area-stats.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const BASE_URL    = process.env.BASE_URL ?? 'http://localhost:3000'
const SYNC_SECRET = process.env.DMAMA_SYNC_SECRET ?? ''

if (!SYNC_SECRET) {
  console.error('❌  DMAMA_SYNC_SECRET ไม่ได้ตั้งค่าใน .env.local')
  process.exit(1)
}

function monthRange(
  startYear: number, startMonth: number,
  endYear:   number, endMonth:   number,
): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = []
  let y = startYear, m = startMonth
  while (y < endYear || (y === endYear && m <= endMonth)) {
    result.push({ year: y, month: m })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return result
}

// ต.ค. 2024 → พ.ค. 2026
const MONTHS = monthRange(2024, 10, 2026, 5)

async function syncMonth(year: number, month: number): Promise<void> {
  const label = `${year}-${String(month).padStart(2, '0')}`
  const t0 = Date.now()
  process.stdout.write(`  ⏳  ${label} ...`)

  const res = await fetch(`${BASE_URL}/api/dmama/sync`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-sync-secret': SYNC_SECRET,
    },
    body: JSON.stringify({ year, month }),
    signal: AbortSignal.timeout(120_000),
  })

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.log(` ❌  HTTP ${res.status}  [${elapsed}s]\n       ${text.slice(0, 120)}`)
    return
  }

  const data = await res.json() as Record<string, unknown>

  if (data.ok) {
    console.log(
      ` ✅  synced=${data.synced}  branches_ok=${data.branches_ok}` +
      (data.branches_failed ? `  failed=${data.branches_failed}` : '') +
      `  [${elapsed}s]`,
    )
  } else {
    const errs = (data.errors as string[] | undefined)?.slice(0, 3).join(' | ') ?? data.error ?? ''
    console.log(` ⚠️   ${errs}  [${elapsed}s]`)
  }
}

async function main() {
  const first = MONTHS[0]
  const last  = MONTHS.at(-1)!
  console.log(`\n🚀  Backfill nrw-area-stats  ${BASE_URL}`)
  console.log(`   ${MONTHS.length} เดือน: ${first.year}-${String(first.month).padStart(2,'0')} → ${last.year}-${String(last.month).padStart(2,'0')}\n`)

  for (let i = 0; i < MONTHS.length; i++) {
    const { year, month } = MONTHS[i]
    process.stdout.write(`[${String(i + 1).padStart(2)}/${MONTHS.length}]`)
    await syncMonth(year, month)
  }

  console.log('\n✅  เสร็จสิ้น — รัน backfill-flow.ts ต่อเพื่ออัปเดต distribute_all ใน node_nrw_monthly')
}

main().catch(e => { console.error(e); process.exit(1) })
