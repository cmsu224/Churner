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
// Shape: { tone, verdict, summary, reason, date }
//   tone:    'wait'   — clawback risk, don't cancel yet
//            'act'    — money on the table right now (refund window / fee ≤45d)
//            'decide' — a fee decision is coming, plan for it
//            'keep'   — no reason to cancel
//   summary: a few words for the one-line collapsed card
//   reason:  the full explanation (tooltip / expanded view)
//   date:    the deadline/decision date the verdict hinges on (ISO), when one exists

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
    return {
      tone: 'wait',
      verdict: 'Wait to cancel',
      summary: shield.safeDate ? `clawback risk ends in ${shield.daysRemaining}d` : 'add an open date to track clawback',
      reason: shield.safeDate
        ? `closing in the first year risks a bonus clawback — clear in ${shield.daysRemaining}d`
        : 'set an open date to track the 12-month clawback window',
      date: shield.safeDate,
    }
  }

  if (fee?.inRefundWindow) {
    return {
      tone: 'act',
      verdict: 'Decide now',
      summary: `full refund if closed within ${fee.refundDaysLeft}d`,
      reason: `the $${Math.round(fee.annualFee)} fee just posted — cancel or downgrade within ${fee.refundDaysLeft}d for a full refund`,
      date: fee.refundDeadline,
    }
  }

  if (fee) {
    const soon = fee.daysUntilFee <= 45
    return {
      tone: soon ? 'act' : 'decide',
      verdict: soon ? 'Cancel or downgrade soon' : 'No rush yet',
      summary: soon ? `fee posts in ${fee.daysUntilFee}d` : `next fee in ${fee.daysUntilFee}d`,
      reason: `the next $${Math.round(fee.annualFee)} fee posts in ${fee.daysUntilFee}d — downgrading to a no-fee card keeps the credit line and account age; cancelling before it posts also works${shield?.safe ? ' (clawback-safe)' : ''}`,
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
