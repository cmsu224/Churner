export const PLAYERS = [
  { id: 'p1', name: 'Me', role: 'churner', colorClass: 'blue', hex: '#3b82f6' },
  { id: 'p2', name: 'Wife', role: 'churner', colorClass: 'violet', hex: '#8b5cf6' },
  { id: 'p3', name: 'Mom', role: 'senior', colorClass: 'amber', hex: '#f59e0b' },
  { id: 'p4', name: 'Dad', role: 'senior', colorClass: 'green', hex: '#10b981' },
]

export const INITIAL_STATE = {
  version: 1,
  players: PLAYERS,
  creditCards: [],
  bankAccounts: [],
  seniorIncome: {
    p3: { ssMonthly: 0, accessibleSupport: 0 },
    p4: { ssMonthly: 0, accessibleSupport: 0 },
  },
  externalPayments: [],
  taxYear: new Date().getFullYear(),
  settings: {
    taxBracket: 22,
  },
}
