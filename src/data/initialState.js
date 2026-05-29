export const DEFAULT_PLAYERS = [
  { id: 'p1', name: 'Me', role: 'churner', hex: '#3b82f6' },
  { id: 'p2', name: 'Wife', role: 'churner', hex: '#8b5cf6' },
  { id: 'p3', name: 'Mom', role: 'senior', hex: '#f59e0b' },
  { id: 'p4', name: 'Dad', role: 'senior', hex: '#10b981' },
]

export const INITIAL_STATE = {
  version: 2,
  players: DEFAULT_PLAYERS,
  creditCards: [],
  bankAccounts: [],
  seniorIncome: {},
  externalPayments: [],
  taxYear: new Date().getFullYear(),
  settings: { taxBracket: 22 },
}
