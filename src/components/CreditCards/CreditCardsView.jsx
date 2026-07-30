import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { useHighlight } from '../../hooks/useHighlight'
import CardItem from './CardItem'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import FilterBar, { Pill, MultiPill, Chip, FilterRow, Toggle } from '../shared/FilterBar'
import { getIssuerMeta } from '../../utils/issuers'
import { CARD_STATUSES } from '../../utils/statusMeta'
import { getSmartCardStatus, getCardAttentionScore } from '../../engines/lifecycle'
import { getCardAge } from '../../engines/creditAge'
import { Plus, X, Layers, ChevronDown, ChevronUp } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'fee',      label: 'Highest annual fee' },
  { value: 'name',     label: 'Name A–Z' },
]
const AGE_RANGES = [
  { value: 'any',  label: 'Any' },
  { value: 'lt1',  label: '< 1yr' },
  { value: '1to2', label: '1–2yr' },
  { value: '2to4', label: '2–4yr' },
  { value: 'gt4',  label: '4+yr' },
]
// Cards are ordered by how much attention they need by default — see
// getCardAttentionScore in the lifecycle engine.
const DEFAULT_SORT = 'recommended'
// Keep-alive cards are long-term holds that need no action, so they're hidden
// by default to keep the list focused on cards that do.
const DEFAULT_FILTERS = { statuses: [], issuers: [], ageRange: 'any', hasAnnualFee: false, bonusPending: false, hideClosed: false, hideKeepAlive: true }

const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'
const inpRequired = 'w-full bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

// Group cards by issuer; "Other" bucket last.
function groupByIssuer(cards) {
  const groups = {}
  for (const c of cards) {
    const meta = getIssuerMeta(c.issuer || c.cardName)
    if (!groups[meta.key]) groups[meta.key] = { meta, cards: [] }
    groups[meta.key].cards.push(c)
  }
  return Object.values(groups).sort((a, b) => {
    if (a.meta.key === 'other') return 1
    if (b.meta.key === 'other') return -1
    return b.cards.length - a.cards.length || a.meta.name.localeCompare(b.meta.name)
  })
}

export default function CreditCardsView() {
  const { state, dispatch } = useChurn()
  const members = state.members ?? []
  const allCards = state.creditCards ?? []
  // Deep links: ?add=1 opens the add form, ?logspend=<cardId> opens that
  // card's log-spend row, ?highlight=<id> flashes, ?member=<id> pre-filters to
  // one person (used by the Dashboard's member summary cards).
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const logSpendCardId = params.get('logspend')
  const wantsAdd = params.get('add') === '1'
  const [adding, setAdding] = useState(false)
  const [newCard, setNewCard] = useState(null)
  const [filterMember, setFilterMember] = useState(() => params.get('member') ?? 'all')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState(DEFAULT_SORT)
  // Grouping is now an explicit, opt-in view mode — decoupled from the sort so
  // "Newest first" shows a true global newest-first order instead of silently
  // bucketing by issuer first.
  const [groupByBrand, setGroupByBrand] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useHighlight()
  useEffect(() => {
    if (wantsAdd) startAdd()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per deep-link navigation
  }, [wantsAdd, location.key])

  // Unique issuer names present in the data (for the issuer filter pills).
  const availableIssuers = [...new Set(
    allCards.map(c => getIssuerMeta(c.issuer || c.cardName).name).filter(n => n && n !== 'Other')
  )].sort()

  function toggleStatus(s) {
    setFilters(f => ({ ...f, statuses: f.statuses.includes(s) ? f.statuses.filter(x => x !== s) : [...f.statuses, s] }))
  }
  function toggleIssuer(i) {
    setFilters(f => ({ ...f, issuers: f.issuers.includes(i) ? f.issuers.filter(x => x !== i) : [...f.issuers, i] }))
  }
  function clearFilters() { setFilters(DEFAULT_FILTERS); setSortBy(DEFAULT_SORT) }

  const activeCount = [
    filters.statuses.length > 0,
    filters.issuers.length > 0,
    filters.ageRange !== 'any',
    filters.hasAnnualFee,
    filters.bonusPending,
    filters.hideClosed,
    filters.hideKeepAlive !== DEFAULT_FILTERS.hideKeepAlive,
    sortBy !== DEFAULT_SORT,
  ].filter(Boolean).length

  // `overrides` lets callers re-run the same pipeline with one filter flipped
  // (used to count how many cards the keep-alive filter is hiding).
  function applyFiltersAndSort(cards, overrides) {
    const f = { ...filters, ...overrides }
    let result = cards.filter(c => {
      if (filterMember !== 'all' && c.memberId !== filterMember) return false
      if (f.hideClosed && (c.status === 'Closed' || c.status === 'Downgraded')) return false
      // Explicitly picking the Keep Alive status pill overrides the hide.
      if (f.hideKeepAlive && c.status === 'Keep Alive' && !f.statuses.includes('Keep Alive')) return false
      if (f.statuses.length && !f.statuses.includes(c.status)) return false
      if (f.issuers.length) {
        const name = getIssuerMeta(c.issuer || c.cardName).name
        if (!f.issuers.includes(name)) return false
      }
      if (f.hasAnnualFee && !(c.annualFee > 0)) return false
      if (f.bonusPending && c.status !== 'Active Churn') return false
      if (f.ageRange !== 'any') {
        const age = getCardAge(c)
        const m = age?.totalMonths ?? -1
        if (f.ageRange === 'lt1'  && !(m >= 0  && m < 12))  return false
        if (f.ageRange === '1to2' && !(m >= 12 && m < 24))  return false
        if (f.ageRange === '2to4' && !(m >= 24 && m < 48))  return false
        if (f.ageRange === 'gt4'  && m < 48)               return false
      }
      return true
    })
    const sortFn = {
      // Most attention-needing first; equally urgent cards fall back to newest.
      recommended: (a, b) =>
        getCardAttentionScore(b) - getCardAttentionScore(a) ||
        new Date(b.openDate || '1970') - new Date(a.openDate || '1970'),
      newest:  (a, b) => new Date(b.openDate || '1970') - new Date(a.openDate || '1970'),
      oldest:  (a, b) => new Date(a.openDate || '9999') - new Date(b.openDate || '9999'),
      fee:     (a, b) => (b.annualFee ?? 0) - (a.annualFee ?? 0),
      name:    (a, b) => (a.cardName ?? '').localeCompare(b.cardName ?? ''),
    }[sortBy] ?? (() => 0)
    return result.sort(sortFn)
  }

  const allFiltered = applyFiltersAndSort(allCards)
  // How many cards the keep-alive filter alone is suppressing — surfaced as a
  // one-click "show them" hint so hidden cards never look like missing data.
  const hiddenKeepAlive = filters.hideKeepAlive
    ? applyFiltersAndSort(allCards, { hideKeepAlive: false }).length - allFiltered.length
    : 0
  const filteredCards = allFiltered.filter(c => c.status !== 'Closed' && c.status !== 'Downgraded')
  const closedCards = allFiltered.filter(c => c.status === 'Closed' || c.status === 'Downgraded')
  // Grouping is opt-in via the "Group by brand" toggle. When off, the flat list
  // honors the chosen sort exactly (so newest-first is truly newest-first).
  const useGroups = groupByBrand
  const groups = useGroups ? groupByIssuer(filteredCards) : null

  function startAdd() {
    setNewCard({
      memberId: members[0]?.id ?? 'p1',
      cardName: '', issuer: '', last4: '',
      openDate: '', lastUsedDate: '', status: 'Active Churn',
      _statusSet: false, // tracks whether the user explicitly picked a status
      spendRequirement: '', spendDeadlineDays: '', currentSpend: '',
      currentBalance: '', creditLimit: '',
      bonusValue: '', bonusType: 'cashback', bonusReceived: false, bonusReceivedDate: '',
      annualFee: '', feeWaivedFirstYear: false, feePostDate: '', isBusiness: false, isAuthorizedUser: false, notes: '',
    })
    setMoreOpen(false)
    setAdding(true)
  }

  function cancelAdd() {
    setAdding(false)
    setNewCard(null)
  }

  function saveAdd() {
    if (!newCard?.cardName?.trim()) return
    const payload = {
      ...newCard,
      spendRequirement: newCard.spendRequirement !== '' && newCard.spendRequirement != null ? parseFloat(newCard.spendRequirement) : undefined,
      spendDeadlineDays: newCard.spendDeadlineDays !== '' && newCard.spendDeadlineDays != null ? parseInt(newCard.spendDeadlineDays) : undefined,
      currentSpend: parseFloat(newCard.currentSpend) || 0,
      currentBalance: parseFloat(newCard.currentBalance) || 0,
      creditLimit: parseFloat(newCard.creditLimit) || 0,
      bonusValue: newCard.bonusValue !== '' && newCard.bonusValue != null ? parseFloat(newCard.bonusValue) : undefined,
      annualFee: parseFloat(newCard.annualFee) || 0,
      openDate: newCard.openDate || null,
      lastUsedDate: newCard.lastUsedDate || null,
      bonusReceivedDate: newCard.bonusReceivedDate || null,
      feePostDate: newCard.feePostDate || null,
    }
    delete payload._statusSet
    // Auto-compute status from age when the user left it at the default
    if (!newCard._statusSet) {
      const smart = getSmartCardStatus(payload)
      payload.status = smart.status
      if (smart.bonusReceived) payload.bonusReceived = true
    }
    dispatch({ type: 'ADD_CARD', payload })
    cancelAdd()
  }

  function setN(k, v) { setNewCard(d => ({ ...d, [k]: v })) }

  // Add-form progressive disclosure — reveal only the sections that matter for
  // the status the user picked, so a new card starts as a short form.
  const addStatus = newCard?.status
  const showAddEarn = addStatus === 'Active Churn' || addStatus === 'Applied'
  const showAddBonus = addStatus !== 'Closed' && addStatus !== 'Downgraded'

  const keepAliveHint = hiddenKeepAlive > 0 ? (
    <button
      onClick={() => setFilters(f => ({ ...f, hideKeepAlive: false }))}
      className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors"
    >
      {hiddenKeepAlive} keep-alive card{hiddenKeepAlive === 1 ? '' : 's'} hidden — show {hiddenKeepAlive === 1 ? 'it' : 'them'}
    </button>
  ) : null

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-ink">Credit Cards</h1>
        {!adding && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} />Add Card
          </button>
        )}
      </div>

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

      {/* Filter + sort bar */}
      <FilterBar
        activeCount={activeCount}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={SORT_OPTIONS}
        onClear={clearFilters}
        trailing={
          <Toggle active={groupByBrand} onClick={() => setGroupByBrand(g => !g)}>
            <Layers size={12} />
            Group by brand
          </Toggle>
        }
      >
        <FilterRow label="Status">
          {CARD_STATUSES.map(s => (
            <MultiPill key={s.value} value={s.value} values={filters.statuses} onToggle={toggleStatus} label={s.label} />
          ))}
        </FilterRow>
        {availableIssuers.length > 0 && (
          <FilterRow label="Brand">
            {availableIssuers.map(i => (
              <MultiPill key={i} value={i} values={filters.issuers} onToggle={toggleIssuer} label={i} />
            ))}
          </FilterRow>
        )}
        <FilterRow label="Age">
          {AGE_RANGES.map(r => (
            <Pill key={r.value} active={filters.ageRange === r.value} onClick={() => setFilters(f => ({ ...f, ageRange: r.value }))}>{r.label}</Pill>
          ))}
        </FilterRow>
        <FilterRow label="Show">
          <Chip active={filters.hasAnnualFee}  onClick={() => setFilters(f => ({ ...f, hasAnnualFee: !f.hasAnnualFee }))}>Has annual fee</Chip>
          <Chip active={filters.bonusPending}  onClick={() => setFilters(f => ({ ...f, bonusPending: !f.bonusPending }))}>Bonus pending</Chip>
          <Chip active={filters.hideClosed}    onClick={() => setFilters(f => ({ ...f, hideClosed: !f.hideClosed }))}>Hide closed/downgraded</Chip>
          <Chip active={filters.hideKeepAlive} onClick={() => setFilters(f => ({ ...f, hideKeepAlive: !f.hideKeepAlive }))}>Hide keep-alive</Chip>
        </FilterRow>
      </FilterBar>

      {/* Add Card inline form */}
      {adding && newCard && (
        <div className="bg-surface border border-accent/40 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 pb-2">
            <span className="text-sm font-semibold text-ink">New Card</span>
            <button onClick={cancelAdd} className="text-ink-tertiary hover:text-ink-secondary transition-colors"><X size={15} /></button>
          </div>
          <div className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Person</label>
                <select className={inp} value={newCard.memberId} onChange={e => setN('memberId', e.target.value)}>
                  {members.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Status</label>
                <select className={inp} value={newCard.status} onChange={e => { setN('status', e.target.value); setN('_statusSet', true) }}>
                  {CARD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-accent-ink block mb-1 font-medium">Card Name <span className="text-accent-ink">*required</span></label>
              <input className={inpRequired} value={newCard.cardName} onChange={e => setN('cardName', e.target.value)} placeholder="e.g. Sapphire Preferred" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Issuer</label>
                <input list="new-issuers" className={inp} value={newCard.issuer} onChange={e => setN('issuer', e.target.value)} placeholder="Chase" />
                <datalist id="new-issuers">
                  {['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover'].map(i => <option key={i} value={i} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Last 4</label>
                <input className={inp} value={newCard.last4} onChange={e => setN('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-tertiary block mb-1">Open Date</label>
              <DateField value={newCard.openDate} onChange={v => setN('openDate', v)} />
            </div>

            {/* Earning Bonus — only when the card is actively working a bonus */}
            {showAddEarn && (
              <div className="bg-raised/50 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-ink-secondary mb-1">Earning bonus</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Spend Req ($)</label>
                    <input type="number" min="0" className={inp} value={newCard.spendRequirement} onChange={e => setN('spendRequirement', e.target.value)} placeholder="4000" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Days</label>
                    <input type="number" min="1" className={inp} value={newCard.spendDeadlineDays} onChange={e => setN('spendDeadlineDays', e.target.value)} placeholder="90" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Spent ($)</label>
                    <input type="number" min="0" className={inp} value={newCard.currentSpend} onChange={e => setN('currentSpend', e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Bonus & Rewards — hidden once a card is closed/downgraded */}
            {showAddBonus && (
              <div className="bg-raised/50 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-ink-secondary mb-1">Bonus &amp; rewards</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Bonus</label>
                    <input type="number" min="0" className={inp} value={newCard.bonusValue} onChange={e => setN('bonusValue', e.target.value)} placeholder="pts/$" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Type</label>
                    <select className={inp} value={newCard.bonusType} onChange={e => setN('bonusType', e.target.value)}>
                      <option value="points">Points</option>
                      <option value="cashback">Cash</option>
                      <option value="miles">Miles</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-ink-muted block mb-1">Annual Fee ($)</label>
                    <input type="number" min="0" className={inp} value={newCard.annualFee} onChange={e => setN('annualFee', e.target.value)} placeholder="0" />
                  </div>
                </div>
                {Number(newCard.annualFee) > 0 && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                      <input type="checkbox" checked={!!newCard.feeWaivedFirstYear} onChange={e => setN('feeWaivedFirstYear', e.target.checked)} />
                      First-year annual fee waived at sign-up
                    </label>
                    <div>
                      <label className="text-xs text-ink-muted block mb-1">Annual Fee Post Date</label>
                      <DateField value={newCard.feePostDate} onChange={v => setN('feePostDate', v)} />
                      <p className="text-[11px] text-ink-faint mt-1">When the fee actually posts (any year). Anchors the next-fee countdown, refund window, and calendar. Blank = open-date anniversary.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Everything else is optional — kept out of the way by default */}
            <div>
              <button
                type="button"
                onClick={() => setMoreOpen(o => !o)}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
              >
                {moreOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                More details (optional)
              </button>
              {moreOpen && (
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-ink-tertiary block mb-1">Last Used</label>
                      <DateField value={newCard.lastUsedDate} onChange={v => setN('lastUsedDate', v)} />
                    </div>
                    <div>
                      <label className="text-xs text-ink-tertiary block mb-1">Credit Limit ($)</label>
                      <input type="number" min="0" className={inp} value={newCard.creditLimit} onChange={e => setN('creditLimit', e.target.value)} placeholder="optional" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ink-tertiary block mb-1">Current Balance ($)</label>
                    <input type="number" min="0" className={inp} value={newCard.currentBalance} onChange={e => setN('currentBalance', e.target.value)} placeholder="0" />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                      <input type="checkbox" checked={!!newCard.isBusiness} onChange={e => setN('isBusiness', e.target.checked)} />
                      Business card
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
                      <input type="checkbox" checked={!!newCard.isAuthorizedUser} onChange={e => setN('isAuthorizedUser', e.target.checked)} />
                      Authorized user
                    </label>
                  </div>
                  <p className="text-xs text-ink-faint -mt-1">Personal cards count toward Chase 5/24. Check these only to exclude a card.</p>
                  <div>
                    <label className="text-xs text-ink-tertiary block mb-1">Notes</label>
                    <textarea rows={2} className={inp} value={newCard.notes} onChange={e => setN('notes', e.target.value)} placeholder="optional" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={cancelAdd} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={saveAdd} disabled={!newCard.cardName?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Add Card</button>
            </div>
          </div>
        </div>
      )}

      {filteredCards.length === 0 && closedCards.length === 0 && !adding ? (
        <div className="text-center py-12 text-ink-tertiary">
          <div className="text-4xl mb-3">💳</div>
          {activeCount > 0 ? (
            <>
              <div className="text-base font-medium text-ink-muted mb-1">No cards match these filters</div>
              <button onClick={clearFilters} className="text-sm text-accent-ink hover:text-accent-ink transition-colors">Clear filters</button>
            </>
          ) : hiddenKeepAlive > 0 ? (
            <div className="text-base font-medium text-ink-muted mb-1">No cards needing attention{filterMember !== 'all' ? ' for this person' : ''}</div>
          ) : (
            <>
              <div className="text-base font-medium text-ink-muted mb-1">No cards{filterMember !== 'all' ? ' for this person' : ''}</div>
              <div className="text-sm">Click &ldquo;Add Card&rdquo; to get started.</div>
            </>
          )}
          {keepAliveHint && <div className="mt-2">{keepAliveHint}</div>}
        </div>
      ) : (
        <>
          {filteredCards.length > 0 && (useGroups ? (
            <div className="space-y-6">
              {groups.map(group => (
                <section key={group.meta.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <IssuerLogo name={group.meta.key === 'other' ? '' : group.meta.name} size={22} />
                    <h2 className="text-sm font-semibold text-ink">{group.meta.name}</h2>
                    <span className="text-xs text-ink-tertiary">{group.cards.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.cards.map(card => <CardItem key={card.id} card={card} members={members} autoOpenLogSpend={logSpendCardId === card.id} />)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCards.map(card => <CardItem key={card.id} card={card} members={members} autoOpenLogSpend={logSpendCardId === card.id} />)}
            </div>
          ))}

          {closedCards.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mt-2 mb-2 pt-4 border-t border-edge">
                <h2 className="text-sm font-semibold text-ink-tertiary">Closed & Downgraded</h2>
                <span className="text-xs text-ink-faint">{closedCards.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {closedCards.map(card => <CardItem key={card.id} card={card} members={members} autoOpenLogSpend={logSpendCardId === card.id} />)}
              </div>
            </section>
          )}

          {keepAliveHint && <div className="mt-4 text-center">{keepAliveHint}</div>}
        </>
      )}
    </div>
  )
}
