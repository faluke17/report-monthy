'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toThaiYear } from '@/lib/utils/date-th'

const MONTH_LABELS = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.',
  'พ.ค.','มิ.ย.','ก.ค.','ส.ค.',
  'ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
]

export function MonthYearPicker({ activeYear, activeMonth }: { activeYear: number; activeMonth: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const now = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  function nav(year: number, month: number) {
    const next = new URLSearchParams(searchParams.toString())
    next.set('year', String(year))
    next.set('month', String(month))
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Year selector */}
      <div className="flex items-center gap-1 bg-black/5 border border-black/10 rounded-xl px-2 py-1.5">
        <button
          onClick={() => nav(activeYear - 1, activeMonth)}
          disabled={activeYear <= currentYear - 2}
          className="text-black/40 hover:text-[#12181F] disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-0.5"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="num text-sm font-semibold text-[#12181F] px-1.5 min-w-[3.5rem] text-center">
          {toThaiYear(activeYear)}
        </span>
        <button
          onClick={() => nav(activeYear + 1, activeMonth)}
          disabled={activeYear >= currentYear}
          className="text-black/40 hover:text-[#12181F] disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-0.5"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Month pills */}
      <div className="flex flex-wrap gap-1.5">
        {MONTH_LABELS.map((label, i) => {
          const m = i + 1
          const selected = m === activeMonth
          const future   = activeYear === currentYear && m > currentMonth
          return (
            <button
              key={m}
              onClick={() => nav(activeYear, m)}
              disabled={future}
              className={
                selected
                  ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-[#FFFFFF] shadow-[0_0_12px_rgba(11,110,118,0.4)] transition-all'
                  : future
                  ? 'px-3 py-1.5 rounded-xl text-xs text-black/20 cursor-not-allowed'
                  : 'px-3 py-1.5 rounded-xl text-xs text-black/50 bg-black/5 hover:bg-black/10 hover:text-[#12181F] transition-all'
              }
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
