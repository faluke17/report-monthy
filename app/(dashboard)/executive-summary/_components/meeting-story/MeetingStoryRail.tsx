'use client'

import { FileText } from 'lucide-react'
import type { MeetingStoryListItem } from '@/app/actions/meeting-story'
import { formatThaiDate } from '@/lib/utils/date-th'
import { RailHeading } from '../tabs/shared'

const SANS = 'var(--font-sans)'
const MONO = 'var(--font-mono), var(--font-sans)'
const INK  = '#12181F'
const INK3 = '#8896A3'
const LINE = '#E3E7EC'
const SURF = '#FFFFFF'

interface Props {
  meetings: MeetingStoryListItem[]
  pendingId: string | null
  onOpen: (id: string) => void
}

// การ์ดรายการ "รายงานการประชุม" แบบเรื่องเล่า — กดแล้วเปิด MeetingStoryPanel เต็มจอ
// วางใน rail ขวา (เดสก์ท็อป) / สแต็กมือถือ ของหน้า Executive Summary เหมือน RatsRailSummary
export function MeetingStoryRail({ meetings, pendingId, onOpen }: Props) {
  return (
    <div style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 10, padding: 14, boxShadow: '0 1px 2px rgba(18,24,31,0.04)' }}>
      <RailHeading
        icon={FileText} label="รายงานการประชุมล่าสุด" color="#0B6E76" bg="rgba(11,110,118,.12)"
        right={meetings.length > 0 ? <div style={{ fontSize: 11.5, color: '#0B6E76', fontWeight: 700, flexShrink: 0 }}>{meetings.length} ครั้ง</div> : undefined}
      />

      {meetings.length === 0 ? (
        <div style={{ fontSize: 12, color: INK3, padding: '6px 2px' }}>ยังไม่มีรายงานการประชุมที่กรอกเสร็จ</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {meetings.map((m) => (
            <button
              key={m.id}
              onClick={() => onOpen(m.id)}
              disabled={pendingId === m.id}
              className="exec-row-raise"
              style={{
                display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left',
                padding: '9px 10px', borderRadius: 8, border: 'none', background: 'transparent',
                cursor: pendingId === m.id ? 'default' : 'pointer', fontFamily: SANS, width: '100%',
                opacity: pendingId === m.id ? .5 : 1,
              }}
            >
              <span style={{
                fontSize: 12.5, color: INK, fontWeight: 600, lineHeight: 1.4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {m.title}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: INK3 }}>
                <span style={{ fontFamily: MONO }}>{formatThaiDate(m.scheduled_date, true)}</span>
                {m.location && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {m.location}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
