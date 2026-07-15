'use client'

import { useState } from 'react'
import type { BranchExecutiveSummary } from '@/app/actions/executive-summary'
import { THAI_MONTHS, C, MONO, SANS, fmt, nrwColor, nrwLabel, Bar, Tab, useBreakpoint } from './tabs/shared'
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
  // nrw.report_year เป็นปี ค.ศ. ดิบจาก DB — ต้อง +543 ให้ตรงกับ พ.ศ. ที่ใช้แสดงผลทั้งแอป
  const repLabel = nrw.report_month ? `${THAI_MONTHS[nrw.report_month]} ${nrw.report_year != null ? nrw.report_year + 543 : ''}` : '—'
  const redMnf = mnfNodes.filter(n => n.alert_status.startsWith('red')).length

  const tabs: { id: Tab; label: string; count?: number; alert?: boolean }[] = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'dma',      label: 'Priority DMA', count: nodeDmaStats.length },
    { id: 'obstacle', label: 'ติดตามผลสาขา', count: obstacles.length, alert: obstacles.length > 0 },
    { id: 'mnf',      label: 'MNF Monitor', count: mnfNodes.length, alert: redMnf > 0 },
    { id: 'budget',   label: 'งบ 2569', count: budget_2569?.total ?? 0 },
  ]

  return (
    <div key={animKey} className="animate-fadein" style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: C.bg,
      color: C.text,
    }}>
      {/* ══════════════════════════════════════════════════════════════
          HEADER — branch identity + close
      ══════════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0, height: isMobile ? 48 : 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '0 12px' : '0 22px',
        background: 'rgba(245,246,248,0.92)',
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: 'blur(8px)', position: 'relative', zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, minWidth: 0 }}>
          <div style={{ padding: isMobile ? '4px 9px' : '5px 12px', flexShrink: 0, borderRadius: 6, background: C.accent }}>
            <span style={{ fontSize: 11, color: '#FFFFFF', fontFamily: MONO, letterSpacing: 1.5, fontWeight: 700 }}>{branch.code}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            {!isMobile && <div style={{ fontSize: 10.5, color: C.muted, fontFamily: SANS }}>{branch.province_th}</div>}
            <div style={{ fontSize: isMobile ? 13.5 : 17, color: C.bright, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>สาขา{branch.name_th}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 20, flexShrink: 0 }}>
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.dim, fontFamily: SANS }}>รายงานล่าสุด</div>
              <div style={{ fontSize: 13, color: C.muted, fontFamily: MONO, fontWeight: 600 }}>{repLabel}</div>
            </div>
          )}
          <button onClick={onBack} style={{ padding: isMobile ? '6px 12px' : '7px 16px', fontSize: 12, borderRadius: 7, color: C.text, background: C.panel, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: SANS, fontWeight: 500 }}>
            ← กลับไปหน้าสรุป
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
          background: C.panel,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>

          {/* NRW% KPI */}
          <div style={{ padding: isMobile ? '12px 16px' : '16px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: SANS, marginBottom: 8, fontWeight: 600 }}>NRW% เดือนนี้</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
              <span style={{ fontSize: isMobile ? 38 : 56, fontWeight: 800, fontFamily: MONO, color, lineHeight: 1 }}>
                {nrw.current_pct != null ? nrw.current_pct.toFixed(1) : '—'}
              </span>
              {nrw.current_pct != null && <span style={{ fontSize: isMobile ? 16 : 20, color, fontFamily: MONO, fontWeight: 400 }}>%</span>}
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Bar pct={(nrw.current_pct ?? 0) / 40 * 100} color={color} />
              <div style={{ position: 'absolute', top: -1, bottom: -1, left: '50%', width: 1, background: '#C7CFD7' }} title="เป้า 20%" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: statusColor, fontFamily: SANS, fontWeight: 700 }}>{statusLabel}</span>
            </div>
          </div>

          {/* ปริมาณน้ำเดือนนี้ + เทียบปีที่แล้ว */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.accent, fontFamily: SANS, marginBottom: 9, fontWeight: 700 }}>ปริมาณน้ำเดือนนี้ (m³)</div>
            {/* minmax(0,1fr) กันไม่ให้ track ขยายตามความกว้างเนื้อหา (ตัวเลขหลักล้านของสาขาใหญ่) จนดันล้น sidebar 264px แล้วโดนตัดหาย */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 6, marginBottom: 14 }}>
              {[
                { l: 'น้ำจ่าย',    v: nrw.water_produced, dot: C.blue },
                { l: 'จำหน่าย',    v: nrw.water_sold,     dot: C.good },
                { l: 'สูญเสีย',    v: nrw.water_loss,     dot: C.crit },
              ].map(({ l, v, dot }) => (
                <div key={l} style={{ padding: '8px 7px', borderRadius: 7, background: C.row, border: `1px solid ${C.border}`, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 9.5, color: C.muted, fontFamily: SANS }}>{l}</span>
                  </div>
                  {/* fontSize 11 + letterSpacing ติดลบ ให้ตัวเลข 6-7 หลักส่วนใหญ่พอดีบรรทัดเดียว overflowWrap ยังกันไว้เผื่อสาขาที่ตัวเลขยาวกว่านั้น */}
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.bright, fontFamily: MONO, lineHeight: 1.25, letterSpacing: -0.3, overflowWrap: 'anywhere' }}>{fmt(v)}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: C.accent, fontFamily: SANS, marginBottom: 9, fontWeight: 700 }}>เทียบปีที่แล้ว (เดือนเดียวกัน)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', gap: 6 }}>
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
                    padding: '9px 9px 8px', borderRadius: 7,
                    background: yy == null ? C.row : `${color}10`,
                    border: `1px solid ${yy == null ? C.border : `${color}40`}`,
                  }}>
                    <div style={{ fontSize: 8.5, color: C.dim, fontFamily: SANS, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l}</div>
                    {yy != null ? (
                      <>
                        <div style={{ fontSize: 17, fontWeight: 800, fontFamily: MONO, color, lineHeight: 1, marginBottom: 4 }}>
                          {yy > 0 ? '+' : ''}{yy.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 8.5, color, fontFamily: SANS, fontWeight: 700 }}>{arrowLabel}</div>
                      </>
                    ) : <div style={{ fontSize: 14, color: C.muted, fontFamily: MONO }}>—</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Operations */}
          <div style={{ padding: '12px 16px', flex: 1 }}>
            <div style={{ fontSize: 10.5, color: C.dim, fontFamily: SANS, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>สถานะปฏิบัติการ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 5 }}>
              {[
                { label: 'ท่อค้างซ่อม',  val: nrw.leaks_pending,      unit: 'จุด',     c: nrw.leaks_pending > 0 ? C.crit : C.good, alert: nrw.leaks_pending > 0 },
                { label: 'DMA ปัญหา',    val: dmaStats.length,         unit: 'โซน',     c: dmaStats.length > 0 ? C.warn : C.muted,  alert: dmaStats.length > 0 },
                { label: 'MNF แดง',      val: redMnf,                  unit: 'โหนด',    c: redMnf > 0 ? C.crit : C.muted,           alert: redMnf > 0 },
                { label: 'MNF ทั้งหมด',  val: mnfNodes.length,         unit: 'โหนด',    c: C.muted,                                  alert: false },
                { label: 'งบ 2569',      val: budget_2569?.total ?? 0, unit: 'โครงการ', c: C.blue,                                   alert: false },
              ].map(({ label, val, unit, c, alert }) => (
                <div key={label} style={{ padding: '7px 10px', borderRadius: 7, background: alert ? `${c}0D` : C.row, border: `1px solid ${alert ? `${c}33` : C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: C.text, lineHeight: 1, fontFamily: SANS }}>{label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: MONO, lineHeight: 1 }}>{val}</span>
                    <span style={{ fontSize: 10, color: C.muted, fontFamily: SANS }}>{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer ซ้าย */}
          <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: SANS }}>NRW Tracker · กปภ.เขต 10</span>
          </div>
        </div>

        {/* ── RIGHT: Tab bar + Tab content ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* TAB BAR */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'stretch',
            borderBottom: `1px solid ${C.border}`,
            background: C.panel,
            position: 'relative', zIndex: 5, padding: isMobile ? '0 8px' : '0 16px',
            overflowX: 'auto',
          }}>
            {tabs.map(({ id, label, count, alert }) => {
              const active = tab === id
              return (
                <button key={id} onClick={() => setTab(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '9px 10px' : '10px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  borderBottom: active ? `2px solid ${C.accent}` : '2px solid transparent',
                  color: active ? C.bright : C.muted, fontSize: isMobile ? 12 : 13, fontWeight: active ? 700 : 500,
                  fontFamily: SANS, transition: 'color .15s, border-color .15s', marginBottom: -1,
                }}>
                  <span>{label}</span>
                  {alert && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.crit, display: 'inline-block' }} />}
                  {count != null && count > 0 && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: active ? `${C.accent}18` : C.row, color: active ? C.accent : C.muted, border: `1px solid ${C.border}`, fontFamily: MONO }}>
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
                  <span key={l} style={{ fontSize: 10, color: C.dim, fontFamily: SANS }}>
                    {l} <span style={{ color: c, fontWeight: 700, fontFamily: MONO }}>{v}</span>
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
