import type { MnfNodeRow } from '@/app/actions/executive-summary'
import { C, MONO, Card, Sec, ALERT, useBreakpoint } from './shared'

export function MnfTab({ mnfNodes }: { mnfNodes: MnfNodeRow[] }) {
  const { isMobile } = useBreakpoint()
  const gridCols = '1fr 90px 90px 65px 80px'
  if (!mnfNodes.length) return <Card style={{ textAlign: 'center', padding: 50 }}><div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>// ยังไม่มีข้อมูล EMA</div></Card>
  const reds = mnfNodes.filter(n => n.alert_status.startsWith('red')).length
  return (
    <Card>
      <Sec label="MNF MONITOR — EMA รายโหนด" right={reds > 0 ? <span style={{ fontSize: 12, color: C.crit, fontFamily: MONO }}>⚠ {reds} โหนดแดง</span> : undefined} />
      <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: isMobile ? 480 : undefined }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '5px 10px', background: 'rgba(34,211,238,0.07)', borderBottom: `1px solid ${C.border}` }}>
          {['Node', 'Flow', 'Diff %', 'วันติดกัน', 'สถานะ'].map(h => <div key={h} style={{ fontSize: 9, color: C.accent, fontFamily: MONO, fontWeight: 700, letterSpacing: 1 }}>{h}</div>)}
        </div>
        {mnfNodes.map((n, i) => {
          const al = ALERT[n.alert_status] ?? { color: C.muted, label: n.alert_status }
          const red = n.alert_status.startsWith('red')
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '9px 10px', background: red ? 'rgba(239,68,68,0.07)' : C.row, border: `1px solid ${red ? 'rgba(239,68,68,0.25)' : C.border}` }}>
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
      </div>
    </Card>
  )
}
