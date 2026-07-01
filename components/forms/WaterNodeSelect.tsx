'use client'

import { useState, useTransition, useEffect } from 'react'
import { getChildNodes } from '@/app/actions/water-nodes'
import type { WaterNodeOption } from '@/lib/types'

const SELECT = 'w-full bg-[#0c1a30] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/60 disabled:opacity-40'
const LABEL = 'block text-xs text-white/50 mb-1'

interface Props {
  branchId: string
  initialMmNodes: WaterNodeOption[]
  // code = most specific selected node code (SUB > DMA > MM), empty string if none
  onChange: (label: string, code: string, nodeId: string, loggerId: string | null) => void
  value?: string
}

function nodeLabel(n: WaterNodeOption): string {
  return n.name_th ? `${n.code}  ${n.name_th}` : n.code
}

export function WaterNodeSelect({ branchId, initialMmNodes, onChange, value: _value }: Props) {
  const [selectedMmId, setSelectedMmId] = useState('')
  const [selectedDmaId, setSelectedDmaId] = useState('')
  const [selectedSubId, setSelectedSubId] = useState('')

  const [dmaNodes, setDmaNodes] = useState<WaterNodeOption[]>([])
  const [subNodes, setSubNodes] = useState<WaterNodeOption[]>([])

  const [pendingDma, startDmaTransition] = useTransition()
  const [pendingSub, startSubTransition] = useTransition()

  // Reset everything when branch changes
  useEffect(() => {
    setSelectedMmId('')
    setSelectedDmaId('')
    setSelectedSubId('')
    setDmaNodes([])
    setSubNodes([])
  }, [branchId])

  function emitLabel(mm: WaterNodeOption | undefined, dma: WaterNodeOption | undefined, sub: WaterNodeOption | undefined) {
    if (!mm) { onChange('', '', '', null); return }
    const parts = [nodeLabel(mm)]
    if (dma) parts.push(nodeLabel(dma))
    if (sub) parts.push(nodeLabel(sub))
    const code = sub?.code ?? dma?.code ?? mm.code
    const nodeId = sub?.id ?? dma?.id ?? mm.id
    const rawLogger = sub?.logger_id ?? dma?.logger_id ?? mm.logger_id ?? null
    // water_nodes เก็บเป็น 'logger_2308_usage' — ดึงแค่ตัวเลขให้ตรงกับ mnf_daily.logger_id
    const loggerId = rawLogger ? (rawLogger.match(/logger_(\d+)/)?.[1] ?? rawLogger) : null
    onChange(parts.join(' / '), code, nodeId, loggerId)
  }

  function handleMmChange(mmId: string) {
    setSelectedMmId(mmId)
    setSelectedDmaId('')
    setSelectedSubId('')
    setDmaNodes([])
    setSubNodes([])

    const mm = initialMmNodes.find((n) => n.id === mmId)
    emitLabel(mm, undefined, undefined)

    if (!mmId) return
    startDmaTransition(async () => {
      const children = await getChildNodes(mmId)
      setDmaNodes(children)
    })
  }

  function handleDmaChange(dmaId: string) {
    setSelectedDmaId(dmaId)
    setSelectedSubId('')
    setSubNodes([])

    const mm = initialMmNodes.find((n) => n.id === selectedMmId)
    const dma = dmaNodes.find((n) => n.id === dmaId)
    emitLabel(mm, dma, undefined)

    if (!dmaId) return
    startSubTransition(async () => {
      const children = await getChildNodes(dmaId)
      setSubNodes(children)
    })
  }

  function handleSubChange(subId: string) {
    setSelectedSubId(subId)
    const mm = initialMmNodes.find((n) => n.id === selectedMmId)
    const dma = dmaNodes.find((n) => n.id === selectedDmaId)
    const sub = subNodes.find((n) => n.id === subId)
    emitLabel(mm, dma, sub || undefined)
  }

  return (
    <div className="space-y-3">
      {/* MM */}
      <div>
        <label className={LABEL}>มาตรวัดหลัก (MM)</label>
        <select
          value={selectedMmId}
          onChange={(e) => handleMmChange(e.target.value)}
          className={SELECT}
        >
          <option value="">— เลือก MM —</option>
          {initialMmNodes.map((n) => (
            <option key={n.id} value={n.id}>{nodeLabel(n)}</option>
          ))}
        </select>
      </div>

      {/* DMA — shown once MM is selected */}
      {selectedMmId && (
        <div>
          <label className={LABEL}>
            เขตย่อย (DMA/โซน)
            {pendingDma && <span className="ml-2 text-cyan-400/60">กำลังโหลด…</span>}
          </label>
          <select
            value={selectedDmaId}
            onChange={(e) => handleDmaChange(e.target.value)}
            disabled={pendingDma}
            className={SELECT}
          >
            <option value="">— ไม่ระบุโซน / ทั้ง MM —</option>
            {dmaNodes.map((n) => (
              <option key={n.id} value={n.id}>{nodeLabel(n)}</option>
            ))}
          </select>
        </div>
      )}

      {/* SUB — shown only when DMA has children */}
      {selectedDmaId && subNodes.length > 0 && (
        <div>
          <label className={LABEL}>
            โซนย่อย (SUB) — ไม่บังคับ
            {pendingSub && <span className="ml-2 text-cyan-400/60">กำลังโหลด…</span>}
          </label>
          <select
            value={selectedSubId}
            onChange={(e) => handleSubChange(e.target.value)}
            disabled={pendingSub}
            className={SELECT}
          >
            <option value="">— ไม่ระบุโซนย่อย —</option>
            {subNodes.map((n) => (
              <option key={n.id} value={n.id}>{nodeLabel(n)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
