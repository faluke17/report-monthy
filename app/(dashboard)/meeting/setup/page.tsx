import { MeetingSetupForm } from '@/components/forms/MeetingSetupForm'

export default async function MeetingSetupPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">สร้างการประชุม</h1>
        <p className="text-sm text-white/40 mt-0.5">กำหนดตารางและส่งการแจ้งเตือนถึงสาขา</p>
      </div>
      <MeetingSetupForm backHref="/meeting/schedule" />
    </div>
  )
}
