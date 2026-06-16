import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const clean = (s: string) => s.replace(/﻿/g, '').trim()

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
  const { employee_id, old_password, new_password } = await req.json()

  if (!employee_id || !old_password || !new_password) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 })
  }

  // Verify old password is correct
  const anon = createAnonClient()
  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email: `${employee_id}@pwa.local`,
    password: old_password,
  })

  if (signInError || !signInData?.user) {
    return NextResponse.json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Update password in Supabase Auth
  const { error: updateError } = await admin.auth.admin.updateUserById(signInData.user.id, {
    password: new_password,
  })

  if (updateError) {
    return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนรหัสผ่านได้' }, { status: 500 })
  }

  // Update password_hint in users_profile
  await admin
    .from('users_profile')
    .update({ password_hint: new_password })
    .eq('id', signInData.user.id)

  return NextResponse.json({ ok: true })
}
