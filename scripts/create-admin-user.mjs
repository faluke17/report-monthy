// node --env-file=.env.local scripts/create-admin-user.mjs
// สร้าง user "admin" (login employee_id=admin, password=admin123) สำหรับเข้าหน้า /sims
// ตามที่ผู้ใช้ระบุ — mirror logic เดียวกับ app/api/auth/register/route.ts
import { createClient } from '@supabase/supabase-js'

const EMPLOYEE_ID = 'admin'
const PASSWORD = 'admin123'
const FULL_NAME = 'Admin (SIM Inventory)'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: `${EMPLOYEE_ID}@pwa.local`,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME, role: 'region_viewer' },
  })

  let userId
  if (createErr) {
    const alreadyExists = createErr.message.includes('already been registered') || createErr.message.includes('already exists')
    if (!alreadyExists) throw createErr
    console.log('ℹ user "admin" มีอยู่แล้วใน Supabase Auth — จะอัปเดต profile ให้แทน')
    const { data: list, error: listErr } = await admin.auth.admin.listUsers()
    if (listErr) throw listErr
    const existing = list.users.find((u) => u.email === `${EMPLOYEE_ID}@pwa.local`)
    if (!existing) throw new Error('หา user เดิมไม่เจอ')
    userId = existing.id
    // user เดิมมีอยู่แล้ว — บังคับตั้งรหัสผ่านเป็น admin123 ตามที่ระบุ เผื่อรหัสเดิมไม่ตรง
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, { password: PASSWORD })
    if (pwErr) throw pwErr
    console.log('ℹ ตั้งรหัสผ่านเป็น admin123 ให้เรียบร้อยแล้ว')
  } else {
    userId = created.user.id
  }

  const { error: profileErr } = await admin.from('users_profile').upsert(
    {
      id: userId,
      full_name: FULL_NAME,
      employee_id: EMPLOYEE_ID,
      name_first: 'Admin',
      name_last: 'SIM',
      costcenter: null,
      branch_id: null,
      role: 'region_viewer',
      password_hint: PASSWORD,
    },
    { onConflict: 'id' }
  )
  if (profileErr) throw profileErr

  console.log(`✅ สร้าง/อัปเดต user "admin" สำเร็จ (login: employee_id=admin, password=${PASSWORD})`)
}

main().catch((e) => {
  console.error('❌ ล้มเหลว:', e.message)
  process.exit(1)
})
