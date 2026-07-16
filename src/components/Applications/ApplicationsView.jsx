import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { useHighlight } from '../../hooks/useHighlight'
import ApplicationItem from './ApplicationItem'
import RuleCheckPanel from './RuleCheckPanel'
import PageHeader from '../shared/PageHeader'
import Button from '../shared/Button'
import EmptyState from '../shared/EmptyState'
import StatCard from '../shared/StatCard'
import DateField from '../shared/DateField'
import { Pill, MultiPill } from '../shared/FilterBar'
import { inp, inpRequired } from '../shared/Field'
import { APPLICATION_STATUSES } from '../../utils/statusMeta'
import { Plus, X, ClipboardList } from 'lucide-react'

const ISSUER_SUGGESTIONS = ['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover']

const OPEN_STATUSES = ['planned', 'applied', 'pending']

function blankApp(memberId) {
  return {
    memberId,
    status: 'planned',
    product: '',
    issuer: '',
    appliedDate: '',
    bonusValue: '',
    bonusType: 'points',
    spendRequirement: '',
    spendDeadlineDays: '',
    annualFee: '',
    isBusiness: false,
    notes: '',
  }
}

export default function ApplicationsView() {
  const { state, dispatch } = useChurn()
  const members = state.members ?? []
  const apps = state.applications ?? []

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(null)
  const [filterMember, setFilterMember] = useState('all')
  const [filterStatuses, setFilterStatuses] = useState([])

  const location = useLocation()
  useHighlight()
  const wantsAdd = new URLSearchParams(location.search).get('add') === '1'
  useEffect(() => {
    if (wantsAdd) startAdd()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per deep-link navigation
  }, [wantsAdd, location.key])

  function startAdd() {
    setDraft(blankApp(members[0]?.id ?? 'p1'))
    setAdding(true)
  }

  function cancelAdd() {
    setAdding(false)
    setDraft(null)
  }

  function setD(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  function saveAdd() {
    if (!draft?.product?.trim()) return
    dispatch({
      type: 'ADD_APPLICATION',
      payload: {
        ...draft,
        product: draft.product.trim(),
        issuer: draft.issuer.trim(),
        appliedDate: draft.appliedDate || (draft.status !== 'planned' ? new Date().toISOString().slice(0, 10) : ''),
        bonusValue: draft.bonusValue !== '' ? parseFloat(draft.bonusValue) : undefined,
        spendRequirement: draft.spendRequirement !== '' ? parseFloat(draft.spendRequirement) : undefined,
        spendDeadlineDays: draft.spendDeadlineDays !== '' ? parseInt(draft.spendDeadlineDays) : undefined,
        annualFee: draft.annualFee !== '' ? parseFloat(draft.annualFee) : undefined,
        createdAt: new Date().toISOString(),
      },
    })
    cancelAdd()
  }

  const filtered = apps.filter(a => {
    if (filterMember !== 'all' && a.memberId !== filterMember) return false
    if (filterStatuses.length && !filterStatuses.includes(a.status)) return false
    return true
  })

  const sortKey = (a) => a.appliedDate || (a.createdAt ?? '').slice(0, 10) || '1970-01-01'
  const sorted = [...filtered].sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
  const inFlight = sorted.filter(a => OPEN_STATUSES.includes(a.status))
  const decided = sorted.filter(a => !OPEN_STATUSES.includes(a.status))

  // Pipeline stats over the member filter (status filter shouldn't hide the funnel shape)
  const memberScoped = apps.filter(a => filterMember === 'all' || a.memberId === filterMember)
  const openCount = memberScoped.filter(a => OPEN_STATUSES.includes(a.status)).length
  const approvedCount = memberScoped.filter(a => a.status === 'approved').length
  const deniedCount = memberScoped.filter(a => a.status === 'denied').length
  const decidedCount = approvedCount + deniedCount

  function toggleStatus(s) {
    setFilterStatuses(f => (f.includes(s) ? f.filter(x => x !== s) : [...f, s]))
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <PageHeader
        title="Applications"
        actions={
          !adding && (
            <Button variant="primary" onClick={startAdd}>
              <Plus size={14} />
              Add Application
            </Button>
          )
        }
      />

      {/* Person filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Pill active={filterMember === 'all'} onClick={() => setFilterMember('all')}>All</Pill>
        {members.map(p => (
          <button
            key={p.id}
            onClick={() => setFilterMember(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filterMember === p.id ? 'bg-overlay text-ink' : 'bg-raised text-ink-muted hover:text-ink-secondary'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.hex }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {APPLICATION_STATUSES.map(s => (
          <MultiPill key={s.value} value={s.value} values={filterStatuses} onToggle={toggleStatus} label={s.label} />
        ))}
      </div>

      {/* Pipeline stats */}
      {apps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="In Flight" value={openCount} />
          <StatCard label="Approved" value={approvedCount} tone="success" />
          <StatCard label="Denied" value={deniedCount} tone={deniedCount > 0 ? 'danger' : 'default'} />
          <StatCard
            label="Approval Rate"
            value={decidedCount > 0 ? `${Math.round((approvedCount / decidedCount) * 100)}%` : '—'}
            sub={decidedCount > 0 ? `${decidedCount} decided` : 'no decisions yet'}
          />
        </div>
      )}

      {/* Add form */}
      {adding && draft && (
        <div className="bg-surface border border-accent/40 rounded-xl overflow-hidden mb-4 animate-slide-up">
          <div className="flex items-center justify-between p-4 pb-2">
            <span className="text-sm font-semibold text-ink">New Application</span>
            <button onClick={cancelAdd} aria-label="Cancel" className="text-ink-tertiary hover:text-ink-secondary transition-colors"><X size={15} /></button>
          </div>
          <div className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Person</label>
                <select className={inp} value={draft.memberId} onChange={e => setD('memberId', e.target.value)}>
                  {members.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Status</label>
                <select className={inp} value={draft.status} onChange={e => setD('status', e.target.value)}>
                  {APPLICATION_STATUSES.filter(s => s.value !== 'approved').map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-accent-ink block mb-1 font-medium">Product <span>*required</span></label>
              <input className={inpRequired} value={draft.product} onChange={e => setD('product', e.target.value)} placeholder="e.g. Sapphire Preferred" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Issuer</label>
                <input list="app-issuers" className={inp} value={draft.issuer} onChange={e => setD('issuer', e.target.value)} placeholder="Chase" />
                <datalist id="app-issuers">
                  {ISSUER_SUGGESTIONS.map(i => <option key={i} value={i} />)}
                </datalist>
              </div>
              {draft.status !== 'planned' && (
                <div>
                  <label className="text-xs text-ink-tertiary block mb-1">Applied Date</label>
                  <DateField value={draft.appliedDate} onChange={v => setD('appliedDate', v)} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Bonus</label>
                <input type="number" min="0" className={inp} value={draft.bonusValue} onChange={e => setD('bonusValue', e.target.value)} placeholder="60000" />
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Type</label>
                <select className={inp} value={draft.bonusType} onChange={e => setD('bonusType', e.target.value)}>
                  <option value="points">Points</option>
                  <option value="cashback">Cash</option>
                  <option value="miles">Miles</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Spend Req ($)</label>
                <input type="number" min="0" className={inp} value={draft.spendRequirement} onChange={e => setD('spendRequirement', e.target.value)} placeholder="4000" />
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Days</label>
                <input type="number" min="1" className={inp} value={draft.spendDeadlineDays} onChange={e => setD('spendDeadlineDays', e.target.value)} placeholder="90" />
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Annual Fee</label>
                <input type="number" min="0" className={inp} value={draft.annualFee} onChange={e => setD('annualFee', e.target.value)} placeholder="0" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
              <input type="checkbox" checked={!!draft.isBusiness} onChange={e => setD('isBusiness', e.target.checked)} />
              Business card
            </label>

            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Notes</label>
              <textarea rows={2} className={inp} value={draft.notes} onChange={e => setD('notes', e.target.value)} placeholder="optional" />
            </div>

            {/* Live before-you-apply verdicts for the selected member/issuer/product */}
            <RuleCheckPanel memberId={draft.memberId} issuer={draft.issuer} product={draft.product} state={state} />

            <div className="flex gap-2 pt-1">
              <button onClick={cancelAdd} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={saveAdd} disabled={!draft.product?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Add Application</button>
            </div>
          </div>
        </div>
      )}

      {apps.length === 0 && !adding ? (
        <EmptyState
          icon={ClipboardList}
          title="No applications yet"
          hint="Plan your next card here and check 5/24 and issuer velocity rules before anyone hits apply. Denials are worth tracking too."
          action={<Button variant="primary" onClick={startAdd}><Plus size={14} />Add Application</Button>}
        />
      ) : filtered.length === 0 && !adding ? (
        <EmptyState
          icon={ClipboardList}
          title="No applications match these filters"
          action={<Button onClick={() => { setFilterMember('all'); setFilterStatuses([]) }}>Clear filters</Button>}
        />
      ) : (
        <div className="space-y-6">
          {inFlight.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-ink mb-2">In Flight <span className="text-xs text-ink-tertiary font-normal">{inFlight.length}</span></h2>
              <div className="space-y-3">
                {inFlight.map(app => <ApplicationItem key={app.id} app={app} members={members} state={state} />)}
              </div>
            </section>
          )}
          {decided.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-ink-tertiary mb-2 pt-2 border-t border-edge">Decided <span className="text-xs text-ink-faint font-normal">{decided.length}</span></h2>
              <div className="space-y-3">
                {decided.map(app => <ApplicationItem key={app.id} app={app} members={members} state={state} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
