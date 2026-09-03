'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Smartphone, X, Router, RadioTower, Gauge, CircleSlash } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Branch, SimInventoryFormData, SimInventoryItem } from '@/lib/types'
import { createSim, updateSim, deleteSim } from '@/app/actions/sim-inventory'

// ── special (non-branch) group labels ที่มาจากไฟล์ต้นฉบับ ─────────────────────
const UNASSIGNED_LABEL = '-'
const REGION_LABEL = 'งานน้ำสูญเสีย กรจ.10'
const NETWORK_OPTIONS = ['AIS', 'TRUE', 'DTAC']

const NETWORK_COLOR: Record<string, string> = {
  AIS:  '#0B6E76',
  TRUE: '#B3392C',
  DTAC: '#6B4FA0',
}
function networkStyle(net: string | null) {
  const c = (net && NETWORK_COLOR[net.toUpperCase()]) || '#4B5563'
  return { background: `${c}14`, borderColor: `${c}40`, color: c }
}

// ── ประเภทอุปกรณ์: อ่านจาก prefix ของ "จุดติดตั้ง" ให้ตรงกับหมวดที่ใช้ทั้งระบบ (MM/DMA/P3/อื่นๆ) ──
type DeviceCategory = 'MM' | 'DMA' | 'P3' | 'อื่นๆ' | 'ไม่ได้ใช้งาน'
const CATEGORY_ORDER: DeviceCategory[] = ['MM', 'DMA', 'P3', 'อื่นๆ', 'ไม่ได้ใช้งาน']
const CATEGORY_META: Record<DeviceCategory, { label: string; color: string; Icon: typeof Router }> = {
  MM:            { label: 'MM (แม่ข่าย)', color: '#0B6E76', Icon: Router },
  DMA:           { label: 'DMA',          color: '#0B6E76', Icon: RadioTower },
  P3:            { label: 'P3',           color: '#6B4FA0', Icon: Gauge },
  'อื่นๆ':        { label: 'อื่นๆ',        color: '#4B5563', Icon: Smartphone },
  'ไม่ได้ใช้งาน': { label: 'ไม่ได้ใช้งาน', color: '#A8721A', Icon: CircleSlash },
}
function deviceCategory(devicePoint: string): DeviceCategory {
  const p = devicePoint.trim()
  if (p === 'ไม่ได้ใช้งาน') return 'ไม่ได้ใช้งาน'
  if (/^MM/i.test(p)) return 'MM'
  if (/^DMA/i.test(p)) return 'DMA'
  if (/^P3/i.test(p)) return 'P3'
  return 'อื่นๆ'
}

function branchDisplayLabel(item: Pick<SimInventoryItem, 'branch_label' | 'branches'>) {
  return item.branches?.name_th ? `สาขา${item.branches.name_th}` : item.branch_label
}

// ── group key: branch.id ถ้ามี ไม่งั้นใช้ label ดิบ (สำหรับ "-" / งานน้ำสูญเสีย กรจ.10) ──
function groupKeyOf(item: Pick<SimInventoryItem, 'branch_id' | 'branch_label'>) {
  return item.branch_id ?? `label:${item.branch_label}`
}

const emptyForm: SimInventoryFormData = {
  branch_id: null,
  branch_label: '',
  device_point: '',
  phone_number: '',
  serial_no: '',
  network: 'AIS',
  note: '',
}

export function SimInventoryClient({ items, branches }: { items: SimInventoryItem[]; branches: Branch[] }) {
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<DeviceCategory | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SimInventoryFormData>(emptyForm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // ── left panel: branch chips (26 สาขาเรียงตามลำดับจริง + 2 กลุ่มพิเศษถ้ามีข้อมูล) ──
  const branchChips = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((it) => counts.set(groupKeyOf(it), (counts.get(groupKeyOf(it)) ?? 0) + 1))
    const chips = branches.map((b) => ({ key: b.id, label: `สาขา${b.name_th}`, count: counts.get(b.id) ?? 0 }))
    const unassignedKey = `label:${UNASSIGNED_LABEL}`
    const regionKey = `label:${REGION_LABEL}`
    if (counts.has(regionKey)) chips.push({ key: regionKey, label: REGION_LABEL, count: counts.get(regionKey)! })
    if (counts.has(unassignedKey)) chips.push({ key: unassignedKey, label: 'ไม่ระบุสาขา', count: counts.get(unassignedKey)! })
    return chips
  }, [items, branches])

  // ── ขอบเขตตามสาขาที่เลือก (ยังไม่กรอง category/search) — ใช้นับ badge บนชิพหมวด ──
  const branchScoped = useMemo(
    () => (branchFilter ? items.filter((it) => groupKeyOf(it) === branchFilter) : items),
    [items, branchFilter],
  )

  const categoryChips = useMemo(() => {
    const counts = new Map<DeviceCategory, number>()
    branchScoped.forEach((it) => {
      const c = deviceCategory(it.device_point)
      counts.set(c, (counts.get(c) ?? 0) + 1)
    })
    return CATEGORY_ORDER.filter((c) => (counts.get(c) ?? 0) > 0).map((c) => ({ key: c, count: counts.get(c)! }))
  }, [branchScoped])

  // ── filtering (branch + category + search ค้นหา) ───────────────────────────────
  const filtered = useMemo(() => {
    let rows = branchScoped
    if (categoryFilter) rows = rows.filter((it) => deviceCategory(it.device_point) === categoryFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((it) =>
        (it.phone_number ?? '').toLowerCase().includes(q) ||
        (it.serial_no ?? '').toLowerCase().includes(q) ||
        it.device_point.toLowerCase().includes(q) ||
        branchDisplayLabel(it).toLowerCase().includes(q)
      )
    }
    return rows
  }, [branchScoped, categoryFilter, search])

  // ── จัดกลุ่ม: ประเภทอุปกรณ์ → จุดติดตั้ง (แสดงเต็มเสมอ ไม่ต้องกดเปิด ลดการคลิก) ──
  const sections = useMemo(() => {
    const byCategory = new Map<DeviceCategory, SimInventoryItem[]>()
    filtered.forEach((it) => {
      const c = deviceCategory(it.device_point)
      const list = byCategory.get(c) ?? []
      list.push(it)
      byCategory.set(c, list)
    })
    return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => {
      const rows = byCategory.get(category)!
      const byDevice = new Map<string, SimInventoryItem[]>()
      rows.forEach((it) => {
        const list = byDevice.get(it.device_point) ?? []
        list.push(it)
        byDevice.set(it.device_point, list)
      })
      const devices = [...byDevice.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'th'))
        .map(([device, deviceRows]) => ({ device, rows: deviceRows }))
      return { category, count: rows.length, devices }
    })
  }, [filtered])

  // ── modal ────────────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm({
      ...emptyForm,
      branch_id: branchFilter && !branchFilter.startsWith('label:') ? branchFilter : null,
    })
    setModalOpen(true)
  }
  function openEdit(item: SimInventoryItem) {
    setEditingId(item.id)
    setForm({
      branch_id: item.branch_id,
      branch_label: item.branch_label,
      device_point: item.device_point,
      phone_number: item.phone_number ?? '',
      serial_no: item.serial_no ?? '',
      network: item.network ?? '',
      note: item.note ?? '',
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false) }

  // branch select ในฟอร์ม: ใช้ค่าพิเศษ "NONE:<label>" แทนแถวที่ไม่ผูกกับสาขาจริง
  const branchSelectValue = form.branch_id ?? `NONE:${form.branch_label || UNASSIGNED_LABEL}`
  function handleBranchSelect(value: string) {
    if (value.startsWith('NONE:')) {
      setForm((f) => ({ ...f, branch_id: null, branch_label: value.slice(5) }))
    } else {
      const b = branches.find((br) => br.id === value)
      setForm((f) => ({ ...f, branch_id: value, branch_label: b ? `สาขา${b.name_th}` : f.branch_label }))
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingId ? await updateSim(editingId, form) : await createSim(form)
      if (result.success) {
        toast.success(editingId ? 'แก้ไขข้อมูล SIM สำเร็จ' : 'เพิ่ม SIM สำเร็จ')
        setModalOpen(false)
      } else {
        toast.error(result.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSim(id)
      if (result.success) { toast.success('ลบข้อมูล SIM สำเร็จ'); setConfirmDeleteId(null) }
      else { toast.error(result.error ?? 'เกิดข้อผิดพลาด') }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
      {/* ── ซ้าย: รายชื่อสาขา (เรียงนครสวรรค์ → วิเชียรบุรี) ─────────────────────── */}
      <div className="glass-card p-3 space-y-1 h-fit lg:sticky lg:top-4">
        <button
          type="button"
          onClick={() => setBranchFilter(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
            !branchFilter ? 'bg-[#0B6E76]/12 text-[#0B6E76]' : 'text-[#4B5563] hover:bg-black/[.04]'
          }`}
        >
          <span>ทุกสาขา</span>
          <span className="text-[11px] font-bold bg-black/10 px-1.5 rounded-full">{items.length}</span>
        </button>
        <div className="max-h-[60vh] overflow-y-auto space-y-0.5 pr-0.5">
          {branchChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setBranchFilter((cur) => (cur === c.key ? null : c.key))}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                branchFilter === c.key ? 'bg-[#0B6E76]/12 text-[#0B6E76] font-bold' : 'text-[#4B5563] hover:bg-black/[.04]'
              }`}
            >
              <span className="truncate text-left">{c.label}</span>
              <span className="text-[10px] font-bold bg-black/10 px-1.5 rounded-full shrink-0 ml-1.5">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ขวา: ค้นหา + หมวดอุปกรณ์ + ตาราง ────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-[#EFF2F5] space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8896A3]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเบอร์, Serial No., จุดติดตั้ง..."
                className="w-full bg-black/5 border border-black/15 rounded-lg pl-8 pr-3 py-2 text-sm text-[#12181F] placeholder:text-[#8896A3] focus:outline-none focus:border-cyan-500/60"
              />
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-[#FFFFFF] font-semibold px-3.5 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus size={15} /> เพิ่ม SIM
            </button>
          </div>

          {/* หมวดอุปกรณ์: กดกรองได้ทันที ไม่ต้องเปิด/ปิดทีละจุด */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                !categoryFilter
                  ? 'bg-[#0B6E76]/12 border-[#0B6E76]/40 text-[#0B6E76]'
                  : 'bg-black/5 border-black/15 text-[#4B5563] hover:border-black/30'
              }`}
            >
              ทุกประเภท
              <span className="text-[10px] font-bold bg-black/10 px-1.5 rounded-full">{branchScoped.length}</span>
            </button>
            {categoryChips.map(({ key, count }) => {
              const meta = CATEGORY_META[key]
              const active = categoryFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter((cur) => (cur === key ? null : key))}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                  style={active
                    ? { background: `${meta.color}1F`, borderColor: `${meta.color}55`, color: meta.color }
                    : { background: 'rgba(0,0,0,.03)', borderColor: 'rgba(0,0,0,.10)', color: '#4B5563' }
                  }
                >
                  <meta.Icon size={11} />
                  {meta.label}
                  <span className="text-[10px] font-bold bg-black/10 px-1.5 rounded-full">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#8896A3]">ไม่พบข้อมูล SIM ที่ตรงกับเงื่อนไข</div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            {sections.map(({ category, count, devices }) => {
              const meta = CATEGORY_META[category]
              return (
                <div key={category}>
                  {/* ── หัวข้อประเภทอุปกรณ์ (แสดงตลอด ไม่ต้องกด) — พื้นหลังทึบกัน content ที่เลื่อนผ่านทับกับ sticky header ── */}
                  <div
                    className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 border-y shadow-sm"
                    style={{ background: '#FFFFFF', borderColor: `${meta.color}30` }}
                  >
                    <meta.Icon size={13} style={{ color: meta.color }} />
                    <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-[11px] font-bold text-[#8896A3] bg-black/5 px-2 py-0.5 rounded-full">{count} เบอร์</span>
                  </div>

                  {devices.map(({ device, rows }) => (
                    <div key={device} className="border-b border-[#EFF2F5] last:border-b-0">
                      <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
                        <span className="text-xs font-semibold text-[#12181F] truncate">{device}</span>
                        <span className="text-[10px] font-bold text-[#8896A3] bg-black/5 px-1.5 rounded-full">{rows.length}</span>
                      </div>
                      <div className="divide-y divide-[#EFF2F5]">
                        {rows.map((it) => (
                          <div key={it.id} className="flex items-center gap-3 px-4 py-2 pl-6 hover:bg-black/[.02] group">
                            <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                              <span className="text-sm font-semibold text-[#12181F] num">{it.phone_number || '—'}</span>
                              <span className="text-xs text-[#8896A3] num truncate">{it.serial_no || '—'}</span>
                              {!branchFilter && (
                                <span className="text-[11px] text-[#4B5563]">{branchDisplayLabel(it)}</span>
                              )}
                              {it.network && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={networkStyle(it.network)}>
                                  {it.network}
                                </span>
                              )}
                              {it.note && <span className="text-xs text-[#8896A3] italic truncate max-w-[220px]">{it.note}</span>}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={() => openEdit(it)}
                                className="p-1.5 rounded-md text-[#4B5563] hover:bg-black/[.06] hover:text-[#0B6E76] transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                              {confirmDeleteId === it.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => handleDelete(it.id)}
                                    className="text-[11px] font-bold px-2 py-1 rounded-md bg-[#B3392C] text-white disabled:opacity-40"
                                  >
                                    ลบเลย
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="p-1.5 rounded-md text-[#8896A3] hover:bg-black/[.06]"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(it.id)}
                                  className="p-1.5 rounded-md text-[#4B5563] hover:bg-[#B3392C]/10 hover:text-[#B3392C] transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add / Edit modal ─────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent className="bg-[#FFFFFF] border-[#EFF2F5] max-w-md">
          <DialogTitle className="text-lg font-bold text-[#12181F]">
            {editingId ? 'แก้ไขข้อมูล SIM' : 'เพิ่ม SIM ใหม่'}
          </DialogTitle>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4B5563]">สาขา</label>
              <select
                value={branchSelectValue}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>สาขา{b.name_th}</option>
                ))}
                <option value={`NONE:${REGION_LABEL}`}>{REGION_LABEL}</option>
                <option value={`NONE:${UNASSIGNED_LABEL}`}>ไม่ระบุสาขา</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4B5563]">จุดติดตั้ง / อุปกรณ์</label>
              <input
                value={form.device_point}
                onChange={(e) => setForm((f) => ({ ...f, device_point: e.target.value }))}
                placeholder="เช่น MM-04-หนองกระโดน, DMA-07-..., P3-2-DMA-16-..., ไม่ได้ใช้งาน"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] placeholder:text-[#8896A3] focus:outline-none focus:border-cyan-500/60"
              />
              <p className="text-[11px] text-[#8896A3]">ขึ้นต้นด้วย MM / DMA / P3 ระบบจะจัดหมวดให้อัตโนมัติ นอกนั้นเข้าหมวด &quot;อื่นๆ&quot;</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4B5563]">เบอร์โทรศัพท์</label>
                <input
                  value={form.phone_number}
                  onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                  placeholder="08xxxxxxxx"
                  className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] num placeholder:text-[#8896A3] focus:outline-none focus:border-cyan-500/60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#4B5563]">เครือข่าย</label>
                <select
                  value={form.network}
                  onChange={(e) => setForm((f) => ({ ...f, network: e.target.value }))}
                  className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60"
                >
                  {NETWORK_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4B5563]">Serial No.</label>
              <input
                value={form.serial_no}
                onChange={(e) => setForm((f) => ({ ...f, serial_no: e.target.value }))}
                placeholder="เลข ICCID บนซิม"
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] num placeholder:text-[#8896A3] focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#4B5563]">หมายเหตุ (ถ้ามี)</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                className="w-full bg-black/5 border border-black/15 rounded-lg px-3 py-2 text-sm text-[#12181F] focus:outline-none focus:border-cyan-500/60 resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !form.device_point.trim() || !form.phone_number.trim()}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-cyan-500 hover:bg-cyan-400 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่ม SIM'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
