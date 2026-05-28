import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import CardItem from './CardItem'
import CardForm from './CardForm'
import Modal from '../shared/Modal'
import { PLAYERS } from '../../data/initialState'
import { Plus } from 'lucide-react'

export default function CreditCardsView() {
  const { state, dispatch } = useChurn()
  const [adding, setAdding] = useState(false)
  const [filterPlayer, setFilterPlayer] = useState('all')

  const filtered = (state.creditCards ?? []).filter(
    c => filterPlayer === 'all' || c.playerId === filterPlayer
  )

  function handleAdd(data) {
    dispatch({ type: 'ADD_CARD', payload: data })
    setAdding(false)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Credit Cards</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={14} />Add Card
        </button>
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
        {PLAYERS.map(p => (
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

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <div className="text-4xl mb-3">💳</div>
          <div className="text-base font-medium text-zinc-400 mb-1">
            No cards{filterPlayer !== 'all' ? ' for this player' : ''}
          </div>
          <div className="text-sm">Click &ldquo;Add Card&rdquo; to get started.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(card => <CardItem key={card.id} card={card} />)}
        </div>
      )}

      {adding && (
        <Modal title="Add Credit Card" onClose={() => setAdding(false)} wide>
          <CardForm players={state.players} onSubmit={handleAdd} onCancel={() => setAdding(false)} />
        </Modal>
      )}
    </div>
  )
}
