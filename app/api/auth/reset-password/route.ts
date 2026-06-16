import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const clean = (s: string) => s.replace(/﻿/g, '').trim()

function createAdminClient() {
  return createSupabaseClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY!),
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const { employee_id, new_password } = await req.json()

  if (!employee_id || !new_password) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Look up auth user by email convention
  const { data: { users }, error: listError } = await admin.auth.admin.listUsers()
  if (listError) {
    return NextResponse.json({ error: 'ไม่สามารถเข้าถึงระบบได้' }, { status: 500 })
  }

  const authUser = users.find(u => u.email === `${employee_id}@pwa.local`)
  if (!authUser) {
    return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' }, { status: 404 })
  }

  // Reset password via admin (no old password needed)
  const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
    password: new_password,
  })
  if (updateError) {
    return NextResponse.json({ error: 'ไม่สามารถรีเซ็ตรหัสผ่านได้' }, { status: 500 })
  }

  // Persist hint for future lookups
  await admin
    .from('users_profile')
    .update({ password_hint: new_password })
    .eq('id', authUser.id)

  return NextResponse.json({ ok: true })
}
