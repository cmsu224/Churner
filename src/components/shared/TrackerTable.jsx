import { fmtDateTracker } from '../../utils/format'
import { Check } from 'lucide-react'

// The dense milestone grid — one row per card or account, one column per step
// in its lifecycle, so a whole household's churn reads at a glance instead of
// card by card. Scrolls horizontally on narrow screens with the first column
// pinned, since the identity column is the one you need while reading across.
//
// Columns are `{ key, label, align, render(row), sub }`. Rendering lives with
// the data (CardTable / AccountTable); this file only owns the frame.

// A lifecycle step that either happened on a date or hasn't yet.
export function Milestone({ date, done, pending, tone = 'success' }) {
  if (date) {
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap ${tone === 'success' ? 'text-success-ink' : 'text-ink-secondary'}`}>
        <Check size={11} className="flex-shrink-0" />
        {fmtDateTracker(date)}
      </span>
    )
  }
  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-success-ink">
        <Check size={11} className="flex-shrink-0" />
        <span className="text-ink-faint">no date</span>
      </span>
    )
  }
  if (pending) return <span className="text-ink-tertiary whitespace-nowrap">{pending}</span>
  return <Blank />
}

export function Blank() {
  return <span className="text-ink-faint">—</span>
}

export default function TrackerTable({ columns, rows, getRowKey, onRowClick, caption }) {
  return (
    <div className="bg-surface border border-edge rounded-xl overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="text-left border-b border-edge-strong">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`font-medium text-ink-faint whitespace-nowrap px-3 py-2 ${
                    col.align === 'right' ? 'text-right' : ''
                  } ${i === 0 ? 'sticky left-0 bg-surface z-20 pl-4' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {rows.map(row => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group ${onRowClick ? 'cursor-pointer' : ''} hover:bg-raised/60 transition-colors`}
              >
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 align-middle tabular-nums ${
                      col.align === 'right' ? 'text-right' : ''
                    } ${i === 0 ? 'sticky left-0 bg-surface group-hover:bg-raised z-10 pl-4 border-r border-edge' : ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="px-4 py-3 text-xs text-ink-faint border-t border-edge">{caption}</p>}
    </div>
  )
}
