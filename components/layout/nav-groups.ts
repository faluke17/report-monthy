import {
  ClipboardList, Target, AlertTriangle,
  Calendar, BookOpen, Download,
  Droplets, ListChecks, Crosshair, Activity, Building2, Presentation, GitBranch, Network,
  Smartphone,
} from 'lucide-react'

export interface SidebarStats {
  totalBranches:  number
  submitted:      number
  pending:        number
  openObstacles:  number
  overdueActions: number
  mnfRedCount:    number
}

const isDev = process.env.NODE_ENV !== 'production'

export const NAV_GROUPS = [
  {
    label: 'ภาพรวม',
    items: [
      { href: '/executive-summary',   label: 'บทสรุปผู้บริหาร',     icon: Presentation },
      { href: '/mnf-monitor',         label: 'MNF Monitor',          icon: Activity },
      { href: '/report-nrw',          label: 'Report NRW',           icon: Droplets },
      { href: '/water-tree',          label: 'ผังจ่ายน้ำ',            icon: GitBranch },
      ...(isDev ? [{ href: '/project-progress', label: 'ความก้าวหน้าโครงการ', icon: Building2 }] : []),
      ...(isDev ? [{ href: '/pipeline',         label: 'Pipeline Monitor',     icon: Network }] : []),
    ],
  },
  {
    label: 'ประชุม WSC-R',
    items: [
      ...(isDev ? [{ href: '/meeting', label: 'วาระ / มติ / สั่งการ', icon: Calendar, exact: true }] : []),
      ...(isDev ? [{ href: '/action',  label: 'Action Tracker',      icon: Crosshair }] : []),
    ],
  },
  {
    label: 'รายงานรายเดือน',
    items: [
      ...(isDev ? [{ href: '/pdca',        label: 'กรอกผล / PDCA',    icon: ClipboardList }] : []),
      ...(isDev ? [{ href: '/five-topics', label: 'รายงาน 5 หัวข้อ',   icon: ListChecks }] : []),
      ...(isDev ? [{ href: '/obstacle',    label: 'Obstacle Tracker', icon: AlertTriangle }] : []),
    ],
  },
  {
    label: 'แผนและ KM',
    items: [
      ...(isDev ? [{ href: '/plans',  label: 'แผนลดน้ำสูญเสีย',   icon: Target }] : []),
      ...(isDev ? [{ href: '/km',     label: 'KM Best Practice', icon: BookOpen }] : []),
      ...(isDev ? [{ href: '/export', label: 'Export ข้อมูล',     icon: Download }] : []),
    ],
  },
  {
    label: 'ระบบ',
    items: [
      // จำกัดสิทธิ์เห็นเฉพาะ user ใน lib/sim-access.ts (เช็คใน Sidebar.tsx) ไม่ใช่ทุกคน
      { href: '/sims', label: 'SIM Inventory', icon: Smartphone, restricted: true },
    ],
  },
]
