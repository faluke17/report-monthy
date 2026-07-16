import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Branch } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { PdcaImportClient } from './_components/PdcaImportClient'

export const dynamic = 'force-dynamic'

export default async function PdcaImportPage() {
  const supabase = await createClient()

  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th, province_th')
    .eq('is_active', true)

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/pdca"
          className="flex items-center gap-1 text-sm text-black/50 hover:text-[#12181F] transition-colors"
        >
          <ChevronLeft size={16} />
          รายงานรายพื้นที่ PDCA
        </Link>
        <span className="text-black/20">/</span>
        <span className="text-sm text-[#12181F]">นำเข้าไฟล์ (.json)</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[#12181F]">นำเข้าไฟล์ PDCA (.json)</h1>
        <p className="text-sm text-black/40 mt-0.5">
          อัปโหลดไฟล์ที่ส่งออกจากเครื่องมือ PDCA รายพื้นที่แบบออฟไลน์ เพื่อดูสรุปเป็นแดชบอร์ดก่อนนำเข้าระบบ
        </p>
      </div>

      <PdcaImportClient branches={branches} />
    </div>
  )
}
