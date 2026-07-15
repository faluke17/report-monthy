import Link from 'next/link'
import { Droplets, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#EAF1F0] mb-6">
          <Droplets size={32} className="text-[#0B6E76]" />
        </div>
        <h1 className="text-6xl font-bold text-[#12181F] num mb-2">404</h1>
        <p className="text-[#6B7686] mb-6">ไม่พบหน้าที่ต้องการ</p>
        <Link
          href="/executive-summary"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#061327] font-semibold rounded-lg transition-colors"
        >
          <Home size={16} />
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  )
}
