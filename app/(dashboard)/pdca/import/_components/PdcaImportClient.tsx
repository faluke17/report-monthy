'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, FileJson, ArrowRight, RotateCcw } from 'lucide-react'
import { Branch } from '@/lib/types'
import { parsePdcaImportJson, PdcaImportData } from '@/lib/utils/pdca-import'
import { PdcaImportDashboard } from '@/components/dashboard/PdcaImportDashboard'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB — guards against pasting the wrong file type
const HANDOFF_KEY = 'pdca_import_handoff'

interface Props {
  branches: Branch[]
}

export function PdcaImportClient({ branches }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<PdcaImportData | null>(null)
  const [fileName, setFileName] = useState('')
  const [rawText, setRawText] = useState('')

  function handlePick() {
    inputRef.current?.click()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error('ไฟล์มีขนาดใหญ่เกินไป กรุณาตรวจสอบว่าเป็นไฟล์ .json ที่ถูกต้อง')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const raw = reader.result as string
      const result = parsePdcaImportJson(raw)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setData(result.data)
      setRawText(raw)
      setFileName(file.name)
      toast.success(`นำเข้า ${result.data.areas.length} พื้นที่ — นี่คือมุมมองตัวอย่าง ยังไม่บันทึกลงระบบ`)
    }
    reader.onerror = () => toast.error('อ่านไฟล์ไม่สำเร็จ กรุณาลองใหม่')
    reader.readAsText(file)
  }

  function handleReset() {
    setData(null)
    setRawText('')
    setFileName('')
  }

  function handleGoToForm() {
    try {
      sessionStorage.setItem(HANDOFF_KEY, rawText)
    } catch {
      toast.error('ไม่สามารถส่งข้อมูลไปยังฟอร์มได้ กรุณานำเข้าไฟล์ที่หน้าฟอร์มโดยตรงแทน')
      return
    }
    router.push('/pdca/new')
  }

  if (!data) {
    return (
      <div className="glass-card">
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={handlePick}
          className="w-full flex flex-col items-center justify-center gap-3 py-16 px-6 text-center hover:bg-black/2 transition-colors rounded-2xl"
        >
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
            <Upload size={22} className="text-cyan-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#12181F]">คลิกเพื่อเลือกไฟล์ .json</p>
            <p className="text-xs text-black/40 mt-1 max-w-sm">
              ไฟล์ที่ส่งออกจากเครื่องมือ PDCA รายพื้นที่แบบออฟไลน์ (ปุ่ม &quot;ส่งออก&quot; → รูปแบบ JSON) ที่สาขาส่งมาให้
            </p>
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="glass-card flex items-center gap-3 flex-wrap px-4 py-3">
        <div className="flex items-center gap-2 min-w-0 text-xs text-black/50">
          <FileJson size={14} className="text-cyan-600 shrink-0" />
          <span className="truncate font-mono">{fileName}</span>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-semibold text-black/50 hover:text-[#12181F] border border-black/15 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RotateCcw size={12} />
          เปลี่ยนไฟล์
        </button>
        <button
          type="button"
          onClick={handleGoToForm}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-400 rounded-lg px-3.5 py-1.5 transition-colors"
        >
          นำเข้าไปกรอกในฟอร์มเพื่อบันทึก
          <ArrowRight size={12} />
        </button>
      </div>

      <PdcaImportDashboard data={data} branches={branches} />
    </div>
  )
}
