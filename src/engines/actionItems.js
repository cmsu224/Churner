import { getSpendDeadlineInfo, getAnnualFeeInfo, getReeligibilityInfo } from './lifecycle'
import { getClawbackStatus } from './clawbackShield'
import { getKeepAliveCards } from './creditAge'
import { fmt$ } from '../utils/format'

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
    const hasBonus = (acct.bonusAmount ?? 0) > 0
    const bonusReceived = !!acct.bonusReceivedDate

    // 1. Safe to close (post-clawback window)
    if (shield.safe && bonusReceived) {
      items.push({ id: `close-acct-${acct.id}`, type: 'info', category: 'clawback', accountId: acct.id, playerId: acct.playerId,
        title: `Safe to close: ${n}`,
        detail: `Past the 181-day clawback window. The bank can no longer reverse your bonus. Close online or by phone. ${pn}'s account.`,
        dueDate: null, action: 'Close account' })
    }

    // 2. DD deadline countdown
    if (!acct.ddLinkedDate && !bonusReceived) {
      if (acct.openedDate && (acct.ddDeadlineDays ?? 0) > 0) {
        const deadline = new Date(acct.openedDate)
        deadline.setDate(deadline.getDate() + acct.ddDeadlineDays)
        const daysLeft = Math.ceil((deadline - new Date()) / 86400000)
        const ddAmt = acct.requiredDD ? `$${acct.requiredDD.toLocaleString()}` : 'a qualifying'
        if (daysLeft < 0) {
          items.push({ id: `dd-overdue-${acct.id}`, type: 'critical', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
            title: `DD deadline passed: ${n}`,
            detail: `The ${acct.ddDeadlineDays}-day direct deposit window at ${acct.bankName} closed ${Math.abs(daysLeft)} days ago. Call the bank immediately — some will still honor late DDs if contacted promptly. Ask to speak to a supervisor and document your call. ${pn}'s account.`,
            dueDate: deadline.toISOString(), action: 'Call bank now' })
        } else if (daysLeft <= 7) {
          items.push({ id: `dd-urgent-${acct.id}`, type: 'critical', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
            title: `${daysLeft}d to link DD: ${n}`,
            detail: `Must make ${ddAmt} direct deposit within ${daysLeft} days to qualify for the ${hasBonus ? fmt$(acct.bonusAmount) + ' ' : ''}bonus. Set up payroll direct deposit or qualifying ACH transfer NOW. ${pn}'s account.`,
            dueDate: deadline.toISOString(), action: 'Link direct deposit NOW' })
        } else if (daysLeft <= 30) {
          items.push({ id: `dd-warn-${acct.id}`, type: 'warning', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
            title: `${daysLeft}d left to link DD: ${n}`,
            detail: `Must set up ${ddAmt} direct deposit at ${acct.bankName} by ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to earn${hasBonus ? ' the ' + fmt$(acct.bonusAmount) : ' the'} bonus. ${pn}'s account.`,
            dueDate: deadline.toISOString(), action: 'Set up direct deposit' })
        } else if (daysLeft <= 60) {
          items.push({ id: `dd-info-${acct.id}`, type: 'info', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
            title: `Link DD within ${daysLeft}d: ${n}`,
            detail: `Direct deposit deadline: ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Required: ${ddAmt} per deposit${acct.ddSourceDescription ? ' from ' + acct.ddSourceDescription : ''}. ${pn}'s account.`,
            dueDate: deadline.toISOString(), action: 'Schedule direct deposit' })
        }
      } else if (acct.openedDate && (acct.requiredDD ?? 0) > 0) {
        const daysOpen = Math.ceil((new Date() - new Date(acct.openedDate)) / 86400000)
        if (daysOpen > 14) {
          items.push({ id: `dd-generic-${acct.id}`, type: daysOpen > 45 ? 'critical' : 'warning', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
            title: `Link direct deposit: ${n}`,
            detail: `Account opened ${daysOpen} days ago — direct deposit not yet set up. Required: $${acct.requiredDD.toLocaleString()}. Add a DD deadline (days) to get a precise countdown. ${pn}'s account.`,
            dueDate: null, action: 'Set up direct deposit' })
        }
      }
    }

    // 3. Multiple DDs in progress
    if ((acct.requiredDDCount ?? 1) > 1 && !bonusReceived) {
      const made = acct.ddsMade ?? 0
      const needed = acct.requiredDDCount ?? 1
      const remaining = needed - made
      if (remaining > 0 && made > 0) {
        items.push({ id: `dd-progress-${acct.id}`, type: 'info', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
          title: `${remaining} more DD${remaining !== 1 ? 's' : ''} needed: ${n}`,
          detail: `${made}/${needed} qualifying direct deposits completed at ${acct.bankName}. Each must be ${acct.requiredDD ? '$' + acct.requiredDD.toLocaleString() + '+' : 'qualifying'}. Update "DDs Completed" on the account as you go. ${pn}'s account.`,
          dueDate: null, action: 'Make another deposit' })
      }
    }

    // 4. Minimum balance reminder
    if ((acct.minimumBalance ?? 0) > 0 && !bonusReceived) {
      items.push({ id: `min-bal-${acct.id}`, type: 'info', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
        title: `Maintain ${fmt$(acct.minimumBalance)} in ${n}`,
        detail: `This account requires a ${fmt$(acct.minimumBalance)} minimum balance to avoid monthly fees and qualify for the bonus. Falling below this can reset the requirement or forfeit the offer. ${pn}'s account.`,
        dueDate: null, action: 'Monitor balance' })
    }

    // 5. Overall bonus deadline countdown
    if (acct.openedDate && (acct.bonusDeadlineDays ?? 0) > 0 && !bonusReceived) {
      const deadline = new Date(acct.openedDate)
      deadline.setDate(deadline.getDate() + acct.bonusDeadlineDays)
      const daysLeft = Math.ceil((deadline - new Date()) / 86400000)
      if (daysLeft < 0) {
        items.push({ id: `bonus-deadline-missed-${acct.id}`, type: 'critical', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
          title: `Bonus window expired: ${n}`,
          detail: `The ${acct.bonusDeadlineDays}-day offer window at ${acct.bankName} closed ${Math.abs(daysLeft)} days ago without a bonus posting. Call the bank — if you met all requirements in time, ask them to manually post the bonus. Document every interaction. ${pn}'s account.`,
          dueDate: deadline.toISOString(), action: 'Call bank to claim bonus' })
      } else if (daysLeft <= 14) {
        items.push({ id: `bonus-deadline-${acct.id}`, type: 'warning', category: 'bonus', accountId: acct.id, playerId: acct.playerId,
          title: `Bonus deadline in ${daysLeft}d: ${n}`,
          detail: `All requirements at ${acct.bankName} must be completed by ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to earn${hasBonus ? ' the ' + fmt$(acct.bonusAmount) : ' the'} bonus. Verify every condition is met now. ${pn}'s account.`,
          dueDate: deadline.toISOString(), action: 'Verify all requirements met' })
      }
    }

    // 6. Bonus received — cooling period
    if (bonusReceived && !shield.safe) {
      items.push({ id: `cooling-${acct.id}`, type: 'info', category: 'clawback', accountId: acct.id, playerId: acct.playerId,
        title: `Hold open ${shield.daysRemaining}d more: ${n}`,
        detail: `Bonus received! Keep this account open${(acct.minimumBalance ?? 0) > 0 ? ' and above ' + fmt$(acct.minimumBalance) : ''} for ${shield.daysRemaining} more days to clear the 181-day clawback window. Closing early risks losing the bonus. ${pn}'s account.`,
        dueDate: shield.safeDate, action: 'Keep account open' })
    }
  }

  // ── KEEP-ALIVE: usage tracking on every open card ──────────────────────────
  for (const player of players) {
    const playerCards = (state.creditCards ?? []).filter(c => c.playerId === player.id)
    const keepAlive = getKeepAliveCards(playerCards)
    for (const { card, age, daysSinceUsed, usageStatus, isOldest } of keepAlive) {
      const n = cardLabel(card)
      const pn = player.name
      const ageStr = age ? ` (${age.label} old)` : ''
      const oldestNote = isOldest
        ? ` This is one of ${pn}'s 3 oldest cards, so keeping it open matters most for credit history.`
        : ''
      if (usageStatus === 'critical') {
        items.push({ id: `keepalive-crit-${card.id}`, type: 'critical', category: 'keepalive', cardId: card.id, playerId: player.id,
          title: `Use to keep alive: ${n}${ageStr}`,
          detail: `Hasn't been used in ${daysSinceUsed} days. Issuers close cards after ~12 months of inactivity — losing it can shorten your credit history and ding your score. Put a small recurring charge on it (e.g. a streaming subscription) with AutoPay.${oldestNote} ${pn}'s card.`,
          dueDate: null, action: 'Make a small charge now' })
      } else if (usageStatus === 'warning') {
        items.push({ id: `keepalive-warn-${card.id}`, type: isOldest ? 'warning' : 'info', category: 'keepalive', cardId: card.id, playerId: player.id,
          title: `Use soon to keep alive: ${n}${ageStr}`,
          detail: `Last used ${daysSinceUsed} days ago. Use it for a small purchase to reset the inactivity clock.${oldestNote} ${pn}'s card.`,
          dueDate: null, action: 'Use this card soon' })
      } else if (usageStatus === 'unknown' && isOldest) {
        items.push({ id: `keepalive-track-${card.id}`, type: 'info', category: 'keepalive', cardId: card.id, playerId: player.id,
          title: `Track usage: ${n}${ageStr}`,
          detail: `One of ${pn}'s 3 oldest cards — important to keep open for your credit history. Set its "Last Used" date so the tracker can warn you before it goes inactive. ${pn}'s card.`,
          dueDate: null, action: 'Set last-used date' })
      }
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
