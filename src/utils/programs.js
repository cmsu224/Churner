// Loyalty-program presets + normalization for the Points tracker.
// Mirrors issuers.js: maps a free-text program name to canonical metadata
// (display name, category, logo domain, brand color) for grouping and logos.
//
// valueCents = default ¢/pt from Frequent Miler's Reasonable Redemption
// Values (July 2026) — realistic mid-point redemption values, not the
// aspirational maximums some sites publish (U.S. Bank/Discover from
// NerdWallet/WalletHub cash rates). Users can override any of these in
// Settings → Point Valuations; overrides apply app-wide.

export const POINT_PROGRAMS = [
  // Bank / transferable currencies
  { name: 'Chase Ultimate Rewards',    type: 'Bank',    valueCents: 1.5,  domain: 'chase.com',           color: '#117ACA', match: ['ultimate rewards', 'chase ur'] },
  { name: 'Amex Membership Rewards',   type: 'Bank',    valueCents: 1.5,  domain: 'americanexpress.com', color: '#006FCF', match: ['membership rewards', 'amex mr'] },
  { name: 'Citi ThankYou Points',      type: 'Bank',    valueCents: 1.5,  domain: 'citi.com',            color: '#003B70', match: ['thankyou', 'thank you', 'citi typ'] },
  { name: 'Capital One Miles',         type: 'Bank',    valueCents: 1.45, domain: 'capitalone.com',      color: '#004977', match: ['capital one', 'venture miles'] },
  { name: 'Bilt Rewards',              type: 'Bank',    valueCents: 1.55, domain: 'biltrewards.com',     color: '#000000', match: ['bilt'] },
  { name: 'Wells Fargo Rewards',       type: 'Bank',    valueCents: 1.4,  domain: 'wellsfargo.com',      color: '#D71E28', match: ['wells fargo'] },
  { name: 'U.S. Bank Altitude Points', type: 'Bank',    valueCents: 1.0,  domain: 'usbank.com',          color: '#0C2074', match: ['altitude', 'us bank', 'u.s. bank'] },
  { name: 'Discover Cashback',         type: 'Bank',    valueCents: 1.0,  domain: 'discover.com',        color: '#FF6000', match: ['discover'] },
  // Airlines
  { name: 'United MileagePlus',        type: 'Airline', valueCents: 1.3,  domain: 'united.com',          color: '#002244', match: ['united', 'mileageplus'] },
  { name: 'Delta SkyMiles',            type: 'Airline', valueCents: 1.1,  domain: 'delta.com',           color: '#98002E', match: ['delta', 'skymiles'] },
  { name: 'American AAdvantage',       type: 'Airline', valueCents: 1.4,  domain: 'aa.com',              color: '#0078D2', match: ['aadvantage', 'american airlines'] },
  { name: 'Southwest Rapid Rewards',   type: 'Airline', valueCents: 1.3,  domain: 'southwest.com',       color: '#304CB2', match: ['southwest', 'rapid rewards'] },
  { name: 'Alaska Mileage Plan',       type: 'Airline', valueCents: 1.5,  domain: 'alaskaair.com',       color: '#01426A', match: ['alaska', 'mileage plan'] },
  { name: 'JetBlue TrueBlue',          type: 'Airline', valueCents: 1.3,  domain: 'jetblue.com',         color: '#003876', match: ['jetblue', 'trueblue'] },
  // Hotels
  { name: 'Marriott Bonvoy',           type: 'Hotel',   valueCents: 0.77, domain: 'marriott.com',        color: '#A70023', match: ['marriott', 'bonvoy'] },
  { name: 'Hilton Honors',             type: 'Hotel',   valueCents: 0.35, domain: 'hilton.com',          color: '#104C97', match: ['hilton'] },
  { name: 'World of Hyatt',            type: 'Hotel',   valueCents: 1.5,  domain: 'hyatt.com',           color: '#5C2483', match: ['hyatt'] },
  { name: 'IHG One Rewards',           type: 'Hotel',   valueCents: 0.59, domain: 'ihg.com',             color: '#1E1E5A', match: ['ihg'] },
  { name: 'Wyndham Rewards',           type: 'Hotel',   valueCents: 0.67, domain: 'wyndhamhotels.com',   color: '#1F368C', match: ['wyndham'] },
]

export const PROGRAM_TYPES = ['Bank', 'Airline', 'Hotel', 'Other']

const OTHER = { name: null, type: 'Other', domain: null, color: '#52525b' }

// ¢/pt for a program, resolved in priority order:
//   1. the user's custom rate for that program (Settings → Point Valuations,
//      settings.programValueCents keyed by lowercased canonical program name)
//   2. the program's built-in default from published valuations
//   3. the global fallback rate (settings.pointValueCents)
// Rates are GLOBAL per program — there is deliberately no per-card or
// per-balance override, so one number drives the Points page, Dashboard,
// Bonus Pipeline, and Earnings alike.
export function resolvePointValueCents(entry, settings) {
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

// An issuer's own transferable currency, for valuing bank-points cards whose
// name doesn't itself say the program (e.g. "Sapphire Preferred" → Chase UR).
const ISSUER_CURRENCY = {
  chase: 'Chase Ultimate Rewards',
  amex: 'Amex Membership Rewards',
  'american express': 'Amex Membership Rewards',
  citi: 'Citi ThankYou Points',
  citibank: 'Citi ThankYou Points',
  'capital one': 'Capital One Miles',
  bilt: 'Bilt Rewards',
  'wells fargo': 'Wells Fargo Rewards',
  'u.s. bank': 'U.S. Bank Altitude Points',
  'us bank': 'U.S. Bank Altitude Points',
}

// Infer the loyalty program a card earns its points/miles in, so a card bonus
// is valued at the right per-program rate. Co-brand cards carry the program in
// their name ("Hilton Honors Surpass", "United Explorer"), which takes priority;
// otherwise the card is matched to its issuer's transferable currency. Returns
// program metadata (getProgramMeta shape), or Other when nothing matches.
export function getCardProgram(card) {
  const byName = getProgramMeta(card?.cardName)
  if (byName.name && Number(byName.valueCents) > 0) return byName
  const issuer = (card?.issuer ?? '').toLowerCase().trim()
  if (issuer) {
    for (const [key, prog] of Object.entries(ISSUER_CURRENCY)) {
      if (issuer.includes(key)) return getProgramMeta(prog)
    }
  }
  return byName
}
