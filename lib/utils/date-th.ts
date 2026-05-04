// Thai date utilities — Buddhist Era (พ.ศ. = Gregorian + 543)

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export function toThaiYear(gregorianYear: number): number {
  return gregorianYear + 543
}

export function formatThaiDate(date: Date | string | null, short = false): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  const day = d.getDate()
  const month = short ? THAI_MONTHS_SHORT[d.getMonth()] : THAI_MONTHS[d.getMonth()]
  const year = toThaiYear(d.getFullYear())
  return `${day} ${month} ${year}`
}

export function formatThaiMonthYear(year: number, month: number): string {
  // year in Gregorian, month 1-12
  return `${THAI_MONTHS[month - 1]} ${toThaiYear(year)}`
}

export function formatThaiMonthYearShort(year: number, month: number): string {
  return `${THAI_MONTHS_SHORT[month - 1]} ${toThaiYear(year)}`
}

export function formatThaiNumber(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return '-'
  return n.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function getThaiMonthName(month: number, short = false): string {
  const idx = month - 1
  return short ? THAI_MONTHS_SHORT[idx] : THAI_MONTHS[idx]
}

export function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false
  return new Date(dueDateStr) < new Date()
}

export function daysUntil(dueDateStr: string | null): number | null {
  if (!dueDateStr) return null
  const diff = new Date(dueDateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
