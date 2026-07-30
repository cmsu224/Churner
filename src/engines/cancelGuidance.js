// "Should I cancel or downgrade?" — one plain-English verdict per card.
//
// Combines three signals that already live in other engines, so the card list
// answers the question at a glance instead of making you cross-reference the
// Annual Fee tracker and the close shield:
//   1. the 12-month close shield — bonus clawback risk (lifecycle.js)
//   2. the next annual-fee posting — waiver/post-date aware (annualFees.js)
//   3. the 30-day cancel-for-full-refund window after a fee posts
//
// Only cards past the earning stage get a verdict (Bonus Met / Keep Alive /
// Downgrade/Close Due): while a bonus is still being earned the only sane
// advice is "finish the spend", and that's the spend tracker's job.
//
// Shape: { tone, verdict, summary, reason, date, window }
//   tone:    'wait'   — clawback risk, don't cancel yet
//            'act'    — money on the table right now (refund window / fee ≤45d)
//            'decide' — a fee decision is coming, plan for it
//            'keep'   — no reason to cancel
//   summary: a few words for the one-line collapsed card
//   reason:  the full explanation (tooltip / expanded view)
//   date:    the deadline/decision date the verdict hinges on (ISO), when one exists
//   window:  { start, end } — the BEST-EXIT window (wait tone only): start is
//            the day the clawback clears; end is when the issuer's fee-refund
//            window for the first escapable fee cycle shuts (null when the
//            card has no fee, meaning "any time after start"). Cancelling or
//            downgrading inside it dodges the clawback AND never eats a fee —
//            before the fee posts it's avoided, after it posts it refunds.

import { getCardCloseShield } from './lifecycle'
import { getCardFeeSchedule } from './annualFees'
import { isRetired } from '../utils/statusMeta'

const DECIDED_STATUSES = ['Bonus Met', 'Keep Alive', 'Downgrade/Close Due']

export function getCancelGuidance(card) {
  if (!card || isRetired(card) || !DECIDED_STATUSES.includes(card.status ?? '')) return null
  const shield = getCardCloseShield(card)
  const fee = getCardFeeSchedule(card)

  // Clawback risk trumps everything — never cancel a card whose bonus the
  // issuer can still take back.
  if (shield && !shield.safe) {
    if (!shield.safeDate) {
      return {
        tone: 'wait',
        verdict: 'Wait to cancel',
        summary: 'add an open date to track clawback',
        reason: 'set an open date to track the 12-month clawback window',
        date: null,
      }
    }
    if (!fee) {
      return {
        tone: 'wait',
        verdict: 'Wait to cancel',
        summary: `clawback risk ends in ${shield.daysRemaining}d`,
        reason: `closing in the first year risks a bonus clawback — clear in ${shield.daysRemaining}d${card.annualFee > 0 ? '; add an open or fee-post date to time the fee refund too' : '; no annual fee to time around'}`,
        date: shield.safeDate,
        window: { start: shield.safeDate, end: null },
      }
    }
    // Best-exit window: opens when the clawback clears, closes when the
    // refund window of the first escapable fee cycle shuts. Advance yearly
    // cycles past any whose refund deadline is already gone by then — that
    // fee is sunk (rare: an early fee-post date with a late-cleared shield).
    const safe = new Date(shield.safeDate)
    const feeDate = new Date(fee.feeDate)
    const deadline = new Date(fee.refundDeadline)
    let feeSunk = false
    while (deadline < safe) {
      feeDate.setFullYear(feeDate.getFullYear() + 1)
      deadline.setFullYear(deadline.getFullYear() + 1)
      feeSunk = true
    }
    return {
      tone: 'wait',
      verdict: 'Wait, then exit',
      summary: `clawback risk ends in ${shield.daysRemaining}d`,
      reason: `clawback risk ends in ${shield.daysRemaining}d — cancel or downgrade inside the window and the $${Math.round(fee.annualFee)} fee never sticks: before it posts it's avoided, and up to ${fee.refundDays}d after it posts it refunds in full${feeSunk ? '. Heads-up: one fee posts before the clawback clears and won’t refund' : ''}`,
      date: shield.safeDate,
      window: { start: shield.safeDate, end: deadline.toISOString() },
    }
  }

  if (fee?.inRefundWindow) {
    return {
      tone: 'act',
      verdict: 'Decide now',
      summary: `full refund if closed within ${fee.refundDaysLeft}d`,
      reason: `the $${Math.round(fee.annualFee)} fee posted — cancel or downgrade within ${fee.refundDaysLeft}d for a full refund`,
      date: fee.refundDeadline,
    }
  }

  // Cycle date reached, nothing confirmed: the fee is billed on the next
  // statement, so it hasn't hit yet — cancelling now still dodges it entirely.
  if (fee?.awaitingPost) {
    return {
      tone: 'act',
      verdict: 'Fee lands any day',
      summary: fee.overdue ? 'check your statement' : 'bills on the next statement',
      reason: `the $${Math.round(fee.annualFee)} fee was due on the cycle date and posts with the next statement — cancel or downgrade before it hits and you owe nothing; once it shows up, mark it posted on the card and you get ${fee.refundDays}d to cancel for a full refund`,
      date: fee.expectedBy,
    }
  }

  if (fee) {
    const soon = fee.daysUntilFee <= 45
    return {
      tone: soon ? 'act' : 'decide',
      verdict: soon ? 'Cancel or downgrade soon' : 'No rush yet',
      summary: soon ? `fee due in ${fee.daysUntilFee}d` : `next fee in ${fee.daysUntilFee}d`,
      reason: `the next $${Math.round(fee.annualFee)} fee is due in ${fee.daysUntilFee}d${fee.confirmed ? '' : ' and bills on the statement after that'} — downgrading to a no-fee card keeps the credit line and account age; cancelling before it posts also works${shield?.safe ? ' (clawback-safe)' : ''}`,
      date: fee.feeDate,
    }
  }

  if (card.annualFee > 0) {
    // Fee card with no anchor date — the schedule can't be computed yet.
    return {
      tone: 'decide',
      verdict: 'Add an open date',
      summary: 'to schedule the annual fee',
      reason: 'the annual fee can’t be scheduled without an open date or fee post date',
      date: null,
    }
  }

  return {
    tone: 'keep',
    verdict: 'Keep it open',
    summary: 'no fee — helps credit age',
    reason: `no annual fee${shield?.safe ? ' and the bonus is clawback-safe' : ''} — a free open card helps credit age and utilization`,
    date: null,
  }
}
