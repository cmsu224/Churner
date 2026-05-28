import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import Modal from '../shared/Modal'
import CardForm from './CardForm'
import { getSpendDeadlineInfo, getCardNextStatus } from '../../engines/lifecycle'
import { fmt$, fmtDate } from '../../utils/format'
import { Edit2, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

export default function CardItem({ card }) {
  const { state, dispatch } = useChurn()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const info = getSpendDeadlineInfo(card)
  const nextStatus = getCardNextStatus(card)

  function handleUpdate(data) {
    dispatch({ type: 'UPDATE_CARD', payload: { ...card, ...data } })
    setEditing(false)
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_CARD', id: card.id })
    setConfirming(false)
  }

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{card.cardName}</span>
              <span className="text-zinc-500 text-xs">···{card.last4}</span>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">{card.issuer}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setEditing(true)} className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors">
              <Edit2 size={13} />
            </button>
            <button onClick={() => setConfirming(true)} className="text-zinc-500 hover:text-red-400 p-1 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <PlayerBadge playerId={card.playerId} />
          <StatusBadge status={card.status} />
          {card.autoPayEnabled ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle size={11} />AutoPay
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={11} />No AutoPay
            </span>
          )}
        </div>

        {info && !info.met && (
          <div className="mb-3">
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full ${info.daysLeft < 14 ? 'bg-red-500' : info.daysLeft < 30 ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${info.pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>{fmt$(card.currentSpend ?? 0)} / {fmt$(card.spendRequirement ?? 0)}</span>
              <span className={info.daysLeft < 14 ? 'text-red-400 font-medium' : ''}>{info.daysLeft}d left</span>
            </div>
          </div>
        )}

        {info?.met && (
          <div className="text-xs text-emerald-400 mb-2 flex items-center gap-1">
            <CheckCircle size={11} />Spend requirement met
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span>
            Bonus: <span className="text-white">{(card.bonusValue ?? 0).toLocaleString()} {card.bonusType}</span>
          </span>
          {(card.annualFee ?? 0) > 0 && (
            <span>AF: <span className="text-white">{fmt$(card.annualFee)}</span></span>
          )}
          {card.bonusReceived && (
            <span className="text-emerald-400">Received {fmtDate(card.bonusReceivedDate)}</span>
          )}
        </div>

        {nextStatus && (
          <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
            Suggested: transition to <strong>{nextStatus}</strong>
          </div>
        )}
      </div>

      {editing && (
        <Modal title="Edit Card" onClose={() => setEditing(false)} wide>
          <CardForm initial={card} players={state.players} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}

      {confirming && (
        <Modal title="Delete Card?" onClose={() => setConfirming(false)}>
          <p className="text-zinc-300 text-sm mb-4">
            Delete <strong>{card.cardName}</strong> ···{card.last4}? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
              Delete
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
