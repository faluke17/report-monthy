'use client'

import { useState } from 'react'
import type { BranchExecutiveSummary } from '@/app/actions/executive-summary'
import { THAI_MONTHS, C, MONO, fmt, nrwColor, nrwLabel, Corners, Bar, Tab, useBreakpoint } from './tabs/shared'
import { OverviewTab } from './tabs/OverviewTab'
import { DmaTab } from './tabs/DmaTab'
import { TrackTab } from './tabs/TrackTab'
import { MnfTab } from './tabs/MnfTab'
import { BudgetTab } from './tabs/BudgetTab'

interface Props {
  data: BranchExecutiveSummary
  animKey: number
  onBack: () => void
}

export function BranchSummaryPanel({ data, animKey, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const { isMobile } = useBreakpoint()
  const { branch, nrw, pdca, budget_2569, dmaStats, nodeDmaStats, obstacles, monthly_track, mnfNodes, lossTrend } = data

  const color  = nrwColor(nrw.current_pct)
  const [statusLabel, statusColor] = nrwLabel(nrw.current_pct)
  const delta  = nrw.current_pct != null && nrw.prev_month_pct != null ? nrw.current_pct - nrw.prev_month_pct : null
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
      clipPath: isMobile ? undefined : 'polygon(0 0,100% 0,100% 100%,24px 100%,0 calc(100% - 24px))',
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
        flexShrink: 0, height: isMobile ? 46 : 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 10px' : '0 20px',
        background: 'linear-gradient(180deg,rgba(8,12,24,0.96),rgba(6,10,20,0.82))',
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: 'blur(14px)', position: 'relative', zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
          <div style={{ position: 'relative', padding: isMobile ? '4px 9px' : '5px 13px', flexShrink: 0, border: `1px solid rgba(34,211,238,0.6)`, background: 'rgba(34,211,238,0.07)', boxShadow: '0 0 12px rgba(34,211,238,0.2)' }}>
            <Corners s={5} />
            <span style={{ fontSize: 10, color: C.accent, fontFamily: MONO, letterSpacing: 2, fontWeight: 700 }}>{branch.code}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            {!isMobile && <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO }}>{branch.province_th}</div>}
            <div style={{ fontSize: isMobile ? 13 : 17, color: C.bright, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>สาขา{branch.name_th}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 20, flexShrink: 0 }}>
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>รายงานล่าสุด</div>
              <div style={{ fontSize: 13, color: C.muted, fontFamily: MONO, fontWeight: 600 }}>{repLabel}</div>
            </div>
          )}
          <button onClick={onBack} style={{ padding: isMobile ? '5px 10px' : '5px 16px', fontSize: 10, letterSpacing: 1, color: C.muted, background: 'rgba(34,211,238,0.05)', border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: MONO }}>
            ✕ ปิด
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BODY — left summary (vertical) + right tab content
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', position: 'relative', zIndex: 2 }}>

        {/* ── LEFT: Summary panels แนวตั้ง ── */}
        <div style={{
          width: isMobile ? '100%' : 264,
          maxHeight: isMobile ? '40vh' : undefined,
          flexShrink: 0,
          borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
          borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
          background: 'rgba(4,6,14,0.55)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>

          {/* NRW% KPI */}
          <div style={{ padding: isMobile ? '12px 16px' : '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>NRW% เดือนนี้</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
              <span style={{ fontSize: isMobile ? 40 : 62, fontWeight: 900, fontFamily: MONO, color, lineHeight: 1, textShadow: `0 0 32px ${color}44` }}>
                {nrw.current_pct != null ? nrw.current_pct.toFixed(1) : '—'}
              </span>
              {nrw.current_pct != null && <span style={{ fontSize: isMobile ? 18 : 22, color, fontFamily: MONO, fontWeight: 400 }}>%</span>}
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

          {/* ปริมาณน้ำเดือนนี้ + เทียบปีที่แล้ว */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.accent, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 9, fontWeight: 700 }}>ปริมาณน้ำเดือนนี้ (m³)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
              {[
                { l: 'น้ำจ่าย',    v: nrw.water_produced, dot: C.blue },
                { l: 'จำหน่าย',    v: nrw.water_sold,     dot: C.good },
                { l: 'สูญเสีย',    v: nrw.water_loss,     dot: C.crit },
              ].map(({ l, v, dot }) => (
                <div key={l} style={{ padding: '8px 9px', background: 'rgba(8,14,26,0.5)', border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, boxShadow: `0 0 5px ${dot}`, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 9, color: C.muted, fontFamily: MONO }}>{l}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.bright, fontFamily: MONO, lineHeight: 1 }}>{fmt(v)}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10, color: C.accent, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 9, fontWeight: 700 }}>เทียบปีที่แล้ว (เดือนเดียวกัน)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { l: 'น้ำจ่าย',    v: nrw.water_produced, yoy: nrw.yoy_produced, goodWhen: 'down' as const },
                { l: 'น้ำจำหน่าย', v: nrw.water_sold,     yoy: nrw.yoy_sold,     goodWhen: 'up'   as const },
                { l: 'น้ำสูญเสีย', v: nrw.water_loss,     yoy: nrw.yoy_loss,     goodWhen: 'down' as const },
              ].map(({ l, v, yoy, goodWhen }) => {
                const yy = v == null || yoy == null || yoy === 0 ? null : ((v - yoy) / Math.abs(yoy)) * 100
                const isGood = yy != null && (goodWhen === 'down' ? yy < 0 : yy > 0)
                const color = yy == null ? C.muted : yy === 0 ? C.muted : isGood ? C.good : C.crit
                const arrowLabel = yy == null
                  ? ''
                  : yy === 0 ? '→ คงที่'
                    : isGood ? `${yy < 0 ? '▼' : '▲'} ดีขึ้น` : `${yy < 0 ? '▼' : '▲'} แย่ลง`
                return (
                  <div key={l} style={{
                    padding: '9px 9px 8px',
                    background: yy == null ? 'rgba(8,14,26,0.5)' : `${color}12`,
                    border: `1px solid ${yy == null ? C.border : `${color}55`}`,
                    boxShadow: yy != null && yy !== 0 ? `0 0 10px ${color}1A` : 'none',
                  }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: MONO, letterSpacing: 0.5, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</div>
                    {yy != null ? (
                      <>
                        <div style={{ fontSize: 17, fontWeight: 800, fontFamily: MONO, color, lineHeight: 1, marginBottom: 4, textShadow: `0 0 12px ${color}55` }}>
                          {yy > 0 ? '+' : ''}{yy.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 8, color, fontFamily: MONO, fontWeight: 700 }}>{arrowLabel}</div>
                      </>
                    ) : <div style={{ fontSize: 14, color: C.muted, fontFamily: MONO }}>—</div>}
                  </div>
                )
              })}
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
            position: 'relative', zIndex: 5, padding: isMobile ? '0 8px' : '0 16px',
            overflowX: isMobile ? 'auto' : undefined,
          }}>
            {tabs.map(({ id, label, count, alert }) => {
              const active = tab === id
              return (
                <button key={id} onClick={() => setTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '9px 10px' : '10px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  borderBottom: active ? `2px solid rgba(34,211,238,0.8)` : '2px solid transparent',
                  color: active ? C.bright : C.muted, fontSize: isMobile ? 11 : 12, fontWeight: active ? 700 : 400,
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
            {!isMobile && (
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
            )}
          </div>

          {/* TAB CONTENT */}
          <div style={{ flex: 1, overflowX: 'hidden', overflowY: tab !== 'obstacle' || isMobile ? 'auto' : 'hidden', padding: tab !== 'obstacle' ? (isMobile ? '12px 12px' : '16px 20px') : 0 }}>
            {tab === 'overview' && <OverviewTab nrw={nrw} delta={delta} pdca={pdca} dmaStats={dmaStats} mnfNodes={mnfNodes} budget_2569={budget_2569} lossTrend={lossTrend} />}
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
