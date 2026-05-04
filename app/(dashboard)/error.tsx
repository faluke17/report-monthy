'use client'

import { RefreshCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="glass-card p-8 text-center max-w-md">
        <h2 className="text-lg font-semibold text-red-400 mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-sm text-white/50 mb-4">{error.message || 'ไม่สามารถโหลดข้อมูลได้'}</p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCcw size={14} />
          ลองใหม่
        </button>
      </div>
    </div>
  )
}
