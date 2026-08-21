import { useEffect, useMemo, useState } from 'react'
import { nodeLabel, layoutColumns, canMove, nodeSide } from '../../engines/moneyFlow'
import { fmt$0, todayISODate } from '../../utils/format'
import { useLogTransfer } from '../../hooks/useLogTransfer'
import Modal from '../shared/Modal'
import Field, { inpRequired } from '../shared/Field'
import DateField from '../shared/DateField'
import {
  Landmark, Wallet, Home, AlertTriangle, EyeOff, Move, Check,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pencil, GripVertical,
  ArrowRightLeft, ArrowRight, X,
} from 'lucide-react'

// The picture: where every dollar currently sits, and every push connecting
// the two sides. Cash sources on the left, churned bank accounts on the right,
// one ribbon per source→destination pair.
//
// Ribbons are SVG; the node cards are ordinary HTML positioned on top of them,
// so names truncate, hover states work, and the theme tokens apply the same way
// they do everywhere else. Landed money is a solid ribbon, money still in
// flight is a marching dashed one — that split IS the pipeline view.

const SIZES = {
  wide:    { NODE_W: 204, NODE_H: 76, ROW_GAP: 14, COL_GAP: 160 },
  compact: { NODE_W: 136, NODE_H: 76, ROW_GAP: 12, COL_GAP: 68 },
}
const ARRANGE_SIZES = {
  wide:    { NODE_W: 204, NODE_H: 108, ROW_GAP: 12, COL_GAP: 160 },
  compact: { NODE_W: 168, NODE_H: 108, ROW_GAP: 10, COL_GAP: 28 },
}
const PAD_Y = 12

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
      onMouseDown={e => e.stopPropagation()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex-1 flex items-center justify-center h-8 rounded-md bg-raised border border-edge-strong text-ink-muted hover:text-ink hover:bg-overlay disabled:opacity-25 disabled:pointer-events-none transition-colors"
    >
      <Icon size={15} />
    </button>
  )
}

function TransferFlowModal({ fromNode, toNode, onClose, onLogged }) {
  const logTransfer = useLogTransfer()
  const defaultPurpose = toNode.isHub || (fromNode.kind === 'account' && toNode.kind === 'source')
    ? 'return'
    : (toNode.kind === 'account' ? 'dd' : 'other')

  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState(defaultPurpose)
  const [sentDate, setSentDate] = useState(todayISODate())
  const [landed, setLanded] = useState(false)
  const [addReminder, setAddReminder] = useState(true)
  const [reminderDays, setReminderDays] = useState(21)

  function handleSubmit(e) {
    e.preventDefault()
    const num = parseFloat(amount)
    if (!(num > 0)) return

    logTransfer({
      amount: num,
      from: fromNode,
      to: toNode,
      purpose,
      sentDate,
      landed,
      checkDays: addReminder ? reminderDays : null,
    })
    onLogged?.()
    onClose()
  }

  const fromBalance = fromNode.balance != null ? fromNode.balance : null
  const suggestions = [
    fromBalance != null && fromBalance > 0 ? { label: `All (${fmt$0(fromBalance)})`, val: fromBalance } : null,
    { label: '$500', val: 500 },
    { label: '$1,000', val: 1000 },
    { label: '$2,500', val: 2500 },
    { label: '$4,000', val: 4000 },
    { label: '$5,000', val: 5000 },
  ].filter(Boolean)

  const PURPOSES = [
    { value: 'dd', label: 'Direct Deposit', sub: 'Counts toward bonus direct deposit goal' },
    { value: 'fund', label: 'Funding', sub: 'Initial opening deposit' },
    { value: 'return', label: 'Sweep Home', sub: 'Returning funds back to hub/source' },
    { value: 'other', label: 'Other Push', sub: 'General transfer between accounts' },
  ]

  return (
    <Modal sheet title="Log Transfer" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source -> Destination preview card */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-raised/70 border border-edge">
          {/* Source node */}
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-ink-tertiary">From</span>
            <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
              {fromNode.color ? (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fromNode.color }} />
              ) : null}
              <span className="text-xs font-bold text-ink truncate">{fromNode.name}</span>
            </div>
            <span className="block text-[10px] text-ink-muted mt-0.5">
              {fromNode.balance != null ? `Balance: ${fmt$0(fromNode.balance)}` : 'Untracked'}
            </span>
          </div>

          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/15 text-accent-ink flex-shrink-0">
            <ArrowRight size={15} />
          </div>

          {/* Destination node */}
          <div className="min-w-0 flex-1 text-right">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-ink-tertiary">To</span>
            <div className="flex items-center justify-end gap-1.5 min-w-0 mt-0.5">
              <span className="text-xs font-bold text-ink truncate">{toNode.name}</span>
              {toNode.color ? (
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: toNode.color }} />
              ) : null}
            </div>
            <span className="block text-[10px] text-ink-muted mt-0.5">
              {toNode.balance != null ? `Balance: ${fmt$0(toNode.balance)}` : 'Untracked'}
            </span>
          </div>
        </div>

        {/* Transfer Amount */}
        <Field label="Transfer Amount ($)" required>
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-ink-tertiary pointer-events-none">$</span>
              <input
                type="number"
                step="any"
                className={`${inpRequired} pl-8 text-lg font-bold tabular-nums`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            {suggestions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {suggestions.map(s => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setAmount(String(s.val))}
                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-raised border border-edge hover:border-accent hover:text-accent-ink transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* Purpose selection */}
        <Field label="Transfer Purpose">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PURPOSES.map(p => {
              const isSelected = purpose === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPurpose(p.value)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-accent/10 border-accent text-accent-ink shadow-xs'
                      : 'bg-raised/40 border-edge text-ink hover:border-edge-strong'
                  }`}
                >
                  <span className="block text-xs font-semibold">{p.label}</span>
                  <span className="block text-[10px] text-ink-tertiary truncate mt-0.5">{p.sub}</span>
                </button>
              )
            })}
          </div>
        </Field>

        {/* Sent Date and Landed checkbox */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DateField label="Date Sent" value={sentDate} onChange={setSentDate} />
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-raised/40 border border-edge cursor-pointer hover:bg-raised/70 transition-colors">
              <input
                type="checkbox"
                checked={landed}
                onChange={e => setLanded(e.target.checked)}
                className="rounded border-edge-strong text-accent focus:ring-accent"
              />
              <span className="text-xs font-medium text-ink">Already landed today</span>
            </label>
          </div>
        </div>

        {/* Reminder */}
        {!landed && (
          <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-raised/40 border border-edge cursor-pointer hover:bg-raised/70 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={addReminder}
                onChange={e => setAddReminder(e.target.checked)}
                className="rounded border-edge-strong text-accent focus:ring-accent"
              />
              <span className="text-xs text-ink truncate">Remind me to check in</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <input
                type="number"
                min={1}
                max={90}
                className="w-12 bg-surface border border-edge rounded px-1.5 py-0.5 text-xs text-center font-bold text-ink"
                value={reminderDays}
                onChange={e => setReminderDays(parseInt(e.target.value) || 7)}
                disabled={!addReminder}
              />
              <span className="text-xs text-ink-muted">days</span>
            </div>
          </label>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-edge flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-raised transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!(parseFloat(amount) > 0)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 text-white transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Check size={14} /> Log Transfer
          </button>
        </div>
      </form>
    </Modal>
  )
}

function NodeCard({
  node,
  size,
  compact,
  arranging,
  moves,
  inflightIn,
  selected,
  dimmed,
  isDragging,
  isTransferSource,
  isTransferHoverTarget,
  isTransferModeActive,
  onActivate,
  onStartTransfer,
  onStartSendHome,
  onMove,
  onSetHub,
  onEdit,
  onDragStart,
  onDragEnd,
  onDragOverNode,
  onDropOnNode,
  onMouseEnter,
  onMouseLeave,
}) {
  const Icon = node.kind === 'source' ? (node.isHub ? Home : Wallet) : Landmark
  const hasCustomColor = !!node.color
  const hasBalance = node.balance != null
  const height = size.NODE_H

  let ring = TONE_RING[node.tone] ?? 'border-edge'
  if (isTransferSource) {
    ring = 'border-accent ring-2 ring-accent shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-pulse'
  } else if (isTransferHoverTarget) {
    ring = 'border-accent ring-2 ring-accent shadow-[0_0_12px_rgba(59,130,246,0.4)]'
  } else if (selected) {
    ring = 'border-accent shadow-pop'
  }

  const customCardStyle = {
    left: node.x,
    top: node.y,
    width: size.NODE_W,
    height,
    ...(hasCustomColor
      ? { borderLeftColor: node.color, borderLeftWidth: 4 }
      : {}),
  }

  // While arranging, the card shows move buttons, hub toggle, and direct edit
  if (arranging) {
    return (
      <div
        data-node-card="true"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOverNode}
        onDrop={onDropOnNode}
        className={`group absolute rounded-xl border bg-surface shadow-card cursor-grab active:cursor-grabbing transition-all select-none ${
          node.isHub ? 'border-accent' : 'border-edge-strong'
        } ${isDragging ? 'opacity-30 scale-95 ring-2 ring-accent' : ''}`}
        style={customCardStyle}
      >
        <div className="px-2 pt-1.5 flex items-center justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <GripVertical size={11} className="text-ink-faint group-hover:text-ink-muted flex-shrink-0" aria-hidden="true" />
            {hasCustomColor && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />
            )}
            <Icon size={12} className="text-ink-tertiary flex-shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-semibold text-ink truncate">{node.name}</span>
            {node.memberName && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-semibold rounded px-1 py-px border flex-shrink-0"
                style={{
                  backgroundColor: node.memberHex ? `${node.memberHex}18` : 'var(--color-raised)',
                  borderColor: node.memberHex ? `${node.memberHex}40` : 'var(--color-edge)',
                  color: node.memberHex || 'var(--color-ink-secondary)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: node.memberHex || '#64748b' }} />
                {node.memberName}
              </span>
            )}
            {node.isHub && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-accent-ink bg-accent/10 rounded px-1 py-px flex-shrink-0">
                Hub
              </span>
            )}
          </div>
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(node) }}
            title={`Edit ${node.name}`}
            className="p-1 rounded text-ink-faint hover:text-accent-ink hover:bg-raised transition-colors flex-shrink-0"
          >
            <Pencil size={11} />
          </button>
        </div>

        <div className="px-2 pt-1 flex items-center gap-1">
          <MoveButton icon={ChevronLeft}  label={`Move ${node.name} to left column`}  disabled={!moves.left}  onClick={() => onMove(node.key, 'left')} />
          <MoveButton icon={ChevronUp}    label={`Move ${node.name} up`}               disabled={!moves.up}    onClick={() => onMove(node.key, 'up')} />
          <MoveButton icon={ChevronDown}  label={`Move ${node.name} down`}             disabled={!moves.down}  onClick={() => onMove(node.key, 'down')} />
          <MoveButton icon={ChevronRight} label={`Move ${node.name} to right column`} disabled={!moves.right} onClick={() => onMove(node.key, 'right')} />
        </div>

        <div className="px-2 pt-1">
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => onSetHub(node.key)}
            disabled={node.isHub}
            className={`w-full flex items-center justify-center gap-1 h-6 rounded-md text-[10px] font-semibold border transition-colors ${
              node.isHub
                ? 'bg-accent/10 text-accent-ink border-accent/30'
                : 'bg-raised text-ink-muted border-edge-strong hover:text-ink hover:bg-overlay'
            }`}
          >
            {node.isHub ? <><Check size={10} />Main hub</> : <><Home size={10} />Set as hub</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      data-node-card="true"
      draggable={!isTransferModeActive}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverNode}
      onDrop={onDropOnNode}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDoubleClick={(e) => { e.stopPropagation(); onEdit(node) }}
      className={`group absolute rounded-xl border bg-surface shadow-card transition-all cursor-grab active:cursor-grabbing ${ring} ${
        dimmed ? 'opacity-35' : 'opacity-100'
      } ${isDragging ? 'opacity-30 scale-95 ring-2 ring-accent' : ''}`}
      style={customCardStyle}
    >
      {/* Edit button shortcut in top-right */}
      <button
        type="button"
        onMouseDown={e => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onEdit(node) }}
        title={`Edit ${node.name} (name, balance, color...)`}
        aria-label={`Edit ${node.name}`}
        className="absolute top-1.5 right-1.5 z-10 p-1 rounded-md text-ink-faint hover:text-accent-ink hover:bg-raised transition-colors opacity-80 group-hover:opacity-100"
      >
        <Pencil size={11} />
      </button>

      {/* Main card interactive area */}
      <button
        onClick={() => onActivate(node)}
        onDoubleClick={(e) => { e.stopPropagation(); onEdit(node) }}
        className="w-full h-full text-left px-2.5 py-2 flex flex-col justify-between focus:outline-none focus-visible:rounded-xl"
        aria-pressed={compact ? undefined : selected}
        aria-label={[
          nodeLabel(node),
          node.memberName ? `held by ${node.memberName}` : null,
          hasBalance ? fmt$0(node.balance) : 'balance not tracked',
          node.isHub ? 'main hub' : null,
          node.label,
          inflightIn > 0 ? `${fmt$0(inflightIn)} in flight toward it` : null,
          compact ? 'move money or edit' : 'double-click to edit or tap to connect',
        ].filter(Boolean).join(' — ')}
        title={
          isTransferModeActive
            ? (isTransferSource ? 'Selected as source' : `Click to transfer here from source`)
            : `${nodeLabel(node)} — Double-click to edit, drag to reorder`
        }
      >
        <span className="flex items-center gap-1.5 min-w-0 pr-5">
          <GripVertical size={11} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -ml-1" aria-hidden="true" />
          {hasCustomColor && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />
          )}
          <Icon size={13} className={`flex-shrink-0 ${TONE_TEXT[node.tone] ?? 'text-ink-tertiary'}`} aria-hidden="true" />
          <span className="text-xs font-semibold text-ink truncate">{node.name}</span>
          {node.memberName && (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold rounded px-1.5 py-px border flex-shrink-0"
              style={{
                backgroundColor: node.memberHex ? `${node.memberHex}18` : 'var(--color-raised)',
                borderColor: node.memberHex ? `${node.memberHex}40` : 'var(--color-edge)',
                color: node.memberHex || 'var(--color-ink-secondary)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: node.memberHex || '#64748b' }} />
              {node.memberName}
            </span>
          )}
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

      {/* Pointer-sized shortcuts on desktop */}
      {!compact && (
        <div className="absolute -bottom-2.5 left-2 flex items-center gap-1 z-10">
          {node.kind === 'account' && (node.balance ?? 0) > 0 && (
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onStartSendHome(node) }}
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-success/15 text-success-ink border border-success/30 hover:bg-success/25 transition-colors shadow-xs flex items-center gap-0.5"
            >
              Send home
            </button>
          )}
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onStartTransfer(node) }}
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border transition-colors shadow-xs flex items-center gap-0.5 ${
              isTransferSource
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-raised text-ink-muted border-edge-strong hover:text-accent-ink hover:border-accent/40'
            }`}
          >
            <ArrowRightLeft size={9} /> {isTransferSource ? 'Pick Target' : 'Transfer'}
          </button>
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(node) }}
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-raised text-ink-muted border border-edge-strong hover:text-accent-ink hover:border-accent/40 transition-colors shadow-xs flex items-center gap-0.5"
          >
            <Pencil size={9} /> Edit
          </button>
        </div>
      )}
    </div>
  )
}

export default function FlowDiagram({
  map,
  cardLayout,
  selectedKey,
  onSelect,
  onOpenSheet,
  onMove,
  onReorder,
  onEdit,
  onResetLayout,
  onSetHub,
}) {
  const { sources, accounts, edges, perNode, totals, hub } = map
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setCompact(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const [showQuiet, setShowQuiet] = useState(false)
  const [arranging, setArranging] = useState(false)
  const [draggedKey, setDraggedKey] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  // Interactive Transfer flow state
  const [transferSourceKey, setTransferSourceKey] = useState(null)
  const [hoveredTargetKey, setHoveredTargetKey] = useState(null)
  const [pendingTransfer, setPendingTransfer] = useState(null) // { from, to }

  const size = (arranging ? ARRANGE_SIZES : SIZES)[compact ? 'compact' : 'wide']

  const { quiet, shownAccounts } = useMemo(() => {
    const quiet = accounts.filter(n => n.status === 'Closed' && !(n.balance ?? 0) && !(perNode.get(n.key)?.transfers ?? 0))
    const quietKeys = new Set(quiet.map(n => n.key))
    return { quiet, shownAccounts: showQuiet ? accounts : accounts.filter(n => !quietKeys.has(n.key)) }
  }, [accounts, perNode, showQuiet])

  const arrangeable = useMemo(() => [...sources, ...shownAccounts], [sources, shownAccounts])

  const layout = useMemo(() => {
    const { left, right } = layoutColumns(arrangeable, cardLayout)

    const nodeH = size.NODE_H
    const rowH = nodeH + size.ROW_GAP
    const leftH = left.length * rowH
    const rightH = right.length * rowH
    const height = Math.max(leftH, rightH, rowH) + PAD_Y * 2
    const rightX = size.NODE_W + size.COL_GAP

    const place = (list, x, colH, side) => {
      const offset = PAD_Y + Math.max(0, (height - PAD_Y * 2 - colH) / 2)
      return list.map((n, i) => ({ ...n, x, y: offset + i * rowH, side, colIndex: i }))
    }

    const placedLeft = place(left, 0, leftH, 'left')
    const placedRight = place(right, rightX, rightH, 'right')
    const placed = [...placedLeft, ...placedRight]
    const positions = new Map(placed.map(n => [n.key, n]))

    return {
      nodes: placed,
      leftNodes: placedLeft,
      rightNodes: placedRight,
      positions,
      width: rightX + size.NODE_W,
      height,
      nodeH,
      rightX,
    }
  }, [arrangeable, size, cardLayout])

  // Escape key cancels transfer mode or selection
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (transferSourceKey) {
          setTransferSourceKey(null)
          setHoveredTargetKey(null)
        } else if (selectedKey) {
          onSelect(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [transferSourceKey, selectedKey, onSelect])

  // Card activation handler
  const activate = (node) => {
    if (transferSourceKey) {
      if (transferSourceKey === node.key) {
        // Clicking source again cancels transfer mode
        setTransferSourceKey(null)
        setHoveredTargetKey(null)
      } else {
        // Selected destination -> open transfer modal
        const sourceNode = map.byKey.get(transferSourceKey)
        if (sourceNode) {
          setPendingTransfer({ from: sourceNode, to: node })
        }
        setTransferSourceKey(null)
        setHoveredTargetKey(null)
      }
      return
    }

    if (compact) {
      onOpenSheet(node)
    } else {
      onSelect(node.key)
    }
  }

  // Start transfer mode
  function handleStartTransfer(node) {
    if (transferSourceKey === node.key) {
      setTransferSourceKey(null)
      setHoveredTargetKey(null)
    } else {
      setTransferSourceKey(node.key)
      setHoveredTargetKey(null)
    }
  }

  // Send home directly to hub shortcut
  function handleStartSendHome(node) {
    if (hub && hub.key !== node.key) {
      setPendingTransfer({ from: node, to: hub })
    } else {
      // If no hub set or already at hub, start normal transfer mode
      handleStartTransfer(node)
    }
  }

  // Background canvas click deselects active selection or transfer mode
  function handleCanvasClick(e) {
    if (e.target.closest('[data-node-card]') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return
    }
    if (transferSourceKey) {
      setTransferSourceKey(null)
      setHoveredTargetKey(null)
    }
    if (selectedKey) {
      onSelect(null)
    }
  }

  const moveOptions = (key) => ({
    up: canMove(arrangeable, cardLayout, key, 'up'),
    down: canMove(arrangeable, cardLayout, key, 'down'),
    left: canMove(arrangeable, cardLayout, key, 'left'),
    right: canMove(arrangeable, cardLayout, key, 'right'),
  })

  // Drag and Drop Event Handlers
  function handleDragStart(key, e) {
    setDraggedKey(key)
    if (e?.dataTransfer) {
      e.dataTransfer.setData('text/plain', key)
      e.dataTransfer.effectAllowed = 'move'
    }
  }

  function handleDragEnd() {
    setDraggedKey(null)
    setDropTarget(null)
  }

  function handleDragOverNode(node, e) {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedKey || draggedKey === node.key) return

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const isTopHalf = offsetY < rect.height / 2
    const side = nodeSide(node, cardLayout)
    const colList = side === 'left' ? layout.leftNodes : layout.rightNodes
    const colIndex = colList.findIndex(n => n.key === node.key)
    const targetIndex = isTopHalf ? Math.max(0, colIndex) : colIndex + 1

    setDropTarget({
      side,
      targetIndex,
      nodeKey: node.key,
      position: isTopHalf ? 'before' : 'after',
      nodeX: node.x,
      nodeY: node.y,
    })
  }

  function handleDropOnNode(node, e) {
    e.preventDefault()
    e.stopPropagation()
    const key = e.dataTransfer.getData('text/plain') || draggedKey
    if (key && dropTarget && onReorder) {
      onReorder(key, dropTarget.side, dropTarget.targetIndex)
    }
    setDraggedKey(null)
    setDropTarget(null)
  }

  function handleDragOverContainer(e) {
    e.preventDefault()
    if (!draggedKey) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const side = offsetX < layout.width / 2 ? 'left' : 'right'
    const colList = side === 'left' ? layout.leftNodes : layout.rightNodes

    setDropTarget(prev => {
      if (prev && prev.nodeKey) return prev
      return {
        side,
        targetIndex: colList.length,
        nodeKey: null,
        position: 'end',
        nodeX: side === 'left' ? 0 : layout.rightX,
        nodeY: colList.length > 0 ? colList[colList.length - 1].y + size.NODE_H + size.ROW_GAP : PAD_Y,
      }
    })
  }

  function handleDropContainer(e) {
    e.preventDefault()
    const key = e.dataTransfer.getData('text/plain') || draggedKey
    if (key && dropTarget && onReorder) {
      onReorder(key, dropTarget.side, dropTarget.targetIndex)
    }
    setDraggedKey(null)
    setDropTarget(null)
  }

  const maxEdge = Math.max(1, ...edges.map(e => e.total))
  const strokeFor = (amount) => 1.5 + 7 * Math.sqrt(Math.max(0, amount) / maxEdge)

  const drawn = edges.map(e => {
    const from = layout.positions.get(e.from)
    const to = layout.positions.get(e.to)
    if (!from || !to) return null
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

  // Live dynamic transfer preview arrow when hovering during transfer mode
  const transferPreviewRibbon = useMemo(() => {
    if (!transferSourceKey || !hoveredTargetKey || transferSourceKey === hoveredTargetKey) return null
    const from = layout.positions.get(transferSourceKey)
    const to = layout.positions.get(hoveredTargetKey)
    if (!from || !to) return null

    const forward = from.x < to.x
    const x1 = forward ? from.x + size.NODE_W : from.x
    const x2 = forward ? to.x : to.x + size.NODE_W
    const y1 = from.y + layout.nodeH / 2
    const y2 = to.y + layout.nodeH / 2
    return {
      d: ribbonPath(x1, y1, x2, y2),
      x2,
      y2,
    }
  }, [transferSourceKey, hoveredTargetKey, layout, size])

  if (layout.nodes.length === 0) return null

  const transferSourceNode = transferSourceKey ? map.byKey.get(transferSourceKey) : null

  return (
    <div
      onClick={handleCanvasClick}
      className="bg-surface border border-edge rounded-xl shadow-card overflow-hidden select-none"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-edge flex-wrap">
        <h2 className="text-sm font-semibold text-ink flex items-center flex-wrap gap-x-2">
          <span>Where the money is</span>
          <button
            onClick={() => setArranging(a => !a)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors ${
              arranging
                ? 'bg-accent/15 text-accent-ink border-accent/40 shadow-xs'
                : 'bg-raised text-ink-tertiary border-edge-strong hover:text-ink'
            }`}
          >
            {arranging ? <Check size={11} aria-hidden="true" /> : <Move size={11} aria-hidden="true" />}
            {arranging ? 'Done Arranging' : 'Arrange Mode'}
          </button>
          {Object.keys(cardLayout ?? {}).length > 0 && (
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

      {/* Interactive Transfer Banner */}
      {transferSourceNode && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-accent/15 border-b border-accent/30 text-xs text-accent-ink animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowRightLeft size={14} className="animate-spin flex-shrink-0" style={{ animationDuration: '4s' }} />
            <span className="truncate">
              Transferring from <strong className="font-bold text-ink">{transferSourceNode.name}</strong> — Click any destination bank to connect
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setTransferSourceKey(null); setHoveredTargetKey(null) }}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface text-ink border border-edge hover:bg-raised transition-colors flex-shrink-0"
          >
            <X size={11} /> Cancel (Esc)
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <div
          onDragOver={handleDragOverContainer}
          onDrop={handleDropContainer}
          className="relative mx-auto my-4"
          style={{ width: layout.width, height: layout.height, minWidth: layout.width }}
        >
          {/* SVG Ribbons */}
          <svg
            width={layout.width}
            height={layout.height}
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            {drawn.map(e => (
              <g key={e.id} className={e.active && !transferSourceKey ? 'opacity-100' : 'opacity-15'}>
                {e.landed > 0 && (
                  <path d={e.d} fill="none" className={e.color} strokeWidth={strokeFor(e.landed)} strokeOpacity="0.45" strokeLinecap="round" />
                )}
                {e.inflight > 0 && (
                  <path d={e.d} fill="none" className={`${e.color} flow-inflight`} strokeWidth={strokeFor(e.inflight)} strokeLinecap="round" />
                )}
              </g>
            ))}

            {/* Dynamic Transfer Preview Arrow */}
            {transferPreviewRibbon && (
              <g className="animate-pulse">
                <path
                  d={transferPreviewRibbon.d}
                  fill="none"
                  className="stroke-accent flow-inflight"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                <circle
                  cx={transferPreviewRibbon.x2}
                  cy={transferPreviewRibbon.y2}
                  r={5}
                  className="fill-accent"
                />
              </g>
            )}
          </svg>

          {/* Amount labels */}
          {!arranging && !transferSourceKey && drawn.map(e => {
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
                  {showInflight ? (compact ? fmt$0(e.inflight) : `${fmt$0(e.inflight)} in flight`) : fmt$0(e.landed)}
                </span>
              </div>
            )
          })}

          {/* Drag and Drop Visual Insertion Indicator */}
          {dropTarget && (
            <div
              className="absolute z-20 pointer-events-none transition-all"
              style={{
                left: dropTarget.nodeX ?? (dropTarget.side === 'left' ? 0 : layout.rightX),
                top: dropTarget.position === 'before'
                  ? (dropTarget.nodeY - size.ROW_GAP / 2)
                  : dropTarget.position === 'after'
                  ? (dropTarget.nodeY + size.NODE_H + size.ROW_GAP / 2)
                  : dropTarget.nodeY,
                width: size.NODE_W,
                height: 3,
              }}
            >
              <div className="w-full h-full bg-accent rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] relative">
                <span className="w-2.5 h-2.5 rounded-full bg-accent absolute -left-1 -top-[3.5px]" />
                <span className="w-2.5 h-2.5 rounded-full bg-accent absolute -right-1 -top-[3.5px]" />
              </div>
            </div>
          )}

          {/* Node Cards */}
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
              dimmed={
                !arranging && (
                  (!!selectedKey && selectedKey !== node.key && !drawn.some(e => e.active && (e.from === node.key || e.to === node.key))) ||
                  (!!transferSourceKey && transferSourceKey !== node.key && hoveredTargetKey && hoveredTargetKey !== node.key)
                )
              }
              isDragging={draggedKey === node.key}
              isTransferSource={transferSourceKey === node.key}
              isTransferHoverTarget={transferSourceKey && transferSourceKey !== node.key && hoveredTargetKey === node.key}
              isTransferModeActive={!!transferSourceKey}
              onActivate={activate}
              onStartTransfer={handleStartTransfer}
              onStartSendHome={handleStartSendHome}
              onMove={onMove}
              onSetHub={onSetHub}
              onEdit={onEdit}
              onDragStart={(e) => handleDragStart(node.key, e)}
              onDragEnd={handleDragEnd}
              onDragOverNode={(e) => handleDragOverNode(node, e)}
              onDropOnNode={(e) => handleDropOnNode(node, e)}
              onMouseEnter={() => {
                if (transferSourceKey && transferSourceKey !== node.key) {
                  setHoveredTargetKey(node.key)
                }
              }}
              onMouseLeave={() => {
                if (hoveredTargetKey === node.key) {
                  setHoveredTargetKey(null)
                }
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 px-4 py-2 border-t border-edge bg-raised/40 text-[11px] text-ink-muted flex-wrap">
        <Move size={12} className="text-accent-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-ink font-medium">Double-click</strong> any bank to edit. Click <strong className="text-ink font-medium">Transfer</strong> on an account to connect it to another. <strong className="text-ink font-medium">Drag and drop</strong> cards anywhere to rearrange columns. Click empty space to deselect.
        </span>
      </div>

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

      {/* Pop-up Transfer Modal */}
      {pendingTransfer && (
        <TransferFlowModal
          fromNode={pendingTransfer.from}
          toNode={pendingTransfer.to}
          onClose={() => setPendingTransfer(null)}
          onLogged={() => {
            setPendingTransfer(null)
            onSelect(null)
          }}
        />
      )}
    </div>
  )
}
