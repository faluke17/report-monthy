import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { PWA_SESSION_COOKIE, PwaSession } from '@/lib/pwa-auth'

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const { employee_id, name, surname, branch_code, ba, costcenter, wwcode, branch_name, password } = await req.json()

  if (!employee_id || !name || !surname || !branch_code || !password) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Look up branch UUID
  const { data: branchRow } = await admin
    .from('branches')
    .select('id')
    .eq('code', branch_code)
    .single()

  // Create Supabase auth user
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: `${employee_id}@pwa.local`,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${name} ${surname}`, role: 'branch_staff' },
  })

  if (createError) {
    if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
      return NextResponse.json({ error: 'รหัสพนักงานนี้ลงทะเบียนแล้ว' }, { status: 409 })
    }
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างบัญชี', detail: createError.message }, { status: 500 })
  }

  // Update profile with employee details
  await admin.from('users_profile').update({
    employee_id,
    name_first: name,
    name_last: surname,
    ba,
    costcenter,
    wwcode,
    branch_name_th: branch_name,
    branch_id: branchRow?.id ?? null,
    role: 'branch_staff',
  }).eq('id', newUser.user.id)

  const session: PwaSession = {
    username: employee_id,
    name,
    surname,
    prefix_name: '',
    costcenter: costcenter ?? '',
    ba: ba ?? '',
    part: '',
    area: '',
    wwcode: wwcode ?? '',
    div_name: '',
    job_name: '',
    dep_name: '',
    org_name: 'กปภ.เขต 10',
    position_name: '',
    level: '',
    branch_name,
  }

  const response = NextResponse.json({ ok: true, username: employee_id, branch_name })
  response.cookies.set(PWA_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  return response
}
