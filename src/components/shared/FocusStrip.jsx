import { LANE_LABEL, deadlineLabel } from '../../engines/walletFocus'

// One line at the top of a Wallet item: its focus lane, the nearest deadline
// and what to do next (engines/walletFocus.js). Parked records show nothing.
export default function FocusStrip({ focus, kind }) {
  if (!focus || focus.lane === 'parked') return null
  const label = focus.lane === 'waiting' ? (kind === 'account' ? 'Waiting on bank' : 'Waiting on issuer') : LANE_LABEL[focus.lane]
  const due = focus.deadline ? deadlineLabel(focus.deadline) : ''
  return (
    <div className="focus-strip" data-lane={focus.lane}>
      <span className="lane-chip"><span className="lane-dot" aria-hidden="true" />{label}{due ? ` · ${due}` : ''}</span>
      {focus.next && <span className="focus-next">{focus.next}</span>}
    </div>
  )
}
