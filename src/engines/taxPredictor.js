export function getTaxSummary(bankAccounts, players, taxYear) {
  const year = taxYear ?? new Date().getFullYear()
  const byPlayer = {}
  for (const p of (players ?? [])) {
    byPlayer[p.id] = { playerId: p.id, playerName: p.name, bankBonuses: 0, ccBonuses: 0 }
  }
  for (const acct of (bankAccounts ?? [])) {
    if (!acct.bonusReceived || !acct.bonusReceivedDate) continue
    if (new Date(acct.bonusReceivedDate).getFullYear() !== year) continue
    if (!byPlayer[acct.playerId]) continue
    byPlayer[acct.playerId].bankBonuses += (acct.bonusAmount ?? 0)
  }
  const rows = Object.values(byPlayer)
  const totals = rows.reduce((acc, r) => ({
    bankBonuses: acc.bankBonuses + r.bankBonuses,
    ccBonuses: 0,
  }), { bankBonuses: 0, ccBonuses: 0 })
  return { rows, totals, year }
}
