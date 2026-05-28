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
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน' }, { status: 400 })
  }

  // Step 1: Verify credentials with Supabase Auth
  const anonClient = createAnonClient()
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: `${username}@pwa.local`,
    password,
  })

  if (authError || !authData?.user) {
    return NextResponse.json(
      { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ลงทะเบียน' },
      { status: 401 }
    )
  }

  // Step 2: Load profile (admin client bypasses RLS)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users_profile')
    .select('*, branches(name_th)')
    .eq('id', authData.user.id)
    .single()

  // Step 3: Profile missing — guide user to re-register with their existing password
  // (register route handles profile-only recovery when auth user already exists)
  if (!profile) {
    return NextResponse.json(
      {
        error: 'ไม่พบโปรไฟล์พนักงาน กรุณากรอกข้อมูลที่แท็บ "ลงทะเบียนครั้งแรก" โดยใช้รหัสพนักงานและรหัสผ่านเดิม',
        error_code: 'profile_missing',
        employee_id: username,
      },
      { status: 404 }
    )
  }

  // Step 4: Build session from profile
  const branchObj = profile.branches as { name_th: string } | null
  const session: PwaSession = {
    username:      profile.employee_id ?? username,
    name:          profile.name_first  ?? '',
    surname:       profile.name_last   ?? '',
    prefix_name:   '',
    costcenter:    profile.costcenter  ?? '',
    ba:            profile.ba          ?? '',
    part:          '',
    area:          '',
    wwcode:        profile.wwcode      ?? '',
    div_name:      '',
    job_name:      '',
    dep_name:      '',
    org_name:      'กปภ.เขต 10',
    position_name: '',
    level:         '',
    branch_name:   profile.branch_name_th ?? branchObj?.name_th ?? '',
  }

  const response = NextResponse.json({ ok: true, username: session.username, branch_name: session.branch_name })
  response.cookies.set(PWA_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    path:     '/',
    maxAge:   60 * 60 * 8, // 8 hours
  })
  return response
}
