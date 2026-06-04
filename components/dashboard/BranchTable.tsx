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
  if (nrw === null) return { text: '#3D5380',  bar: '',          label: '—' }
  if (nrw <= 20)   return { text: '#34D399',   bar: 'prog-good', label: 'ลดได้' }
  if (nrw <= 23)   return { text: '#FCD34D',   bar: 'prog-warn', label: 'ใกล้เป้า' }
  return           { text: '#F87171',   bar: 'prog-bad',  label: 'ไม่ลด' }
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
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(71,130,255,.12)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: '#2DD4BF', boxShadow: '0 0 6px rgba(45,212,191,.50)' }} />
          <h3 className="text-[13px] font-semibold" style={{ color: '#E4ECFF' }}>สถานะรายสาขา</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#34D399' }}>
          <Wifi size={11} />
          <span>Realtime</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(71,130,255,.10)' }}>
              {[
                { label: 'สาขา',           w: '' },
                { label: 'NRW (%)',        w: 'w-40' },
                { label: 'MNF Factor',     w: 'w-28' },
                { label: 'จุดรั่ว พบ/ซ่อม', w: 'w-28' },
                { label: 'สถานะ',          w: 'w-24' },
              ].map((h) => (
                <th
                  key={h.label}
                  className={`px-4 py-2.5 text-left text-[10px] font-bold tracking-wider uppercase ${h.w}`}
                  style={{ color: '#3D5380', fontFamily: 'var(--font-mono)' }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(71,130,255,.06)' }}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded animate-pulse" style={{ background: 'rgba(71,130,255,.08)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : branches.map((branch) => {
                  const report = reports.find(r => r.branch_id === branch.id)
                  const nrw    = report?.nrw_pct ?? null
                  const { text, bar, label } = getNrwColor(nrw)

                  return (
                    <tr
                      key={branch.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(71,130,255,.06)' }}
                      onClick={() => router.push(`/monthly?branch=${branch.id}`)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(71,130,255,.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      {/* Branch name */}
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-semibold" style={{ color: '#E4ECFF' }}>{branch.name_th}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: '#3D5380', fontFamily: 'var(--font-mono)' }}>{branch.code}</div>
                      </td>

                      {/* NRW with progress bar */}
                      <td className="px-4 py-3">
                        {nrw !== null ? (
                          <div className="space-y-1.5">
                            <span className="text-[13px] font-bold" style={{ color: text, fontFamily: 'var(--font-mono)' }}>
                              {nrw.toFixed(2)}%
                            </span>
                            <div className="prog-bg" style={{ minWidth: 70 }}>
                              <div className={`prog-fill ${bar}`} style={{ width: `${Math.min(nrw / 80 * 100, 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#3D5380' }}>—</span>
                        )}
                      </td>

                      {/* MNF Factor */}
                      <td className="px-4 py-3">
                        {report?.mnf_factor != null ? (
                          <span
                            className="text-[13px] font-semibold"
                            style={{
                              color: report.mnf_factor > 0.5 ? '#F87171' : '#CBD5E1',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {report.mnf_factor.toFixed(3)}
                          </span>
                        ) : (
                          <span style={{ color: '#3D5380' }}>—</span>
                        )}
                      </td>

                      {/* Leaks found / repaired */}
                      <td className="px-4 py-3">
                        {report ? (
                          <span className="text-[13px]" style={{ color: '#CBD5E1', fontFamily: 'var(--font-mono)' }}>
                            {report.leaks_found ?? 0} / {report.leaks_repaired ?? 0}
                          </span>
                        ) : (
                          <span style={{ color: '#3D5380' }}>—</span>
                        )}
                      </td>

                      {/* Status pill */}
                      <td className="px-4 py-3">
                        <span className={`pill text-[10px] font-bold px-2.5 py-0.5 rounded ${PILL[label] ?? 'pill-gray'}`}>
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
