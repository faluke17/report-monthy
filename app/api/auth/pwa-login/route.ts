import { NextRequest, NextResponse } from 'next/server'
import { PWA_SESSION_COOKIE, PwaSession } from '@/lib/pwa-auth'
import { getBranchName } from '@/lib/utils/pwa-branches'

const PWA_PROXY = 'https://pwa-proxy.taweechai-chairat.workers.dev'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'กรุณากรอกรหัสผ่านและรหัสพนักงาน' }, { status: 400 })
  }

  let raw: string
  try {
    const res = await fetch(PWA_PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-secret': process.env.PWA_PROXY_SECRET ?? '',
      },
      body: JSON.stringify({ username, password }),
    })
    raw = await res.text()
    if (!res.ok) {
      const err = JSON.parse(raw)
      return NextResponse.json({ error: err.error ?? 'ไม่สามารถเชื่อมต่อระบบ กปภ. ได้' }, { status: 502 })
    }
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
