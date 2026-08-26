'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Trophy, type LucideIcon } from 'lucide-react'
import { formatThaiMonthYear, formatThaiNumber } from '@/lib/utils/date-th'
import type { TopWaterSavedResult } from '@/app/actions/nrw-report'

const TEAL = '#0B6E76'
const AIA_RED = '#B3392C'

interface NewsScoop {
  key:        string
  /** ไอคอนเส้น (ใช้ได้ถ้าไม่มี avatarSrc) */
  icon?:      LucideIcon
  /** รูปจริง (เช่น รูปโปรไฟล์) — ถ้าใส่จะโชว์แทนไอคอนเส้น */
  avatarSrc?: string
  label:      string
  message:    string
  /** คำ/วลีในข้อความที่อยากเน้นให้เด่น (ตัวหนา + สีของสกู๊ปนี้) เพื่อให้อ่านจับใจความง่ายขึ้น */
  emphasis?:  string[]
  color:      string
}

function renderMessage(message: string, emphasis: string[] | undefined, color: string) {
  if (!emphasis || emphasis.length === 0) return message
  const escaped = emphasis.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = message.split(new RegExp(`(${escaped.join('|')})`, 'g'))
  return parts.map((part, i) =>
    emphasis.includes(part)
      ? <b key={i} style={{ color, fontWeight: 700 }}>{part}</b>
      : <span key={i}>{part}</span>
  )
}

interface SidebarStatsTickerProps {
  /** เดือน/ปีล่าสุดที่มีข้อมูล NRW ระดับสาขา+DMA จริงใน DB (จาก nrw_area_stats) ใช้โชว์ในสกู๊ปแรก */
  latestNrwDataPeriod: { year: number; month: number } | null
  /** 3 สาขาที่ลดปริมาณน้ำสูญเสียได้มากที่สุดในปีงบล่าสุด (จาก nrw_branch_monthly) ใช้โชว์ในสกู๊ปที่ 2 */
  topWaterSaved:       TopWaterSavedResult | null
}

function fallbackLastMonth() {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function SidebarStatsTicker({ latestNrwDataPeriod, topWaterSaved }: SidebarStatsTickerProps) {
  const period = latestNrwDataPeriod ?? fallbackLastMonth()
  const monthLabel = formatThaiMonthYear(period.year, period.month)

  // สกู๊ปข่าว — เพิ่มทีละสกู๊ปตามที่ผู้ใช้กำหนดเนื้อหา
  const slides: NewsScoop[] = [
    {
      key: 'update-notice',
      icon: Megaphone,
      label: 'ประกาศอัปเดตข้อมูล',
      message: `ข้อมูลน้ำสูญเสียระดับ สาขา และ DMA ประจำเดือน ${monthLabel} ได้ทำการอัปเดตแล้วนะครับ หากพบปัญหาหรือสงสัยให้ติดต่อ กรจ.ได้เลย`,
      emphasis: [monthLabel, 'กรจ.'],
      color: TEAL,
    },
  ]

  if (topWaterSaved && topWaterSaved.branches.length > 0) {
    const names = topWaterSaved.branches.map(b => b.branch_name)
    const totalSaved = topWaterSaved.branches.reduce((s, b) => s + b.savedVolume, 0)
    const roundedTotal = Math.floor(totalSaved / 10000) * 10000
    const totalLabel = `${formatThaiNumber(roundedTotal, 0)} ลบ.ม./เดือน`

    // แต่ละสาขาขึ้นบรรทัดของตัวเอง กันตัด/พันบรรทัดมั่วตรงกลางชื่อสาขา
    const lines = [
      ...names.map(n => `- สาขา${n}`),
      `ลดน้ำสูญเสียรวมกว่า ${totalLabel} (ปีงบ ${topWaterSaved.fiscalYear})`,
    ]

    slides.push({
      key: 'top-water-saved',
      icon: Trophy,
      label: 'สาขาลดน้ำสูญเสียมากที่สุด',
      message: lines.join('\n'),
      emphasis: [...names, totalLabel],
      color: TEAL,
    })
  }

  slides.push({
    key: 'fluke-aia',
    avatarSrc: '/scoop-fluke-avatar.jpg',
    label: 'นอกเวลางาน',
    message: [
      'ตัวแทนประกัน AIA',
      'ดูแลด้วยใจ จริงใจทุกเคส',
      'Line:ilingfluke',
      'Phone:098-248-9362',
    ].join('\n'),
    emphasis: ['AIA', 'ilingfluke', '098-248-9362'],
    color: AIA_RED,
  })

  const [index, setIndex] = useState(0)
  const isRotating = slides.length > 1

  useEffect(() => {
    if (!isRotating) return
    const t = setTimeout(() => setIndex(i => (i + 1) % slides.length), 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isRotating])

  // กันกรณีจำนวนสกู๊ปลดลงระหว่างทาง (index ค้างเกินขอบเขต)
  const safeIndex = index % slides.length
  const slide = slides[safeIndex]
  const Icon = slide.icon

  return (
    <div
      className="mx-3 my-3 rounded-xl shrink-0 overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E3E7EC',
        boxShadow: '0 1px 2px rgba(18,24,31,.04)',
      }}
    >
      {/* Eyebrow */}
      <div className="flex items-center gap-1.5 px-3.5 pt-4">
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="sidebar-ticker-livedot absolute inline-flex h-full w-full rounded-full"
            style={{ background: '#B3392C' }}
          />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#B3392C' }} />
        </span>
        <span
          className="text-[10px] uppercase tracking-[.14em]"
          style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)' }}
        >
          News
        </span>
      </div>

      {/* Slide */}
      <div key={slide.key} className="sidebar-ticker-slide flex items-start gap-3 px-3.5 pt-3 pb-3.5 min-h-[96px]">
        {slide.avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.avatarSrc}
            alt=""
            className="w-11 h-11 rounded-xl object-cover shrink-0"
            style={{ border: `1.5px solid ${slide.color}40` }}
          />
        ) : (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
            style={{ background: `${slide.color}1A` }}
          >
            {Icon && <Icon size={21} style={{ color: slide.color }} />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] mb-1 uppercase tracking-[.10em]"
            style={{ color: '#98A2AF', fontFamily: 'var(--font-mono)' }}
          >
            {slide.label}
          </p>
          {slide.message.split('\n').map((line, i) => (
            <p
              key={i}
              className="text-[12.5px]"
              style={{ color: '#333D49', lineHeight: 1.5, letterSpacing: '.005em', marginTop: i > 0 ? '3px' : 0 }}
            >
              {renderMessage(line, slide.emphasis, slide.color)}
            </p>
          ))}
        </div>
      </div>

      {isRotating && (
        <>
          {/* Progress rail */}
          <div className="h-[3px] mx-3.5 mb-3.5 rounded-full overflow-hidden" style={{ background: '#EFF2F5' }}>
            <div key={slide.key} className="sidebar-ticker-progress h-full rounded-full" style={{ background: slide.color }} />
          </div>

          {/* Dots */}
          <div className="flex items-center gap-1.5 px-3.5 pb-4">
            {slides.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setIndex(i)}
                aria-label={s.label}
                className="h-[7px] rounded-full transition-all duration-300"
                style={{
                  width: i === safeIndex ? '18px' : '7px',
                  background: i === safeIndex ? slide.color : '#E3E7EC',
                }}
              />
            ))}
          </div>
        </>
      )}
      {!isRotating && <div className="pb-4" />}

      <style>{`
        @keyframes sidebarTickerSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sidebar-ticker-slide {
          animation: sidebarTickerSlideIn .45s ease;
        }
        @keyframes sidebarTickerProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .sidebar-ticker-progress {
          animation: sidebarTickerProgress 5s linear;
        }
        @keyframes sidebarTickerPing {
          0%   { transform: scale(1); opacity: .8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .sidebar-ticker-livedot {
          animation: sidebarTickerPing 1.6s cubic-bezier(0,0,.2,1) infinite;
        }
      `}</style>
    </div>
  )
}
