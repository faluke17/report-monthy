'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { getThaiMonthName } from '@/lib/utils/date-th'

interface Props {
  activeFiscalYear: number
  activeMonth: number
}

// Thai fiscal year months in order: Oct(10)→Nov(11)→...→Sep(9)
const FISCAL_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export function NrwReportFilterBar({ activeFiscalYear, activeMonth }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function nav(params: Record<string, string | number>) {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => next.set(k, String(v)))
    router.push(`${pathname}?${next.toString()}`)
  }

  const _now = new Date()
  const currentYear = _now.getMonth() >= 9
    ? _now.getFullYear() + 544   // Oct–Dec: already in next fiscal year
    : _now.getFullYear() + 543
  const fiscalYears = [currentYear - 2, currentYear - 1, currentYear]

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-white/40 font-medium">ปีงบ</span>
      {fiscalYears.map((y) => (
        <button
          key={y}
          onClick={() => nav({ year: y })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeFiscalYear === y
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
          }`}
        >
          {y}
        </button>
      ))}

      <div className="w-px h-5 bg-white/10 mx-1" />

      <span className="text-xs text-white/40 font-medium">เดือน</span>
      <select
        value={activeMonth}
        onChange={(e) => nav({ month: e.target.value })}
        className="bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/60"
      >
        {FISCAL_MONTHS.map((m) => (
          <option key={m} value={m}>{getThaiMonthName(m, true)}</option>
        ))}
      </select>
    </div>
  )
}
