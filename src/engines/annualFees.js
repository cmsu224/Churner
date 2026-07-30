// Annual-fee schedule — the household's annual fees gathered across every open
// card into one sorted list with totals. This file does NOT re-derive the
// per-card date math: the cycle date, the expected-posting window, whether the
// posting has been confirmed, and the issuer's refund window all come from
// getAnnualFeeInfo (lifecycle.js) — including first-year-waiver awareness — so
// the Annual Fee Tracker, the card verdicts, the Timeline fee events, and the
// fee action items stay in agreement.

import { getAnnualFeeInfo } from './lifecycle'
import { isRetired } from '../utils/statusMeta'

// One card's current annual-fee cycle, or null when the card carries no fee,
// is retired, or has no anchor date set (open date / fee post date) to count from.
export function getCardFeeSchedule(card) {
  if (!card || isRetired(card)) return null
  if (!(card.annualFee > 0)) return null
  const info = getAnnualFeeInfo(card)
  if (!info) return null // fee set but no open/post date to anchor the cycle

  return {
    cardId: card.id,
    annualFee: Number(card.annualFee) || 0,
    ...info,
    // True when the cycle is anchored on a confirmed fee post date rather than
    // the open-date anniversary — the tracker notes which is in play.
    fromPostDate: info.anchoredOnPostDate,
  }
}

// Whole-household fee picture: every open fee card as a schedule row (sorted
// soonest-first), the cards that need a date before they can be tracked, and
// the aggregate totals that drive the stat tiles.
export function getAnnualFeeSchedule(cards) {
  const list = cards ?? []
  const rows = []
  const undated = []

  for (const card of list) {
    if (isRetired(card) || !(card.annualFee > 0)) continue
    const schedule = getCardFeeSchedule(card)
    if (schedule) rows.push({ ...schedule, card })
    else undated.push(card) // fee set but no anchor date
  }

  rows.sort((a, b) => new Date(a.feeDate) - new Date(b.feeDate))

  const totalAnnual = rows.reduce((sum, r) => sum + r.annualFee, 0)
  const inRefund = rows.filter(r => r.inRefundWindow)
  // Due to post but not yet confirmed — the fee is landing on the next
  // statement and the refund clock hasn't started.
  const awaiting = rows.filter(r => r.awaitingPost)
  const dueSoon = rows.filter(r => r.phase === 'scheduled' && r.daysUntilFee >= 0 && r.daysUntilFee <= 45)
  // The next fee to expect: the soonest scheduled one, or — if a fee is already
  // due and just waiting on a statement — that one, since it lands first.
  const next = awaiting[0] ?? rows.find(r => r.phase === 'scheduled' && r.daysUntilFee >= 0) ?? null

  return { rows, undated, totalAnnual, inRefund, awaiting, dueSoon, next }
}
