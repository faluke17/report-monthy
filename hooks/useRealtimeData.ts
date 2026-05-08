'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MonthlyReport, ActionItem, Meeting } from '@/lib/types'

// ─── Monthly Reports (Dashboard realtime) ───────────────────
export function useRealtimeMonthlyReports(year: number, month: number) {
  const [data, setData] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('monthly_reports')
      .select('*, branches(*), plans(baseline_nrw, target_nrw, baseline_mnf)')
      .eq('report_year', year)
      .eq('report_month', month)
      .order('nrw_pct', { ascending: false })
    setData((rows as MonthlyReport[]) ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetch()
    const supabase = createClient()
    const channel = supabase
      .channel(`monthly-reports-${year}-${month}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_reports' },
        () => fetch()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { data, loading, refetch: fetch }
}

// ─── Action Items (My actions realtime) ──────────────────────
export function useRealtimeActionItems(branchId?: string | null) {
  const [data, setData] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('action_items')
      .select('*, branches(*), obstacles(*)')
      .order('due_date', { ascending: true })

    if (branchId) query = query.eq('branch_id', branchId)

    const { data: rows } = await query
    setData((rows as ActionItem[]) ?? [])
    setLoading(false)
  }, [branchId])

  useEffect(() => {
    fetch()
    const supabase = createClient()
    const channel = supabase
      .channel(`action-items-${branchId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'action_items' },
        () => fetch()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { data, loading, refetch: fetch }
}

// ─── RATS Branch Read Stats (Dashboard realtime) ─────────────
interface BranchReadStat {
  ba: number
  read_count: number
  cust_count: number
  target: number
}

export function useRealtimeBranchReadStats(yearBe: number, month: number) {
  const [data, setData] = useState<BranchReadStat[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchFromDB = useCallback(async () => {
    try {
      const res = await fetch(`/api/rats/stats?year_be=${yearBe}&month=${month}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.rows ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [yearBe, month])

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch('/api/rats/refresh', { method: 'POST' })
    } finally {
      setSyncing(false)
      fetchFromDB()
    }
  }, [fetchFromDB])

  useEffect(() => {
    fetchFromDB()
    triggerSync()
  }, [fetchFromDB, triggerSync])

  return { data, loading, syncing, refetch: fetchFromDB }
}

// ─── Meetings (Banner realtime) ───────────────────────────────
export function useRealtimeMeetings() {
  const [data, setData] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('meetings')
      .select('*')
      .eq('status', 'กำหนดแล้ว')
      .gte('scheduled_date', new Date(Date.now() + 7 * 3600 * 1000).toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
    setData((rows as Meeting[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const supabase = createClient()
    const channel = supabase
      .channel('meetings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => fetch()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { data, loading, upcomingMeeting: data[0] ?? null }
}
