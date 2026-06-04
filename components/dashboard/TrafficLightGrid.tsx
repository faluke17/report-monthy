import { MonthlyReport, Branch } from '@/lib/types'

interface TrafficLightGridProps {
  reports:    MonthlyReport[]
  branches:   Branch[]
  targetNrw?: number
}

type Light = 'green' | 'yellow' | 'red' | 'grey'

const LIGHT_CFG: Record<Light, { dot: string; bg: string; border: string; text: string; label: string; glow: string }> = {
  green:  { dot: '#4ADE80', bg: 'rgba(74,222,128,.12)',   border: 'rgba(74,222,128,.35)',  text: '#4ADE80', label: 'ลดได้ตามเป้า',   glow: 'rgba(74,222,128,.45)' },
  yellow: { dot: '#FCD34D', bg: 'rgba(252,211,77,.12)',   border: 'rgba(252,211,77,.35)',  text: '#FCD34D', label: 'ต้องติดตาม',     glow: 'rgba(252,211,77,.45)' },
  red:    { dot: '#F87171', bg: 'rgba(248,113,113,.12)',  border: 'rgba(248,113,113,.35)', text: '#F87171', label: 'ไม่ลด / ต้อง Act', glow: 'rgba(248,113,113,.45)' },
  grey:   { dot: '#3D5380', bg: 'rgba(255,255,255,.04)',  border: 'rgba(71,130,255,.14)',  text: '#4A6189', label: 'ยังไม่ส่งข้อมูล', glow: 'transparent' },
}

export function TrafficLightGrid({ reports, branches, targetNrw = 20 }: TrafficLightGridProps) {
  function getLight(branchId: string): Light {
    const r = reports.find(r => r.branch_id === branchId)
    if (!r || r.nrw_pct === null) return 'grey'
    if (r.nrw_pct <= targetNrw)     return 'green'
    if (r.nrw_pct <= targetNrw + 3) return 'yellow'
    return 'red'
  }

  const counts: Record<Light, number> = {
    green:  branches.filter(b => getLight(b.id) === 'green').length,
    yellow: branches.filter(b => getLight(b.id) === 'yellow').length,
    red:    branches.filter(b => getLight(b.id) === 'red').length,
    grey:   branches.filter(b => getLight(b.id) === 'grey').length,
  }

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full" style={{ background: '#4782FF', boxShadow: '0 0 6px rgba(71,130,255,.60)' }} />
        <h3 className="text-[13px] font-semibold" style={{ color: '#E4ECFF' }}>
          Traffic Light — สถานะสาขา
        </h3>
      </div>

      {/* 4 status cells */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(Object.entries(LIGHT_CFG) as [Light, typeof LIGHT_CFG[Light]][]).map(([key, cfg]) => (
          <div
            key={key}
            className="rounded-xl border py-3.5 text-center relative overflow-hidden"
            style={{ background: cfg.bg, borderColor: cfg.border }}
          >
            <div
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{ background: cfg.dot, boxShadow: key !== 'grey' ? `0 0 6px ${cfg.glow}` : 'none' }}
            />
            <div
              className="text-[28px] font-bold leading-none"
              style={{ color: cfg.text, fontFamily: 'var(--font-mono)', textShadow: key !== 'grey' ? `0 0 20px ${cfg.glow}` : 'none' }}
            >
              {counts[key]}
            </div>
            <div className="text-[10px] mt-1.5 font-semibold" style={{ color: cfg.text, opacity: .80 }}>
              {cfg.label}
            </div>
          </div>
        ))}
      </div>

      {/* Branch dots grid */}
      <div className="flex flex-wrap gap-1.5">
        {branches.map((branch) => {
          const light = getLight(branch.id)
          const cfg   = LIGHT_CFG[light]
          return (
            <div
              key={branch.id}
              title={`${branch.name_th} (${branch.code})`}
              className="w-8 h-8 rounded-lg border text-[9px] flex items-center justify-center font-bold transition-transform hover:scale-110 cursor-default"
              style={{
                background: cfg.bg,
                borderColor: cfg.border,
                color: cfg.text,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {branch.code.slice(0, 3)}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] mt-3" style={{ color: '#243254', fontFamily: 'var(--font-mono)' }}>
        ดี ≤ {targetNrw}% · เตือน ≤ {targetNrw + 3}% · ไม่ดี &gt; {targetNrw + 3}%
      </p>
    </div>
  )
}
