// Annual-fee schedule — the household's annual fees gathered across every open
// card into one sorted list with totals. This file does NOT re-derive the
// per-card date math: the next-fee date, the issuer's refund window, and the
// refund deadline all come from getAnnualFeeInfo (lifecycle.js), so the Annual
// Fee Tracker, the Timeline fee events, and the fee action items stay in agreement.
// The one thing layered on here is first-year-waiver awareness, so a card whose
// sign-up fee was waived shows its first *charged* fee instead of the waived one.

import { getAnnualFeeInfo } from './lifecycle'
import { isRetired } from '../utils/statusMeta'

const DAY = 86400000

// One card's next annual-fee milestone, or null when the card carries no fee,
// is retired, or has no anchor date set (open date / fee post date) to count from.
export function getCardFeeSchedule(card) {
  if (!card || isRetired(card)) return null
  if (!(card.annualFee > 0)) return null
  const info = getAnnualFeeInfo(card)
  if (!info) return null // fee set but no open/post date to anchor the cycle

  const anchor = card.feePostDate || card.openDate
  let { feeDate, daysUntilFee, inRefundWindow, refundDaysLeft, refundDeadline, refundDays } = info
  let waivedFirstYear = false

  // First-year waiver: the sign-up fee (at the anchor date itself) doesn't post.
  // If the computed date is still that first cycle — strictly before the first
  // anniversary — roll it forward a year to the first fee actually charged.
  if (card.feeWaivedFirstYear && anchor) {
    const firstAnniversary = new Date(anchor)
    firstAnniversary.setFullYear(firstAnniversary.getFullYear() + 1)
    if (new Date(feeDate) < firstAnniversary) {
      const next = new Date(feeDate)
      next.setFullYear(next.getFullYear() + 1)
      feeDate = next.toISOString()
      daysUntilFee = Math.ceil((next - new Date()) / DAY)
      inRefundWindow = false
      refundDaysLeft = null
      const rd = new Date(next)
      rd.setDate(rd.getDate() + refundDays)
      refundDeadline = rd.toISOString()
      waivedFirstYear = true
    }
  }

  return {
    cardId: card.id,
    annualFee: Number(card.annualFee) || 0,
    feeDate,
    daysUntilFee,
    inRefundWindow,
    refundDaysLeft,
    refundDeadline,
    refundDays,
    waivedFirstYear,
    // True when the countdown is anchored on the explicit fee post date rather
    // than the open-date anniversary — the tracker notes which is in play.
    fromPostDate: !!card.feePostDate,
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
  const dueSoon = rows.filter(r => !r.inRefundWindow && r.daysUntilFee >= 0 && r.daysUntilFee <= 45)
  const next = rows.find(r => !r.inRefundWindow && r.daysUntilFee >= 0) ?? null

  return { rows, undated, totalAnnual, inRefund, dueSoon, next }
}
