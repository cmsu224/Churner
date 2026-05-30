// Per-card-product sign-up bonus re-eligibility windows.
//
// 'family' groups products whose bonus windows are SHARED. The only major
// shared-window case is Chase Sapphire: receiving a bonus on Preferred or
// Reserve starts the same 48-month clock for both products. All other cards
// have their own independent clock, so family === key for those.
//
// months: 0 means once-per-lifetime (Amex's standard language for personal cards).
// Patterns are matched case-insensitively against cardName; longer/more-specific
// patterns must come BEFORE shorter ones to avoid false matches.

const CARD_RULES = [
  // ── Chase ──────────────────────────────────────────────────────────────────
  // Sapphire: Preferred and Reserve share the 48-month window.
  { key: 'csp',           family: 'sapphire',       issuerHint: 'chase',        months: 48, label: 'Sapphire Preferred',          patterns: ['sapphire preferred'] },
  { key: 'csr',           family: 'sapphire',       issuerHint: 'chase',        months: 48, label: 'Sapphire Reserve',             patterns: ['sapphire reserve'] },
  // Freedom products each have their own 24-month clock.
  { key: 'cff',           family: 'cff',            issuerHint: 'chase',        months: 24, label: 'Freedom Flex',                patterns: ['freedom flex'] },
  { key: 'cfu',           family: 'cfu',            issuerHint: 'chase',        months: 24, label: 'Freedom Unlimited',           patterns: ['freedom unlimited'] },
  { key: 'cf',            family: 'cf',             issuerHint: 'chase',        months: 24, label: 'Freedom',                     patterns: ['freedom rise', 'freedom student', 'freedom'] },
  // Ink
  { key: 'cip',           family: 'cip',            issuerHint: 'chase',        months: 24, label: 'Ink Business Preferred',      patterns: ['ink business preferred', 'ink preferred'] },
  { key: 'cic',           family: 'cic',            issuerHint: 'chase',        months: 24, label: 'Ink Business Cash',           patterns: ['ink business cash', 'ink cash'] },
  { key: 'ciu',           family: 'ciu',            issuerHint: 'chase',        months: 24, label: 'Ink Business Unlimited',      patterns: ['ink business unlimited', 'ink unlimited'] },
  // Co-brands
  { key: 'chase_united',  family: 'chase_united',   issuerHint: 'chase',        months: 24, label: 'United',                     patterns: ['united explorer', 'united quest', 'united club', 'united gateway', 'united mileageplus'] },
  { key: 'chase_sw',      family: 'chase_sw',       issuerHint: 'chase',        months: 24, label: 'Southwest Rapid Rewards',    patterns: ['southwest priority', 'southwest premier', 'southwest plus', 'rapid rewards', 'southwest'] },
  { key: 'chase_hyatt',   family: 'chase_hyatt',    issuerHint: 'chase',        months: 24, label: 'World of Hyatt',             patterns: ['world of hyatt', 'hyatt'] },
  { key: 'chase_mar_bb',  family: 'chase_mar_bb',   issuerHint: 'chase',        months: 24, label: 'Marriott Bonvoy Boundless',  patterns: ['bonvoy boundless', 'marriott boundless'] },
  { key: 'chase_mar_bold',family: 'chase_mar_bold', issuerHint: 'chase',        months: 24, label: 'Marriott Bonvoy Bold',       patterns: ['bonvoy bold', 'marriott bold'] },
  { key: 'chase_ihg',     family: 'chase_ihg',      issuerHint: 'chase',        months: 24, label: 'IHG One Rewards',            patterns: ['ihg one rewards', 'ihg rewards premier', 'ihg'] },
  { key: 'chase_amzn',    family: 'chase_amzn',     issuerHint: 'chase',        months: 24, label: 'Amazon Prime Visa',          patterns: ['amazon prime visa', 'prime visa', 'amazon prime'] },
  { key: 'chase_dis',     family: 'chase_dis',      issuerHint: 'chase',        months: 24, label: 'Disney Premier Visa',        patterns: ['disney premier', 'disney visa'] },
  { key: 'chase_ba',      family: 'chase_ba',       issuerHint: 'chase',        months: 24, label: 'British Airways',            patterns: ['british airways'] },
  { key: 'chase_iberia',  family: 'chase_iberia',   issuerHint: 'chase',        months: 24, label: 'Iberia Plus',                patterns: ['iberia plus', 'iberia'] },
  { key: 'chase_starhub', family: 'chase_starhub',  issuerHint: 'chase',        months: 24, label: 'Aeroplan',                   patterns: ['aeroplan'] },

  // ── Amex personal — each product has its own independent lifetime clock ───
  { key: 'amex_plat',     family: 'amex_plat',      issuerHint: 'amex',         months: 0,  label: 'Amex Platinum',              patterns: ['the platinum card', 'amex platinum', 'platinum card'] },
  { key: 'amex_gold',     family: 'amex_gold',      issuerHint: 'amex',         months: 0,  label: 'Amex Gold',                  patterns: ['american express gold', 'amex gold', 'gold card'] },
  { key: 'amex_green',    family: 'amex_green',     issuerHint: 'amex',         months: 0,  label: 'Amex Green',                 patterns: ['american express green', 'amex green', 'green card'] },
  { key: 'amex_bcp',      family: 'amex_bcp',       issuerHint: 'amex',         months: 0,  label: 'Blue Cash Preferred',        patterns: ['blue cash preferred'] },
  { key: 'amex_bce',      family: 'amex_bce',       issuerHint: 'amex',         months: 0,  label: 'Blue Cash Everyday',         patterns: ['blue cash everyday'] },
  { key: 'amex_everyday_p', family: 'amex_everyday_p', issuerHint: 'amex',      months: 0,  label: 'EveryDay Preferred',         patterns: ['everyday preferred'] },
  { key: 'amex_everyday', family: 'amex_everyday',  issuerHint: 'amex',         months: 0,  label: 'EveryDay',                   patterns: ['amex everyday'] },
  { key: 'amex_delta_r',  family: 'amex_delta_r',   issuerHint: 'amex',         months: 0,  label: 'Delta SkyMiles Reserve',     patterns: ['delta skymiles reserve', 'delta reserve'] },
  { key: 'amex_delta_p',  family: 'amex_delta_p',   issuerHint: 'amex',         months: 0,  label: 'Delta SkyMiles Platinum',   patterns: ['delta skymiles platinum', 'delta platinum'] },
  { key: 'amex_delta_g',  family: 'amex_delta_g',   issuerHint: 'amex',         months: 0,  label: 'Delta SkyMiles Gold',        patterns: ['delta skymiles gold', 'delta gold'] },
  { key: 'amex_delta_b',  family: 'amex_delta_b',   issuerHint: 'amex',         months: 0,  label: 'Delta SkyMiles Blue',        patterns: ['delta skymiles blue', 'delta blue'] },
  { key: 'amex_hilton_a', family: 'amex_hilton_a',  issuerHint: 'amex',         months: 0,  label: 'Hilton Honors Aspire',       patterns: ['hilton honors aspire', 'hilton aspire'] },
  { key: 'amex_hilton_s', family: 'amex_hilton_s',  issuerHint: 'amex',         months: 0,  label: 'Hilton Honors Surpass',      patterns: ['hilton honors surpass', 'hilton surpass'] },
  { key: 'amex_hilton',   family: 'amex_hilton',    issuerHint: 'amex',         months: 0,  label: 'Hilton Honors',              patterns: ['hilton honors amex', 'hilton honors'] },
  { key: 'amex_mar_bril', family: 'amex_mar_bril',  issuerHint: 'amex',         months: 0,  label: 'Marriott Bonvoy Brilliant',  patterns: ['bonvoy brilliant', 'marriott brilliant'] },
  { key: 'amex_hawthorn', family: 'amex_hawthorn',  issuerHint: 'amex',         months: 0,  label: 'Marriott Bonvoy Bevy',       patterns: ['bonvoy bevy', 'marriott bevy'] },
  // Amex business
  { key: 'amex_biz_plat', family: 'amex_biz_plat',  issuerHint: 'amex',         months: 0,  label: 'Amex Business Platinum',     patterns: ['business platinum'] },
  { key: 'amex_biz_gold', family: 'amex_biz_gold',  issuerHint: 'amex',         months: 0,  label: 'Amex Business Gold',         patterns: ['business gold'] },
  { key: 'amex_bbplus',   family: 'amex_bbplus',    issuerHint: 'amex',         months: 0,  label: 'Blue Business Plus',         patterns: ['blue business plus'] },
  { key: 'amex_bbcash',   family: 'amex_bbcash',    issuerHint: 'amex',         months: 0,  label: 'Blue Business Cash',         patterns: ['blue business cash'] },
  { key: 'amex_biz_delta_r', family: 'amex_biz_delta_r', issuerHint: 'amex',   months: 0,  label: 'Delta Biz Reserve',          patterns: ['delta reserve business', 'delta biz reserve'] },
  { key: 'amex_biz_delta_p', family: 'amex_biz_delta_p', issuerHint: 'amex',   months: 0,  label: 'Delta Biz Platinum',         patterns: ['delta platinum business', 'delta biz platinum'] },
  { key: 'amex_biz_delta_g', family: 'amex_biz_delta_g', issuerHint: 'amex',   months: 0,  label: 'Delta Biz Gold',             patterns: ['delta gold business', 'delta biz gold'] },

  // ── Citi ───────────────────────────────────────────────────────────────────
  // ThankYou family: 48-month rule per product (Strata/Premier not shared with each other)
  { key: 'citi_strata',   family: 'citi_strata',    issuerHint: 'citi',         months: 48, label: 'Citi Strata Premier',        patterns: ['strata premier'] },
  { key: 'citi_premier',  family: 'citi_premier',   issuerHint: 'citi',         months: 48, label: 'Citi Premier',               patterns: ['citi premier', 'thankyou premier'] },
  { key: 'citi_double',   family: 'citi_double',    issuerHint: 'citi',         months: 48, label: 'Citi Double Cash',           patterns: ['double cash'] },
  { key: 'citi_custom',   family: 'citi_custom',    issuerHint: 'citi',         months: 48, label: 'Citi Custom Cash',           patterns: ['custom cash'] },
  { key: 'citi_aadv_ex',  family: 'citi_aadv_ex',  issuerHint: 'citi',         months: 48, label: 'Citi AAdvantage Executive',  patterns: ['aadvantage executive'] },
  { key: 'citi_aadv_plat',family: 'citi_aadv_plat',issuerHint: 'citi',         months: 48, label: 'Citi AAdvantage Platinum',   patterns: ['aadvantage platinum select', 'aadvantage platinum'] },
  { key: 'citi_aadv',     family: 'citi_aadv',     issuerHint: 'citi',         months: 48, label: 'Citi AAdvantage',            patterns: ['aadvantage'] },

  // ── Capital One ────────────────────────────────────────────────────────────
  { key: 'co_venture_x',  family: 'co_venture_x',   issuerHint: 'capital one',  months: 12, label: 'Venture X',                  patterns: ['venture x'] },
  { key: 'co_venture',    family: 'co_venture',     issuerHint: 'capital one',  months: 24, label: 'Venture / VentureOne',       patterns: ['venture rewards', 'ventureone', 'venture'] },
  { key: 'co_savor',      family: 'co_savor',       issuerHint: 'capital one',  months: 24, label: 'Savor / SavorOne',           patterns: ['savor rewards', 'savorone', 'savor'] },
  { key: 'co_spark',      family: 'co_spark',       issuerHint: 'capital one',  months: 24, label: 'Spark Business',             patterns: ['spark cash plus', 'spark miles', 'spark cash', 'spark'] },

  // ── Bank of America ────────────────────────────────────────────────────────
  { key: 'bofa_prem',     family: 'bofa_prem',      issuerHint: 'bank of america', months: 24, label: 'Premium Rewards',        patterns: ['premium rewards elite', 'premium rewards'] },
  { key: 'bofa_travel',   family: 'bofa_travel',    issuerHint: 'bank of america', months: 24, label: 'Travel Rewards',         patterns: ['travel rewards'] },
  { key: 'bofa_custom',   family: 'bofa_custom',    issuerHint: 'bank of america', months: 24, label: 'Customized Cash Rewards', patterns: ['customized cash'] },
  { key: 'bofa_unlim',    family: 'bofa_unlim',     issuerHint: 'bank of america', months: 24, label: 'Unlimited Cash Rewards',  patterns: ['unlimited cash'] },
  { key: 'bofa_alaska',   family: 'bofa_alaska',    issuerHint: 'bank of america', months: 24, label: 'Alaska Airlines Visa',   patterns: ['alaska airlines visa', 'alaska airlines'] },

  // ── US Bank ────────────────────────────────────────────────────────────────
  { key: 'usb_altitude_r',family: 'usb_altitude_r', issuerHint: 'us bank',      months: 24, label: 'Altitude Reserve',          patterns: ['altitude reserve'] },
  { key: 'usb_altitude_c',family: 'usb_altitude_c', issuerHint: 'us bank',      months: 24, label: 'Altitude Connect / Go',     patterns: ['altitude connect', 'altitude go'] },
  { key: 'usb_cash_plus', family: 'usb_cash_plus',  issuerHint: 'us bank',      months: 24, label: 'Cash+',                     patterns: ['cash+ visa', 'cash+'] },
  { key: 'usb_shopper',   family: 'usb_shopper',    issuerHint: 'us bank',      months: 24, label: 'Shopper Cash Rewards',      patterns: ['shopper cash'] },

  // ── Wells Fargo ────────────────────────────────────────────────────────────
  { key: 'wf_active',     family: 'wf_active',      issuerHint: 'wells fargo',  months: 12, label: 'Active Cash',               patterns: ['active cash'] },
  { key: 'wf_autograph_j',family: 'wf_autograph_j', issuerHint: 'wells fargo',  months: 12, label: 'Autograph Journey',         patterns: ['autograph journey'] },
  { key: 'wf_autograph',  family: 'wf_autograph',   issuerHint: 'wells fargo',  months: 12, label: 'Autograph',                 patterns: ['autograph'] },

  // ── Barclays ───────────────────────────────────────────────────────────────
  { key: 'barc_aviator_s',family: 'barc_aviator_s', issuerHint: 'barclays',     months: 24, label: 'AAdvantage Aviator Silver', patterns: ['aviator silver'] },
  { key: 'barc_aviator_r',family: 'barc_aviator_r', issuerHint: 'barclays',     months: 24, label: 'AAdvantage Aviator Red',    patterns: ['aviator red', 'aviator'] },
  { key: 'barc_jetblue',  family: 'barc_jetblue',   issuerHint: 'barclays',     months: 24, label: 'JetBlue Plus / Business',   patterns: ['jetblue plus', 'jetblue business', 'jetblue'] },
  { key: 'barc_wyndham',  family: 'barc_wyndham',   issuerHint: 'barclays',     months: 24, label: 'Wyndham Rewards',           patterns: ['wyndham rewards earner', 'wyndham'] },

  // ── Bilt ───────────────────────────────────────────────────────────────────
  { key: 'bilt',          family: 'bilt',           issuerHint: 'bilt',         months: 12, label: 'Bilt Mastercard',           patterns: ['bilt mastercard', 'bilt'] },
]

function issuerMatches(cardIssuer, hint) {
  if (!cardIssuer) return true // no issuer set on card — don't filter out
  const ci = cardIssuer.toLowerCase()
  const h  = hint.toLowerCase()
  if (h === 'amex') return ci.includes('amex') || ci.includes('american express')
  if (h === 'bank of america') return ci.includes('bank of america') || ci.includes('bofa') || ci.includes('boa')
  if (h === 'capital one') return ci.includes('capital one') || ci.includes('capitalone')
  if (h === 'us bank') return ci.includes('us bank') || ci.includes('u.s. bank') || ci.includes('usbank')
  if (h === 'wells fargo') return ci.includes('wells fargo') || ci.includes('wellsfargo')
  // generic: first word match in either direction
  return ci.includes(h.split(' ')[0]) || h.includes(ci.split(' ')[0])
}

export function matchCardToRule(card) {
  const name = (card.cardName ?? '').toLowerCase()
  for (const rule of CARD_RULES) {
    if (!issuerMatches(card.issuer, rule.issuerHint)) continue
    for (const pattern of rule.patterns) {
      if (name.includes(pattern)) return rule
    }
  }
  return null
}

// Returns one row per card family where the player has received a bonus.
// Rows are sorted: still-in-cooldown first (soonest-to-unlock), then eligible.
export function getCardReeligibility(playerId, allCards) {
  const playerCards = (allCards ?? []).filter(
    c => c.playerId === playerId && c.bonusReceived
  )

  const byFamily = {}
  for (const card of playerCards) {
    const rule = matchCardToRule(card)
    if (!rule) continue
    const anchorStr = card.bonusReceivedDate || card.openDate
    if (!anchorStr) continue
    const anchor = new Date(anchorStr)
    if (!byFamily[rule.family] || anchor > byFamily[rule.family].anchor) {
      byFamily[rule.family] = { rule, anchor, anchorCard: card }
    }
  }

  const now = new Date()
  return Object.values(byFamily).map(({ rule, anchor, anchorCard }) => {
    const { key, family, label, months } = rule
    const lifetime = months === 0
    if (lifetime) {
      return { key, family, label, months: 0, lifetime: true, eligible: false,
        daysUntil: null, eligibleDate: null, anchor: anchor.toISOString(), anchorCard }
    }
    const eligibleDate = new Date(anchor)
    eligibleDate.setMonth(eligibleDate.getMonth() + months)
    const daysUntil = Math.ceil((eligibleDate - now) / 86400000)
    return {
      key, family, label, months, lifetime: false,
      eligible: daysUntil <= 0,
      daysUntil: Math.max(0, daysUntil),
      eligibleDate: eligibleDate.toISOString(),
      anchor: anchor.toISOString(),
      anchorCard,
    }
  }).sort((a, b) => {
    const ae = a.eligible ? 1 : 0
    const be = b.eligible ? 1 : 0
    if (ae !== be) return ae - be
    return (a.daysUntil ?? 999999) - (b.daysUntil ?? 999999)
  })
}

export { CARD_RULES }
