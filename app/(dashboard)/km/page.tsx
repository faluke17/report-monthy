import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { KmCase } from '@/lib/types'
import { StatusPill } from '@/components/shared/StatusPill'
import { CodeBadge } from '@/components/shared/CodeBadge'
import { formatThaiNumber } from '@/lib/utils/date-th'
import { Plus, TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function KmPage() {
  const supabase = await createClient()
  const { data: cases } = await supabase
    .from('km_cases')
    .select('*, branches(*)')
    .order('created_at', { ascending: false })

  const rows = (cases ?? []) as KmCase[]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#12181F]">ความรู้ (KM Best Practice)</h1>
          <p className="text-sm text-black/50 mt-0.5">กรณีศึกษาการลด NRW ที่ประสบความสำเร็จ</p>
        </div>
        <Link
          href="/km/new"
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#FFFFFF] font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
          เพิ่ม KM Case
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="glass-card p-12 text-center text-black/30">ยังไม่มี KM Case</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((km) => (
            <div key={km.id} className="glass-card p-5 space-y-3 flex flex-col">
              <div className="flex items-start gap-2">
                <CodeBadge code={km.code} />
                <StatusPill status={km.verification_status} />
              </div>
              <h3 className="font-semibold text-[#12181F] leading-snug">{km.title}</h3>
              <p className="text-xs text-black/50">{km.branches?.name_th}</p>

              {km.approach_tags && km.approach_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {km.approach_tags.map((tag) => (
                    <span key={tag} className="text-xs bg-purple-500/15 text-purple-400 border border-purple-500/25 px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {km.nrw_before !== null && km.nrw_after !== null && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="num text-red-400">{km.nrw_before}%</span>
                  <TrendingDown size={14} className="text-green-400" />
                  <span className="num text-green-400 font-semibold">{km.nrw_after}%</span>
                  {km.water_saved_daily && (
                    <span className="text-xs text-black/40">
                      ประหยัด {formatThaiNumber(km.water_saved_daily, 0)} ลบ.ม./วัน
                    </span>
                  )}
                </div>
              )}

              {km.key_approach && (
                <p className="text-xs text-black/60 line-clamp-2">{km.key_approach}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
