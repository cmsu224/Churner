// Bank bonus eligibility.
//
// Most banks only let you earn a NEW-account bonus again after a cooldown
// measured from your last bonus (or, if no bonus has posted yet, from when you
// last opened an account there). The windows below are common, widely-cited
// values — banks change these often, so treat them as guidance and verify the
// current terms on DoctorofCredit before applying.
//
// monthsRule = 0 is treated as "once per lifetime" (not repeatable).

import { getIssuerMeta } from '../utils/issuers'

const BANK_RULES = {
  chase:       { months: 24, note: 'Chase: ~24 months since your last checking/savings bonus.' },
  citi:        { months: 24, note: 'Citi: roughly once per 24 months per bonus; some require no open/closed account in the prior 6 months.' },
  bofa:        { months: 24, note: 'Bank of America: typically once per 24 months (some offers are once per lifetime).' },
  wellsfargo:  { months: 12, note: 'Wells Fargo: about once every 12 months.' },
  usbank:      { months: 24, note: 'U.S. Bank: roughly once per 24 months.' },
  capitalone:  { months: 12, note: 'Capital One: generally not eligible if you hold/held the account recently; ~12 months.' },
  pnc:         { months: 24, note: 'PNC: about once per 24 months.' },
  td:          { months: 12, note: 'TD Bank: about once per 12 months.' },
  citizens:    { months: 24, note: 'Citizens: about once per 24 months.' },
  truist:      { months: 24, note: 'Truist: about once per 24 months.' },
  discover:    { months: 0,  note: 'Discover: bank bonus is once per lifetime.' },
  sofi:        { months: 0,  note: 'SoFi: new-member bonus is generally once per lifetime.' },
  ally:        { months: 12, note: 'Ally: bonuses are occasional/targeted; ~12 months when offered.' },
  fidelity:    { months: 24, note: 'Fidelity: about once per 24 months.' },
  schwab:      { months: 24, note: 'Charles Schwab: about once per 24 months.' },
  navyfederal: { months: 24, note: 'Navy Federal: about once per 24 months.' },
  usaa:        { months: 24, note: 'USAA: about once per 24 months.' },
  bilt:        { months: 12, note: 'Bilt: varies; ~12 months.' },
}

const DEFAULT_RULE = { months: 24, note: 'No specific rule on file — using a conservative 24-month estimate. Verify on DoctorofCredit.' }

function daysBetween(a, b) {
  return Math.ceil((a - b) / 86400000)
}

// One eligibility row per bank the player has touched.
export function getBankEligibility(playerId, allBankAccounts) {
  const accounts = (allBankAccounts ?? []).filter(a => a.playerId === playerId)
  const byBank = {}

  for (const acct of accounts) {
    const meta = getIssuerMeta(acct.bankName)
    const key = meta.key
    // Anchor date = most recent bonus received, else most recent open date.
    const anchorStr = acct.bonusReceivedDate || acct.openedDate
    if (!byBank[key]) byBank[key] = { meta, anchor: null, anchorFromBonus: false, accounts: 0 }
    byBank[key].accounts++
    if (anchorStr) {
      const d = new Date(anchorStr)
      if (!byBank[key].anchor || d > byBank[key].anchor) {
        byBank[key].anchor = d
        byBank[key].anchorFromBonus = !!acct.bonusReceivedDate
      }
    }
  }

  const now = new Date()
  const rows = Object.values(byBank).map(({ meta, anchor, anchorFromBonus, accounts }) => {
    const rule = BANK_RULES[meta.key] ?? DEFAULT_RULE
    const lifetime = rule.months === 0

    if (!anchor) {
      return { key: meta.key, bankName: meta.name, accounts, lifetime, months: rule.months,
        note: rule.note, eligible: true, daysUntil: 0, eligibleDate: null, anchor: null, anchorFromBonus }
    }
    if (lifetime) {
      return { key: meta.key, bankName: meta.name, accounts, lifetime, months: 0,
        note: rule.note, eligible: false, daysUntil: null, eligibleDate: null, anchor: anchor.toISOString(), anchorFromBonus }
    }
    const eligibleDate = new Date(anchor)
    eligibleDate.setMonth(eligibleDate.getMonth() + rule.months)
    const daysUntil = daysBetween(eligibleDate, now)
    return {
      key: meta.key, bankName: meta.name, accounts, lifetime, months: rule.months, note: rule.note,
      eligible: daysUntil <= 0,
      daysUntil: Math.max(0, daysUntil),
      eligibleDate: eligibleDate.toISOString(),
      anchor: anchor.toISOString(),
      anchorFromBonus,
    }
  })

  // Soonest-to-act first: in-cooldown (by days remaining) before already-eligible.
  return rows.sort((a, b) => {
    const ax = a.eligible ? 1 : 0
    const bx = b.eligible ? 1 : 0
    if (ax !== bx) return ax - bx
    return (a.daysUntil ?? 0) - (b.daysUntil ?? 0)
  })
}

export { BANK_RULES, DEFAULT_RULE }
