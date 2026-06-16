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
  const { employee_id } = await req.json()
  if (!employee_id) {
    return NextResponse.json({ error: 'กรุณากรอกรหัสพนักงาน' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users_profile')
    .select('employee_id, name_first, name_last, branch_name_th, password_hint')
    .eq('employee_id', String(employee_id).trim())
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'ไม่พบรหัสพนักงานนี้ในระบบ' }, { status: 404 })
  }
  if (!profile.password_hint) {
    return NextResponse.json(
      { error: 'ยังไม่มีรหัสผ่านที่บันทึกไว้ — ลองล็อกอินปกติก่อน หรือติดต่อผู้ดูแลระบบ' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    ok: true,
    name: `${profile.name_first ?? ''} ${profile.name_last ?? ''}`.trim(),
    branch_name: profile.branch_name_th ?? '',
    password_hint: profile.password_hint,
  })
}
