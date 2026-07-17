// Loyalty-program presets + normalization for the Points tracker.
// Mirrors issuers.js: maps a free-text program name to canonical metadata
// (display name, category, logo domain, brand color) for grouping and logos.

export const POINT_PROGRAMS = [
  // Bank / transferable currencies
  { name: 'Chase Ultimate Rewards',    type: 'Bank',    domain: 'chase.com',           color: '#117ACA', match: ['ultimate rewards', 'chase ur'] },
  { name: 'Amex Membership Rewards',   type: 'Bank',    domain: 'americanexpress.com', color: '#006FCF', match: ['membership rewards', 'amex mr'] },
  { name: 'Citi ThankYou Points',      type: 'Bank',    domain: 'citi.com',            color: '#003B70', match: ['thankyou', 'thank you', 'citi typ'] },
  { name: 'Capital One Miles',         type: 'Bank',    domain: 'capitalone.com',      color: '#004977', match: ['capital one', 'venture miles'] },
  { name: 'Bilt Rewards',              type: 'Bank',    domain: 'biltrewards.com',     color: '#000000', match: ['bilt'] },
  { name: 'Wells Fargo Rewards',       type: 'Bank',    domain: 'wellsfargo.com',      color: '#D71E28', match: ['wells fargo'] },
  { name: 'U.S. Bank Altitude Points', type: 'Bank',    domain: 'usbank.com',          color: '#0C2074', match: ['altitude', 'us bank', 'u.s. bank'] },
  { name: 'Discover Cashback',         type: 'Bank',    domain: 'discover.com',        color: '#FF6000', match: ['discover'] },
  // Airlines
  { name: 'United MileagePlus',        type: 'Airline', domain: 'united.com',          color: '#002244', match: ['united', 'mileageplus'] },
  { name: 'Delta SkyMiles',            type: 'Airline', domain: 'delta.com',           color: '#98002E', match: ['delta', 'skymiles'] },
  { name: 'American AAdvantage',       type: 'Airline', domain: 'aa.com',              color: '#0078D2', match: ['aadvantage', 'american airlines'] },
  { name: 'Southwest Rapid Rewards',   type: 'Airline', domain: 'southwest.com',       color: '#304CB2', match: ['southwest', 'rapid rewards'] },
  { name: 'Alaska Mileage Plan',       type: 'Airline', domain: 'alaskaair.com',       color: '#01426A', match: ['alaska', 'mileage plan'] },
  { name: 'JetBlue TrueBlue',          type: 'Airline', domain: 'jetblue.com',         color: '#003876', match: ['jetblue', 'trueblue'] },
  // Hotels
  { name: 'Marriott Bonvoy',           type: 'Hotel',   domain: 'marriott.com',        color: '#A70023', match: ['marriott', 'bonvoy'] },
  { name: 'Hilton Honors',             type: 'Hotel',   domain: 'hilton.com',          color: '#104C97', match: ['hilton'] },
  { name: 'World of Hyatt',            type: 'Hotel',   domain: 'hyatt.com',           color: '#5C2483', match: ['hyatt'] },
  { name: 'IHG One Rewards',           type: 'Hotel',   domain: 'ihg.com',             color: '#1E1E5A', match: ['ihg'] },
  { name: 'Wyndham Rewards',           type: 'Hotel',   domain: 'wyndhamhotels.com',   color: '#1F368C', match: ['wyndham'] },
]

export const PROGRAM_TYPES = ['Bank', 'Airline', 'Hotel', 'Other']

const OTHER = { name: null, type: 'Other', domain: null, color: '#52525b' }

// Est. cash value of a points-balance entry: per-program ¢/pt override,
// else the global Settings valuation (settings.pointValueCents).
export function pointsValue(entry, settings) {
  const cents = Number(entry.valueCents) > 0 ? Number(entry.valueCents) : (settings?.pointValueCents ?? 1)
  return (Number(entry.balance) || 0) * cents / 100
}

export function getProgramMeta(name) {
  const n = (name ?? '').toLowerCase().trim()
  if (!n) return OTHER
  for (const p of POINT_PROGRAMS) {
    if (p.name.toLowerCase() === n || p.match.some(m => n.includes(m))) return p
  }
  return { ...OTHER, name: (name ?? '').trim() }
}
