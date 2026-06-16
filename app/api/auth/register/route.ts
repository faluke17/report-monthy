import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { PWA_SESSION_COOKIE, PwaSession } from '@/lib/pwa-auth'

// Strip BOM (U+FEFF) that PowerShell/Vercel CLI sometimes prepends to env values
const clean = (s: string) => s.replace(/﻿/g, '').trim()

const IS_PROD = process.env.NODE_ENV === 'production'

function createAnonClient() {
  return createSupabaseClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    { auth: { persistSession: false } }
  )
}

function createAdminClient() {
  return createSupabaseClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY!),
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

  // Look up branch UUID (safe: maybeSingle returns null instead of error when not found)
  const { data: branchRow } = await admin
    .from('branches')
    .select('id')
    .eq('name_th', branch_name)
    .maybeSingle()

  // Attempt to create Supabase auth user
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: `${employee_id}@pwa.local`,
    password,
    email_confirm: true,
    user_metadata: { full_name: `${name} ${surname}`, role: 'branch_staff' },
  })

  let userId: string

  if (createError) {
    const alreadyExists =
      createError.message.includes('already been registered') ||
      createError.message.includes('already exists')

    if (!alreadyExists) {
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการสร้างบัญชี', detail: createError.message },
        { status: 500 }
      )
    }

    // ── Profile-recovery path ──────────────────────────────────────────────
    // Auth user already exists. Verify password is correct, then check if
    // profile row is missing (DB reset scenario). If so, recreate the profile
    // using the data provided in this form — this is the ONLY way to get the
    // correct costcenter/branch info back, since it was never stored in auth
    // metadata.
    const anon = createAnonClient()
    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: `${employee_id}@pwa.local`,
      password,
    })

    if (signInError || !signInData?.user) {
      // Password mismatch — this is a genuine duplicate registration attempt
      return NextResponse.json({ error: 'รหัสพนักงานนี้ลงทะเบียนแล้ว' }, { status: 409 })
    }

    const { data: existingProfile } = await admin
      .from('users_profile')
      .select('id')
      .eq('id', signInData.user.id)
      .maybeSingle()

    if (existingProfile) {
      // Profile also exists — genuine duplicate
      return NextResponse.json({ error: 'รหัสพนักงานนี้ลงทะเบียนแล้ว' }, { status: 409 })
    }

    // Profile is missing but auth user exists → recover
    userId = signInData.user.id
  } else {
    userId = newUser.user.id
  }

  // Upsert profile with all employee fields
  const { error: profileError } = await admin.from('users_profile').upsert(
    {
      id:             userId,
      full_name:      `${name} ${surname}`,
      employee_id,
      name_first:     name,
      name_last:      surname,
      ba:             ba             ?? null,
      costcenter:     costcenter     ?? null,
      wwcode:         wwcode         ?? null,
      branch_name_th: branch_name,
      branch_id:      branchRow?.id  ?? null,
      role:           'branch_staff',
      password_hint:  password,
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return NextResponse.json(
      { error: 'ไม่สามารถบันทึกข้อมูลพนักงานได้', detail: profileError.message },
      { status: 500 }
    )
  }

  const session: PwaSession = {
    username:      employee_id,
    name,
    surname,
    prefix_name:   '',
    costcenter:    costcenter  ?? '',
    ba:            ba          ?? '',
    part:          '',
    area:          '',
    wwcode:        wwcode      ?? '',
    div_name:      '',
    job_name:      '',
    dep_name:      '',
    org_name:      'กปภ.เขต 10',
    position_name: '',
    level:         '',
    branch_name,
  }

  const response = NextResponse.json({ ok: true, username: employee_id, branch_name })
  response.cookies.set(PWA_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    path:     '/',
    maxAge:   60 * 60 * 8, // 8 hours
  })
  return response
}
