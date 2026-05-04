import Link from 'next/link'
import { Droplets, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#061327]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 mb-6">
          <Droplets size={32} className="text-cyan-400" />
        </div>
        <h1 className="text-6xl font-bold text-white num mb-2">404</h1>
        <p className="text-white/50 mb-6">ไม่พบหน้าที่ต้องการ</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold rounded-lg transition-colors"
        >
          <Home size={16} />
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  )
}
