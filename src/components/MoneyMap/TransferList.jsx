import { useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { getTransferStatus, purposeMeta, nodeLabel, isLanded, EXPECTED_LANDING_DAYS } from '../../engines/moneyFlow'
import { fmt$, fmtDateCompact, todayISODate } from '../../utils/format'
import EmptyState from '../shared/EmptyState'
import NodeGlyph from './NodeGlyph'
import { ArrowRight, Check, Undo2, Trash2, Clock, AlertTriangle, ArrowLeftRight } from 'lucide-react'

// The ledger under the map: every push, newest first, split into what's still
// in the pipeline and what has hit the account. In-flight rows carry the only
// action that matters day to day — one tap to say "it's here" — and landed
// rows carry the one that follows it: send the money back home.

const PURPOSE_TONE = {
  dd: 'bg-accent/10 text-accent-ink border-accent/25',
  fund: 'bg-warning/10 text-warning-ink border-warning/25',
  return: 'bg-success/10 text-success-ink border-success/25',
  other: 'bg-raised text-ink-tertiary border-edge-strong',
}

function Row({ transfer, from, to, onLand, onUnland, onReturn, onDelete }) {
  const status = getTransferStatus(transfer)
  const purpose = purposeMeta(transfer.purpose)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="px-3 py-2.5 hover:bg-raised/50 transition-colors">
      <div className="flex items-start gap-2.5">
        <span className="text-sm font-bold text-ink tabular-nums w-[86px] flex-shrink-0">{fmt$(transfer.amount)}</span>

        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-xs text-ink-secondary min-w-0">
            {from && <NodeGlyph node={from} size={16} className="hidden sm:inline-flex text-ink-tertiary" />}
            <span className="truncate">{from ? nodeLabel(from) : 'Removed account'}</span>
            <ArrowRight size={11} className="text-ink-faint flex-shrink-0" aria-hidden="true" />
            {to && <NodeGlyph node={to} size={16} className="hidden sm:inline-flex text-ink-tertiary" />}
            <span className="truncate">{to ? nodeLabel(to) : 'Removed account'}</span>
          </span>
          <span className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-px rounded border ${PURPOSE_TONE[transfer.purpose] ?? PURPOSE_TONE.other}`}>
              {purpose.short}
            </span>
            <span className="text-[11px] text-ink-tertiary">Sent {fmtDateCompact(transfer.sentDate)}</span>
            {status.landed ? (
              <span className="flex items-center gap-1 text-[11px] text-success-ink">
                <Check size={10} aria-hidden="true" />
                Landed {fmtDateCompact(transfer.landedDate)}
                {status.daysInTransit != null && ` · ${status.daysInTransit}d in transit`}
              </span>
            ) : status.late ? (
              <span className="flex items-center gap-1 text-[11px] text-danger-ink font-medium">
                <AlertTriangle size={10} aria-hidden="true" />
                {status.daysInFlight}d in flight — should have landed by now
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-accent-ink">
                <Clock size={10} aria-hidden="true" />
                In flight{status.daysInFlight != null ? ` · day ${status.daysInFlight}` : ''}
              </span>
            )}
          </span>
        </span>

        <span className="flex items-center gap-1 flex-shrink-0">
          {!status.landed ? (
            <button
              onClick={() => onLand(transfer)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-accent hover:bg-accent-hover text-white transition-colors"
              title="Mark this transfer as arrived — credits the destination balance"
            >
              <Check size={11} />It landed
            </button>
          ) : (
            <>
              <button
                onClick={() => onReturn(transfer)}
                className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-raised border border-edge-strong text-ink-muted hover:text-ink transition-colors"
                title="Start the push back the other way"
              >
                <ArrowLeftRight size={11} />Send back
              </button>
              <button
                onClick={() => onUnland(transfer)}
                aria-label="Mark as still in flight"
                title="Mark as still in flight"
                className="p-1 rounded text-ink-faint hover:text-warning-ink transition-colors"
              >
                <Undo2 size={12} />
              </button>
            </>
          )}
          {confirmDelete ? (
            <button
              onClick={() => { onDelete(transfer); setConfirmDelete(false) }}
              className="text-[11px] font-semibold px-2 py-1 rounded-md bg-danger/15 text-danger-ink border border-danger/30"
            >
              Delete?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
              aria-label="Delete transfer"
              title="Delete transfer"
              className="p-1 rounded text-ink-faint hover:text-danger-ink transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </span>
      </div>
    </div>
  )
}

export default function TransferList({ map, selectedKey, onClearFilter, onReturn }) {
  const { dispatch } = useChurn()
  const [tab, setTab] = useState('inflight')

  const filtered = map.transfers.filter(t => !selectedKey || t.fromKey === selectedKey || t.toKey === selectedKey)
  const inflight = filtered.filter(t => !isLanded(t))
  const landed = filtered.filter(isLanded)
  const rows = tab === 'inflight' ? inflight : landed
  const selectedNode = selectedKey ? map.byKey.get(selectedKey) : null

  const tabs = [
    { key: 'inflight', label: 'In the pipeline', count: inflight.length },
    { key: 'landed', label: 'Hit the account', count: landed.length },
  ]

  return (
    <div className="bg-surface border border-edge rounded-xl shadow-card overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-edge flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              tab === t.key ? 'bg-overlay text-ink' : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] text-ink-tertiary tabular-nums">{t.count}</span>
          </button>
        ))}
        {selectedNode && (
          <button
            onClick={onClearFilter}
            className="ml-auto text-[11px] text-accent-ink hover:underline"
          >
            Filtered to {selectedNode.name} — show all
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={tab === 'inflight' ? Clock : Check}
          title={tab === 'inflight' ? 'Nothing in the pipeline' : 'No landed transfers yet'}
          hint={
            tab === 'inflight'
              ? 'Every push you log shows up here until you confirm it arrived.'
              : 'Once a push lands, it moves here and the destination balance goes up.'
          }
          className="py-8"
        />
      ) : (
        <div className="divide-y divide-edge max-h-[520px] overflow-y-auto">
          {rows.map(t => (
            <Row
              key={t.id}
              transfer={t}
              from={map.byKey.get(t.fromKey)}
              to={map.byKey.get(t.toKey)}
              onLand={(tr) => dispatch({ type: 'LAND_TRANSFER', id: tr.id, date: todayISODate() })}
              onUnland={(tr) => dispatch({ type: 'UNLAND_TRANSFER', id: tr.id })}
              onReturn={onReturn}
              onDelete={(tr) => dispatch({ type: 'DELETE_TRANSFER', id: tr.id })}
            />
          ))}
        </div>
      )}

      {tab === 'inflight' && inflight.length > 0 && (
        <div className="px-3 py-2 border-t border-edge bg-raised/40 text-[11px] text-ink-tertiary">
          An ACH push usually clears in {EXPECTED_LANDING_DAYS} days. Anything still in flight past that gets a reminder of its own.
        </div>
      )}
    </div>
  )
}
