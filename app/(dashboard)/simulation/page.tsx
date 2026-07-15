import { SimulationClient } from './_components/SimulationClient'

export default function SimulationPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-[#12181F]">Simulation — ระบบประชุม + Ticket</h1>
        <p className="text-sm text-black/40 mt-0.5">ข้อมูลจำลอง — ยังไม่เชื่อมฐานข้อมูล</p>
      </div>
      <SimulationClient />
    </div>
  )
}
