'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Branch } from '@/lib/types'

const CATEGORIES = ['MM', 'DMA', 'P3', 'อื่นๆ'] as const

interface Props {
  branches: Branch[]
  activeBranchId: string
  activeCategory: string
  showClosed: boolean
}

export function ObstacleFilterBar({ branches, activeBranchId, activeCategory, showClosed }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function nav(params: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => {
      if (!v) next.delete(k)
      else next.set(k, v)
    })
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {branches.length > 0 && (
        <select
          value={activeBranchId}
          onChange={(e) => nav({ branch_id: e.target.value })}
          className="bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
        >
          <option value="">— ทุกสาขา —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name_th}</option>
          ))}
        </select>
      )}

      <select
        value={activeCategory}
        onChange={(e) => nav({ category: e.target.value })}
        className="bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
      >
        <option value="">— ทุกหมวด —</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <button
        onClick={() => nav({ closed: showClosed ? '' : '1' })}
        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
          showClosed
            ? 'bg-green-500/15 border-green-500/30 text-green-300'
            : 'bg-black/5 border-black/15 text-black/50 hover:border-black/30'
        }`}
      >
        {showClosed ? '✓ ' : ''}รวมปิดแล้ว
      </button>
    </div>
  )
}
