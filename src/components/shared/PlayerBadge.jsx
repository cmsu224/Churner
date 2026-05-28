import { PLAYERS } from '../../data/initialState'

export default function PlayerBadge({ playerId, showName = true }) {
  const player = PLAYERS.find(p => p.id === playerId) ?? PLAYERS[0]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.hex }} />
      {showName && <span className="text-xs font-medium text-zinc-300">{player.name}</span>}
    </span>
  )
}
