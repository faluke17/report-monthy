'use client'

import { useState, useTransition, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2, AlertTriangle, Paperclip, ExternalLink, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { BudgetProject, Branch } from '@/lib/types'
import { PhaseTimeline } from '@/components/dashboard/PhaseTimeline'
import {
  createProject, deleteProject, updateProjectPhase, upsertProjectContract,
  updateCurrentPhase, addProgressUpdate, updateProjectCompletion, saveCertificateUrl,
} from '@/app/actions/project-progress'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

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

function formatMoney(val: number | null | undefined) {
  if (val == null) return '-'
  return val.toLocaleString('th-TH', { maximumFractionDigits: 2 })
}
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
      if (target) { setSelected(target); setExpandedPhase(null) }
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
          { label: 'ทั้งหมด',     value: total,       color: 'text-white' },
          { label: 'กำลังดำเนิน', value: inProgress,  color: 'text-cyan-400' },
          { label: 'เสร็จแล้ว',   value: completed,   color: 'text-emerald-400' },
          { label: 'รอข้อมูล',    value: incomplete6, color: 'text-amber-400' },
          { label: 'เกินกำหนด',   value: overdue,     color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass-card px-4 py-3">
            <p className="text-[11px] text-white/40 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold num ${s.color}`}>{s.value}</p>
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
              className="w-full bg-white/5 border border-white/12 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:border-cyan-500/40"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Branch filter (region only) */}
          {isRegion && (
            <select
              value={filterBranchId}
              onChange={e => setFilterBranchId(e.target.value)}
              className="flex-1 min-w-[140px] max-w-[200px] bg-white/5 border border-white/12 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/40"
            >
              <option value="">ทุกสาขา</option>
              {activeBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name_th}</option>
              ))}
            </select>
          )}

          <div className="flex items-center justify-between flex-1 min-w-0">
            <p className="text-xs text-white/40 truncate">
              {groupName}
              {(q || filterBranchId)
                ? <span className="text-cyan-400 ml-1">· {total} โครงการ (กรอง)</span>
                : <span className="ml-1">· {total} โครงการ</span>
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
          <div className="py-16 text-center text-white/25 text-sm">
            {filterBranchId ? 'ไม่มีโครงการในสาขาที่เลือก' : 'ยังไม่มีโครงการ'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/6">
                  <th className="text-center px-4 py-2.5 font-medium w-10">#</th>
                  <th className="text-left px-4 py-2.5 font-medium">สาขา</th>
                  <th className="text-left px-4 py-2.5 font-medium">ชื่อโครงการ</th>
                  <th className="text-center px-4 py-2.5 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, idx) => {
                  const phase   = project.current_phase
                  const ds      = deadlineStatus(project)
                  const pct     = progressPct(project)
                  const missing = phase6Missing(project)
                  const incomplete = missing && (missing.dates || missing.certificate)
                  return (
                    <tr
                      key={project.id}
                      onClick={() => { setSelected(project); setExpandedPhase(null); setConfirmDelete(false) }}
                      className="border-b border-white/4 hover:bg-white/3 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-center text-white/25 text-xs num">{idx + 1}</td>
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                        {project.branches?.name_th ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium leading-snug">{project.project_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {project.code && <p className="text-[10px] text-white/25 font-mono">{project.code}</p>}
                          {project.project_type === 'dma' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400">DMA</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                            phase === 6 && !incomplete ? 'bg-emerald-500/15 text-emerald-400'
                            : phase === 6 &&  incomplete ? 'bg-amber-500/15 text-amber-400'
                            : phase > 0                  ? 'bg-cyan-500/15 text-cyan-400'
                            :                              'bg-white/5 text-white/30'
                          }`}>
                            {phase === 6 && incomplete ? 'รอข้อมูล' : PHASE_LABELS[phase]}
                          </span>
                          {phase === 5 && pct !== null && (
                            <span className="text-[10px] text-cyan-400 num">{pct}%</span>
                          )}
                          {missing?.dates && (
                            <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5">
                              <Calendar size={9} /> ขาดวันส่ง/ตรวจ
                            </span>
                          )}
                          {missing?.certificate && (
                            <span className="text-[10px] text-amber-400/80 flex items-center gap-0.5">
                              <Paperclip size={9} /> ไม่มีใบรับรอง
                            </span>
                          )}
                          {ds === 'overdue' && (
                            <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                              <AlertTriangle size={9} /> เกินกำหนด
                            </span>
                          )}
                          {ds === 'near' && (
                            <span className="text-[10px] text-amber-400">ใกล้ครบกำหนด</span>
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
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-white/3 shrink-0">
              <button
                onClick={closeDetail}
                className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors shrink-0"
              />
              <div className="flex-1 text-center min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">{selected.project_name}</p>
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
    <div className="p-5 space-y-5">
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full">
          {project.branches?.name_th ?? '-'}
        </span>
        {project.code && (
          <span className="text-xs text-white/30 font-mono bg-white/4 px-2.5 py-1 rounded-full">
            {project.code}
          </span>
        )}
        {ds === 'overdue' && (
          <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
            <AlertTriangle size={11} /> เกินกำหนดสัญญา
          </span>
        )}
      </div>

      {/* Budget */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">งบประมาณ</p>
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

      {/* Certificate (phase 6 only) */}
      {project.current_phase === 6 && (
        <CertificateSection project={project} onRefresh={() => router.refresh()} />
      )}

      {/* Phase Timeline */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">ขั้นตอนการดำเนินงาน</p>
        <PhaseTimeline
          project={project}
          selectedPhase={expandedPhase}
          onSelectPhase={onSelectPhase}
          onTogglePhase={onTogglePhase}
          progressPct={pct}
          projectType={project.project_type}
        />
      </div>

      {/* Phase Edit Form */}
      {expandedPhase !== null && (
        <div className="bg-white/4 rounded-xl p-4 border border-white/8">
          <PhaseEditForm
            project={project}
            phase={expandedPhase}
            isPending={isPending}
            startTransition={startTransition}
            onSuccess={() => router.refresh()}
          />
        </div>
      )}

      {/* Delete */}
      {isAdmin && (
        <div className="pt-1 border-t border-white/6">
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
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70">
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
      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">รายละเอียดสัญญา</p>
      <div className="bg-white/4 rounded-xl divide-y divide-white/5">
        {rows.map(r => (
          <div key={r.label} className="flex items-start justify-between gap-3 px-3 py-2">
            <span className="text-[11px] text-white/35 shrink-0">{r.label}</span>
            <span className={`text-[11px] text-right font-medium break-all ${
              r.highlight
                ? deadlineSt === 'overdue' ? 'text-red-400' : 'text-amber-400'
                : 'text-white/70'
            }`}>
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
    <div className="bg-white/4 rounded-xl p-3">
      <p className="text-[10px] text-white/30 mb-1.5 leading-tight">{label}</p>
      <p className="text-sm font-bold text-white num">
        {value != null ? `฿${value.toLocaleString('th-TH', { maximumFractionDigits: 2 })}` : '-'}
      </p>
      {note && <p className="text-[10px] text-white/20 mt-0.5">{note}</p>}
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
  const LABEL_MAP: Record<number, string> = {
    1: 'ราคากลาง', 2: 'TOR', 3: 'พิจารณาผล', 4: 'เซ็นสัญญา', 5: 'ดำเนินงานก่อสร้าง', 6: 'งานแล้วเสร็จ',
  }

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

  const LABEL = `แก้ไข — ${LABEL_MAP[phase] ?? `Phase ${phase}`}`

  if (phase >= 1 && phase <= 3) {
    const dateKey  = `phase${phase}_completed_at` as keyof BudgetProject
    const notesKey = `phase${phase}_notes` as keyof BudgetProject
    return (
      <form onSubmit={handlePhase123} className="space-y-3">
        <p className="text-xs font-semibold text-white/60">{LABEL}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-white/40 mb-1">วันที่เสร็จสิ้น</label>
            <input type="date" name={dateKey} defaultValue={project[dateKey] as string ?? ''}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1">หมายเหตุ</label>
            <input type="text" name={notesKey} defaultValue={project[notesKey] as string ?? ''}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50" />
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
        <p className="text-xs font-semibold text-white/60">{LABEL}</p>
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
          <div className="bg-cyan-500/10 rounded-lg px-3 py-2">
            <p className="text-[11px] text-white/40">วันหมดสัญญา (คำนวณอัตโนมัติ)</p>
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
        <p className="text-xs font-semibold text-white/60">{LABEL}</p>
        {project.current_phase < 5 && (
          <button onClick={handlePhase5Start} disabled={isPending || project.current_phase < 4}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-30 transition-colors">
            {project.current_phase < 4 ? 'ต้องบันทึก Phase 4 ก่อน' : 'เริ่มดำเนินงานก่อสร้าง'}
          </button>
        )}
        {updates.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-white/30">ประวัติอัปเดต</p>
            {updates.map(u => {
              const p = isPipe && est && est > 0 && u.pipe_length_completed != null
                ? Math.round((u.pipe_length_completed / est) * 100)
                : null
              return (
                <div key={u.id} className="bg-white/4 rounded-lg px-3 py-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/50">{new Date(u.reported_date).toLocaleDateString('th-TH')}</span>
                    {isPipe && u.pipe_length_completed != null ? (
                      <span className="text-cyan-400 font-semibold num">
                        {u.pipe_length_completed.toLocaleString('th-TH')} ม.
                        {p !== null && <span className="text-white/30 ml-1">({p}%)</span>}
                      </span>
                    ) : (
                      <span className="text-cyan-400/60 text-[10px]">บันทึกแล้ว</span>
                    )}
                  </div>
                  {u.notes && <p className="text-white/35 mt-0.5">{u.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
        {project.current_phase >= 5 && (
          <form onSubmit={handleAddProgress} className="space-y-2 border-t border-white/8 pt-3">
            <p className="text-[11px] text-white/40">เพิ่มอัปเดต</p>
            <div className="grid grid-cols-2 gap-2">
              <InputField name="reported_date" label="วันที่" type="date"
                defaultValue={new Date().toISOString().split('T')[0]} />
              {isPipe && (
                <InputField name="pipe_length_completed" label="ความยาวท่อที่วาง (ม.)" type="number" step="0.01" />
              )}
            </div>
            <textarea name="notes" placeholder="หมายเหตุ / สถานะงาน" rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-cyan-500/50 placeholder-white/20" />
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
          <p className="text-xs font-semibold text-white/60">{LABEL}</p>
          <div className="grid grid-cols-2 gap-2">
            <InputField name="completion_submission_date" label="วันส่งงาน" type="date"
              defaultValue={project.completion_submission_date ?? ''} />
            <InputField name="completion_inspection_date" label="วันตรวจรับงาน" type="date"
              defaultValue={project.completion_inspection_date ?? ''} />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 mb-1">หมายเหตุ</label>
            <textarea name="completion_notes" defaultValue={project.completion_notes ?? ''} rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-cyan-500/50" />
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

  function extractStoragePath(url: string): string | null {
    const marker = '/object/public/project-certificates/'
    const idx = url.indexOf(marker)
    return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
  }

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('รองรับเฉพาะไฟล์ PDF เท่านั้น')
      return
    }
    setUploading(true)
    try {
      const supabase = createBrowserClient()

      if (project.certificate_url) {
        const oldPath = extractStoragePath(project.certificate_url)
        if (oldPath) await supabase.storage.from('project-certificates').remove([oldPath])
      }

      const path = `projects/${project.id}/${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage
        .from('project-certificates')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('project-certificates').getPublicUrl(path)
      const res = await saveCertificateUrl(project.id, publicUrl)
      if (res.success) { toast.success('แนบใบรับรองสำเร็จ'); onRefresh() }
      else toast.error(res.error)
    } catch {
      toast.error('อัปโหลดไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">ใบรับรองผลงาน</p>
      <div className="bg-white/4 rounded-xl p-3">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 border border-white/10 hover:text-white/70 hover:border-white/20 disabled:opacity-40 transition-colors"
            >
              <Paperclip size={12} /> {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนไฟล์'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70 disabled:opacity-40 transition-colors"
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
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-white/3">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
          <p className="flex-1 text-center text-sm font-semibold text-white/70">เพิ่มโครงการใหม่</p>
          <div className="w-3" />
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {isRegion && (
            <div>
              <label className="block text-xs text-white/40 mb-1">สาขา</label>
              <select name="branch_id" required
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50">
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
            <label className="block text-xs text-white/40 mb-1">ประเภทโครงการ</label>
            <select name="project_type" defaultValue="pipe"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50">
              <option value="pipe">ปรับปรุงท่อ (มีการวัดความยาวท่อ)</option>
              <option value="dma">DMA / มาตรวัดน้ำ / PRV (ไม่มีความยาวท่อ)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">รหัสโครงการ</label>
            <input type="text" name="code" placeholder="เช่น ผด.07-2568-001"
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">ชื่อโครงการ <span className="text-red-400">*</span></label>
            <input type="text" name="project_name" required placeholder="กรอกชื่อโครงการ..."
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-white/40 mb-1">งบประมาณ (ไม่รวม VAT)</label>
              <input type="number" name="budget_excl_vat" step="0.01" min="0" placeholder="0.00"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">งบจัดจ้าง (รวม VAT)</label>
              <input type="number" name="contract_incl_vat" step="0.01" min="0" placeholder="0.00"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/50" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 border border-white/10 transition-colors">
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
      <label className="block text-[11px] text-white/40 mb-1">{label}</label>
      <input type={type} name={name} step={step} {...props}
        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50" />
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
