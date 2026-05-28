export function getSeniorIncomeReport(seniorIncome) {
  const safe = seniorIncome ?? {}
  const calc = (entry) => {
    const monthly = entry?.ssMonthly ?? 0
    const support = entry?.accessibleSupport ?? 0
    return {
      ssMonthly: monthly,
      annualSS: monthly * 12,
      supportMonthly: support,
      annualSupport: support * 12,
      totalAccessibleIncome: (monthly + support) * 12,
    }
  }
  const mom = calc(safe.p3)
  const dad = calc(safe.p4)
  const combinedHousehold = mom.totalAccessibleIncome + dad.totalAccessibleIncome
  return { mom, dad, combinedHousehold }
}
