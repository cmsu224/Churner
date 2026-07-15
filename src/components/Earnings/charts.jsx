import { fmt$ } from '../../utils/format'

// Hand-rolled SVG stacked-bar chart: realized bonuses per month, last 24
// months, stacked by member. Member color is the household's existing
// identity channel (same hex used by PlayerBadge everywhere else in the
// app) — not a new categorical palette, so it intentionally reuses those
// hexes rather than the generic dataviz categorical ramp.

const WIDTH = 760
const HEIGHT = 190
const MARGIN = { top: 12, right: 8, bottom: 24, left: 44 }
const BAR_MAX = 24 // mark spec: bars are never thicker than 24px
const SEG_GAP = 1 // half of the 2px surface gap between stacked segments
const CAP_RADIUS = 4

function niceMax(value) {
  if (!(value > 0)) return 100
  const exp = Math.floor(Math.log10(value))
  const base = 10 ** exp
  const norm = value / base
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return niceNorm * base
}

function fmtAxis(v) {
  if (v === 0) return '$0'
  if (v >= 1000) return `$${Math.round(v / 1000)}K`
  return `$${Math.round(v)}`
}

// Rounded-top / square-bottom rect path — the mark spec's "4px rounded
// data-end, square at the baseline", used only for the topmost segment of
// each stacked bar (every other segment, and the true baseline, stay square).
function roundedTopRectPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, h, w / 2))
  if (rr === 0) return `M${x},${y} h${w} v${h} h${-w} Z`
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

export default function MonthlyEarningsChart({ monthly, members }) {
  const total = monthly.reduce((s, m) => s + m.total, 0)
  const rawMax = Math.max(0, ...monthly.map(m => m.total))
  const max = niceMax(rawMax)
  const tickCount = 4
  const chartW = WIDTH - MARGIN.left - MARGIN.right
  const chartH = HEIGHT - MARGIN.top - MARGIN.bottom
  const baselineY = MARGIN.top + chartH
  const n = monthly.length
  const slot = chartW / n
  const barW = Math.min(BAR_MAX, slot - 4)

  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (max / tickCount) * i)

  // Label every 3rd month, always including the most recent one.
  const lastIdx = n - 1
  const labeledIndices = new Set(monthly.map((_, i) => i).filter(i => (lastIdx - i) % 3 === 0))

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Realized bonuses by month over the last 24 months, totaling ${fmt$(total)}`}
        className="overflow-visible"
      >
        {/* gridlines + y-axis labels */}
        {ticks.map((t, i) => {
          const y = baselineY - (max > 0 ? (t / max) * chartH : 0)
          return (
            <g key={i}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} className="stroke-edge" strokeWidth="1" />
              <text x={MARGIN.left - 8} y={y + 3} textAnchor="end" className="fill-ink-tertiary" style={{ fontSize: 10 }}>
                {fmtAxis(t)}
              </text>
            </g>
          )
        })}

        {/* bars */}
        {monthly.map((bucket, i) => {
          const x = MARGIN.left + i * slot + (slot - barW) / 2
          const entries = members
            .map(m => ({ member: m, value: bucket.byMember[m.id] ?? 0 }))
            .filter(e => e.value > 0)
          const [yy, mm] = bucket.ym.split('-')
          const monthTitle = new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

          let cumulative = 0
          const segments = entries.map((e, idx) => {
            const segH = max > 0 ? (e.value / max) * chartH : 0
            const y = baselineY - cumulative - segH
            cumulative += segH
            return { ...e, y, segH, isTop: idx === entries.length - 1 }
          })

          return (
            <g key={bucket.ym}>
              {/* bigger invisible hit target + whole-column tooltip */}
              {bucket.total > 0 && (
                <rect
                  x={x - 2} y={MARGIN.top} width={barW + 4} height={chartH}
                  fill="transparent"
                >
                  <title>{`${monthTitle} total: ${fmt$(bucket.total)}`}</title>
                </rect>
              )}
              {segments.map(seg => {
                const topInset = seg.isTop ? 0 : SEG_GAP
                const bottomInset = seg.y + seg.segH < baselineY ? SEG_GAP : 0
                const drawY = seg.y + topInset
                const drawH = Math.max(0, seg.segH - topInset - bottomInset)
                const label = `${seg.member.name} — ${monthTitle}: ${fmt$(seg.value)}`
                return seg.isTop ? (
                  <path key={seg.member.id} d={roundedTopRectPath(x, drawY, barW, drawH, CAP_RADIUS)} fill={seg.member.hex} className="transition-opacity hover:opacity-80">
                    <title>{label}</title>
                  </path>
                ) : (
                  <rect key={seg.member.id} x={x} y={drawY} width={barW} height={drawH} fill={seg.member.hex} className="transition-opacity hover:opacity-80">
                    <title>{label}</title>
                  </rect>
                )
              })}
              {labeledIndices.has(i) && (
                <text x={x + barW / 2} y={baselineY + 16} textAnchor="middle" className="fill-ink-tertiary" style={{ fontSize: 10 }}>
                  {bucket.label}
                </text>
              )}
            </g>
          )
        })}

        <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={baselineY} y2={baselineY} className="stroke-edge-strong" strokeWidth="1" />
      </svg>

      {/* legend — direct identity channel, member hex matches PlayerBadge app-wide */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1">
        {members.map(m => (
          <span key={m.id} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.hex }} />
            <span className="text-xs text-ink-secondary">{m.name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
