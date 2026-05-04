'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatThaiMonthYearShort } from '@/lib/utils/date-th'

interface TrendPoint {
  label: string
  avg_nrw: number
}

export function NrwTrendChart() {
  const [data, setData] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrend() {
      const supabase = createClient()
      const now = new Date()
      const points: TrendPoint[] = []

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = d.getFullYear()
        const month = d.getMonth() + 1

        const { data: rows } = await supabase
          .from('monthly_reports')
          .select('nrw_pct')
          .eq('report_year', year)
          .eq('report_month', month)
          .not('nrw_pct', 'is', null)

        if (rows && rows.length > 0) {
          const avg = rows.reduce((s, r) => s + (r.nrw_pct ?? 0), 0) / rows.length
          points.push({ label: formatThaiMonthYearShort(year, month), avg_nrw: parseFloat(avg.toFixed(2)) })
        } else {
          points.push({ label: formatThaiMonthYearShort(year, month), avg_nrw: 0 })
        }
      }
      setData(points)
      setLoading(false)
    }
    fetchTrend()
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="h-5 w-40 bg-white/10 rounded animate-pulse mb-4" />
        <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <h3 className="text-sm font-bold text-white">แนวโน้ม NRW เฉลี่ยเขต (6 เดือน)</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: '#0b1d3a',
              border: '1px solid rgba(177,203,255,0.16)',
              borderRadius: '8px',
              color: '#f3f7ff',
            }}
            formatter={(value) => [`${Number(value).toFixed(2)}%`, 'NRW เฉลี่ย']}
          />
          <ReferenceLine y={20} stroke="rgba(74,222,128,0.4)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="avg_nrw"
            stroke="#7dd3fc"
            strokeWidth={2}
            dot={{ fill: '#7dd3fc', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-white/30 mt-2">เส้นประสีเขียว = เป้าหมาย 20%</p>
    </div>
  )
}
