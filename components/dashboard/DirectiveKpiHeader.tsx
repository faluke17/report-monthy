import { KpiCard } from './KpiCard'
import type { DirectiveKpis } from '@/lib/types'

interface Props {
  kpis: DirectiveKpis
}

export function DirectiveKpiHeader({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      <KpiCard
        label="ทั้งหมด"
        value={kpis.total}
        unit="ข้อ"
        accentColor="cyan"
        sub="มติสั่งการ"
      />
      <KpiCard
        label="กำลังดำเนินการ"
        value={kpis.on_track}
        unit="ข้อ"
        accentColor="teal"
        sub="ตามกำหนดเวลา"
      />
      <KpiCard
        label="ล่าช้า"
        value={kpis.delayed}
        unit="ข้อ"
        accentColor="red"
        sub="เกินกำหนดวัน"
      />
      <KpiCard
        label="แล้วเสร็จ"
        value={kpis.completed}
        unit="ข้อ"
        accentColor="green"
        sub="ปิดประเด็นแล้ว"
      />
      <KpiCard
        label="ไม่ตอบสนอง"
        value={kpis.unresponsive}
        unit="ข้อ"
        accentColor="amber"
        sub="ไม่อัพเดต >7 วัน"
      />
    </div>
  )
}
