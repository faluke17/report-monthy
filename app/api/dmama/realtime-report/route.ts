import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { PWA_BRANCHES } from '@/lib/utils/pwa-branches'

const DMAMA_API = 'https://dmama.pwa.co.th/api'

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

async function dmamaLogin(): Promise<string> {
  const res = await fetch(`${DMAMA_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.DMAMA_USERNAME,
      password: process.env.DMAMA_PASSWORD,
      accept: true,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error('no access_token')
  return data.access_token as string
}

type RealtimeNode = {
  name: string
  code: string
  value?: {
    customer?: { value: number | string | null }
    p1in?: { value: number | string | null }
    flow?: { value: number | string | null }
    pressure?: { value: number | string | null }
    flowacc?: { value: number | string | null }
    datetime?: { value: string | null }
  }
}

async function fetchBranchRealtime(token: string, branchId: number): Promise<RealtimeNode[]> {
  const res = await fetch(
    `${DMAMA_API}/dashboard/realtime_grid?page=1&branch=${branchId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.data ?? []) as RealtimeNode[]
}

type ReportRow = {
  สาขา: string
  จุดติดตั้ง: string
  'ผชน. (ราย)': number | string | null
  'P in (bar)': number | string | null
  'Flow (m³/hr)': number | string | null
  'P out (bar)': number | string | null
  'Totalizer (m³)': number | string | null
  วันเวลาอัพเดท: string | null
}

async function buildReportRows(token: string): Promise<{ rows: ReportRow[]; failedBranches: string[] }> {
  const rows: ReportRow[] = []
  const failedBranches: string[] = []

  for (const branch of PWA_BRANCHES) {
    try {
      const nodes = await withRetry(() => fetchBranchRealtime(token, branch.dmama_branch_id))
      for (const node of nodes) {
        rows.push({
          สาขา: branch.name_th,
          จุดติดตั้ง: node.name,
          'ผชน. (ราย)': node.value?.customer?.value ?? null,
          'P in (bar)': node.value?.p1in?.value ?? null,
          'Flow (m³/hr)': node.value?.flow?.value ?? null,
          'P out (bar)': node.value?.pressure?.value ?? null,
          'Totalizer (m³)': node.value?.flowacc?.value ?? null,
          วันเวลาอัพเดท: node.value?.datetime?.value ?? null,
        })
      }
    } catch {
      failedBranches.push(branch.name_th)
    }
  }

  return { rows, failedBranches }
}

function buildExcelBuffer(rows: ReportRow[]): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Realtime DMAMA')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

async function sendToTelegram(buffer: Buffer, filename: string, caption: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured')

  const form = new FormData()
  form.append('chat_id', chatId)
  form.append('caption', caption)
  form.append(
    'document',
    new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  )

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Telegram HTTP ${res.status}: ${text}`)
  }
}

// GET/POST /api/dmama/realtime-report
// ดึงข้อมูลหน้า "Realtime" ของ DMAMA (endpoint: /dashboard/realtime_grid) ทั้ง 26 สาขา
// รวมเป็นไฟล์ Excel เดียว แล้วส่งเข้า Telegram
// เรียกทุกวัน 18:00 UTC (01:00 Bangkok) ผ่าน GitHub Actions scheduled workflow
// (.github/workflows/dmama-realtime-report.yml) — POST + header x-sync-secret: <REALTIME_REPORT_SECRET>
// (secret แยกจาก DMAMA_SYNC_SECRET เดิม เพื่อไม่ปนกับ route sync อื่น)
async function handler(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET
  const syncSecret = process.env.REALTIME_REPORT_SECRET
  const authHeader = req.headers.get('authorization')
  const syncHeader = req.headers.get('x-sync-secret')

  const okCron = cronSecret && authHeader === `Bearer ${cronSecret}`
  const okManual = syncSecret && syncHeader === syncSecret
  if (!okCron && !okManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let token: string
  try {
    token = await withRetry(() => dmamaLogin())
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: `dmama login: ${msg}` }, { status: 502 })
  }

  const { rows, failedBranches } = await buildReportRows(token)

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'no data fetched', failedBranches },
      { status: 502 },
    )
  }

  const now = new Date()
  const dateLabel = now.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
  const filename = `dmama-realtime-${now.toISOString().slice(0, 10)}.xlsx`
  const caption =
    `📊 รายงาน Realtime DMAMA ประจำวันที่ ${dateLabel}\n` +
    `จุดติดตั้งทั้งหมด: ${rows.length} จุด (${PWA_BRANCHES.length - failedBranches.length}/${PWA_BRANCHES.length} สาขา)` +
    (failedBranches.length > 0 ? `\n⚠️ ดึงไม่ได้: ${failedBranches.join(', ')}` : '')

  const buffer = buildExcelBuffer(rows)

  try {
    await sendToTelegram(buffer, filename, caption)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json(
      { error: `telegram send: ${msg}`, rowCount: rows.length, failedBranches },
      { status: 502 },
    )
  }

  return NextResponse.json({ ok: true, rowCount: rows.length, failedBranches })
}

export async function GET(req: NextRequest) {
  return handler(req)
}

export async function POST(req: NextRequest) {
  return handler(req)
}
