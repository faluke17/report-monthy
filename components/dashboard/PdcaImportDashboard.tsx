'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { KpiCard } from './KpiCard'
import { StepTestChart } from './StepTestChart'
import { Branch } from '@/lib/types'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'
import {
  PdcaImportData, PdcaImportArea, computeAgg, metricValue, matchBranch,
} from '@/lib/utils/pdca-import'

interface Props {
  data: PdcaImportData
  branches: Branch[]
}

function fmt(n: number | null | undefined, dec = 2) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('th-TH', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

/** meta.year from pdca-tool.html is Buddhist Era (e.g. 2569) — same heuristic AreaReportForm uses on import */
function resolveAdYear(y: number) {
  return y > 2100 ? y - 543 : y
}

function CustomTooltip({ active, payload, label, unit, decimals }: {
  active?: boolean
  payload?: { dataKey: string; value: number }[]
  label?: string
  unit: string
  decimals: number
}) {
  if (!active || !payload?.length) return null
  const before = payload.find((p) => p.dataKey === 'before')?.value
  const after = payload.find((p) => p.dataKey === 'after')?.value
  return (
    <div className="bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs shadow-lg">
      <p className="font-semibold text-[#12181F] mb-1.5">{label}</p>
      <p className="text-black/50">ก่อน: <span className="text-black/75 font-medium">{fmt(before, decimals)} {unit}</span></p>
      <p className="text-black/50">หลัง: <span className="text-[#0B6E76] font-medium">{fmt(after, decimals)} {unit}</span></p>
    </div>
  )
}

function MetricChart({ areas, metric, title }: { areas: PdcaImportArea[]; metric: 'nrw' | 'mnf'; title: string }) {
  const unit = metric === 'mnf' ? 'ลบ.ม./ชม.' : '%'
  const decimals = metric === 'mnf' ? 2 : 1
  const chartData = areas.map((a) => ({
    name: a.name.length > 14 ? a.name.slice(0, 13) + '…' : a.name,
    before: metricValue(a, 'before', metric),
    after: metricValue(a, 'after', metric),
  }))

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="page-kicker">{title}</p>
        <div className="flex items-center gap-4 text-xs text-black/45">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#98A2AF' }} />ก่อน</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#0B6E76' }} />หลัง</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 4 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'rgba(0,0,0,.4)', fontSize: 10.5 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: 'rgba(0,0,0,.4)', fontSize: 10.5 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}${metric === 'mnf' ? '' : '%'}`}
          />
          <Tooltip content={<CustomTooltip unit={unit} decimals={decimals} />} cursor={{ fill: 'rgba(0,0,0,.03)' }} />
          <Bar dataKey="before" fill="#98A2AF" radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar dataKey="after" fill="#0B6E76" radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Descriptor list for meter topics that actually have data — mirrors
// meterTopics() in pdca-tool.html so only filled-in topics render.
function meterTopics(m: Record<string, string | number>) {
  return [
    { title: '1 · เปลี่ยนมาตรชำรุด/ตาย/แนวโน้มชำรุด', items: [
      ['จำนวนที่เปลี่ยน', m.changed_count, 'เครื่อง'],
      ['น้ำที่ได้คืน', m.recovered_water, 'ลบ.ม.'],
      ['มูลค่า', m.recovered_value, 'บาท'],
      ['ขนาดมาตร', m.meter_size, ''],
      ['ยอดสะสมปีงบฯ', m.cumulative_fy, 'เครื่อง'],
    ] },
    { title: '2 · ตรวจสอบมาตร 0 คิว', items: [
      ['ตรวจสอบ', m.zero_checked, 'ราย'],
      ['0 คิว ไม่เกิน 12 ด.', m.zero_under12, 'ราย'],
      ['0 คิว เกิน 12 ด.', m.zero_over12, 'ราย'],
      ['พบมาตรตาย', m.zero_dead, 'เครื่อง'],
    ] },
    { title: '3 · ตรวจมาตรแนวโน้มชำรุด (Dmama/WATCH)', items: [
      ['ตรวจ', m.trend_checked, 'ราย'],
      ['ปกติ', m.trend_normal, 'ราย'],
      ['พบชำรุด', m.trend_broken, 'ราย'],
      ['สาเหตุ', m.trend_reason, ''],
    ] },
    { title: '4 · น้ำสูง-ต่ำ ที่พนักงานแจ้ง', items: [
      ['แจ้ง', m.highlow_reported, 'ราย'],
      ['พบตาย/ผิดปกติ', m.highlow_abnormal, 'ราย'],
    ] },
    { title: '5 · สุ่มตรวจมาตร (5%)', items: [
      ['สุ่มตรวจ', m.sample_checked, 'ราย'],
      ['พบผิดปกติ', m.sample_abnormal, 'ราย'],
      ['ไม่พบผิดปกติ', m.sample_normal, 'ราย'],
    ] },
    { title: '6 · อ่านมาตร/ติดตามมาตรรายใหญ่', items: [
      ['อ่านมาตรรายใหญ่', m.bigmeter_read, 'เครื่อง'],
      ['ติดตาม WATCH Center', m.watch_followup, ''],
    ] },
    { title: '7 · โครงการเปลี่ยนมาตรตามอายุ', items: [
      ['เป้าหมาย', m.project_target, 'เครื่อง'],
      ['ดำเนินการแล้ว', m.project_done, 'เครื่อง'],
      ['สถานะ', m.project_status, ''],
    ] },
    { title: '9 · ติดตั้งมาตรชั่วคราว/เฉพาะกิจ', items: [
      ['รายละเอียด', m.temp_desc, ''],
      ['ปริมาณน้ำ', m.temp_volume, 'ลบ.ม.'],
      ['มูลค่าที่เรียกเก็บ', m.temp_value, 'บาท'],
    ] },
  ] as { title: string; items: [string, string | number | undefined, string][] }[]
}

function MeterCard({ meter }: { meter: Record<string, string | number> }) {
  const topics = meterTopics(meter).filter((t) => t.items.some(([, v]) => v))
  if (!topics.length) return null

  const total = ['changed_count', 'zero_checked', 'trend_checked', 'highlow_reported', 'sample_checked', 'bigmeter_read']
    .reduce((s, k) => s + (Number(meter[k]) || 0), 0)

  return (
    <div className="glass-card p-5">
      <p className="page-kicker mb-3">กิจกรรมตรวจ / เปลี่ยนมาตร</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-black/50 mb-4">
        <span>เปลี่ยนมาตรแล้ว: <b className="num text-[#12181F]">{fmt(Number(meter.changed_count) || 0, 0)}</b> เครื่อง</span>
        <span>น้ำที่ได้คืน: <b className="num text-[#12181F]">{fmt(Number(meter.recovered_water) || 0, 0)}</b> ลบ.ม.</span>
        <span>มูลค่า: <b className="num text-[#12181F]">{fmt(Number(meter.recovered_value) || 0, 0)}</b> บาท</span>
        <span>ยอดรวมกิจกรรมตรวจมาตร: <b className="num text-[#12181F]">{fmt(total, 0)}</b> เครื่อง/ราย</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {topics.map((t) => (
          <div key={t.title} className="rounded-xl border border-black/8 bg-black/2 p-3">
            <p className="text-[11px] font-bold text-[#12181F] mb-2">{t.title}</p>
            {t.items.filter(([, v]) => v).map(([label, v, unit]) => (
              <div key={label} className="flex justify-between text-[11.5px] text-black/50 py-0.5">
                <span>{label}</span>
                <b className="num text-[#12181F]">{v}{unit ? ` ${unit}` : ''}</b>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-black/35 mt-3">
        ข้อมูลมาตรวัดน้ำนี้เป็นตัวอย่างเท่านั้น — กด &quot;นำเข้าไปกรอกในฟอร์มเพื่อบันทึก&quot; ด้านบนเพื่อนำข้อมูลนี้เข้าฟอร์มและบันทึกลงระบบจริง
      </p>
    </div>
  )
}

function AreaCard({ area }: { area: PdcaImportArea }) {
  const pB = metricValue(area, 'before', 'nrw')
  const pA = metricValue(area, 'after', 'nrw')
  const mB = area.before.mnf
  const mA = area.after.mnf
  const pending = Math.max(0, area.leaksFound - area.leaksRepaired)
  const lossAfter = (area.after.dist ?? 0) - (area.after.sold ?? 0)

  const stripe = area.hasObstacle && area.obstacle
    ? (area.obstacle.priority === 'สูง' ? 'accent-bar-red' : 'accent-bar-amber')
    : 'accent-bar-green'

  return (
    <div className={`glass-card p-5 ${stripe}`}>
      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <h3 className="text-[15px] font-bold text-[#12181F]">{area.name}</h3>
        {area.hasObstacle && area.obstacle && (
          <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
            area.obstacle.priority === 'สูง' ? 'bg-red-500/10 text-red-700' : 'bg-amber-500/10 text-amber-700'
          }`}>
            {area.obstacle.priority === 'สูง' ? '🔴' : '🟡'} อุปสรรค{area.obstacle.priority}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-sm text-black/50 mb-1.5">
        <span>NRW:</span>
        <span className="num font-bold text-[15px] text-[#12181F]">{pB !== null ? `${fmt(pB, 1)}%` : '—'}</span>
        <span className="text-black/25">→</span>
        <span className="num font-bold text-[15px] text-[#12181F]">{pA !== null ? `${fmt(pA, 1)}%` : '—'}</span>
        {pB !== null && pA !== null && (
          <span className={`num font-bold ${pA <= pB ? 'text-[#1E7A5A]' : 'text-[#B3392C]'}`}>
            {pA <= pB ? '▼' : '▲'} {fmt(Math.abs(pB - pA), 1)} จุด
          </span>
        )}
      </div>

      {(mB !== null || mA !== null) && (
        <div className="flex items-center gap-2 flex-wrap text-sm text-black/50 mb-3">
          <span>MNF:</span>
          <span className="num font-bold text-[15px] text-[#12181F]">{fmt(mB)}</span>
          <span className="text-black/25">→</span>
          <span className="num font-bold text-[15px] text-[#12181F]">{fmt(mA)}</span>
          <span className="text-[11px] text-black/35">ลบ.ม./ชม.</span>
          {mB !== null && mA !== null && (
            <span className={`num font-bold ${mA <= mB ? 'text-[#1E7A5A]' : 'text-[#B3392C]'}`}>
              {mA <= mB ? '▼' : '▲'} {fmt(Math.abs(mB - mA))}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-black/50 mb-4">
        <span>น้ำสูญเสียหลัง: <b className="num text-[#12181F]">{fmt(lossAfter, 0)}</b> ลบ.ม.</span>
        <span>จุดรั่วพบ: <b className="num text-[#12181F]">{area.leaksFound}</b></span>
        <span>ซ่อมแล้ว: <b className="num text-[#12181F]">{area.leaksRepaired}</b></span>
        <span>ค้างซ่อม: <b className={`num ${pending > 0 ? 'text-[#B3392C]' : 'text-[#12181F]'}`}>{pending}</b></span>
      </div>

      {area.stepTests.length > 0 && (
        <div className="mb-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#0B6E76] mb-1">
            Step Test — สูญเสียคาดการณ์ (ลบ.ม./ชม.)
          </p>
          <div className="flex items-center gap-4 text-[10.5px] text-black/45 mb-1">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#98A2AF' }} />ไม่มีจุดรั่ว</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1E7A5A' }} />พบ · ซ่อมครบแล้ว</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#B3392C' }} />พบ · ค้างซ่อม</span>
          </div>
          <StepTestChart steps={area.stepTests.map((s, i) => ({
            label: `สเต็ป ${s.step ?? i + 1}`,
            loss: s.estLoss ?? 0,
            found: s.found ?? 0,
            repaired: s.repaired ?? 0,
          }))} />
          <details className="mt-1 group">
            <summary className="text-[11px] font-semibold text-[#0B6E76] cursor-pointer select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform">▸</span> แสดงตารางข้อมูล Step Test
            </summary>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-[9.5px] uppercase tracking-wide text-black/35">
                  <th className="text-left font-bold pb-1.5">สเต็ป</th>
                  <th className="text-right font-bold pb-1.5">สูญเสียคาดการณ์</th>
                  <th className="text-right font-bold pb-1.5">พบ</th>
                  <th className="text-right font-bold pb-1.5">ซ่อมแล้ว</th>
                  <th className="text-right font-bold pb-1.5">ค้างซ่อม</th>
                </tr>
              </thead>
              <tbody>
                {area.stepTests.map((s, i) => {
                  const p = Math.max(0, (s.found ?? 0) - (s.repaired ?? 0))
                  return (
                    <tr key={i} className="border-t border-black/6">
                      <td className="py-1.5 text-black/60">{s.step ?? i + 1}</td>
                      <td className="py-1.5 text-right num text-black/70">{fmt(s.estLoss, 2)}</td>
                      <td className="py-1.5 text-right num text-black/70">{s.found ?? 0}</td>
                      <td className="py-1.5 text-right num text-black/70">{s.repaired ?? 0}</td>
                      <td className={`py-1.5 text-right num font-semibold ${p > 0 ? 'text-[#B3392C]' : 'text-black/30'}`}>{p}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </details>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#0B6E76] mb-2">Do — ดำเนินการแล้ว</p>
          {area.pdcaDo.length ? (
            <div className="space-y-2">
              {area.pdcaDo.map((it, i) => (
                <div key={i} className="flex gap-2 text-[12.5px]">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-black/5 border border-black/10 text-[9px] font-bold flex items-center justify-center text-black/40 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-[#12181F]">{it.title || '(ไม่มีชื่อหัวข้อ)'}</p>
                    {it.detail && <p className="text-black/45 text-[11.5px]">{it.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-black/30">— ไม่มีข้อมูล —</p>}
        </div>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#1E7A5A] mb-2">Act — แผนถัดไป</p>
          {area.pdcaAct.length ? (
            <div className="space-y-2">
              {area.pdcaAct.map((it, i) => (
                <div key={i} className="flex gap-2 text-[12.5px]">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-black/5 border border-black/10 text-[9px] font-bold flex items-center justify-center text-black/40 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-[#12181F]">{it.title || '(ไม่มีชื่อหัวข้อ)'}</p>
                    {it.detail && <p className="text-black/45 text-[11.5px]">{it.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-black/30">— ไม่มีข้อมูล —</p>}
        </div>
      </div>

      {area.hasObstacle && area.obstacle && (
        <div className="mt-4 rounded-xl border border-black/8 bg-black/2 p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
              area.obstacle.priority === 'สูง' ? 'bg-red-500/10 text-red-700' : 'bg-amber-500/10 text-amber-700'
            }`}>
              {area.obstacle.priority === 'สูง' ? '🔴 สูง' : '🟡 กลาง'}
            </span>
            <span className="text-[12.5px] font-bold text-[#12181F]">
              {area.obstacle.type === 'อื่น' && area.obstacle.other ? area.obstacle.other : area.obstacle.type || 'ไม่ระบุประเภท'}
            </span>
          </div>
          {area.obstacle.detail && (
            <div className="mb-2">
              <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#B3392C] flex items-center gap-1 mb-0.5">
                <AlertTriangle size={11} /> รายละเอียดอุปสรรค
              </p>
              <p className="text-[12.5px] text-black/60">{area.obstacle.detail}</p>
            </div>
          )}
          {area.obstacle.plan && (
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#1E7A5A] flex items-center gap-1 mb-0.5">
                <CheckCircle2 size={11} /> แนวทางการแก้ไข
              </p>
              <p className="text-[12.5px] text-black/60">{area.obstacle.plan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PdcaImportDashboard({ data, branches }: Props) {
  const agg = computeAgg(data)
  const adYear = resolveAdYear(data.meta.year)
  const matchedBranch = matchBranch(branches, data.meta.branch)

  const nrwDelta = agg.pctB !== null && agg.pctA !== null ? agg.pctB - agg.pctA : null
  const mnfDelta = agg.mnfB !== null && agg.mnfA !== null ? agg.mnfB - agg.mnfA : null
  const pending = Math.max(0, agg.found - agg.repaired)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#12181F]">
            {matchedBranch?.name_th ?? (data.meta.branch || 'ไม่ระบุสาขา')}
          </h1>
          <p className="text-sm text-black/40 mt-0.5">
            {data.meta.month ? getThaiMonthName(data.meta.month) : '—'} {toThaiYear(adYear)} · {data.areas.length} พื้นที่
          </p>
        </div>
        {data.meta.branch && !matchedBranch && (
          <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-700 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-1.5">
            <AlertTriangle size={13} />
            ไม่พบสาขา &quot;{data.meta.branch}&quot; ในระบบ — เลือกด้วยตนเองตอนนำเข้าไปฟอร์ม
          </span>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="จำนวนพื้นที่" value={data.areas.length} unit="พื้นที่" accentColor="blue" />
        <KpiCard label="NRW เฉลี่ยก่อน" value={agg.pctB !== null ? fmt(agg.pctB, 1) : '—'} unit="%" accentColor="sky" />
        <KpiCard label="NRW เฉลี่ยหลัง" value={agg.pctA !== null ? fmt(agg.pctA, 1) : '—'} unit="%" accentColor="teal" delta={nrwDelta} />
        <KpiCard label="MNF เฉลี่ยหลัง" value={agg.mnfA !== null ? fmt(agg.mnfA, 2) : '—'} unit="ลบ.ม./ชม." accentColor="cyan" delta={mnfDelta} />
        <KpiCard label="น้ำสูญเสียลดลง" value={fmt(agg.lossB - agg.lossA, 0)} unit="ลบ.ม." accentColor="purple" />
        <KpiCard
          label="จุดรั่วค้างซ่อม"
          value={pending}
          sub={`จาก ${agg.found} จุด`}
          accentColor={pending > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricChart areas={data.areas} metric="nrw" title="อัตราน้ำสูญเสีย (NRW%) ก่อน–หลัง รายพื้นที่" />
        <MetricChart areas={data.areas} metric="mnf" title="MNF ก่อน–หลัง รายพื้นที่ (ลบ.ม./ชม.)" />
      </div>

      {/* Meter (optional) */}
      {data.meter && <MeterCard meter={data.meter} />}

      {/* Area cards */}
      <div className="space-y-4">
        {data.areas.map((a, i) => <AreaCard key={`${a.name}_${i}`} area={a} />)}
      </div>
    </div>
  )
}
