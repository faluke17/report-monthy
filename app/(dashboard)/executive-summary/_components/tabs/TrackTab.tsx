'use client'

import { useState, useEffect } from 'react'
import type { AreaMonthItem, MonthlyTrackRow, ObstacleRow } from '@/app/actions/executive-summary'
import { getProgressLogs } from '@/app/actions/obstacles'
import type { ObstacleProgressLog } from '@/lib/types'
import { THAI_MONTHS, C, MONO, Bar, Corners, OBS_STATUS, useBreakpoint } from './shared'

const ENTRY_TYPE_LABEL: Record<string, string> = {
  branch_update: 'สาขาอัปเดต',
  region_note: 'บันทึกจากเขต',
  system: 'ระบบ',
}

function ObsHistory({ obstacleId }: { obstacleId: string }) {
  const [logs, setLogs] = useState<ObstacleProgressLog[] | null>(null)

  useEffect(() => {
    let alive = true
    getProgressLogs(obstacleId).then(({ data }) => { if (alive) setLogs(data) })
    return () => { alive = false }
  }, [obstacleId])

  if (logs === null) return (
    <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>// กำลังโหลดประวัติ...</div>
  )
  if (logs.length === 0) return (
    <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO }}>// ยังไม่มีประวัติการอัปเดต</div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {logs.map((log, i) => (
        <div key={log.id} style={{ display: 'flex', gap: 8, position: 'relative', paddingBottom: i === logs.length - 1 ? 0 : 10 }}>
          {/* timeline dot + line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 8, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: log.is_closed ? C.good : C.accent, flexShrink: 0, marginTop: 4 }} />
            {i !== logs.length - 1 && <span style={{ flex: 1, width: 1, background: C.border, marginTop: 2 }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: C.muted, fontFamily: MONO }}>
                {new Date(log.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
              <span style={{ fontSize: 8, padding: '1px 6px', border: `1px solid ${C.border}`, color: C.dim, fontFamily: MONO }}>
                {ENTRY_TYPE_LABEL[log.entry_type] ?? log.entry_type}
              </span>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>โดย {log.created_by}</span>
              {log.progress_pct != null && (
                <span style={{ fontSize: 9, color: C.accent, fontFamily: MONO, fontWeight: 700 }}>{log.progress_pct}%</span>
              )}
              {log.is_closed && (
                <span style={{ fontSize: 9, color: C.good, fontFamily: MONO, fontWeight: 700 }}>✓ ปิดประเด็น</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.text, lineHeight: 1.6 }}>{log.message}</div>
          </div>
        </div>
      ))}
    </div>
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

                {/* สาเหตุ / รายละเอียดปัญหา */}
                {obs.data_quality_impact && (
                  <div>
                    <div style={{ fontSize: 9, color: C.warn, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>สาเหตุ / รายละเอียดปัญหา</div>
                    <div style={{ fontSize: 11, color: C.text, lineHeight: 1.65, padding: '7px 10px', background: C.row, borderLeft: `2px solid ${C.warn}` }}>{obs.data_quality_impact}</div>
                  </div>
                )}

                {/* ผลกระทบ */}
                {obs.area && (
                  <div>
                    <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, marginBottom: 4 }}>ผลกระทบที่ได้รับ</div>
                    <div style={{ fontSize: 11, color: C.text, lineHeight: 1.65, padding: '7px 10px', background: C.row, borderLeft: `2px solid ${C.dim}` }}>{obs.area}</div>
                  </div>
                )}

                {/* แนวทางแก้ไข */}
                {obs.resolution_plan && (
                  <div>
                    <div style={{ fontSize: 9, color: C.accent, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>แนวทางแก้ไข (ถึงไหนแล้ว)</div>
                    <div style={{ fontSize: 11, color: C.text, lineHeight: 1.65, padding: '7px 10px', background: C.row, borderLeft: `2px solid ${C.accent}` }}>{obs.resolution_plan}</div>
                  </div>
                )}

                {/* ต้องการความช่วยเหลือจากเขต */}
                {obs.region_support_needed && (
                  <div>
                    <div style={{ fontSize: 9, color: C.crit, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>ต้องการความช่วยเหลือจากเขต</div>
                    <div style={{ fontSize: 11, color: C.text, lineHeight: 1.65, padding: '7px 10px', background: C.row, borderLeft: `2px solid ${C.crit}` }}>{obs.region_support_needed}</div>
                  </div>
                )}

                {/* ประวัติการอัปเดต */}
                <div>
                  <div style={{ fontSize: 9, color: C.dim, fontFamily: MONO, letterSpacing: 1, marginBottom: 6 }}>ประวัติการอัปเดต</div>
                  <ObsHistory obstacleId={obs.id} />
                </div>

              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function TrackTab({ monthlyTrack, obstacles }: { monthlyTrack: MonthlyTrackRow[]; obstacles: ObstacleRow[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()
  const selected = monthlyTrack.find(
    r => `${r.gregorian_year}-${String(r.month).padStart(2, '0')}` === selectedKey
  ) ?? null

  const color = (pct: number | null) => pct == null ? C.muted : pct <= 20 ? C.good : pct <= 25 ? C.warn : C.crit

  return (
    <div style={isMobile
      ? { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }
      : { display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', overflow: 'hidden' }
    }>

      {/* ── ซ้าย: รายงานรายเดือน ── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        borderRight: isMobile ? 'none' : `1px solid ${C.border}`,
        borderBottom: isMobile ? `1px solid ${C.border}` : 'none',
        overflow: isMobile ? 'visible' : 'hidden',
        flexShrink: 0,
      }}>
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
        <div style={{ flex: isMobile ? undefined : 1, overflowY: isMobile ? 'visible' : 'auto', padding: selected ? '14px 16px' : 0 }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : '1fr 1fr 1fr 1fr 1fr', gap: 5 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', overflow: isMobile ? 'visible' : 'hidden', flexShrink: 0 }}>
        <div style={{ flexShrink: 0, padding: '9px 14px', borderBottom: `1px solid ${C.border}`, background: 'rgba(34,211,238,0.04)' }}>
          <span style={{ fontSize: 9, color: C.accent, fontFamily: MONO, letterSpacing: 1.5, fontWeight: 700 }}>
            // อุปสรรค{obstacles.length > 0 ? ` (${obstacles.length})` : ''}
          </span>
        </div>
        <div style={{ flex: isMobile ? undefined : 1, overflowY: isMobile ? 'visible' : 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column' }}>
          <ObsPanel obstacles={obstacles} />
        </div>
      </div>

    </div>
  )
}
