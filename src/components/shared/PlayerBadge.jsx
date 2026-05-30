import { useChurn } from '../../store/ChurnContext'

export default function MemberBadge({ memberId, showName = true, members: membersProp }) {
  let members = membersProp
  try {
    if (!members) {
      const ctx = useChurn()
      members = ctx?.state?.members
    }
  } catch {
    members = []
  }
  const member = (members ?? []).find(p => p.id === memberId)
  if (!member) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: member.hex }} />
      {showName && <span className="text-xs font-medium text-zinc-300">{member.name}</span>}
    </span>
  )
}
