import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { formatThaiMonthYear } from '@/lib/utils/date-th'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'excel'
  const type   = searchParams.get('type') ?? 'monthly'
  const year   = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month  = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (type === 'monthly' && format === 'excel') {
    const { data } = await supabase
      .from('monthly_reports')
      .select('*, branches(*)')
      .eq('report_year', year)
      .eq('report_month', month)
      .order('nrw_pct', { ascending: false })

    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      'รหัสสาขา': (r.branches as Record<string, string>)?.code ?? '',
      'ชื่อสาขา': (r.branches as Record<string, string>)?.name_th ?? '',
      'จังหวัด': (r.branches as Record<string, string>)?.province_th ?? '',
      'น้ำจ่าย (ลบ.ม.)': r.volume_distributed ?? '',
      'น้ำขาย (ลบ.ม.)': r.volume_sold ?? '',
      'น้ำสูญเสีย (ลบ.ม.)': r.volume_distributed && r.volume_sold
        ? (r.volume_distributed as number) - (r.volume_sold as number)
        : '',
      'NRW (%)': r.nrw_pct ?? '',
      'MNF ล่าสุด (ลบ.ม./ชม.)': r.mnf_latest ?? '',
      'MNF Factor': r.mnf_factor ?? '',
      'จุดรั่วพบ': r.leaks_found ?? 0,
      'ซ่อมแล้ว': r.leaks_repaired ?? 0,
      'รอดำเนินการ': r.leaks_pending ?? 0,
      'มาตรผิดปกติ': r.meters_abnormal ?? 0,
      'สถานะ': r.status ?? '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)

    // Column widths
    ws['!cols'] = [
      { wch: 8 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, `NRW ${formatThaiMonthYear(year, month)}`)
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="NRW-R10-${year}-${String(month).padStart(2, '0')}.xlsx"`,
      },
    })
  }

  if (type === 'actions' && format === 'excel') {
    const { data } = await supabase
      .from('action_items')
      .select('*, branches(*)')
      .order('due_date', { ascending: true })

    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      'รหัส': r.code,
      'สาขา': (r.branches as Record<string, string>)?.name_th ?? '',
      'หัวข้อ': r.title,
      'ผู้รับผิดชอบ': r.owner,
      'กำหนด': r.due_date ?? '',
      'สถานะ': r.status,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Action Items')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Actions-R10.xlsx"`,
      },
    })
  }

  return NextResponse.json({ error: 'Export type not supported yet' }, { status: 400 })
}
