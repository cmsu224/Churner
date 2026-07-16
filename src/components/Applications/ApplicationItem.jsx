import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import RuleCheckPanel from './RuleCheckPanel'
import { inp, inpRequired } from '../shared/Field'
import { APPLICATION_STATUSES } from '../../utils/statusMeta'
import { fmtDate } from '../../utils/format'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

const ISSUER_OPTIONS = ['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover']

const btnColors = {
  emerald: 'border border-edge-strong text-ink-tertiary hover:text-success-ink hover:border-success/50',
  amber:   'border border-edge-strong text-ink-tertiary hover:text-warning-ink hover:border-warning/50',
  blue:    'border border-edge-strong text-ink-tertiary hover:text-accent-ink hover:border-accent/50',
  red:     'border border-edge-strong text-ink-tertiary hover:text-danger-ink hover:border-danger/50',
}

function today() { return new Date().toISOString().slice(0, 10) }

// "Mark as" quick actions per application status — mirrors CardItem's pattern.
// 'approve' and 'deny' open an inline confirm block instead of dispatching
// immediately (approval needs an open date to convert to a tracked card;
// denial takes an optional reason).
function getQuickActions(app) {
  switch (app.status) {
    case 'planned':
      return [{ label: 'Applied today', color: 'blue', kind: 'plain', payload: { status: 'applied', appliedDate: today() } }]
    case 'applied':
      return [
        { label: 'Pending', color: 'amber', kind: 'plain', payload: { status: 'pending' } },
        { label: '✓ Approved', color: 'emerald', kind: 'approve' },
        { label: '✗ Denied', color: 'red', kind: 'deny' },
      ]
    case 'pending':
      return [
        { label: '✓ Approved', color: 'emerald', kind: 'approve' },
        { label: '✗ Denied', color: 'red', kind: 'deny' },
      ]
    case 'denied':
      return [{ label: 'Reconsidered → Approved', color: 'emerald', kind: 'approve' }]
    default:
      return []
  }
}

export default function ApplicationItem({ app, members, state }) {
  const { dispatch } = useChurn()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertDate, setConvertDate] = useState(today())
  const [denyOpen, setDenyOpen] = useState(false)
  const [denyReason, setDenyReason] = useState('')

  const quickActions = getQuickActions(app)
  const showRuleCheck = ['planned', 'applied', 'pending'].includes(app.status)

  // Close any inline confirm block if the status changes out from under it
  // (render-time state adjustment, same pattern CardItem uses for downgrade).
  const [prevStatus, setPrevStatus] = useState(app.status)
  if (prevStatus !== app.status) {
    setPrevStatus(app.status)
    setConvertOpen(false)
    setDenyOpen(false)
  }

  function startEdit() {
    setDraft({ ...app })
    setExpanded(true)
  }
  function cancelEdit() {
    setDraft(null)
    setExpanded(false)
  }
  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  function saveEdit() {
    if (!draft?.product?.trim()) return
    const num = (v) => (v !== '' && v != null ? parseFloat(v) : undefined)
    dispatch({
      type: 'UPDATE_APPLICATION',
      payload: {
        ...draft,
        product: draft.product.trim(),
        bonusValue: num(draft.bonusValue),
        spendRequirement: num(draft.spendRequirement),
        spendDeadlineDays: draft.spendDeadlineDays !== '' && draft.spendDeadlineDays != null ? parseInt(draft.spendDeadlineDays) : undefined,
        annualFee: num(draft.annualFee),
        appliedDate: draft.appliedDate || null,
        decisionDate: draft.decisionDate || null,
      },
    })
    setDraft(null)
    setExpanded(false)
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_APPLICATION', id: app.id })
    setConfirming(false)
  }

  function runQuickAction(e, action) {
    e.stopPropagation()
    if (action.kind === 'plain') {
      dispatch({ type: 'UPDATE_APPLICATION', payload: { ...app, ...action.payload } })
    } else if (action.kind === 'approve') {
      setDenyOpen(false)
      setConvertDate(today())
      setConvertOpen(true)
    } else if (action.kind === 'deny') {
      setConvertOpen(false)
      setDenyReason('')
      setDenyOpen(true)
    }
  }

  function confirmConvert(e) {
    e.stopPropagation()
    const card = {
      memberId: app.memberId,
      cardName: app.product,
      issuer: app.issuer,
      last4: '',
      openDate: convertDate,
      status: (!app.bonusValue && !app.spendRequirement) ? 'Keep Alive' : 'Active Churn',
      currentSpend: 0,
      currentBalance: 0,
      creditLimit: 0,
      spendRequirement: app.spendRequirement,
      spendDeadlineDays: app.spendDeadlineDays,
      bonusValue: app.bonusValue,
      bonusType: app.bonusType,
      annualFee: app.annualFee,
      bonusReceived: false,
      isBusiness: !!app.isBusiness,
      isAuthorizedUser: false,
      notes: '',
    }
    dispatch({ type: 'CONVERT_APPLICATION', applicationId: app.id, card })
    setConvertOpen(false)
  }

  function confirmDeny(e) {
    e.stopPropagation()
    dispatch({
      type: 'UPDATE_APPLICATION',
      payload: { ...app, status: 'denied', decisionDate: today(), deniedReason: denyReason.trim() || undefined },
    })
    setDenyOpen(false)
  }

  return (
    <div id={`item-${app.id}`} className="bg-surface border border-edge-strong rounded-xl overflow-hidden hover:border-edge-strong transition-colors">
      {/* Collapsed header */}
      <div className="w-full p-4 cursor-pointer select-none" onClick={() => (expanded ? cancelEdit() : startEdit())}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <IssuerLogo name={app.issuer || app.product} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-ink text-sm">{app.product}</span>
                {app.issuer && <span className="text-ink-tertiary text-xs">{app.issuer}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
                <PlayerBadge memberId={app.memberId} members={members} />
                <StatusBadge status={app.status} />
                {app.appliedDate && (
                  <span className="text-ink-tertiary text-xs bg-raised px-1.5 py-0.5 rounded">Applied {fmtDate(app.appliedDate)}</span>
                )}
                {app.convertedCardId && (
                  <span className="text-success-ink text-xs bg-success/15 border border-success/30 px-1.5 py-0.5 rounded">✓ tracking as card</span>
                )}
              </div>
              {app.status === 'denied' && app.deniedReason && (
                <div className="text-danger-ink text-xs mt-1 truncate">{app.deniedReason}</div>
              )}
            </div>
          </div>
          <span className="text-ink-tertiary flex-shrink-0">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </div>

      {/* Quick actions — collapsed only, hidden once already converted to a card */}
      {!expanded && !app.convertedCardId && (quickActions.length > 0 || convertOpen || denyOpen) && (
        <div className="px-4 pb-3 pt-0 flex gap-2 flex-wrap items-center border-t border-edge" onClick={e => e.stopPropagation()}>
          {convertOpen ? (
            <div className="flex gap-2 flex-wrap pt-2.5 flex-1 items-center">
              <span className="text-xs text-ink-secondary flex-shrink-0">Add to tracked cards? Open date</span>
              <div className="w-36"><DateField value={convertDate} onChange={setConvertDate} /></div>
              <button onClick={() => setConvertOpen(false)} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-edge-strong text-ink-tertiary hover:text-ink-secondary`}>Cancel</button>
              <button onClick={confirmConvert} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${btnColors.emerald}`}>Confirm</button>
            </div>
          ) : denyOpen ? (
            <div className="flex gap-2 flex-wrap pt-2.5 flex-1 items-center">
              <input
                autoFocus
                value={denyReason}
                onChange={e => setDenyReason(e.target.value)}
                placeholder="Denial reason (optional)"
                className="flex-1 min-w-0 bg-raised border border-edge-strong rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent"
                onKeyDown={e => { if (e.key === 'Enter') confirmDeny(e); if (e.key === 'Escape') setDenyOpen(false) }}
              />
              <button onClick={() => setDenyOpen(false)} className="text-xs px-2.5 py-1.5 rounded-lg transition-colors border border-edge-strong text-ink-tertiary hover:text-ink-secondary">Cancel</button>
              <button onClick={confirmDeny} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${btnColors.red}`}>Confirm</button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap pt-2.5 flex-1 items-center">
              <span className="text-[10px] text-ink-faint uppercase tracking-wider font-medium flex-shrink-0">Mark as</span>
              {quickActions.map(action => (
                <button
                  key={action.label}
                  onClick={e => runQuickAction(e, action)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${btnColors[action.color] ?? btnColors.blue}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {expanded && confirming && (
        <div className="border-t border-edge-strong p-4">
          <p className="text-sm text-ink-secondary mb-3">Delete <strong className="text-ink">{app.product}</strong>? This cannot be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleDelete} className="flex-1 bg-danger hover:bg-danger/85 text-ink py-2 rounded-lg text-sm font-semibold transition-colors">Delete</button>
          </div>
        </div>
      )}

      {/* Expanded edit form */}
      {expanded && draft && !confirming && (
        <div className="border-t border-edge-strong p-4 space-y-3">
          {showRuleCheck && (
            <RuleCheckPanel memberId={draft.memberId} issuer={draft.issuer} product={draft.product} state={state} />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-muted block mb-1">Person</label>
              <select className={inp} value={draft.memberId ?? ''} onChange={e => set('memberId', e.target.value)}>
                {(members ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-muted block mb-1">Status</label>
              <select className={inp} value={draft.status ?? 'planned'} onChange={e => set('status', e.target.value)}>
                {APPLICATION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-accent-ink block mb-1 font-medium">Product Name <span className="text-accent-ink">*required</span></label>
            <input className={inpRequired} value={draft.product ?? ''} onChange={e => set('product', e.target.value)} placeholder="e.g. Sapphire Preferred" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Issuer</label>
              <input list={`issuers-${app.id}`} className={inp} value={draft.issuer ?? ''} onChange={e => set('issuer', e.target.value)} placeholder="Chase" />
              <datalist id={`issuers-${app.id}`}>
                {ISSUER_OPTIONS.map(i => <option key={i} value={i} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Applied Date</label>
              <DateField value={draft.appliedDate} onChange={v => set('appliedDate', v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Spend Req ($)</label>
              <input type="number" min="0" className={inp} value={draft.spendRequirement ?? ''} onChange={e => set('spendRequirement', e.target.value)} placeholder="4000" />
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Days</label>
              <input type="number" min="1" className={inp} value={draft.spendDeadlineDays ?? ''} onChange={e => set('spendDeadlineDays', e.target.value)} placeholder="90" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Bonus</label>
              <input type="number" min="0" className={inp} value={draft.bonusValue ?? ''} onChange={e => set('bonusValue', e.target.value)} placeholder="pts/$" />
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Type</label>
              <select className={inp} value={draft.bonusType ?? 'points'} onChange={e => set('bonusType', e.target.value)}>
                <option value="points">Points</option>
                <option value="cashback">Cash</option>
                <option value="miles">Miles</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Annual Fee</label>
              <input type="number" min="0" className={inp} value={draft.annualFee ?? ''} onChange={e => set('annualFee', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Decision Date</label>
              <DateField value={draft.decisionDate} onChange={v => set('decisionDate', v)} />
            </div>
            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Denial Reason</label>
              <input className={inp} value={draft.deniedReason ?? ''} onChange={e => set('deniedReason', e.target.value)} placeholder="optional" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
            <input type="checkbox" checked={!!draft.isBusiness} onChange={e => set('isBusiness', e.target.checked)} />
            Business card
          </label>

          <div>
            <label className="text-xs text-ink-tertiary block mb-1">Notes</label>
            <textarea rows={2} className={inp} value={draft.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="recon notes, offer terms, etc." />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setConfirming(true)} className="p-2 text-ink-tertiary hover:text-danger-ink transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={cancelEdit} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={saveEdit} disabled={!draft.product?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-ink font-semibold py-2 rounded-lg text-sm transition-colors">Save</button>
          </div>
        </div>
      )}
    </div>
  )
}
