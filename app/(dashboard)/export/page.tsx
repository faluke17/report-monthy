'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { getThaiMonthName, toThaiYear } from '@/lib/utils/date-th'

interface ExportOption {
  id: string
  label: string
  description: string
  format: 'excel' | 'pdf'
  icon: React.ElementType
  params: Record<string, string>
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'monthly-summary',
    label: 'สรุปรายเดือนทุกสาขา',
    description: 'Excel — NRW, MNF, จุดรั่ว ทั้ง 26 สาขา',
    format: 'excel',
    icon: FileSpreadsheet,
    params: { type: 'monthly' },
  },
  {
    id: 'nrw-trend',
    label: 'แนวโน้ม NRW 12 เดือน',
    description: 'Excel — รายงานแนวโน้มรายสาขา',
    format: 'excel',
    icon: FileSpreadsheet,
    params: { type: 'trend' },
  },
  {
    id: 'action-items',
    label: 'Action Items ทั้งหมด',
    description: 'Excel — กรองตามสถานะและสาขา',
    format: 'excel',
    icon: FileSpreadsheet,
    params: { type: 'actions' },
  },
  {
    id: 'meeting-minutes',
    label: 'รายงานการประชุม',
    description: 'PDF — มติและข้อสั่งการล่าสุด',
    format: 'pdf',
    icon: FileText,
    params: { type: 'meeting' },
  },
]

export default function ExportPage() {
  const { selectedYear, selectedMonth } = useAppStore()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleExport(option: ExportOption) {
    setLoading(option.id)
    const params = new URLSearchParams({
      ...option.params,
      format: option.format,
      year: String(selectedYear),
      month: String(selectedMonth),
    })
    try {
      const res = await fetch(`/api/export?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `NRW-R10-${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${option.id}.${option.format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('ส่งออกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">ส่งออกรายงาน</h1>
        <p className="text-sm text-white/50 mt-0.5">
          ประจำเดือน {getThaiMonthName(selectedMonth)} {toThaiYear(selectedYear)}
        </p>
      </div>

      <div className="space-y-3">
        {EXPORT_OPTIONS.map((option) => {
          const Icon = option.icon
          const isLoading = loading === option.id
          return (
            <div
              key={option.id}
              className="glass-card-sm p-5 flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                option.format === 'excel' ? 'bg-green-500/15' : 'bg-red-500/15'
              }`}>
                <Icon size={20} className={option.format === 'excel' ? 'text-green-400' : 'text-red-400'} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{option.label}</p>
                <p className="text-xs text-white/40">{option.description}</p>
              </div>
              <button
                onClick={() => handleExport(option)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg disabled:opacity-50 transition-colors shrink-0"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {isLoading ? 'กำลังสร้าง...' : 'ดาวน์โหลด'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
