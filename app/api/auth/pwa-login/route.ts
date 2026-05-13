import { NextRequest, NextResponse } from 'next/server'
import { PWA_SESSION_COOKIE, PwaSession } from '@/lib/pwa-auth'
import { getBranchName } from '@/lib/utils/pwa-branches'

export const runtime = 'edge'

const PWA_API = 'https://intranet.pwa.co.th/login/webservice_reg10.php'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านและรหัสพนักงาน' }, { status: 400 })
  }

  let raw: string
  try {
    const res = await fetch(`${PWA_API}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://intranet.pwa.co.th/',
      },
    })
    raw = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'ไม่สามารถเชื่อมต่อระบบ กปภ. ได้', detail: msg }, { status: 502 })
  }

  // PWA API wraps JSON with 1 leading char and 2 trailing chars
  const jsonStr = raw.slice(1, -2)
  let data: Record<string, string>
  try {
    data = JSON.parse(jsonStr)
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลจาก กปภ. ผิดพลาด' }, { status: 502 })
  }

  if (data['check'] !== 'Pass') {
    return NextResponse.json({ error: 'รหัสผ่านหรือรหัสพนักงานไม่ถูกต้อง' }, { status: 401 })
  }

  const costcenter = data['costcenter'] ?? ''
  // PWA API: ba field = 4-digit branch costcenter, wwcode = 7-digit ba code
  const ba = data['ba'] ?? ''
  const wwcode = data['wwcode'] ?? ''

  const session: PwaSession = {
    username: data['user'] ?? username,
    name: data['Name'] ?? '',
    surname: data['Surname'] ?? '',
    prefix_name: data['Gender'] ?? '',
    costcenter,
    ba,
    part: data['part'] ?? '',
    area: data['area'] ?? '',
    wwcode,
    div_name: data['div_name'] ?? '',
    job_name: data['Job_name'] ?? '',
    dep_name: data['dep_name'] ?? '',
    org_name: data['org_name'] ?? '',
    position_name: data['Position'] ?? '',
    level: data['MyLevel'] ?? '',
    branch_name: getBranchName(ba || costcenter, wwcode),
  }

  const response = NextResponse.json({ ok: true, username: session.username, branch_name: session.branch_name })
  response.cookies.set(PWA_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return response
}
