import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPwaSession } from '@/lib/pwa-auth'

// GET /api/rats/stats?year_be=2569&month=5
export async function GET(req: NextRequest) {
  const session = await getPwaSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year_be = Number(searchParams.get('year_be'))
  const month = Number(searchParams.get('month'))

  if (!year_be || !month) return NextResponse.json({ error: 'ต้องส่ง year_be และ month' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('branch_read_stats')
    .select('ba, read_count, cust_count, target')
    .eq('year_be', year_be)
    .eq('month', month)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, rows: data ?? [] })
}
