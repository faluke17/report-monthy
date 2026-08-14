'use client'

import { X } from 'lucide-react'
import type { MeetingStoryDetail } from '@/app/actions/meeting-story'
import type { MeetingAgendaHeader, MeetingAgendaSubItem } from '@/lib/types'
import { formatThaiDate } from '@/lib/utils/date-th'
import s from './meeting-story.module.css'

interface Props {
  data: MeetingStoryDetail
  onClose: () => void
}

// ป้ายหัวข้อวาระ 1–6 — อิงตรรกะเดียวกับ MeetingAgendaForm.tsx (agenda5Label/showAgenda6)
// เพื่อให้ label ตรงกับสิ่งที่ผู้กรอกรายงานเห็นตอนกรอกทุกประการ
function agendaTitle(no: number, header: MeetingAgendaHeader): string {
  switch (no) {
    case 1: return 'เรื่องประธานแจ้งที่ประชุมทราบ'
    case 2: return `รับรองรายงานการประชุม${header.agenda2_meeting_no ? ` ครั้งที่ ${header.agenda2_meeting_no}` : ''}`
    case 3: return 'เรื่องเพื่อทราบ'
    case 4: return header.agenda4_type
    case 5: return header.agenda4_type === 'เรื่องสืบเนื่อง' ? 'เรื่องติดตามผลการดำเนินการ' : 'เรื่องอื่นๆ'
    case 6: return 'เรื่องอื่นๆ'
    default: return `วาระที่ ${no}`
  }
}

function ResolutionBox({ type, detail }: { type: string; detail: string | null }) {
  return (
    <div className={s.resolution}>
      <span className={s.resTag}>มติที่ประชุม</span>
      <p>{type === 'รับทราบ' ? 'รับทราบ' : (detail || '—')}</p>
    </div>
  )
}

function DetailTable({ table }: { table: NonNullable<MeetingAgendaSubItem['detail_table']> }) {
  if (!table.rows.length) return null
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            {table.headers.map((h, i) => <th key={i}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SubBlock({ item }: { item: MeetingAgendaSubItem }) {
  return (
    <div className={s.sub}>
      <div className={s.subHead}>
        <span className={s.subTag}>{item.agenda_no}.{item.item_no}</span>
        <h3 className={s.subTitle}>{item.title}</h3>
      </div>
      {item.detail && <p className={s.p}>{item.detail}</p>}
      {item.detail_table && <DetailTable table={item.detail_table} />}
      {item.resolution && <ResolutionBox type={item.resolution} detail={item.resolution_detail} />}
    </div>
  )
}

export function MeetingStoryPanel({ data, onClose }: Props) {
  const { meeting, header, subitems, ackCount } = data

  const byAgenda = new Map<number, MeetingAgendaSubItem[]>()
  for (const item of subitems) {
    if (!byAgenda.has(item.agenda_no)) byAgenda.set(item.agenda_no, [])
    byAgenda.get(item.agenda_no)!.push(item)
  }

  const agenda4Items = byAgenda.get(4) ?? []
  const agenda5Items = byAgenda.get(5) ?? []
  const agenda6Items = header.agenda4_type === 'เรื่องสืบเนื่อง' ? (byAgenda.get(6) ?? []) : []

  // สร้างรายการวาระที่ "มีเนื้อหาจริง" ไว้ทำ nav + render — วาระ 1/2 โชว์เสมอเพราะอยู่ใน header
  const navItems: { no: number; label: string }[] = [
    { no: 1, label: '01 · ประธานแจ้งเปิดประชุม' },
    { no: 2, label: '02 · รับรองรายงาน' },
  ]
  if ((byAgenda.get(3) ?? []).length > 0) navItems.push({ no: 3, label: `03 · ${agendaTitle(3, header)}` })
  if (agenda4Items.length > 0) navItems.push({ no: 4, label: `04 · ${agendaTitle(4, header)}` })
  if (agenda5Items.length > 0) navItems.push({ no: 5, label: `05 · ${agendaTitle(5, header)}` })
  if (agenda6Items.length > 0) navItems.push({ no: 6, label: `06 · ${agendaTitle(6, header)}` })

  const timeLabel = meeting.scheduled_time?.slice(0, 5)
  const agendaGroupCount = navItems.length

  return (
    <div className={s.root}>
      <div className={s.closeBar}>
        <button className={s.closeBtn} onClick={onClose}>
          <X size={13} /> ปิดรายงาน
        </button>
        <span className={s.closeMeta}>{meeting.code}</span>
      </div>

      <div className={s.hero}>
        <svg className={s.heroWave} viewBox="0 0 920 300" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,180 C120,140 220,220 340,190 C460,160 540,90 660,110 C780,130 840,200 920,170 L920,300 L0,300 Z" fill="#E7EBEF" />
          <path d="M0,220 C140,190 260,250 400,225 C540,200 620,150 760,165 C820,171 870,190 920,205 L920,300 L0,300 Z" fill="#EFF2F5" />
        </svg>
        <div className={s.heroInner}>
          <div className={s.eyebrow}><span className={s.dot} />บันทึกรายงานการประชุม</div>
          <h1 className={s.title}>{meeting.title}</h1>
          <p className={s.subtitle}>
            {meeting.meeting_type} · เลขที่ {meeting.code}
          </p>
          <div className={s.metaRow}>
            <div className={s.metaChip}>🗓️ <b>{formatThaiDate(meeting.scheduled_date)}</b></div>
            {timeLabel && <div className={s.metaChip}>🕘 <b>{timeLabel} น.</b></div>}
            {meeting.location && <div className={s.metaChip}>📍 {meeting.location}</div>}
            {ackCount > 0 && <div className={s.metaChip}>👥 รับทราบแล้ว <b>{ackCount} สาขา</b></div>}
          </div>
          <div className={s.heroIntro}>
            สรุปวาระและมติที่ประชุมทั้งหมด {agendaGroupCount} วาระ จากการประชุม{meeting.location ? `ที่ ${meeting.location} ` : ' '}
            เมื่อวันที่ {formatThaiDate(meeting.scheduled_date)}
          </div>
        </div>
      </div>

      <nav className={s.nav}>
        <div className={s.navInner}>
          {navItems.map((n) => (
            <a key={n.no} className={s.navChip} href={`#story-a${n.no}`}>{n.label}</a>
          ))}
        </div>
      </nav>

      {/* วาระ 1 */}
      <section className={s.agenda} id="story-a1">
        <div className={s.wrap}>
          <div className={s.agendaHead}>
            <span className={s.agendaNum}>วาระ 01</span>
            <h2 className={s.agendaTitle}>{agendaTitle(1, header)}</h2>
          </div>
          {header.agenda1_detail
            ? <p className={s.lede}>{header.agenda1_detail}</p>
            : <p className={s.lede} style={{ opacity: .5 }}>ไม่ได้บันทึกรายละเอียด</p>}
          <ResolutionBox type={header.agenda1_resolution ?? 'รับทราบ'} detail={header.agenda1_resolution_detail} />
        </div>
      </section>

      {/* วาระ 2 */}
      <section className={s.agenda} id="story-a2">
        <div className={s.wrap}>
          <div className={s.agendaHead}>
            <span className={s.agendaNum}>วาระ 02</span>
            <h2 className={s.agendaTitle}>{agendaTitle(2, header)}</h2>
          </div>
          {header.agenda2_resolution && (
            <ResolutionBox type={header.agenda2_resolution} detail={header.agenda2_resolution_detail} />
          )}
        </div>
      </section>

      {/* วาระ 3–6 — ไล่ตาม navItems เพื่อให้ลำดับ/label sync กับ nav เสมอ */}
      {navItems.filter((n) => n.no >= 3).map((n) => {
        const items = byAgenda.get(n.no) ?? []
        return (
          <section className={s.agenda} id={`story-a${n.no}`} key={n.no}>
            <div className={s.wrap}>
              <div className={s.agendaHead}>
                <span className={s.agendaNum}>วาระ {String(n.no).padStart(2, '0')}</span>
                <h2 className={s.agendaTitle}>{agendaTitle(n.no, header)}</h2>
              </div>
              {items.map((item) => <SubBlock key={item.id ?? `${item.agenda_no}-${item.item_no}`} item={item} />)}
            </div>
          </section>
        )
      })}

      {navItems.length <= 2 && subitems.length === 0 && (
        <div className={s.empty}>ยังไม่ได้บันทึกวาระเรื่องเพื่อทราบ / สืบเนื่อง / อื่นๆ สำหรับการประชุมนี้</div>
      )}

      <footer className={s.footer}>
        <p>รายงานฉบับนี้สร้างจากข้อมูลวาระและมติที่บันทึกในระบบ NRW Tracker · การประปาส่วนภูมิภาคเขต 10</p>
      </footer>
    </div>
  )
}
