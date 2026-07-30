// Timeline / Calendar engine — collects every dated event across the household
// (spend deadlines, annual fees, clawback windows, re-eligibility, …) by reusing
// the math already computed in the other engines. This file does NOT re-derive
// any rule math — it only reads the results of getSpendDeadlineInfo,
// getAnnualFeeInfo, getClawbackStatus, getCardReeligibility, getBankEligibility
// and turns them into a flat, filterable, exportable list of events.

import { getSpendDeadlineInfo, getAnnualFeeInfo, getCardCloseShield } from './lifecycle'
import { getCardReeligibility } from './cardReeligibility'
import { getBankEligibility } from './bankEligibility'
import { getClawbackStatus } from './clawbackShield'
import { fmt$ } from '../utils/format'
import { isRetired } from '../utils/statusMeta'

const PAST_DAYS = 30      // agenda shows events overdue by up to this many days
const FUTURE_MONTHS = 18  // and upcoming events out to this far

// Category metadata for filter chips + dots. Token color classes only (no raw palette).
export const EVENT_CATEGORIES = [
  { key: 'spend',       label: 'Spend',       dot: 'bg-info',    text: 'text-info-ink' },
  { key: 'fees',        label: 'Fees',        dot: 'bg-warning', text: 'text-warning-ink' },
  { key: 'banks',       label: 'Banks',       dot: 'bg-accent',  text: 'text-accent-ink' },
  { key: 'eligibility', label: 'Eligibility', dot: 'bg-success', text: 'text-success-ink' },
]

const KIND_CATEGORY = {
  spend_deadline: 'spend',
  fee_post: 'fees',
  fee_refund_close: 'fees',
  retention_window: 'fees',
  dd_deadline: 'banks',
  bonus_deadline: 'banks',
  clawback_clear: 'banks',
  etf_clear: 'banks',
  close_shield_clear: 'fees',
  card_reeligible: 'eligibility',
  bank_reeligible: 'eligibility',
}

function memberName(members, memberId) {
  return (members ?? []).find(p => p.id === memberId)?.name ?? ''
}

function cardLabel(card) {
  return card.cardName + (card.last4 ? ` ···${card.last4}` : '')
}

function acctLabel(acct) {
  return acct.bankName + (acct.last4 ? ` ···${acct.last4}` : '')
}

function monthsBetween(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

// Only keep events within the agenda window: 30 days back, 18 months forward.
function inWindow(dateIso) {
  if (!dateIso) return false
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  const past = new Date(now)
  past.setDate(past.getDate() - PAST_DAYS)
  const future = new Date(now)
  future.setMonth(future.getMonth() + FUTURE_MONTHS)
  return d >= past && d <= future
}

function eventId(kind, { cardId, accountId, memberId, key }) {
  return `${kind}-${cardId || accountId || `${memberId}${key ?? ''}`}`
}

function makeEvent({ kind, date, title, detail, memberId, cardId, accountId, key }) {
  if (!inWindow(date)) return null
  return {
    id: eventId(kind, { cardId, accountId, memberId, key }),
    date: new Date(date).toISOString(),
    title,
    detail,
    category: KIND_CATEGORY[kind],
    memberId,
    ...(cardId ? { cardId } : {}),
    ...(accountId ? { accountId } : {}),
    kind,
  }
}

export function collectEvents(state) {
  const members = state.members ?? []
  const cards = state.creditCards ?? []
  const accounts = state.bankAccounts ?? []
  const events = []

  // ── CREDIT CARDS ──────────────────────────────────────────────────────────
  for (const card of cards) {
    if (isRetired(card)) continue
    const n = cardLabel(card)
    const pn = memberName(members, card.memberId)

    const si = getSpendDeadlineInfo(card)
    if (si && !si.met) {
      const remaining = (card.spendRequirement ?? 0) - (card.currentSpend ?? 0)
      events.push(makeEvent({
        kind: 'spend_deadline',
        date: si.deadline,
        title: `Spend deadline: ${n}`,
        detail: `${fmt$(remaining)} remaining of ${fmt$(card.spendRequirement)} spend requirement. ${pn}'s card.`,
        memberId: card.memberId,
        cardId: card.id,
      }))
    }

    const fi = getAnnualFeeInfo(card)
    if (fi) {
      if (fi.daysUntilFee >= 0) {
        events.push(makeEvent({
          kind: 'fee_post',
          date: fi.feeDate,
          title: `Annual fee ${fi.confirmed ? 'posts' : 'due'}: ${n}`,
          detail: fi.confirmed
            ? `${fmt$(card.annualFee)} annual fee posts on this date — call the retention line first and ask for a retention offer before it hits. ${pn}'s card.`
            : `${fmt$(card.annualFee)} annual fee cycle date — issuers bill it on the next statement, so expect it within ${fi.lagDays} days. Call the retention line first and ask for a retention offer before it hits. ${pn}'s card.`,
          memberId: card.memberId,
          cardId: card.id,
        }))
      }
      // Awaiting confirmation: mark the far end of the expected window, so the
      // calendar carries a "did this ever post?" checkpoint.
      if (fi.awaitingPost && fi.daysUntilExpectedBy >= 0) {
        events.push(makeEvent({
          kind: 'fee_post',
          date: fi.expectedBy,
          title: `Annual fee expected by: ${n}`,
          detail: `${fmt$(card.annualFee)} annual fee was due on its cycle date and should land by now. Check the statement — once it posts, mark it posted on the card to start the ${fi.refundDays}-day cancel-for-full-refund clock. ${pn}'s card.`,
          memberId: card.memberId,
          cardId: card.id,
        }))
      }
      if (fi.inRefundWindow) {
        events.push(makeEvent({
          kind: 'fee_refund_close',
          date: fi.refundDeadline,
          title: `Refund window closes: ${n}`,
          detail: `Last day to cancel ${n} for a full ${fmt$(card.annualFee)} refund. ${pn}'s card.`,
          memberId: card.memberId,
          cardId: card.id,
        }))
      }
    }

    // 12-month close shield clears — bonus-earned cards become safe to close.
    // Only surface it while it's still ahead (like the bank clawback_clear
    // event, which guards on !safe): a card that already cleared shouldn't
    // reappear as a red "overdue" milestone in the agenda. Keep Alive cards are
    // deliberate keeps, so they don't get a close reminder.
    const cs = getCardCloseShield(card)
    if (cs && !cs.safe && cs.safeDate && card.status !== 'Keep Alive') {
      events.push(makeEvent({
        kind: 'close_shield_clear',
        date: cs.safeDate,
        title: `Safe to close: ${n}`,
        detail: `1 year since open with the bonus earned — closing or downgrading no longer risks a clawback. ${pn}'s card.`,
        memberId: card.memberId,
        cardId: card.id,
      }))
    }

    // Retention window opens 10 months after opening, for cards 0–12 months old with a fee.
    if ((card.annualFee ?? 0) > 0 && card.openDate) {
      const open = new Date(card.openDate)
      const months = monthsBetween(open, new Date())
      if (months >= 0 && months <= 12) {
        const windowOpen = new Date(open)
        windowOpen.setMonth(windowOpen.getMonth() + 10)
        if (windowOpen > new Date()) {
          events.push(makeEvent({
            kind: 'retention_window',
            date: windowOpen.toISOString(),
            title: `Retention call window opens: ${n}`,
            detail: `Card turns 10 months old — a good time to call and ask for a retention offer ahead of the ${fmt$(card.annualFee)} annual fee. ${pn}'s card.`,
            memberId: card.memberId,
            cardId: card.id,
          }))
        }
      }
    }
  }

  // Card sign-up bonus re-eligibility — applies to any card with a bonus received,
  // regardless of status (Closed/Downgraded cards still count toward the clock).
  for (const member of members) {
    const rows = getCardReeligibility(member.id, cards)
    for (const row of rows) {
      if (row.lifetime || !row.eligibleDate) continue
      events.push(makeEvent({
        kind: 'card_reeligible',
        date: row.eligibleDate,
        title: `Bonus re-eligible: ${row.label}`,
        detail: `${member.name} can likely earn this bonus again (${row.months}mo rule since the last bonus). Check Doctor of Credit for the current offer before applying.`,
        memberId: member.id,
        cardId: row.anchorCard?.id,
        key: row.key,
      }))
    }
  }

  // ── BANK ACCOUNTS ─────────────────────────────────────────────────────────
  for (const acct of accounts) {
    if (acct.status === 'Closed') continue
    const n = acctLabel(acct)
    const pn = memberName(members, acct.memberId)
    const bonusReceived = !!acct.bonusReceivedDate

    if ((acct.ddDeadlineDays ?? 0) > 0 && acct.openedDate && !bonusReceived) {
      const deadline = new Date(acct.openedDate)
      deadline.setDate(deadline.getDate() + acct.ddDeadlineDays)
      events.push(makeEvent({
        kind: 'dd_deadline',
        date: deadline.toISOString(),
        title: `Direct deposit deadline: ${n}`,
        detail: `Qualifying direct deposit must land at ${acct.bankName} by this date to stay on track for the bonus. ${pn}'s account.`,
        memberId: acct.memberId,
        accountId: acct.id,
      }))
    }

    if ((acct.bonusDeadlineDays ?? 0) > 0 && acct.openedDate && !bonusReceived) {
      const deadline = new Date(acct.openedDate)
      deadline.setDate(deadline.getDate() + acct.bonusDeadlineDays)
      events.push(makeEvent({
        kind: 'bonus_deadline',
        date: deadline.toISOString(),
        title: `Bonus window closes: ${n}`,
        detail: `All requirements at ${acct.bankName} must be met by this date${acct.bonusAmount ? ` to earn ${fmt$(acct.bonusAmount)}` : ''}. ${pn}'s account.`,
        memberId: acct.memberId,
        accountId: acct.id,
      }))
    }

    if (bonusReceived) {
      const shield = getClawbackStatus(acct)
      if (!shield.safe && shield.safeDate) {
        events.push(makeEvent({
          kind: 'clawback_clear',
          date: shield.safeDate,
          title: `Safe to close: ${n}`,
          detail: `Past the 181-day clawback window — the bank can no longer reverse the bonus. ${pn}'s account.`,
          memberId: acct.memberId,
          accountId: acct.id,
        }))
      }
    }

    if ((acct.etfDays ?? 0) > 0 && acct.openedDate) {
      const etfDate = new Date(acct.openedDate)
      etfDate.setDate(etfDate.getDate() + acct.etfDays)
      if (etfDate > new Date()) {
        events.push(makeEvent({
          kind: 'etf_clear',
          date: etfDate.toISOString(),
          title: `Early-termination fee window ends: ${n}`,
          detail: `Closing ${acct.bankName} before this date may trigger an early-termination fee. ${pn}'s account.`,
          memberId: acct.memberId,
          accountId: acct.id,
        }))
      }
    }
  }

  // Bank bonus re-eligibility — only while still in cooldown (already-eligible
  // banks don't need a calendar reminder).
  for (const member of members) {
    const rows = getBankEligibility(member.id, accounts)
    for (const row of rows) {
      if (row.lifetime || !row.eligibleDate || row.eligible) continue
      events.push(makeEvent({
        kind: 'bank_reeligible',
        date: row.eligibleDate,
        title: `Bank bonus re-eligible: ${row.bankName}`,
        detail: `${member.name} can likely earn ${row.bankName}'s new-account bonus again. ${row.note}`,
        memberId: member.id,
        key: row.key,
      }))
    }
  }

  return events
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

// Events whose date falls within [start, end] (inclusive).
export function eventsInRange(events, start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return (events ?? []).filter(ev => {
    const d = new Date(ev.date)
    return d >= s && d <= e
  })
}
