'use client'

import { useState } from 'react'
import type { AreaMonthItem, BranchExecutiveSummary, DmaStatRow, MnfNodeRow, MonthlyTrackRow, NodeNrwRow, ObstacleRow } from '@/app/actions/executive-summary'

const THAI_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
type Tab = 'overview' | 'dma' | 'obstacle' | 'mnf' | 'budget'

const MONO = 'IBM Plex Mono, monospace'
const C = {
  bg:      '#04070F',
  panel:   'rgba(10,18,34,0.78)',
  border:  'rgba(34,211,238,0.18)',
  borderH: 'rgba(34,211,238,0.60)',
  row:     'rgba(34,211,238,0.06)',
  text:    '#D2DCE8',
  bright:  '#EAF0F8',
  muted:   '#8DAFC8',
  dim:     '#5A7390',
  accent:  '#22D3EE',
  good:    '#10D9B0',
  warn:    '#F59E0B',
  crit:    '#EF4444',
  blue:    '#3B82F6',
}

function fmt(n: number | null, dec = 0) {
  if (n == null) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function nrwColor(p: number | null) {
  if (p == null) return C.muted
  return p <= 20 ? C.good : p <= 25 ? C.warn : C.crit
}
function nrwLabel(p: number | null): [string, string] {
  if (p == null) return ['ไม่มีข้อมูล', C.muted]
  if (p <= 20) return ['ผ่านเป้าหมาย', C.good]
  if (p <= 25) return ['เฝ้าระวัง', C.warn]
  return ['วิกฤต', C.crit]
}

function Corners({ c = C.borderH, s = 8 }: { c?: string; s?: number }) {
  const st: React.CSSProperties = { position: 'absolute', width: s, height: s }
  return (
    <>
      <span style={{ ...st, top: -1, left: -1,   borderTop: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
      <span style={{ ...st, top: -1, right: -1,  borderTop: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
      <span style={{ ...st, bottom: -1, left: -1,  borderBottom: `1px solid ${c}`, borderLeft: `1px solid ${c}` }} />
      <span style={{ ...st, bottom: -1, right: -1, borderBottom: `1px solid ${c}`, borderRight: `1px solid ${c}` }} />
    </>
  )
}

function Bar({ pct, color = C.accent, thin = false }: { pct: number; color?: string; thin?: boolean }) {
  return (
    <div style={{ height: thin ? 3 : 5, background: 'rgba(34,211,238,0.07)', position: 'relative' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, boxShadow: `0 0 6px ${color}88`, transition: 'width .6s ease' }} />
    </div>
  )
}

function DeltaBadge({ curr, prev, lo = true, size = 'md' }: { curr: number | null; prev: number | null; lo?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  if (curr == null || prev == null || prev === 0) return <span style={{ color: C.muted, fontFamily: MONO, fontSize: size === 'lg' ? 22 : size === 'sm' ? 11 : 15 }}>—</span>
  const d = curr - prev
  const pct = (d / Math.abs(prev)) * 100
  const good = lo ? d < 0 : d > 0
  const color = Math.abs(pct) < 0.5 ? C.muted : good ? C.good : C.crit
  const arrow = d > 0.3 ? '▲' : d < -0.3 ? '▼' : '→'
  const fs = size === 'lg' ? 28 : size === 'sm' ? 11 : 18
  return (
    <span style={{ color, fontFamily: MONO, fontWeight: 700, fontSize: fs }}>
      {arrow} {d > 0 ? '+' : ''}{d.toFixed(2)}%
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-TAB COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  MM: '#22D3EE', DMA: '#10D9B0', SUB: '#A78BFA', VD: '#F59E0B',
}

const ALERT: Record<string, { color: string; label: string }> = {
  red_spike:       { color: C.crit, label: 'ท่อแตก' },
  red_accumulated: { color: '#F1948A', label: 'รั่วซึม' },
  yellow:          { color: C.warn, label: 'เฝ้าดู' },
  green:           { color: C.good, label: 'ปกติ' },
}
const PHASES      = ['ยังไม่เริ่ม','ราคากลาง','TOR','พิจารณาผล','เซ็นสัญญา','ดำเนินงาน','แล้วเสร็จ']
const PHASE_COLOR = ['#4A5568','#9B59B6','#3498DB','#7F8FBF','#E0A020','#1ABC9C', C.good]
const OBS_STATUS: Record<string, string> = {
  'รายงานใหม่': C.accent, 'ระหว่างแก้': C.warn, 'รอสนับสนุน': C.crit,
  'ล่าช้า': '#E67E22', 'เกินกำหนด': C.crit,
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', background: C.panel, border: `1px solid ${C.border}`, padding: '14px 16px', ...style }}>
      <Corners s={6} c={C.border} />
      {children}
    </div>
  )
}
function Sec({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: C.accent, fontFamily: MONO, letterSpacing: 1.6, fontWeight: 700 }}>{'// '}{label}</span>
        {right}
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg,${C.borderH},transparent)`, marginTop: 6 }} />
    </div>
  )
}

function OverviewTab({ nrw, delta, pdca, dmaStats, mnfNodes, budget_2569 }: {
  nrw: BranchExecutiveSummary['nrw']
  delta: number | null
  pdca: BranchExecutiveSummary['pdca']
  dmaStats: DmaStatRow[]
  mnfNodes: MnfNodeRow[]
  budget_2569: BranchExecutiveSummary['budget_2569']
}) {
  const color = nrwColor(nrw.current_pct)
  const repairPct = nrw.leaks_found > 0 ? Math.round(nrw.leaks_repaired / nrw.leaks_found * 100) : 0
  const lossVol = (nrw.water_produced ?? 0) - (nrw.water_sold ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Volume row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'น้ำจ่าย', val: nrw.water_produced, prev: nrw.yoy_produced, unit: 'm³', c: C.accent },
          { label: 'น้ำจำหน่าย', val: nrw.water_sold, prev: nrw.yoy_sold, unit: 'm³', c: C.text },
          { label: 'น้ำสูญเสีย', val: lossVol > 0 ? lossVol : null, prev: null, unit: 'm³', c: color },
        ].map(({ label, val, prev, unit, c }) => (
          <Card key={label} style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: C.text, fontFamily: MONO, letterSpacing: 1, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c, fontFamily: MONO, marginBottom: 6 }}>{fmt(val)}</div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontFamily: MONO }}>{unit}</div>
            {val != null && prev != null && (
              <DeltaBadge curr={val} prev={prev} lo={false} size="sm" />
            )}
          </Card>
        ))}
      </div>

      {/* Leaks */}
      <Card>
        <Sec label="สถานะท่อรั่ว — เดือนนี้" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'พบรั่ว', val: nrw.leaks_found, c: C.accent },
            { label: 'ซ่อมแล้ว', val: nrw.leaks_repaired, c: C.good },
            { label: 'ค้างซ่อม', val: nrw.leaks_pending, c: nrw.leaks_pending > 0 ? C.crit : C.muted },
          ].map(({ label, val, c }) => (
            <div key={label} style={{ position: 'relative', textAlign: 'center', padding: '12px 8px', background: 'rgba(34,211,238,0.03)', border: `1px solid ${C.border}` }}>
              <Corners s={5} c={`${c}55`} />
              <div style={{ fontSize: 10, color: C.text, fontFamily: MONO, marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: c, fontFamily: MONO, lineHeight: 1, textShadow: `0 0 16px ${c}66` }}>{val}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 5, fontFamily: MONO }}>จุด</div>
            </div>
          ))}
        </div>
        {nrw.leaks_found > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, fontFamily: MONO, marginBottom: 4 }}>
              <span>อัตราซ่อม</span>
              <span style={{ color: repairPct >= 80 ? C.good : repairPct >= 50 ? C.warn : C.crit }}>{repairPct}%</span>
            </div>
            <Bar pct={repairPct} color={repairPct >= 80 ? C.good : repairPct >= 50 ? C.warn : C.crit} />
          </div>
        )}
      </Card>

      {/* PDCA */}
      {pdca && (pdca.do_text || pdca.act_text) && (
        <Card>
          <Sec label="PDCA — แผนดำเนินงาน" right={pdca.report_month ? <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{THAI_MONTHS[pdca.report_month]} {pdca.report_year}</span> : undefined} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pdca.do_text && (
              <div>
                <div style={{ fontSize: 9, color: C.accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>DO — ดำเนินการ</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65, padding: '8px 12px', background: C.row, borderLeft: `2px solid ${C.accent}` }}>{pdca.do_text}</div>
              </div>
            )}
            {pdca.act_text && (
              <div>
                <div style={{ fontSize: 9, color: C.good, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>ACT — ปรับปรุง</div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.65, padding: '8px 12px', background: C.row, borderLeft: `2px solid ${C.good}` }}>{pdca.act_text}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* DMA + MNF quick summary */}
      {(dmaStats.length > 0 || mnfNodes.some(n => n.alert_status.startsWith('red'))) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {dmaStats.length > 0 && (
            <Card style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 9, color: C.warn, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 8 }}>// DMA สูงสุด 3 อันดับแรก</div>
              {dmaStats.slice(0, 3).map((d, i) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize: 10, color: i === 0 ? C.crit : C.muted, fontFamily: MONO, width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.area_name || d.area_label}</span>
                  <span style={{ fontSize: 11, color: C.crit, fontFamily: MONO, fontWeight: 700 }}>{fmt(d.water_loss)}</span>
                </div>
              ))}
            </Card>
          )}
          {mnfNodes.filter(n => n.alert_status.startsWith('red')).length > 0 && (
            <Card style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 9, color: C.crit, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 8 }}>// MNF แจ้งเตือน</div>
              {mnfNodes.filter(n => n.alert_status.startsWith('red')).slice(0, 3).map((n, i) => {
                const al = ALERT[n.alert_status] ?? { color: C.muted, label: n.alert_status }
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: al.color, boxShadow: `0 0 4px ${al.color}`, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.node_label}</span>
                    <span style={{ fontSize: 11, color: al.color, fontFamily: MONO, fontWeight: 700 }}>{al.label}</span>
                  </div>
                )
              })}
            </Card>
          )}
        </div>
      )}

      {/* Budget quick */}
      {budget_2569 && (
        <Card style={{ padding: '12px 16px' }}>
          <Sec label={`งบประมาณ 2569 — ${budget_2569.total} โครงการ`} right={budget_2569.overdue > 0 ? <span style={{ fontSize: 10, color: C.crit, fontFamily: MONO }}>⚠ เกินกำหนด {budget_2569.overdue}</span> : undefined} />
          <div style={{ display: 'flex', height: 8, gap: 2, overflow: 'hidden', marginBottom: 8 }}>
            {PHASES.map((_, i) => { const n = budget_2569.by_phase[i] ?? 0; return n ? <div key={i} style={{ flex: n, background: PHASE_COLOR[i], boxShadow: `0 0 4px ${PHASE_COLOR[i]}66` }} title={`${PHASES[i]}: ${n}`} /> : null })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            {PHASES.map((label, i) => { const n = budget_2569.by_phase[i] ?? 0; return n ? (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, background: PHASE_COLOR[i] }} />
                <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
                <span style={{ fontSize: 11, color: PHASE_COLOR[i], fontFamily: MONO, fontWeight: 700 }}>{n}</span>
              </div>
            ) : null })}
          </div>
        </Card>
      )}
    </div>
  )
}

function DmaTab({ nodeDmaStats }: { nodeDmaStats: NodeNrwRow[] }) {
  if (!nodeDmaStats.length) return (
    <Card style={{ textAlign: 'center', padding: 50 }}>
      <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>// ยังไม่มีข้อมูลน้ำจ่ายรายโซนสำหรับสาขานี้</div>
    </Card>
  )

  const total = nodeDmaStats.reduce((s, d) => s + (d.water_loss ?? 0), 0)
  const first = nodeDmaStats[0]
  const periodLabel = `${first.report_year}-${String(first.report_month).padStart(2, '0')}`
  const THAI_M = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  const monthLabel = `${THAI_M[first.report_month]} ${first.report_year + 543}`

  return (
    <Card>
      <Sec
        label={nodeDmaStats.some(d => d.water_loss !== null) ? 'PRIORITY DMA — เรียงตามน้ำสูญเสีย' : 'PRIORITY DMA — เรียงตามน้ำจ่ายสุทธิ (ไม่มีข้อมูลน้ำจำหน่ายรายโซน)'}

        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>ข้อมูลล่าสุด</span>
            <span style={{ fontSize: 10, color: C.accent, fontFamily: MONO, fontWeight: 700 }}>{monthLabel}</span>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>({periodLabel})</span>
          </div>
        }
      />

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, padding: '10px 14px', background: 'rgba(34,211,238,0.04)', border: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginBottom: 3 }}>รวมน้ำสูญเสีย</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.crit, fontFamily: MONO }}>{fmt(total)} <span style={{ fontSize: 10, color: C.dim }}>m³</span></div>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginBottom: 3 }}>จำนวน Node</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, fontFamily: MONO }}>{nodeDmaStats.length}</div>
        </div>
        <div style={{ width: 1, background: C.border }} />
        <div>
          <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginBottom: 3 }}>Device Fail</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: nodeDmaStats.some(d => d.has_device_fail) ? C.warn : C.muted, fontFamily: MONO }}>
            {nodeDmaStats.filter(d => d.has_device_fail).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '28px 80px 1fr 100px 100px 110px 68px', gap: 8, padding: '6px 10px', background: 'rgba(34,211,238,0.07)', borderBottom: `1px solid ${C.border}` }}>
          {['#', 'ประเภท', 'ชื่อ Node', 'น้ำจ่าย', 'จำหน่าย', 'สูญเสีย (m³)', 'NRW%'].map(h => (
            <div key={h} style={{ fontSize: 9, color: C.accent, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>{h}</div>
          ))}
        </div>

        {nodeDmaStats.map((d, i) => {
          const top3 = i < 3
          const tc = TYPE_COLOR[d.node_type] ?? C.muted
          const nrwC = nrwColor(d.nrw_pct)
          return (
            <div
              key={d.water_node_id}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 80px 1fr 100px 100px 110px 68px',
                gap: 8,
                padding: '9px 10px',
                background: top3 ? 'rgba(239,68,68,0.07)' : C.row,
                border: `1px solid ${top3 ? 'rgba(239,68,68,0.25)' : C.border}`,
              }}
            >
              {/* อันดับ */}
              <div style={{ fontSize: 13, fontWeight: 700, color: top3 ? C.crit : C.dim, fontFamily: MONO, textAlign: 'center' }}>{i + 1}</div>

              {/* ประเภท + code */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                <span style={{ fontSize: 8, padding: '1px 4px', border: `1px solid ${tc}55`, color: tc, fontFamily: MONO, fontWeight: 700, flexShrink: 0 }}>{d.node_type}</span>
                <span style={{ fontSize: 9, color: C.muted, fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.node_code}</span>
              </div>

              {/* ชื่อ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span style={{ fontSize: 13, color: top3 ? '#F1948A' : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.node_name || d.node_code}
                </span>
                {d.has_device_fail && (
                  <span style={{ fontSize: 8, color: C.warn, fontFamily: MONO, background: `${C.warn}18`, border: `1px solid ${C.warn}44`, padding: '1px 4px', flexShrink: 0 }}>⚠FAIL</span>
                )}
              </div>

              {/* น้ำจ่าย */}
              <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>{fmt(d.gross_flow)}</div>

              {/* จำหน่าย */}
              <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>{fmt(d.distribute_all)}</div>

              {/* น้ำสูญเสีย */}
              <div style={{ fontSize: 14, fontWeight: 700, color: top3 ? C.crit : C.accent, fontFamily: MONO }}>{fmt(d.water_loss)}</div>

              {/* NRW% */}
              <div style={{ fontSize: 12, fontWeight: 600, color: nrwC, fontFamily: MONO }}>
                {d.nrw_pct != null ? `${d.nrw_pct.toFixed(1)}%` : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ObsPanel({ obstacles }: { obstacles: ObstacleRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (!obstacles.length) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10 }}>
      <div style={{ fontSize: 22, color: C.good, textShadow: `0 0 16px ${C.good}` }}>✓</div>
      <div style={{ fontSize: 12, color: C.good, fontFamily: MONO }}>// ไม่มีอุปสรรคที่เปิดอยู่</div>
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {obstacles.map(obs => {
        const sc = OBS_STATUS[obs.status] ?? C.muted
        const isOpen = openId === obs.id
        return (
          <div
            key={obs.id}
            style={{ position: 'relative', background: isOpen ? 'rgba(34,211,238,0.05)' : C.panel, border: `1px solid ${isOpen ? C.borderH : C.border}`, cursor: 'pointer', transition: 'border-color .15s' }}
            onClick={() => setOpenId(isOpen ? null : obs.id)}
          >
            <Corners s={5} c={isOpen ? C.borderH : C.border} />

            {/* ─ header row ─ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span style={{ fontSize: 9, padding: '1px 7px', border: `1px solid ${sc}`, color: sc, fontFamily: MONO, fontWeight: 700, flexShrink: 0 }}>{obs.category}</span>
                <span style={{ fontSize: 9, color: C.dim, fontFamily: MONO, flexShrink: 0 }}>{obs.code}</span>
                <span style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{obs.obstacle_type}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                <span style={{ fontSize: 10, color: sc, fontWeight: 700, fontFamily: MONO }}>{obs.status}</span>
                <span style={{ fontSize: 10, color: C.dim, transition: 'transform .2s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
              </div>
            </div>

            {/* ─ expanded detail ─ */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* progress */}
                {obs.progress_pct > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.muted, fontFamily: MONO, marginBottom: 4 }}>
                      <span>ความคืบหน้า</span>
                      <span style={{ color: sc }}>{obs.progress_pct}%</span>
                    </div>
                    <Bar pct={obs.progress_pct} color={sc} />
                  </div>
                )}

                {/* due date */}
                {obs.due_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>กำหนดเสร็จ</span>
                    <span style={{ fontSize: 11, color: new Date(obs.due_date) < new Date() ? C.crit : C.muted, fontFamily: MONO, fontWeight: 700 }}>
                      {new Date(obs.due_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      {new Date(obs.due_date) < new Date() ? ' ⚠ เกินกำหนด' : ''}
                    </span>
                  </div>
                )}

                {/* last log */}
                {obs.last_log_message && (
                  <div>
                    <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginBottom: 4 }}>อัปเดตล่าสุด</div>
                    <div style={{ fontSize: 11, color: C.text, lineHeight: 1.65, padding: '7px 10px', background: C.row, borderLeft: `2px solid ${sc}` }}>{obs.last_log_message}</div>
                  </div>
                )}

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrackTab({ monthlyTrack, obstacles }: { monthlyTrack: MonthlyTrackRow[]; obstacles: ObstacleRow[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected = monthlyTrack.find(
    r => `${r.gregorian_year}-${String(r.month).padStart(2, '0')}` === selectedKey
  ) ?? null

  const color = (pct: number | null) => pct == null ? C.muted : pct <= 20 ? C.good : pct <= 25 ? C.warn : C.crit

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', overflow: 'hidden' }}>

      {/* ── ซ้าย: รายงานรายเดือน ── */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {/* header */}
        <div style={{ flexShrink: 0, padding: '9px 14px', borderBottom: `1px solid ${C.border}`, background: 'rgba(34,211,238,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected ? (
            <>
              <button
                onClick={() => setSelectedKey(null)}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.accent, cursor: 'pointer', fontSize: 10, padding: '2px 8px', fontFamily: MONO }}
              >← กลับ</button>
              <span style={{ fontSize: 11, color: C.bright, fontFamily: MONO, fontWeight: 700 }}>
                {THAI_MONTHS[selected.month]} {selected.gregorian_year + 543}
              </span>
              {selected.has_report && (
                <span style={{ fontSize: 9, padding: '1px 6px', background: 'rgba(34,211,238,0.1)', border: `1px solid ${C.border}`, color: C.muted, fontFamily: MONO }}>
                  {selected.area_count} พื้นที่
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 9, color: C.accent, fontFamily: MONO, letterSpacing: 1.5, fontWeight: 700 }}>// รายงานรายเดือน</span>
          )}
        </div>

        {/* เนื้อหาซ้าย */}
        <div style={{ flex: 1, overflowY: 'auto', padding: selected ? '14px 16px' : 0 }}>
          {selected ? (
            /* detail view */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* NRW summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { l: 'NRW%', v: selected.nrw_pct != null ? `${selected.nrw_pct.toFixed(1)}%` : '—', c: color(selected.nrw_pct) },
                  { l: 'น้ำจ่าย (m³)', v: selected.water_produced != null ? selected.water_produced.toLocaleString('th-TH') : '—', c: C.accent },
                  { l: 'จำหน่าย (m³)', v: selected.water_sold != null ? selected.water_sold.toLocaleString('th-TH') : '—', c: C.text },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ padding: '10px 12px', background: C.row, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO, marginBottom: 5 }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: MONO }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Area reports */}
              {selected.has_report ? selected.areas.map((area: AreaMonthItem) => {
                const nrwB = area.water_dist_before ? ((area.water_dist_before - (area.water_sold_before ?? 0)) / area.water_dist_before) * 100 : null
                const nrwA = area.water_dist_after  ? ((area.water_dist_after  - (area.water_sold_after  ?? 0)) / area.water_dist_after)  * 100 : null
                const delta = nrwA != null && nrwB != null ? nrwA - nrwB : null
                return (
                  <div key={area.id} style={{ border: `1px solid ${C.border}`, background: 'rgba(8,14,26,0.5)' }}>
                    {/* area header */}
                    <div style={{ padding: '7px 12px', borderBottom: `1px solid ${C.border}`, background: 'rgba(34,211,238,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.accent, fontFamily: MONO, fontWeight: 700 }}>{area.area_name}</span>
                      {delta != null && (
                        <span style={{ fontSize: 10, color: delta < 0 ? C.good : delta > 0 ? C.crit : C.muted, fontFamily: MONO, fontWeight: 700 }}>
                          {delta > 0 ? '▲' : delta < 0 ? '▼' : '→'} {Math.abs(delta).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* ตาราง before/after */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 5 }}>
                        {[
                          { l: 'น้ำจ่าย ก่อน',  v: area.water_dist_before,  c: C.text },
                          { l: 'น้ำจ่าย หลัง',  v: area.water_dist_after,   c: C.accent },
                          { l: 'NRW% ก่อน',      v: nrwB != null ? +nrwB.toFixed(1) : null, c: color(nrwB), suffix: '%' },
                          { l: 'NRW% หลัง',      v: nrwA != null ? +nrwA.toFixed(1) : null, c: color(nrwA), suffix: '%' },
                          { l: 'MNF หลัง',       v: area.mnf_after,          c: C.text },
                        ].map(({ l, v, c, suffix }) => (
                          <div key={l} style={{ padding: '7px 8px', background: C.row, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: C.muted, fontFamily: MONO, marginBottom: 3 }}>{l}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: v != null ? c : C.dim, fontFamily: MONO }}>
                              {v != null ? `${typeof v === 'number' && v > 999 ? v.toLocaleString('th-TH') : v}${suffix ?? ''}` : '—'}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ท่อรั่ว */}
                      {(area.leaks_repaired != null || area.leaks_pending != null) && (
                        <div style={{ display: 'flex', gap: 10 }}>
                          {[
                            { l: 'ซ่อมแล้ว', v: area.leaks_repaired, c: C.good },
                            { l: 'ค้างซ่อม',  v: area.leaks_pending,  c: (area.leaks_pending ?? 0) > 0 ? C.crit : C.muted },
                          ].map(({ l, v, c }) => v != null ? (
                            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: C.row, border: `1px solid ${C.border}` }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }} />
                              <span style={{ fontSize: 10, color: C.muted }}>{l}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: MONO }}>{v}</span>
                              <span style={{ fontSize: 9, color: C.dim }}>จุด</span>
                            </div>
                          ) : null)}
                        </div>
                      )}

                      {/* PDCA */}
                      {(area.pdca_do || area.pdca_act) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {area.pdca_do && (
                            <div>
                              <div style={{ fontSize: 8, color: C.accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 3 }}>DO — ดำเนินการ</div>
                              <div style={{ fontSize: 11, color: C.text, lineHeight: 1.65, padding: '6px 10px', background: C.row, borderLeft: `2px solid ${C.accent}` }}>{area.pdca_do}</div>
                            </div>
                          )}
                          {area.pdca_act && (
                            <div>
                              <div style={{ fontSize: 8, color: C.good, fontFamily: MONO, letterSpacing: 1, marginBottom: 3 }}>ACT — ปรับปรุง</div>
                              <div style={{ fontSize: 11, color: C.text, lineHeight: 1.65, padding: '6px 10px', background: C.row, borderLeft: `2px solid ${C.good}` }}>{area.pdca_act}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* อุปสรรค */}
                      {area.obstacles.length > 0 && (
                        <div>
                          <div style={{ fontSize: 8, color: C.warn, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>อุปสรรค ({area.obstacles.length})</div>
                          {area.obstacles.map((o, i) => (
                            <div key={i} style={{ fontSize: 11, color: C.text, padding: '5px 10px', background: C.row, borderLeft: `2px solid ${C.warn}`, marginBottom: 3 }}>
                              {o.obstacle_type}{o.obstacle_detail ? ` — ${o.obstacle_detail}` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              }) : (
                <div style={{ padding: '14px 16px', background: C.row, border: `1px solid ${C.border}`, fontSize: 11, color: C.dim, fontFamily: MONO }}>
                  // ยังไม่มีรายงานพื้นที่สำหรับเดือนนี้
                </div>
              )}
            </div>
          ) : monthlyTrack.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: MONO }}>// ยังไม่มีข้อมูล NRW รายเดือน</div>
            </div>
          ) : (
            /* list view */
            monthlyTrack.map(r => {
              const key = `${r.gregorian_year}-${String(r.month).padStart(2, '0')}`
              const nc = color(r.nrw_pct)
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                    gap: 10, padding: '10px 16px',
                    background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,211,238,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* dot สี NRW */}
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: nc, boxShadow: `0 0 5px ${nc}`, flexShrink: 0, display: 'inline-block' }} />
                  {/* เดือน */}
                  <div style={{ width: 68, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.bright, fontFamily: MONO }}>{THAI_MONTHS[r.month]}</span>
                    <span style={{ fontSize: 10, color: C.muted, fontFamily: MONO, marginLeft: 5 }}>{r.gregorian_year + 543}</span>
                  </div>
                  {/* NRW% */}
                  <div style={{ fontSize: 14, fontWeight: 800, color: nc, fontFamily: MONO, width: 52, textAlign: 'right', flexShrink: 0 }}>
                    {r.nrw_pct != null ? `${r.nrw_pct.toFixed(1)}%` : '—'}
                  </div>
                  {/* badges */}
                  <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'flex-end' }}>
                    {r.has_report && (
                      <span style={{ fontSize: 8, padding: '1px 5px', border: `1px solid ${C.accent}`, color: C.accent, fontFamily: MONO }}>{r.area_count} พื้นที่</span>
                    )}
                    {r.areas.some((a: AreaMonthItem) => a.pdca_do) && <span style={{ fontSize: 8, padding: '1px 5px', border: `1px solid ${C.accent}`, color: C.accent, fontFamily: MONO }}>DO</span>}
                    {r.areas.some((a: AreaMonthItem) => a.pdca_act) && <span style={{ fontSize: 8, padding: '1px 5px', border: `1px solid ${C.good}`, color: C.good, fontFamily: MONO }}>ACT</span>}
                  </div>
                  <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>›</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── ขวา: อุปสรรค ── */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, padding: '9px 14px', borderBottom: `1px solid ${C.border}`, background: 'rgba(34,211,238,0.04)' }}>
          <span style={{ fontSize: 9, color: C.accent, fontFamily: MONO, letterSpacing: 1.5, fontWeight: 700 }}>
            // อุปสรรค{obstacles.length > 0 ? ` (${obstacles.length})` : ''}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
          <ObsPanel obstacles={obstacles} />
        </div>
      </div>

    </div>
  )
}

function MnfTab({ mnfNodes }: { mnfNodes: MnfNodeRow[] }) {
  if (!mnfNodes.length) return <Card style={{ textAlign: 'center', padding: 50 }}><div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>// ยังไม่มีข้อมูล EMA</div></Card>
  const reds = mnfNodes.filter(n => n.alert_status.startsWith('red')).length
  return (
    <Card>
      <Sec label="MNF MONITOR — EMA รายโหนด" right={reds > 0 ? <span style={{ fontSize: 12, color: C.crit, fontFamily: MONO }}>⚠ {reds} โหนดแดง</span> : undefined} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 65px 80px', gap: 10, padding: '5px 10px', background: 'rgba(34,211,238,0.07)', borderBottom: `1px solid ${C.border}` }}>
          {['Node', 'Flow', 'Diff %', 'วันติดกัน', 'สถานะ'].map(h => <div key={h} style={{ fontSize: 9, color: C.accent, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>{h}</div>)}
        </div>
        {mnfNodes.map((n, i) => {
          const al = ALERT[n.alert_status] ?? { color: C.muted, label: n.alert_status }
          const red = n.alert_status.startsWith('red')
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 65px 80px', gap: 10, padding: '9px 10px', background: red ? 'rgba(239,68,68,0.07)' : C.row, border: `1px solid ${red ? 'rgba(239,68,68,0.25)' : C.border}` }}>
              <div>
                <div style={{ fontSize: 13, color: C.text }}>{n.node_label}</div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO }}>{n.record_date}</div>
              </div>
              <div style={{ fontSize: 14, color: C.text, fontFamily: MONO, fontWeight: 600 }}>{n.mnf_flow != null ? n.mnf_flow.toFixed(2) : '—'}</div>
              <div style={{ fontSize: 14, fontFamily: MONO, fontWeight: 600, color: n.diff_percent > 50 ? C.crit : C.muted }}>{n.diff_percent.toFixed(1)}%</div>
              <div style={{ fontSize: 14, color: C.muted, fontFamily: MONO, fontWeight: 600 }}>{n.consecutive_count || 0}</div>
              <div style={{ fontSize: 12, color: al.color, fontWeight: 700, fontFamily: MONO }}>{al.label}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function BudgetTab({ budget }: { budget: BranchExecutiveSummary['budget_2569'] }) {
  if (!budget) return <Card style={{ textAlign: 'center', padding: 50 }}><div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>// ไม่มีข้อมูลงบประมาณปี 2569</div></Card>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: 'โครงการทั้งหมด', val: budget.total, c: C.accent },
          { label: 'แล้วเสร็จ', val: budget.by_phase[6] ?? 0, c: C.good },
          { label: 'ความสำเร็จ', val: `${budget.done_pct}%`, c: C.good },
          { label: 'เกินกำหนด', val: budget.overdue, c: budget.overdue > 0 ? C.crit : C.muted },
        ].map(({ label, val, c }) => (
          <Card key={label} style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: MONO, letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c, fontFamily: MONO, textShadow: `0 0 12px ${c}55` }}>{val}</div>
          </Card>
        ))}
      </div>
      <Card>
        <Sec label="สัดส่วนตามขั้นตอน" />
        <div style={{ display: 'flex', height: 8, gap: 2, overflow: 'hidden', marginBottom: 10 }}>
          {PHASES.map((_, i) => { const n = budget.by_phase[i] ?? 0; return n ? <div key={i} style={{ flex: n, background: PHASE_COLOR[i], boxShadow: `0 0 5px ${PHASE_COLOR[i]}88` }} title={`${PHASES[i]}:${n}`} /> : null })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px' }}>
          {PHASES.map((label, i) => { const n = budget.by_phase[i] ?? 0; return n ? (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, background: PHASE_COLOR[i], boxShadow: `0 0 4px ${PHASE_COLOR[i]}` }} />
              <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
              <span style={{ fontSize: 12, color: PHASE_COLOR[i], fontFamily: MONO, fontWeight: 700 }}>{n}</span>
            </div>
          ) : null })}
        </div>
      </Card>
      {budget.projects.length > 0 && (
        <Card>
          <Sec label="รายการโครงการ" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {budget.projects.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: p.overdue ? 'rgba(239,68,68,0.07)' : C.row, border: `1px solid ${p.overdue ? 'rgba(239,68,68,0.25)' : C.border}` }}>
                <div style={{ width: 7, height: 7, background: PHASE_COLOR[p.phase], boxShadow: `0 0 4px ${PHASE_COLOR[p.phase]}`, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontSize: 10, padding: '1px 7px', border: `1px solid ${PHASE_COLOR[p.phase]}`, color: PHASE_COLOR[p.phase], fontFamily: MONO, fontWeight: 700, flexShrink: 0 }}>{PHASES[p.phase]}</span>
                {p.overdue && <span style={{ fontSize: 10, color: C.crit, fontFamily: MONO, fontWeight: 700, flexShrink: 0 }}>เกินกำหนด</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  data: BranchExecutiveSummary
  animKey: number
  onBack: () => void
}

export function BranchSummaryPanel({ data, animKey, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const { branch, nrw, pdca, budget_2569, dmaStats, nodeDmaStats, obstacles, monthly_track, mnfNodes } = data

  const color  = nrwColor(nrw.current_pct)
  const [statusLabel, statusColor] = nrwLabel(nrw.current_pct)
  const delta  = nrw.current_pct != null && nrw.prev_month_pct != null ? nrw.current_pct - nrw.prev_month_pct : null
  const yoyDelta = nrw.current_pct != null && nrw.yoy_pct != null ? nrw.current_pct - nrw.yoy_pct : null
  const repLabel = nrw.report_month ? `${THAI_MONTHS[nrw.report_month]} ${nrw.report_year ?? ''}` : '—'
  const redMnf = mnfNodes.filter(n => n.alert_status.startsWith('red')).length

  const tabs: { id: Tab; label: string; count?: number; alert?: boolean }[] = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'dma',      label: 'Priority DMA', count: nodeDmaStats.length },
    { id: 'obstacle', label: 'ติดตามผลสาขา', count: obstacles.length, alert: obstacles.length > 0 },
    { id: 'mnf',      label: 'MNF Monitor', count: mnfNodes.length, alert: redMnf > 0 },
    { id: 'budget',   label: 'งบ 2569', count: budget_2569?.total ?? 0 },
  ]

  return (
    <div key={animKey} className="anim-holo-in" style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: [
        'radial-gradient(ellipse at 10% 0%, rgba(34,211,238,0.05) 0%, transparent 40%)',
        'radial-gradient(ellipse at 92% 100%, rgba(59,130,246,0.04) 0%, transparent 45%)',
        `linear-gradient(180deg, #050913 0%, ${C.bg} 100%)`,
      ].join(', '),
      color: C.text,
      clipPath: 'polygon(0 0,100% 0,100% 100%,24px 100%,0 calc(100% - 24px))',
    }}>
      {/* BG grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(34,211,238,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.04) 1px,transparent 1px)`,
        backgroundSize: '24px 24px', opacity: 0.7,
      }} />
      <div className="anim-flicker" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(180deg,rgba(34,211,238,0.012) 0px,rgba(34,211,238,0.012) 1px,transparent 1px,transparent 3px)',
        mixBlendMode: 'screen', opacity: 0.4,
      }} />

      {/* ══════════════════════════════════════════════════════════════
          HEADER — branch identity + close
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'linear-gradient(180deg,rgba(8,12,24,0.96),rgba(6,10,20,0.82))',
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: 'blur(14px)', position: 'relative', zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', padding: '5px 13px', border: `1px solid rgba(34,211,238,0.6)`, background: 'rgba(34,211,238,0.07)', boxShadow: '0 0 12px rgba(34,211,238,0.2)' }}>
            <Corners s={5} />
            <span style={{ fontSize: 10, color: C.accent, fontFamily: MONO, letterSpacing: 2, fontWeight: 700 }}>{branch.code}</span>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO }}>{branch.province_th}</div>
            <div style={{ fontSize: 17, color: C.bright, fontWeight: 600 }}>สาขา{branch.name_th}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>รายงานล่าสุด</div>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: MONO, fontWeight: 600 }}>{repLabel}</div>
          </div>
          <button onClick={onBack} style={{ padding: '5px 16px', fontSize: 10, letterSpacing: 1, color: C.muted, background: 'rgba(34,211,238,0.05)', border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: MONO }}>
            ✕ ปิด
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BODY — left summary (vertical) + right tab content
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 2 }}>

        {/* ── LEFT: Summary panels แนวตั้ง ── */}
        <div style={{
          width: 264, flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          background: 'rgba(4,6,14,0.55)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>

          {/* NRW% KPI */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>NRW% เดือนนี้</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
              <span style={{ fontSize: 62, fontWeight: 900, fontFamily: MONO, color, lineHeight: 1, textShadow: `0 0 32px ${color}44` }}>
                {nrw.current_pct != null ? nrw.current_pct.toFixed(1) : '—'}
              </span>
              {nrw.current_pct != null && <span style={{ fontSize: 22, color, fontFamily: MONO, fontWeight: 400 }}>%</span>}
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Bar pct={(nrw.current_pct ?? 0) / 40 * 100} color={color} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'rgba(34,211,238,0.4)' }} title="เป้า 20%" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}`, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: statusColor, fontFamily: MONO, fontWeight: 700 }}>{statusLabel}</span>
            </div>
          </div>

          {/* เทียบ MoM / YoY */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
              {[
                { label: 'เทียบเดือนก่อน', d: delta },
                { label: 'เทียบปีที่แล้ว',  d: yoyDelta },
              ].map(({ label, d }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO, letterSpacing: 1, marginBottom: 5 }}>{label}</div>
                  {d != null ? (
                    <>
                      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: MONO, color: d < 0 ? C.good : d > 0 ? C.crit : C.muted, lineHeight: 1, marginBottom: 3 }}>
                        {d > 0 ? '+' : ''}{d.toFixed(2)}%
                      </div>
                      <div style={{ fontSize: 10, color: d < 0 ? C.good : d > 0 ? C.crit : C.muted, fontFamily: MONO }}>
                        {d < 0 ? '▼ ดีขึ้น' : d > 0 ? '▲ แย่ลง' : '→ คงที่'}
                      </div>
                    </>
                  ) : <div style={{ fontSize: 20, color: C.muted, fontFamily: MONO }}>—</div>}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              {[
                { l: 'น้ำจ่าย', v: nrw.water_produced },
                { l: 'จำหน่าย', v: nrw.water_sold },
              ].map(({ l, v }, i) => (
                <div key={l} style={{ paddingRight: i === 0 ? 12 : 0, borderRight: i === 0 ? `1px solid ${C.border}` : 'none', paddingLeft: i === 1 ? 12 : 0 }}>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO, marginBottom: 3 }}>{l} (m³)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: MONO }}>{fmt(v)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Operations */}
          <div style={{ padding: '12px 16px', flex: 1 }}>
            <div style={{ fontSize: 8, color: C.dim, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>// OPERATIONS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {[
                { label: 'ท่อค้างซ่อม',  val: nrw.leaks_pending,      unit: 'จุด',     c: nrw.leaks_pending > 0 ? C.crit : C.good, alert: nrw.leaks_pending > 0 },
                { label: 'DMA ปัญหา',    val: dmaStats.length,         unit: 'โซน',     c: dmaStats.length > 0 ? C.warn : C.muted,  alert: dmaStats.length > 0 },
                { label: 'MNF แดง',      val: redMnf,                  unit: 'โหนด',    c: redMnf > 0 ? C.crit : C.muted,           alert: redMnf > 0 },
                { label: 'MNF ทั้งหมด',  val: mnfNodes.length,         unit: 'โหนด',    c: C.muted,                                  alert: false },
                { label: 'งบ 2569',      val: budget_2569?.total ?? 0, unit: 'โครงการ', c: C.blue,                                   alert: false },
              ].map(({ label, val, unit, c, alert }) => (
                <div key={label} style={{ padding: '7px 10px', background: alert ? `${c}0D` : 'rgba(8,14,26,0.4)', border: `1px solid ${alert ? `${c}33` : C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <span className={alert ? 'anim-blink-crit' : ''} style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: C.text, lineHeight: 1 }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: MONO, lineHeight: 1 }}>{val}</span>
                    <span style={{ fontSize: 10, color: C.muted, fontFamily: MONO }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer ซ้าย */}
          <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 8, color: C.dim, fontFamily: MONO }}>MATE © ๒๕๖๙ · กปภ.เขต ๑๐</span>
          </div>
        </div>

        {/* ── RIGHT: Tab bar + Tab content ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* TAB BAR */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'stretch',
            borderBottom: `1px solid ${C.border}`,
            background: 'rgba(4,7,14,0.75)',
            position: 'relative', zIndex: 5, padding: '0 16px',
          }}>
            {tabs.map(({ id, label, count, alert }) => {
              const active = tab === id
              return (
                <button key={id} onClick={() => setTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: active ? `2px solid rgba(34,211,238,0.8)` : '2px solid transparent',
                  color: active ? C.bright : C.muted, fontSize: 12, fontWeight: active ? 700 : 400,
                  letterSpacing: 0.3, transition: 'color .15s, border-color .15s', marginBottom: -1,
                }}>
                  <span>{label}</span>
                  {alert && <span className="anim-blink-crit" style={{ width: 5, height: 5, borderRadius: '50%', background: C.crit, boxShadow: `0 0 5px ${C.crit}`, display: 'inline-block' }} />}
                  {count != null && count > 0 && (
                    <span style={{ fontSize: 9, padding: '1px 5px', background: active ? 'rgba(34,211,238,0.14)' : 'rgba(34,211,238,0.06)', color: active ? C.accent : C.muted, border: `1px solid ${C.border}`, fontFamily: MONO }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
            {/* Status bar ขวาบน */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, paddingRight: 4 }}>
              {[
                { l: 'DMA', v: `${nodeDmaStats.length}`, c: C.accent },
                { l: 'MNF', v: `${mnfNodes.length}`, c: redMnf > 0 ? C.crit : C.accent },
              ].map(({ l, v, c }) => (
                <span key={l} style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>
                  {l} <span style={{ color: c, fontWeight: 700 }}>{v}</span>
                </span>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div style={{ flex: 1, overflowX: 'hidden', overflowY: tab !== 'obstacle' ? 'auto' : 'hidden', padding: tab !== 'obstacle' ? '16px 20px' : 0 }}>
            {tab === 'overview' && <OverviewTab nrw={nrw} delta={delta} pdca={pdca} dmaStats={dmaStats} mnfNodes={mnfNodes} budget_2569={budget_2569} />}
            {tab === 'dma'      && <DmaTab nodeDmaStats={nodeDmaStats} />}
            {tab === 'obstacle' && <TrackTab monthlyTrack={monthly_track} obstacles={obstacles} />}
            {tab === 'mnf'      && <MnfTab mnfNodes={mnfNodes} />}
            {tab === 'budget'   && <BudgetTab budget={budget_2569} />}
          </div>
        </div>
      </div>
    </div>
  )
}
