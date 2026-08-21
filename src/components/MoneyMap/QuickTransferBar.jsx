import { useEffect, useRef, useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { parseQuickTransfer, matchNodes, nodeLabel, defaultPurposeFor, TRANSFER_PURPOSES } from '../../engines/moneyFlow'
import { useLogTransfer } from '../../hooks/useLogTransfer'
import { fmt$, todayISODate, addDaysISO } from '../../utils/format'
import DateField from '../shared/DateField'
import { CornerDownLeft, Plus, ArrowRight, Bell, Check, X, Zap } from 'lucide-react'

// One line, one Enter, one push logged. Typing beats four dropdowns when
// you're recording the eighth transfer of the afternoon, so the bar parses a
// whole entry out of free text:
//
//   5000 fidelity > chase          8k schwab to citi dd
//   chase back 4200                3000 fidelity > amex +3w
//
// Everything it understood shows as a live preview, and anything it didn't
// gets a one-tap fix right underneath — the bar never saves a half-read line.

const EXAMPLES = [
  '5000 fidelity > chase',
  '8k schwab to citi dd',
  'chase back 4200',
  '3000 fidelity > sofi +3w',
]

const CHECK_PRESETS = [
  { days: 7, label: '1w' },
  { days: 14, label: '2w' },
  { days: 21, label: '3w' },
  { days: 30, label: '30d' },
]

function Chip({ active, onClick, children, title, tone = 'default' }) {
  const tones = {
    default: active ? 'bg-accent/15 text-accent-ink border-accent/40' : 'bg-raised text-ink-muted border-edge-strong hover:text-ink',
    success: active ? 'bg-success/15 text-success-ink border-success/40' : 'bg-raised text-ink-muted border-edge-strong hover:text-ink',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-colors ${tones[tone] ?? tones.default}`}
    >
      {children}
    </button>
  )
}

export default function QuickTransferBar({ nodes, hub, prefill, onLogged }) {
  const { dispatch } = useChurn()
  const logTransfer = useLogTransfer()
  const inputRef = useRef(null)
  const [text, setText] = useState('')
  const [fromOverride, setFromOverride] = useState(null)
  const [toOverride, setToOverride] = useState(null)
  const [purposeOverride, setPurposeOverride] = useState(null)
  const [checkDays, setCheckDays] = useState(null)
  const [landedNow, setLandedNow] = useState(false)
  const [sentDate, setSentDate] = useState(todayISODate())
  const [dateOpen, setDateOpen] = useState(false)
  const [example, setExample] = useState(0)
  const [flash, setFlash] = useState(null)

  // Tapping "Push here" / "Send home" on the map drops a half-written line in
  // here with the cursor waiting on the amount — still one field, still Enter.
  // Adjusted during render (each tap hands over a fresh object) rather than in
  // an effect, so the bar never renders the stale line first.
  const [appliedPrefill, setAppliedPrefill] = useState(null)
  if (prefill && prefill !== appliedPrefill) {
    setAppliedPrefill(prefill)
    setText(prefill.text ?? '')
    setFromOverride(prefill.from ?? null)
    setToOverride(prefill.to ?? null)
    setPurposeOverride(prefill.purpose ?? null)
  }

  useEffect(() => {
    if (appliedPrefill) inputRef.current?.focus()
  }, [appliedPrefill])

  useEffect(() => {
    const t = setInterval(() => setExample(i => (i + 1) % EXAMPLES.length), 4000)
    return () => clearInterval(t)
  }, [])

  const parsed = parseQuickTransfer(text, nodes, { hub })
  const from = fromOverride ?? parsed.from
  const to = toOverride ?? parsed.to
  // Nothing in the text named an intent? Fall back to the same guess the tap
  // sheet makes from the pairing, rather than settling for "Move".
  const purpose = purposeOverride ?? (parsed.purposeExplicit ? parsed.purpose : defaultPurposeFor(from, to))
  const effectiveCheckDays = checkDays ?? parsed.checkDays
  const ready = !!(parsed.amount && from && to && from.key !== to.key)

  // Retyping means re-parsing: a locked-in node from a previous keystroke
  // shouldn't survive the text that replaced it.
  function onText(next) {
    setText(next)
    setFromOverride(null)
    setToOverride(null)
    setPurposeOverride(null)
  }

  function reset() {
    setText('')
    setFromOverride(null)
    setToOverride(null)
    setPurposeOverride(null)
    setCheckDays(null)
    setLandedNow(false)
    setDateOpen(false)
    setSentDate(todayISODate())
  }

  function submit(e) {
    e?.preventDefault()
    if (!ready) return
    logTransfer({
      amount: parsed.amount,
      from,
      to,
      purpose,
      sentDate: sentDate || todayISODate(),
      landed: landedNow,
      checkDays: effectiveCheckDays,
    })
    setFlash(`${fmt$(parsed.amount)} · ${from.name} → ${to.name}${landedNow ? ' · landed' : ' · in flight'}`)
    setTimeout(() => setFlash(null), 2600)
    onLogged?.({ amount: parsed.amount, from, to })
    reset()
    inputRef.current?.focus()
  }

  // A name the parser couldn't place is usually a brokerage that isn't on the
  // map yet — offer to create it rather than making the user leave the line.
  const unknownFrom = !from && parsed.fromQuery && matchNodes(nodes, parsed.fromQuery).length === 0
  const unknownTo = !to && parsed.toQuery && matchNodes(nodes, parsed.toQuery).length === 0

  function createSource(name) {
    dispatch({ type: 'ADD_CASH_SOURCE', payload: { name: name.trim(), type: 'brokerage', isHub: false, balance: null, notes: '' } })
  }

  const showAlternatives = (matches, current, onPick) =>
    matches.length > 1 && (
      <span className="flex items-center gap-1 flex-wrap">
        {matches.slice(0, 4).map(({ node }) => (
          <Chip key={node.key} active={current?.key === node.key} onClick={() => onPick(node)}>
            {nodeLabel(node)}
          </Chip>
        ))}
      </span>
    )

  return (
    <form onSubmit={submit} className="bg-surface border border-accent/30 rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Zap size={15} className="text-accent-ink flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          value={text}
          onChange={e => onText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); reset() } }}
          placeholder={`Log a push — e.g. ${EXAMPLES[example]}`}
          aria-label="Log a transfer"
          className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder-ink-tertiary focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!ready}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          Log <CornerDownLeft size={12} />
        </button>
      </div>

      {/* Everything below the line is a read-out of what the bar understood,
          plus one-tap corrections. It only appears once you start typing. */}
      {text.trim() && (
        <div className="border-t border-edge px-3 py-2 space-y-2 bg-raised/30">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className={`font-semibold tabular-nums ${parsed.amount ? 'text-ink' : 'text-ink-faint'}`}>
              {parsed.amount ? fmt$(parsed.amount) : 'amount?'}
            </span>
            <span className={from ? 'text-ink-secondary' : 'text-ink-faint'}>{from ? nodeLabel(from) : (parsed.fromQuery || 'from?')}</span>
            <ArrowRight size={12} className="text-ink-faint flex-shrink-0" aria-hidden="true" />
            <span className={to ? 'text-ink-secondary' : 'text-ink-faint'}>{to ? nodeLabel(to) : (parsed.toQuery || 'to?')}</span>
            {ready && <Check size={13} className="text-success-ink" aria-hidden="true" />}
          </div>

          {(unknownFrom || unknownTo) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {unknownFrom && (
                <button type="button" onClick={() => createSource(parsed.fromQuery)} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent-ink hover:bg-accent/20 transition-colors">
                  <Plus size={11} />Add source &ldquo;{parsed.fromQuery}&rdquo;
                </button>
              )}
              {unknownTo && (
                <button type="button" onClick={() => createSource(parsed.toQuery)} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent-ink hover:bg-accent/20 transition-colors">
                  <Plus size={11} />Add source &ldquo;{parsed.toQuery}&rdquo;
                </button>
              )}
              <span className="text-[11px] text-ink-tertiary">or open a bank account for it on the Accounts page.</span>
            </div>
          )}

          {showAlternatives(parsed.fromMatches, from, setFromOverride)}
          {showAlternatives(parsed.toMatches, to, setToOverride)}

          <div className="flex items-center gap-1.5 flex-wrap">
            {TRANSFER_PURPOSES.map(p => (
              <Chip key={p.value} active={purpose === p.value} onClick={() => setPurposeOverride(p.value)} title={p.hint}>
                {p.short}
              </Chip>
            ))}
            <span className="w-px h-4 bg-edge-strong mx-0.5" />
            <Chip active={landedNow} onClick={() => setLandedNow(v => !v)} tone="success" title="Log it as already arrived instead of in flight">
              Already landed
            </Chip>
            <Chip active={dateOpen || sentDate !== todayISODate()} onClick={() => setDateOpen(v => !v)} title="Change the send date">
              {sentDate === todayISODate() ? 'Sent today' : `Sent ${sentDate}`}
            </Chip>
          </div>

          {dateOpen && (
            <div className="max-w-[200px]">
              <DateField value={sentDate} onChange={v => setSentDate(v || todayISODate())} />
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-ink-tertiary">
              <Bell size={11} aria-hidden="true" />Remind me in
            </span>
            {CHECK_PRESETS.map(p => (
              <Chip
                key={p.days}
                active={effectiveCheckDays === p.days}
                onClick={() => setCheckDays(d => (d === p.days ? null : p.days))}
              >
                {p.label}
              </Chip>
            ))}
            {effectiveCheckDays && (
              <span className="text-[11px] text-accent-ink">
                → check back {addDaysISO(sentDate || todayISODate(), effectiveCheckDays)}
              </span>
            )}
          </div>
        </div>
      )}

      {flash && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-edge bg-success/10 text-[11px] text-success-ink animate-fade-in">
          <Check size={12} aria-hidden="true" />
          <span className="flex-1 min-w-0 truncate">Logged {flash}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Dismiss" className="text-success-ink/70 hover:text-success-ink">
            <X size={12} />
          </button>
        </div>
      )}

      {!text.trim() && (
        <div className="px-3 pb-2.5 -mt-1 text-[11px] text-ink-tertiary">
          Amount, source, destination — in any order. Add <code className="text-ink-muted">dd</code>,{' '}
          <code className="text-ink-muted">fund</code> or <code className="text-ink-muted">back</code> to tag it, and{' '}
          <code className="text-ink-muted">+3w</code> to be reminded to check on it.
        </div>
      )}
    </form>
  )
}
