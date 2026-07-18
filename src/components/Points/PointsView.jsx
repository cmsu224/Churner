import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useChurn } from '../../store/ChurnContext'
import { useHighlight } from '../../hooks/useHighlight'
import PointsItem from './PointsItem'
import ProgramCombobox from './ProgramCombobox'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import StatCard from '../shared/StatCard'
import EmptyState from '../shared/EmptyState'
import FilterBar, { Pill, MultiPill, FilterRow, Toggle } from '../shared/FilterBar'
import { PROGRAM_TYPES, getProgramMeta, pointsValue } from '../../utils/programs'
import { fmt$, fmtPts } from '../../utils/format'
import { Plus, X, Coins, Layers, ChevronDown, ChevronUp } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'value',   label: 'Highest value' },
  { value: 'balance', label: 'Highest balance' },
  { value: 'name',    label: 'Program A–Z' },
  { value: 'updated', label: 'Recently updated' },
]
const DEFAULT_FILTERS = { types: [] }

const inp = 'w-full bg-raised border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'
const inpRequired = 'w-full bg-raised border border-accent/60 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:border-accent transition-colors'

// Group entries by canonical program; groups ordered by total est. value.
function groupByProgram(entries, settings) {
  const groups = {}
  for (const e of entries) {
    const meta = getProgramMeta(e.program)
    const key = (meta.name ?? 'Other').toLowerCase()
    if (!groups[key]) groups[key] = { meta, name: meta.name ?? 'Other', entries: [] }
    groups[key].entries.push(e)
  }
  const total = g => g.entries.reduce((s, e) => s + pointsValue(e, settings), 0)
  return Object.values(groups).sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name))
}

export default function PointsView() {
  const { state, dispatch } = useChurn()
  const members = state.members ?? []
  const settings = state.settings ?? {}
  const allBalances = state.pointsBalances ?? []
  const [adding, setAdding] = useState(false)
  const [newEntry, setNewEntry] = useState(null)
  const [filterMember, setFilterMember] = useState('all')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sortBy, setSortBy] = useState('value')
  // Opt-in grouping, decoupled from sort (see CreditCardsView for the rationale).
  const [grouped, setGrouped] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Deep links from the command palette: ?add=1 opens the add form,
  // ?highlight=<id> scrolls to and flashes an entry.
  const location = useLocation()
  const wantsAdd = new URLSearchParams(location.search).get('add') === '1'
  useHighlight()
  useEffect(() => {
    if (wantsAdd) startAdd()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per deep-link navigation
  }, [wantsAdd, location.key])

  function toggleType(t) {
    setFilters(f => ({ ...f, types: f.types.includes(t) ? f.types.filter(x => x !== t) : [...f.types, t] }))
  }
  function clearFilters() { setFilters(DEFAULT_FILTERS); setSortBy('value') }

  const activeCount = [
    filters.types.length > 0,
    sortBy !== 'value',
  ].filter(Boolean).length

  function applyFiltersAndSort(entries) {
    let result = entries.filter(e => {
      if (filterMember !== 'all' && e.memberId !== filterMember) return false
      if (filters.types.length && !filters.types.includes(getProgramMeta(e.program).type)) return false
      return true
    })
    const sortFn = {
      value:   (a, b) => pointsValue(b, settings) - pointsValue(a, settings),
      balance: (a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0),
      name:    (a, b) => (a.program ?? '').localeCompare(b.program ?? ''),
      updated: (a, b) => new Date(b.updatedAt || '1970') - new Date(a.updatedAt || '1970'),
    }[sortBy] ?? (() => 0)
    return result.sort(sortFn)
  }

  const filtered = applyFiltersAndSort(allBalances)
  const groups = grouped ? groupByProgram(filtered, settings) : null

  const totalPoints = filtered.reduce((s, e) => s + (Number(e.balance) || 0), 0)
  const totalValue = filtered.reduce((s, e) => s + pointsValue(e, settings), 0)
  const programCount = new Set(filtered.map(e => (getProgramMeta(e.program).name ?? e.program ?? '').toLowerCase())).size

  function startAdd() {
    setNewEntry({
      memberId: members[0]?.id ?? 'p1',
      program: '', balance: '',
      expirationDate: '', notes: '',
    })
    setMoreOpen(false)
    setAdding(true)
  }

  function cancelAdd() {
    setAdding(false)
    setNewEntry(null)
  }

  function saveAdd() {
    if (!newEntry?.program?.trim()) return
    dispatch({
      type: 'ADD_POINTS_BALANCE', payload: {
        ...newEntry,
        program: newEntry.program.trim(),
        balance: parseFloat(newEntry.balance) || 0,
        expirationDate: newEntry.expirationDate || null,
        updatedAt: new Date().toISOString(),
      }
    })
    cancelAdd()
  }

  function setN(k, v) { setNewEntry(d => ({ ...d, [k]: v })) }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-ink">Points</h1>
        {!adding && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} />Add Balance
          </button>
        )}
      </div>

      {/* Totals for whatever is currently in view */}
      {allBalances.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label="Total points" value={fmtPts(totalPoints)} />
          <StatCard label="Est. value" value={fmt$(totalValue)} tone="success" sub="at per-program rates" />
          <StatCard label="Programs" value={programCount} />
        </div>
      )}

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
          <Toggle active={grouped} onClick={() => setGrouped(g => !g)}>
            <Layers size={12} />
            Group by program
          </Toggle>
        }
      >
        <FilterRow label="Type">
          {PROGRAM_TYPES.map(t => (
            <MultiPill key={t} value={t} values={filters.types} onToggle={toggleType} label={t} />
          ))}
        </FilterRow>
      </FilterBar>

      {/* Add Balance inline form — essentials only, details on demand */}
      {adding && newEntry && (
        <div className="bg-surface border border-accent/40 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 pb-2">
            <span className="text-sm font-semibold text-ink">New Points Balance</span>
            <button onClick={cancelAdd} className="text-ink-tertiary hover:text-ink-secondary transition-colors"><X size={15} /></button>
          </div>
          <div className="p-4 pt-2 space-y-3">
            <div>
              <label className="text-xs text-accent-ink block mb-1 font-medium">Program <span className="text-accent-ink">*required</span></label>
              <ProgramCombobox className={inpRequired} value={newEntry.program} onChange={v => setN('program', v)} placeholder="Type to search — e.g. Chase, Hilton, SkyMiles" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Person</label>
                <select className={inp} value={newEntry.memberId} onChange={e => setN('memberId', e.target.value)}>
                  {members.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-tertiary block mb-1">Balance (pts)</label>
                <input type="number" min="0" className={inp} value={newEntry.balance} onChange={e => setN('balance', e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Everything else is optional */}
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
                  <div>
                    <label className="text-xs text-ink-tertiary block mb-1">Expiration Date</label>
                    <DateField value={newEntry.expirationDate} onChange={v => setN('expirationDate', v)} />
                  </div>
                  <div>
                    <label className="text-xs text-ink-tertiary block mb-1">Notes</label>
                    <textarea rows={2} className={inp} value={newEntry.notes} onChange={e => setN('notes', e.target.value)} placeholder="Loyalty account #, transfer partners, redemption plans..." />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={cancelAdd} className="flex-1 bg-raised hover:bg-overlay text-ink-secondary py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={saveAdd} disabled={!newEntry.program?.trim()} className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Add Balance</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && !adding ? (
        activeCount > 0 || filterMember !== 'all' ? (
          <EmptyState
            icon={Coins}
            title="No balances match these filters"
            action={<button onClick={() => { clearFilters(); setFilterMember('all') }} className="text-sm text-accent-ink hover:underline">Clear filters</button>}
          />
        ) : (
          <EmptyState
            icon={Coins}
            title="No points tracked yet"
            hint="Keep every program's balance — Chase UR, Amex MR, airline miles, hotel points — in one place, per person."
            action={
              <button onClick={startAdd} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                <Plus size={14} />Add Balance
              </button>
            }
          />
        )
      ) : grouped ? (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.name}>
              <div className="flex items-center gap-2 mb-2">
                <IssuerLogo name={group.name} meta={group.meta} size={22} />
                <h2 className="text-sm font-semibold text-ink">{group.name}</h2>
                <span className="text-xs text-ink-tertiary">
                  {fmtPts(group.entries.reduce((s, e) => s + (Number(e.balance) || 0), 0))} pts
                  {' · '}≈ {fmt$(group.entries.reduce((s, e) => s + pointsValue(e, settings), 0))}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.entries.map(e => <PointsItem key={e.id} entry={e} members={members} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(e => <PointsItem key={e.id} entry={e} members={members} />)}
        </div>
      )}
    </div>
  )
}
