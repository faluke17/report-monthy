import { NextRequest, NextResponse } from 'next/server'
import { calcNRW, calcMNFFactor, getNRWStatus } from '@/lib/utils/nrw-calc'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const distributed = parseFloat(searchParams.get('distributed') ?? '0')
  const sold        = parseFloat(searchParams.get('sold') ?? '0')
  const mnf         = parseFloat(searchParams.get('mnf') ?? '0')
  const dailySupply = parseFloat(searchParams.get('daily') ?? '0')
  const target      = parseFloat(searchParams.get('target') ?? '20')

  const nrwPct   = calcNRW(distributed, sold)
  const mnfFactor = calcMNFFactor(mnf, dailySupply)
  const status   = getNRWStatus(nrwPct, target)
  const nrwM3    = distributed - sold

  return NextResponse.json({ nrwPct, mnfFactor, nrwM3, status })
}
