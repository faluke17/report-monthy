'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Branch } from '@/lib/types'
import type { BranchNrwSnap } from '../page'
import type { BranchExecutiveSummary } from '@/app/actions/executive-summary'
import { getExecutiveBranchSummary } from '@/app/actions/executive-summary'
import { BranchSummaryPanel } from './BranchSummaryPanel'

const SCAN_MS = 1400

const PROVINCE_GROUPS = [
  { province: 'นครสวรรค์', codes: ['NKS','TTK','LYW','PYK'] },
  { province: 'ชัยนาท',    codes: ['CNT'] },
  { province: 'อุทัยธานี', codes: ['UTN'] },
  { province: 'กำแพงเพชร', codes: ['KPP','KNU'] },
  { province: 'ตาก',       codes: ['TAK','MSO'] },
  { province: 'สุโขทัย',   codes: ['SKT','TSL','SRR','SWK','SSN'] },
  { province: 'อุตรดิตถ์',  codes: ['UTT'] },
  { province: 'พิษณุโลก',  codes: ['PKM','NKT'] },
  { province: 'พิจิตร',    codes: ['PCT','BML','TPH'] },
  { province: 'เพชรบูรณ์', codes: ['PBC','LOM','CHN','NNP','VCB'] },
]

type Sev = 'ok' | 'warn' | 'crit' | 'grey'
type SevFilter = 'all' | 'crit' | 'warn'

const BRANCH_ORDER = ['NKS','TTK','LYW','PYK','CNT','UTN','KPP','KNU','TAK','MSO','SKT','TSL','SRR','SWK','SSN','UTT','PKM','NKT','PCT','BML','TPH','PBC','LOM','CHN','NNP','VCB']

function sevFromNrw(pct: number | null, status: string | null): Sev {
  if (!status || status === 'draft') return 'grey'
  if (pct === null) return 'grey'
  if (pct <= 20) return 'ok'
  if (pct <= 25) return 'warn'
  return 'crit'
}

const SEV_COLOR: Record<Sev, string> = {
  ok:   '#10D9B0',
  warn: '#F59E0B',
  crit: '#EF4444',
  grey: '#475569',
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function thaiDateTime(d: Date) {
  const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return {
    date: `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear() + 543}`,
    time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`,
  }
}

function Corners({ color = 'rgba(34,211,238,0.55)', size = 12 }: { color?: string; size?: number }) {
  const s: React.CSSProperties = { position: 'absolute', width: size, height: size, borderColor: color }
  return (
    <>
      <span style={{ ...s, top: -1, left: -1,  borderTop: '1px solid', borderLeft: '1px solid' }} />
      <span style={{ ...s, top: -1, right: -1, borderTop: '1px solid', borderRight: '1px solid' }} />
      <span style={{ ...s, bottom: -1, left: -1, borderBottom: '1px solid', borderLeft: '1px solid' }} />
      <span style={{ ...s, bottom: -1, right: -1, borderBottom: '1px solid', borderRight: '1px solid' }} />
    </>
  )
}

// ── Branch dock card ──────────────────────────────────────────────
function BranchDockCard({
  branch, snap, isDragging, isLoaded, onDragStart, onDragEnd, onClick,
}: {
  branch: Branch
  snap: BranchNrwSnap | undefined
  isDragging: boolean
  isLoaded: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onClick: () => void
}) {
  const sev = sevFromNrw(snap?.nrw_pct ?? null, snap?.report_status ?? null)
  const c = SEV_COLOR[sev]

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('branch-id', branch.id); onDragStart(branch.id) }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`exec-dock-card${isLoaded ? ' is-loaded' : ''}`}
      style={{
        position: 'relative',
        padding: '7px 10px 7px 12px',
        background: isLoaded ? 'rgba(34,211,238,0.08)' : 'rgba(8,14,26,0.4)',
        border: `1px solid ${isLoaded ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.1)'}`,
        borderLeft: `2px solid ${isLoaded ? c : `${c}55`}`,
        marginBottom: 3,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 8,
        opacity: isDragging ? 0.3 : 1,
        transform: isDragging ? 'scale(0.97)' : undefined,
      }}
    >
      <span
        className={sev === 'crit' || sev === 'warn' ? 'anim-blink-crit' : ''}
        style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', boxShadow: `0 0 5px ${c}`, flexShrink: 0 }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 8, color: isLoaded ? 'rgba(34,211,238,0.6)' : '#475569', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>{branch.code}</div>
        <div style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {branch.name_th}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: c }}>
          {snap?.nrw_pct != null ? snap.nrw_pct.toFixed(1) + '%' : '—'}
        </div>
      </div>
    </div>
  )
}

// ── Hero Stage (full-screen empty state) ─────────────────────────
function HeroStage({ critCount, warnCount, okCount, totalCount }: {
  critCount: number; warnCount: number; okCount: number; totalCount: number
}) {
  const greyCount = totalCount - critCount - warnCount - okCount

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 48px',
      overflow: 'hidden',
    }}>
      {/* BG radial glow — centered */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.045) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.035) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* ── Radar ── */}
      <div className="anim-float" style={{ position: 'relative', width: 220, height: 220, marginBottom: 36 }}>
        {/* Outermost dashed ring */}
        <div className="anim-radar-slow" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px dashed rgba(34,211,238,0.14)' }} />
        {/* Outer ring */}
        <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', border: '1px solid rgba(34,211,238,0.22)', boxShadow: '0 0 18px rgba(34,211,238,0.06)' }} />
        {/* Mid ring */}
        <div style={{ position: 'absolute', inset: 38, borderRadius: '50%', border: '1px solid rgba(34,211,238,0.32)', boxShadow: '0 0 12px rgba(34,211,238,0.1)' }} />
        {/* Inner filled */}
        <div style={{ position: 'absolute', inset: 64, borderRadius: '50%', border: '1px solid rgba(34,211,238,0.5)', background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)' }} />
        {/* Sweep — rotating */}
        <div className="anim-radar" style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', animationDuration: '3.5s' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'conic-gradient(from 270deg, transparent 0deg, rgba(34,211,238,0.0) 0deg, rgba(34,211,238,0.24) 55deg, rgba(34,211,238,0.0) 85deg)' }} />
        </div>
        {/* Crosshairs */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: '60%', height: 1, background: 'rgba(34,211,238,0.1)' }} />
          <div style={{ position: 'absolute', width: 1, height: '60%', background: 'rgba(34,211,238,0.1)' }} />
        </div>
        {/* Center core */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22D3EE', boxShadow: '0 0 20px #22D3EE, 0 0 6px #22D3EE, 0 0 40px rgba(34,211,238,0.3)' }} />
        </div>
        {/* Ping rings */}
        <div className="anim-radar-ping"   style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '1px solid rgba(34,211,238,0.38)' }} />
        <div className="anim-radar-ping-2" style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '1px solid rgba(34,211,238,0.18)' }} />
        {/* Blips on radar */}
        {([
          { top: '20%', left: '64%', c: '#EF4444', delay: 0 },
          { top: '58%', left: '22%', c: '#F59E0B', delay: 0.5 },
          { top: '35%', left: '52%', c: '#10D9B0', delay: 0.9 },
          { top: '70%', left: '60%', c: '#10D9B0', delay: 1.4 },
          { top: '30%', left: '30%', c: '#EF4444', delay: 0.7 },
        ] as { top: string; left: string; c: string; delay: number }[]).map((b, i) => (
          <div key={i} className="anim-blink-crit" style={{ position: 'absolute', top: b.top, left: b.left, width: 5, height: 5, borderRadius: '50%', background: b.c, boxShadow: `0 0 8px ${b.c}`, animationDelay: `${b.delay}s` }} />
        ))}
        {/* Range labels */}
        {[
          { text: '5', r: 64 }, { text: '10', r: 38 }, { text: '15', r: 16 },
        ].map(({ text, r }) => (
          <div key={text} style={{ position: 'absolute', top: `calc(50% - ${r}px - 7px)`, left: '52%', fontSize: 7, color: 'rgba(34,211,238,0.2)', fontFamily: 'IBM Plex Mono, monospace' }}>{text}</div>
        ))}
      </div>

      {/* ── Main text ── */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontSize: 10, color: 'rgba(34,211,238,0.38)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 3, marginBottom: 12 }}>
          // BRANCH ACQUISITION SYSTEM · READY
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.0, marginBottom: 14 }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#CBD5E1', letterSpacing: 1.5, textShadow: '0 0 40px rgba(34,211,238,0.1)' }}>
            Let&apos;s drag ur
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: '#22D3EE', letterSpacing: 2, textShadow: '0 0 32px rgba(34,211,238,0.65), 0 0 80px rgba(34,211,238,0.2)' }}>
              Branch
            </span>
            <span className="anim-blink-crit" style={{ fontSize: 42, color: 'rgba(34,211,238,0.65)', fontWeight: 200, lineHeight: 1 }}>_</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#1E293B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.8 }}>
          ← DRAG FROM REGISTRY  ·  OR CLICK BRANCH IN LEFT PANEL
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 680 }}>
        {([
          { key: 'CRIT',   val: critCount,  sub: '> 25% NRW',  c: '#EF4444', bg: 'rgba(239,68,68,0.07)',  bd: 'rgba(239,68,68,0.25)',  top: 'rgba(239,68,68,0.6)' },
          { key: 'WARN',   val: warnCount,  sub: '≤ 25% NRW',  c: '#F59E0B', bg: 'rgba(245,158,11,0.06)', bd: 'rgba(245,158,11,0.22)', top: 'rgba(245,158,11,0.5)' },
          { key: 'PASS',   val: okCount,    sub: '≤ 20% NRW',  c: '#10D9B0', bg: 'rgba(16,217,176,0.06)', bd: 'rgba(16,217,176,0.2)',  top: 'rgba(16,217,176,0.45)' },
          { key: 'N/A',    val: greyCount,  sub: 'ไม่มีข้อมูล', c: '#475569', bg: 'rgba(71,85,105,0.06)', bd: 'rgba(71,85,105,0.2)',   top: 'rgba(71,85,105,0.35)' },
        ] as { key: string; val: number; sub: string; c: string; bg: string; bd: string; top: string }[]).map(({ key, val, sub, c, bg, bd, top }) => (
          <div key={key} style={{
            flex: 1, position: 'relative', padding: '20px 16px 18px',
            background: bg, border: `1px solid ${bd}`,
            borderTop: `2px solid ${top}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflow: 'hidden',
          }}>
            {/* Card bg glow */}
            <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${c}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <Corners color={`${c}55`} size={7} />
            {/* Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}`, display: 'inline-block' }} />
              <span style={{ fontSize: 9, color: c, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 2, fontWeight: 700 }}>{key}</span>
            </div>
            {/* Big number */}
            <div style={{ fontSize: 64, fontWeight: 900, color: c, fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1, textShadow: `0 0 24px ${c}55`, marginBottom: 8 }}>
              {val}
            </div>
            {/* Sub label */}
            <div style={{ fontSize: 10, color: '#334155', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>{sub}</div>
            <div style={{ fontSize: 9, color: '#1E293B', fontFamily: 'IBM Plex Mono, monospace', marginTop: 3 }}>สาขา</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Cyber scan overlay ────────────────────────────────────────────
function CyberScan({ branch }: { branch: Branch }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="anim-scan" style={{
        position: 'absolute', left: 0, right: 0, height: 90,
        background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.03) 35%, rgba(34,211,238,0.38) 50%, rgba(34,211,238,0.03) 65%, transparent 100%)',
        boxShadow: '0 0 28px rgba(34,211,238,0.35)',
      }} />
      <div style={{ position: 'relative', width: 220, height: 110 }}>
        <Corners color="rgba(34,211,238,0.45)" size={18} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div className="anim-blink-crit" style={{ fontSize: 9, color: 'rgba(34,211,238,0.55)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 3 }}>ACQUIRING TARGET</div>
          <div style={{ fontSize: 26, color: '#E2E8F0', letterSpacing: 3, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', textShadow: '0 0 18px rgba(34,211,238,0.35)' }}>{branch.code}</div>
          <div style={{ fontSize: 13, color: 'rgba(34,211,238,0.5)', letterSpacing: 1 }}>สาขา{branch.name_th}</div>
          <div className="anim-blink-crit" style={{ marginTop: 4, fontSize: 8, color: '#334155', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 2, animationDelay: '0.4s' }}>กำลังดึงข้อมูล...</div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
interface Props {
  branches: Branch[]
  snapMap: Record<string, BranchNrwSnap>
}

export function ExecutiveSummaryClient({ branches, snapMap }: Props) {
  const now = useClock()
  const { date, time } = thaiDateTime(now)

  const [draggingId, setDraggingId]     = useState<string | null>(null)
  const [isOver, setIsOver]             = useState(false)
  const [scanning, setScanning]         = useState<Branch | null>(null)
  const [loadedBranch, setLoadedBranch] = useState<Branch | null>(null)
  const [summaryData, setSummaryData]   = useState<BranchExecutiveSummary | null>(null)
  const [search, setSearch]             = useState('')
  const [animKey, setAnimKey]           = useState(0)
  const [sevFilter, setSevFilter]       = useState<SevFilter>('all')
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLoadedBranch(null); setSummaryData(null); setScanning(null) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const loadBranch = useCallback(async (branch: Branch) => {
    if (scanning) return
    setScanning(branch)
    setSummaryData(null)
    setLoadedBranch(null)
    const [result] = await Promise.all([
      getExecutiveBranchSummary(branch.id),
      new Promise<void>((r) => setTimeout(r, SCAN_MS)),
    ])
    setScanning(null)
    setLoadedBranch(branch)
    if (result.data) { setSummaryData(result.data); setAnimKey((k) => k + 1) }
  }, [scanning])

  const critCount = branches.filter((b) => sevFromNrw(snapMap[b.id]?.nrw_pct ?? null, snapMap[b.id]?.report_status ?? null) === 'crit').length
  const warnCount = branches.filter((b) => sevFromNrw(snapMap[b.id]?.nrw_pct ?? null, snapMap[b.id]?.report_status ?? null) === 'warn').length
  const okCount   = branches.filter((b) => sevFromNrw(snapMap[b.id]?.nrw_pct ?? null, snapMap[b.id]?.report_status ?? null) === 'ok').length

  const filteredBranches = branches
    .filter((b) => {
      const q = search.trim().toLowerCase()
      if (q && !b.name_th.toLowerCase().includes(q) && !b.code.toLowerCase().includes(q)) return false
      if (sevFilter !== 'all') {
        return sevFromNrw(snapMap[b.id]?.nrw_pct ?? null, snapMap[b.id]?.report_status ?? null) === sevFilter
      }
      return true
    })
    .sort((a, b) => {
      if (!search.trim() && sevFilter === 'all') {
        const order = { crit: 0, warn: 1, ok: 2, grey: 3 }
        const sa = sevFromNrw(snapMap[a.id]?.nrw_pct ?? null, snapMap[a.id]?.report_status ?? null)
        const sb = sevFromNrw(snapMap[b.id]?.nrw_pct ?? null, snapMap[b.id]?.report_status ?? null)
        if (order[sa] !== order[sb]) return order[sa] - order[sb]
      }
      const ai = BRANCH_ORDER.indexOf(a.code), bi = BRANCH_ORDER.indexOf(b.code)
      if (ai === -1 && bi === -1) return a.name_th.localeCompare(b.name_th, 'th')
      if (ai === -1) return 1; if (bi === -1) return -1
      return ai - bi
    })

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      background: [
        'radial-gradient(ellipse at 20% 0%, rgba(34,211,238,0.055) 0%, transparent 45%)',
        'radial-gradient(ellipse at 90% 95%, rgba(59,130,246,0.04) 0%, transparent 50%)',
        'linear-gradient(180deg, #050913 0%, #04070F 100%)',
      ].join(', '),
    }}>
      {/* BG grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 90%)',
      }} />
      {/* CRT scan lines */}
      <div className="anim-flicker" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
        background: 'repeating-linear-gradient(180deg, rgba(34,211,238,0.016) 0px, rgba(34,211,238,0.016) 1px, transparent 1px, transparent 3px)',
        mixBlendMode: 'screen', opacity: 0.35,
      }} />

      {/* ── Header ── */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0,
        borderBottom: '1px solid rgba(34,211,238,0.15)',
        background: 'linear-gradient(180deg, rgba(8,12,24,0.93), rgba(6,10,20,0.78))',
        backdropFilter: 'blur(10px)',
        position: 'relative', zIndex: 20,
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 38, height: 38, border: '1px solid rgba(34,211,238,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(34,211,238,0.05)',
            boxShadow: '0 0 14px rgba(34,211,238,0.45), inset 0 0 12px rgba(34,211,238,0.12)',
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.75))' }}>
              <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
              <path d="M9 12l2 2 4-4" strokeOpacity="0.7" />
            </svg>
            <Corners size={8} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 17, color: '#E2E8F0', fontWeight: 600, letterSpacing: 0.3 }}>ระบบ MATE</span>
              <span style={{ fontSize: 9, color: 'rgba(34,211,238,0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.6 }}>· DIALOG MODE · v3.2</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
              หน้าต่างสรุปสาขา — การประปาส่วนภูมิภาค เขต ๑๐
            </div>
          </div>
        </div>

        {/* Status + clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="anim-blink-crit" style={{ width: 7, height: 7, borderRadius: '50%', background: '#10D9B0', boxShadow: '0 0 8px #10D9B0', display: 'inline-block' }} />
            <span style={{ fontSize: 9, color: '#10D9B0', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>SYS · ONLINE</span>
          </div>
          <div style={{ width: 1, height: 26, background: 'rgba(34,211,238,0.2)' }} />
          <div style={{ textAlign: 'right' }}>
            <div suppressHydrationWarning style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>{date}</div>
            <div suppressHydrationWarning style={{ fontSize: 15, color: 'rgba(34,211,238,0.9)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.5, textShadow: '0 0 8px rgba(34,211,238,0.55)' }}>{time}</div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0, zIndex: 10 }}>

        {/* ── Branch Dock ── */}
        <aside className="exec-panel" style={{
          width: 264, flexShrink: 0,
          borderRight: '1px solid rgba(34,211,238,0.15)',
          borderTop: 'none', borderLeft: 'none', borderBottom: 'none',
          borderRadius: 0,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid rgba(34,211,238,0.1)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 8, color: 'rgba(34,211,238,0.45)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.8 }}>// BRANCH REGISTRY</span>
              <span style={{ fontSize: 8, color: '#334155', fontFamily: 'IBM Plex Mono, monospace' }}>{filteredBranches.length}/{branches.length}</span>
            </div>

            {/* Severity filter */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 8 }}>
              {([
                { key: 'all'  as SevFilter, label: 'ทั้งหมด', count: branches.length, c: 'rgba(34,211,238,0.85)' },
                { key: 'crit' as SevFilter, label: 'วิกฤต',   count: critCount,       c: '#EF4444' },
                { key: 'warn' as SevFilter, label: 'เฝ้าดู',  count: warnCount,       c: '#F59E0B' },
              ] as { key: SevFilter; label: string; count: number; c: string }[]).map(({ key, label, count, c }) => {
                const active = sevFilter === key
                return (
                  <button
                    key={key}
                    onClick={() => setSevFilter(key)}
                    className="mode-btn"
                    style={{
                      padding: '5px 4px', fontSize: 9,
                      background: active ? `${c}18` : 'rgba(8,14,26,0.5)',
                      border: `1px solid ${active ? c : 'rgba(34,211,238,0.12)'}`,
                      color: active ? c : '#475569',
                      cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{count}</span>
                    <span style={{ fontSize: 8 }}>{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาสาขา / รหัส..."
                style={{ width: '100%', padding: '5px 8px 5px 25px', fontSize: 11, background: 'rgba(4,7,14,0.7)', border: '1px solid rgba(34,211,238,0.18)', color: '#CBD5E1', outline: 'none', boxSizing: 'border-box' }}
              />
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.4)" strokeWidth="2" style={{ position: 'absolute', left: 7, top: 8 }}>
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
          </div>

          {/* Branch list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {(() => {
              const useFlat = !!(search.trim() || sevFilter !== 'all')
              if (useFlat) {
                if (!filteredBranches.length) return (
                  <div style={{ textAlign: 'center', color: '#334155', fontSize: 10, padding: '24px 0', fontFamily: 'IBM Plex Mono, monospace' }}>// ไม่พบสาขา</div>
                )
                return filteredBranches.map((b) => (
                  <BranchDockCard key={b.id} branch={b} snap={snapMap[b.id]} isDragging={draggingId === b.id} isLoaded={loadedBranch?.id === b.id} onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)} onClick={() => loadBranch(b)} />
                ))
              }
              const byCode = Object.fromEntries(filteredBranches.map(b => [b.code, b]))
              return PROVINCE_GROUPS.map(({ province, codes }) => {
                const group = codes.map(c => byCode[c]).filter(Boolean)
                if (!group.length) return null
                return (
                  <div key={province} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(34,211,238,0.08)' }} />
                      <span style={{ fontSize: 8, color: 'rgba(34,211,238,0.3)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.6, flexShrink: 0 }}>{province}</span>
                    </div>
                    {group.map((b) => (
                      <BranchDockCard key={b.id} branch={b} snap={snapMap[b.id]} isDragging={draggingId === b.id} isLoaded={loadedBranch?.id === b.id} onDragStart={setDraggingId} onDragEnd={() => setDraggingId(null)} onClick={() => loadBranch(b)} />
                    ))}
                  </div>
                )
              })
            })()}
          </div>

          <div style={{ borderTop: '1px solid rgba(34,211,238,0.08)', padding: '5px 12px', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 8, color: '#1E293B', fontFamily: 'IBM Plex Mono, monospace' }}>DRAG · CLICK TO SELECT</span>
            <span style={{ fontSize: 8, color: '#10D9B0', fontFamily: 'IBM Plex Mono, monospace' }}>● LIVE</span>
          </div>
        </aside>

        {/* ── Main Stage ── */}
        <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', padding: '8px 12px 8px 10px', minWidth: 0 }}>
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setIsOver(true) }}
            onDragEnter={(e) => { e.preventDefault(); setIsOver(true) }}
            onDragLeave={(e) => { if (!dropRef.current?.contains(e.relatedTarget as Node)) setIsOver(false) }}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('branch-id') || draggingId
              setIsOver(false); setDraggingId(null)
              if (!id) return
              const branch = branches.find((b) => b.id === id)
              if (branch) loadBranch(branch)
            }}
            style={{
              flex: 1, position: 'relative',
              border: `1px solid ${isOver ? 'rgba(34,211,238,0.65)' : draggingId ? 'rgba(34,211,238,0.35)' : 'rgba(34,211,238,0.13)'}`,
              background: isOver ? 'rgba(34,211,238,0.02)' : 'rgba(4,7,14,0.6)',
              boxShadow: isOver ? 'inset 0 0 80px rgba(34,211,238,0.08), 0 0 24px rgba(34,211,238,0.12)' : draggingId ? 'inset 0 0 40px rgba(34,211,238,0.04)' : 'none',
              transition: 'border-color .2s, box-shadow .25s, background .2s',
              overflow: 'hidden',
            }}
          >
            <Corners />
            {/* Micro-grid background */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(34,211,238,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.025) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }} />

            <HeroStage critCount={critCount} warnCount={warnCount} okCount={okCount} totalCount={branches.length} />

            {/* Drag-inbound banner */}
            {draggingId && !isOver && (
              <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'none' }}>
                <div className="anim-blink-crit" style={{ padding: '5px 20px', border: '1px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.06)', fontSize: 9, color: '#F59E0B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 2 }}>
                  ◆ DROP HERE TO LOAD BRANCH ◆
                </div>
              </div>
            )}

            {/* Drop overlay */}
            {isOver && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(34,211,238,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', inset: 8 }}><Corners color="rgba(34,211,238,0.65)" size={20} /></div>
                <div style={{ textAlign: 'center' }}>
                  <div className="anim-blink-crit" style={{ fontSize: 11, color: 'rgba(34,211,238,0.9)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 2.5, textShadow: '0 0 12px rgba(34,211,238,0.8)', marginBottom: 6 }}>
                    ▾ RELEASE TO ACQUIRE ▾
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(34,211,238,0.35)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.5 }}>TARGET LOCKED</div>
                </div>
              </div>
            )}
          </div>

          {/* Telemetry bar */}
          <div style={{ marginTop: 6, padding: '5px 14px', border: '1px solid rgba(34,211,238,0.12)', background: 'rgba(8,12,24,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 18 }}>
              {[
                { l: 'MODE',    v: 'DIALOG',             c: 'rgba(34,211,238,0.7)' },
                { l: 'CRIT',   v: `${critCount}`,        c: critCount > 0 ? '#EF4444' : '#1E293B' },
                { l: 'WARN',   v: `${warnCount}`,        c: warnCount > 0 ? '#F59E0B' : '#1E293B' },
                { l: 'PASS',   v: `${okCount}`,          c: '#10D9B0' },
                { l: 'SYNC',   v: '● LIVE',              c: '#10D9B0' },
              ].map(({ l, v, c }) => (
                <span key={l} style={{ fontSize: 8, color: '#334155', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.1 }}>
                  {l} <span style={{ color: c, fontWeight: 700 }}>{v}</span>
                </span>
              ))}
            </div>
            <span style={{ fontSize: 8, color: '#1E293B', fontFamily: 'IBM Plex Mono, monospace' }}>MATE © ๒๕๖๙ · กปภ.เขต ๑๐</span>
          </div>
        </main>
      </div>

      {/* ── Fullscreen Panel (scan → detail) ── */}
      {(scanning || (loadedBranch && summaryData)) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, overflow: 'hidden',
          background: scanning ? [
            'radial-gradient(ellipse at 20% 0%, rgba(34,211,238,0.04) 0%, transparent 40%)',
            'linear-gradient(180deg, #050913 0%, #04070F 100%)',
          ].join(', ') : 'transparent',
        }}>
          {scanning && <CyberScan branch={scanning} />}
          {!scanning && summaryData && (
            <BranchSummaryPanel
              data={summaryData}
              animKey={animKey}
              onBack={() => { setLoadedBranch(null); setSummaryData(null) }}
            />
          )}
        </div>
      )}
    </div>
  )
}
