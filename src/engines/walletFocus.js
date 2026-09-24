import { isRetired, isAccountBonusReceived } from '../utils/statusMeta'
import { addDays, daysBetweenDays, parseDay, startOfToday } from '../utils/format'
import { getSpendProgress, getAnnualFeeInfo, getCardCloseShield } from './lifecycle'
import { isCardChasingBonus } from './earnings'
import { daysSinceUsed, WARN_DAYS } from './creditAge'
import { getDebitProgress } from './debitCard'
import { getClawbackStatus } from './clawbackShield'
import { getMonthlyFeeStatus } from './monthlyFee'

// ── Wallet focus ────────────────────────────────────────────────────────────
// What the Wallet list shows on each tile without opening the record: which
// lane it belongs in, the nearest deadline, the bonus requirements as a
// checklist, and one line saying what to do next.
//
// Lanes, most to least pressing. "urgent" is not a status — any record lands
// there when a deadline is a week out or already missed.
export const LANES = ['urgent', 'working', 'waiting', 'decision', 'earned', 'parked']

export const LANE_LABEL = {
  urgent: 'Act now',
  working: 'Working',
  waiting: 'Waiting on issuer',
  decision: 'Decision due',
  earned: 'Earned',
  parked: 'Parked',
}

export const URGENT_DAYS = 7
// An annual fee this close is a retention-call decision, not yet an emergency.
export const FEE_DECISION_DAYS = 45

const shortDate = (d) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
const money = (n) => `$${Math.round(n).toLocaleString()}`
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function deadline(date, kind, today) {
  return { date: date.toISOString(), daysLeft: daysBetweenDays(today, date), kind }
}

function soonest(deadlines) {
  return deadlines.filter(Boolean).sort((a, b) => a.daysLeft - b.daysLeft)[0] ?? null
}

/** Short countdown for a chip: "Missed", "Due today", "6 days left". */
export function deadlineLabel(d) {
  if (!d) return ''
  if (d.daysLeft < 0) return 'Missed'
  if (d.daysLeft === 0) return 'Due today'
  return `${plural(d.daysLeft, 'day')} left`
}

// ── Cards ───────────────────────────────────────────────────────────────────
export function getCardFocus(card, today = startOfToday()) {
  const requirements = []
  if (!card) return { lane: 'parked', deadline: null, requirements, next: null }

  if (isRetired(card)) {
    return { lane: 'parked', deadline: null, requirements, next: card.status === 'Downgraded' ? 'Downgraded' : 'Closed' }
  }

  const chasing = isCardChasingBonus(card)
  const spend = chasing ? getSpendProgress(card) : null
  let spendDeadline = null
  let next = null
  if (spend) {
    requirements.push({ key: 'spend', label: 'Spend', done: spend.met, current: spend.spent, target: spend.requirement, pct: spend.pct, money: true })
    const di = spend.deadline
    if (di && !spend.met) {
      spendDeadline = deadline(new Date(di.deadline), 'spend', today)
      const left = spend.requirement - spend.spent
      next = spendDeadline.daysLeft < 0
        ? `Spend deadline passed ${shortDate(new Date(di.deadline))}. Call the issuer.`
        : `Spend ${money(left / Math.max(1, spendDeadline.daysLeft))}/day to finish ${money(left)} by ${shortDate(new Date(di.deadline))}`
    } else if (!spend.met) {
      next = `${money(spend.requirement - spend.spent)} left to spend`
    }
  }

  // Annual fee: an open refund window is a hard deadline; an upcoming fee is a
  // retention-call decision.
  const fee = getAnnualFeeInfo(card)
  let feeDeadline = null
  let feeNext = null
  if (fee && card.status !== 'Keep Alive') {
    if (fee.inRefundWindow && fee.refundDaysLeft !== null) {
      feeDeadline = { date: fee.refundDeadline, daysLeft: fee.refundDaysLeft, kind: 'refund' }
      feeNext = `Cancel or downgrade by ${shortDate(new Date(fee.refundDeadline))} for a full ${money(card.annualFee)} refund`
    } else if (!fee.awaitingPost && fee.daysUntilFee <= FEE_DECISION_DAYS) {
      feeDeadline = { date: fee.feeDate, daysLeft: fee.daysUntilFee, kind: 'fee' }
      feeNext = `${money(card.annualFee)} annual fee in ${plural(fee.daysUntilFee, 'day')}. Call retention.`
    }
  }

  const nearest = soonest([spendDeadline, feeDeadline])
  const urgent = nearest && nearest.daysLeft <= URGENT_DAYS
  if (urgent) {
    return { lane: 'urgent', deadline: nearest, requirements, next: nearest === feeDeadline ? feeNext : next }
  }

  if (card.status === 'Keep Alive') {
    const dsu = daysSinceUsed(card)
    if (dsu !== null && dsu >= WARN_DAYS) {
      return { lane: 'decision', deadline: null, requirements, next: `Unused for ${dsu} days. Make a small purchase.` }
    }
    return { lane: 'parked', deadline: null, requirements, next: 'Keep alive' }
  }

  if (card.status === 'Downgrade/Close Due' || card.status === 'Retention Call Due') {
    return { lane: 'decision', deadline: feeDeadline, requirements, next: feeNext ?? 'Cancel or downgrade' }
  }

  if (chasing) {
    if (spend?.met) {
      return { lane: 'waiting', deadline: null, requirements, next: 'Spend met. The bonus usually posts after the statement closes.' }
    }
    return { lane: 'working', deadline: spendDeadline ?? feeDeadline, requirements, next: next ?? (card.status === 'Applied' ? 'Waiting for approval' : 'Add the spend requirement to track it') }
  }

  if (feeDeadline) return { lane: 'decision', deadline: feeDeadline, requirements, next: feeNext }

  const shield = getCardCloseShield(card)
  return {
    lane: 'earned',
    deadline: null,
    requirements,
    next: shield?.safeDate && !shield.safe ? `12-month mark ${shortDate(new Date(shield.safeDate))}` : 'Past the 12-month mark',
  }
}

// ── Bank accounts ───────────────────────────────────────────────────────────
/** @param {any} account @param {{ transfers?: any[], today?: Date }} [opts] */
export function getAccountFocus(account, { transfers = [], today = startOfToday() } = {}) {
  const requirements = []
  if (!account) return { lane: 'parked', deadline: null, requirements, next: null }
  if (account.status === 'Closed') return { lane: 'parked', deadline: null, requirements, next: 'Closed' }

  const opened = parseDay(account.openedDate)
  const paid = isAccountBonusReceived(account)
  const deadlines = []
  const nextSteps = []

  if (!paid) {
    // Direct deposits. A linked DD counts as done when only one is required.
    const needsDD = Number(account.requiredDD) > 0 || Number(account.requiredDDCount) > 0 || !!account.ddSourceDescription
    if (needsDD) {
      const needed = Math.max(1, Number(account.requiredDDCount) || 1)
      const made = Math.max(0, Number(account.ddsMade) || 0)
      const done = made >= needed || (needed === 1 && !!account.ddLinkedDate)
      const label = Number(account.requiredDD) > 0 ? `Direct deposits (${money(account.requiredDD)}+)` : 'Direct deposits'
      requirements.push({ key: 'dd', label, done, current: done ? Math.max(made, needed) : made, target: needed, pct: Math.min(100, Math.round((made / needed) * 100)) })
      if (!done) {
        let when = ''
        if (opened && account.ddDeadlineDays > 0) {
          const d = deadline(addDays(opened, account.ddDeadlineDays), 'dd', today)
          deadlines.push(d)
          when = d.daysLeft < 0 ? '' : ` by ${shortDate(new Date(d.date))}`
          if (d.daysLeft < 0) nextSteps.push(`Direct deposit window closed ${shortDate(new Date(d.date))}. Call the bank.`)
        }
        nextSteps.push(`Send ${plural(needed - made, 'more direct deposit')}${when}`)
      }
    }

    const debit = getDebitProgress(account)
    if (debit) {
      if (debit.requiredCount > 0) {
        requirements.push({ key: 'debit', label: debit.perPurchaseMin > 0 ? `Debit purchases (${money(debit.perPurchaseMin)}+)` : 'Debit purchases', done: debit.countMet, current: debit.made, target: debit.requiredCount, pct: debit.requiredCount ? Math.min(100, Math.round((debit.made / debit.requiredCount) * 100)) : 100 })
      }
      if (debit.requiredSpend > 0) {
        requirements.push({ key: 'debitSpend', label: 'Debit spend', done: debit.spendMet, current: debit.spent, target: debit.requiredSpend, pct: Math.min(100, Math.round((debit.spent / debit.requiredSpend) * 100)), money: true })
      }
      if (!debit.met) {
        if (debit.deadline) {
          const d = { date: debit.deadline, daysLeft: debit.daysLeft, kind: 'debit' }
          deadlines.push(d)
          if (d.daysLeft < 0) nextSteps.unshift(`Debit window closed ${shortDate(new Date(d.date))}. Call the bank.`)
          else nextSteps.push(`${debitRemaining(debit)} by ${shortDate(new Date(d.date))}`)
        } else {
          nextSteps.push(debitRemaining(debit))
        }
      }
    }

    if (opened && account.bonusDeadlineDays > 0) {
      deadlines.push(deadline(addDays(opened, account.bonusDeadlineDays), 'bonus', today))
    }
  }

  // A balance to hold is shown, but never decides the lane — the stored
  // balance is often stale, and holding it is ongoing rather than a step.
  if (Number(account.minimumBalance) > 0) {
    const bal = Number(account.currentBalance) || 0
    requirements.push({ key: 'balance', label: `Keep ${money(account.minimumBalance)} in the account`, done: bal >= account.minimumBalance, current: bal, target: Number(account.minimumBalance), money: true, info: true })
  }

  const fee = getMonthlyFeeStatus(account, { transfers, today })
  let feeDeadline = null
  if (fee && fee.hasWaiver) {
    requirements.push({ key: 'fee', label: `Monthly fee waived (${fee.monthLabel})`, done: fee.waived, info: true })
    if (!fee.waived) feeDeadline = { date: fee.cycleEnd, daysLeft: fee.daysLeft, kind: 'monthlyFee' }
  }

  const steps = requirements.filter(r => !r.info)
  const open = steps.filter(r => !r.done)
  // A bonus-window deadline only matters while something is still owed.
  const live = deadlines.filter(d => d.kind !== 'bonus' || open.length > 0 || !paid)
  const nearest = soonest(paid ? [] : live)
  const feeUrgent = feeDeadline && feeDeadline.daysLeft <= URGENT_DAYS

  if (!paid && nearest && nearest.daysLeft <= URGENT_DAYS && (open.length > 0 || nearest.kind === 'bonus')) {
    const next = nearest.daysLeft < 0 && nearest.kind === 'bonus'
      ? `Bonus window closed ${shortDate(new Date(nearest.date))}. Contact the bank.`
      : nextSteps[0] ?? 'Check the bonus terms'
    return { lane: 'urgent', deadline: nearest, requirements, next }
  }
  if (feeUrgent) {
    return { lane: 'urgent', deadline: feeDeadline, requirements, next: `Meet the fee waiver in ${plural(Math.max(0, feeDeadline.daysLeft), 'day')} to avoid ${money(fee.fee)}` }
  }

  if (paid) {
    const cb = getClawbackStatus(account)
    if (account.status === 'Safe to Close' || cb.safe) {
      return { lane: 'decision', deadline: null, requirements, next: 'Past the clawback window' }
    }
    return {
      lane: 'earned',
      deadline: feeDeadline,
      requirements,
      next: cb.daysRemaining !== null ? `Safe to close in ${plural(cb.daysRemaining, 'day')}` : 'Bonus received',
    }
  }

  if (open.length > 0 || (steps.length === 0 && account.status !== 'Bonus Pending')) {
    return { lane: 'working', deadline: soonest(live.filter(d => d.daysLeft >= 0)) ?? nearest, requirements, next: nextSteps[0] ?? 'Add the bonus requirements to track them' }
  }

  const bonusDl = live.find(d => d.kind === 'bonus')
  return { lane: 'waiting', deadline: bonusDl ?? null, requirements, next: 'Requirements done. Waiting on the bank.' }
}

function debitRemaining(debit) {
  const parts = []
  if (!debit.countMet) parts.push(plural(debit.remainingCount, 'more debit purchase'))
  if (!debit.spendMet) parts.push(`${money(debit.remainingSpend)} more debit spend`)
  return parts.join(' and ')
}

/** Buckets records by lane, keeping the incoming order inside each lane. */
export function groupByLane(records, focusOf) {
  const buckets = Object.fromEntries(LANES.map(l => [l, []]))
  for (const r of records) {
    const focus = focusOf(r)
    buckets[focus.lane].push({ record: r, focus })
  }
  return buckets
}
