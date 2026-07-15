import type { BranchExecutiveSummary, CumulativeLossTrend, DmaStatRow, MnfNodeRow } from '@/app/actions/executive-summary'
import { THAI_MONTHS, C, MONO, fmt, Card, Sec, ALERT, PHASES, PHASE_COLOR } from './shared'
import { CumulativeLossChart } from './CumulativeLossChart'

export function OverviewTab({ pdca, dmaStats, mnfNodes, budget_2569, lossTrend }: {
  nrw: BranchExecutiveSummary['nrw']
  delta: number | null
  pdca: BranchExecutiveSummary['pdca']
  dmaStats: DmaStatRow[]
  mnfNodes: MnfNodeRow[]
  budget_2569: BranchExecutiveSummary['budget_2569']
  lossTrend: CumulativeLossTrend
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* น้ำสูญเสียสะสมเฉลี่ย — ปีงบปัจจุบัน vs ปีงบก่อนหน้า */}
      <CumulativeLossChart
        fiscalYearCurr={lossTrend.fiscal_year_curr}
        fiscalYearPrev={lossTrend.fiscal_year_prev}
        curr={lossTrend.curr}
        prev={lossTrend.prev}
      />

      {/* PDCA */}
      {pdca && (pdca.do_text || pdca.act_text) && (
        <Card>
          <Sec label="PDCA — แผนดำเนินงาน" right={pdca.report_month ? <span style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>{THAI_MONTHS[pdca.report_month]} {pdca.report_year != null ? pdca.report_year + 543 : ''}</span> : undefined} />
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
              <div style={{ fontSize: 9, color: C.warn, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 8 }}>{'// DMA สูงสุด 3 อันดับแรก'}</div>
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
              <div style={{ fontSize: 9, color: C.crit, fontFamily: MONO, letterSpacing: 1.5, marginBottom: 8 }}>{'// MNF แจ้งเตือน'}</div>
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
