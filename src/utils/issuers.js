// Issuer normalization + brand metadata.
// Maps a free-text issuer/bank name to a canonical group with a logo domain,
// brand color, and display name. Used for grouping and logos across the app.

const ISSUERS = [
  { key: 'chase',        name: 'Chase',            domain: 'chase.com',          color: '#117ACA', match: ['chase', 'jpmcb', 'jpmorgan', 'jp morgan'] },
  { key: 'amex',         name: 'American Express', domain: 'americanexpress.com', color: '#006FCF', match: ['amex', 'american express'] },
  { key: 'citi',         name: 'Citi',             domain: 'citi.com',           color: '#003B70', match: ['citi', 'citibank', 'citicards', 'home depot', 'best buy'] },
  { key: 'capitalone',   name: 'Capital One',      domain: 'capitalone.com',     color: '#004977', match: ['capital one', 'capitalone'] },
  { key: 'bofa',         name: 'Bank of America',  domain: 'bankofamerica.com',  color: '#E31837', match: ['bank of america', 'bofa', 'boa', 'bankamericard'] },
  { key: 'wellsfargo',   name: 'Wells Fargo',      domain: 'wellsfargo.com',     color: '#D71E28', match: ['wells fargo', 'wells'] },
  { key: 'usbank',       name: 'U.S. Bank',        domain: 'usbank.com',         color: '#0C2074', match: ['us bank', 'u.s. bank', 'usbank'] },
  { key: 'barclays',     name: 'Barclays',         domain: 'barclaycardus.com',  color: '#00AEEF', match: ['barclay'] },
  { key: 'discover',     name: 'Discover',         domain: 'discover.com',       color: '#FF6000', match: ['discover'] },
  { key: 'synchrony',    name: 'Synchrony',        domain: 'synchrony.com',      color: '#D18F00', match: ['synchrony', 'syncb', 'ashley', 'ppc'] },
  { key: 'citizens',     name: 'Citizens',         domain: 'citizensbank.com',   color: '#008548', match: ['citizens'] },
  { key: 'pnc',          name: 'PNC',              domain: 'pnc.com',            color: '#F58025', match: ['pnc'] },
  { key: 'td',           name: 'TD Bank',          domain: 'td.com',             color: '#54B848', match: ['td bank', 'td '] },
  { key: 'truist',       name: 'Truist',           domain: 'truist.com',         color: '#2D1A45', match: ['truist'] },
  { key: 'ally',         name: 'Ally',             domain: 'ally.com',           color: '#6B1A7B', match: ['ally'] },
  { key: 'sofi',         name: 'SoFi',             domain: 'sofi.com',           color: '#00A2C7', match: ['sofi'] },
  { key: 'fidelity',     name: 'Fidelity',         domain: 'fidelity.com',       color: '#368727', match: ['fidelity'] },
  { key: 'schwab',       name: 'Charles Schwab',   domain: 'schwab.com',         color: '#00A0DF', match: ['schwab'] },
  { key: 'navyfederal',  name: 'Navy Federal',     domain: 'navyfederal.org',    color: '#003359', match: ['navy federal', 'navyfed'] },
  { key: 'usaa',         name: 'USAA',             domain: 'usaa.com',           color: '#00263A', match: ['usaa'] },
  { key: 'bilt',         name: 'Bilt',             domain: 'biltrewards.com',    color: '#000000', match: ['bilt'] },
]

const OTHER = { key: 'other', name: 'Other', domain: null, color: '#52525b' }

export function getIssuerMeta(name) {
  const n = (name ?? '').toLowerCase().trim()
  if (!n) return OTHER
  for (const iss of ISSUERS) {
    if (iss.match.some(m => n.includes(m))) return iss
  }
  return OTHER
}

// Stable monogram (1-2 chars) for the logo fallback.
export function monogram(name) {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/[\s/]+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
