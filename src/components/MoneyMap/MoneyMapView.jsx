import { useMemo, useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { buildMoneyMap, moveNode, reorderNode, setNodeHidden } from '../../engines/moneyFlow'
import { collectReminders, reminderCounts } from '../../engines/reminders'
import FlowDiagram from './FlowDiagram'
import QuickTransferBar from './QuickTransferBar'
import TransferList from './TransferList'
import ReminderBoard from './ReminderBoard'
import CashSourceEditor from './CashSourceEditor'
import TransferSheet from './TransferSheet'
import NodeEditModal from './NodeEditModal'
import PageHeader from '../shared/PageHeader'
import StatCard from '../shared/StatCard'
import EmptyState from '../shared/EmptyState'
import { fmt$0 } from '../../utils/format'
import { Waypoints, Info } from 'lucide-react'

// The Money Map: one page that answers "where is all my money, what's still
// moving, and what do I have to come back to?"
//
// Bank-bonus churning without payroll direct deposit means pushing cash out of
// a brokerage into account after account, and every dollar has to find its way
// home again. The map draws that as a picture, the quick bar logs a push in one
// line, and the reminder board is what stops $6,000 being forgotten in a bank
// you close a year later.

export default function MoneyMapView() {
  const { state, dispatch } = useChurn()
  const [selectedKey, setSelectedKey] = useState(null)
  const [prefill, setPrefill] = useState(null)
  // The phone's entry point: tapping a node opens a guided move-money sheet
  // instead of the typed bar. Held here rather than in the diagram so the sheet
  // renders above the whole page, not inside a horizontally-scrolling box.
  const [sheetKey, setSheetKey] = useState(null)
  // Direct bank & source editing from inside the Money Map
  const [editingNodeKey, setEditingNodeKey] = useState(null)

  const map = useMemo(() => buildMoneyMap(state), [state])
  const reminders = useMemo(() => collectReminders(state, { horizonDays: 60 }), [state])
  // Ticked-off reminders, newest first, for the board's restore drawer.
  const doneReminders = useMemo(
    () => (state.reminders ?? []).filter(r => r.doneDate).sort((a, b) => b.doneDate.localeCompare(a.doneDate)),
    [state.reminders]
  )
  const counts = reminderCounts(reminders)
  const { totals, hub } = map

  // "Send back" on a landed transfer: same money, other direction. The map's own
  // Transfer / Send home shortcuts open the log-transfer dialog instead, so this
  // is the one thing that still pre-fills the typed bar.
  function returnTransfer(transfer) {
    const from = map.byKey.get(transfer.toKey)
    const to = map.byKey.get(transfer.fromKey)
    if (!from || !to) return
    setPrefill({
      text: `${transfer.amount} ${from.name} > ${to.name} `,
      from,
      to,
      purpose: 'return',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Resolved from the map each render so the sheet always shows live balances,
  // and closes itself if the account behind it disappears.
  const sheetNode = sheetKey ? map.byKey.get(sheetKey) : null
  const editingNode = editingNodeKey ? map.byKey.get(editingNodeKey) : null

  // Arranging rewrites both columns at once, so the move is computed in the
  // engine and stored whole. The diagram passes the nodes it actually drew —
  // hidden "closed & empty" cards aren't on screen, so counting them here would
  // land a drop at the wrong slot.
  const cardLayout = state.moneyMapLayout ?? {}
  function moveCard(key, direction, nodes) {
    dispatch({ type: 'SET_MAP_LAYOUT', layout: moveNode(nodes ?? map.nodes, cardLayout, key, direction) })
  }

  function reorderCard(key, targetSide, targetIndex, nodes) {
    dispatch({ type: 'SET_MAP_LAYOUT', layout: reorderNode(nodes ?? map.nodes, cardLayout, key, targetSide, targetIndex) })
  }

  const nothingLogged = map.transfers.length === 0
  const noAccounts = (state.bankAccounts ?? []).length === 0

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader
        title="Money Map"
        actions={
          counts.overdue + counts.today > 0 ? (
            <span className="text-xs font-medium text-danger-ink bg-danger/10 border border-danger/25 rounded-lg px-2.5 py-1.5">
              {counts.overdue + counts.today} to check on
            </span>
          ) : null
        }
      />

      {/* Four numbers that together are "where is my money". Cash in accounts
          and cash in flight are the two halves of what's out of your hands. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <StatCard
          label="Sitting in accounts"
          value={fmt$0(totals.inAccounts)}
          sub={`${totals.accountsHoldingCash} account${totals.accountsHoldingCash === 1 ? '' : 's'} holding cash`}
          tone={totals.inAccounts > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="In the pipeline"
          value={fmt$0(totals.inFlight)}
          sub={totals.inFlightCount > 0 ? `${totals.inFlightCount} transfer${totals.inFlightCount === 1 ? '' : 's'} in flight` : 'nothing moving'}
          tone={totals.inFlight > 0 ? 'accent' : 'default'}
        />
        <StatCard
          label="At the hub"
          value={totals.atHub == null ? '—' : fmt$0(totals.atHub)}
          sub={hub ? hub.name : 'no hub set'}
          tone="success"
        />
        <StatCard
          label="Total tracked"
          value={fmt$0(totals.total)}
          sub={
            totals.untrackedSources > 0
              ? `${totals.untrackedSources} source${totals.untrackedSources === 1 ? '' : 's'} not tracked`
              : `across ${totals.places} place${totals.places === 1 ? '' : 's'}`
          }
        />
      </div>

      <div className="mb-3">
        <QuickTransferBar
          nodes={map.nodes}
          hub={hub}
          prefill={prefill}
          onLogged={() => setSelectedKey(null)}
        />
      </div>

      {noAccounts ? (
        <EmptyState
          icon={Waypoints}
          title="No bank accounts to map yet"
          hint="The Money Map draws pushes between your cash sources and the bank accounts you're churning. Add an account first and every transfer into it lands on the map."
        />
      ) : (
        <div className="space-y-3">
          <FlowDiagram
            map={map}
            selectedKey={selectedKey}
            onSelect={(key) => setSelectedKey(k => (key === null || k === key ? null : key))}
            onOpenSheet={(node) => setSheetKey(node.key)}
            cardLayout={cardLayout}
            onMove={moveCard}
            onReorder={reorderCard}
            onEdit={(node) => setEditingNodeKey(node.key)}
            onResetLayout={() => dispatch({ type: 'SET_MAP_LAYOUT', layout: {} })}
            onSetHub={(key) => dispatch({ type: 'SET_HUB', key })}
            onSetHidden={(key, hidden) => dispatch({ type: 'SET_MAP_LAYOUT', layout: setNodeHidden(cardLayout, key, hidden) })}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <ReminderBoard reminders={reminders} done={doneReminders} />
            <CashSourceEditor sources={map.sources.filter(s => !s.ghost)} perNode={map.perNode} />
          </div>

          <TransferList
            map={map}
            selectedKey={selectedKey}
            onClearFilter={() => setSelectedKey(null)}
            onReturn={returnTransfer}
          />

          {nothingLogged && (
            <div className="flex items-start gap-2 bg-raised/50 border border-edge rounded-xl px-4 py-3 text-xs text-ink-muted">
              <Info size={14} className="text-accent-ink flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Nothing logged yet. Type a push in the bar above — <code className="text-ink-secondary">5000 fidelity &gt; chase</code>{' '}
                — and the map draws it. Money is debited from the source the day you send it and credited to the destination the day you
                mark it landed, so the two figures always add up. Balances stay editable on the Accounts page and here, ready for the day
                they come from the bank automatically.
              </span>
            </div>
          )}
        </div>
      )}

      {sheetNode && (
        <TransferSheet
          node={sheetNode}
          map={map}
          onClose={() => setSheetKey(null)}
          onShowTransfers={(key) => setSelectedKey(key)}
          onEdit={(node) => setEditingNodeKey(node.key)}
        />
      )}

      {editingNode && (
        <NodeEditModal
          node={editingNode}
          onClose={() => setEditingNodeKey(null)}
        />
      )}
    </div>
  )
}
