import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import StatusBadge from '../shared/StatusBadge'
import PlayerBadge from '../shared/PlayerBadge'
import Modal from '../shared/Modal'
import AccountForm from './AccountForm'
import { getClawbackStatus } from '../../engines/clawbackShield'
import { getAccountNextStatus } from '../../engines/lifecycle'
import { fmt$, fmtDate } from '../../utils/format'
import { Edit2, Trash2, Shield } from 'lucide-react'

export default function AccountItem({ account }) {
  const { state, dispatch } = useChurn()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const shield = getClawbackStatus(account)
  const nextStatus = getAccountNextStatus(account)

  function handleUpdate(data) {
    dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...account, ...data } })
    setEditing(false)
  }

  function handleDelete() {
    dispatch({ type: 'DELETE_ACCOUNT', id: account.id })
    setConfirming(false)
  }

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-colors">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{account.bankName}</span>
              <span className="text-zinc-500 text-xs">···{account.last4}</span>
            </div>
            <div className="text-xs text-zinc-400">{account.accountType}</div>
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
          <PlayerBadge playerId={account.playerId} />
          <StatusBadge status={account.status} />
          {account.isTaxable && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              1099-INT
            </span>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Bonus</span>
            <span className="text-white font-medium">{fmt$(account.bonusAmount ?? 0)}</span>
          </div>
          {account.bonusReceivedDate && (
            <div className="flex justify-between">
              <span>Received</span>
              <span className="text-emerald-400">{fmtDate(account.bonusReceivedDate)}</span>
            </div>
          )}
          {(account.requiredDD ?? 0) > 0 && (
            <div className="flex justify-between">
              <span>DD Required</span>
              <span className="text-white">
                {fmt$(account.requiredDD)}/mo — {account.ddSourceDescription || 'source TBD'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            <Shield size={11} className={shield.safe ? 'text-emerald-400' : 'text-amber-400'} />
            <span className={`ml-1 flex-1 ${shield.safe ? 'text-emerald-400' : 'text-amber-400'}`}>
              {shield.message}
            </span>
          </div>
        </div>

        {nextStatus && (
          <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
            Suggested: transition to <strong>{nextStatus}</strong>
          </div>
        )}
      </div>

      {editing && (
        <Modal title="Edit Account" onClose={() => setEditing(false)} wide>
          <AccountForm initial={account} players={state.players} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </Modal>
      )}

      {confirming && (
        <Modal title="Delete Account?" onClose={() => setConfirming(false)}>
          <p className="text-zinc-300 text-sm mb-4">
            Delete <strong>{account.bankName}</strong> ···{account.last4}? This cannot be undone.
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
