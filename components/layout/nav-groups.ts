import {
  BarChart3, ClipboardList, Target, AlertTriangle,
  Calendar, BookOpen, Download,
  Droplets, ListChecks, FileText, Crosshair, Activity, Building2, Presentation, GitBranch, Network,
} from 'lucide-react'

export interface SidebarStats {
  totalBranches:  number
  submitted:      number
  pending:        number
  openObstacles:  number
  overdueActions: number
  mnfRedCount:    number
}

export const NAV_GROUPS = [
  {
    label: 'ภาพรวม',
    items: [
      { href: '/executive-summary',   label: 'บทสรุปผู้บริหาร',     icon: Presentation },
      { href: '/mnf-monitor',         label: 'MNF Monitor',          icon: Activity },
      { href: '/report-nrw',          label: 'Report NRW',           icon: Droplets },
      { href: '/water-tree',          label: 'ผังจ่ายน้ำ',            icon: GitBranch },
      { href: '/project-progress',    label: 'ความก้าวหน้าโครงการ',  icon: Building2 },
      { href: '/pipeline',            label: 'Pipeline Monitor',      icon: Network },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/ranking', label: 'Ranking สาขา', icon: BarChart3 }] : []),
    ],
  },
  {
    label: 'ประชุม WSC-R',
    items: [
      { href: '/meeting', label: 'วาระ / มติ / สั่งการ', icon: Calendar, exact: true },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/action',  label: 'Action Tracker',  icon: Crosshair }] : []),
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/summary', label: 'Exec. Summary', icon: FileText, badge: 'new' as const }] : []),
    ],
  },
  {
    label: 'รายงานรายเดือน',
    items: [
      { href: '/pdca',     label: 'กรอกผล / PDCA',   icon: ClipboardList },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/five-topics', label: 'รายงาน 5 หัวข้อ', icon: ListChecks }] : []),
      { href: '/obstacle', label: 'Obstacle Tracker', icon: AlertTriangle },
    ],
  },
  {
    label: 'แผนและ KM',
    items: [
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/plans', label: 'แผนลดน้ำสูญเสีย', icon: Target }] : []),
      { href: '/km',       label: 'KM Best Practice', icon: BookOpen },
      ...(process.env.NODE_ENV !== 'production' ? [{ href: '/export', label: 'Export ข้อมูล', icon: Download }] : []),
    ],
  },
]
