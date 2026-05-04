'use client'

import { cn } from '@/lib/utils'

type Variant = 'good' | 'warn' | 'bad' | 'info' | 'purple' | 'gray'

const STATUS_MAP: Record<string, Variant> = {
  // Plans
  'สำเร็จ': 'good',
  'ระหว่างดำเนินการ': 'warn',
  'ล่าช้า': 'warn',
  'ยกเลิก': 'gray',
  'รออนุมัติ': 'warn',
  // Obstacles
  'รายงานใหม่': 'info',
  'ระหว่างแก้': 'warn',
  'รอสนับสนุน': 'info',
  'เกินกำหนด': 'bad',
  'ปิดประเด็น': 'good',
  // Actions
  'รอดำเนินการ': 'gray',
  'แล้วเสร็จ': 'good',
  // Monthly
  'draft': 'gray',
  'submitted': 'info',
  'reviewed': 'good',
  // Meetings
  'กำหนดแล้ว': 'info',
  'เสร็จสิ้น': 'good',
  'เลื่อน': 'warn',
  // KM
  'รอยืนยันรอบ 1': 'warn',
  'รอยืนยันรอบ 2': 'warn',
  'ยืนยันแล้ว': 'purple',
  // NRW status
  'ลดชัด': 'good',
  'ใกล้เป้า': 'warn',
  'ไม่ลด': 'bad',
  'ต้อง Act': 'bad',
}

const VARIANT_STYLES: Record<Variant, string> = {
  good:   'bg-green-500/15 text-green-400 border border-green-500/30',
  warn:   'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  bad:    'bg-red-500/15 text-red-400 border border-red-500/30',
  info:   'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  gray:   'bg-white/10 text-white/60 border border-white/20',
}

interface StatusPillProps {
  status: string
  variant?: Variant
  className?: string
}

export function StatusPill({ status, variant, className }: StatusPillProps) {
  const resolvedVariant = variant ?? STATUS_MAP[status] ?? 'gray'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        VARIANT_STYLES[resolvedVariant],
        className
      )}
    >
      {status}
    </span>
  )
}
