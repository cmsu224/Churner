import { getSpendDeadlineInfo, getAnnualFeeInfo, getReeligibilityInfo } from './lifecycle'
import { getClawbackStatus } from './clawbackShield'

function pName(players, playerId) {
  return (players ?? []).find(p => p.id === playerId)?.name ?? ''
}

function cardLabel(card) {
  return card.cardName + (card.last4 ? ` ···${card.last4}` : '')
}

function acctLabel(a) {
  return a.bankName + (a.last4 ? ` ···${a.last4}` : '')
}

export function generateActionItems(state) {
  const items = []
  const players = state.players ?? []

  // ── CREDIT CARDS ──────────────────────────────────────────────────────────
  for (const card of (state.creditCards ?? [])) {
    if (card.status === 'Closed') continue
    const n = cardLabel(card)
    const pn = pName(players, card.playerId)

    // Spend deadline
    const si = getSpendDeadlineInfo(card)
    if (si && !si.met) {
      const d = si.daysLeft
      const remaining = (card.spendRequirement ?? 0) - (card.currentSpend ?? 0)
      const deadline = new Date(si.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (d < 0) {
        items.push({ id: `spend-overdue-${card.id}`, type: 'critical', category: 'spend', cardId: card.id, playerId: card.playerId,
          title: `Spend deadline missed: ${n}`,
          detail: `The $${card.spendRequirement?.toLocaleString()} spend requirement deadline passed ${Math.abs(d)} days ago. Call the issuer immediately — some will grant an extension if contacted within a few days of the deadline. ${pn}'s card.`,
          dueDate: si.deadline, action: 'Call issuer now' })
      } else if (d <= 7) {
        items.push({ id: `spend-urgent-${card.id}`, type: 'critical', category: 'spend', cardId: card.id, playerId: card.playerId,
          title: `${d}d left — ${n} spend deadline`,
          detail: `Need $${remaining.toLocaleString()} more to hit $${card.spendRequirement?.toLocaleString()} by ${deadline}. Prepay bills, buy gift cards, or pay rent through a service if needed. ${pn}'s card.`,
          dueDate: si.deadline, action: 'Accelerate spending' })
      } else if (d <= 30) {
        items.push({ id: `spend-warn-${card.id}`, type: 'warning', category: 'spend', cardId: card.id, playerId: card.playerId,
          title: `${d}d left on spend: ${n}`,
          detail: `$${remaining.toLocaleString()} remaining of $${card.spendRequirement?.toLocaleString()} requirement. Deadline: ${deadline}. ${pn}'s card.`,
          dueDate: si.deadline, action: 'Track spending' })
      }
    }

    // Annual fee
    const fi = getAnnualFeeInfo(card)
    if (fi) {
      if (fi.inRefundWindow && fi.refundDaysLeft !== null) {
        const rl = fi.refundDaysLeft
        items.push({ id: `fee-refund-${card.id}`, type: rl <= 5 ? 'critical' : 'warning', category: 'annual_fee', cardId: card.id, playerId: card.playerId,
          title: `Annual fee posted — ${rl}d left to cancel for refund: ${n}`,
          detail: `$${card.annualFee} annual fee already posted. You have ${rl} days to call and cancel for a FULL REFUND (30-day window). Or request a product change to a no-fee version to keep the credit history. Call the number on the back of the card. ${pn}'s card.`,
          dueDate: fi.refundDeadline, action: rl <= 5 ? 'CALL NOW to cancel/downgrade' : 'Call to cancel or downgrade' })
      } else if (!fi.inRefundWindow && fi.daysUntilFee >= 0 && fi.daysUntilFee <= 45) {
        const d = fi.daysUntilFee
        items.push({ id: `fee-soon-${card.id}`, type: d <= 7 ? 'warning' : 'info', category: 'annual_fee', cardId: card.id, playerId: card.playerId,
          title: `Annual fee in ${d}d: ${n} ($${card.annualFee})`,
          detail: d <= 14
            ? `Fee posts in ${d} days. Option A: Cancel before it posts (no fee owed). Option B: Let it post → use any credits/perks → cancel within 30 days for a full refund. Call the retention line first and ask for a retention offer. ${pn}'s card.`
            : `$${card.annualFee} annual fee coming up. Pro move: call the retention line, ask for a retention offer. Even if they say no, let the fee post then cancel within 30 days for a full refund. ${pn}'s card.`,
          dueDate: fi.feeDate, action: d <= 14 ? 'Decide cancel strategy' : 'Call retention line' })
      }
    }

    // Retention call window (10–12 months old, has annual fee)
    if (card.openDate && (card.annualFee ?? 0) > 0) {
      const open = new Date(card.openDate)
      const months = (new Date().getFullYear() - open.getFullYear()) * 12 + (new Date().getMonth() - open.getMonth())
      if (months >= 10 && months <= 12 && card.status !== 'Downgrade/Close Due' && card.status !== 'Closed') {
        // Only show if no annual fee item already exists for this card
        const alreadyHasFeeAlert = items.some(i => i.cardId === card.id && i.category === 'annual_fee')
        if (!alreadyHasFeeAlert) {
          items.push({ id: `retention-${card.id}`, type: 'info', category: 'annual_fee', cardId: card.id, playerId: card.playerId,
            title: `Retention call due: ${n} (${months}mo old)`,
            detail: `Annual fee is approaching. Call the retention/loyalty line now and ask "what offers do you have to keep my account active?" Issuers often give bonus points, statement credits, or fee waivers to loyal customers. ${pn}'s card.`,
            dueDate: null, action: 'Call retention line' })
        }
      }
    }

    // AutoPay not set
    if (!card.autoPayEnabled) {
      items.push({ id: `autopay-${card.id}`, type: 'warning', category: 'autopay', cardId: card.id, playerId: card.playerId,
        title: `Enable AutoPay: ${n}`,
        detail: `One missed payment can void your sign-up bonus and trigger penalty APR (up to 29.99%). Log into the card portal → Payments → AutoPay → set to "Statement Balance." ${pn}'s card.`,
        dueDate: null, action: 'Set up AutoPay now' })
    }

    // Bonus received but status stale
    if (card.bonusReceived && card.status === 'Active Churn') {
      items.push({ id: `stale-status-${card.id}`, type: 'info', category: 'bonus', cardId: card.id, playerId: card.playerId,
        title: `Update status: ${n}`,
        detail: `Bonus is marked as received but card status is still "Active Churn". Tap the card to update it to "Bonus Met" so your tracker stays accurate.`,
        dueDate: null, action: 'Update card status' })
    }

    // Re-eligibility
    const ri = getReeligibilityInfo(card)
    if (ri && ri.reeligible) {
      items.push({ id: `reeligible-${card.id}`, type: 'info', category: 'reeligible', cardId: card.id, playerId: card.playerId,
        title: `Re-eligible for bonus: ${n}`,
        detail: `You can potentially earn this card's sign-up bonus again. ${ri.note}. Check Doctor of Credit for the current offer value before applying. ${pn}'s card.`,
        dueDate: null, action: 'Check current offer' })
    }
  }

  // ── BANK ACCOUNTS ─────────────────────────────────────────────────────────
  for (const acct of (state.bankAccounts ?? [])) {
    if (acct.status === 'Closed') continue
    const n = acctLabel(acct)
    const pn = pName(players, acct.playerId)

    const shield = getClawbackStatus(acct)

    // Safe to close
    if (shield.safe && acct.bonusReceivedDate) {
      items.push({ id: `close-acct-${acct.id}`, type: 'info', category: 'clawback', accountId: acct.id, playerId: acct.playerId,
        title: `Safe to close: ${n}`,
        detail: `Past the 181-day clawback window. You can safely close this account — the bank can no longer claw back your bonus. Call the bank or close online. ${pn}'s account.`,
        dueDate: null, action: 'Close account' })
    }

    // DD not yet linked
    if (acct.openedDate && !acct.ddLinkedDate && (acct.requiredDD ?? 0) > 0) {
      const daysOpen = Math.ceil((new Date() - new Date(acct.openedDate)) / 86400000)
      if (daysOpen > 14) {
        items.push({ id: `dd-${acct.id}`, type: daysOpen > 45 ? 'critical' : 'warning', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
          title: `Link direct deposit: ${n}`,
          detail: `Account opened ${daysOpen} days ago — direct deposit not yet marked as linked. Required: $${acct.requiredDD?.toLocaleString()}/month. Set this up ASAP to qualify for the bonus. ${pn}'s account.`,
          dueDate: null, action: 'Set up direct deposit' })
      }
    }

    // In cooling period — hold open
    if (acct.bonusReceivedDate && !shield.safe) {
      items.push({ id: `cooling-${acct.id}`, type: 'info', category: 'clawback', accountId: acct.id, playerId: acct.playerId,
        title: `Hold open: ${n} (${shield.daysRemaining}d until safe)`,
        detail: `Bonus received! Keep this account open and above any minimum balance for ${shield.daysRemaining} more days to clear the 181-day clawback window. Closing early risks losing your bonus. ${pn}'s account.`,
        dueDate: shield.safeDate, action: 'Keep account open' })
    }
  }

  // ── SORT: critical → warning → info; within tier: soonest dueDate first ──
  const rank = { critical: 0, warning: 1, info: 2 }
  items.sort((a, b) => {
    const td = rank[a.type] - rank[b.type]
    if (td !== 0) return td
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  return items
}
