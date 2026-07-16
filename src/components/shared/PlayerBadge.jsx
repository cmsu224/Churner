import { useContext } from 'react'
import { ChurnContext } from '../../store/ChurnContext'

export default function MemberBadge({ memberId, showName = true, members: membersProp }) {
  // Read the context directly (may be null outside the provider, e.g. previews)
  const ctx = useContext(ChurnContext)
  const members = membersProp ?? ctx?.state?.members ?? []
  const member = members.find(p => p.id === memberId)
  if (!member) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: member.hex }} />
      {showName && <span className="text-xs font-medium text-ink-secondary">{member.name}</span>}
    </span>
  )
}
