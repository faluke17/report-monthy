import { getPwaSession } from '@/lib/pwa-auth'
import { isSimAllowedUser } from '@/lib/sim-access'
import { createClient } from '@/lib/supabase/server'
import { getSimInventory } from '@/app/actions/sim-inventory'
import { SimInventoryClient } from '@/components/dashboard/SimInventoryClient'
import { Branch } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SimsPage() {
  const session = await getPwaSession()

  if (!isSimAllowedUser(session?.username)) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <ShieldAlert size={40} className="mx-auto text-[#B3392C]" />
        <h1 className="text-lg font-bold text-[#12181F]">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
        <p className="text-sm text-[#4B5563]">
          หน้า SIM &amp; Data Logger Inventory จำกัดสิทธิ์การเข้าถึงเฉพาะบุคคล
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const [items, branchesRes] = await Promise.all([
    getSimInventory(),
    supabase.from('branches').select('*').eq('is_active', true),
  ])

  // เรียงสาขาตามลำดับภูมิภาคจริง (นครสวรรค์ → วิเชียรบุรี) แทน a-z
  const branches = sortByPwaBranches((branchesRes.data ?? []) as Branch[])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#12181F]">SIM &amp; Data Logger Inventory</h1>
        <p className="text-sm text-black/50 mt-0.5">
          บันทึกว่า SIM แต่ละเบอร์อยู่ในอุปกรณ์ตัวไหน แยกตามสาขาและจุดติดตั้ง
        </p>
      </div>
      <SimInventoryClient items={items} branches={branches} />
    </div>
  )
}
