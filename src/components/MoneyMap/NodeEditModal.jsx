import { useState } from 'react'
import Modal from '../shared/Modal'
import Field, { inp, inpRequired } from '../shared/Field'
import { useChurn } from '../../store/ChurnContext'
import { CASH_SOURCE_TYPES, nodeKey, isNodeHidden, setNodeHidden, hideBlockedReason } from '../../engines/moneyFlow'
import { ACCOUNT_STATUSES } from '../../utils/statusMeta'
import { getIssuerMeta } from '../../utils/issuers'
import IssuerLogo from '../shared/IssuerLogo'
import { Landmark, Wallet, Home, Trash2, Check, Palette, EyeOff, AlertTriangle } from 'lucide-react'

const ACCT_TYPES = ['Checking', 'Savings', 'Money Market', 'CD']

const COLOR_PRESETS = [
  { label: 'Default', hex: null },
  { label: 'Chase Blue', hex: '#117ACA' },
  { label: 'Amex Cyan', hex: '#006FCF' },
  { label: 'Citi Navy', hex: '#003B70' },
  { label: 'CapOne Blue', hex: '#004977' },
  { label: 'BofA Red', hex: '#E31837' },
  { label: 'Wells Red', hex: '#D71E28' },
  { label: 'US Bank', hex: '#0C2074' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Forest', hex: '#2D6E3E' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Orange', hex: '#ea580c' },
  { label: 'Rose', hex: '#e11d48' },
  { label: 'Purple', hex: '#7c3aed' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Slate', hex: '#334155' },
]

export default function NodeEditModal({ node, onClose }) {
  const { state, dispatch } = useChurn()
  const members = state.members ?? []

  const isAccount = node?.kind === 'account'
  const isSource = node?.kind === 'source'

  // Retrieve raw object from state
  const rawAccount = isAccount ? state.bankAccounts.find(a => a.id === node.id) : null
  const rawSource = isSource ? (state.cashSources ?? []).find(s => s.id === node.id) : null

  const [name, setName] = useState(
    isAccount ? (rawAccount?.bankName ?? node.name ?? '') : (rawSource?.name ?? node.name ?? '')
  )
  const [balance, setBalance] = useState(
    isAccount
      ? (rawAccount?.currentBalance != null ? String(rawAccount.currentBalance) : '')
      : (rawSource?.balance != null ? String(rawSource.balance) : '')
  )
  const [color, setColor] = useState(
    isAccount ? (rawAccount?.color || '') : (rawSource?.color || '')
  )
  const [type, setType] = useState(
    isAccount ? (rawAccount?.accountType || 'Checking') : (rawSource?.type || 'brokerage')
  )
  const [memberId, setMemberId] = useState(rawAccount?.memberId || members[0]?.id || 'p1')
  const [status, setStatus] = useState(rawAccount?.status || 'Opened')
  const [isHub, setIsHub] = useState(isAccount ? !!rawAccount?.isHub : !!rawSource?.isHub)
  const [bonusAmount, setBonusAmount] = useState(
    rawAccount?.bonusAmount != null ? String(rawAccount.bonusAmount) : ''
  )
  const [last4, setLast4] = useState(rawAccount?.last4 != null ? String(rawAccount.last4) : '')
  // What the account held before its first logged push. $0 for a churn you
  // opened empty; whatever was already in there for an everyday account you
  // added to the map later. It is the baseline the reconcile check measures
  // against, and leaving it at 0 for an account that wasn't empty is what made
  // that check accuse a correct balance of being wrong.
  const [openingBalance, setOpeningBalance] = useState(
    rawAccount?.openingBalance != null ? String(rawAccount.openingBalance) : ''
  )
  const [notes, setNotes] = useState(isAccount ? (rawAccount?.notes || '') : (rawSource?.notes || ''))
  // Off the map, but still in the app. Kept in the same synced layout object as
  // the column arrangement, and edited here alongside everything else about the
  // account so the difference between hiding and deleting is on one screen.
  const [hidden, setHidden] = useState(() => isNodeHidden(node, state.moneyMapLayout))
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!node || (!rawAccount && !rawSource)) return null

  function numOrNull(v) {
    if (v === '' || v == null) return null
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  function handleSave(e) {
    e?.preventDefault()
    if (!name.trim()) return

    const trimmedColor = color.trim() || null
    const cleanLast4 = String(last4 || '').trim()

    if (isAccount && rawAccount) {
      const parsedBalance = balance !== '' && balance != null ? parseFloat(balance) || 0 : 0
      const updated = {
        ...rawAccount,
        bankName: name.trim(),
        currentBalance: parsedBalance,
        openingBalance: numOrNull(openingBalance) ?? 0,
        color: trimmedColor,
        accountType: type,
        memberId,
        status,
        isHub,
        minimumBalance: rawAccount.minimumBalance ?? null,
        bonusAmount: numOrNull(bonusAmount),
        last4: cleanLast4 ? cleanLast4.slice(-4) : undefined,
        notes,
      }
      dispatch({ type: 'UPDATE_ACCOUNT', payload: updated })
      if (isHub && !rawAccount.isHub) {
        dispatch({ type: 'SET_HUB', key: nodeKey('account', rawAccount.id) })
      }
    } else if (isSource && rawSource) {
      const parsedBalance = numOrNull(balance)
      const updated = {
        ...rawSource,
        name: name.trim(),
        balance: parsedBalance,
        color: trimmedColor,
        type,
        isHub,
        notes,
      }
      dispatch({ type: 'UPDATE_CASH_SOURCE', payload: updated })
      if (isHub && !rawSource.isHub) {
        dispatch({ type: 'SET_HUB', key: nodeKey('source', rawSource.id) })
      }
    }

    // The hub is the one card that can't leave the map — everything aims money
    // back at it — so promoting a hidden card to hub also puts it back.
    const nextHidden = hidden && !isHub
    if (nextHidden !== isNodeHidden(node, state.moneyMapLayout)) {
      dispatch({ type: 'SET_MAP_LAYOUT', layout: setNodeHidden(state.moneyMapLayout ?? {}, node.key, nextHidden) })
    }

    onClose()
  }

  function hideAndClose() {
    dispatch({ type: 'SET_MAP_LAYOUT', layout: setNodeHidden(state.moneyMapLayout ?? {}, node.key, true) })
    onClose()
  }

  function handleDelete() {
    if (isAccount && rawAccount) {
      dispatch({ type: 'DELETE_ACCOUNT', id: rawAccount.id })
    } else if (isSource && rawSource) {
      dispatch({ type: 'DELETE_CASH_SOURCE', id: rawSource.id })
    }
    onClose()
  }

  // Checking "Set as Main Hub" in this same form has to take effect here too,
  // or the two boxes could be saved contradicting each other.
  const hideBlocked = hideBlockedReason({ ...node, isHub })

  const Icon = isSource ? (isHub ? Home : Wallet) : Landmark

  return (
    <Modal sheet title={`Edit ${isAccount ? 'Bank Account' : 'Cash Source'}`} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        {/* Header summary badge */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-raised/60 border border-edge">
          {getIssuerMeta(name).domain ? (
            <IssuerLogo name={name} size={32} rounded="rounded-lg" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
              style={{ backgroundColor: color || (isSource ? '#475569' : '#059669') }}
            >
              <Icon size={16} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-ink truncate">{name || 'Untitled'}</div>
            <div className="text-xs text-ink-tertiary">
              {isAccount ? `${type} · ${members.find(m => m.id === memberId)?.name ?? 'Member'}` : `Cash Source (${type})`}
            </div>
          </div>
        </div>

        {/* Name and Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={isAccount ? 'Bank Name & Last 4' : 'Source Name'} required>
            {isAccount ? (
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 min-w-0 bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Chase Total Checking"
                  autoFocus
                />
                <input
                  maxLength={4}
                  className="w-24 bg-raised border border-edge-strong rounded-lg px-2 py-2 text-sm text-center font-mono text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors flex-shrink-0"
                  value={last4}
                  onChange={e => setLast4(e.target.value)}
                  placeholder="···1234"
                  title="Last 4 digits of account"
                />
              </div>
            ) : (
              <input
                className={inpRequired}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Fidelity Brokerage"
                autoFocus
              />
            )}
          </Field>
          <Field
            label="Current Balance / Amount ($)"
            hint={isSource ? 'Leave blank if you do not track this source’s balance' : 'Live balance in account'}
          >
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-tertiary pointer-events-none">$</span>
              <input
                type="number"
                step="any"
                className={`${inp} pl-7`}
                value={balance}
                onChange={e => setBalance(e.target.value)}
                placeholder={isSource ? 'Untracked' : '0.00'}
              />
            </div>
          </Field>
        </div>

        {/* Color Picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-ink-tertiary flex items-center gap-1.5">
              <Palette size={13} className="text-ink-muted" /> Bank / Card Accent Color
            </label>
            {color && (
              <button
                type="button"
                onClick={() => setColor('')}
                className="text-[11px] text-ink-tertiary hover:text-ink transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>
          <div className="p-3 rounded-xl bg-raised/40 border border-edge space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map(preset => {
                const isSelected = (!color && !preset.hex) || (color && color.toLowerCase() === preset.hex?.toLowerCase())
                return (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.label}
                    onClick={() => setColor(preset.hex || '')}
                    className={`w-6 h-6 rounded-full border-2 transition-transform relative flex items-center justify-center ${
                      isSelected ? 'scale-110 border-accent shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    style={{
                      backgroundColor: preset.hex || 'var(--color-ink-faint, #71717a)',
                      background: preset.hex
                        ? preset.hex
                        : 'repeating-linear-gradient(45deg, #a1a1aa, #a1a1aa 2px, #e4e4e7 2px, #e4e4e7 6px)',
                    }}
                  >
                    {isSelected && <Check size={12} className="text-white drop-shadow" />}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-edge-strong/40">
              <span className="text-[11px] text-ink-muted">Custom hex:</span>
              <input
                type="color"
                value={color && color.startsWith('#') && color.length === 7 ? color : '#117ACA'}
                onChange={e => setColor(e.target.value)}
                className="w-7 h-7 rounded border border-edge cursor-pointer bg-transparent"
                title="Pick custom color"
              />
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#117ACA"
                className="w-28 bg-raised border border-edge rounded px-2 py-1 text-xs text-ink font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Account / Source specifics */}
        {isAccount ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Account Type">
              <select className={inp} value={type} onChange={e => setType(e.target.value)}>
                {ACCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Member / Player">
              <select className={inp} value={memberId} onChange={e => setMemberId(e.target.value)}>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <select className={inp} value={status} onChange={e => setStatus(e.target.value)}>
                {ACCOUNT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Bonus Amount ($)">
              <input
                type="number"
                step="any"
                className={inp}
                value={bonusAmount}
                onChange={e => setBonusAmount(e.target.value)}
                placeholder="e.g. 300"
              />
            </Field>

            <Field
              label="Started With ($)"
              hint="What it already held before your first logged push — $0 for an account you opened empty. A record of where its balance started, kept alongside the ledger."
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-tertiary pointer-events-none">$</span>
                <input
                  type="number"
                  step="any"
                  className={`${inp} pl-7`}
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Source Type">
              <select className={inp} value={type} onChange={e => setType(e.target.value)}>
                {CASH_SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
        )}

        {/* Hub checkbox */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-raised/40 border border-edge cursor-pointer hover:bg-raised/70 transition-colors">
          <input
            type="checkbox"
            checked={isHub}
            onChange={e => setIsHub(e.target.checked)}
            className="mt-0.5 rounded border-edge-strong text-accent focus:ring-accent"
          />
          <div>
            <span className="block text-xs font-semibold text-ink">Set as Main Hub</span>
            <span className="block text-[11px] text-ink-tertiary">
              Money is expected to originate from and sweep back to this account. Sweep-back reminders target the hub.
            </span>
          </div>
        </label>

        {/* On/off the map. Sits with the hub checkbox because they are the two
            "where does this card live on the picture" settings, and directly
            above Delete because that's the choice this is here to offer. */}
        <label
          className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
            hideBlocked
              ? 'bg-raised/20 border-edge opacity-60 cursor-not-allowed'
              : 'bg-raised/40 border-edge cursor-pointer hover:bg-raised/70'
          }`}
        >
          <input
            type="checkbox"
            checked={hidden && !hideBlocked}
            disabled={!!hideBlocked}
            onChange={e => setHidden(e.target.checked)}
            className="mt-0.5 rounded border-edge-strong text-accent focus:ring-accent"
          />
          <div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <EyeOff size={13} />
              Hide from the Money Map
            </span>
            <span className="block text-[11px] text-ink-tertiary">
              {hideBlocked
                ? `Can't hide the hub — ${hideBlocked.toLowerCase()}.`
                : 'Stops this card being drawn on the map. Nothing is deleted: it keeps its balance, still counts in every total, and still raises its reminders. Un-hide it here, or from the “hidden — show” toggle above the map.'}
            </span>
          </div>
        </label>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            rows={2}
            className={inp}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Account notes, bonus requirements, login hints..."
          />
        </Field>

        {/* Form Actions */}
        <div className="pt-2 border-t border-edge flex items-center justify-between gap-2 flex-wrap">
          {confirmDelete ? (
            /* Delete is not hide, and confusing the two costs real data — so
               the confirm step says exactly what goes, and offers hiding as the
               thing most people actually wanted. */
            <div className="w-full space-y-2.5 rounded-xl border border-danger/30 bg-danger/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-danger-ink flex-shrink-0 mt-px" aria-hidden="true" />
                <div className="text-[11px] text-ink-secondary leading-relaxed">
                  <span className="block text-xs font-semibold text-ink mb-0.5">
                    Delete {name || 'this'} everywhere?
                  </span>
                  {isAccount
                    ? 'This removes the account from the whole app — the Accounts page, its balance, its bonus tracking, its reminders — not just from the map. Its balance stops counting in the totals. Transfers already logged against it stay in the ledger, drawn from a greyed-out “Removed account” placeholder. This cannot be undone.'
                    : 'This removes the cash source from the whole app, not just from the map. Its balance stops counting in the totals. Transfers already logged against it stay in the ledger, drawn from a greyed-out “Removed account” placeholder. This cannot be undone.'}
                  <span className="block mt-1.5 text-ink-tertiary">
                    Just want it off the map? Hide it instead — it keeps everything and stays one tap from coming back.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-danger hover:bg-danger/85 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                >
                  Delete permanently
                </button>
                {!hideBlocked && !hidden && (
                  <button
                    type="button"
                    onClick={hideAndClose}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-edge-strong bg-surface text-ink-muted hover:text-ink hover:bg-raised transition-colors"
                  >
                    <EyeOff size={13} /> Hide from the map instead
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-ink-muted hover:text-ink px-2 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title={`Delete ${isAccount ? 'this account' : 'this source'} from the whole app. To only take it off the map, hide it instead.`}
              className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-danger-ink p-2 rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Delete everywhere
            </button>
          )}

          <div className={`flex items-center gap-2 ml-auto ${confirmDelete ? 'hidden' : ''}`}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-raised transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent hover:bg-accent-hover disabled:opacity-40 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check size={14} /> Save Changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
