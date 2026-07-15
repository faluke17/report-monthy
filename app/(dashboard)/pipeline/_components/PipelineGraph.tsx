'use client'

const MONTHS_TH = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
function fmtYM(y: number | null, m: number | null) {
  return y && m ? `${MONTHS_TH[m]} ${y}` : '—'
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}

export interface PipelineGraphProps {
  areaStats: { monthsCount: number; latestYear: number | null; latestMonth: number | null }
  nodeFlowDaily: { latestYear: number | null; latestMonth: number | null; lastSynced: string | null }
  nodeNrwMonthly: { year: number | null; month: number | null; total: number; hasFlow: number; hasDist: number; hasNrw: number }
  waterNodes: { total: number; withLogger: number; withLabel: number }
  mnfDaily: { latestDate: string | null }
  mnfEmaDaily: { date: string | null; total: number; red: number; yellow: number; green: number }
}

type Status = 'ok' | 'warn' | 'error' | 'info' | 'unknown'
type NodeType = 'external' | 'api' | 'db' | 'page'
type Side = 'left' | 'right' | 'top' | 'bottom'

interface NodePos { id: string; type: NodeType; x: number; y: number; w: number; h: number }

const NODES: NodePos[] = [
  { id: 'dmama',         type: 'external', x: 0,   y: 245, w: 165, h: 70 },
  { id: 'nrw_sync',     type: 'api',      x: 245, y: 10,  w: 195, h: 78 },
  { id: 'flow_sync',    type: 'api',      x: 245, y: 152, w: 195, h: 78 },
  { id: 'mnf_sync',     type: 'api',      x: 245, y: 310, w: 195, h: 78 },
  { id: 'nrw_area',     type: 'db',       x: 520, y: 10,  w: 200, h: 90 },
  { id: 'flow_daily',   type: 'db',       x: 520, y: 150, w: 200, h: 90 },
  { id: 'nrw_monthly',  type: 'db',       x: 520, y: 300, w: 200, h: 100 },
  { id: 'mnf_daily',    type: 'db',       x: 520, y: 445, w: 200, h: 90 },
  { id: 'mnf_ema',      type: 'db',       x: 520, y: 558, w: 200, h: 90 },
  { id: 'pdca',         type: 'page',     x: 800, y: 20,  w: 185, h: 72 },
  { id: 'water_tree',   type: 'page',     x: 800, y: 270, w: 185, h: 72 },
  { id: 'mnf_monitor',  type: 'page',     x: 800, y: 522, w: 185, h: 72 },
]

const CANVAS_W = 1010
const CANVAS_H = 668

const COLORS: Record<string, string> = {
  sky: '#0B6E76', cyan: '#0B6E76', violet: '#6B4FA0', fuchsia: '#6B4FA0',
}

const CONNS: { from: string; fs: Side; to: string; ts: Side; col: string; dashed?: boolean; label?: string }[] = [
  { from: 'dmama',      fs: 'right', to: 'nrw_sync',    ts: 'left',   col: 'sky' },
  { from: 'dmama',      fs: 'right', to: 'flow_sync',   ts: 'left',   col: 'sky' },
  { from: 'dmama',      fs: 'right', to: 'mnf_sync',    ts: 'left',   col: 'sky' },
  { from: 'nrw_sync',   fs: 'right', to: 'nrw_area',    ts: 'left',   col: 'cyan' },
  { from: 'flow_sync',  fs: 'right', to: 'flow_daily',  ts: 'left',   col: 'cyan' },
  { from: 'flow_sync',  fs: 'right', to: 'nrw_monthly', ts: 'left',   col: 'cyan', dashed: true },
  { from: 'nrw_area',   fs: 'bottom',to: 'nrw_monthly', ts: 'top',    col: 'violet', dashed: true, label: 'distribute_all' },
  { from: 'mnf_sync',   fs: 'right', to: 'mnf_daily',   ts: 'left',   col: 'cyan' },
  { from: 'mnf_daily',  fs: 'bottom',to: 'mnf_ema',     ts: 'top',    col: 'violet', label: 'mnf-ema cron' },
  { from: 'nrw_monthly',fs: 'right', to: 'pdca',        ts: 'left',   col: 'fuchsia' },
  { from: 'nrw_monthly',fs: 'right', to: 'water_tree',  ts: 'left',   col: 'fuchsia' },
  { from: 'flow_daily', fs: 'right', to: 'water_tree',  ts: 'left',   col: 'fuchsia' },
  { from: 'mnf_ema',    fs: 'right', to: 'mnf_monitor', ts: 'left',   col: 'fuchsia' },
]

function pt(id: string, side: Side): [number, number] {
  const n = NODES.find(n => n.id === id)!
  if (side === 'left')   return [n.x, n.y + n.h / 2]
  if (side === 'right')  return [n.x + n.w, n.y + n.h / 2]
  if (side === 'top')    return [n.x + n.w / 2, n.y]
  return [n.x + n.w / 2, n.y + n.h]
}

function path(x1: number, y1: number, x2: number, y2: number, fs: Side): string {
  if (fs === 'bottom') {
    const my = (y1 + y2) / 2
    return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
  }
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
}

const TYPE_BORDER: Record<NodeType, string> = {
  external: 'border-sky-500/60 bg-sky-950/60',
  api:      'border-cyan-500/40 bg-cyan-950/50',
  db:       'border-violet-500/40 bg-violet-950/50',
  page:     'border-fuchsia-500/40 bg-fuchsia-950/50',
}
const TYPE_BADGE: Record<NodeType, string> = {
  external: 'bg-sky-500/20 text-sky-400',
  api:      'bg-cyan-500/20 text-cyan-400',
  db:       'bg-violet-500/20 text-violet-400',
  page:     'bg-fuchsia-500/20 text-fuchsia-400',
}
const TYPE_LABEL: Record<NodeType, string> = {
  external: 'EXTERNAL', api: 'API', db: 'TABLE', page: 'PAGE',
}
const STATUS_DOT: Record<Status, string> = {
  ok: 'bg-emerald-400', warn: 'bg-amber-400', error: 'bg-red-400',
  info: 'bg-sky-400', unknown: 'bg-black/25',
}

interface NodeInfo {
  status: Status
  title: string
  subtitle?: string
  lines: string[]
  warn?: string
}

function getInfo(id: string, p: PipelineGraphProps): NodeInfo {
  const { areaStats: a, nodeFlowDaily: f, nodeNrwMonthly: n, waterNodes: wn, mnfDaily: md, mnfEmaDaily: ema } = p
  const distPct = n.total > 0 ? Math.round(n.hasDist / n.total * 100) : 0

  switch (id) {
    case 'dmama':
      return { status: 'info', title: 'DMAMA API', subtitle: 'dmama.pwa.co.th', lines: ['26 สาขา กปภ.เขต 10', 'NRW + Flow Rate + MNF'] }

    case 'nrw_sync':
      return {
        status: a.latestYear ? 'ok' : 'warn',
        title: '/api/dmama/sync',
        subtitle: 'Cron: ทุกวันที่ 16 / 09:00',
        lines: [`ล่าสุด: ${fmtYM(a.latestYear, a.latestMonth)}`, `ข้อมูล ${a.monthsCount} เดือน`],
      }

    case 'flow_sync':
      return {
        status: f.latestYear ? 'ok' : 'warn',
        title: '/api/dmama/flow-sync',
        subtitle: 'Manual / backfill script',
        lines: [
          `ล่าสุด: ${fmtYM(f.latestYear, f.latestMonth)}`,
          f.lastSynced ? `sync: ${fmtDate(f.lastSynced)}` : 'ยังไม่ sync',
        ],
      }

    case 'mnf_sync':
      return {
        status: md.latestDate ? 'ok' : 'unknown',
        title: '/api/dmama/mnf-sync',
        subtitle: 'Cron: ทุกวัน 03:00',
        lines: [`ล่าสุด: ${fmtDate(md.latestDate)}`],
      }

    case 'nrw_area':
      return {
        status: a.latestYear ? 'ok' : 'error',
        title: 'nrw_area_stats',
        subtitle: `${a.monthsCount} เดือน / 26 สาขา`,
        lines: [`ล่าสุด: ${fmtYM(a.latestYear, a.latestMonth)}`, 'outbound + distribute_all'],
      }

    case 'flow_daily':
      return {
        status: f.latestYear ? 'ok' : 'warn',
        title: 'node_flow_daily',
        subtitle: 'cleaned flow / node / day',
        lines: [
          `ล่าสุด: ${fmtYM(f.latestYear, f.latestMonth)}`,
          `${wn.withLogger}/${wn.total} nodes มี logger`,
        ],
      }

    case 'nrw_monthly':
      return {
        status: distPct >= 85 ? 'ok' : distPct >= 60 ? 'warn' : 'error',
        title: 'node_nrw_monthly',
        subtitle: fmtYM(n.year, n.month),
        lines: [
          `flow:  ${n.hasFlow}/${n.total} nodes`,
          `dist:  ${n.hasDist}/${n.total} (${distPct}%)`,
          `nrw%:  ${n.hasNrw}/${n.total} nodes`,
        ],
        warn: distPct < 100 ? `${n.total - n.hasDist} nodes ไม่มีน้ำขาย (manual)` : undefined,
      }

    case 'mnf_daily':
      return {
        status: md.latestDate ? 'ok' : 'unknown',
        title: 'mnf_daily',
        subtitle: 'MNF raw / logger / day',
        lines: [`ล่าสุด: ${fmtDate(md.latestDate)}`],
      }

    case 'mnf_ema':
      return {
        status: ema.date ? (ema.red > 0 ? 'warn' : 'ok') : 'unknown',
        title: 'mnf_ema_daily',
        subtitle: `ล่าสุด: ${fmtDate(ema.date)}`,
        lines: [
          `🔴 ${ema.red}  🟡 ${ema.yellow}  🟢 ${ema.green}`,
          `${ema.total} nodes`,
        ],
        warn: ema.red > 0 ? `${ema.red} node แจ้งเตือนสีแดง` : undefined,
      }

    case 'pdca':
      return {
        status: n.hasFlow > 0 ? 'ok' : 'warn',
        title: '/pdca/new',
        subtitle: 'ฟอร์มรายงานพื้นที่',
        lines: ['อ่าน node_nrw_monthly', 'pre-fill น้ำจ่าย / น้ำขาย'],
      }

    case 'water_tree':
      return {
        status: f.latestYear ? 'ok' : 'warn',
        title: '/water-tree',
        subtitle: 'ผังจ่ายน้ำ',
        lines: ['อ่าน flow_daily', 'อ่าน nrw_monthly'],
      }

    case 'mnf_monitor':
      return {
        status: ema.date ? 'ok' : 'unknown',
        title: '/mnf-monitor',
        subtitle: 'MNF EMA Alert',
        lines: ['อ่าน mnf_ema_latest (view)', `${ema.total} nodes`],
      }

    default:
      return { status: 'unknown', title: id, lines: [] }
  }
}

function NodeCard({ node, info }: { node: NodePos; info: NodeInfo }) {
  return (
    <div
      className={`absolute rounded-lg border ${TYPE_BORDER[node.type]} backdrop-blur-sm`}
      style={{ left: node.x, top: node.y, width: node.w }}
    >
      <div className="px-3 pt-2.5 pb-2">
        {/* Header row */}
        <div className="flex items-start gap-2 mb-1.5">
          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 shadow-sm ${STATUS_DOT[info.status]}`} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-black/90 leading-tight truncate">{info.title}</div>
            {info.subtitle && (
              <div className="text-[10px] text-black/40 mt-0.5 leading-tight">{info.subtitle}</div>
            )}
          </div>
          <span className={`text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${TYPE_BADGE[node.type]}`}>
            {TYPE_LABEL[node.type]}
          </span>
        </div>
        {/* Stats lines */}
        <div className="space-y-0.5 pl-4">
          {info.lines.map((line, i) => (
            <div key={i} className="text-[10px] text-black/55 font-mono leading-snug">{line}</div>
          ))}
          {info.warn && (
            <div className="text-[10px] text-amber-400/80 mt-0.5">⚠ {info.warn}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export function PipelineGraph(props: PipelineGraphProps) {
  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="relative" style={{ width: CANVAS_W, height: 18 }}>
        {[
          { x: 0, w: 165, label: 'External' },
          { x: 245, w: 195, label: 'Sync / Cron' },
          { x: 520, w: 200, label: 'Database' },
          { x: 800, w: 185, label: 'UI Pages' },
        ].map(col => (
          <div
            key={col.label}
            className="absolute text-[10px] font-bold uppercase tracking-widest text-black/25 text-center"
            style={{ left: col.x, width: col.w }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="w-full overflow-x-auto">
        <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
          {/* SVG connections */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ zIndex: 0 }}
          >
            <defs>
              {Object.entries(COLORS).map(([name, color]) => (
                <marker key={name} id={`arr-${name}`} viewBox="0 0 10 10" refX="8" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity="0.75" />
                </marker>
              ))}
            </defs>

            {CONNS.map((c, i) => {
              const [x1, y1] = pt(c.from, c.fs)
              const [x2, y2] = pt(c.to, c.ts)
              const d = path(x1, y1, x2, y2, c.fs)
              const color = COLORS[c.col]
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray={c.dashed ? '5 3' : undefined}
                    strokeOpacity={0.5}
                    markerEnd={`url(#arr-${c.col})`}
                  />
                  {c.label && (() => {
                    const mx = (x1 + x2) / 2
                    const my = (y1 + y2) / 2
                    return (
                      <text x={mx} y={my - 4} textAnchor="middle"
                        fontSize="8" fill={color} opacity="0.55" fontFamily="monospace">
                        {c.label}
                      </text>
                    )
                  })()}
                </g>
              )
            })}
          </svg>

          {/* Node cards */}
          {NODES.map(node => (
            <NodeCard key={node.id} node={node} info={getInfo(node.id, props)} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-black/40 pt-1 border-t border-black/8">
        <div className="flex items-center gap-1.5">
          <span className="text-black/50 font-semibold">สถานะ:</span>
        </div>
        {[
          { color: 'bg-emerald-400', label: 'OK' },
          { color: 'bg-amber-400',   label: 'บางส่วน' },
          { color: 'bg-red-400',     label: 'ผิดปกติ' },
          { color: 'bg-sky-400',     label: 'External' },
          { color: 'bg-black/25',    label: 'ไม่ทราบ' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span>{label}</span>
          </div>
        ))}
        <div className="ml-4 flex items-center gap-1.5">
          <span className="text-black/50 font-semibold">เส้น:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#0B6E76" strokeWidth="1.5" /></svg>
          <span>primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#6B4FA0" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          <span>secondary / dependency</span>
        </div>
      </div>
    </div>
  )
}
