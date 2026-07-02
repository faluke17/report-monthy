import type { BranchExecutiveSummary } from '@/app/actions/executive-summary'
import { C, MONO, Card, Sec, PHASES, PHASE_COLOR, useBreakpoint } from './shared'

export function BudgetTab({ budget }: { budget: BranchExecutiveSummary['budget_2569'] }) {
  const { isMobile } = useBreakpoint()
  if (!budget) return <Card style={{ textAlign: 'center', padding: 50 }}><div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>// ไม่มีข้อมูลงบประมาณปี 2569</div></Card>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4},1fr)`, gap: 10 }}>
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
