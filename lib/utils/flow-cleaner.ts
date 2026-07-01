/**
 * Port ของ JAVIS agent2_analyst.py สำหรับทำความสะอาดข้อมูลน้ำจ่ายรายวัน
 * Algorithm: Modified Z-score (threshold 3.5) + 5 flag types
 */

const ERROR_THRESHOLD = 1_000_000 // ค่า >= นี้ = sensor overflow / ข้อมูลผิดพลาด
const OUTLIER_ZSCORE = 3.5        // threshold สำหรับ Modified Z-score

export type FlowFlag = 'ok' | 'ERROR' | 'ZERO' | 'DEVICE_FAIL' | 'OUTLIER' | 'MISSING'

export interface DailyReading {
  day_num: number
  raw_value: number | null
}

export interface CleanedReading {
  day_num: number
  raw_value: number | null
  cleaned_value: number // ค่าที่ใช้จริง (raw_value ถ้า ok, fill_median ถ้าผิดปกติ)
  flag: FlowFlag
  fill_median: number   // median ของ series นี้ (ใช้เติมแทนค่าผิดปกติ)
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * ทำความสะอาด series ข้อมูลรายวันของ logger 1 ตัว
 * Input: readings ของเดือนนั้น (อาจไม่ครบ 31 วัน ไม่ต้องเรียงก็ได้)
 * Output: cleaned readings เรียงตาม day_num พร้อม flag และ fill_median
 */
export function cleanLoggerSeries(readings: DailyReading[]): CleanedReading[] {
  const sorted = [...readings].sort((a, b) => a.day_num - b.day_num)
  const vals = sorted.map((r) => r.raw_value)
  const flags: FlowFlag[] = vals.map(() => 'ok')

  // 1. ERROR: ค่า >= 1,000,000 — sensor overflow หรือส่งค่าผิดพลาด
  vals.forEach((v, i) => {
    if (v !== null && v >= ERROR_THRESHOLD) flags[i] = 'ERROR'
  })

  // 2. ZERO: meter รายงาน 0 = offline (ไม่ใช่จ่ายน้ำจริงๆ ศูนย์)
  vals.forEach((v, i) => {
    if (flags[i] === 'ok' && v !== null && v === 0) flags[i] = 'ZERO'
  })

  // 3. Robust stats จาก clean values เท่านั้น
  const cleanVals = vals.filter((v, i) => flags[i] === 'ok' && v !== null) as number[]
  const med = median(cleanVals)
  const mad = median(cleanVals.map((v) => Math.abs(v - med)))

  // 4. DEVICE_FAIL: ค่าต่ำกว่า lower fence และวันถัดไปเป็น ERROR
  //    หมายถึง: sensor กำลังจะเสีย (ส่งค่าต่ำผิดปกติแล้ว ERROR วันถัดไป)
  if (mad > 0) {
    const lowerFence = med - (OUTLIER_ZSCORE * mad) / 0.6745
    vals.forEach((v, i) => {
      if (flags[i] === 'ok' && v !== null && v < lowerFence) {
        if (i + 1 < flags.length && flags[i + 1] === 'ERROR') {
          flags[i] = 'DEVICE_FAIL'
        }
      }
    })
  }

  // 5. OUTLIER: Modified Z-score > threshold (คำนวณหลัง DEVICE_FAIL เพื่อไม่ให้ซ้อนกัน)
  if (mad > 0) {
    const cleanIdxs = vals
      .map((v, i) => ({ v, i }))
      .filter(({ v, i }) => flags[i] === 'ok' && v !== null)
    if (cleanIdxs.length >= 3) {
      cleanIdxs.forEach(({ v, i }) => {
        if (Math.abs((0.6745 * (v! - med)) / mad) > OUTLIER_ZSCORE) {
          flags[i] = 'OUTLIER'
        }
      })
    }
  }

  // 6. Fill median = median ของ final clean values (ใช้แทนค่าผิดปกติทุกประเภท)
  const finalClean = vals.filter((v, i) => flags[i] === 'ok' && v !== null) as number[]
  const fillMedian = finalClean.length > 0 ? Math.round(median(finalClean) * 100) / 100 : 0

  return sorted.map((r, i) => {
    const rawV = r.raw_value
    // MISSING: ค่า null ที่ไม่ได้ถูก flag อื่นก่อน (ข้อมูลหาย)
    const flag: FlowFlag = flags[i] === 'ok' && rawV === null ? 'MISSING' : flags[i]
    const cleanedValue = flag === 'ok' ? (rawV ?? fillMedian) : fillMedian
    return {
      day_num: r.day_num,
      raw_value: rawV,
      cleaned_value: Math.round(cleanedValue * 100) / 100,
      flag,
      fill_median: fillMedian,
    }
  })
}

/** สรุป corrections ของ series สำหรับแสดงผล */
export function summarizeCorrections(cleaned: CleanedReading[]): {
  flag: FlowFlag
  count: number
  days: number[]
}[] {
  const byFlag = new Map<FlowFlag, number[]>()
  for (const c of cleaned) {
    if (c.flag !== 'ok') {
      if (!byFlag.has(c.flag)) byFlag.set(c.flag, [])
      byFlag.get(c.flag)!.push(c.day_num)
    }
  }
  return Array.from(byFlag.entries()).map(([flag, days]) => ({ flag, count: days.length, days }))
}
