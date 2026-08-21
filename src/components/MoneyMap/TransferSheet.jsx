import { useMemo, useState } from 'react'
import Modal from '../shared/Modal'
import { inp } from '../shared/Field'
import { useLogTransfer } from '../../hooks/useLogTransfer'
import {
  TRANSFER_PURPOSES, nodeLabel, parseMoneyInput, recentCounterparties,
  suggestTransferAmounts, defaultPurposeFor,
} from '../../engines/moneyFlow'
import { fmt$, fmt$0, todayISODate, addDaysISO } from '../../utils/format'
import DateField from '../shared/DateField'
import {
  ArrowUpRight, ArrowDownLeft, List, ChevronLeft, Check, Landmark, Wallet, Home,
  Search, Bell, CornerDownLeft, Pencil,
} from 'lucide-react'

// Tap-driven entry, for the phone. Typing an amount, a source and a destination
// into one line is quick on a keyboard and miserable on glass, so on a small
// screen tapping an account opens this instead:
//
//   which way is the money going?  →  which account?  →  how much?
//
// One decision per screen, every target thumb-sized, and the amount step is the
// only place anything has to be typed — into a numeric keypad, with the amounts
// this particular pair implies offered as chips.

const CHECK_PRESETS = [
  { days: 7, label: '1w' },
  { days: 14, label: '2w' },
  { days: 21, label: '3w' },
  { days: 30, label: '30d' },
]

function NodeIcon({ node, className }) {
  const Icon = node.kind === 'source' ? (node.isHub ? Home : Wallet) : Landmark
  return <Icon size={16} className={className} aria-hidden="true" />
}

function Chip({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
        active
          ? 'bg-accent/15 text-accent-ink border-accent/40'
          : 'bg-raised text-ink-muted border-edge-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

// Every tappable row in the sheet is the same shape and the same generous
// height — 56px is comfortably past the 44px touch-target floor.
function TapRow({ icon, title, subtitle, trailing, onClick, tone = 'default' }) {
  const tones = {
    default: 'text-ink',
    accent: 'text-accent-ink',
    success: 'text-success-ink',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left hover:bg-raised/70 active:bg-raised transition-colors"
    >
      <span className={`flex-shrink-0 ${tones[tone] ?? tones.default}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium truncate ${tones[tone] ?? tones.default}`}>{title}</span>
        {subtitle && <span className="block text-xs text-ink-tertiary truncate">{subtitle}</span>}
      </span>
      {trailing && <span className="flex-shrink-0 text-xs text-ink-muted tabular-nums">{trailing}</span>}
    </button>
  )
}

export default function TransferSheet({ node, map, onClose, onShowTransfers, onEdit }) {
  const logTransfer = useLogTransfer()
  const [step, setStep] = useState('direction')
  const [direction, setDirection] = useState(null) // 'out' = leaving node, 'in' = arriving
  const [other, setOther] = useState(null)
  const [amount, setAmount] = useState('')
  const [purposeOverride, setPurposeOverride] = useState(null)
  const [landedNow, setLandedNow] = useState(false)
  const [checkDays, setCheckDays] = useState(null)
  const [sentDate, setSentDate] = useState(todayISODate())
  const [dateOpen, setDateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [logged, setLogged] = useState(null)

  const from = direction === 'out' ? node : other
  const to = direction === 'out' ? other : node
  const parsedAmount = parseMoneyInput(amount)
  const purpose = purposeOverride ?? defaultPurposeFor(from, to)
  const ready = parsedAmount > 0 && !!from && !!to

  const flow = map.perNode.get(node.key)
  const nodeTransfers = map.transfers.filter(t => t.fromKey === node.key || t.toKey === node.key)

  // Candidates for the other end: everything but this node and the ghosts of
  // deleted accounts, with the ones you've actually paired with pulled to top.
  const { recent, sources, accounts } = useMemo(() => {
    const pool = map.nodes.filter(n => n.key !== node.key && !n.ghost)
    const q = query.trim().toLowerCase()
    const matches = (n) => !q || nodeLabel(n).toLowerCase().includes(q)
    const recentKeys = recentCounterparties(map.transfers, node.key, direction)
    const recent = q ? [] : recentKeys.map(k => map.byKey.get(k)).filter(n => n && !n.ghost).slice(0, 3)
    const recentSet = new Set(recent.map(n => n.key))
    const rest = pool.filter(n => !recentSet.has(n.key) && matches(n))
    return {
      recent,
      sources: rest.filter(n => n.kind === 'source').sort((a, b) => (b.isHub ? 1 : 0) - (a.isHub ? 1 : 0)),
      accounts: rest.filter(n => n.kind === 'account'),
    }
  }, [map, node.key, direction, query])

  const suggestions = useMemo(() => (from && to ? suggestTransferAmounts(from, to) : []), [from, to])

  function pickDirection(dir) {
    setDirection(dir)
    setOther(null)
    setPurposeOverride(null)
    setQuery('')
    setStep('pick')
  }

  function pickOther(n) {
    setOther(n)
    setStep('amount')
  }

  function back() {
    if (step === 'amount') { setStep('pick'); return }
    if (step === 'pick') { setStep('direction'); setDirection(null); return }
    onClose()
  }

  function submit(e) {
    e?.preventDefault()
    if (!ready) return
    logTransfer({ amount: parsedAmount, from, to, purpose, sentDate, landed: landedNow, checkDays })
    setLogged({ amount: parsedAmount, from, to, landed: landedNow })
    setStep('done')
  }

  // "Log another" keeps the account you started from — the realistic pattern is
  // several pushes into the same new account in one sitting.
  function again() {
    setStep('direction')
    setDirection(null)
    setOther(null)
    setAmount('')
    setPurposeOverride(null)
    setLandedNow(false)
    setCheckDays(null)
    setSentDate(todayISODate())
    setDateOpen(false)
    setQuery('')
    setLogged(null)
  }

  const heading = {
    direction: nodeLabel(node),
    pick: direction === 'out' ? `${node.name} → ?` : `? → ${node.name}`,
    amount: from && to ? `${from.name} → ${to.name}` : nodeLabel(node),
    done: 'Logged',
  }[step]

  return (
    <Modal sheet title={heading} onClose={onClose}>
      {step !== 'direction' && step !== 'done' && (
        <button
          type="button"
          onClick={back}
          className="flex items-center gap-1 -mt-1 mb-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft size={14} />Back
        </button>
      )}

      {/* ── 1. Which way is the money going? ─────────────────────────────── */}
      {step === 'direction' && (
        <div className="-mx-5">
          <div className="px-5 pb-3 flex items-center gap-2.5">
            {node.color ? (
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />
            ) : (
              <NodeIcon node={node} className="text-ink-muted" />
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink truncate">{node.name}</span>
              <span className="block text-xs text-ink-tertiary">
                {node.balance == null ? 'balance not tracked' : fmt$(node.balance)}
                {node.label ? ` · ${node.label}` : node.sublabel ? ` · ${node.sublabel}` : ''}
              </span>
            </span>
          </div>
          <div className="border-t border-edge divide-y divide-edge">
            <TapRow
              icon={<ArrowUpRight size={18} />}
              tone="accent"
              title="Send money out"
              subtitle={`Out of ${node.name}, into another account`}
              onClick={() => pickDirection('out')}
            />
            <TapRow
              icon={<ArrowDownLeft size={18} />}
              tone="success"
              title="Pull money in"
              subtitle={`Into ${node.name}, from another account`}
              onClick={() => pickDirection('in')}
            />
            <TapRow
              icon={<List size={18} />}
              title="See its transfers"
              subtitle={
                nodeTransfers.length
                  ? `${nodeTransfers.length} logged${flow?.inflightIn || flow?.inflightOut ? ` · ${fmt$0((flow.inflightIn ?? 0) + (flow.inflightOut ?? 0))} in flight` : ''}`
                  : 'Nothing logged here yet'
              }
              onClick={() => { onShowTransfers(node.key); onClose() }}
            />
            <TapRow
              icon={<Pencil size={18} />}
              title="Edit details"
              subtitle="Change name, balance, color, or settings"
              onClick={() => { onClose(); onEdit?.(node) }}
            />
          </div>
          <p className="px-5 pt-3 text-[11px] text-ink-tertiary">
            Either direction records the same thing — money out of one account and into another. Which end you tap just decides
            which side this account sits on.
          </p>
        </div>
      )}

      {/* ── 2. Which other account? ──────────────────────────────────────── */}
      {step === 'pick' && (
        <div className="-mx-5">
          {map.nodes.length > 7 && (
            <div className="px-5 pb-3 relative">
              <Search size={14} className="absolute left-8 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" aria-hidden="true" />
              <input
                className={`${inp} pl-8`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Find an account"
                aria-label="Find an account"
              />
            </div>
          )}

          {recent.length > 0 && (
            <>
              <div className="px-5 py-1.5 text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider bg-raised/50">
                Recent
              </div>
              <div className="divide-y divide-edge border-y border-edge">
                {recent.map(n => (
                  <TapRow
                    key={n.key}
                    icon={<NodeIcon node={n} className="text-ink-muted" />}
                    title={n.name}
                    subtitle={n.sublabel}
                    trailing={n.balance == null ? 'not tracked' : fmt$0(n.balance)}
                    onClick={() => pickOther(n)}
                  />
                ))}
              </div>
            </>
          )}

          {[{ label: 'Cash sources', list: sources }, { label: 'Bank accounts', list: accounts }].map(group => (
            group.list.length > 0 && (
              <div key={group.label}>
                <div className="px-5 py-1.5 text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider bg-raised/50">
                  {group.label}
                </div>
                <div className="divide-y divide-edge border-y border-edge">
                  {group.list.map(n => (
                    <TapRow
                      key={n.key}
                      icon={<NodeIcon node={n} className="text-ink-muted" />}
                      title={n.name + (n.isHub ? ' · hub' : '')}
                      subtitle={n.label ?? n.sublabel}
                      trailing={n.balance == null ? 'not tracked' : fmt$0(n.balance)}
                      onClick={() => pickOther(n)}
                    />
                  ))}
                </div>
              </div>
            )
          ))}

          {recent.length === 0 && sources.length === 0 && accounts.length === 0 && (
            <p className="px-5 py-6 text-center text-sm text-ink-tertiary">Nothing matches &ldquo;{query}&rdquo;.</p>
          )}
        </div>
      )}

      {/* ── 3. How much? ─────────────────────────────────────────────────── */}
      {step === 'amount' && (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs text-ink-muted">
            <span className="truncate">{nodeLabel(from)}</span>
            <ArrowUpRight size={12} className="rotate-45 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{nodeLabel(to)}</span>
          </div>

          {/* inputMode=decimal, not type=number: it brings up the numeric
              keypad without the spinner and scroll-wheel quirks. */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-ink-tertiary pointer-events-none">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              aria-label="Amount"
              autoFocus
              className="w-full bg-raised border border-edge-strong rounded-xl pl-10 pr-4 py-4 text-2xl font-bold tabular-nums text-ink placeholder-ink-faint focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {suggestions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {suggestions.map(sg => (
                <Chip key={sg.amount} active={parsedAmount === sg.amount} onClick={() => setAmount(String(sg.amount))} title={sg.label ?? undefined}>
                  {fmt$0(sg.amount)}
                  {sg.label && <span className="block text-[10px] font-normal opacity-70">{sg.label}</span>}
                </Chip>
              ))}
            </div>
          )}

          <div>
            <div className="text-xs text-ink-tertiary mb-1.5">What&rsquo;s it for?</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TRANSFER_PURPOSES.map(p => (
                <Chip key={p.value} active={purpose === p.value} onClick={() => setPurposeOverride(p.value)} title={p.hint}>
                  {p.short}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip active={landedNow} onClick={() => setLandedNow(v => !v)} title="Log it as already arrived instead of in flight">
              Already landed
            </Chip>
            <Chip active={dateOpen || sentDate !== todayISODate()} onClick={() => setDateOpen(v => !v)}>
              {sentDate === todayISODate() ? 'Sent today' : `Sent ${sentDate}`}
            </Chip>
          </div>

          {dateOpen && <DateField value={sentDate} onChange={v => setSentDate(v || todayISODate())} />}

          <div>
            <div className="flex items-center gap-1 text-xs text-ink-tertiary mb-1.5">
              <Bell size={12} aria-hidden="true" />Remind me to check on it
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CHECK_PRESETS.map(p => (
                <Chip key={p.days} active={checkDays === p.days} onClick={() => setCheckDays(d => (d === p.days ? null : p.days))}>
                  {p.label}
                </Chip>
              ))}
              {checkDays && (
                <span className="text-[11px] text-accent-ink">→ {addDaysISO(sentDate, checkDays)}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!ready}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            <CornerDownLeft size={15} />
            {ready ? `Log ${fmt$(parsedAmount)}` : 'Enter an amount'}
          </button>
        </form>
      )}

      {/* ── Done, with a fast path back for the next push ─────────────────── */}
      {step === 'done' && logged && (
        <div className="text-center py-2">
          <div className="mx-auto mb-3 w-11 h-11 rounded-full bg-success/15 flex items-center justify-center">
            <Check size={22} className="text-success-ink" aria-hidden="true" />
          </div>
          <div className="text-base font-semibold text-ink">{fmt$(logged.amount)} logged</div>
          <div className="text-sm text-ink-muted mt-0.5">
            {logged.from.name} → {logged.to.name}
          </div>
          <div className="text-xs text-ink-tertiary mt-1">
            {logged.landed ? 'Marked as already landed.' : 'In the pipeline until you mark it landed.'}
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={again}
              className="flex-1 bg-raised hover:bg-overlay text-ink-secondary font-medium py-3 rounded-xl text-sm transition-colors"
            >
              Log another
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
