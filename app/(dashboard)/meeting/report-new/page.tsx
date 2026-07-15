import { redirect } from 'next/navigation'
import { getPwaSession } from '@/lib/pwa-auth'
import { ReportNewForm } from './_components/ReportNewForm'

export default async function MeetingReportNewPage() {
  const session = await getPwaSession()
  if (!session || session.costcenter) redirect('/meeting')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#12181F]">สร้างรายงานการประชุม</h1>
        <p className="text-sm text-black/40 mt-0.5">ระบุข้อมูลการประชุม แล้วกรอกรายงานแต่ละวาระได้เลย</p>
      </div>
      <ReportNewForm />
    </div>
  )
}
