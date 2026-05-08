// NRW and MNF calculation utilities

export function calcNRW(distributed: number, sold: number): number {
  if (!distributed) return 0
  return Number(((distributed - sold) / distributed * 100).toFixed(2))
}

export function calcMNFFactor(mnf: number, dailySupply: number): number {
  const avgHourlyFlow = dailySupply / 24
  if (!avgHourlyFlow) return 0
  return Number((mnf / avgHourlyFlow).toFixed(3))
}

export function getNRWStatus(nrw: number, target: number): 'good' | 'warn' | 'bad' {
  if (nrw <= target) return 'good'
  if (nrw <= target + 3) return 'warn'
  return 'bad'
}

export function getTrafficLight(
  nrw: number | null,
  target: number | null,
  submitted: boolean
): 'green' | 'yellow' | 'red' | 'grey' {
  if (!submitted || nrw === null) return 'grey'
  if (target === null) return 'grey'
  if (nrw <= target) return 'green'
  if (nrw <= target + 3) return 'yellow'
  return 'red'
}

export function getNRWTrend(
  current: number | null,
  previous: number | null
): 'up' | 'down' | 'stable' | 'no_data' {
  if (current === null || previous === null) return 'no_data'
  const delta = current - previous
  if (Math.abs(delta) < 0.1) return 'stable'
  return delta > 0 ? 'up' : 'down'
}

export function generateNRWAnalysis(
  nrw: number,
  prevNRW: number | null,
  baseline: number | null,
  target: number | null,
  mnfFactor: number
): { title: string; text: string; next: string } {
  const status = target ? getNRWStatus(nrw, target) : 'bad'

  if (status === 'good') {
    return {
      title: 'NRW อยู่ในเป้าหมาย',
      text: `NRW ปัจจุบัน ${nrw.toFixed(2)}% ต่ำกว่าเป้าหมาย${target ? ` (${target}%)` : ''} แสดงว่าการบริหารจัดการน้ำสูญเสียมีประสิทธิภาพดี`,
      next: 'รักษาระดับนี้ต่อเนื่อง และทำ MNF วัดซ้ำเพื่อยืนยันผล',
    }
  }

  if (status === 'warn') {
    const delta = prevNRW ? nrw - prevNRW : null
    const trend = delta !== null ? (delta > 0 ? 'เพิ่มขึ้น' : 'ลดลง') : ''
    return {
      title: 'NRW ใกล้เป้าหมาย — ต้องเฝ้าระวัง',
      text: `NRW ${nrw.toFixed(2)}% ${trend ? `(${trend} ${Math.abs(delta!).toFixed(2)}% จากเดือนก่อน)` : ''} ยังสูงกว่าเป้าหมายเล็กน้อย MNF Factor: ${mnfFactor.toFixed(3)}`,
      next: 'ตรวจสอบจุดรั่วซึมขนาดเล็กที่อาจถูกมองข้าม และทบทวนข้อมูลมาตรผิดปกติ',
    }
  }

  return {
    title: 'NRW สูงกว่าเป้าหมาย — ต้องดำเนินการ',
    text: `NRW ${nrw.toFixed(2)}%${target ? ` สูงกว่าเป้า ${(nrw - target).toFixed(2)}%` : ''}${baseline ? ` (baseline: ${baseline}%)` : ''} MNF Factor: ${mnfFactor.toFixed(3)}${mnfFactor > 0.5 ? ' (สูง — น่าเป็นห่วง)' : ''}`,
    next: mnfFactor > 0.5
      ? 'MNF Factor สูง → ตรวจสอบแรงดัน PRV และทำ Step Test หา active leak เพิ่มเติม'
      : 'ตรวจสอบมาตรผิดปกติ และทบทวน boundary valve ที่ DMA',
  }
}
