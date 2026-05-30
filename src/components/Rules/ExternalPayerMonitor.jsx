import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import Modal from '../shared/Modal'
import PlayerBadge from '../shared/PlayerBadge'
import { Plus, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react'

const EMPTY_PMT = { cardId: '', payerMemberId: 'p1', payerAccountLast4: '', usePortal: true, notes: '' }

export default function ExternalPayerMonitor() {
  const { state, dispatch } = useChurn()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_PMT })

  const seniorCards = (state.creditCards ?? []).filter(c => {
    const member = (state.members ?? []).find(p => p.id === c.memberId)
    return member?.role === 'senior'
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleAdd() {
    if (!form.cardId) return
    dispatch({ type: 'ADD_EXTERNAL_PAYMENT', payload: { ...form } })
    setForm({ ...EMPTY_PMT })
    setAdding(false)
  }

  const inp = 'w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors'

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-white">External Payer Monitor</h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={12} />Add
        </button>
      </div>
      <p className="text-xs text-zinc-400 mb-4">
        Track when churners pay senior members&apos; credit cards externally. Always use the card&apos;s online portal — never bank bill-pay.
      </p>

      {(state.externalPayments ?? []).length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-sm">No external payments tracked.</div>
      ) : (
        <div className="space-y-2">
          {(state.externalPayments ?? []).map(pmt => {
            const card = seniorCards.find(c => c.id === pmt.cardId)
            const cardMember = card ? (state.members ?? []).find(p => p.id === card.memberId) : null
            return (
              <div
                key={pmt.id}
                className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
                  !pmt.usePortal ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-700 bg-zinc-800/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm text-white font-medium">{card?.cardName ?? 'Unknown card'}</span>
                    {cardMember && <PlayerBadge memberId={cardMember.id} />}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Paid by: <PlayerBadge memberId={pmt.payerMemberId} /> acct ···{pmt.payerAccountLast4}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${pmt.usePortal ? 'text-emerald-400' : 'text-red-400 font-semibold'}`}>
                    {pmt.usePortal ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                    {pmt.usePortal ? 'Using online portal ✓' : 'NOT using portal — switch to online portal immediately!'}
                  </div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'DELETE_EXTERNAL_PAYMENT', id: pmt.id })}
                  className="text-zinc-500 hover:text-red-400 p-1 transition-colors flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <Modal title="Add External Payment" onClose={() => setAdding(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-300 block mb-1">Senior&apos;s Card Being Paid</label>
              <select className={inp} value={form.cardId} onChange={e => set('cardId', e.target.value)}>
                <option value="">Select card...</option>
                {seniorCards.map(c => {
                  const m = (state.members ?? []).find(ml => ml.id === c.memberId)
                  return (
                    <option key={c.id} value={c.id}>
                      {c.cardName} ···{c.last4} ({m?.name ?? c.memberId})
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-300 block mb-1">Payer (Churner)</label>
              <select className={inp} value={form.payerMemberId} onChange={e => set('payerMemberId', e.target.value)}>
                {(state.members ?? []).filter(p => p.role === 'churner').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-300 block mb-1">Payer&apos;s Account Last 4</label>
              <input
                className={inp}
                value={form.payerAccountLast4}
                onChange={e => set('payerAccountLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                maxLength={4}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={form.usePortal} onChange={e => set('usePortal', e.target.checked)} className="rounded" />
              Paying via online portal (not bank bill-pay)
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setAdding(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">
                Cancel
              </button>
              <button onClick={handleAdd} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                Add
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
