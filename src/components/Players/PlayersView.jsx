import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const COLORS = [
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Violet', hex: '#8b5cf6' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Sky', hex: '#0ea5e9' },
  { label: 'Orange', hex: '#f97316' },
  { label: 'Teal', hex: '#14b8a6' },
]

const ROLES = [
  { value: 'churner', label: 'Churner', desc: 'High-velocity, earns income' },
  { value: 'senior', label: 'Senior', desc: 'Retired / Social Security' },
  { value: 'other', label: 'Other', desc: 'Custom / flexible' },
]

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'

function PlayerForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [role, setRole] = useState(initial?.role ?? 'churner')
  const [hex, setHex] = useState(initial?.hex ?? COLORS[0].hex)

  return (
    <div className="bg-zinc-800 border border-zinc-600 rounded-xl p-4 space-y-3">
      <div>
        <label className="text-xs text-zinc-400 block mb-1">Name <span className="text-red-400">*</span></label>
        <input
          className={inp}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Alex, Mom, John"
          autoFocus
        />
      </div>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">Role</label>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`p-2 rounded-lg border text-left transition-colors ${
                role === r.value
                  ? 'border-blue-500 bg-blue-600/20 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <div className="text-xs font-medium">{r.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{r.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-400 block mb-1">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              onClick={() => setHex(c.hex)}
              className={`w-7 h-7 rounded-full transition-transform ${hex === c.hex ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-800' : 'hover:scale-110'}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 py-2 rounded-lg text-sm transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => name.trim() && onSave({ name: name.trim(), role, hex })}
          disabled={!name.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {initial ? 'Save Changes' : 'Add Member'}
        </button>
      </div>
    </div>
  )
}

export default function PlayersView() {
  const { state, dispatch } = useChurn()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmingId, setConfirmingId] = useState(null)

  const players = state.members ?? []

  function addPlayer(data) {
    dispatch({ type: 'ADD_MEMBER', payload: data })
    setAdding(false)
  }

  function updatePlayer(id, data) {
    dispatch({ type: 'UPDATE_MEMBER', payload: { id, ...data } })
    setEditingId(null)
  }

  function deletePlayer(id) {
    dispatch({ type: 'DELETE_MEMBER', id })
    setConfirmingId(null)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Household Members</h1>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add Member
          </button>
        )}
      </div>

      {adding && (
        <PlayerForm onSave={addPlayer} onCancel={() => setAdding(false)} />
      )}

      <div className="space-y-3">
        {players.map(player => {
          const cardCount = (state.creditCards ?? []).filter(c => c.memberId === player.id).length
          const accountCount = (state.bankAccounts ?? []).filter(a => a.memberId === player.id).length

          if (editingId === player.id) {
            return (
              <PlayerForm
                key={player.id}
                initial={player}
                onSave={data => updatePlayer(player.id, data)}
                onCancel={() => setEditingId(null)}
              />
            )
          }

          if (confirmingId === player.id) {
            return (
              <div key={player.id} className="bg-zinc-900 border border-red-500/30 rounded-xl p-4">
                <p className="text-sm text-zinc-300 mb-1">
                  Delete <strong className="text-white">{player.name}</strong>?
                </p>
                <p className="text-xs text-zinc-500 mb-3">
                  {cardCount + accountCount > 0
                    ? `This member has ${cardCount} card(s) and ${accountCount} account(s) — those records will remain but become unassigned.`
                    : 'This member has no associated cards or accounts.'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmingId(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-sm transition-colors">Cancel</button>
                  <button
                    onClick={() => deletePlayer(player.id)}
                    disabled={players.length <= 1}
                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div key={player.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-center gap-4">
              <span className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: player.hex }}>
                {player.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">{player.name}</div>
                <div className="text-xs text-zinc-500 capitalize">{player.role} · {cardCount} card{cardCount !== 1 ? 's' : ''} · {accountCount} account{accountCount !== 1 ? 's' : ''}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingId(player.id)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmingId(player.id)}
                  disabled={players.length <= 1}
                  className="p-2 text-zinc-500 hover:text-red-400 disabled:opacity-30 transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {players.length === 0 && !adding && (
        <div className="text-center py-12 text-zinc-500">
          <p className="text-sm">No members yet.</p>
          <button onClick={() => setAdding(true)} className="mt-3 text-blue-400 text-sm hover:underline">Add your first member</button>
        </div>
      )}
    </div>
  )
}
