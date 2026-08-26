import { useState } from 'react'
import type { NodeNetFormula, NodeNrwRow } from '@/app/actions/executive-summary'
import { C, MONO, fmt, nrwColor, Card, Sec, TYPE_COLOR, useBreakpoint } from './shared'

// การ์ดสูตร net แบบ hover — โชว์สมการจริงของ node นั้น เช่น DMA09 − DMA01 − DMA02 = DMA09(net)
// พร้อมไฮไลต์ลูกที่ไม่มีข้อมูล (สาเหตุที่ตัวเลขยังไม่ net เต็มที่)
function NetFormulaBadge({ formula }: { formula: NodeNetFormula }) {
  const [open, setOpen] = useState(false)
  const failedCodes = formula.children.filter((c) => c.has_device_fail).map((c) => c.code)

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
    >
      <span
        className="caution-wiggle"
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.warn,
          background: `${C.warn}18`,
          border: `1px solid ${C.warn}55`,
          borderRadius: '50%',
          width: 18,
          height: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'help',
        }}
      >
        ⚠
      </span>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '150%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 240,
            background: '#1C2530',
            border: `1px solid ${C.warn}66`,
            borderRadius: 6,
            padding: '10px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            zIndex: 30,
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 10, color: '#E8ECF1', lineHeight: 1.5, marginBottom: 8 }}>
            ยังไม่ net เต็มที่ — <span style={{ color: C.warn, fontWeight: 700 }}>{failedCodes.join(', ')}</span> ไม่มีข้อมูลเดือนนี้
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              gap: 4,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4,
              padding: '6px 8px',
            }}
          >
            <span style={{ color: '#E8ECF1' }}>{formula.node_code}</span>
            {formula.children.map((c) => (
              <span key={c.code} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: C.dim }}>−</span>
                <span style={{ color: c.has_device_fail ? C.warn : '#E8ECF1' }}>
                  {c.code}
                  {c.has_device_fail && '⚠'}
                </span>
              </span>
            ))}
            <span style={{ color: C.dim }}>=</span>
            <span style={{ color: C.accent }}>{formula.node_code}(net)</span>
          </div>
          {/* ลูกศรชี้ลงหาไอคอน */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${C.warn}66`,
            }}
          />
        </div>
      )}
    </span>
  )
}

export function DmaTab({ nodeDmaStats }: { nodeDmaStats: NodeNrwRow[] }) {
  const { isMobile } = useBreakpoint()
  const gridCols = '28px 80px 1fr 100px 100px 110px 68px'

  if (!nodeDmaStats.length) return (
    <Card style={{ textAlign: 'center', padding: 50 }}>
      <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>{'// ยังไม่มีข้อมูลน้ำจ่ายรายโซนสำหรับสาขานี้'}</div>
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
      <div style={{ display: 'flex', columnGap: isMobile ? 12 : 20, flexWrap: 'wrap', rowGap: 10, marginBottom: 14, padding: '10px 14px', background: 'rgba(11,110,118,0.05)', border: `1px solid ${C.border}` }}>
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
      <div style={{ overflowX: isMobile ? 'auto' : 'visible' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: isMobile ? 620 : undefined }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, padding: '6px 10px', background: 'rgba(11,110,118,0.08)', borderBottom: `1px solid ${C.border}` }}>
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
                gridTemplateColumns: gridCols,
                gap: 8,
                padding: '9px 10px',
                background: top3 ? 'rgba(179,57,44,0.07)' : C.row,
                border: `1px solid ${top3 ? 'rgba(179,57,44,0.25)' : C.border}`,
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
                <span style={{ fontSize: 13, color: top3 ? '#B85A50' : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.node_name || d.node_code}
                </span>
                {d.has_device_fail && (
                  <span style={{ fontSize: 8, color: C.warn, fontFamily: MONO, background: `${C.warn}18`, border: `1px solid ${C.warn}44`, padding: '1px 4px', flexShrink: 0 }}>⚠FAIL</span>
                )}
              </div>

              {/* น้ำจ่าย (net หลังหักลูกที่ self_supply แล้ว — ตกลงกับ user 25 ส.ค. 69 ว่าต้องโชว์ net ไม่ใช่ gross ดิบ) */}
              <div style={{ fontSize: 12, color: C.muted, fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 4 }}>
                {fmt(d.net_flow ?? d.gross_flow)}
                {d.net_formula && <NetFormulaBadge formula={d.net_formula} />}
              </div>

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
      </div>
    </Card>
  )
}
