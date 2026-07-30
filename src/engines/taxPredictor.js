// Only bank bonuses are summed — credit-card sign-up bonuses are purchase
// rebates in the IRS's eyes, so they never enter the tax picture at all.

// Statuses that put an account past the bonus stage — the same list the
// Earnings engine uses, so both pages agree on what "received" means.
const RECEIVED_STATUSES = ['Bonus Received', 'Cooling Period', 'Safe to Close', 'Closed']

// A bank bonus counts as received the way the rest of the app decides it: an
// explicit received date, the bonusReceived flag, or a status past the bonus
// stage. The account form only ever writes the DATE and the STATUS, so gating
// on the flag alone left this page reading $0 with bonuses plainly recorded.
export function isBankBonusReceived(acct) {
  return !!acct?.bonusReceivedDate
    || !!acct?.bonusReceived
    || RECEIVED_STATUSES.includes(acct?.status ?? '')
}

// Bank bonuses are ordinary interest income unless the user explicitly unticks
// the 1099-INT box, so an account with no flag stored still counts.
export function isBankBonusTaxable(acct) {
  return acct?.isTaxable !== false
}

// Calendar year of a stored 'YYYY-MM-DD' date, read off the string so the
// answer doesn't shift with the viewer's timezone.
function yearOf(date) {
  const y = Number(String(date).slice(0, 4))
  return Number.isFinite(y) ? y : null
}

// Taxable bank-bonus income for one year, per member, plus the accounts behind
// each number and the ones that couldn't be counted (so nothing goes missing
// silently). `undated` = received but with no received date, so the app can't
// tell which tax year it belongs to; `otherYears` = counted in a different year.
export function getTaxSummary(bankAccounts, members, taxYear) {
  const year = taxYear ?? new Date().getFullYear()
  const byMember = {}
  for (const p of (members ?? [])) {
    byMember[p.id] = { memberId: p.id, memberName: p.name, bankBonuses: 0, accounts: [] }
  }
  // Bonuses on accounts whose member was deleted still owe tax — bucket them
  // rather than dropping them out of the household total.
  const orphans = { memberId: '__unassigned', memberName: 'Unassigned', bankBonuses: 0, accounts: [] }
  const undated = []
  const untaxed = []
  const otherYears = []

  for (const acct of (bankAccounts ?? [])) {
    const amount = Number(acct.bonusAmount) || 0
    if (!(amount > 0)) continue
    if (!isBankBonusReceived(acct)) continue
    const entry = { id: acct.id, memberId: acct.memberId, bankName: acct.bankName, last4: acct.last4, amount, date: acct.bonusReceivedDate ?? null }
    if (!isBankBonusTaxable(acct)) { untaxed.push(entry); continue }
    if (!acct.bonusReceivedDate) { undated.push(entry); continue }
    if (yearOf(acct.bonusReceivedDate) !== year) { otherYears.push(entry); continue }
    const row = byMember[acct.memberId] ?? orphans
    row.bankBonuses += amount
    row.accounts.push(entry)
  }

  const rows = [...Object.values(byMember), ...(orphans.accounts.length ? [orphans] : [])]
  const totals = rows.reduce((acc, r) => ({
    bankBonuses: acc.bankBonuses + r.bankBonuses,
  }), { bankBonuses: 0 })
  return { rows, totals, year, undated, untaxed, otherYears }
}

// Every year that has taxable bank-bonus income recorded, newest first, so the
// Tax page can offer them (plus the current year) as choices. Without this the
// stored tax year silently hides a whole year of bonuses.
export function getTaxYears(bankAccounts) {
  const years = new Set([new Date().getFullYear()])
  for (const acct of (bankAccounts ?? [])) {
    if (!(Number(acct.bonusAmount) > 0)) continue
    if (!acct.bonusReceivedDate || !isBankBonusReceived(acct) || !isBankBonusTaxable(acct)) continue
    const y = yearOf(acct.bonusReceivedDate)
    if (y) years.add(y)
  }
  return [...years].sort((a, b) => b - a)
}
