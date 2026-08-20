// Bank bonus eligibility.
//
// A bank's new-account bonus is gated by three different things, and this file
// is the single source of truth for all three:
//
//   months — the cooldown before the SAME bank pays a new-account bonus again.
//            0 means "once per lifetime" (not repeatable).
//   basis  — WHAT the cooldown counts from. This is the part offer terms
//            actually disagree on, and getting it wrong moves the date by
//            months: some banks measure from the day your last bonus posted,
//            others from the day you CLOSED the account, others from the day
//            you last opened one.
//   chex   — how the bank treats your ChexSystems file. Banks that deny for
//            too many recent inquiries ('sensitive') are the ones worth
//            pacing your applications around; see engines/chexSystems.js.
//
// These are common, widely-cited community values — banks change them often,
// so treat them as guidance and verify current terms on DoctorofCredit before
// applying. A bank with no entry here falls through to DEFAULT_RULE rather
// than getting a made-up window: a conservative 24 months, flagged as such.

import { getIssuerMeta, getIssuerName } from '../utils/issuers'
import { parseDay, startOfToday, daysBetweenDays } from '../utils/format'

// basis values, and what each one means for the anchor date:
//   'bonus' — "you have not received a bonus from us in the past N months"
//             (the most common offer language). Counts from the bonus date.
//   'close' — "no open OR closed account with us in the past N months".
//             Counts from the day the account closed, which is why these
//             banks are the ones that check ChexSystems: closed accounts stay
//             on your Chex file for five years, so they can see it.
//   'open'  — "new customers only / no account opened in the past N months".
//             Counts from the last opening, whether or not a bonus posted.
export const BASIS_LABEL = {
  bonus: 'last bonus',
  close: 'account closing',
  open:  'account opening',
}

// What the anchor date on a row actually IS. A 'close'-basis bank whose
// account is still open has no closing date to count from, so the fallback
// chain lands on the opening — and the UI has to say "opened", not "closed",
// or the date reads as something it isn't.
export const ANCHOR_SHORT = {
  bonus: 'bonus',
  close: 'closed',
  open:  'opened',
}

// chex values:
//   'sensitive' — known to deny over recent ChexSystems inquiries or a busy
//                 file. Pace your applications; these are the ones the
//                 inquiry counter is really about.
//   'standard'  — pulls ChexSystems (so opening here costs an inquiry) but is
//                 generally relaxed about how many you already have.
//   'none'      — typically no ChexSystems inquiry at all: brokerage and
//                 cash-management accounts, or a bank using another bureau.
export const CHEX_LABEL = {
  sensitive: 'Chex-sensitive',
  standard:  'Pulls ChexSystems',
  none:      'No ChexSystems pull',
}

const BANK_RULES = {
  chase:       { months: 24, basis: 'bonus', chex: 'sensitive', note: 'Chase: ~24 months since your last checking/savings bonus. Chex-sensitive — too many recent inquiries draws a denial on its own.' },
  citi:        { months: 24, basis: 'close', chex: 'sensitive', note: 'Citi: roughly once per 24 months per bonus, and most offers also require no open OR closed Citi account in the prior 6 months — so the clock runs from closing.' },
  bofa:        { months: 24, basis: 'bonus', chex: 'standard',  note: 'Bank of America: typically once per 24 months (some offers are once per lifetime).' },
  wellsfargo:  { months: 12, basis: 'bonus', chex: 'standard',  note: 'Wells Fargo: about once every 12 months.' },
  usbank:      { months: 24, basis: 'close', chex: 'sensitive', note: 'U.S. Bank: roughly once per 24 months, measured from closing. Chex-sensitive.' },
  capitalone:  { months: 12, basis: 'close', chex: 'standard',  note: 'Capital One: generally not eligible while you hold — or recently held — the account; ~12 months from closing.' },
  pnc:         { months: 24, basis: 'close', chex: 'sensitive', note: 'PNC: about once per 24 months, and current/recent customers are excluded. Chex-sensitive.' },
  td:          { months: 12, basis: 'close', chex: 'sensitive', note: 'TD Bank: about once per 12 months. Chex-sensitive.' },
  citizens:    { months: 24, basis: 'close', chex: 'sensitive', note: 'Citizens: about once per 24 months from closing.' },
  truist:      { months: 24, basis: 'close', chex: 'sensitive', note: 'Truist: about once per 24 months, excluding current and recent customers.' },
  discover:    { months: 0,  basis: 'bonus', chex: 'standard',  note: 'Discover: bank bonus is once per lifetime.' },
  sofi:        { months: 0,  basis: 'bonus', chex: 'standard',  note: 'SoFi: new-member bonus is generally once per lifetime.' },
  ally:        { months: 12, basis: 'bonus', chex: 'standard',  note: 'Ally: bonuses are occasional/targeted; ~12 months when offered. Relaxed about inquiries.' },
  fidelity:    { months: 24, basis: 'bonus', chex: 'none',      note: 'Fidelity: about once per 24 months. Brokerage/cash-management account — normally no ChexSystems inquiry.' },
  schwab:      { months: 24, basis: 'bonus', chex: 'none',      note: 'Charles Schwab: about once per 24 months. Brokerage-linked checking — normally no ChexSystems inquiry.' },
  navyfederal: { months: 24, basis: 'bonus', chex: 'standard',  note: 'Navy Federal: about once per 24 months.' },
  usaa:        { months: 24, basis: 'bonus', chex: 'standard',  note: 'USAA: about once per 24 months.' },
  bilt:        { months: 12, basis: 'bonus', chex: 'standard',  note: 'Bilt: varies; ~12 months.' },
  huntington:  { months: 12, basis: 'close', chex: 'sensitive', note: 'Huntington: no Huntington checking open or closed in the prior ~12 months. Notably Chex-sensitive.' },
  fifththird:  { months: 12, basis: 'close', chex: 'sensitive', note: 'Fifth Third: about once per 12 months from closing. Chex-sensitive.' },
  mandt:       { months: 24, basis: 'close', chex: 'sensitive', note: 'M&T: about once per 24 months from closing. Chex-sensitive.' },
  keybank:     { months: 12, basis: 'close', chex: 'sensitive', note: 'KeyBank: about once per 12 months from closing.' },
  santander:   { months: 12, basis: 'close', chex: 'sensitive', note: 'Santander: about once per 12 months, excluding recent customers. Chex-sensitive.' },
  bmo:         { months: 12, basis: 'close', chex: 'sensitive', note: 'BMO: about once per 12 months from closing. Chex-sensitive.' },
  regions:     { months: 12, basis: 'close', chex: 'standard',  note: 'Regions: typically no Regions checking in the prior ~12 months.' },
}

export const DEFAULT_RULE = {
  months: 24,
  basis: 'bonus',
  chex: 'standard',
  fallback: true,
  note: 'No specific rule on file — using a conservative 24-month estimate and assuming a ChexSystems pull. Verify on DoctorofCredit.',
}

// The rule for a free-text bank name, always resolved through the same issuer
// normalization the rest of the app uses ("Chase Bank" → chase).
export function getBankRule(bankName) {
  const meta = getIssuerMeta(bankName)
  return BANK_RULES[meta.key] ?? DEFAULT_RULE
}

// Every bank with a rule on file, for the reference table on the Eligibility
// page. Sorted by display name.
export function getBankRuleList() {
  return Object.entries(BANK_RULES)
    .map(([key, rule]) => ({ key, name: getIssuerName(key), ...rule }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Which date one account's cooldown counts from, per its bank's basis.
//
// Each basis has a fallback chain, because an account logged from memory
// rarely has every date: a 'close'-basis bank with no closed date still gets a
// clock off the bonus (or opening) rather than silently having none. `from`
// says which date was actually used, so the UI can be honest about it.
export function getBonusAnchor(account, rule) {
  const dates = {
    bonus: parseDay(account?.bonusReceivedDate),
    close: parseDay(account?.closedDate),
    open:  parseDay(account?.openedDate),
  }
  const chains = {
    bonus: ['bonus', 'open', 'close'],
    close: ['close', 'bonus', 'open'],
    open:  ['open', 'bonus', 'close'],
  }
  const chain = chains[rule?.basis] ?? chains.bonus
  for (const from of chain) {
    if (dates[from]) return { date: dates[from], from, exact: from === (rule?.basis ?? 'bonus') }
  }
  return { date: null, from: null, exact: false }
}

// One eligibility row per bank the member has touched.
export function getBankEligibility(memberId, allBankAccounts) {
  const accounts = (allBankAccounts ?? []).filter(a => a.memberId === memberId)
  const byBank = {}

  for (const acct of accounts) {
    const meta = getIssuerMeta(acct.bankName)
    const key = meta.key
    const rule = BANK_RULES[key] ?? DEFAULT_RULE
    if (!byBank[key]) byBank[key] = { meta, rule, anchor: null, anchorFrom: null, accounts: 0, stillOpen: false }
    byBank[key].accounts++
    if (acct.status !== 'Closed') byBank[key].stillOpen = true
    // Latest anchor across the member's accounts at this bank — that's the one
    // whose cooldown actually binds.
    const { date, from } = getBonusAnchor(acct, rule)
    if (date && (!byBank[key].anchor || date > byBank[key].anchor)) {
      byBank[key].anchor = date
      byBank[key].anchorFrom = from
    }
  }

  const today = startOfToday()
  const rows = Object.values(byBank).map(({ meta, rule, anchor, anchorFrom, accounts, stillOpen }) => {
    const lifetime = rule.months === 0
    const base = {
      key: meta.key,
      bankName: meta.name,
      accounts,
      stillOpen,
      lifetime,
      months: rule.months,
      basis: rule.basis ?? 'bonus',
      chex: rule.chex ?? 'standard',
      fallbackRule: !!rule.fallback,
      note: rule.note,
      anchor: anchor ? anchor.toISOString() : null,
      anchorFrom,
      // Kept for older callers that only asked "was this anchored on a bonus?"
      anchorFromBonus: anchorFrom === 'bonus',
    }

    if (!anchor) return { ...base, eligible: !stillOpen, daysUntil: 0, eligibleDate: null }
    if (lifetime) return { ...base, eligible: false, daysUntil: null, eligibleDate: null }

    const eligibleDate = new Date(anchor)
    eligibleDate.setMonth(eligibleDate.getMonth() + rule.months)
    const daysUntil = daysBetweenDays(today, eligibleDate)
    return {
      ...base,
      // A current customer is never eligible for a new-customer bonus, however
      // the date math comes out.
      eligible: daysUntil <= 0 && !stillOpen,
      daysUntil: Math.max(0, daysUntil),
      eligibleDate: eligibleDate.toISOString(),
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

export { BANK_RULES }
