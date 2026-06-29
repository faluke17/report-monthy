'use client'

import { useState } from 'react'
import type { BranchExecutiveSummary, DmaStatRow, MnfNodeRow, ObstacleRow } from '@/app/actions/executive-summary'

const THAI_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
type Tab = 'nrw' | 'dma' | 'obstacle' | 'mnf' | 'budget'

// ── Cyber color tokens ─────────────────────────────────────────────────────────
const A = 'rgba(34,211,238,'    // cyan alpha shorthand
const C = {
  bg:        '#04070F',
  panel:     `${A}0.06)`,
  panelHi:   `${A}0.12)`,
  border:    `${A}0.2)`,
  borderBt:  `${A}0.8)`,
  row:       `${A}0.04)`,
  text:      '#E2E8F0',
  sub:       `${A}0.75)`,
  muted:     '#64748B',
  accent:    `${A}0.95)`,
  good:      '#10D9B0',
  warn:      '#F59E0B',
  crit:      '#EF4444',
  critA:     'rgba(239,68,68,',
}
const MONO = 'IBM Plex Mono, monospace'
const GRID = `linear-gradient(${A}0.05) 1px,transparent 1px),linear-gradient(90deg,${A}0.05) 1px,transparent 1px)`

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number | null, dec = 0) {
  if (n == null) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function nrwColor(p: number | null) {
  if (p == null) return C.muted
  return p <= 20 ? C.good : p <= 25 ? C.warn : C.crit
}

// ── Corners ───────────────────────────────────────────────────────────────────
function Corners({ c = C.borderBt, s = 9 }: { c?: string; s?: number }) {
  const st: React.CSSProperties = { position:'absolute', width:s, height:s, borderColor:c }
  return (
    <>
      <span style={{...st,top:-1,left:-1,  borderTop:'1px solid',borderLeft:'1px solid'}}/>
      <span style={{...st,top:-1,right:-1, borderTop:'1px solid',borderRight:'1px solid'}}/>
      <span style={{...st,bottom:-1,left:-1, borderBottom:'1px solid',borderLeft:'1px solid'}}/>
      <span style={{...st,bottom:-1,right:-1, borderBottom:'1px solid',borderRight:'1px solid'}}/>
    </>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function Bar({ pct, color = C.accent }: { pct: number; color?: string }) {
  return (
    <div style={{ height:5, background:`${A}0.07)`, border:`1px solid ${C.border}` }}>
      <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:color, boxShadow:`0 0 6px ${color}` }}/>
    </div>
  )
}

// ── YoY badge ─────────────────────────────────────────────────────────────────
function Yoy({ curr, prev, lo = false }: { curr: number|null; prev: number|null; lo?: boolean }) {
  if (curr==null||prev==null||prev===0) return <span style={{color:C.muted,fontFamily:MONO,fontSize:12}}>—</span>
  const d = ((curr-prev)/Math.abs(prev))*100
  const good = lo ? d<0 : d>0
  const color = Math.abs(d)<1 ? C.muted : good ? C.good : C.crit
  const arrow = d>0.5?'▲':d<-0.5?'▼':'→'
  return <span style={{color,fontSize:12,fontFamily:MONO}}>{arrow} {Math.abs(d).toFixed(1)}% vs ปีก่อน</span>
}

// ── Branch portrait (circular rings) ─────────────────────────────────────────
function Portrait({ code, color }: { code: string; color: string }) {
  return (
    <div style={{ position:'relative', width:130, height:130, margin:'0 auto' }}>
      {/* Outer ring */}
      <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`1px solid ${C.border}` }}/>
      {/* Middle ring */}
      <div style={{ position:'absolute', inset:10, borderRadius:'50%', border:`1px solid ${C.borderBt}`, boxShadow:`0 0 12px ${A}0.3)` }}/>
      {/* Inner fill */}
      <div style={{ position:'absolute', inset:20, borderRadius:'50%', background:C.panelHi, border:`1px solid ${C.border}` }}/>
      {/* Rotating sweep arm */}
      <div className="anim-radar" style={{ position:'absolute', inset:10, borderRadius:'50%', transformOrigin:'center', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', width:'50%', height:1, background:`linear-gradient(90deg,transparent,${A}0.8))`, transformOrigin:'left', transform:'translateY(-50%)' }}/>
        <div style={{ position:'absolute', top:0, left:'50%', width:'50%', height:'50%', background:`conic-gradient(from 0deg,transparent 0deg,${A}0.12) 60deg,transparent 80deg)`, transformOrigin:'bottom left' }}/>
      </div>
      {/* Center text */}
      <div style={{ position:'absolute', inset:20, borderRadius:'50%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:11, fontFamily:MONO, fontWeight:700, color, letterSpacing:1.5, textShadow:`0 0 10px ${color}` }}>{code}</div>
      </div>
      {/* Corner dots */}
      {[[0,'50%'],[100,'50%'],['50%',0],['50%',100]].map(([x,y],i)=>(
        <div key={i} style={{ position:'absolute', left:typeof x==='number'?`${x}%`:x, top:typeof y==='number'?`${y}%`:y, width:4, height:4, borderRadius:'50%', background:color, boxShadow:`0 0 6px ${color}`, transform:'translate(-50%,-50%)' }}/>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.accent }: { label:string; value:string|number; sub?:string; color?:string }) {
  return (
    <div style={{ position:'relative', padding:'10px 14px', background:C.panel, border:`1px solid ${C.border}`, flex:1 }}>
      <Corners c={color} s={6}/>
      <div style={{ fontSize:10, color:C.muted, fontFamily:MONO, letterSpacing:0.8, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color, fontFamily:MONO, lineHeight:1, textShadow:`0 0 12px ${color}66` }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:C.muted, marginTop:4, fontFamily:MONO }}>{sub}</div>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function Sec({ label, right }: { label:string; right?: React.ReactNode }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:10, color:C.accent, fontFamily:MONO, letterSpacing:1.6, fontWeight:700 }}>{'// '}{label}</span>
        {right}
      </div>
      <div style={{ height:1, background:`linear-gradient(90deg,${C.borderBt},transparent)`, marginTop:6 }}/>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
function Card({ children, style }: { children:React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:'relative', background:C.panel, border:`1px solid ${C.border}`, padding:'14px 16px', ...style }}>
      <Corners s={7}/>
      {children}
    </div>
  )
}

// ── ALERT map ─────────────────────────────────────────────────────────────────
const ALERT: Record<string,{color:string;label:string}> = {
  red_spike:       {color:C.crit,   label:'ท่อแตก'},
  red_accumulated: {color:'#F1948A',label:'รั่วซึม'},
  yellow:          {color:C.warn,   label:'เฝ้าดู'},
  green:           {color:C.good,   label:'ปกติ'},
}
const PHASES       = ['ยังไม่เริ่ม','ราคากลาง','TOR','พิจารณาผล','เซ็นสัญญา','ดำเนินงาน','แล้วเสร็จ']
const PHASE_COLOR  = ['#4A5568','#9B59B6','#3498DB','#7F8FBF','#E0A020','#1ABC9C',C.good]
const OBS_STATUS: Record<string,string> = {
  'รายงานใหม่':C.accent,'ระหว่างแก้':C.warn,'รอสนับสนุน':C.crit,'ล่าช้า':'#E67E22','เกินกำหนด':C.crit,
}

// ── NRW Tab ───────────────────────────────────────────────────────────────────
function NrwTab({ nrw, delta, color }: { nrw: BranchExecutiveSummary['nrw']; delta:number|null; color:string }) {
  const repairPct = nrw.leaks_found>0 ? Math.round(nrw.leaks_repaired/nrw.leaks_found*100) : 0
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Big NRW */}
      <Card>
        <Sec label="NRW % ปัจจุบัน"/>
        <div style={{ display:'flex', alignItems:'flex-end', gap:32 }}>
          <div>
            <div style={{ fontSize:80, fontWeight:900, fontFamily:MONO, color, lineHeight:1, textShadow:`0 0 40px ${color}66` }}>
              {nrw.current_pct!=null ? nrw.current_pct.toFixed(1) : '—'}
            </div>
            <div style={{ fontSize:20, color, fontFamily:MONO, marginTop:2 }}>%</div>
          </div>
          <div style={{ flex:1, paddingBottom:8, display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <div style={{ fontSize:10, color:C.muted, fontFamily:MONO, letterSpacing:0.8, marginBottom:3 }}>เปลี่ยนจากเดือนก่อน</div>
              <div style={{ fontSize:28, fontWeight:700, fontFamily:MONO, color: delta==null?C.muted:delta<0?C.good:delta>0?C.crit:C.muted, textShadow:`0 0 10px currentColor` }}>
                {delta==null?'—':`${delta>0?'+':''}${delta.toFixed(2)}%`}
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{delta==null?'':delta<0?'▼ ดีขึ้น':delta>0?'▲ แย่ลง':'→ คงที่'}</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.muted, fontFamily:MONO, marginBottom:3 }}>เทียบปีที่แล้ว</div>
              <Yoy curr={nrw.current_pct} prev={nrw.yoy_pct} lo/>
              {nrw.yoy_pct!=null && <div style={{ fontSize:10, color:C.muted, marginTop:2, fontFamily:MONO }}>ปีก่อน: {nrw.yoy_pct.toFixed(2)}%</div>}
            </div>
          </div>
        </div>
      </Card>

      {/* Volume */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {[
          {label:'น้ำจ่าย (m³)',    curr:nrw.water_produced, prev:nrw.yoy_produced},
          {label:'น้ำจำหน่าย (m³)', curr:nrw.water_sold,     prev:nrw.yoy_sold},
        ].map(({label,curr,prev})=>(
          <Card key={label}>
            <Sec label={label}/>
            <div style={{ fontSize:32, fontWeight:800, color:C.text, fontFamily:MONO, marginBottom:6 }}>{fmt(curr)}</div>
            <Yoy curr={curr} prev={prev}/>
          </Card>
        ))}
      </div>

      {/* Leaks */}
      <Card>
        <Sec label="สถานะท่อรั่ว"/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
          {[
            {label:'พบรั่ว',  val:nrw.leaks_found,    c:C.accent},
            {label:'ซ่อมแล้ว',val:nrw.leaks_repaired,  c:C.good},
            {label:'ค้างซ่อม',val:nrw.leaks_pending,   c:nrw.leaks_pending>0?C.crit:C.muted},
          ].map(({label,val,c})=>(
            <div key={label} style={{ position:'relative', textAlign:'center', padding:'12px 8px', background:`${A}0.04)`, border:`1px solid ${C.border}` }}>
              <Corners c={c} s={5}/>
              <div style={{ fontSize:10, color:C.muted, fontFamily:MONO, marginBottom:8 }}>{label}</div>
              <div style={{ fontSize:38, fontWeight:900, color:c, fontFamily:MONO, lineHeight:1, textShadow:`0 0 14px ${c}88` }}>{val}</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:4, fontFamily:MONO }}>จุด</div>
            </div>
          ))}
        </div>
        {nrw.leaks_found>0 && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.muted, fontFamily:MONO, marginBottom:5 }}>
              <span>อัตราซ่อม</span><span style={{color:C.good}}>{repairPct}%</span>
            </div>
            <Bar pct={repairPct} color={C.good}/>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── DMA Tab ───────────────────────────────────────────────────────────────────
function DmaTab({ dmaStats }: { dmaStats: DmaStatRow[] }) {
  if (!dmaStats.length) return <Card style={{textAlign:'center',padding:50}}><div style={{fontSize:12,color:C.muted,fontFamily:MONO}}>// ไม่มีข้อมูล DMA · sync ทุกวันที่ 16</div></Card>
  const total = dmaStats.reduce((s,d)=>s+d.water_loss,0)
  const period = `${dmaStats[0].report_year}/${String(dmaStats[0].report_month).padStart(2,'0')}`
  return (
    <Card>
      <Sec label="PRIORITY DMA — จัดเรียงตามน้ำสูญเสีย" right={<span style={{fontSize:10,color:C.muted,fontFamily:MONO}}>{period}</span>}/>
      <div style={{ fontSize:12, color:C.sub, fontFamily:MONO, marginBottom:12 }}>
        รวม: <span style={{color:C.crit,fontWeight:700}}>{fmt(total)} m³</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 120px 90px', gap:10, padding:'5px 12px', background:`${A}0.07)`, borderBottom:`1px solid ${C.border}` }}>
          {['#','ชื่อ DMA','น้ำสูญเสีย (m³)','%'].map(h=>(
            <div key={h} style={{fontSize:9,color:C.accent,fontFamily:MONO,fontWeight:700,letterSpacing:1}}>{h}</div>
          ))}
        </div>
        {dmaStats.map((d,i)=>{
          const top = i<3
          const lossPct = d.outbound && d.outbound>0 ? (d.water_loss/d.outbound*100).toFixed(1) : '—'
          return (
            <div key={d.id} style={{ display:'grid', gridTemplateColumns:'28px 1fr 120px 90px', gap:10, padding:'9px 12px', background:top?`${C.critA}0.1)`:C.row, border:`1px solid ${top?`${C.critA}0.35)`:C.border}` }}>
              <div style={{fontSize:12,fontWeight:700,color:top?C.crit:C.muted,fontFamily:MONO,textAlign:'center'}}>{i+1}</div>
              <div style={{fontSize:13,color:top?'#F1948A':C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.area_name||d.area_label}</div>
              <div style={{fontSize:13,fontWeight:700,color:top?C.crit:C.sub,fontFamily:MONO}}>{fmt(d.water_loss)}</div>
              <div style={{fontSize:12,color:C.sub,fontFamily:MONO}}>{lossPct}%</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Obstacle Tab ──────────────────────────────────────────────────────────────
function ObsTab({ obstacles }: { obstacles: ObstacleRow[] }) {
  if (!obstacles.length) return (
    <Card style={{textAlign:'center',padding:50}}>
      <div style={{fontSize:26,color:C.good,marginBottom:10,textShadow:`0 0 18px ${C.good}`}}>✓</div>
      <div style={{fontSize:14,color:C.good,fontFamily:MONO,fontWeight:700}}>// ไม่มีอุปสรรคที่เปิดอยู่</div>
    </Card>
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {obstacles.map(obs=>{
        const sc = OBS_STATUS[obs.status]??C.muted
        return (
          <Card key={obs.id} style={{padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:10,padding:'2px 10px',border:`1px solid ${sc}`,color:sc,fontFamily:MONO,fontWeight:700,letterSpacing:0.8}}>{obs.category}</span>
                <span style={{fontSize:10,color:C.muted,fontFamily:MONO}}>{obs.code}</span>
              </div>
              <span style={{fontSize:11,color:sc,fontWeight:700,fontFamily:MONO}}>{obs.status}</span>
            </div>
            <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{obs.obstacle_type}</div>
            {obs.last_log_message && (
              <div style={{fontSize:11,color:C.sub,marginTop:8,padding:'7px 10px',background:`${A}0.04)`,borderLeft:`2px solid ${sc}`}}>{obs.last_log_message}</div>
            )}
            {obs.progress_pct>0 && (
              <div style={{marginTop:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:C.muted,fontFamily:MONO,marginBottom:5}}>
                  <span>ความคืบหน้า</span><span>{obs.progress_pct}%</span>
                </div>
                <Bar pct={obs.progress_pct} color={sc}/>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ── MNF Tab ───────────────────────────────────────────────────────────────────
function MnfTab({ mnfNodes }: { mnfNodes: MnfNodeRow[] }) {
  if (!mnfNodes.length) return <Card style={{textAlign:'center',padding:50}}><div style={{fontSize:12,color:C.muted,fontFamily:MONO}}>// ยังไม่มีข้อมูล EMA</div></Card>
  const reds = mnfNodes.filter(n=>n.alert_status.startsWith('red')).length
  return (
    <Card>
      <Sec label="MNF MONITOR — EMA รายโหนด" right={reds>0?<span style={{fontSize:12,color:C.crit,fontFamily:MONO}}>⚠ {reds} โหนดแดง</span>:undefined}/>
      <div style={{display:'flex',flexDirection:'column',gap:3}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 65px 80px',gap:10,padding:'5px 10px',background:`${A}0.07)`,borderBottom:`1px solid ${C.border}`}}>
          {['Node','Flow','Diff %','วันติดกัน','สถานะ'].map(h=><div key={h} style={{fontSize:9,color:C.accent,fontFamily:MONO,fontWeight:700,letterSpacing:1}}>{h}</div>)}
        </div>
        {mnfNodes.map((n,i)=>{
          const al = ALERT[n.alert_status]??{color:C.muted,label:n.alert_status}
          const red = n.alert_status.startsWith('red')
          return (
            <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 65px 80px',gap:10,padding:'9px 10px',background:red?`${C.critA}0.09)`:C.row,border:`1px solid ${red?`${C.critA}0.3)`:C.border}`}}>
              <div>
                <div style={{fontSize:13,color:C.text}}>{n.node_label}</div>
                <div style={{fontSize:10,color:C.muted,fontFamily:MONO}}>{n.record_date}</div>
              </div>
              <div style={{fontSize:14,color:C.text,fontFamily:MONO,fontWeight:600}}>{n.mnf_flow!=null?n.mnf_flow.toFixed(2):'—'}</div>
              <div style={{fontSize:14,fontFamily:MONO,fontWeight:600,color:n.diff_percent>50?C.crit:C.sub}}>{n.diff_percent.toFixed(1)}%</div>
              <div style={{fontSize:14,color:C.sub,fontFamily:MONO,fontWeight:600}}>{n.consecutive_count||0}</div>
              <div style={{fontSize:12,color:al.color,fontWeight:700,fontFamily:MONO}}>{al.label}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── Budget Tab ────────────────────────────────────────────────────────────────
function BudgetTab({ budget }: { budget: BranchExecutiveSummary['budget_2569'] }) {
  if (!budget) return <Card style={{textAlign:'center',padding:50}}><div style={{fontSize:12,color:C.muted,fontFamily:MONO}}>// ไม่มีข้อมูลงบประมาณปี 2569</div></Card>
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[
          {label:'โครงการทั้งหมด',val:budget.total,           c:C.accent},
          {label:'แล้วเสร็จ',      val:budget.by_phase[6]??0, c:C.good},
          {label:'ความสำเร็จ',     val:`${budget.done_pct}%`, c:C.good},
          {label:'เกินกำหนด',      val:budget.overdue,        c:budget.overdue>0?C.crit:C.muted},
        ].map(({label,val,c})=>(
          <Card key={label} style={{textAlign:'center',padding:14}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:0.8,marginBottom:6}}>{label}</div>
            <div style={{fontSize:28,fontWeight:800,color:c,fontFamily:MONO,textShadow:`0 0 12px ${c}66`}}>{val}</div>
          </Card>
        ))}
      </div>
      <Card>
        <Sec label="สัดส่วนตามขั้นตอน"/>
        <div style={{display:'flex',height:8,gap:2,border:`1px solid ${C.border}`,overflow:'hidden',marginBottom:10}}>
          {PHASES.map((_,i)=>{const n=budget.by_phase[i]??0;return n?<div key={i} style={{flex:n,background:PHASE_COLOR[i],boxShadow:`0 0 6px ${PHASE_COLOR[i]}88`}} title={`${PHASES[i]}:${n}`}/>:null})}
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'6px 18px'}}>
          {PHASES.map((label,i)=>{const n=budget.by_phase[i]??0;return n?(
            <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:7,height:7,background:PHASE_COLOR[i],boxShadow:`0 0 5px ${PHASE_COLOR[i]}`}}/>
              <span style={{fontSize:12,color:C.sub}}>{label}</span>
              <span style={{fontSize:12,color:PHASE_COLOR[i],fontFamily:MONO,fontWeight:700}}>{n}</span>
            </div>
          ):null})}
        </div>
      </Card>
      {budget.projects.length>0 && (
        <Card>
          <Sec label="รายการโครงการ"/>
          <div style={{display:'flex',flexDirection:'column',gap:3}}>
            {budget.projects.map((p,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:p.overdue?`${C.critA}0.09)`:C.row,border:`1px solid ${p.overdue?`${C.critA}0.3)`:C.border}`}}>
                <div style={{width:7,height:7,background:PHASE_COLOR[p.phase],boxShadow:`0 0 5px ${PHASE_COLOR[p.phase]}`,flexShrink:0}}/>
                <span style={{flex:1,fontSize:12,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
                <span style={{fontSize:10,padding:'1px 7px',border:`1px solid ${PHASE_COLOR[p.phase]}`,color:PHASE_COLOR[p.phase],fontFamily:MONO,fontWeight:700,flexShrink:0}}>{PHASES[p.phase]}</span>
                {p.overdue && <span style={{fontSize:10,color:C.crit,fontFamily:MONO,fontWeight:700,flexShrink:0}}>เกินกำหนด</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────
interface Props {
  data: BranchExecutiveSummary
  animKey: number
  onBack: () => void
}

export function BranchSummaryPanel({ data, animKey, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('nrw')
  const { branch, nrw, budget_2569, dmaStats, obstacles, mnfNodes } = data

  const color   = nrwColor(nrw.current_pct)
  const delta   = nrw.current_pct!=null && nrw.prev_month_pct!=null ? nrw.current_pct - nrw.prev_month_pct : null
  const repLabel = nrw.report_month ? `${THAI_MONTHS[nrw.report_month]} ${nrw.report_year??''}` : '—'

  const tabs: {id:Tab;label:string;count?:number;alert?:boolean}[] = [
    {id:'nrw',     label:'ภาพรวม NRW'},
    {id:'dma',     label:'Priority DMA', count:dmaStats.length},
    {id:'obstacle',label:'อุปสรรค',      count:obstacles.length, alert:obstacles.length>0},
    {id:'mnf',     label:'MNF Monitor',  count:mnfNodes.length,  alert:mnfNodes.some(n=>n.alert_status.startsWith('red'))},
    {id:'budget',  label:'งบประมาณ 2569',count:budget_2569?.total??0},
  ]

  // Quick stats for portrait row
  const redMnf = mnfNodes.filter(n=>n.alert_status.startsWith('red')).length

  return (
    <div key={animKey} style={{
      position:'absolute', inset:0, display:'flex', flexDirection:'column', overflow:'hidden',
      background:`linear-gradient(180deg,#04070F 0%,#030609 100%)`,
      color:C.text, fontFamily:'system-ui,-apple-system,sans-serif',
      /* Polygon: clip bottom-left corner 28px */
      clipPath:'polygon(0 0,100% 0,100% 100%,28px 100%,0 calc(100% - 28px))',
    }}>

      {/* BG elements */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:GRID,backgroundSize:'20px 20px',opacity:0.6}}/>
      <div className="anim-flicker" style={{position:'absolute',inset:0,pointerEvents:'none',background:'repeating-linear-gradient(180deg,rgba(34,211,238,0.015) 0px,rgba(34,211,238,0.015) 1px,transparent 1px,transparent 3px)',mixBlendMode:'screen',opacity:0.4,zIndex:1}}/>

      {/* ── Header bar ── */}
      <div style={{
        height:52, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 18px',
        background:'rgba(4,7,15,0.92)',
        borderBottom:`1px solid ${C.border}`,
        backdropFilter:'blur(12px)',
        position:'relative', zIndex:10,
      }}>
        {/* Left: badge + name */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{position:'relative',padding:'4px 12px',border:`1px solid ${C.borderBt}`,background:`${A}0.08)`,boxShadow:`0 0 12px ${A}0.25)`}}>
            <Corners s={5}/>
            <span style={{fontSize:9,color:C.accent,fontFamily:MONO,letterSpacing:2,fontWeight:700}}>{branch.code}</span>
          </div>
          <div style={{width:1,height:26,background:C.border}}/>
          <div>
            <div style={{fontSize:10,color:C.muted,fontFamily:MONO,letterSpacing:0.5}}>{branch.province_th}</div>
            <div style={{fontSize:17,color:C.text,fontWeight:600}}>สาขา{branch.name_th}</div>
          </div>
        </div>

        {/* Right: report date + NRW + close */}
        <div style={{display:'flex',alignItems:'center',gap:18,zIndex:11}}>
          <div>
            <div style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:0.5}}>รายงานล่าสุด</div>
            <div style={{fontSize:13,color:C.sub,fontWeight:600}}>{repLabel}</div>
          </div>
          <div style={{width:1,height:26,background:C.border}}/>
          <div style={{textAlign:'center',minWidth:80}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:MONO}}>NRW%</div>
            <div style={{fontSize:24,fontWeight:900,color,fontFamily:MONO,textShadow:`0 0 14px ${color}88`}}>
              {nrw.current_pct!=null?`${nrw.current_pct.toFixed(1)}%`:'—'}
            </div>
          </div>
          <div style={{width:1,height:26,background:C.border}}/>
          <button
            onClick={onBack}
            style={{
              padding:'5px 14px',fontSize:10,letterSpacing:1,
              color:C.sub,background:`${A}0.06)`,border:`1px solid ${C.border}`,
              cursor:'pointer',fontFamily:MONO,
            }}
          >
            ✕ ปลดเป้าหมาย
          </button>
        </div>
      </div>

      {/* ── Portrait + Quick Stats row ── */}
      <div style={{
        flexShrink:0, display:'flex', alignItems:'center', gap:16, padding:'14px 20px',
        borderBottom:`1px solid ${C.border}`,
        background:'rgba(4,7,15,0.6)',
        position:'relative', zIndex:5,
      }}>
        {/* Portrait */}
        <div style={{flexShrink:0}}>
          <Portrait code={branch.code} color={color}/>
          <div style={{textAlign:'center',marginTop:6}}>
            <div style={{fontSize:10,color:C.muted,fontFamily:MONO}}>{branch.province_th}</div>
          </div>
        </div>

        {/* Quick stat cards */}
        <div style={{flex:1,display:'flex',gap:10,alignItems:'stretch'}}>
          <StatCard
            label="NRW % เดือนนี้"
            value={nrw.current_pct!=null?`${nrw.current_pct.toFixed(1)}%`:'—'}
            sub={delta!=null?`${delta>0?'+':''}${delta.toFixed(2)}% จากเดือนก่อน`:undefined}
            color={color}
          />
          <StatCard
            label="ค้างซ่อม"
            value={nrw.leaks_pending}
            sub="จุดท่อรั่ว"
            color={nrw.leaks_pending>0?C.crit:C.good}
          />
          <StatCard
            label="DMA พบปัญหา"
            value={dmaStats.length}
            sub="โซนสูญเสียสูง"
            color={dmaStats.length>0?C.warn:C.muted}
          />
          <StatCard
            label="MNF แจ้งเตือน"
            value={redMnf}
            sub="โหนดสถานะแดง"
            color={redMnf>0?C.crit:C.muted}
          />
        </div>
      </div>

      {/* ── Horizontal Tab Bar ── */}
      <div style={{
        flexShrink:0, display:'flex', alignItems:'stretch',
        borderBottom:`1px solid ${C.border}`,
        background:'rgba(4,7,15,0.7)',
        position:'relative', zIndex:5,
        padding:'0 20px',
      }}>
        {tabs.map(({id,label,count,alert})=>{
          const active = tab===id
          return (
            <button
              key={id}
              onClick={()=>setTab(id)}
              style={{
                display:'flex',alignItems:'center',gap:7,
                padding:'10px 16px',
                background:'transparent',border:'none',
                borderBottom:active?`2px solid ${C.borderBt}`:'2px solid transparent',
                color:active?C.text:C.muted,
                cursor:'pointer',fontSize:13,
                fontWeight:active?700:400,
                letterSpacing:0.3,
                transition:'color .15s,border-color .15s',
                marginBottom:-1,
              }}
            >
              <span>{label}</span>
              {alert && <span className="anim-blink-crit" style={{width:5,height:5,borderRadius:'50%',background:C.crit,boxShadow:`0 0 5px ${C.crit}`,display:'inline-block'}}/>}
              {count!=null&&count>0 && (
                <span style={{fontSize:10,padding:'1px 6px',background:active?`${A}0.15)`:`${A}0.06)`,color:active?C.accent:C.muted,border:`1px solid ${C.border}`,fontFamily:MONO}}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <div style={{flex:1,overflowY:'auto',padding:'18px 20px',position:'relative',zIndex:2}}>
        {tab==='nrw'      && <NrwTab nrw={nrw} delta={delta} color={color}/>}
        {tab==='dma'      && <DmaTab dmaStats={dmaStats}/>}
        {tab==='obstacle' && <ObsTab obstacles={obstacles}/>}
        {tab==='mnf'      && <MnfTab mnfNodes={mnfNodes}/>}
        {tab==='budget'   && <BudgetTab budget={budget_2569}/>}
      </div>

      {/* ── Footer ── */}
      <div style={{
        height:30, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 18px', borderTop:`1px solid ${C.border}`,
        background:'rgba(4,7,15,0.8)', position:'relative', zIndex:5,
      }}>
        <div style={{display:'flex',gap:16}}>
          {[
            {l:'STATUS',v:'LINK · STABLE',c:C.good},
            {l:'DMA',v:`${dmaStats.length} ZONES`,c:C.accent},
            {l:'MNF',v:`${mnfNodes.length} NODES`,c:redMnf>0?C.crit:C.accent},
          ].map(({l,v,c})=>(
            <span key={l} style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:1}}>
              {l} <span style={{color:c}}>{v}</span>
            </span>
          ))}
        </div>
        <span style={{fontSize:9,color:C.muted,fontFamily:MONO,letterSpacing:0.8}}>
          MATE © ๒๕๖๙ · กปภ.เขต ๑๐
        </span>
      </div>
    </div>
  )
}
