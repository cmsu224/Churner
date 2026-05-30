import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import AccountItem from './AccountItem'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import FilterBar, { Pill, MultiPill, Chip, FilterRow } from '../shared/FilterBar'
import { getIssuerMeta } from '../../utils/issuers'
import { ACCOUNT_STATUSES, statusLabel } from '../../utils/statusMeta'
import { Plus, X } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest first' },
  { value: 'oldest',  label: 'Oldest first' },
  { value: 'balance', label: 'Highest balance' },
  { value: 'bonus',   label: 'Highest bonus' },
  { value: 'name',    label: 'Bank A–Z' },
]
const ACCT_TYPES = ['Checking', 'Savings', 'Money Market', 'CD']
const DEFAULT_FILTERS = { statuses: [], banks: [], types: [], hasBalance: false, hasBonus: false, bonusPending: false }

const TYPES = ['Checking', 'Savings', 'Money Market', 'CD']
const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'
const inpRequired = 'w-full bg-zinc-800 border border-blue-500/60 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 transition-colors'

// Group accounts by bank; "Other" bucket last.
function groupByBank(accounts) {
  const groups = {}
  for (const a of accounts) {
    const meta = getIssuerMeta(a.bankName)
    if (!groups[meta.key]) groups[meta.key] = { meta, accounts: [] }
    groups[meta.key].accounts.push(a)
  }
  return Object.values(groups).sort((a, b) => {
    if (a.meta.key === 'other') return 1
    if (b.meta.key === 'other') return -1
    return b.accounts.length - a.accounts.length || a.meta.name.localeCompare(b.meta.name)
  })
}

export default function BankAccountsView() {
  const { state, dispatch } = useChurn()
  const players = state.players ?? []
  const allAccounts = state.bankAccounts ?? []
  const [adding, setAdding] = useState(false)
  const [newAcct, setNewAcct] = useState(null)
  const [filterPlayer, setFilterPlayer] = useState('all')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState('newest')

  const availableBanks = [...new Set(
    allAccounts.map(a => getIssuerMeta(a.bankName).name).filter(n => n && n !== 'Other')
  )].sort()

  function toggleStatus(s) {
    setFilters(f => ({ ...f, statuses: f.statuses.includes(s) ? f.statuses.filter(x => x !== s) : [...f.statuses, s] }))
  }
  function toggleBank(b) {
    setFilters(f => ({ ...f, banks: f.banks.includes(b) ? f.banks.filter(x => x !== b) : [...f.banks, b] }))
  }
  function toggleType(t) {
    setFilters(f => ({ ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t] }))
  }
  function clearFilters() { setFilters(DEFAULT_FILTERS); setSortBy('newest') }

  const activeCount = [
    filters.statuses.length > 0,
    filters.banks.length > 0,
    filters.types.length > 0,
    filters.hasBalance,
    filters.hasBonus,
    filters.bonusPending,
    sortBy !== 'newest',
  ].filter(Boolean).length

  function applyFiltersAndSort(accounts) {
    let result = accounts.filter(a => {
      if (filterPlayer !== 'all' && a.playerId !== filterPlayer) return false
      if (filters.statuses.length && !filters.statuses.includes(a.status)) return false
      if (filters.banks.length) {
        const name = getIssuerMeta(a.bankName).name
        if (!filters.banks.includes(name)) return false
      }
      if (filters.types.length && !filters.types.includes(a.accountType)) return false
      if (filters.hasBalance && !(a.currentBalance > 0)) return false
      if (filters.hasBonus && !(a.bonusAmount > 0)) return false
      if (filters.bonusPending && !(a.bonusAmount > 0 && !a.bonusReceivedDate)) return false
      return true
    })
    const sortFn = {
      newest:  (a, b) => new Date(b.openedDate || '1970') - new Date(a.openedDate || '1970'),
      oldest:  (a, b) => new Date(a.openedDate || '9999') - new Date(b.openedDate || '9999'),
      balance: (a, b) => (b.currentBalance ?? 0) - (a.currentBalance ?? 0),
      bonus:   (a, b) => (b.bonusAmount ?? 0) - (a.bonusAmount ?? 0),
      name:    (a, b) => (a.bankName ?? '').localeCompare(b.bankName ?? ''),
    }[sortBy] ?? (() => 0)
    return result.sort(sortFn)
  }

  const filteredAccounts = applyFiltersAndSort(allAccounts)
  const useGroups = sortBy === 'newest'
  const groups = useGroups ? groupByBank(filteredAccounts) : null

  function startAdd() {
    setNewAcct({
      playerId: players[0]?.id ?? 'p1',
      bankName: '', accountType: 'Checking', last4: '',
      openedDate: '', status: 'Opened', currentBalance: '',
      requiredDD: '', requiredDDCount: '', ddsMade: '', ddDeadlineDays: '',
      ddSourceDescription: '', ddLinkedDate: '',
      minimumBalance: '', bonusDeadlineDays: '',
      bonusAmount: '', bonusReceivedDate: '', isTaxable: true,
      offerUrl: '', notes: '',
    })
    setAdding(true)
  }

  function cancelAdd() {
    setAdding(false)
    setNewAcct(null)
  }

  function numOpt(v) { if (v === '' || v == null) return undefined; const n = parseFloat(v); return isNaN(n) ? undefined : n }
  function intOpt(v) { if (v === '' || v == null) return undefined; const n = parseInt(v); return isNaN(n) ? undefined : n }

  function saveAdd() {
    if (!newAcct?.bankName?.trim()) return
    const openedDate = newAcct.openedDate || null
    const safeToCloseDate = openedDate
      ? (() => { const d = new Date(openedDate); d.setDate(d.getDate() + 181); return d.toISOString() })()
      : null
    dispatch({
      type: 'ADD_ACCOUNT', payload: {
        ...newAcct,
        requiredDD: numOpt(newAcct.requiredDD),
        bonusAmount: numOpt(newAcct.bonusAmount),
        currentBalance: parseFloat(newAcct.currentBalance) || 0,
        minimumBalance: numOpt(newAcct.minimumBalance),
        ddDeadlineDays: intOpt(newAcct.ddDeadlineDays),
        requiredDDCount: intOpt(newAcct.requiredDDCount),
        ddsMade: intOpt(newAcct.ddsMade),
        bonusDeadlineDays: intOpt(newAcct.bonusDeadlineDays),
        last4: newAcct.last4 ? String(newAcct.last4).slice(-4) : undefined,
        openedDate,
        ddLinkedDate: newAcct.ddLinkedDate || null,
        bonusReceivedDate: newAcct.bonusReceivedDate || null,
        offerUrl: newAcct.offerUrl || null,
        safeToCloseDate,
      }
    })
    cancelAdd()
  }

  function setN(k, v) { setNewAcct(d => ({ ...d, [k]: v })) }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Bank Accounts</h1>
        {!adding && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} />Add Account
          </button>
        )}
      </div>

      {/* Person filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Pill active={filterPlayer === 'all'} onClick={() => setFilterPlayer('all')}>All</Pill>
        {players.map(p => (
          <button
            key={p.id}
            onClick={() => setFilterPlayer(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filterPlayer === p.id ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
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
      >
        <FilterRow label="Status">
          {ACCOUNT_STATUSES.map(s => (
            <MultiPill key={s.value} value={s.value} values={filters.statuses} onToggle={toggleStatus} label={s.label} />
          ))}
        </FilterRow>
        {availableBanks.length > 0 && (
          <FilterRow label="Bank">
            {availableBanks.map(b => (
              <MultiPill key={b} value={b} values={filters.banks} onToggle={toggleBank} label={b} />
            ))}
          </FilterRow>
        )}
        <FilterRow label="Type">
          {ACCT_TYPES.map(t => (
            <MultiPill key={t} value={t} values={filters.types} onToggle={toggleType} label={t} />
          ))}
        </FilterRow>
        <FilterRow label="Show">
          <Chip active={filters.hasBalance}   onClick={() => setFilters(f => ({ ...f, hasBalance: !f.hasBalance }))}>Has balance</Chip>
          <Chip active={filters.hasBonus}     onClick={() => setFilters(f => ({ ...f, hasBonus: !f.hasBonus }))}>Has bonus offer</Chip>
          <Chip active={filters.bonusPending} onClick={() => setFilters(f => ({ ...f, bonusPending: !f.bonusPending }))}>Bonus pending</Chip>
        </FilterRow>
      </FilterBar>

      {/* Add Account inline form */}
      {adding && newAcct && (
        <div className="bg-zinc-900 border border-blue-500/40 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 pb-2">
            <span className="text-sm font-semibold text-white">New Account</span>
            <button onClick={cancelAdd} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X size={15} /></button>
          </div>
          <div className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Person</label>
                <select className={inp} value={newAcct.playerId} onChange={e => setN('playerId', e.target.value)}>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Status</label>
                <select className={inp} value={newAcct.status} onChange={e => setN('status', e.target.value)}>
                  {ACCOUNT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-blue-400 block mb-1 font-medium">Bank Name <span className="text-blue-400">*required</span></label>
              <input className={inpRequired} value={newAcct.bankName} onChange={e => setN('bankName', e.target.value)} placeholder="e.g. Chase, Wells Fargo" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Account Type</label>
                <select className={inp} value={newAcct.accountType} onChange={e => setN('accountType', e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Last 4</label>
                <input className={inp} value={newAcct.last4} onChange={e => setN('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Opened Date</label>
                <DateField value={newAcct.openedDate} onChange={v => setN('openedDate', v)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Current Balance ($)</label>
                <input type="number" min="0" className={inp} value={newAcct.currentBalance} onChange={e => setN('currentBalance', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Bonus Amount ($)</label>
                <input type="number" min="0" className={inp} value={newAcct.bonusAmount} onChange={e => setN('bonusAmount', e.target.value)} placeholder="300" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Bonus Received Date</label>
                <DateField value={newAcct.bonusReceivedDate} onChange={v => setN('bonusReceivedDate', v)} />
              </div>
            </div>

            {/* DD Requirements */}
            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-zinc-300 mb-2">Direct Deposit Requirements</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">DD Amount ($)</label>
                  <input type="number" min="0" className={inp} value={newAcct.requiredDD} onChange={e => setN('requiredDD', e.target.value)} placeholder="500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1"># Required</label>
                  <input type="number" min="1" className={inp} value={newAcct.requiredDDCount} onChange={e => setN('requiredDDCount', e.target.value)} placeholder="1" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1"># Completed</label>
                  <input type="number" min="0" className={inp} value={newAcct.ddsMade} onChange={e => setN('ddsMade', e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">DD Deadline (days)</label>
                  <input type="number" min="1" className={inp} value={newAcct.ddDeadlineDays} onChange={e => setN('ddDeadlineDays', e.target.value)} placeholder="90" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">DD Linked Date</label>
                  <DateField value={newAcct.ddLinkedDate} onChange={v => setN('ddLinkedDate', v)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">DD Source</label>
                <input className={inp} value={newAcct.ddSourceDescription} onChange={e => setN('ddSourceDescription', e.target.value)} placeholder="e.g. Payroll, Social Security, ACH" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Min Balance ($)</label>
                <input type="number" min="0" className={inp} value={newAcct.minimumBalance} onChange={e => setN('minimumBalance', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Bonus Deadline (days)</label>
                <input type="number" min="1" className={inp} value={newAcct.bonusDeadlineDays} onChange={e => setN('bonusDeadlineDays', e.target.value)} placeholder="120" />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Offer Link</label>
              <input className={inp} value={newAcct.offerUrl} onChange={e => setN('offerUrl', e.target.value)} placeholder="https://www.doctorofcredit.com/..." />
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={!!newAcct.isTaxable} onChange={e => setN('isTaxable', e.target.checked)} />
              Bank bonus is taxable (1099-INT)
            </label>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Notes</label>
              <textarea rows={2} className={inp} value={newAcct.notes} onChange={e => setN('notes', e.target.value)} placeholder="Offer terms, expiry date, special requirements..." />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={cancelAdd} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={saveAdd} disabled={!newAcct.bankName?.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Add Account</button>
            </div>
          </div>
        </div>
      )}

      {filteredAccounts.length === 0 && !adding ? (
        <div className="text-center py-12 text-zinc-500">
          <div className="text-4xl mb-3">🏦</div>
          {activeCount > 0 ? (
            <>
              <div className="text-base font-medium text-zinc-400 mb-1">No accounts match these filters</div>
              <button onClick={clearFilters} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">Clear filters</button>
            </>
          ) : (
            <>
              <div className="text-base font-medium text-zinc-400 mb-1">No accounts{filterPlayer !== 'all' ? ' for this person' : ''}</div>
              <div className="text-sm">Click &ldquo;Add Account&rdquo; to track a bank bonus.</div>
            </>
          )}
        </div>
      ) : useGroups ? (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.meta.key}>
              <div className="flex items-center gap-2 mb-2">
                <IssuerLogo name={group.meta.key === 'other' ? '' : group.meta.name} size={22} />
                <h2 className="text-sm font-semibold text-white">{group.meta.name}</h2>
                <span className="text-xs text-zinc-500">{group.accounts.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.accounts.map(acct => <AccountItem key={acct.id} account={acct} players={players} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAccounts.map(acct => <AccountItem key={acct.id} account={acct} players={players} />)}
        </div>
      )}
    </div>
  )
}
