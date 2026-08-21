import { useEffect, useMemo, useState } from 'react'
import { nodeLabel, layoutColumns, canMove } from '../../engines/moneyFlow'
import { fmt$0 } from '../../utils/format'
import {
  Landmark, Wallet, Home, AlertTriangle, EyeOff, Move, Check,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react'

// The picture: where every dollar currently sits, and every push connecting
// the two sides. Cash sources on the left, churned bank accounts on the right,
// one ribbon per source→destination pair.
//
// Ribbons are SVG; the node cards are ordinary HTML positioned on top of them,
// so names truncate, hover states work, and the theme tokens apply the same way
// they do everywhere else. Landed money is a solid ribbon, money still in
// flight is a marching dashed one — that split IS the pipeline view.

// Two column widths: the roomy one, and a compact one that makes the whole map
// fit a phone without sideways scrolling. 132 + 74 + 132 = 338px, inside the
// 358px a 390px-wide phone leaves after the page gutters.
const SIZES = {
  wide:    { NODE_W: 196, NODE_H: 74, ROW_GAP: 12, COL_GAP: 168 },
  compact: { NODE_W: 132, NODE_H: 74, ROW_GAP: 10, COL_GAP: 74 },
}
// Arranging trades ribbon room for control room: taller cards, and on a phone
// wider ones over a tighter gutter, so every arrow clears a comfortable tap
// target. 164 + 28 + 164 = 356px still fits a 390px screen without scrolling.
const ARRANGE_SIZES = {
  wide:    { NODE_W: 196, NODE_H: 104, ROW_GAP: 12, COL_GAP: 168 },
  compact: { NODE_W: 164, NODE_H: 104, ROW_GAP: 10, COL_GAP: 28 },
}
const PAD_Y = 8

const PURPOSE_STROKE = {
  dd: 'stroke-accent',
  fund: 'stroke-warning',
  return: 'stroke-success',
  other: 'stroke-ink-faint',
}

const TONE_RING = {
  danger: 'border-danger/50',
  warning: 'border-warning/50',
  success: 'border-success/50',
  accent: 'border-accent/40',
  closed: 'border-edge',
}

const TONE_TEXT = {
  danger: 'text-danger-ink',
  warning: 'text-warning-ink',
  success: 'text-success-ink',
  accent: 'text-accent-ink',
  closed: 'text-ink-tertiary',
}

// One ribbon can carry several pushes with different intents; the most common
// one colors it, with a sweep home winning ties because that's the direction
// worth spotting.
function dominantPurpose(purposes) {
  if (!purposes?.length) return 'other'
  if (purposes.includes('return')) return 'return'
  if (purposes.includes('dd')) return 'dd'
  if (purposes.includes('fund')) return 'fund'
  return purposes[0]
}

function ribbonPath(x1, y1, x2, y2) {
  const dx = Math.max(48, Math.abs(x2 - x1) * 0.55)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

function MoveButton({ icon: Icon, label, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex-1 flex items-center justify-center h-9 rounded-md bg-raised border border-edge-strong text-ink-muted hover:text-ink hover:bg-overlay disabled:opacity-25 disabled:pointer-events-none transition-colors"
    >
      <Icon size={16} />
    </button>
  )
}

function NodeCard({ node, size, compact, arranging, moves, inflightIn, selected, dimmed, onActivate, onPushTo, onSweep, onMove, onSetHub }) {
  const Icon = node.kind === 'source' ? (node.isHub ? Home : Wallet) : Landmark
  const ring = selected ? 'border-accent shadow-pop' : (TONE_RING[node.tone] ?? 'border-edge')
  const hasBalance = node.balance != null
  const height = size.NODE_H

  // While arranging, the card stops being a way into the ledger and becomes the
  // thing being moved — so the whole body is controls, not a button.
  if (arranging) {
    return (
      <div
        className={`absolute rounded-xl border bg-surface shadow-card ${node.isHub ? 'border-accent' : 'border-edge-strong'}`}
        style={{ left: node.x, top: node.y, width: size.NODE_W, height }}
      >
        <div className="px-2 pt-1.5 flex items-center gap-1.5 min-w-0">
          <Icon size={12} className="text-ink-tertiary flex-shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-ink truncate">{node.name}</span>
          {node.isHub && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-accent-ink bg-accent/10 rounded px-1 py-px flex-shrink-0">
              Hub
            </span>
          )}
        </div>
        <div className="px-2 pt-1.5 flex items-center gap-1">
          <MoveButton icon={ChevronLeft}  label={`Move ${node.name} to the left column`}  disabled={!moves.left}  onClick={() => onMove(node.key, 'left')} />
          <MoveButton icon={ChevronUp}    label={`Move ${node.name} up`}                  disabled={!moves.up}    onClick={() => onMove(node.key, 'up')} />
          <MoveButton icon={ChevronDown}  label={`Move ${node.name} down`}                disabled={!moves.down}  onClick={() => onMove(node.key, 'down')} />
          <MoveButton icon={ChevronRight} label={`Move ${node.name} to the right column`} disabled={!moves.right} onClick={() => onMove(node.key, 'right')} />
        </div>
        <div className="px-2 pt-1.5">
          <button
            type="button"
            onClick={() => onSetHub(node.key)}
            disabled={node.isHub}
            className={`w-full flex items-center justify-center gap-1 h-7 rounded-md text-[11px] font-semibold border transition-colors ${
              node.isHub
                ? 'bg-accent/10 text-accent-ink border-accent/30'
                : 'bg-raised text-ink-muted border-edge-strong hover:text-ink hover:bg-overlay'
            }`}
          >
            {node.isHub ? <><Check size={11} />Main hub</> : <><Home size={11} />Set as hub</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`absolute rounded-xl border bg-surface shadow-card transition-all ${ring} ${dimmed ? 'opacity-35' : 'opacity-100'}`}
      style={{ left: node.x, top: node.y, width: size.NODE_W, height }}
    >
      {/* Read aloud, the card's own text is a run of numbers and fragments, so
          the button carries a written-out label instead. */}
      <button
        onClick={() => onActivate(node)}
        className="w-full h-full text-left px-2.5 py-2 flex flex-col justify-between focus:outline-none focus-visible:rounded-xl"
        aria-pressed={compact ? undefined : selected}
        aria-label={[
          nodeLabel(node),
          hasBalance ? fmt$0(node.balance) : 'balance not tracked',
          node.isHub ? 'main hub' : null,
          node.label,
          inflightIn > 0 ? `${fmt$0(inflightIn)} in flight toward it` : null,
          compact ? 'move money or see its transfers' : 'filter the ledger',
        ].filter(Boolean).join(' — ')}
        title={`${nodeLabel(node)} — tap to ${compact ? 'move money or see its transfers' : 'filter the ledger'}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Icon size={13} className={`flex-shrink-0 ${TONE_TEXT[node.tone] ?? 'text-ink-tertiary'}`} aria-hidden="true" />
          <span className="text-xs font-semibold text-ink truncate">{node.name}</span>
          {node.isHub && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-accent-ink bg-accent/10 rounded px-1 py-px flex-shrink-0">
              Hub
            </span>
          )}
        </span>
        <span className="flex items-end justify-between gap-1">
          <span className="min-w-0">
            <span className={`block text-sm font-bold tabular-nums ${hasBalance ? 'text-ink' : 'text-ink-faint'}`}>
              {hasBalance ? fmt$0(node.balance) : 'not tracked'}
            </span>
            <span className={`block text-[10px] truncate ${TONE_TEXT[node.tone] ?? 'text-ink-tertiary'}`}>
              {node.label ?? node.sublabel ?? ''}
            </span>
          </span>
          {inflightIn > 0 && (
            <span className="text-[10px] font-semibold text-accent-ink bg-accent/10 rounded-full px-1.5 py-px whitespace-nowrap flex-shrink-0">
              +{fmt$0(inflightIn)}
            </span>
          )}
        </span>
      </button>
      {/* Pointer-sized shortcuts that prefill the typed bar. Hidden on a phone,
          where they'd be a 9px tap target and the node itself opens the sheet
          that does the same two things with room to press them. */}
      {!compact && (
      <div className="absolute -bottom-2 left-2 flex gap-1">
        {node.kind === 'account' && (node.balance ?? 0) > 0 && (
          <button
            onClick={() => onSweep(node)}
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-success/15 text-success-ink border border-success/30 hover:bg-success/25 transition-colors"
          >
            Send home
          </button>
        )}
        <button
          onClick={() => onPushTo(node)}
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-raised text-ink-muted border border-edge-strong hover:text-ink transition-colors"
        >
          Push here
        </button>
      </div>
      )}
    </div>
  )
}

export default function FlowDiagram({ map, cardLayout, selectedKey, onSelect, onOpenSheet, onPushTo, onSweep, onMove, onResetLayout, onSetHub }) {
  const { sources, accounts, edges, perNode, totals } = map
  // Same breakpoint idea as AppShell's sidebar switch: read the viewport, not
  // the element, so the map picks its column widths before it first paints.
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setCompact(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const [showQuiet, setShowQuiet] = useState(false)
  const [arranging, setArranging] = useState(false)
  const size = (arranging ? ARRANGE_SIZES : SIZES)[compact ? 'compact' : 'wide']

  // A closed account with no balance and no transfer history has nothing to
  // draw and nothing to do — after a year of churning those would otherwise be
  // most of the column. Everything else stays, including brand-new accounts
  // with a zero balance: those are exactly the ones you're about to push to.
  const { quiet, shownAccounts } = useMemo(() => {
    const quiet = accounts.filter(n => n.status === 'Closed' && !(n.balance ?? 0) && !(perNode.get(n.key)?.transfers ?? 0))
    const quietKeys = new Set(quiet.map(n => n.key))
    return { quiet, shownAccounts: showQuiet ? accounts : accounts.filter(n => !quietKeys.has(n.key)) }
  }, [accounts, perNode, showQuiet])

  const layout = useMemo(() => {
    // Column placement and order come from the engine, so your arrangement and
    // the automatic fallback are decided in exactly one place.
    const { left, right } = layoutColumns([...sources, ...shownAccounts], cardLayout)

    const nodeH = size.NODE_H
    const rowH = nodeH + size.ROW_GAP
    const leftH = left.length * rowH
    const rightH = right.length * rowH
    const height = Math.max(leftH, rightH, rowH) + PAD_Y * 2
    const rightX = size.NODE_W + size.COL_GAP

    // Short columns are centred against the tall one so the ribbons fan out
    // from the middle instead of all bunching at the top.
    const place = (list, x, colH) => {
      const offset = PAD_Y + Math.max(0, (height - PAD_Y * 2 - colH) / 2)
      return list.map((n, i) => ({ ...n, x, y: offset + i * rowH }))
    }

    const placed = [...place(left, 0, leftH), ...place(right, rightX, rightH)]
    const positions = new Map(placed.map(n => [n.key, n]))
    return { nodes: placed, positions, width: rightX + size.NODE_W, height, nodeH }
  }, [sources, shownAccounts, size, cardLayout])

  // On a phone the node IS the entry point: tapping opens the move-money sheet,
  // which offers filtering as its third option. With a pointer, tapping filters
  // straight away and the hover shortcuts handle the moves.
  const activate = (n) => (compact ? onOpenSheet(n) : onSelect(n.key))

  // Which arrows a card can offer, computed against the same node set the map
  // is actually drawing — so a hidden closed account can't be moved "past".
  const arrangeable = [...sources, ...shownAccounts]
  const moveOptions = (key) => ({
    up: canMove(arrangeable, cardLayout, key, 'up'),
    down: canMove(arrangeable, cardLayout, key, 'down'),
    left: canMove(arrangeable, cardLayout, key, 'left'),
    right: canMove(arrangeable, cardLayout, key, 'right'),
  })

  const maxEdge = Math.max(1, ...edges.map(e => e.total))
  const strokeFor = (amount) => 1.5 + 7 * Math.sqrt(Math.max(0, amount) / maxEdge)

  const drawn = edges.map(e => {
    const from = layout.positions.get(e.from)
    const to = layout.positions.get(e.to)
    if (!from || !to) return null
    // A ribbon leaves the right edge of a left-column node and enters the left
    // edge of a right-column one; a sweep home runs the other way.
    const forward = from.x < to.x
    const x1 = forward ? from.x + size.NODE_W : from.x
    const x2 = forward ? to.x : to.x + size.NODE_W
    const y1 = from.y + layout.nodeH / 2
    const y2 = to.y + layout.nodeH / 2
    const active = !selectedKey || selectedKey === e.from || selectedKey === e.to
    return {
      ...e,
      d: ribbonPath(x1, y1, x2, y2),
      mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
      color: PURPOSE_STROKE[dominantPurpose(e.purposes)] ?? PURPOSE_STROKE.other,
      active,
    }
  }).filter(Boolean)

  if (layout.nodes.length === 0) return null

  return (
    <div className="bg-surface border border-edge rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-edge flex-wrap">
        <h2 className="text-sm font-semibold text-ink flex items-center flex-wrap gap-x-2">
          <span>Where the money is</span>
          <button
            onClick={() => setArranging(a => !a)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md border transition-colors ${
              arranging
                ? 'bg-accent/15 text-accent-ink border-accent/40'
                : 'bg-raised text-ink-tertiary border-edge-strong hover:text-ink'
            }`}
          >
            {arranging ? <Check size={11} aria-hidden="true" /> : <Move size={11} aria-hidden="true" />}
            {arranging ? 'Done' : 'Arrange'}
          </button>
          {arranging && Object.keys(cardLayout ?? {}).length > 0 && (
            <button onClick={onResetLayout} className="text-[11px] font-normal text-ink-tertiary hover:text-ink-secondary transition-colors">
              Reset to automatic
            </button>
          )}
          {!arranging && quiet.length > 0 && (
            <button
              onClick={() => setShowQuiet(v => !v)}
              className="ml-2 inline-flex items-center gap-1 text-[11px] font-normal text-ink-tertiary hover:text-ink-secondary transition-colors align-middle"
            >
              <EyeOff size={11} aria-hidden="true" />
              {showQuiet ? `hide ${quiet.length} closed & empty` : `${quiet.length} closed & empty hidden`}
            </button>
          )}
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-ink-tertiary flex-wrap">
          <span className="flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" className="stroke-ink-faint" strokeWidth="3" /></svg>
            Landed
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" className="stroke-accent flow-inflight" strokeWidth="3" /></svg>
            In flight
          </span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" />Direct deposit</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" />Funding</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />Sweep home</span>
        </div>
      </div>

      {/* Dozens of accounts make the map taller than the screen, never wider —
          the columns are fixed, so only a narrow phone scrolls sideways. */}
      <div className="overflow-x-auto">
        <div
          className="relative mx-auto my-4"
          style={{ width: layout.width, height: layout.height, minWidth: layout.width }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            {drawn.map(e => (
              <g key={e.id} className={e.active ? 'opacity-100' : 'opacity-15'}>
                {e.landed > 0 && (
                  <path d={e.d} fill="none" className={e.color} strokeWidth={strokeFor(e.landed)} strokeOpacity="0.45" strokeLinecap="round" />
                )}
                {e.inflight > 0 && (
                  <path d={e.d} fill="none" className={`${e.color} flow-inflight`} strokeWidth={strokeFor(e.inflight)} strokeLinecap="round" />
                )}
              </g>
            ))}
          </svg>

          {/* Amount labels sit above the ribbons: in-flight always (it's the
              number you're waiting on), landed only when you pick a node.
              Arranging narrows the gutter they'd sit in, and they're not what
              you're looking at then, so they step aside. */}
          {!arranging && drawn.map(e => {
            const showInflight = e.inflight > 0
            const showLanded = e.landed > 0 && selectedKey && e.active
            if (!showInflight && !showLanded) return null
            return (
              <div
                key={`label-${e.id}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity ${e.active ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: e.mid.x, top: e.mid.y }}
              >
                <span
                  className={`block text-[10px] font-semibold tabular-nums rounded-full px-1.5 py-px border whitespace-nowrap ${
                    showInflight
                      ? 'bg-surface border-accent/40 text-accent-ink'
                      : 'bg-surface border-edge text-ink-tertiary'
                  }`}
                >
                  {/* The narrow gutter only has room for the number. */}
                  {showInflight ? (compact ? fmt$0(e.inflight) : `${fmt$0(e.inflight)} in flight`) : fmt$0(e.landed)}
                </span>
              </div>
            )
          })}

          {layout.nodes.map(node => (
            <NodeCard
              key={node.key}
              node={node}
              size={size}
              compact={compact}
              arranging={arranging}
              moves={moveOptions(node.key)}
              inflightIn={perNode.get(node.key)?.inflightIn ?? 0}
              selected={!arranging && selectedKey === node.key}
              dimmed={!arranging && !!selectedKey && selectedKey !== node.key && !drawn.some(e => e.active && (e.from === node.key || e.to === node.key))}
              onActivate={activate}
              onPushTo={onPushTo}
              onSweep={onSweep}
              onMove={onMove}
              onSetHub={onSetHub}
            />
          ))}
        </div>
      </div>

      {arranging && (
        <div className="flex items-start gap-2 px-4 py-2 border-t border-edge bg-raised/40 text-[11px] text-ink-muted">
          <Move size={12} className="text-accent-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Arrows move a card up and down its column or across to the other one — money flows left to right, so put whatever you push
            <em> from</em> on the left. <strong className="text-ink font-semibold">Set as hub</strong> marks the account money should come
            home to; the sweep-back reminders aim at it.
          </span>
        </div>
      )}

      {!arranging && totals.inFlightCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-edge bg-raised/40 text-[11px] text-ink-muted">
          <AlertTriangle size={12} className="text-accent-ink flex-shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-ink font-semibold tabular-nums">{fmt$0(totals.inFlight)}</strong> in the pipeline across{' '}
            {totals.inFlightCount} transfer{totals.inFlightCount === 1 ? '' : 's'} — money that has left the source but hasn&rsquo;t been
            confirmed at the other end.
          </span>
        </div>
      )}
    </div>
  )
}
