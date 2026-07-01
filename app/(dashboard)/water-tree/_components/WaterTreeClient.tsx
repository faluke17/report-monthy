'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateWaterNode, createWaterNode, deactivateWaterNode } from '@/app/actions/water-nodes'
import type { Branch, WaterNode } from '@/lib/types'

const MONO = "'IBM Plex Mono', monospace"

const C = {
  bg:     '#04070F',
  panel:  'rgba(8,14,26,0.85)',
  border: 'rgba(34,211,238,0.14)',
  cyan:   '#22D3EE',
  good:   '#10D9B0',
  warn:   '#F59E0B',
  crit:   '#EF4444',
  purple: '#A78BFA',
  text:   '#CBD5E1',
  bright: '#E2E8F0',
  muted:  '#64748B',
  dim:    '#334155',
}

const TYPE_COLOR: Record<string, string> = {
  MM: C.cyan, DMA: C.good, SUB: C.purple, VD: C.warn,
}
const STATUS_COLOR: Record<string, string> = {
  'จ่าย': C.good, 'ส่ง': C.warn, 'รอปรับโซน': C.crit,
}
const STATUSES: WaterNode['status'][] = ['จ่าย', 'ส่ง', 'รอปรับโซน']

const PROVINCE_GROUPS = [
  { province: 'นครสวรรค์', codes: ['NKS','TTK','LYW','PYK'], color: '#22D3EE' },
  { province: 'ชัยนาท',    codes: ['CNT'],                   color: '#10D9B0' },
  { province: 'อุทัยธานี', codes: ['UTN'],                   color: '#A78BFA' },
  { province: 'กำแพงเพชร', codes: ['KPP','KNU'],             color: '#38BDF8' },
  { province: 'ตาก',       codes: ['TAK','MSO'],             color: '#F59E0B' },
  { province: 'สุโขทัย',   codes: ['SKT','TSL','SRR','SWK','SSN'], color: '#34D399' },
  { province: 'อุตรดิตถ์', codes: ['UTT'],                   color: '#FB923C' },
  { province: 'พิษณุโลก',  codes: ['PKM','NKT'],             color: '#60A5FA' },
  { province: 'พิจิตร',    codes: ['PCT','BML','TPH'],       color: '#F472B6' },
  { province: 'เพชรบูรณ์', codes: ['PBC','LOM','CHN','NNP','VCB'], color: '#FACC15' },
]

// ── Corner decorations ────────────────────────────────────────────────────────
function Corners({ color = C.cyan + '55', size = 6 }: { color?: string; size?: number }) {
  const s: React.CSSProperties = { position: 'absolute', width: size, height: size, borderColor: color }
  return (
    <>
      <span style={{ ...s, top: -1, left: -1,  borderTop: '1px solid', borderLeft:  '1px solid' }} />
      <span style={{ ...s, top: -1, right: -1, borderTop: '1px solid', borderRight: '1px solid' }} />
      <span style={{ ...s, bottom: -1, left: -1,  borderBottom: '1px solid', borderLeft:  '1px solid' }} />
      <span style={{ ...s, bottom: -1, right: -1, borderBottom: '1px solid', borderRight: '1px solid' }} />
    </>
  )
}

// ── Form primitives ───────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={{ fontSize: 10, color: C.muted, fontFamily: MONO, letterSpacing: 1 }}>{label}</label>
        {hint && <span style={{ fontSize: 9, color: C.dim }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', boxSizing: 'border-box',
  background: 'rgba(4,7,14,0.9)', border: `1px solid ${C.border}`,
  color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit',
}
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer', appearance: 'none' }

// ── Base Modal ────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void
  children: React.ReactNode; footer: React.ReactNode
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 500, maxHeight: '90vh', overflow: 'auto', background: '#060B18', border: `1px solid rgba(34,211,238,0.3)`, position: 'relative', padding: 24 }}>
        <Corners color="rgba(34,211,238,0.5)" size={8} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: C.cyan, fontFamily: MONO, letterSpacing: 1.5, fontWeight: 700 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 10, color: C.dim, fontFamily: MONO, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
          {children}
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {footer}
        </div>
      </div>
    </div>
  )
}

function Btn({ children, onClick, color = C.cyan, disabled, danger }: {
  children: React.ReactNode; onClick?: () => void
  color?: string; disabled?: boolean; danger?: boolean
}) {
  const c = danger ? C.crit : color
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 18px', fontSize: 11, fontFamily: MONO, cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? 'rgba(4,7,14,0.5)' : `${c}14`,
        border: `1px solid ${disabled ? C.dim : c + '55'}`,
        color: disabled ? C.dim : c, letterSpacing: 1, transition: 'all .12s',
        opacity: disabled ? 0.6 : 1,
      }}
    >{children}</button>
  )
}

// ── Edit Node Modal ───────────────────────────────────────────────────────────
function EditNodeModal({ node, onClose, onSaved }: {
  node: WaterNode
  onClose: () => void
  onSaved: (updated: Partial<WaterNode>) => void
}) {
  const [form, setForm] = useState({
    name_th:          node.name_th ?? '',
    logger_id:        node.logger_id ?? '',
    dmama_area_label: node.dmama_area_label ?? '',
    self_supply:      node.self_supply ?? false,
    status:           node.status ?? 'จ่าย',
    user_count:       node.user_count !== null ? String(node.user_count) : '',
  })
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  function handleSave() {
    start(async () => {
      setErr('')
      const res = await updateWaterNode(node.id, {
        name_th:          form.name_th.trim() || null,
        logger_id:        form.logger_id.trim() || null,
        dmama_area_label: form.dmama_area_label.trim() || null,
        self_supply:      form.self_supply,
        status:           form.status as WaterNode['status'],
        user_count:       form.user_count !== '' ? Number(form.user_count) : null,
      })
      if (res.error) { setErr(res.error); return }
      onSaved({
        name_th:          form.name_th.trim() || null,
        logger_id:        form.logger_id.trim() || null,
        dmama_area_label: form.dmama_area_label.trim() || null,
        self_supply:      form.self_supply,
        status:           form.status as WaterNode['status'],
        user_count:       form.user_count !== '' ? Number(form.user_count) : null,
      })
      onClose()
    })
  }

  return (
    <Modal
      title="// EDIT NODE"
      subtitle={`${node.node_type} · ${node.code}`}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} color={C.muted}>ยกเลิก</Btn>
          <Btn onClick={handleSave} disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</Btn>
        </>
      }
    >
      <Field label="ชื่อ Node">
        <input style={inputStyle} value={form.name_th} onChange={e => set('name_th', e.target.value)} placeholder="เช่น โซนตัวเมือง" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Logger ID" hint="_usage = ค่าน้ำจ่าย">
          <input style={inputStyle} value={form.logger_id} onChange={e => set('logger_id', e.target.value)} placeholder="เช่น logger_2303_usage" />
        </Field>
        <Field label="DMAMA Area Label" hint="nrw_area_stats">
          <input style={inputStyle} value={form.dmama_area_label} onChange={e => set('dmama_area_label', e.target.value)} placeholder="เช่น DMA01-SKT" />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="สถานะ">
          <select style={selectStyle} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s!}>{s}</option>)}
          </select>
        </Field>
        <Field label="จำนวนผู้ใช้น้ำ (ราย)">
          <input style={inputStyle} type="number" min={0} value={form.user_count} onChange={e => set('user_count', e.target.value)} placeholder="0" />
        </Field>
      </div>

      {/* self_supply เฉพาะ MM */}
      {node.node_type === 'MM' && (
        <div style={{ padding: '12px 14px', border: `1px solid ${C.border}`, background: 'rgba(34,211,238,0.03)', marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.self_supply}
              onChange={e => set('self_supply', e.target.checked)}
              style={{ marginTop: 2, accentColor: C.cyan, cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: 11, color: form.self_supply ? C.cyan : C.text, fontWeight: 600 }}>MM จ่ายน้ำให้ลูกค้าในโซนตัวเองด้วย</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>
                {form.self_supply
                  ? '→ NRW(MM) = outbound(MM) − Σ outbound(DMA ลูก) − จำหน่าย(ลูกค้าตรง)'
                  : '→ MM เป็นแค่จุดกระจาย คำนวณ NRW เฉพาะ DMA ลูก'}
              </div>
            </div>
          </label>
        </div>
      )}

      {err && <div style={{ fontSize: 11, color: C.crit, fontFamily: MONO, marginBottom: 8 }}>⚠ {err}</div>}
    </Modal>
  )
}

// ── Add Node Modal ────────────────────────────────────────────────────────────
function AddNodeModal({ branchId, parentNode, allNodes, onClose, onAdded }: {
  branchId: string
  parentNode: WaterNode | null  // null = สร้าง MM root
  allNodes: WaterNode[]
  onClose: () => void
  onAdded: (node: WaterNode) => void
}) {
  // ประเภทที่สร้างได้ตาม parent
  const validTypes: WaterNode['node_type'][] = parentNode === null
    ? ['MM']
    : parentNode.node_type === 'MM'
      ? ['DMA', 'SUB', 'VD']
      : ['SUB', 'VD']

  const [form, setForm] = useState({
    node_type:        validTypes[0],
    code:             '',
    name_th:          '',
    parent_id:        parentNode?.id ?? '',
    status:           'จ่าย' as WaterNode['status'],
    user_count:       '',
    logger_id:        '',
    dmama_area_label: '',
    self_supply:      false,
  })
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  // เมื่อเปลี่ยน parent_id ให้เลือก parent ใหม่
  const mmNodes = allNodes.filter(n => n.node_type === 'MM')
  const dmaNodes = allNodes.filter(n => n.node_type === 'DMA')

  function handleSave() {
    if (!form.code.trim()) { setErr('กรุณากรอกรหัส Node'); return }
    if (!form.name_th.trim()) { setErr('กรุณากรอกชื่อ Node'); return }
    start(async () => {
      setErr('')
      const res = await createWaterNode({
        branch_id:        branchId,
        node_type:        form.node_type,
        code:             form.code,
        name_th:          form.name_th,
        parent_id:        form.parent_id || null,
        status:           form.status,
        user_count:       form.user_count !== '' ? Number(form.user_count) : null,
        logger_id:        form.logger_id || null,
        dmama_area_label: form.dmama_area_label || null,
        self_supply:      form.self_supply,
      })
      if (res.error) { setErr(res.error); return }
      if (res.data) onAdded(res.data)
      onClose()
    })
  }

  const subtitle = parentNode
    ? `เพิ่ม Node ลูกใต้ ${parentNode.node_type} · ${parentNode.code}`
    : 'เพิ่ม MM (แม่ข่าย) ใหม่'

  return (
    <Modal
      title="// ADD NODE"
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose} color={C.muted}>ยกเลิก</Btn>
          <Btn onClick={handleSave} disabled={pending}>{pending ? 'กำลังสร้าง…' : 'สร้าง Node'}</Btn>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="ประเภท Node">
          <select style={selectStyle} value={form.node_type} onChange={e => set('node_type', e.target.value as WaterNode['node_type'])}>
            {validTypes.map(t => <option key={t} value={t}>{t} — {t === 'MM' ? 'แม่ข่าย' : t === 'DMA' ? 'โซนวัดน้ำ' : t === 'SUB' ? 'โซนย่อย' : 'Virtual DMA'}</option>)}
          </select>
        </Field>
        <Field label="รหัส Node" hint="จะถูก UPPER CASE">
          <input style={inputStyle} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="เช่น DMA-07" maxLength={20} />
        </Field>
      </div>

      <Field label="ชื่อ Node">
        <input style={inputStyle} value={form.name_th} onChange={e => set('name_th', e.target.value)} placeholder="เช่น โซนในเมือง 2" />
      </Field>

      {/* Parent selector — แสดงเมื่อสร้าง DMA/SUB/VD โดยไม่ได้กด + จาก card */}
      {!parentNode && form.node_type !== 'MM' && (
        <Field label="Node แม่ (Parent)">
          <select
            style={selectStyle}
            value={form.parent_id}
            onChange={e => set('parent_id', e.target.value)}
          >
            <option value="">— ไม่มี Parent —</option>
            {(form.node_type === 'DMA' ? mmNodes : [...mmNodes, ...dmaNodes]).map(n => (
              <option key={n.id} value={n.id}>{n.node_type} · {n.code} {n.name_th ? `(${n.name_th})` : ''}</option>
            ))}
          </select>
        </Field>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Logger ID" hint="_usage = ค่าน้ำจ่าย">
          <input style={inputStyle} value={form.logger_id} onChange={e => set('logger_id', e.target.value)} placeholder="เช่น logger_2303_usage" />
        </Field>
        <Field label="DMAMA Area Label">
          <input style={inputStyle} value={form.dmama_area_label} onChange={e => set('dmama_area_label', e.target.value)} placeholder="เช่น DMA07-SKT" />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="สถานะ">
          <select style={selectStyle} value={form.status ?? ''} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s!}>{s}</option>)}
          </select>
        </Field>
        <Field label="จำนวนผู้ใช้น้ำ (ราย)">
          <input style={inputStyle} type="number" min={0} value={form.user_count} onChange={e => set('user_count', e.target.value)} placeholder="0" />
        </Field>
      </div>

      {form.node_type === 'MM' && (
        <div style={{ padding: '10px 14px', border: `1px solid ${C.border}`, background: 'rgba(34,211,238,0.03)', marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.self_supply} onChange={e => set('self_supply', e.target.checked)} style={{ marginTop: 2, accentColor: C.cyan }} />
            <div>
              <div style={{ fontSize: 11, color: form.self_supply ? C.cyan : C.text }}>MM จ่ายน้ำให้ลูกค้าในโซนตัวเองด้วย</div>
              <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>ส่งผลต่อสูตรคำนวณ NRW ของ MM node นี้</div>
            </div>
          </label>
        </div>
      )}

      {err && <div style={{ fontSize: 11, color: C.crit, fontFamily: MONO, marginBottom: 4 }}>⚠ {err}</div>}
    </Modal>
  )
}

// ── Node Card ─────────────────────────────────────────────────────────────────
function NodeCard({
  node,
  onEdit,
  onAddChild,
}: {
  node: WaterNode
  onEdit: (n: WaterNode) => void
  onAddChild: (parent: WaterNode) => void
}) {
  const tc   = TYPE_COLOR[node.node_type] ?? C.muted
  const sc   = STATUS_COLOR[node.status ?? ''] ?? C.muted
  const isMM = node.node_type === 'MM'
  const canHaveChild = node.node_type === 'MM' || node.node_type === 'DMA'

  return (
    <div
      style={{
        width: 170, padding: '9px 11px', position: 'relative',
        background: isMM ? 'rgba(8,16,32,0.95)' : 'rgba(6,10,20,0.82)',
        border: `1px solid ${isMM ? 'rgba(34,211,238,0.22)' : C.border}`,
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = `${tc}66`
        el.style.boxShadow   = `0 8px 24px ${tc}18, 0 0 0 1px ${tc}11`
        el.style.transform   = 'translateY(-2px)'
        // show action buttons
        ;(el.querySelector('.card-actions') as HTMLElement | null)?.style.setProperty('opacity', '1')
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = isMM ? 'rgba(34,211,238,0.22)' : C.border
        el.style.boxShadow   = 'none'
        el.style.transform   = 'none'
        ;(el.querySelector('.card-actions') as HTMLElement | null)?.style.setProperty('opacity', '0')
      }}
    >
      <Corners color={`${tc}44`} size={5} />

      {/* Action buttons — show on hover */}
      <div
        className="card-actions"
        style={{ position: 'absolute', top: 4, right: 5, display: 'flex', gap: 3, opacity: 0, transition: 'opacity .15s', zIndex: 2 }}
      >
        {canHaveChild && (
          <button
            onClick={e => { e.stopPropagation(); onAddChild(node) }}
            title="เพิ่ม Node ลูก"
            style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.good}22`, border: `1px solid ${C.good}44`, color: C.good, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
          >+</button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onEdit(node) }}
          title="แก้ไข Node"
          style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${tc}18`, border: `1px solid ${tc}44`, color: tc, cursor: 'pointer', fontSize: 11 }}
        >✎</button>
      </div>

      {/* Type + code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.5px', fontFamily: MONO, padding: '2px 7px', border: `1px solid ${tc}55`, background: `${tc}0D`, color: tc }}>{node.node_type}</span>
        <span style={{ fontSize: 9, color: C.dim, fontFamily: MONO }}>{node.code}</span>
      </div>

      {/* Name */}
      <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.4, marginBottom: 7, wordBreak: 'break-word', fontWeight: 500 }}>
        {node.name_th || <span style={{ color: C.dim }}>ไม่มีชื่อ</span>}
      </div>

      {/* Logger ID (if set) */}
      {node.logger_id && (
        <div
          title={`Logger: ${node.logger_id}\n_usage = ค่าน้ำจ่าย (outbound)`}
          style={{ fontSize: 9, fontFamily: MONO, color: C.purple, background: `${C.purple}0D`, border: `1px solid ${C.purple}22`, padding: '2px 6px', marginBottom: 5, display: 'inline-block', cursor: 'help' }}
        >
          ⚡ {node.logger_id.replace('logger_', '').replace('_usage', '')}
          <span style={{ color: `${C.purple}66`, fontSize: 8 }}> /usage</span>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, color: node.user_count ? C.cyan : C.dim }}>
          {node.user_count != null ? node.user_count.toLocaleString('th-TH') : '—'}
          <span style={{ fontSize: 8, color: C.dim, marginLeft: 3 }}>ราย</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, boxShadow: `0 0 4px ${sc}`, display: 'inline-block' }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: sc }}>
            {node.status === 'รอปรับโซน' ? 'รอโซน' : node.status}
          </span>
        </span>
      </div>

      {/* self_supply badge for MM */}
      {node.node_type === 'MM' && node.self_supply && (
        <div style={{ marginTop: 4, fontSize: 8, fontFamily: MONO, color: C.warn, background: `${C.warn}11`, border: `1px solid ${C.warn}33`, padding: '1px 5px', display: 'inline-block' }}>
          SELF SUPPLY
        </div>
      )}
    </div>
  )
}

// ── Tree renderer ─────────────────────────────────────────────────────────────
function TreeNode({
  node, childMap, onEdit, onAddChild,
}: {
  node: WaterNode
  childMap: Map<string, WaterNode[]>
  onEdit: (n: WaterNode) => void
  onAddChild: (parent: WaterNode) => void
}) {
  const children = childMap.get(node.id) ?? []
  const LINE = 'rgba(34,211,238,0.15)'

  return (
    <li style={{ position: 'relative', padding: '0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', listStyle: 'none' }}>
      <NodeCard node={node} onEdit={onEdit} onAddChild={onAddChild} />
      {children.length > 0 && (
        <ul style={{ display: 'flex', padding: 0, margin: 0, paddingTop: 24, position: 'relative', listStyle: 'none' }}>
          {children.map((child, i) => {
            const grandchildren = childMap.get(child.id) ?? []
            return (
              <li key={child.id} style={{ position: 'relative', padding: '0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', listStyle: 'none' }}>
                {/* vertical + horizontal connectors */}
                <span style={{ position: 'absolute', top: -24, left: '50%', width: 1, height: 24, background: LINE, display: 'block' }} />
                {children.length > 1 && (
                  <span style={{
                    position: 'absolute', top: -24, height: 1, background: LINE,
                    left: i === 0 ? '50%' : 0,
                    right: i === children.length - 1 ? '50%' : 0,
                  }} />
                )}
                <NodeCard node={child} onEdit={onEdit} onAddChild={onAddChild} />
                {grandchildren.length > 0 && (
                  <ul style={{ display: 'flex', padding: 0, margin: 0, paddingTop: 24, position: 'relative', listStyle: 'none' }}>
                    {grandchildren.map((gc, gi, arr) => (
                      <li key={gc.id} style={{ position: 'relative', padding: '0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', listStyle: 'none' }}>
                        <span style={{ position: 'absolute', top: -24, left: '50%', width: 1, height: 24, background: LINE, display: 'block' }} />
                        {arr.length > 1 && (
                          <span style={{
                            position: 'absolute', top: -24, height: 1, background: LINE,
                            left: gi === 0 ? '50%' : 0,
                            right: gi === arr.length - 1 ? '50%' : 0,
                          }} />
                        )}
                        <NodeCard node={gc} onEdit={onEdit} onAddChild={onAddChild} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

// ── Empty ─────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, gap: 16, color: C.dim, fontFamily: MONO }}>
      <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', border: `1px solid rgba(34,211,238,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: `1px solid rgba(34,211,238,0.2)` }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(34,211,238,0.25)', boxShadow: '0 0 12px rgba(34,211,238,0.4)' }} />
      </div>
      <div style={{ fontSize: 10, letterSpacing: 2 }}>// SELECT BRANCH</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
  branches: Branch[]
  nodes: WaterNode[]
  defaultBranchId: string | null
}

export function WaterTreeClient({ branches, nodes: initialNodes, defaultBranchId }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId]   = useState<string | null>(defaultBranchId)
  const [search, setSearch]           = useState('')
  const [localNodes, setLocalNodes]   = useState<WaterNode[]>(initialNodes)

  // Modal state
  const [editingNode, setEditingNode]   = useState<WaterNode | null>(null)
  const [addParent, setAddParent]       = useState<WaterNode | null | 'root'>(null)
  // 'root' = add MM, null = modal closed, WaterNode = add child of that node

  const openAddMm  = () => setAddParent('root')
  const openAddChild = (parent: WaterNode) => setAddParent(parent)
  const closeAdd   = () => setAddParent(null)
  const closeEdit  = () => setEditingNode(null)

  // Index
  const nodesByBranch = useMemo(() => {
    const m = new Map<string, WaterNode[]>()
    for (const n of localNodes) {
      const arr = m.get(n.branch_id) ?? []; arr.push(n); m.set(n.branch_id, arr)
    }
    return m
  }, [localNodes])

  const branchByCode = useMemo(() => {
    const m: Record<string, Branch> = {}
    for (const b of branches) m[b.code] = b
    return m
  }, [branches])

  const selectedBranch = useMemo(() => branches.find(b => b.id === selectedId) ?? null, [branches, selectedId])
  const branchNodes    = useMemo(() => selectedId ? nodesByBranch.get(selectedId) ?? [] : [], [selectedId, nodesByBranch])

  const childMap = useMemo(() => {
    const nodeById = new Map(branchNodes.map(n => [n.id, n]))
    const m = new Map<string, WaterNode[]>()
    for (const n of branchNodes) {
      if (n.parent_id && nodeById.has(n.parent_id)) {
        const arr = m.get(n.parent_id) ?? []; arr.push(n); m.set(n.parent_id, arr)
      }
    }
    return m
  }, [branchNodes])

  const rootNodes = useMemo(() => {
    const nodeById = new Map(branchNodes.map(n => [n.id, n]))
    return branchNodes.filter(n => !n.parent_id || !nodeById.has(n.parent_id))
  }, [branchNodes])

  const stats = useMemo(() => ({
    mm:    branchNodes.filter(n => n.node_type === 'MM').length,
    dma:   branchNodes.filter(n => n.node_type === 'DMA').length,
    sub:   branchNodes.filter(n => n.node_type === 'SUB').length,
    vd:    branchNodes.filter(n => n.node_type === 'VD').length,
    users: branchNodes.reduce((s, n) => s + (n.user_count ?? 0), 0),
    linked: branchNodes.filter(n => n.dmama_area_label).length,
  }), [branchNodes])

  // Handlers
  function handleNodeSaved(id: string, patch: Partial<WaterNode>) {
    setLocalNodes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n))
    router.refresh()
  }
  function handleNodeAdded(node: WaterNode) {
    setLocalNodes(prev => [...prev, node])
    router.refresh()
  }

  const q = search.trim().toLowerCase()

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: [
        'radial-gradient(ellipse at 15% 0%,rgba(34,211,238,0.04) 0%,transparent 45%)',
        'radial-gradient(ellipse at 90% 100%,rgba(59,130,246,0.03) 0%,transparent 50%)',
        '#04070F',
      ].join(', '),
      position: 'relative',
    }}>
      {/* BG grid */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.04) 1px,transparent 1px)',
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse at center,black 30%,transparent 85%)',
      }} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 256, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: 'rgba(4,6,14,0.6)', backdropFilter: 'blur(8px)' }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: 'rgba(34,211,238,0.35)', fontFamily: MONO, letterSpacing: 2, marginBottom: 8 }}>// BRANCH REGISTRY</div>
            <div style={{ position: 'relative' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาสาขา / จังหวัด..."
                style={{ width: '100%', padding: '6px 8px 6px 26px', background: 'rgba(4,7,14,0.8)', border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" style={{ position: 'absolute', left: 8, top: 8 }}>
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px 12px' }}>
            {PROVINCE_GROUPS.map(({ province, codes, color }) => {
              const filtered = codes.map(c => branchByCode[c]).filter(Boolean)
                .filter(b => !q || b.name_th.toLowerCase().includes(q) || b.code.toLowerCase().includes(q) || province.includes(q))
              if (!filtered.length) return null
              return (
                <div key={province} style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', marginBottom: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: 9, color, fontFamily: MONO, letterSpacing: 1.5, whiteSpace: 'nowrap', fontWeight: 600 }}>{province}</span>
                    <div style={{ flex: 1, height: 1, background: `${color}22` }} />
                  </div>
                  {filtered.map(b => {
                    const active = selectedId === b.id
                    const count  = nodesByBranch.get(b.id)?.length ?? 0
                    return (
                      <button
                        key={b.id} onClick={() => setSelectedId(b.id)}
                        style={{
                          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          padding: '7px 10px', fontSize: 12, cursor: 'pointer', marginBottom: 2,
                          background: active ? `${color}12` : 'transparent',
                          border: `1px solid ${active ? `${color}55` : 'transparent'}`,
                          color: active ? color : C.muted,
                          fontFamily: 'inherit', fontWeight: active ? 700 : 400,
                          transition: 'all .12s', boxShadow: active ? `inset 0 0 0 1px ${color}11` : 'none',
                        }}
                        onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLButtonElement; el.style.background = `${color}09`; el.style.color = `${color}CC` } }}
                        onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = C.muted } }}
                      >
                        <span>{b.name_th}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{ fontFamily: MONO, fontSize: 9, color: active ? `${color}99` : C.dim }}>{b.code}</span>
                          <span style={{ fontSize: 10, fontFamily: MONO, padding: '1px 6px', border: `1px solid ${active ? `${color}44` : C.border}`, color: active ? `${color}AA` : C.dim, background: active ? `${color}0D` : 'rgba(4,7,14,0.5)' }}>{count}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div style={{ padding: '5px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 8, color: C.dim, fontFamily: MONO }}>HOVER CARD → EDIT / +</span>
            <span style={{ fontSize: 8, color: C.good, fontFamily: MONO }}>● LIVE</span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Topbar */}
          <div style={{ flexShrink: 0, padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', background: 'rgba(4,6,14,0.5)', backdropFilter: 'blur(8px)' }}>
            <div>
              <div style={{ fontSize: 17, color: C.bright, fontWeight: 600, marginBottom: 2 }}>
                {selectedBranch ? `สาขา${selectedBranch.name_th}` : 'เลือกสาขา'}
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: MONO }}>
                {selectedBranch
                  ? `${selectedBranch.province_th} · ${selectedBranch.code} · ${branchNodes.length} nodes · ${stats.linked} linked`
                  : 'ผังโครงสร้างการจ่ายน้ำรายสาขา'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedBranch && [
                { label: 'MM',  val: stats.mm,   color: C.cyan },
                { label: 'DMA', val: stats.dma,  color: C.good },
                { label: 'SUB', val: stats.sub,  color: C.purple },
                { label: 'VD',  val: stats.vd,   color: C.warn },
              ].filter(p => p.val > 0).map(({ label, val, color }) => (
                <div key={label} style={{ fontSize: 10, padding: '5px 11px', border: `1px solid ${C.border}`, background: 'rgba(4,7,14,0.6)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                  <span style={{ color: C.muted, fontSize: 9 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.bright }}>{val}</span>
                </div>
              ))}
              {selectedBranch && (
                <button
                  onClick={openAddMm}
                  style={{ padding: '7px 14px', fontSize: 10, fontFamily: MONO, cursor: 'pointer', background: `${C.cyan}14`, border: `1px solid ${C.cyan}44`, color: C.cyan, letterSpacing: .5, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>+</span> เพิ่ม MM Node
                </button>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ flexShrink: 0, display: 'flex', gap: 14, flexWrap: 'wrap', padding: '7px 20px', fontSize: 11, color: C.muted, borderBottom: `1px solid ${C.border}`, background: 'rgba(4,6,14,0.4)', alignItems: 'center' }}>
            {[{ label: 'MM · แม่ข่าย', c: C.cyan }, { label: 'DMA · โซนวัดน้ำ', c: C.good }, { label: 'SUB · โซนย่อย', c: C.purple }, { label: 'VD · Virtual', c: C.warn }].map(({ label, c }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 11, height: 11, border: `1px solid ${c}55`, background: `${c}0D`, display: 'inline-block' }} />
                {label}
              </span>
            ))}
            <span style={{ width: 1, background: C.border, alignSelf: 'stretch', margin: '0 4px' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.purple, display: 'inline-block' }} />
              <span style={{ fontSize: 9, fontFamily: MONO }}>⚡ = Logger ID ผูกแล้ว</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: C.warn, fontFamily: MONO }}>SELF SUPPLY = MM จ่ายตัวเอง</span>
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 9, color: C.dim, fontFamily: MONO }}>hover card → ✎ แก้ไข · + เพิ่มลูก</span>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '28px 24px 48px' }}>
            {!selectedBranch
              ? <EmptyState />
              : rootNodes.length === 0
                ? <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontFamily: MONO, fontSize: 12 }}>// ไม่มีข้อมูล Node — กด "+ เพิ่ม MM Node"</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {rootNodes.map(root => (
                      <ul key={root.id} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex' }}>
                        <TreeNode node={root} childMap={childMap} onEdit={setEditingNode} onAddChild={openAddChild} />
                      </ul>
                    ))}
                  </div>
                )
            }
          </div>
        </main>
      </div>

      {/* ── Edit Modal ── */}
      {editingNode && (
        <EditNodeModal
          node={editingNode}
          onClose={closeEdit}
          onSaved={patch => handleNodeSaved(editingNode.id, patch)}
        />
      )}

      {/* ── Add Modal ── */}
      {addParent !== null && selectedBranch && (
        <AddNodeModal
          branchId={selectedBranch.id}
          parentNode={addParent === 'root' ? null : addParent}
          allNodes={branchNodes}
          onClose={closeAdd}
          onAdded={handleNodeAdded}
        />
      )}
    </div>
  )
}
