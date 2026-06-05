'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, ChevronRight, Folders, Trash2, X,
  Layers, Banknote, Receipt, Ruler, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { BudgetGroup, BudgetProjectSummary } from '@/lib/types'
import { createBudgetGroup, deleteBudgetGroup } from '@/app/actions/project-progress'

interface Props {
  budgetGroups: BudgetGroup[]
  yearId: string
  yearName: string
  canCreate: boolean
  initialType?: 'all' | 'pipe' | 'dma'
}

const PHASES = [
  { label: 'ยังไม่เริ่ม', bar: 'bg-white/20',        pill: 'bg-white/8 text-white/40' },
  { label: 'ราคากลาง',    bar: 'bg-violet-500',      pill: 'bg-violet-500/20 text-violet-300' },
  { label: 'TOR',         bar: 'bg-blue-500',        pill: 'bg-blue-500/20 text-blue-300' },
  { label: 'พิจารณาผล',  bar: 'bg-indigo-400',      pill: 'bg-indigo-500/20 text-indigo-300' },
  { label: 'เซ็นสัญญา',  bar: 'bg-amber-400',       pill: 'bg-amber-500/20 text-amber-300' },
  { label: 'ดำเนินงาน',  bar: 'bg-cyan-400',        pill: 'bg-cyan-500/20 text-cyan-300' },
  { label: 'แล้วเสร็จ',  bar: 'bg-emerald-400',     pill: 'bg-emerald-500/20 text-emerald-300' },
]

function fmtMillion(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล้าน'
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}
function fmtMeter(n: number) {
  if (!n) return '—'
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function getLatestPipeCompleted(p: BudgetProjectSummary): number {
  const updates = p.project_progress_updates ?? []
  if (updates.length === 0) return 0
  const sorted = [...updates].sort(
    (a, b) => new Date(b.reported_date).getTime() - new Date(a.reported_date).getTime()
  )
  return sorted[0].pipe_length_completed ?? 0
}

function computeStats(projects: BudgetProjectSummary[]) {
  const total    = projects.length
  const byPhase  = Array.from({ length: 7 }, (_, i) => projects.filter(p => p.current_phase === i).length)
  const budget   = projects.reduce((s, p) => s + (p.budget_excl_vat ?? 0), 0)
  const contract = projects.reduce((s, p) => s + (p.contract_incl_vat ?? 0), 0)
  const estPipe  = projects.reduce((s, p) => s + (p.project_contracts?.estimated_pipe_length ?? 0), 0)
  const donePipe = projects
    .filter(p => p.project_type !== 'dma')
    .reduce((s, p) => s + getLatestPipeCompleted(p), 0)
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const overdue  = projects.filter(p => {
    if (p.current_phase === 6) return false
    const end = p.project_contracts?.contract_end_date
    return end && new Date(end) < today
  }).length
  const donePct  = total > 0 ? Math.round((byPhase[6] / total) * 100) : 0
  return { total, byPhase, budget, contract, estPipe, donePipe, overdue, donePct }
}

export function BudgetGroupList({ budgetGroups, yearId, yearName, canCreate, initialType = 'all' }: Props) {
  const router = useRouter()
  const [activeGroup, setActiveGroup]         = useState<string>('all')
  const [activeType, setActiveType]           = useState<'all' | 'pipe' | 'dma'>(initialType)
  const [showForm, setShowForm]               = useState(false)
  const [groupName, setGroupName]             = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery]         = useState('')
  const [showDropdown, setShowDropdown]       = useState(false)
  const [isPending, startTransition]          = useTransition()
  const searchRef                             = useRef<HTMLDivElement>(null)

  const q = searchQuery.trim().toLowerCase()

  // Autocomplete results — flat list from all groups, max 10
  const dropdownResults = useMemo(() => {
    if (!q) return []
    const results: Array<{ id: string; project_name: string; code: string | null; groupId: string; groupName: string }> = []
    for (const g of budgetGroups) {
      for (const p of g.budget_projects ?? []) {
        if (p.project_name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q)) {
          results.push({ id: p.id, project_name: p.project_name, code: p.code, groupId: g.id, groupName: g.name })
        }
      }
    }
    return results.slice(0, 10)
  }, [budgetGroups, q])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Type-filtered groups: groups that have at least one project of the selected type
  const typeFilteredGroups = useMemo(() => {
    if (activeType === 'all') return budgetGroups
    return budgetGroups.filter(g => (g.budget_projects ?? []).some(p => p.project_type === activeType))
  }, [budgetGroups, activeType])

  // Reset active group when type changes, if current group has no projects of that type
  const activeGroupValid = useMemo(() => {
    if (activeGroup === 'all') return true
    return typeFilteredGroups.some(g => g.id === activeGroup)
  }, [activeGroup, typeFilteredGroups])

  // Dashboard display
  const typeProjects = (activeType === 'all')
    ? budgetGroups.flatMap(g => g.budget_projects ?? [])
    : budgetGroups.flatMap(g => (g.budget_projects ?? []).filter(p => p.project_type === activeType))

  const filteredProjects = (() => {
    if (!activeGroupValid || activeGroup === 'all') return typeProjects
    return (typeFilteredGroups.find(g => g.id === activeGroup)?.budget_projects ?? [])
      .filter(p => activeType === 'all' || p.project_type === activeType)
  })()

  const visibleGroups = typeFilteredGroups

  const s = computeStats(filteredProjects)

  // Count pipe vs dma across all groups
  const allProjects = budgetGroups.flatMap(g => g.budget_projects ?? [])
  const pipeCount   = allProjects.filter(p => p.project_type === 'pipe').length
  const dmaCount    = allProjects.filter(p => p.project_type === 'dma').length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    const fd = new FormData()
    fd.append('budget_year_id', yearId)
    fd.append('name', groupName.trim())
    startTransition(async () => {
      const res = await createBudgetGroup(fd)
      if (res.success) { toast.success('เพิ่มสำเร็จ'); setShowForm(false); setGroupName(''); router.refresh() }
      else toast.error(res.error)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteBudgetGroup(id)
      if (res.success) { toast.success('ลบสำเร็จ'); setConfirmDeleteId(null); router.refresh() }
      else toast.error(res.error)
    })
  }

  return (
    <div className="space-y-6 animate-fadein">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{yearName}</h1>
          <p className="text-sm text-white/40 mt-1">ภาพรวมโครงการก่อสร้าง / วางท่อ</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search with autocomplete */}
          <div className="relative" ref={searchRef}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => { if (q) setShowDropdown(true) }}
              placeholder="ค้นหาชื่อโครงการ หรือรหัส..."
              className="w-64 bg-white/5 border border-white/12 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:border-cyan-500/40"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowDropdown(false) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X size={12} />
              </button>
            )}

            {/* Dropdown */}
            {showDropdown && q && (
              <div className="absolute top-full left-0 mt-1.5 w-80 bg-[#141824] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                {dropdownResults.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-white/30">ไม่พบโครงการที่ค้นหา</p>
                ) : (
                  <>
                    <p className="px-4 pt-2.5 pb-1 text-[10px] text-white/25 uppercase tracking-widest">พบ {dropdownResults.length} รายการ</p>
                    {dropdownResults.map(r => (
                      <button
                        key={r.id}
                        onMouseDown={() => {
                          router.push(`/project-progress/${yearId}/${r.groupId}?project=${r.id}`)
                          setSearchQuery('')
                          setShowDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/6 transition-colors border-t border-white/5 first:border-0 flex items-start gap-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/85 font-medium leading-snug truncate">
                            <Highlight text={r.project_name} query={q} />
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {r.code && (
                              <span className="text-[10px] text-white/30 font-mono">
                                <Highlight text={r.code} query={q} />
                              </span>
                            )}
                            <span className="text-[10px] text-cyan-400/60">{r.groupName}</span>
                          </div>
                        </div>
                        <ChevronRight size={12} className="text-white/20 shrink-0 mt-0.5" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
            >
              <Plus size={15} /> เพิ่มชื่องบประมาณ
            </button>
          )}
        </div>
      </div>

      {budgetGroups.length === 0 ? (
        <div className="glass-card p-16 text-center text-white/30">
          <Folders size={40} className="mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีชื่องบประมาณ</p>
        </div>
      ) : (
        <>
          {/* ── Type tabs ────────────────────────────────────────────────── */}
          {(pipeCount > 0 && dmaCount > 0) && (
            <div className="flex items-center gap-2 p-1 bg-white/4 rounded-xl w-fit border border-white/8">
              {([
                { key: 'all',  label: 'ทั้งหมด',       count: pipeCount + dmaCount, color: 'text-white' },
                { key: 'pipe', label: 'ปรับปรุงท่อ',   count: pipeCount,             color: 'text-cyan-300' },
                { key: 'dma',  label: 'DMA / PRV',      count: dmaCount,              color: 'text-violet-300' },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => { setActiveType(t.key); setActiveGroup('all') }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeType === t.key
                      ? t.key === 'dma'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                        : t.key === 'pipe'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-white/10 text-white border border-white/20'
                      : 'text-white/40 hover:text-white/70 border border-transparent'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeType === t.key ? 'bg-white/15' : 'bg-white/8'
                  } num`}>{t.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Group filter tabs ────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {(['all', ...visibleGroups.map(g => g.id)] as string[]).map((id) => {
              const label = id === 'all' ? 'ทุกกลุ่ม' : visibleGroups.find(g => g.id === id)!.name
              const active = (activeGroupValid ? activeGroup : 'all') === id
              return (
                <button
                  key={id}
                  onClick={() => setActiveGroup(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all max-w-[220px] truncate ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/4 text-white/40 border-white/8 hover:bg-white/8 hover:text-white/70'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* ── KPI Strip ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              icon={<Layers size={17} className="text-white/60" />}
              iconBg="bg-white/8"
              label="โครงการทั้งหมด"
              value={String(s.total)}
              sub={`เสร็จแล้ว ${s.byPhase[6]} (${s.donePct}%)`}
              subColor="text-emerald-400/80"
            />
            <KpiCard
              icon={<Banknote size={17} className="text-amber-400" />}
              iconBg="bg-amber-500/10"
              label="งบประมาณ (ไม่รวม VAT)"
              value={fmtMillion(s.budget)}
              sub="บาท"
            />
            <KpiCard
              icon={<Receipt size={17} className="text-orange-400" />}
              iconBg="bg-orange-500/10"
              label="งบจัดจ้าง (รวม VAT)"
              value={fmtMillion(s.contract)}
              sub="บาท"
            />
            {activeType !== 'dma' && (
              <KpiCard
                icon={<Ruler size={17} className="text-cyan-400" />}
                iconBg="bg-cyan-500/10"
                label="ความยาวท่อประมาณการ"
                value={fmtMeter(s.estPipe)}
                sub="เมตร"
              />
            )}
            {activeType !== 'dma' && (
              <KpiCard
                icon={<CheckCircle2 size={17} className="text-emerald-400" />}
                iconBg="bg-emerald-500/10"
                label="ความยาวท่อแล้วเสร็จ"
                value={fmtMeter(s.donePipe)}
                sub="เมตร"
                highlight={s.donePipe > 0}
              />
            )}
          </div>

          {/* ── Phase Distribution ──────────────────────────────────────── */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">ความก้าวหน้าตาม Phase</p>
              {s.overdue > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                  <AlertTriangle size={11} /> เกินกำหนด {s.overdue} โครงการ
                </span>
              )}
            </div>

            {/* Segmented bar */}
            {s.total > 0 ? (
              <>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {s.byPhase.map((count, i) =>
                    count > 0 ? (
                      <div
                        key={i}
                        className={`${PHASES[i].bar} transition-all rounded-sm`}
                        style={{ width: `${(count / s.total) * 100}%` }}
                        title={`${PHASES[i].label}: ${count}`}
                      />
                    ) : null
                  )}
                </div>

                {/* Phase counts grid */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
                  {PHASES.map((ph, i) => (
                    <div key={i} className={`rounded-xl px-2 py-2 text-center ${s.byPhase[i] > 0 ? ph.pill : 'opacity-30'}`}>
                      <p className="text-base font-bold num">{s.byPhase[i]}</p>
                      <p className="text-[10px] mt-0.5 leading-tight opacity-80">{ph.label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-white/25 text-center py-4">ยังไม่มีโครงการ</p>
            )}
          </div>

          {/* ── Group list ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[11px] text-white/30 uppercase tracking-widest px-1">ชื่องบประมาณ</p>
            {visibleGroups.map(group => {
              const gProjects = group.budget_projects ?? []
              const gs = computeStats(gProjects)
              const isConfirmDelete = confirmDeleteId === group.id

              return (
                <div key={group.id} className="glass-card overflow-hidden hover:border-white/15 transition-all group/row">
                  <div className="flex items-stretch">
                    {/* Color accent strip */}
                    <div className="w-1 shrink-0 bg-gradient-to-b from-cyan-500/60 to-cyan-500/10" />

                    {/* Main content */}
                    <button
                      className="flex-1 min-w-0 text-left px-4 py-3.5"
                      onClick={() => router.push(`/project-progress/${yearId}/${group.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white leading-snug truncate">{group.name}</p>
                            {(() => {
                              const gps = group.budget_projects ?? []
                              const hasPipe = gps.some(p => p.project_type === 'pipe')
                              const hasDma  = gps.some(p => p.project_type === 'dma')
                              return (
                                <>
                                  {hasPipe && !hasDma && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 shrink-0">ท่อ</span>}
                                  {hasDma && !hasPipe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 shrink-0">DMA</span>}
                                  {hasPipe && hasDma && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 shrink-0">ท่อ+DMA</span>}
                                </>
                              )
                            })()}
                          </div>

                          {/* Stats row */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                            <span className="text-[11px] text-white/40 num">{gs.total} โครงการ</span>
                            {gs.byPhase[6] > 0 && <span className="text-[11px] text-emerald-400 num">✓ เสร็จ {gs.byPhase[6]}</span>}
                            {(gs.byPhase[4] + gs.byPhase[5]) > 0 && (
                              <span className="text-[11px] text-cyan-400 num">↺ ดำเนิน {gs.byPhase[4] + gs.byPhase[5]}</span>
                            )}
                            {gs.overdue > 0 && <span className="text-[11px] text-red-400 num">⚠ เกิน {gs.overdue}</span>}
                            {gs.budget > 0 && <span className="text-[11px] text-amber-300/70 num">{fmtMillion(gs.budget)}</span>}
                            {gs.estPipe > 0 && <span className="text-[11px] text-white/25 num">{fmtMeter(gs.estPipe)} ม.</span>}
                          </div>

                          {/* Mini phase bar */}
                          {gs.total > 0 && (
                            <div className="flex h-1 rounded-full overflow-hidden gap-px mt-2.5 opacity-70">
                              {gs.byPhase.map((count, i) =>
                                count > 0 ? (
                                  <div key={i} className={`${PHASES[i].bar}`}
                                    style={{ width: `${(count / gs.total) * 100}%` }} />
                                ) : null
                              )}
                            </div>
                          )}
                        </div>

                        <ChevronRight size={16} className="text-white/20 group-hover/row:text-cyan-400 transition-colors mt-0.5 shrink-0" />
                      </div>
                    </button>

                    {/* Delete zone */}
                    {canCreate && (
                      <div className="shrink-0 flex items-center px-3 border-l border-white/5">
                        {!isConfirmDelete ? (
                          <button
                            onClick={() => setConfirmDeleteId(group.id)}
                            className="p-1.5 text-white/15 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleDelete(group.id)} disabled={isPending}
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
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Add Group Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-sm glass-card rounded-2xl overflow-hidden animate-fadein shadow-2xl">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-white/3">
              <button onClick={() => setShowForm(false)} className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
              <p className="flex-1 text-center text-sm font-semibold text-white/70">เพิ่มชื่องบประมาณ</p>
              <div className="w-3" />
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <p className="text-xs text-white/40">ภายใต้ {yearName}</p>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="เช่น รายได้ปกติ, งบเร่งด่วน..."
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowForm(false); setGroupName('') }}
                  className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 border border-white/10 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={isPending || !groupName.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 transition-colors">
                  {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Highlight matching text ──────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-cyan-500/30 text-cyan-300 rounded-sm not-italic px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, iconBg, label, value, sub, subColor = 'text-white/30', highlight = false }: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sub?: string
  subColor?: string
  highlight?: boolean
}) {
  return (
    <div className={`glass-card p-4 flex flex-col gap-3 ${highlight ? 'border-emerald-500/20' : ''}`}>
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-white/35 mb-1 leading-tight">{label}</p>
        <p className="text-xl font-bold text-white num leading-none">{value}</p>
        {sub && <p className={`text-[11px] mt-1 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}
