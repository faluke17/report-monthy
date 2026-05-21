import { MnfSimulation } from './_components/MnfSimulation'

export default function MnfSimulationPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-white">Simulation — MNF Monitor (Region View)</h1>
        <p className="text-sm text-white/40 mt-0.5">ข้อมูลจำลอง — ทดสอบ layout</p>
      </div>
      <MnfSimulation />
    </div>
  )
}
