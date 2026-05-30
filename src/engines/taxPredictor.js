export function getTaxSummary(bankAccounts, members, taxYear) {
  const year = taxYear ?? new Date().getFullYear()
  const byMember = {}
  for (const p of (members ?? [])) {
    byMember[p.id] = { memberId: p.id, memberName: p.name, bankBonuses: 0, ccBonuses: 0 }
  }
  for (const acct of (bankAccounts ?? [])) {
    if (!acct.bonusReceived || !acct.bonusReceivedDate) continue
    if (new Date(acct.bonusReceivedDate).getFullYear() !== year) continue
    if (!byMember[acct.memberId]) continue
    byMember[acct.memberId].bankBonuses += (acct.bonusAmount ?? 0)
  }
  const rows = Object.values(byMember)
  const totals = rows.reduce((acc, r) => ({
    bankBonuses: acc.bankBonuses + r.bankBonuses,
    ccBonuses: 0,
  }), { bankBonuses: 0, ccBonuses: 0 })
  return { rows, totals, year }
}
