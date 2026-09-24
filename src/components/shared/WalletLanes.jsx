import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LANE_LABEL } from '../../engines/walletFocus'

// The list split into focus lanes (engines/walletFocus.js). Earned and parked
// records share one group that starts collapsed.
const OPEN_LANES = ['urgent', 'working', 'waiting', 'decision']

export default function WalletLanes({ kind, buckets, renderItem, footer }) {
  const [restOpen, setRestOpen] = useState(false)
  const rest = [...buckets.earned, ...buckets.parked]
  return (
    <div className="space-y-6">
      {OPEN_LANES.map(lane => buckets[lane].length > 0 && (
        <section key={lane} data-lane={lane}>
          <h2 className="wallet-lane-head mb-2">
            <span><span className="lane-dot" aria-hidden="true" />{lane === 'waiting' ? (kind === 'account' ? 'Waiting on bank' : 'Waiting on issuer') : LANE_LABEL[lane]}</span>
            <em>{buckets[lane].length}</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{buckets[lane].map(renderItem)}</div>
        </section>
      ))}
      {rest.length > 0 && (
        <section data-lane="parked">
          <button className="wallet-lane-head w-full pt-4 border-t border-edge" aria-expanded={restOpen} onClick={() => setRestOpen(o => !o)}>
            <span>Earned &amp; parked</span>
            <em>{rest.length}<ChevronDown size={14} className={`transition-transform ${restOpen ? 'rotate-180' : ''}`} /></em>
          </button>
          {restOpen && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">{rest.map(renderItem)}</div>}
        </section>
      )}
      {footer}
    </div>
  )
}
