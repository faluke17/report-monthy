'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Building2, AlertTriangle, Pencil, Trash2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { BudgetYear, BudgetProjectSummary } from '@/lib/types'
import { createBudgetYear, deleteBudgetYear, updateBudgetYear } from '@/app/actions/project-progress'

interface Props {
  budgetYears: BudgetYear[]
  canCreate: boolean
}

const PHASE_COLORS = [
  'bg-white/15', 'bg-violet-500', 'bg-blue-500',
  'bg-indigo-400', 'bg-amber-400', 'bg-cyan-400', 'bg-emerald-400',
]

function projectStats(projects: BudgetProjectSummary[]) {
  const total      = projects.length
  const completed  = projects.filter(p => p.current_phase === 6).length
  const inProgress = projects.filter(p => p.current_phase > 0 && p.current_phase < 6).length
  const notStarted = projects.filter(p => p.current_phase === 0).length
  const byPhase    = Array.from({ length: 7 }, (_, i) => projects.filter(p => p.current_phase === i).length)
  const today      = new Date(); today.setHours(0, 0, 0, 0)
  const overdue    = projects.filter(p => {
    if (p.current_phase === 6) return false
    const end = p.project_contracts?.contract_end_date
    return end && new Date(end) < today
  }).length
  const donePct    = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, inProgress, notStarted, byPhase, overdue, donePct }
}

function yearStats(year: BudgetYear) {
  const projects: BudgetProjectSummary[] = (year.budget_groups ?? []).flatMap(g => g.budget_projects ?? [])
  const s          = projectStats(projects)
  const groupCount = (year.budget_groups ?? []).length
  const pipeCount  = projects.filter(p => p.project_type === 'pipe').length
  const dmaCount   = projects.filter(p => p.project_type === 'dma').length
  return { ...s, groupCount, pipeCount, dmaCount }
}

export function BudgetYearList({ budgetYears, canCreate }: Props) {
  const router = useRouter()
  const [showForm, setShowForm]               = useState(false)
  const [fiscalYear, setFiscalYear]           = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingYear, setEditingYear]         = useState<{ id: string; name: string } | null>(null)
  const [editName, setEditName]               = useState('')
  const [expandedYearId, setExpandedYearId]   = useState<string | null>(null)
  const [isPending, startTransition]          = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fy = parseInt(fiscalYear)
    if (isNaN(fy) || fy < 2560 || fy > 2599) { toast.error('กรุณากรอกปี พ.ศ. ให้ถูกต้อง (2560–2599)'); return }
    const fd = new FormData()
    fd.append('name', `ปีงบประมาณ ${fy}`)
    fd.append('fiscal_year', String(fy))
    startTransition(async () => {
      const res = await createBudgetYear(fd)
      if (res.success) { toast.success('เพิ่มปีงบประมาณสำเร็จ'); setShowForm(false); setFiscalYear(''); router.refresh() }
      else toast.error(res.error)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteBudgetYear(id)
      if (res.success) { toast.success('ลบปีงบประมาณแล้ว'); setConfirmDeleteId(null); router.refresh() }
      else toast.error(res.error)
    })
  }

  const handleEditSave = () => {
    if (!editingYear || !editName.trim()) return
    startTransition(async () => {
      const res = await updateBudgetYear(editingYear.id, { name: editName.trim() })
      if (res.success) { toast.success('แก้ไขชื่อสำเร็จ'); setEditingYear(null); router.refresh() }
      else toast.error(res.error)
    })
  }

  return (
    <div className="space-y-6 animate-fadein">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ความก้าวหน้าโครงการ</h1>
          <p className="text-sm text-white/40 mt-1">ติดตามโครงการก่อสร้าง / วางท่อ แยกตามปีงบประมาณ</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
          >
            <Plus size={15} /> เพิ่มปีงบประมาณ
          </button>
        )}
      </div>

      {/* Year list */}
      {budgetYears.length === 0 ? (
        <div className="glass-card p-16 text-center text-white/30">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีปีงบประมาณ</p>
          {canCreate && <p className="text-sm mt-1 text-white/20">กด &ldquo;เพิ่มปีงบประมาณ&rdquo; เพื่อเริ่มต้น</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {budgetYears.map(year => {
            const s             = yearStats(year)
            const isConfirmDelete = confirmDeleteId === year.id
            const isExpanded    = expandedYearId === year.id
            const hasBothTypes  = s.pipeCount > 0 && s.dmaCount > 0

            const allProjects   = (year.budget_groups ?? []).flatMap(g => g.budget_projects ?? [])
            const pipeProjects  = allProjects.filter(p => p.project_type === 'pipe')
            const dmaProjects   = allProjects.filter(p => p.project_type === 'dma')
            const pipeStats     = projectStats(pipeProjects)
            const dmaStats      = projectStats(dmaProjects)

            const handleCardClick = () => {
              if (hasBothTypes) {
                setExpandedYearId(isExpanded ? null : year.id)
              } else {
                router.push(`/project-progress/${year.id}`)
              }
            }

            return (
              <div key={year.id} className="glass-card overflow-hidden hover:border-white/15 transition-all group/card">
                <div className="flex items-stretch">
                  {/* Left accent */}
                  <div className="w-1.5 shrink-0 bg-gradient-to-b from-cyan-400/70 via-cyan-500/30 to-transparent" />

                  {/* Main clickable area */}
                  <button
                    className="flex-1 min-w-0 text-left px-5 py-4"
                    onClick={handleCardClick}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: year info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3 mb-2">
                          <span className="text-3xl font-black text-white/90 num tracking-tight">
                            {year.fiscal_year}
                          </span>
                          <span className="text-sm text-white/40 font-medium">{year.name}</span>
                          {hasBothTypes && (
                            <span className="text-[11px] text-white/30">
                              {isExpanded ? 'เลือกประเภท' : 'คลิกเพื่อดู'}
                            </span>
                          )}
                        </div>

                        {/* Phase segmented bar */}
                        {s.total > 0 && (
                          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3 max-w-xs">
                            {s.byPhase.map((count, i) =>
                              count > 0 ? (
                                <div key={i} className={`${PHASE_COLORS[i]} rounded-sm`}
                                  style={{ width: `${(count / s.total) * 100}%` }}
                                  title={`Phase ${i}: ${count}`}
                                />
                              ) : null
                            )}
                          </div>
                        )}

                        {/* Stats inline */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-xs text-white/40 num">
                            {s.groupCount} กลุ่มงบ · {s.total} โครงการ
                          </span>
                          {s.completed > 0 && (
                            <span className="text-xs text-emerald-400 num">
                              ✓ เสร็จแล้ว {s.completed} ({s.donePct}%)
                            </span>
                          )}
                          {s.inProgress > 0 && (
                            <span className="text-xs text-cyan-400 num">
                              ↺ ดำเนิน {s.inProgress}
                            </span>
                          )}
                          {s.overdue > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-400 num">
                              <AlertTriangle size={11} /> เกิน {s.overdue}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: ring + arrow */}
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <ProgressRing pct={s.donePct} size={52} />
                        {hasBothTypes
                          ? <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-cyan-400' : 'text-white/20'}`} />
                          : <ChevronRight size={14} className="text-white/20 group-hover/card:text-cyan-400 transition-colors" />
                        }
                      </div>
                    </div>
                  </button>

                  {/* Actions zone */}
                  {canCreate && (
                    <div className="shrink-0 flex flex-col justify-center gap-1 px-3 border-l border-white/5">
                      {!isConfirmDelete ? (
                        <>
                          <button
                            onClick={() => { setEditingYear({ id: year.id, name: year.name }); setEditName(year.name) }}
                            className="p-1.5 text-white/15 hover:text-cyan-400 transition-colors rounded-lg hover:bg-cyan-500/10"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(year.id)}
                            className="p-1.5 text-white/15 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => handleDelete(year.id)} disabled={isPending}
                            className="text-[10px] text-red-400 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/25 disabled:opacity-40">
                            ลบ
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="text-[10px] text-white/30 px-2 py-0.5 rounded border border-white/10">
                            ยกเลิก
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Type selector panel (expands inline) ─────────────────── */}
                {hasBothTypes && isExpanded && (
                  <div className="border-t border-white/8 px-5 py-4 bg-white/2 animate-fadein">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">เลือกประเภทโครงการ</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {/* Pipe */}
                      <button
                        onClick={() => router.push(`/project-progress/${year.id}?type=pipe`)}
                        className="group/btn text-left p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/12 hover:border-cyan-500/40 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                            </div>
                            <span className="text-sm font-bold text-cyan-300">ปรับปรุงท่อ</span>
                          </div>
                          <ChevronRight size={14} className="text-cyan-400/40 group-hover/btn:text-cyan-400 transition-colors" />
                        </div>
                        <p className="text-2xl font-black text-white num">{s.pipeCount}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">โครงการ</p>
                        {pipeStats.total > 0 && (
                          <div className="mt-2.5 space-y-1">
                            <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                              {Array.from({ length: 7 }, (_, i) => pipeStats.byPhase[i]).map((count, i) =>
                                count > 0 ? (
                                  <div key={i} className={`${PHASE_COLORS[i]} rounded-sm`}
                                    style={{ width: `${(count / pipeStats.total) * 100}%` }} />
                                ) : null
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {pipeStats.completed > 0 && <span className="text-[10px] text-emerald-400 num">✓ {pipeStats.completed}</span>}
                              {pipeStats.inProgress > 0 && <span className="text-[10px] text-cyan-400 num">↺ {pipeStats.inProgress}</span>}
                              {pipeStats.overdue > 0 && <span className="text-[10px] text-red-400 num">⚠ {pipeStats.overdue}</span>}
                            </div>
                          </div>
                        )}
                      </button>

                      {/* DMA */}
                      <button
                        onClick={() => router.push(`/project-progress/${year.id}?type=dma`)}
                        className="group/btn text-left p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/12 hover:border-violet-500/40 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-violet-400"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
                            </div>
                            <span className="text-sm font-bold text-violet-300">DMA / PRV</span>
                          </div>
                          <ChevronRight size={14} className="text-violet-400/40 group-hover/btn:text-violet-400 transition-colors" />
                        </div>
                        <p className="text-2xl font-black text-white num">{s.dmaCount}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">โครงการ</p>
                        {dmaStats.total > 0 && (
                          <div className="mt-2.5 space-y-1">
                            <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                              {Array.from({ length: 7 }, (_, i) => dmaStats.byPhase[i]).map((count, i) =>
                                count > 0 ? (
                                  <div key={i} className={`${PHASE_COLORS[i]} rounded-sm`}
                                    style={{ width: `${(count / dmaStats.total) * 100}%` }} />
                                ) : null
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {dmaStats.completed > 0 && <span className="text-[10px] text-emerald-400 num">✓ {dmaStats.completed}</span>}
                              {dmaStats.inProgress > 0 && <span className="text-[10px] text-violet-400 num">↺ {dmaStats.inProgress}</span>}
                              {dmaStats.overdue > 0 && <span className="text-[10px] text-red-400 num">⚠ {dmaStats.overdue}</span>}
                            </div>
                          </div>
                        )}
                      </button>

                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Year Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-sm glass-card rounded-2xl overflow-hidden animate-fadein shadow-2xl">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-white/3">
              <button onClick={() => setShowForm(false)} className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
              <p className="flex-1 text-center text-sm font-semibold text-white/70">เพิ่มปีงบประมาณ</p>
              <div className="w-3" />
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">ปี พ.ศ. <span className="text-white/25">(2560–2599)</span></label>
                <input
                  type="number" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)}
                  placeholder="เช่น 2569" min={2560} max={2599}
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
                {fiscalYear && parseInt(fiscalYear) >= 2560 && parseInt(fiscalYear) <= 2599 && (
                  <p className="text-xs text-cyan-400/70 mt-1.5">จะสร้าง: ปีงบประมาณ {fiscalYear}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowForm(false); setFiscalYear('') }}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 border border-white/10 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={isPending || !fiscalYear || parseInt(fiscalYear) < 2560 || parseInt(fiscalYear) > 2599}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 transition-colors">
                  {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Year Name Modal */}
      {editingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingYear(null)} />
          <div className="relative z-10 w-full max-w-sm glass-card rounded-2xl overflow-hidden animate-fadein shadow-2xl">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-white/3">
              <button onClick={() => setEditingYear(null)} className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
              <p className="flex-1 text-center text-sm font-semibold text-white/70">แก้ไขชื่อปีงบประมาณ</p>
              <div className="w-3" />
            </div>
            <div className="p-5 space-y-4">
              <input
                type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setEditingYear(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 border border-white/10 transition-colors">
                  ยกเลิก
                </button>
                <button onClick={handleEditSave} disabled={isPending || !editName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 transition-colors">
                  {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Progress Ring (SVG) ──────────────────────────────────────────────────────

function ProgressRing({ pct, size }: { pct: number; size: number }) {
  const r   = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={pct === 100 ? '#34d399' : '#22d3ee'}
        strokeWidth={5} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90" style={{ transform: `rotate(90deg) translate(0, 0)`, transformOrigin: `${size/2}px ${size/2}px` }}
        fill={pct === 100 ? '#34d399' : '#22d3ee'} fontSize={10} fontWeight={700}>
        {pct}%
      </text>
    </svg>
  )
}
