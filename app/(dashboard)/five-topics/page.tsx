import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'
import { Branch, FiveTopicsReport } from '@/lib/types'
import { sortByPwaBranches } from '@/lib/utils/pwa-branches'
import { BranchFilterBar } from '@/components/shared/BranchFilterBar'
import { Plus, CheckCircle2, Circle, Eye } from 'lucide-react'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import { deleteFiveTopicsReport } from '@/app/actions/five-topics'

export const dynamic = 'force-dynamic'

function topicFilled(r: FiveTopicsReport): boolean[] {
  return [
    r.t1_dma_count != null,
    r.t2_leak_points != null,
    r.t3_dma_pm_count != null,
    r.t4_flush_points != null,
    r.t5_meters_replaced != null,
  ]
}

export default async function FiveTopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ branch_id?: string; year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const session = await getPwaSession()
  const now = new Date()

  const { data: branchData } = await supabase
    .from('branches')
    .select('id, code, name_th, province_th')
    .eq('is_active', true)

  const branches = sortByPwaBranches((branchData ?? []) as Branch[])
  const matchedBranch = branches.find((b) => b.name_th === session?.branch_name)
  const isBranchUser = !!matchedBranch
  const isRegionUser = !isBranchUser
  const showBranchFilter = isRegionUser

  const { branch_id, year, month } = await searchParams
  const filterYear  = parseInt(year  ?? '') || now.getFullYear()
  const filterMonth = parseInt(month ?? '') || now.getMonth() + 1
  const filterBranchId = isBranchUser
    ? matchedBranch.id
    : (branch_id ?? '')

  let query = supabase
    .from('five_topics_reports')
    .select('*, branches(name_th, code)')
    .eq('report_year', filterYear)
    .eq('report_month', filterMonth)
    .order('created_at', { ascending: false })

  if (filterBranchId) query = query.eq('branch_id', filterBranchId)

  const { data } = await query
  const rows = (data ?? []) as FiveTopicsReport[]

  const activeBranchName = filterBranchId
    ? branches.find((b) => b.id === filterBranchId)?.name_th
    : undefined

  return (
    <div className="space-y-5 animate-fadein">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">รายงาน 5 หัวข้อ</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {getThaiMonthName(filterMonth)} {toThaiYear(filterYear)}
            {activeBranchName ? ` · ${activeBranchName}` : ''}
          </p>
        </div>
        <Link
          href="/five-topics/new"
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          <Plus size={15} />
          เพิ่มรายงาน
        </Link>
      </div>

      {/* Filters */}
      <BranchFilterBar
        branches={showBranchFilter ? branches : []}
        activeBranchId={filterBranchId}
        activeYear={filterYear}
        activeMonth={filterMonth}
      />

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-white/30 text-sm">
            ยังไม่มีรายงาน 5 หัวข้อสำหรับเดือนนี้
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="px-4 py-3 text-left font-medium">สาขา</th>
                <th className="px-4 py-3 text-left font-medium">เดือน/ปี</th>
                <th className="px-4 py-3 text-center font-medium">ข้อ 1</th>
                <th className="px-4 py-3 text-center font-medium">ข้อ 2</th>
                <th className="px-4 py-3 text-center font-medium">ข้อ 3</th>
                <th className="px-4 py-3 text-center font-medium">ข้อ 4</th>
                <th className="px-4 py-3 text-center font-medium">ข้อ 5</th>
                <th className="px-4 py-3 text-center font-medium">สถานะ</th>
                <th className="px-4 py-3 text-center font-medium">รายละเอียด</th>
                {isRegionUser && <th className="px-4 py-3 text-center font-medium">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const filled = topicFilled(r)
                const filledCount = filled.filter(Boolean).length
                return (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/five-topics/${r.id}`} className="font-medium text-white hover:text-cyan-300 transition-colors">
                        {r.branches?.name_th ?? '—'}
                      </Link>
                      <span className="ml-1.5 text-[11px] text-white/35">{r.branches?.code}</span>
                    </td>
                    <td className="px-4 py-3 text-white/70 num">
                      {getThaiMonthName(r.report_month)} {toThaiYear(r.report_year)}
                    </td>
                    {filled.map((ok, i) => (
                      <td key={i} className="px-4 py-3 text-center">
                        {ok
                          ? <CheckCircle2 size={16} className="text-green-400 mx-auto" />
                          : <Circle size={16} className="text-white/20 mx-auto" />}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      {r.status === 'submitted' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-green-500/15 text-green-400 border border-green-500/25">
                          ส่งแล้ว ({filledCount}/5)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          แบบร่าง
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/five-topics/${r.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-400/40 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Eye size={12} />
                        ดูรายละเอียด
                      </Link>
                    </td>
                    {isRegionUser && (
                      <td className="px-4 py-3 text-center">
                        <DeleteButton id={r.id} />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function DeleteButton({ id }: { id: string }) {
  async function handleDelete() {
    'use server'
    await deleteFiveTopicsReport(id)
  }
  return (
    <form action={handleDelete}>
      <button
        type="submit"
        className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1"
      >
        ลบ
      </button>
    </form>
  )
}
