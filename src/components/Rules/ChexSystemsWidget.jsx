import { useChurn } from '../../store/ChurnContext'
import { getChexStatus } from '../../engines/chexSystems'
import { fmtDate } from '../../utils/format'
import { ShieldAlert } from 'lucide-react'

const TONE = {
  blocked: { text: 'text-danger-ink',  bar: 'bg-danger',  label: 'Too many' },
  warning: { text: 'text-warning-ink', bar: 'bg-warning', label: 'Slow down' },
  safe:    { text: 'text-success-ink', bar: 'bg-success', label: 'Clear' },
}

// When an inquiry ages out of a rolling window (opened + the window length).
function exitDate(openedISO, months) {
  const d = new Date(openedISO)
  d.setMonth(d.getMonth() + months)
  return d
}

function MemberChex({ member, accounts }) {
  const chex = getChexStatus(member.id, accounts)
  const primary = chex.primary
  const tone = TONE[primary.status] ?? TONE.safe
  const sensitiveTone = TONE[chex.sensitive.status] ?? TONE.safe

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: member.hex }} />
          <span className="text-sm font-medium text-ink">{member.name}</span>
        </div>
        <span className={`text-sm font-bold ${tone.text}`}>
          {primary.count}/{primary.limit} — {tone.label}
        </span>
      </div>

      <div className="h-2 bg-overlay rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${Math.min(100, (primary.count / primary.limit) * 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-ink-tertiary">inquiries in {primary.label}</span>
        <span className={sensitiveTone.text}>
          Chex-sensitive banks: {chex.sensitive.count}/{chex.sensitive.limit}
        </span>
      </div>

      <div className="flex gap-3 text-xs text-ink-tertiary mb-2">
        {chex.windows.filter(w => !w.primary).map(w => (
          <span key={w.key}>
            {w.label}: <span className="text-ink-secondary font-medium tabular-nums">{w.count}</span>/{w.limit}
          </span>
        ))}
        <span className="ml-auto">
          on file: <span className="text-ink-secondary font-medium tabular-nums">{chex.total}</span>
        </span>
      </div>

      {chex.nextSlotDate && (
        <div className="text-xs text-warning-ink mb-2">
          Next slot opens {fmtDate(chex.nextSlotDate)}, when the oldest inquiry leaves the {primary.label} window.
        </div>
      )}

      {chex.inquiries.length > 0 ? (
        <div className="space-y-1">
          {chex.inquiries.slice(0, 8).map(inq => {
            const inPrimary = inq.opened >= new Date(primary.cutoff)
            const exits = exitDate(inq.openedDate, primary.months)
            return (
              <div key={inq.accountId} className="flex justify-between gap-2 text-xs">
                <span className="text-ink-muted truncate">
                  {inq.bankName}
                  {inq.sensitive && <span className="text-ink-faint"> · sensitive</span>}
                </span>
                <span className={`flex-shrink-0 ${inPrimary ? 'text-ink-secondary' : 'text-ink-faint'}`}>
                  {inPrimary ? `clears ${fmtDate(exits.toISOString())}` : fmtDate(inq.openedDate)}
                </span>
              </div>
            )
          })}
          {chex.inquiries.length > 8 && (
            <div className="text-xs text-ink-faint">+{chex.inquiries.length - 8} older</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-ink-tertiary">No ChexSystems-reported openings on file.</div>
      )}
    </div>
  )
}

// The bank-account counterpart to Chase 5/24: how heavy this person's
// ChexSystems file looks right now, and when it lightens up.
export default function ChexSystemsWidget() {
  const { state } = useChurn()
  const members = state.members ?? []
  const accounts = state.bankAccounts ?? []

  const withAccounts = members.filter(m => accounts.some(a => a.memberId === m.id))
  if (withAccounts.length === 0) return null

  return (
    <div className="bg-surface border border-edge-strong rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert size={15} className="text-accent-ink flex-shrink-0" />
        <h3 className="text-base font-semibold text-ink">ChexSystems Inquiry Tracker</h3>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        Bank-account applications leave a ChexSystems inquiry that stays on file for 5 years, and Chex-sensitive
        banks deny outright when too many land too fast. Counted from accounts you&apos;ve <em>opened</em>, so it&apos;s a
        floor — denials you never logged are inquiries this can&apos;t see. Brokerage-style accounts (Fidelity, Schwab)
        don&apos;t count.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {withAccounts.map(member => (
          <MemberChex key={member.id} member={member} accounts={accounts} />
        ))}
      </div>
      <p className="text-xs text-ink-faint mt-4">
        Thresholds are the churning community&apos;s working numbers, not published bank policy. You can pull your own
        ChexSystems report free once a year at chexsystems.com.
      </p>
    </div>
  )
}
