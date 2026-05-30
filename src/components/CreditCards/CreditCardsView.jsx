import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import CardItem from './CardItem'
import IssuerLogo from '../shared/IssuerLogo'
import DateField from '../shared/DateField'
import { getIssuerMeta } from '../../utils/issuers'
import { CARD_STATUSES } from '../../utils/statusMeta'
import { Plus, X } from 'lucide-react'

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'
const inpRequired = 'w-full bg-zinc-800 border border-blue-500/60 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400 transition-colors'

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
  const players = state.players ?? []
  const [adding, setAdding] = useState(false)
  const [newCard, setNewCard] = useState(null)
  const [filterPlayer, setFilterPlayer] = useState('all')

  const filtered = (state.creditCards ?? []).filter(
    c => filterPlayer === 'all' || c.playerId === filterPlayer
  )
  const groups = groupByIssuer(filtered)

  function startAdd() {
    setNewCard({
      playerId: players[0]?.id ?? 'p1',
      cardName: '', issuer: '', last4: '',
      openDate: '', lastUsedDate: '', status: 'Active Churn',
      spendRequirement: '', spendDeadlineDays: '', currentSpend: '',
      currentBalance: '', creditLimit: '',
      bonusValue: '', bonusType: 'cashback', bonusReceived: false, bonusReceivedDate: '',
      annualFee: '', isBusiness: false, isAuthorizedUser: false, notes: '',
    })
    setAdding(true)
  }

  function cancelAdd() {
    setAdding(false)
    setNewCard(null)
  }

  function saveAdd() {
    if (!newCard?.cardName?.trim()) return
    dispatch({
      type: 'ADD_CARD', payload: {
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
      }
    })
    cancelAdd()
  }

  function setN(k, v) { setNewCard(d => ({ ...d, [k]: v })) }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Credit Cards</h1>
        {!adding && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} />Add Card
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterPlayer('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterPlayer === 'all' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
          }`}
        >
          All
        </button>
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

      {/* Add Card inline form */}
      {adding && newCard && (
        <div className="bg-zinc-900 border border-blue-500/40 rounded-xl overflow-hidden mb-4">
          <div className="flex items-center justify-between p-4 pb-2">
            <span className="text-sm font-semibold text-white">New Card</span>
            <button onClick={cancelAdd} className="text-zinc-500 hover:text-zinc-300 transition-colors"><X size={15} /></button>
          </div>
          <div className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Person</label>
                <select className={inp} value={newCard.playerId} onChange={e => setN('playerId', e.target.value)}>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Status</label>
                <select className={inp} value={newCard.status} onChange={e => setN('status', e.target.value)}>
                  {CARD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-blue-400 block mb-1 font-medium">Card Name <span className="text-blue-400">*required</span></label>
              <input className={inpRequired} value={newCard.cardName} onChange={e => setN('cardName', e.target.value)} placeholder="e.g. Sapphire Preferred" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Issuer</label>
                <input list="new-issuers" className={inp} value={newCard.issuer} onChange={e => setN('issuer', e.target.value)} placeholder="Chase" />
                <datalist id="new-issuers">
                  {['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover'].map(i => <option key={i} value={i} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Last 4</label>
                <input className={inp} value={newCard.last4} onChange={e => setN('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Open Date</label>
                <DateField value={newCard.openDate} onChange={v => setN('openDate', v)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Last Used</label>
                <DateField value={newCard.lastUsedDate} onChange={v => setN('lastUsedDate', v)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Current Balance ($)</label>
                <input type="number" min="0" className={inp} value={newCard.currentBalance} onChange={e => setN('currentBalance', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Credit Limit ($)</label>
                <input type="number" min="0" className={inp} value={newCard.creditLimit} onChange={e => setN('creditLimit', e.target.value)} placeholder="optional" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Spend Req ($)</label>
                <input type="number" min="0" className={inp} value={newCard.spendRequirement} onChange={e => setN('spendRequirement', e.target.value)} placeholder="4000" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Days</label>
                <input type="number" min="1" className={inp} value={newCard.spendDeadlineDays} onChange={e => setN('spendDeadlineDays', e.target.value)} placeholder="90" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Spent ($)</label>
                <input type="number" min="0" className={inp} value={newCard.currentSpend} onChange={e => setN('currentSpend', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Bonus</label>
                <input type="number" min="0" className={inp} value={newCard.bonusValue} onChange={e => setN('bonusValue', e.target.value)} placeholder="pts/$" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Type</label>
                <select className={inp} value={newCard.bonusType} onChange={e => setN('bonusType', e.target.value)}>
                  <option value="points">Points</option>
                  <option value="cashback">Cash</option>
                  <option value="miles">Miles</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Annual Fee</label>
                <input type="number" min="0" className={inp} value={newCard.annualFee} onChange={e => setN('annualFee', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={!!newCard.isBusiness} onChange={e => setN('isBusiness', e.target.checked)} />
                Business card
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={!!newCard.isAuthorizedUser} onChange={e => setN('isAuthorizedUser', e.target.checked)} />
                Authorized user
              </label>
            </div>
            <p className="text-xs text-zinc-600 -mt-1">Personal cards count toward Chase 5/24. Check these only to exclude a card.</p>

            <div className="flex gap-2 pt-1">
              <button onClick={cancelAdd} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={saveAdd} disabled={!newCard.cardName?.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Add Card</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && !adding ? (
        <div className="text-center py-12 text-zinc-500">
          <div className="text-4xl mb-3">💳</div>
          <div className="text-base font-medium text-zinc-400 mb-1">
            No cards{filterPlayer !== 'all' ? ' for this person' : ''}
          </div>
          <div className="text-sm">Click &ldquo;Add Card&rdquo; to get started.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.meta.key}>
              <div className="flex items-center gap-2 mb-2">
                <IssuerLogo name={group.meta.key === 'other' ? '' : group.meta.name} size={22} />
                <h2 className="text-sm font-semibold text-white">{group.meta.name}</h2>
                <span className="text-xs text-zinc-500">{group.cards.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.cards.map(card => <CardItem key={card.id} card={card} players={players} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
