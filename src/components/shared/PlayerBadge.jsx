import { useChurn } from '../../store/ChurnContext'

export default function PlayerBadge({ playerId, showName = true, players: playersProp }) {
  let players = playersProp
  try {
    if (!players) {
      const ctx = useChurn()
      players = ctx?.state?.players
    }
  } catch {
    players = []
  }
  const player = (players ?? []).find(p => p.id === playerId)
  if (!player) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.hex }} />
      {showName && <span className="text-xs font-medium text-zinc-300">{player.name}</span>}
    </span>
  )
}
