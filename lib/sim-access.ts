// หน้า /sims (SIM & Data Logger Inventory) เห็นได้เฉพาะ 2 คนนี้เท่านั้น — ไม่ผูกกับ
// role ปกติ (region_admin/branch_manager/...) เพราะเป็น allowlist เฉพาะกิจตามที่ผู้ใช้ร้องขอ
// username ที่นี่คือ session.username จาก getPwaSession() (= employee_id ที่ login)
const SIM_ALLOWED_USERNAMES = ['18074', 'admin']

export function isSimAllowedUser(username: string | undefined | null): boolean {
  if (!username) return false
  return SIM_ALLOWED_USERNAMES.includes(username)
}
