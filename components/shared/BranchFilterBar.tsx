'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Branch } from '@/lib/types'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'

interface Props {
  branches: Branch[]
  activeBranchId: string
  activeYear: number
  activeMonth: number
}

export function BranchFilterBar({ branches, activeBranchId, activeYear, activeMonth }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function nav(params: Record<string, string | number>) {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => {
      if (v === '' || v == null) next.delete(k)
      else next.set(k, String(v))
    })
    router.push(`${pathname}?${next.toString()}`)
  }

  const now = new Date()
  const years  = [0, 1, 2].map((i) => now.getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="flex flex-wrap gap-2">
      {branches.length > 0 && (
        <select
          value={activeBranchId}
          onChange={(e) => nav({ branch_id: e.target.value })}
          className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
        >
          <option value="">— ทุกสาขา —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name_th}</option>
          ))}
        </select>
      )}
      <select
        value={activeMonth}
        onChange={(e) => nav({ month: e.target.value })}
        className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
      >
        {months.map((m) => (
          <option key={m} value={m}>{getThaiMonthName(m)}</option>
        ))}
      </select>
      <select
        value={activeYear}
        onChange={(e) => nav({ year: e.target.value })}
        className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60"
      >
        {years.map((y) => (
          <option key={y} value={y}>{toThaiYear(y)}</option>
        ))}
      </select>
    </div>
  )
}
