'use client'

import { useRouter } from 'next/navigation'
import { Wifi } from 'lucide-react'
import { useRealtimeMonthlyReports } from '@/hooks/useRealtimeData'
import { useAppStore } from '@/store/useAppStore'
import { Branch } from '@/lib/types'

interface BranchTableProps {
  branches: Branch[]
}

function getNrwColor(nrw: number | null) {
  if (nrw === null) return { text: 'text-white/25', bar: '', label: '—' }
  if (nrw <= 20)   return { text: 'text-green-400',  bar: 'prog-good', label: 'ลดได้' }
  if (nrw <= 23)   return { text: 'text-amber-400',  bar: 'prog-warn', label: 'ใกล้เป้า' }
  return           { text: 'text-red-400',    bar: 'prog-bad',  label: 'ไม่ลด' }
}

const PILL: Record<string, string> = {
  'ลดได้':    'pill-good',
  'ใกล้เป้า': 'pill-warn',
  'ไม่ลด':   'pill-bad',
  '—':        'pill-gray',
}

export function BranchTable({ branches }: BranchTableProps) {
  const router = useRouter()
  const { selectedYear, selectedMonth } = useAppStore()
  const { data: reports, loading } = useRealtimeMonthlyReports(selectedYear, selectedMonth)

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <h3 className="text-sm font-bold text-white">สถานะรายสาขา</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-green-400">
          <Wifi size={11} />
          <span>Realtime</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {[
                { label: 'สาขา',        w: '' },
                { label: 'NRW (%)',      w: 'w-40' },
                { label: 'MNF Factor',   w: 'w-28' },
                { label: 'จุดรั่ว พบ/ซ่อม', w: 'w-28' },
                { label: 'สถานะ',        w: 'w-24' },
              ].map((h) => (
                <th key={h.label} className={`px-4 py-2.5 text-left text-[10px] font-bold tracking-wider uppercase text-white/30 ${h.w}`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/8 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : branches.map((branch) => {
                  const report = reports.find((r) => r.branch_id === branch.id)
                  const nrw = report?.nrw_pct ?? null
                  const { text, bar, label } = getNrwColor(nrw)

                  return (
                    <tr
                      key={branch.id}
                      className="border-b border-white/5 hover:bg-white/[.025] cursor-pointer transition-colors"
                      onClick={() => router.push(`/monthly?branch=${branch.id}`)}
                    >
                      {/* Branch name */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold text-white">{branch.name_th}</div>
                        <div className="text-[10px] text-white/35 num mt-0.5">{branch.code}</div>
                      </td>

                      {/* NRW with progress bar */}
                      <td className="px-4 py-3">
                        {nrw !== null ? (
                          <div className="space-y-1.5">
                            <span className={`num text-sm font-bold ${text}`}>{nrw.toFixed(2)}%</span>
                            <div className="prog-bg" style={{ minWidth: 70 }}>
                              <div className={`prog-fill ${bar}`} style={{ width: `${Math.min(nrw / 80 * 100, 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-white/20 text-sm">—</span>
                        )}
                      </td>

                      {/* MNF Factor */}
                      <td className="px-4 py-3">
                        {report?.mnf_factor != null ? (
                          <span className={`num text-sm font-semibold ${report.mnf_factor > 0.5 ? 'text-red-400' : 'text-white/70'}`}>
                            {report.mnf_factor.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      {/* Leaks found / repaired */}
                      <td className="px-4 py-3">
                        {report ? (
                          <span className="num text-sm text-white/70">
                            {report.leaks_found ?? 0} / {report.leaks_repaired ?? 0}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      {/* Status pill */}
                      <td className="px-4 py-3">
                        <span className={`pill rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PILL[label] ?? 'pill-gray'}`}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
