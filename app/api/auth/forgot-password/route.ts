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
  const name = `${profile.name_first ?? ''} ${profile.name_last ?? ''}`.trim()
  const branch_name = profile.branch_name_th ?? ''

  if (!profile.password_hint) {
    // Employee exists but no hint stored → let them set a new password
    return NextResponse.json({ ok: true, no_hint: true, name, branch_name })
  }

  return NextResponse.json({ ok: true, no_hint: false, name, branch_name, password_hint: profile.password_hint })
}
