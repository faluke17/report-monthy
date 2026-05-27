'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Branch } from '@/lib/types'
import type { BranchNrwSnap } from '../page'
import type { BranchExecutiveSummary } from '@/app/actions/executive-summary'
import { getExecutiveBranchSummary } from '@/app/actions/executive-summary'
import { BranchSummaryPanel } from './BranchSummaryPanel'

const SCAN_MS = 1600

// ลำดับสาขาตามที่กำหนด (seed order จาก branches migration)
const BRANCH_ORDER = [
  'NKS','TTK','LYW','PYK',   // นครสวรรค์
  'CNT',                      // ชัยนาท
  'UTN',                      // อุทัยธานี
  'KPP','KNU',                // กำแพงเพชร
  'TAK','MSO',                // ตาก
  'SKT','TSL','SRR','SWK','SSN', // สุโขทัย
  'UTT',                      // อุตรดิตถ์
  'PKM','NKT',                // พิษณุโลก
  'PCT','BML','TPH',          // พิจิตร
  'PBC','LOM','CHN','NNP','VCB', // เพชรบูรณ์
]

// ── Helpers ─────────────────────────────────────────────────────
function sevFromNrw(pct: number | null, status: string | null) {
  if (!status || status === 'draft') return 'grey'
  if (pct === null) return 'grey'
  if (pct <= 20) return 'ok'
  if (pct <= 25) return 'warn'
  return 'crit'
}
const SEV_COLOR = { ok: '#10D9B0', warn: '#F59E0B', crit: '#EF4444', grey: '#64748B' }

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

// ── Corners ──────────────────────────────────────────────────────
function Corners({ color = 'rgba(34,211,238,0.7)' }: { color?: string }) {
  const s: React.CSSProperties = { position: 'absolute', width: 12, height: 12, borderColor: color }
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
  const c = SEV_COLOR[sev as keyof typeof SEV_COLOR]
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('branch-id', branch.id); onDragStart(branch.id) }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '9px 11px',
        background: isLoaded ? 'rgba(34,211,238,0.07)' : 'rgba(7,11,22,0.6)',
        border: `1px solid ${isLoaded ? 'rgba(34,211,238,0.7)' : 'rgba(34,211,238,0.16)'}`,
        marginBottom: 5,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 9,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.35 : 1,
        transition: 'transform .16s ease, border-color .16s ease, box-shadow .16s ease, background .16s ease',
        boxShadow: isLoaded ? `0 0 0 1px rgba(34,211,238,0.5), 0 0 18px rgba(34,211,238,0.2)` : 'none',
        userSelect: 'none',
      }}
      className="branch-dock-card"
    >
      <span className={sev !== 'ok' && sev !== 'grey' ? 'anim-blink-crit' : ''} style={{
        width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block',
        boxShadow: `0 0 8px ${c}`,
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(34,211,238,0.5)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>{branch.code}</div>
        <div style={{ fontSize: 13, color: '#E2E8F0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {branch.name_th}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: c }}>
          {snap?.nrw_pct != null ? snap.nrw_pct.toFixed(1) + '%' : '—'}
        </div>
        <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace' }}>NRW</div>
      </div>
    </div>
  )
}

// ── Radar empty state ──────────────────────────────────────────────
function RadarEmpty({ isOver }: { isOver: boolean }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', width: 320, height: 320 }}>
        {[1, 0.75, 0.5, 0.25].map((r, i) => (
          <div key={i} style={{
            position: 'absolute', inset: `${(1 - r) * 50}%`,
            border: `1px solid rgba(34,211,238,${0.07 + i * 0.055})`, borderRadius: '50%',
          }} />
        ))}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(34,211,238,0.12)' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(34,211,238,0.12)' }} />
        {/* Sweep arm */}
        <div className="anim-radar" style={{ position: 'absolute', inset: 0, transformOrigin: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '50%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.9))', transformOrigin: 'left', boxShadow: '0 0 8px rgba(34,211,238,0.7)' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '50%', height: '50%', background: 'conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.14) 60deg, transparent 80deg)', transformOrigin: 'top left' }} />
        </div>
        {/* Pulse rings on hover */}
        {isOver && (
          <>
            <div className="anim-pulse-ring" style={{ position: 'absolute', inset: '30%', borderRadius: '50%', border: '2px solid rgba(34,211,238,0.8)' }} />
            <div className="anim-pulse-ring" style={{ position: 'absolute', inset: '30%', borderRadius: '50%', border: '2px solid rgba(34,211,238,0.8)', animationDelay: '0.8s' }} />
          </>
        )}
        {/* Center dot */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 22, height: 22, border: '1px solid rgba(34,211,238,0.8)', boxShadow: '0 0 12px rgba(34,211,238,0.5)' }}>
          <div style={{ position: 'absolute', top: -7, left: '50%', width: 1, height: 5, background: 'rgba(34,211,238,0.8)' }} />
          <div style={{ position: 'absolute', bottom: -7, left: '50%', width: 1, height: 5, background: 'rgba(34,211,238,0.8)' }} />
          <div style={{ position: 'absolute', left: -7, top: '50%', height: 1, width: 5, background: 'rgba(34,211,238,0.8)' }} />
          <div style={{ position: 'absolute', right: -7, top: '50%', height: 1, width: 5, background: 'rgba(34,211,238,0.8)' }} />
        </div>
        {/* Blips */}
        {[[20,30],[78,22],[62,70],[25,75],[85,55]].map(([x,y],i) => (
          <div key={i} className="anim-blink-crit" style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`, width: 4, height: 4,
            background: 'rgba(34,211,238,0.8)', borderRadius: '50%', boxShadow: '0 0 6px rgba(34,211,238,0.8)',
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
      </div>
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'rgba(34,211,238,0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 2 }}>
          // STAND BY · NO TARGET ACQUIRED
        </div>
        <div style={{ marginTop: 14, fontSize: 20, color: '#E2E8F0', fontWeight: 300 }}>
          {isOver ? 'วางได้เลย — กำลังเล็งเป้าหมาย' : 'ลากสาขาที่ต้องการมาวางที่นี่'}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#64748B' }}>
          หรือคลิกที่สาขาในรายการด้านซ้าย
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 10, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', justifyContent: 'center' }}>
          <span>◇ ภาพรวมสูญเสีย</span>
          <span>◇ PDCA เดือนล่าสุด</span>
          <span>◇ งบประมาณ 2569</span>
        </div>
      </div>
    </div>
  )
}

// ── Scan overlay ──────────────────────────────────────────────────
function CyberScan({ branch }: { branch: Branch }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 50 }}>
      <div className="anim-scan" style={{
        position: 'absolute', left: 0, right: 0, height: 80,
        background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.04) 40%, rgba(34,211,238,0.45) 50%, rgba(34,211,238,0.04) 60%, transparent 100%)',
        boxShadow: '0 0 24px rgba(34,211,238,0.5)',
      }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div className="anim-blink-crit" style={{ fontSize: 10, color: 'rgba(34,211,238,0.9)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 2, textShadow: '0 0 12px rgba(34,211,238,0.8)' }}>
          ACQUIRING TARGET · กำลังดึงข้อมูล
        </div>
        <div style={{ marginTop: 8, fontSize: 22, color: '#E2E8F0', letterSpacing: 1, fontWeight: 500 }}>
          {branch.code} · สาขา{branch.name_th}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
interface Props {
  branches: Branch[]
  snapMap: Record<string, BranchNrwSnap>
}

export function ExecutiveSummaryClient({ branches, snapMap }: Props) {
  const now = useClock()
  const { date, time } = thaiDateTime(now)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isOver, setIsOver] = useState(false)
  const [scanning, setScanning] = useState<Branch | null>(null)
  const [loadedBranch, setLoadedBranch] = useState<Branch | null>(null)
  const [summaryData, setSummaryData] = useState<BranchExecutiveSummary | null>(null)
  const [search, setSearch] = useState('')
  const [animKey, setAnimKey] = useState(0)
  const dropRef = useRef<HTMLDivElement>(null)

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
    if (result.data) {
      setSummaryData(result.data)
      setAnimKey((k) => k + 1)
    }
  }, [scanning])

  const filteredBranches = branches
    .filter((b) => {
      const q = search.trim().toLowerCase()
      return !q || b.name_th.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const ai = BRANCH_ORDER.indexOf(a.code)
      const bi = BRANCH_ORDER.indexOf(b.code)
      if (ai === -1 && bi === -1) return a.name_th.localeCompare(b.name_th, 'th')
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

  const critCount = branches.filter((b) => sevFromNrw(snapMap[b.id]?.nrw_pct ?? null, snapMap[b.id]?.report_status ?? null) === 'crit').length
  const warnCount = branches.filter((b) => sevFromNrw(snapMap[b.id]?.nrw_pct ?? null, snapMap[b.id]?.report_status ?? null) === 'warn').length

  // Grid pattern background
  const gridBg = `linear-gradient(rgba(34,211,238,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.055) 1px, transparent 1px)`

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(180deg,#040912 0%,#03060d 100%)',
    }}>
      {/* Background grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: gridBg, backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 90%)', opacity: 0.7 }} />
      {/* Scan lines overlay */}
      <div className="anim-flicker" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(180deg, rgba(34,211,238,0.018) 0px, rgba(34,211,238,0.018) 1px, transparent 1px, transparent 3px)', mixBlendMode: 'screen', opacity: 0.4, zIndex: 999 }} />

      {/* ── Header ── */}
      <header style={{
        height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px', flexShrink: 0,
        borderBottom: '1px solid rgba(34,211,238,0.18)',
        background: 'linear-gradient(180deg, rgba(7,11,22,0.95), rgba(5,8,18,0.8))',
        backdropFilter: 'blur(10px)', position: 'relative', zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 38, height: 38, border: '1px solid rgba(34,211,238,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(34,211,238,0.35), inset 0 0 10px rgba(34,211,238,0.12)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.8))' }}>
              <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
              <path d="M12 8v6M9 11h6" strokeOpacity="0.5" />
            </svg>
            <Corners />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 16, color: '#E2E8F0', fontWeight: 600, letterSpacing: 0.3 }}>บทสรุปผู้บริหาร</span>
              <span style={{ fontSize: 10, color: 'rgba(34,211,238,0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.4 }}>· WSC-R10 · MATE</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
              ศูนย์บัญชาการ กปภ.เขต ๑๐ — ระบบติดตาม NRW
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {loadedBranch && (
            <button
              onClick={() => { setLoadedBranch(null); setSummaryData(null) }}
              style={{ padding: '5px 12px', fontSize: 10, letterSpacing: 1, color: 'rgba(34,211,238,0.8)', background: 'transparent', border: '1px solid rgba(34,211,238,0.35)', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ✕ ปลดเป้าหมาย
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="anim-blink-crit" style={{ width: 7, height: 7, borderRadius: '50%', background: '#10D9B0', boxShadow: '0 0 8px #10D9B0', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#10D9B0', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>SYS · ONLINE</span>
          </div>
          <div style={{ width: 1, height: 26, background: 'rgba(34,211,238,0.18)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>{date}</div>
            <div style={{ fontSize: 15, color: 'rgba(34,211,238,0.9)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.5, textShadow: '0 0 8px rgba(34,211,238,0.6)' }}>{time}</div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0 }}>

        {/* ── Branch Dock ── */}
        <aside style={{
          width: 280, flexShrink: 0,
          borderRight: '1px solid rgba(34,211,238,0.14)',
          background: 'linear-gradient(180deg,rgba(7,11,22,0.75),rgba(5,8,18,0.75))',
          display: 'flex', flexDirection: 'column',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(34,211,238,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'rgba(34,211,238,0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.4 }}>// DOCK · BRANCH REGISTRY</span>
              <span style={{ fontSize: 10, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace' }}>{filteredBranches.length}/26</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 14, color: '#E2E8F0', fontWeight: 500 }}>หน่วยปฏิบัติการสาขา</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.4)', color: 'rgba(34,211,238,0.9)', fontFamily: 'IBM Plex Mono, monospace' }}>{filteredBranches.length} สาขา</span>
              {critCount > 0 && <span className="anim-blink-crit" style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.5)', color: '#F87171', fontFamily: 'IBM Plex Mono, monospace' }}>{critCount} วิกฤต</span>}
              {warnCount > 0 && <span style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', color: '#FCD34D', fontFamily: 'IBM Plex Mono, monospace' }}>{warnCount} เฝ้าระวัง</span>}
            </div>
            <div style={{ position: 'relative', marginTop: 10 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาสาขา..."
                style={{ width: '100%', padding: '6px 10px 6px 28px', fontSize: 12, background: 'rgba(7,11,22,0.8)', border: '1px solid rgba(34,211,238,0.22)', color: '#E2E8F0', outline: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
              />
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.6)" strokeWidth="2" style={{ position: 'absolute', left: 8, top: 8 }}>
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>
              ▸ ลากหรือคลิกสาขาเพื่อเปิดข้อมูล
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {filteredBranches.map((b) => (
              <BranchDockCard
                key={b.id}
                branch={b}
                snap={snapMap[b.id]}
                isDragging={draggingId === b.id}
                isLoaded={loadedBranch?.id === b.id}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => loadBranch(b)}
              />
            ))}
            {filteredBranches.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748B', fontSize: 12, padding: 20, fontFamily: 'IBM Plex Mono, monospace' }}>ไม่พบสาขา</div>
            )}
          </div>

          <div style={{ borderTop: '1px solid rgba(34,211,238,0.1)', padding: '8px 14px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>WSC-R10 · NRW TRACKER</span>
            <span style={{ fontSize: 9, color: '#10D9B0', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>● LINK · STABLE</span>
          </div>
        </aside>

        {/* ── Main Stage ── */}
        <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', padding: 14, minWidth: 0 }}>
          {/* Stage label bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 10, color: 'rgba(34,211,238,0.7)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.4 }}>// HOLOGRAPHIC DISPLAY · พื้นที่วิเคราะห์</span>
              {draggingId && (
                <span className="anim-blink-crit" style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1.4 }}>◆ TARGET INBOUND · กำลังลากเป้าหมาย</span>
              )}
            </div>
            <span style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>
              FRAME: 0x{Math.floor(Date.now() / 1000).toString(16).slice(-6).toUpperCase()}
            </span>
          </div>

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
              border: `1px solid ${isOver ? 'rgba(34,211,238,0.9)' : 'rgba(34,211,238,0.22)'}`,
              background: 'rgba(5,8,18,0.5)',
              boxShadow: isOver
                ? 'inset 0 0 80px rgba(34,211,238,0.14), 0 0 30px rgba(34,211,238,0.2)'
                : 'inset 0 0 40px rgba(34,211,238,0.04)',
              transition: 'border-color .2s ease, box-shadow .25s ease',
              overflow: 'hidden',
            }}
          >
            <Corners />
            {/* Inner micro-grid */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35, backgroundImage: `linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

            {!loadedBranch && !scanning && <RadarEmpty isOver={isOver} />}
            {scanning && <CyberScan branch={scanning} />}
            {loadedBranch && !scanning && summaryData && (
              <BranchSummaryPanel data={summaryData} animKey={animKey} />
            )}

            {/* Drop target frame when dragging */}
            {(isOver || draggingId) && !loadedBranch && !scanning && (
              <div style={{ position: 'absolute', inset: 8, pointerEvents: 'none' }}>
                <Corners color="rgba(34,211,238,0.9)" />
                <div className="anim-blink-crit" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 10, color: 'rgba(34,211,238,0.9)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 2, textShadow: '0 0 8px rgba(34,211,238,0.8)', textAlign: 'center' }}>
                  ▾ DROP TO ACQUIRE TARGET ▾
                </div>
              </div>
            )}
          </div>

          {/* Telemetry bar */}
          <div style={{ marginTop: 8, padding: '7px 12px', border: '1px solid rgba(34,211,238,0.13)', background: 'rgba(7,11,22,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'BRANCHES', val: `${branches.length} ACTIVE`, color: 'rgba(34,211,238,0.8)' },
                { label: 'CRIT', val: `${critCount}`, color: critCount > 0 ? '#F87171' : '#64748B' },
                { label: 'WARN', val: `${warnCount}`, color: warnCount > 0 ? '#FCD34D' : '#64748B' },
                { label: 'DATA', val: loadedBranch ? loadedBranch.code : 'STANDBY', color: loadedBranch ? 'rgba(34,211,238,0.8)' : '#64748B' },
              ].map(({ label, val, color }) => (
                <span key={label} style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1 }}>
                  {label} <span style={{ color }}>{val}</span>
                </span>
              ))}
            </div>
            <span style={{ fontSize: 9, color: '#64748B', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.8 }}>
              MATE © ๒๕๖๙ · การประปาส่วนภูมิภาค เขต ๑๐
            </span>
          </div>
        </main>
      </div>
    </div>
  )
}
