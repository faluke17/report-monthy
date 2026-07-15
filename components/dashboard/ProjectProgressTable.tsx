'use client'

import { useState, useTransition, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, AlertTriangle, Paperclip, ExternalLink, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { BudgetProject, Branch } from '@/lib/types'
import { PhaseTimeline, getMissingFields, PHASES } from '@/components/dashboard/PhaseTimeline'
import {
  createProject, deleteProject, updateProjectPhase, upsertProjectContract,
  updateCurrentPhase, addProgressUpdate, updateProjectCompletion, saveCertificateUrl,
} from '@/app/actions/project-progress'

interface Props {
  projects: BudgetProject[]
  yearId: string
  groupId: string
  groupName: string
  branches: Branch[]
  sessionBranchId: string | null
  isRegion: boolean
  isAdmin: boolean
  defaultProjectId?: string
}

const PHASE_LABELS = ['ยังไม่เริ่ม','ราคากลาง','TOR','พิจารณาผล','เซ็นสัญญา','ดำเนินงาน','แล้วเสร็จ']

function deadlineStatus(project: BudgetProject): 'overdue' | 'near' | 'ok' | null {
  if (project.current_phase === 6) return null
  const end = project.project_contracts?.contract_end_date
  if (!end) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const deadline = new Date(end)
  if (deadline < today) return 'overdue'
  const days = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
  return days <= 30 ? 'near' : 'ok'
}
function latestProgress(project: BudgetProject) {
  return [...(project.project_progress_updates ?? [])].sort(
    (a, b) => new Date(b.reported_date).getTime() - new Date(a.reported_date).getTime()
  )[0] ?? null
}
function progressPct(project: BudgetProject) {
  if (project.project_type !== 'pipe') return null
  const latest = latestProgress(project)
  const est = project.project_contracts?.estimated_pipe_length
  if (!latest || !est || est === 0 || latest.pipe_length_completed == null) return null
  return Math.round((latest.pipe_length_completed / est) * 100)
}
function deadlineDaysLabel(project: BudgetProject): { text: string; level: 'overdue' | 'near' | 'ok' } | null {
  if (project.current_phase === 6) return null
  const end = project.project_contracts?.contract_end_date
  if (!end) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((new Date(end).getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return { text: `เกิน ${Math.abs(diff)} วัน`, level: 'overdue' }
  if (diff === 0) return { text: 'ครบกำหนดวันนี้', level: 'near' }
  if (diff <= 30) return { text: `เหลือ ${diff} วัน`, level: 'near' }
  return {
    text: new Date(end).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }),
    level: 'ok',
  }
}

function getAutoExpandPhase(project: BudgetProject): number | null {
  const cp = project.current_phase
  if (cp === 0) return null
  // First: phase with missing required data
  for (const ph of PHASES) {
    if (ph.no <= cp && getMissingFields(project, ph.no).length > 0) return ph.no
  }
  // Otherwise: current active phase (to make next update easy)
  if (cp < 6) return cp
  return null
}

function phase6Missing(project: BudgetProject) {
  if (project.current_phase !== 6) return null
  return {
    dates: !project.completion_submission_date || !project.completion_inspection_date,
    certificate: !project.certificate_url,
  }
}

export function ProjectProgressTable({ projects, yearId, groupId, groupName, branches, sessionBranchId, isRegion, isAdmin, defaultProjectId }: Props) {
  const router = useRouter()
  const [selected, setSelected]             = useState<BudgetProject | null>(null)
  const [expandedPhase, setExpandedPhase]   = useState<number | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [isPending, startTransition]        = useTransition()
  const [filterBranchId, setFilterBranchId] = useState<string>('')
  const [searchQuery, setSearchQuery]       = useState<string>('')

  // Auto-open modal when arriving from search
  useEffect(() => {
    if (defaultProjectId && projects.length > 0) {
      const target = projects.find(p => p.id === defaultProjectId)
      if (target) { setSelected(target); setExpandedPhase(getAutoExpandPhase(target)) }
    }
  }, [defaultProjectId, projects])

  useEffect(() => {
    if (selected) {
      const updated = projects.find(p => p.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [projects])

  const closeDetail = () => { setSelected(null); setExpandedPhase(null); setConfirmDelete(false) }

  const handleTogglePhase = (phaseNo: 1|2|3, isCompleted: boolean) => {
    if (!selected) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set(`phase${phaseNo}_completed_at`, isCompleted ? '' : new Date().toISOString().split('T')[0])
      const res = await updateProjectPhase(selected.id, phaseNo, fd)
      if (res.success) router.refresh()
      else toast.error(res.error)
    })
  }

  // Derive branches that actually have projects — auto-updates when projects change
  const activeBranches = useMemo(() => {
    const seen = new Map<string, { id: string; name_th: string; count: number }>()
    for (const p of projects) {
      const name = p.branches?.name_th ?? p.branch_id
      if (!seen.has(p.branch_id)) seen.set(p.branch_id, { id: p.branch_id, name_th: name, count: 0 })
      seen.get(p.branch_id)!.count++
    }
    return Array.from(seen.values()).sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
  }, [projects])

  const q        = searchQuery.trim().toLowerCase()
  const filtered = projects.filter(p =>
    (!filterBranchId || p.branch_id === filterBranchId) &&
    (!q || p.project_name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q))
  )
  const total       = filtered.length
  const inProgress  = filtered.filter(p => p.current_phase > 0 && p.current_phase < 6).length
  const phase6      = filtered.filter(p => p.current_phase === 6)
  const completed   = phase6.filter(p => !phase6Missing(p)?.dates && !phase6Missing(p)?.certificate).length
  const incomplete6 = phase6.length - completed
  const today       = new Date(); today.setHours(0,0,0,0)
  const overdue     = filtered.filter(p => {
    if (p.current_phase === 6) return false
    const end = p.project_contracts?.contract_end_date
    return end && new Date(end) < today
  }).length

  return (
    <>
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'ทั้งหมด',     value: total,       color: 'text-[#12181F]',        bg: '' },
          { label: 'กำลังดำเนิน', value: inProgress,  color: 'text-cyan-300',     bg: 'border-l-2 border-cyan-500/40' },
          { label: 'เสร็จแล้ว',   value: completed,   color: 'text-emerald-300',  bg: 'border-l-2 border-emerald-500/40' },
          { label: 'รอข้อมูล',    value: incomplete6, color: 'text-amber-300',    bg: 'border-l-2 border-amber-500/40' },
          { label: 'เกินกำหนด',   value: overdue,     color: 'text-red-400',      bg: 'border-l-2 border-red-500/40' },
        ].map(s => (
          <div key={s.label} className={`glass-card px-4 py-4 ${s.bg}`}>
            <p className="text-xs text-black/50 mb-1.5 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold num ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อโครงการ หรือรหัส..."
              className="w-full bg-black/5 border border-black/12 rounded-lg pl-8 pr-3 py-2 text-sm text-black/85 placeholder-white/35 focus:outline-none focus:border-cyan-500/40"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/25" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-black/30 hover:text-black/60">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Branch filter (region only) */}
          {isRegion && (
            <select
              value={filterBranchId}
              onChange={e => setFilterBranchId(e.target.value)}
              className="flex-1 min-w-[140px] max-w-[200px] bg-black/5 border border-black/12 rounded-lg px-3 py-2 text-sm text-black/75 focus:outline-none focus:border-cyan-500/40"
            >
              <option value="">ทุกสาขา</option>
              {activeBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name_th}</option>
              ))}
            </select>
          )}

          <div className="flex items-center justify-between flex-1 min-w-0">
            <p className="text-sm text-black/55 truncate font-medium">
              {groupName}
              {(q || filterBranchId)
                ? <span className="text-cyan-400 ml-1">· {total} โครงการ (กรอง)</span>
                : <span className="text-black/40 ml-1">· {total} โครงการ</span>
              }
            </p>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors shrink-0 ml-3"
            >
              <Plus size={14} /> เพิ่มโครงการ
            </button>
          </div>
        </div>
      </div>

      {/* Project Table */}
      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-black/25 text-sm">
            {filterBranchId ? 'ไม่มีโครงการในสาขาที่เลือก' : 'ยังไม่มีโครงการ'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-black/45 uppercase tracking-wider border-b border-black/8">
                  <th className="text-center px-4 py-3 font-semibold w-10">#</th>
                  <th className="text-left px-4 py-3 font-semibold">สาขา</th>
                  <th className="text-left px-4 py-3 font-semibold">ชื่อโครงการ</th>
                  <th className="text-center px-4 py-3 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, idx) => {
                  const phase   = project.current_phase
                  const dl      = deadlineDaysLabel(project)
                  const pct     = progressPct(project)
                  const missing = phase6Missing(project)
                  const incomplete = missing && (missing.dates || missing.certificate)
                  const missingCount = PHASES.reduce((n, ph) =>
                    n + (ph.no <= phase ? getMissingFields(project, ph.no).length : 0), 0)
                  return (
                    <tr
                      key={project.id}
                      onClick={() => { setSelected(project); setExpandedPhase(getAutoExpandPhase(project)); setConfirmDelete(false) }}
                      className="border-b border-black/4 hover:bg-black/3 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4 text-center text-black/40 text-sm num">{idx + 1}</td>
                      <td className="px-4 py-4 text-black/65 text-sm whitespace-nowrap font-medium">
                        {project.branches?.name_th ?? '-'}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[#12181F] font-semibold leading-snug text-sm">{project.project_name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {project.code && <p className="text-xs text-black/40 font-mono">{project.code}</p>}
                          {project.project_type === 'dma' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">DMA</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Phase badge */}
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap border ${
                            phase === 6 && !incomplete ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : phase === 6 &&  incomplete ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : phase > 0                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            :                              'bg-black/5 text-black/40 border-black/10'
                          }`}>
                            {phase === 6 && incomplete ? 'รอข้อมูล' : PHASE_LABELS[phase]}
                          </span>

                          {/* Progress % — phase 5 pipe */}
                          {phase === 5 && pct !== null && (
                            <div className="w-20 space-y-1">
                              <div className="h-1.5 rounded-full bg-black/8 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all" style={{ width: `${Math.min(pct,100)}%` }} />
                              </div>
                              <p className="text-xs text-cyan-400 num text-center font-semibold">{pct}%</p>
                            </div>
                          )}

                          {/* Contract deadline */}
                          {dl && (
                            <span className={`text-xs flex items-center gap-1 font-medium ${
                              dl.level === 'overdue' ? 'text-red-400'
                              : dl.level === 'near'  ? 'text-amber-400'
                              :                        'text-black/40'
                            }`}>
                              <Calendar size={10} /> {dl.text}
                            </span>
                          )}

                          {/* Missing data indicator */}
                          {missingCount > 0 && (
                            <span className="text-xs text-amber-400 flex items-center gap-1 font-medium">
                              <AlertTriangle size={10} /> ขาด {missingCount} รายการ
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mac-style centered detail modal ─────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative z-10 w-full max-w-2xl glass-card rounded-2xl overflow-hidden animate-fadein flex flex-col max-h-[88vh] shadow-2xl">

            {/* Mac titlebar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/8 bg-black/3 shrink-0">
              <button
                onClick={closeDetail}
                className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors shrink-0"
              />
              <div className="flex-1 text-center min-w-0">
                <p className="text-sm font-semibold text-black/80 truncate">{selected.project_name}</p>
              </div>
              <div className="w-3 shrink-0" />
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">
              <DetailBody
                project={selected}
                isAdmin={isAdmin}
                expandedPhase={expandedPhase}
                onSelectPhase={p => setExpandedPhase(prev => prev === p ? null : p)}
                onTogglePhase={handleTogglePhase}
                confirmDelete={confirmDelete}
                setConfirmDelete={setConfirmDelete}
                isPending={isPending}
                startTransition={startTransition}
                router={router}
                onClose={closeDetail}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── New Project Modal ─────────────────────────────────────────────── */}
      {showNewProject && (
        <NewProjectModal
          yearId={yearId}
          groupId={groupId}
          branches={branches}
          sessionBranchId={sessionBranchId}
          isRegion={isRegion}
          onClose={() => setShowNewProject(false)}
          onSuccess={() => { setShowNewProject(false); router.refresh() }}
        />
      )}
    </>
  )
}

// ─── Incomplete Data Banner ───────────────────────────────────────────────────

function IncompleteDataBanner({
  project,
  onSelectPhase,
}: {
  project: BudgetProject
  onSelectPhase: (phase: number) => void
}) {
  const issues: { phaseNo: number; phaseLabel: string; fields: string[] }[] = []

  for (const ph of PHASES) {
    const missing = getMissingFields(project, ph.no)
    if (missing.length > 0) {
      issues.push({ phaseNo: ph.no, phaseLabel: ph.label, fields: missing.map(m => m.label) })
    }
  }

  if (issues.length === 0) return null

  return (
    <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/15">
        <AlertTriangle size={14} className="text-amber-400 shrink-0" />
        <p className="text-sm font-semibold text-amber-400 flex-1">ข้อมูลยังไม่ครบ — กดกรอกได้เลย</p>
      </div>
      <div className="divide-y divide-amber-500/8">
        {issues.map(iss => (
          <button
            key={iss.phaseNo}
            onClick={() => onSelectPhase(iss.phaseNo)}
            className="w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-500/10 transition-colors group"
          >
            <div className="min-w-0">
              <span className="text-xs font-semibold text-amber-400">{iss.phaseLabel}:</span>{' '}
              <span className="text-xs text-amber-400/70">{iss.fields.join(', ')}</span>
            </div>
            <span className="text-xs text-amber-400/50 group-hover:text-amber-400 shrink-0 transition-colors font-medium">กรอก →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Detail Body ──────────────────────────────────────────────────────────────

function DetailBody({
  project, isAdmin, expandedPhase, onSelectPhase, onTogglePhase,
  confirmDelete, setConfirmDelete, isPending, startTransition, router, onClose,
}: {
  project: BudgetProject
  isAdmin: boolean
  expandedPhase: number | null
  onSelectPhase: (p: number) => void
  onTogglePhase: (phaseNo: 1|2|3, isCompleted: boolean) => void
  confirmDelete: boolean
  setConfirmDelete: (v: boolean) => void
  isPending: boolean
  startTransition: (fn: () => void) => void
  router: ReturnType<typeof useRouter>
  onClose: () => void
}) {
  const ds  = deadlineStatus(project)
  const pct = progressPct(project)
  const contractExclVat = project.contract_incl_vat
    ? Math.round((project.contract_incl_vat / 1.07) * 100) / 100
    : null

  return (
    <div className="p-6 space-y-5">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-black/60 bg-black/6 px-3 py-1 rounded-full font-medium border border-black/8">
          {project.branches?.name_th ?? '-'}
        </span>
        {project.code && (
          <span className="text-xs text-black/45 font-mono bg-black/5 px-2.5 py-1 rounded-full border border-black/8">
            {project.code}
          </span>
        )}
        {ds === 'overdue' && (
          <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-full font-semibold">
            <AlertTriangle size={11} /> เกินกำหนดสัญญา
          </span>
        )}
      </div>

      {/* ── Phase Stepper — primary visual ── */}
      <div className="bg-black/3 rounded-xl px-4 pt-4 pb-3 border border-black/6">
        <p className="text-xs text-black/45 uppercase tracking-widest mb-3 font-semibold">ขั้นตอนการดำเนินงาน</p>
        <PhaseTimeline
          project={project}
          selectedPhase={expandedPhase}
          onSelectPhase={onSelectPhase}
          onTogglePhase={onTogglePhase}
          progressPct={pct}
          projectType={project.project_type}
        />
      </div>

      {/* Incomplete data banner */}
      <IncompleteDataBanner project={project} onSelectPhase={onSelectPhase} />

      {/* Phase Edit Form — appears right below stepper when a phase is selected */}
      {expandedPhase !== null && (() => {
        const missing = getMissingFields(project, expandedPhase)
        const hasMissing = missing.length > 0
        return (
          <div className={`rounded-xl border overflow-hidden ${
            hasMissing
              ? 'border-amber-500/25 bg-amber-500/4'
              : 'border-cyan-500/20 bg-cyan-500/4'
          }`}>
            <div className={`px-4 py-3 border-b flex items-center gap-2 ${
              hasMissing ? 'border-amber-500/20' : 'border-cyan-500/15'
            }`}>
              {hasMissing && <AlertTriangle size={13} className="text-amber-400" />}
              <span className={`text-sm font-semibold ${hasMissing ? 'text-amber-400' : 'text-cyan-400'}`}>
                ขั้นตอนที่ {expandedPhase} — {PHASES.find(p => p.no === expandedPhase)?.label}
              </span>
              {hasMissing && (
                <span className="ml-auto text-xs text-amber-400/70 font-medium">
                  กรุณากรอกข้อมูลให้ครบ
                </span>
              )}
            </div>
            <div className="p-4">
              <PhaseEditForm
                project={project}
                phase={expandedPhase}
                isPending={isPending}
                startTransition={startTransition}
                onSuccess={() => router.refresh()}
              />
            </div>
          </div>
        )
      })()}

      {/* Budget */}
      <div>
        <p className="text-xs text-black/50 uppercase tracking-widest mb-2 font-semibold">งบประมาณ</p>
        <div className="grid grid-cols-3 gap-2">
          <BudgetCell label="งบประมาณ (ไม่รวม VAT)" value={project.budget_excl_vat} />
          <BudgetCell label="งบจัดจ้าง (รวม VAT)" value={project.contract_incl_vat} />
          <BudgetCell label="งบจัดจ้าง (ไม่รวม VAT)" value={contractExclVat} note="÷1.07" />
        </div>
      </div>

      {/* Contract Info (phase 4+) */}
      {project.current_phase >= 4 && project.project_contracts && (
        <ContractInfo contract={project.project_contracts} deadlineSt={ds} />
      )}

      {/* Completion Info (phase 6 only) */}
      {project.current_phase === 6 && (
        <CompletionInfo project={project} />
      )}

      {/* Certificate (phase 6 only) */}
      {project.current_phase === 6 && (
        <CertificateSection project={project} onRefresh={() => router.refresh()} />
      )}

      {/* Delete */}
      {isAdmin && (
        <div className="pt-1 border-t border-black/6">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-red-400/40 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} /> ลบโครงการนี้
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs text-red-400 flex-1">ยืนยันลบโครงการ? ไม่สามารถกู้คืนได้</p>
              <button onClick={() => setConfirmDelete(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-black/10 text-black/40 hover:text-black/70">
                ยกเลิก
              </button>
              <button disabled={isPending}
                onClick={() => startTransition(async () => {
                  const res = await deleteProject(project.id)
                  if (res.success) { toast.success('ลบโครงการแล้ว'); onClose(); router.refresh() }
                  else toast.error(res.error)
                })}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-40">
                {isPending ? 'กำลังลบ...' : 'ยืนยันลบ'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Contract Info ────────────────────────────────────────────────────────────

import type { ProjectContract } from '@/lib/types'

function ContractInfo({ contract: c, deadlineSt }: {
  contract: ProjectContract
  deadlineSt: 'overdue' | 'near' | 'ok' | null
}) {
  function fmtDate(d: string | null) {
    if (!d) return '-'
    try { return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  const rows: Array<{ label: string; value: string | number | null; highlight?: boolean }> = [
    { label: 'ผู้รับจ้าง',        value: c.contractor_name },
    { label: 'เลขที่สัญญา',       value: c.contract_number },
    { label: 'ลงวันที่สัญญา',     value: fmtDate(c.contract_date) },
    { label: 'วันเริ่มสัญญา',     value: fmtDate(c.contract_start_date) },
    { label: 'ระยะเวลา',          value: c.construction_days ? `${c.construction_days} วัน` : null },
    { label: 'วันหมดสัญญา',       value: fmtDate(c.contract_end_date), highlight: deadlineSt === 'overdue' || deadlineSt === 'near' },
  ].filter(r => r.value && r.value !== '-')

  if (rows.length === 0) return null

  return (
    <div>
      <p className="text-xs text-black/50 uppercase tracking-widest mb-2 font-semibold">รายละเอียดสัญญา</p>
      <div className="bg-black/4 rounded-xl divide-y divide-black/5">
        {rows.map(r => (
          <div key={r.label} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
            <span className="text-xs text-black/55 shrink-0">{r.label}</span>
            <span className={`text-xs text-right font-semibold break-all ${
              r.highlight
                ? deadlineSt === 'overdue' ? 'text-red-400' : 'text-amber-400'
                : 'text-black/80'
            }`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Completion Info ──────────────────────────────────────────────────────────

function CompletionInfo({ project }: { project: BudgetProject }) {
  const isPipe = project.project_type === 'pipe'
  const latest = latestProgress(project)

  function fmtDate(d: string | null) {
    if (!d) return null
    try { return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }
    catch { return d }
  }

  const rows: Array<{ label: string; value: string; highlight?: boolean }> = [
    ...(fmtDate(project.completion_submission_date)
      ? [{ label: 'วันส่งงาน', value: fmtDate(project.completion_submission_date)! }]
      : []),
    ...(fmtDate(project.completion_inspection_date)
      ? [{ label: 'วันตรวจรับงาน', value: fmtDate(project.completion_inspection_date)! }]
      : []),
    ...(isPipe && latest?.pipe_length_completed != null
      ? [{ label: 'ความยาวท่อแล้วเสร็จ', value: `${latest.pipe_length_completed.toLocaleString('th-TH')} ม.`, highlight: true }]
      : []),
  ]

  if (rows.length === 0) return null

  return (
    <div>
      <p className="text-xs text-black/50 uppercase tracking-widest mb-2 font-semibold">ข้อมูลการแล้วเสร็จ</p>
      <div className="bg-black/4 rounded-xl divide-y divide-black/5">
        {rows.map(r => (
          <div key={r.label} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
            <span className="text-xs text-black/55 shrink-0">{r.label}</span>
            <span className={`text-xs text-right font-semibold ${r.highlight ? 'text-emerald-400' : 'text-black/80'}`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Budget Cell ──────────────────────────────────────────────────────────────

function BudgetCell({ label, value, note }: { label: string; value: number | null | undefined; note?: string }) {
  return (
    <div className="bg-black/4 rounded-xl p-3.5">
      <p className="text-xs text-black/50 mb-2 leading-tight font-medium">{label}</p>
      <p className="text-sm font-bold text-[#12181F] num">
        {value != null ? `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 2 })}` : '-'}
      </p>
      {note && <p className="text-xs text-black/35 mt-0.5">{note}</p>}
    </div>
  )
}

// ─── Phase Edit Form ──────────────────────────────────────────────────────────

function PhaseEditForm({
  project, phase, isPending, startTransition, onSuccess,
}: {
  project: BudgetProject; phase: number; isPending: boolean
  startTransition: (fn: () => void) => void; onSuccess: () => void
}) {
  const [startDate, setStartDate] = useState(project.project_contracts?.contract_start_date ?? '')
  const [conDays,   setConDays]   = useState(String(project.project_contracts?.construction_days ?? ''))
  const computedEnd = (() => {
    if (!startDate || !conDays || isNaN(parseInt(conDays))) return ''
    const d = new Date(startDate)
    d.setDate(d.getDate() + parseInt(conDays))
    return d.toISOString().split('T')[0]
  })()

  const handlePhase123 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateProjectPhase(project.id, phase as 1|2|3, fd)
      if (res.success) { toast.success('บันทึกสำเร็จ'); onSuccess() }
      else toast.error(res.error)
    })
  }

  const handlePhase4 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (computedEnd) fd.set('contract_end_date', computedEnd)
    startTransition(async () => {
      const res = await upsertProjectContract(project.id, fd)
      if (res.success) { toast.success('บันทึกสัญญาสำเร็จ'); onSuccess() }
      else toast.error(res.error)
    })
  }

  const handlePhase5Start = () => {
    startTransition(async () => {
      const res = await updateCurrentPhase(project.id, 5)
      if (res.success) { toast.success('เริ่มดำเนินงานก่อสร้าง'); onSuccess() }
      else toast.error(res.error)
    })
  }

  const handleAddProgress = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await addProgressUpdate(project.id, fd)
      if (res.success) { toast.success('เพิ่มอัปเดตสำเร็จ'); onSuccess() }
      else toast.error(res.error)
    })
  }

  const handleCompletion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateProjectCompletion(project.id, fd)
      if (res.success) { toast.success('บันทึกความสำเร็จโครงการ'); onSuccess() }
      else toast.error(res.error)
    })
  }

  if (phase >= 1 && phase <= 3) {
    const dateKey  = `phase${phase}_completed_at` as keyof BudgetProject
    const notesKey = `phase${phase}_notes` as keyof BudgetProject
    return (
      <form onSubmit={handlePhase123} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-black/55 mb-1 font-medium">วันที่เสร็จสิ้น</label>
            <input type="date" name={dateKey} defaultValue={project[dateKey] as string ?? ''}
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs text-black/55 mb-1 font-medium">หมายเหตุ</label>
            <input type="text" name={notesKey} defaultValue={project[notesKey] as string ?? ''}
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/50" />
          </div>
        </div>
        <SaveBtn isPending={isPending} />
      </form>
    )
  }

  if (phase === 4) {
    const c = project.project_contracts
    const isPipe = project.project_type === 'pipe'
    return (
      <form onSubmit={handlePhase4} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {isPipe && <InputField name="estimated_pipe_length" label="ความยาวประมาณการ (ม.)" type="number" defaultValue={c?.estimated_pipe_length ?? ''} />}
          <InputField name="contractor_name" label="ชื่อผู้รับจ้าง" defaultValue={c?.contractor_name ?? ''} />
          <InputField name="contract_number" label="เลขที่สัญญา" defaultValue={c?.contract_number ?? ''} />
          <InputField name="contract_date" label="ลงวันที่สัญญา" type="date" defaultValue={c?.contract_date ?? ''} />
          <InputField name="construction_days" label="ระยะเวลาก่อสร้าง (วัน)" type="number"
            value={conDays} onChange={e => setConDays(e.target.value)} />
          <InputField name="contract_start_date" label="วันเริ่มสัญญา" type="date"
            value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        {computedEnd && (
          <div className="bg-cyan-500/10 rounded-lg px-3.5 py-2.5">
            <p className="text-xs text-black/55 font-medium">วันหมดสัญญา (คำนวณอัตโนมัติ)</p>
            <p className="text-sm text-cyan-300 font-medium mt-0.5">
              {new Date(computedEnd).toLocaleDateString('th-TH', { dateStyle: 'long' })}
            </p>
          </div>
        )}
        <SaveBtn isPending={isPending} />
      </form>
    )
  }

  if (phase === 5) {
    const isPipe  = project.project_type === 'pipe'
    const updates = [...(project.project_progress_updates ?? [])].sort(
      (a, b) => new Date(b.reported_date).getTime() - new Date(a.reported_date).getTime()
    )
    const est = project.project_contracts?.estimated_pipe_length
    return (
      <div className="space-y-4">
        {project.current_phase < 5 && (
          <button onClick={handlePhase5Start} disabled={isPending || project.current_phase < 4}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-30 transition-colors">
            {project.current_phase < 4 ? 'ต้องบันทึก Phase 4 ก่อน' : 'เริ่มดำเนินงานก่อสร้าง'}
          </button>
        )}
        {updates.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-black/50 font-semibold">ประวัติอัปเดต</p>
            {updates.map(u => {
              const p = isPipe && est && est > 0 && u.pipe_length_completed != null
                ? Math.round((u.pipe_length_completed / est) * 100)
                : null
              return (
                <div key={u.id} className="bg-black/4 rounded-lg px-3.5 py-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-black/60 font-medium">{new Date(u.reported_date).toLocaleDateString('th-TH')}</span>
                    {isPipe && u.pipe_length_completed != null ? (
                      <span className="text-cyan-300 font-semibold num">
                        {u.pipe_length_completed.toLocaleString('th-TH')} ม.
                        {p !== null && <span className="text-black/40 ml-1">({p}%)</span>}
                      </span>
                    ) : (
                      <span className="text-cyan-400/70 text-xs">บันทึกแล้ว</span>
                    )}
                  </div>
                  {u.notes && <p className="text-black/55 mt-1">{u.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
        {project.current_phase >= 5 && (
          <form onSubmit={handleAddProgress} className="space-y-2 border-t border-black/8 pt-3">
            <p className="text-xs text-black/55 font-semibold">เพิ่มอัปเดต</p>
            <div className="grid grid-cols-2 gap-2">
              <InputField name="reported_date" label="วันที่" type="date"
                defaultValue={new Date().toISOString().split('T')[0]} />
              {isPipe && (
                <InputField name="pipe_length_completed" label="ความยาวท่อที่วาง (ม.)" type="number" step="0.01" />
              )}
            </div>
            <textarea name="notes" placeholder="หมายเหตุ / สถานะงาน" rows={2}
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] resize-none focus:outline-none focus:border-cyan-500/50 placeholder-white/20" />
            <SaveBtn isPending={isPending} label="เพิ่มอัปเดต" />
          </form>
        )}
      </div>
    )
  }

  if (phase === 6) {
    return (
      <div className="space-y-3">
        <form onSubmit={handleCompletion} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <InputField name="completion_submission_date" label="วันส่งงาน" type="date"
              defaultValue={project.completion_submission_date ?? ''} />
            <InputField name="completion_inspection_date" label="วันตรวจรับงาน" type="date"
              defaultValue={project.completion_inspection_date ?? ''} />
          </div>
          <div>
            <label className="block text-xs text-black/55 mb-1 font-medium">หมายเหตุ</label>
            <textarea name="completion_notes" defaultValue={project.completion_notes ?? ''} rows={2}
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] resize-none focus:outline-none focus:border-cyan-500/50" />
          </div>
          <SaveBtn isPending={isPending} />
        </form>
        <CertificateSection project={project} onRefresh={onSuccess} />
      </div>
    )
  }

  return null
}

// ─── Certificate Section ──────────────────────────────────────────────────────

function CertificateSection({ project, onRefresh }: {
  project: BudgetProject
  onRefresh: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('รองรับเฉพาะไฟล์ PDF เท่านั้น')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('projectId', project.id)
      if (project.certificate_url) fd.append('oldUrl', project.certificate_url)

      const res = await fetch('/api/upload/certificate', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'upload failed')

      const saveRes = await saveCertificateUrl(project.id, json.publicUrl)
      if (saveRes.success) { toast.success('แนบใบรับรองสำเร็จ'); onRefresh() }
      else toast.error(saveRes.error)
    } catch {
      toast.error('อัปโหลดไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <p className="text-xs text-black/50 uppercase tracking-widest mb-2 font-semibold">ใบรับรองผลงาน</p>
      <div className="bg-black/4 rounded-xl p-3">
        {project.certificate_url ? (
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={project.certificate_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
            >
              <ExternalLink size={12} /> เปิดเอกสาร
            </a>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-black/40 border border-black/10 hover:text-black/70 hover:border-black/20 disabled:opacity-40 transition-colors"
            >
              <Paperclip size={12} /> {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนไฟล์'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black/5 text-black/50 border border-black/10 hover:bg-black/10 hover:text-black/70 disabled:opacity-40 transition-colors"
          >
            <Paperclip size={12} /> {uploading ? 'กำลังอัปโหลด...' : 'แนบใบรับรอง PDF'}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
        />
      </div>
    </div>
  )
}

// ─── New Project Modal ────────────────────────────────────────────────────────

function NewProjectModal({ yearId, groupId, branches, sessionBranchId, isRegion, onClose, onSuccess }: {
  yearId: string; groupId: string; branches: Branch[]
  sessionBranchId: string | null; isRegion: boolean
  onClose: () => void; onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('budget_year_id', yearId)
    fd.append('budget_group_id', groupId)
    if (!isRegion && sessionBranchId) fd.set('branch_id', sessionBranchId)
    startTransition(async () => {
      const res = await createProject(fd)
      if (res.success) { toast.success('เพิ่มโครงการสำเร็จ'); onSuccess() }
      else toast.error(res.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl overflow-hidden animate-fadein shadow-2xl">
        {/* Mac titlebar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/8 bg-black/3">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
          <p className="flex-1 text-center text-sm font-semibold text-black/70">เพิ่มโครงการใหม่</p>
          <div className="w-3" />
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {isRegion && (
            <div>
              <label className="block text-xs text-black/55 mb-1 font-medium">สาขา</label>
              <select name="branch_id" required
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/50">
                <option value="">เลือกสาขา...</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_th}</option>
                ))}
              </select>
            </div>
          )}
          {!isRegion && sessionBranchId && (
            <input type="hidden" name="branch_id" value={sessionBranchId} />
          )}
          <div>
            <label className="block text-xs text-black/40 mb-1">ประเภทโครงการ</label>
            <select name="project_type" defaultValue="pipe"
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/50">
              <option value="pipe">ปรับปรุงท่อ (มีการวัดความยาวท่อ)</option>
              <option value="dma">DMA / มาตรวัดน้ำ / PRV (ไม่มีความยาวท่อ)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-black/40 mb-1">รหัสโครงการ</label>
            <input type="text" name="code" placeholder="เช่น ผด.07-2568-001"
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs text-black/40 mb-1">ชื่อโครงการ <span className="text-red-400">*</span></label>
            <input type="text" name="project_name" required placeholder="กรอกชื่อโครงการ..."
              className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-black/55 mb-1 font-medium">งบประมาณ (ไม่รวม VAT)</label>
              <input type="number" name="budget_excl_vat" step="0.01" min="0" placeholder="0.00"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="block text-xs text-black/55 mb-1 font-medium">งบจัดจ้าง (รวม VAT)</label>
              <input type="number" name="contract_incl_vat" step="0.01" min="0" placeholder="0.00"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2.5 text-sm text-[#12181F] placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-black/50 hover:text-black/80 border border-black/10 transition-colors">
              ยกเลิก
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 disabled:opacity-40 transition-colors">
              {isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InputField({ name, label, type = 'text', defaultValue, value, onChange, step }: {
  name: string; label: string; type?: string; defaultValue?: string | number
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string
}) {
  const props = value !== undefined ? { value, onChange } : { defaultValue }
  return (
    <div>
      <label className="block text-xs text-black/55 mb-1 font-medium">{label}</label>
      <input type={type} name={name} step={step} {...props}
        className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/50" />
    </div>
  )
}

function SaveBtn({ isPending, label = 'บันทึก' }: { isPending: boolean; label?: string }) {
  return (
    <button type="submit" disabled={isPending}
      className="w-full py-2 rounded-lg text-sm font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-40 transition-colors">
      {isPending ? 'กำลังบันทึก...' : label}
    </button>
  )
}
