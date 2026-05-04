'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Branch } from '@/lib/types'

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('province_th')
      .then(({ data }) => {
        setBranches(data ?? [])
        setLoading(false)
      })
  }, [])

  return { branches, loading }
}
