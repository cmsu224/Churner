// Loyalty-program presets + normalization for the Points tracker.
// Mirrors issuers.js: maps a free-text program name to canonical metadata
// (display name, category, logo domain, brand color) for grouping and logos.
//
// valueCents = default ¢/pt from published valuations (The Points Guy
// July 2026 where available; NerdWallet/Frequent Miler for the gaps).
// Users can override any of these in Settings → Point Valuations.

export const POINT_PROGRAMS = [
  // Bank / transferable currencies
  { name: 'Chase Ultimate Rewards',    type: 'Bank',    valueCents: 2.05, domain: 'chase.com',           color: '#117ACA', match: ['ultimate rewards', 'chase ur'] },
  { name: 'Amex Membership Rewards',   type: 'Bank',    valueCents: 2.0,  domain: 'americanexpress.com', color: '#006FCF', match: ['membership rewards', 'amex mr'] },
  { name: 'Citi ThankYou Points',      type: 'Bank',    valueCents: 1.9,  domain: 'citi.com',            color: '#003B70', match: ['thankyou', 'thank you', 'citi typ'] },
  { name: 'Capital One Miles',         type: 'Bank',    valueCents: 1.85, domain: 'capitalone.com',      color: '#004977', match: ['capital one', 'venture miles'] },
  { name: 'Bilt Rewards',              type: 'Bank',    valueCents: 2.2,  domain: 'biltrewards.com',     color: '#000000', match: ['bilt'] },
  { name: 'Wells Fargo Rewards',       type: 'Bank',    valueCents: 1.5,  domain: 'wellsfargo.com',      color: '#D71E28', match: ['wells fargo'] },
  { name: 'U.S. Bank Altitude Points', type: 'Bank',    valueCents: 1.5,  domain: 'usbank.com',          color: '#0C2074', match: ['altitude', 'us bank', 'u.s. bank'] },
  { name: 'Discover Cashback',         type: 'Bank',    valueCents: 1.0,  domain: 'discover.com',        color: '#FF6000', match: ['discover'] },
  // Airlines
  { name: 'United MileagePlus',        type: 'Airline', valueCents: 1.4,  domain: 'united.com',          color: '#002244', match: ['united', 'mileageplus'] },
  { name: 'Delta SkyMiles',            type: 'Airline', valueCents: 1.2,  domain: 'delta.com',           color: '#98002E', match: ['delta', 'skymiles'] },
  { name: 'American AAdvantage',       type: 'Airline', valueCents: 1.6,  domain: 'aa.com',              color: '#0078D2', match: ['aadvantage', 'american airlines'] },
  { name: 'Southwest Rapid Rewards',   type: 'Airline', valueCents: 1.3,  domain: 'southwest.com',       color: '#304CB2', match: ['southwest', 'rapid rewards'] },
  { name: 'Alaska Mileage Plan',       type: 'Airline', valueCents: 1.55, domain: 'alaskaair.com',       color: '#01426A', match: ['alaska', 'mileage plan'] },
  { name: 'JetBlue TrueBlue',          type: 'Airline', valueCents: 1.3,  domain: 'jetblue.com',         color: '#003876', match: ['jetblue', 'trueblue'] },
  // Hotels
  { name: 'Marriott Bonvoy',           type: 'Hotel',   valueCents: 0.8,  domain: 'marriott.com',        color: '#A70023', match: ['marriott', 'bonvoy'] },
  { name: 'Hilton Honors',             type: 'Hotel',   valueCents: 0.5,  domain: 'hilton.com',          color: '#104C97', match: ['hilton'] },
  { name: 'World of Hyatt',            type: 'Hotel',   valueCents: 1.6,  domain: 'hyatt.com',           color: '#5C2483', match: ['hyatt'] },
  { name: 'IHG One Rewards',           type: 'Hotel',   valueCents: 0.6,  domain: 'ihg.com',             color: '#1E1E5A', match: ['ihg'] },
  { name: 'Wyndham Rewards',           type: 'Hotel',   valueCents: 0.7,  domain: 'wyndhamhotels.com',   color: '#1F368C', match: ['wyndham'] },
]

export const PROGRAM_TYPES = ['Bank', 'Airline', 'Hotel', 'Other']

const OTHER = { name: null, type: 'Other', domain: null, color: '#52525b' }

// ¢/pt for a points-balance entry, resolved in priority order:
//   1. the entry's own valueCents override
//   2. the user's custom rate for that program (Settings → Point Valuations,
//      settings.programValueCents keyed by lowercased canonical program name)
//   3. the program's built-in default from published valuations
//   4. the global Settings rate (settings.pointValueCents)
export function resolvePointValueCents(entry, settings) {
  if (Number(entry?.valueCents) > 0) return Number(entry.valueCents)
  const meta = getProgramMeta(entry?.program)
  const key = (meta.name ?? entry?.program ?? '').toLowerCase().trim()
  const custom = settings?.programValueCents?.[key]
  if (Number(custom) > 0) return Number(custom)
  if (Number(meta.valueCents) > 0) return Number(meta.valueCents)
  return settings?.pointValueCents ?? 1
}

// Est. cash value of a points-balance entry.
export function pointsValue(entry, settings) {
  return (Number(entry.balance) || 0) * resolvePointValueCents(entry, settings) / 100
}

export function getProgramMeta(name) {
  const n = (name ?? '').toLowerCase().trim()
  if (!n) return OTHER
  for (const p of POINT_PROGRAMS) {
    if (p.name.toLowerCase() === n || p.match.some(m => n.includes(m))) return p
  }
  return { ...OTHER, name: (name ?? '').trim() }
}
