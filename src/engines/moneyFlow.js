// Money-flow engine — the model behind the Money Map.
//
// Bank-account churning without a payroll direct deposit means pushing ACH
// after ACH out of a brokerage or everyday bank and into a new account, then
// pulling it all back once the bonus posts. With a dozen accounts live that is
// a lot of money in a lot of places, so this engine keeps one honest ledger of
// it:
//
//   • A TRANSFER moves money between two NODES. Money leaves the source on
//     sentDate and arrives at the destination on landedDate. Between the two
//     it is IN FLIGHT and belongs to neither node — which is exactly what
//     "what's in the pipeline vs. what's hit the account" means.
//   • A NODE is either a cash source (brokerage / everyday bank / hub) or a
//     tracked bank account. Account balances live on the account's own
//     currentBalance field; source balances live on the source's balance.
//   • The store applies those balance effects on send / land / delete
//     (see ChurnContext), so this engine never mutates anything — it only
//     reads state and derives the map, the totals, and the sweep-back list.
//
// No rule math is duplicated here: the clawback window comes from
// clawbackShield.js, exactly as the action engine uses it.

import { getClawbackStatus } from './clawbackShield'
import { parseDay, startOfToday, daysBetweenDays } from '../utils/format'

// A push is normally on the destination's books in 1–3 business days. Past
// this many calendar days an in-flight transfer is treated as late and starts
// nagging — ACH pushes do silently fail, and a lost $10k is worth a phone call.
export const EXPECTED_LANDING_DAYS = 5

export const TRANSFER_PURPOSES = [
  { value: 'dd',     label: 'Direct deposit push', short: 'DD',     hint: 'Meant to code as a direct deposit for the bonus' },
  { value: 'fund',   label: 'Funding / min balance', short: 'Fund', hint: 'Getting the account to its required balance' },
  { value: 'return', label: 'Sweep back home',     short: 'Return', hint: 'Pulling money back to your main account' },
  { value: 'other',  label: 'Other move',          short: 'Move',   hint: '' },
]

export const CASH_SOURCE_TYPES = [
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'bank',      label: 'Bank' },
  { value: 'other',     label: 'Other' },
]

export function purposeMeta(value) {
  return TRANSFER_PURPOSES.find(p => p.value === value) ?? TRANSFER_PURPOSES[3]
}

// Node keys namespace the two id spaces so a source and an account can never
// collide, and so one string identifies an endpoint everywhere (edges, filters,
// deep links).
export function nodeKey(kind, id) {
  return `${kind}:${id}`
}

export function splitNodeKey(key) {
  const i = String(key ?? '').indexOf(':')
  if (i < 0) return null
  return { kind: key.slice(0, i), id: key.slice(i + 1) }
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function isLanded(transfer) {
  return !!transfer?.landedDate
}

// How a single in-flight transfer is doing. Landed transfers report the trip
// length instead, which is what makes the "usually lands in ~2 days" read on
// the transfer list possible.
export function getTransferStatus(transfer) {
  const sent = parseDay(transfer?.sentDate)
  const landed = parseDay(transfer?.landedDate)
  const today = startOfToday()
  if (landed) {
    return {
      state: 'landed',
      landed: true,
      daysInTransit: sent ? Math.max(0, daysBetweenDays(sent, landed)) : null,
      daysAgo: daysBetweenDays(landed, today),
      late: false,
    }
  }
  const daysInFlight = sent ? daysBetweenDays(sent, today) : null
  const expected = transfer?.expectedDays ?? EXPECTED_LANDING_DAYS
  const expectedDate = sent ? new Date(sent.getFullYear(), sent.getMonth(), sent.getDate() + expected) : null
  return {
    state: 'inflight',
    landed: false,
    daysInFlight,
    expectedDate: expectedDate ? expectedDate.toISOString() : null,
    // Undated pushes can't be late — there's nothing to count from.
    late: daysInFlight != null && daysInFlight > expected,
    daysLate: daysInFlight != null ? Math.max(0, daysInFlight - expected) : 0,
  }
}

// ── Nodes ──────────────────────────────────────────────────────────────────
// One flat list of everywhere money can sit. Sources come from cashSources;
// accounts come from bankAccounts, closed ones included only while they still
// hold a balance or have transfer history (money you forgot in a closed
// account is precisely the thing this page exists to catch).

function accountNodeState(account) {
  if (account.status === 'Closed') return { tone: 'closed', label: 'Closed' }
  if (account.bonusReceivedDate) {
    const shield = getClawbackStatus(account)
    return shield.safe
      ? { tone: 'success', label: 'Bonus in · safe to close' }
      : { tone: 'warning', label: `Bonus in · hold ${shield.daysRemaining}d` }
  }
  const ddComplete = (account.ddsMade ?? 0) >= (account.requiredDDCount ?? 1)
  if (ddComplete) return { tone: 'accent', label: 'Requirements met · bonus pending' }
  const needed = (account.requiredDDCount ?? 1) - (account.ddsMade ?? 0)
  if ((account.requiredDD ?? 0) > 0 || (account.requiredDDCount ?? 1) > 1) {
    return { tone: 'danger', label: `${needed} more direct deposit${needed === 1 ? '' : 's'}` }
  }
  return { tone: 'accent', label: 'Working the bonus' }
}

export function buildNodes(state) {
  const sources = (state.cashSources ?? []).map(s => ({
    key: nodeKey('source', s.id),
    kind: 'source',
    id: s.id,
    name: s.name || 'Untitled source',
    sublabel: CASH_SOURCE_TYPES.find(t => t.value === s.type)?.label ?? 'Source',
    // null means "not tracked" — never render it as $0.
    balance: s.balance == null || s.balance === '' ? null : round2(s.balance),
    isHub: !!s.isHub,
    source: s,
  }))

  const accounts = (state.bankAccounts ?? []).map(a => ({
    key: nodeKey('account', a.id),
    kind: 'account',
    id: a.id,
    name: a.bankName || 'Untitled account',
    sublabel: [a.accountType, a.last4 ? `···${a.last4}` : null].filter(Boolean).join(' '),
    balance: round2(a.currentBalance),
    memberId: a.memberId,
    status: a.status,
    ...accountNodeState(a),
    account: a,
  }))

  return { sources, accounts, all: [...sources, ...accounts] }
}

export function nodeLabel(node) {
  if (!node) return 'Unknown'
  return node.sublabel ? `${node.name} ${node.sublabel}` : node.name
}

// ── The map ────────────────────────────────────────────────────────────────
// Aggregates transfers into one edge per source→destination pair, because with
// a dozen accounts and dozens of pushes a per-transfer edge list is unreadable.

export function buildMoneyMap(state) {
  const { sources, accounts, all } = buildNodes(state)
  const byKey = new Map(all.map(n => [n.key, n]))
  const transfers = [...(state.transfers ?? [])].sort(
    (a, b) => (b.sentDate ?? '').localeCompare(a.sentDate ?? '') || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  )

  // Deleting an account doesn't delete the pushes that went through it — the
  // history (and any money still in flight to it) has to stay countable. Stand
  // in a ghost node so those edges still have two ends to draw between.
  for (const t of transfers) {
    for (const key of [t.fromKey, t.toKey]) {
      if (!key || byKey.has(key)) continue
      const ghost = {
        key,
        kind: splitNodeKey(key)?.kind ?? 'account',
        id: splitNodeKey(key)?.id ?? key,
        name: 'Removed account',
        sublabel: 'no longer tracked',
        balance: null,
        ghost: true,
        tone: 'closed',
      }
      byKey.set(key, ghost)
      all.push(ghost)
      if (ghost.kind === 'source') sources.push(ghost)
      else accounts.push(ghost)
    }
  }

  const edges = new Map()
  const perNode = new Map(all.map(n => [n.key, { inflightIn: 0, inflightOut: 0, landedIn: 0, landedOut: 0, transfers: 0 }]))

  let inFlight = 0
  for (const t of transfers) {
    const from = t.fromKey
    const to = t.toKey
    const amount = round2(t.amount)
    const landed = isLanded(t)
    if (!landed) inFlight += amount

    const id = `${from}→${to}`
    if (!edges.has(id)) {
      edges.set(id, { id, from, to, landed: 0, inflight: 0, count: 0, lastSent: null, purposes: new Set() })
    }
    const e = edges.get(id)
    e.count += 1
    e[landed ? 'landed' : 'inflight'] += amount
    e.purposes.add(t.purpose || 'other')
    if (!e.lastSent || (t.sentDate ?? '') > e.lastSent) e.lastSent = t.sentDate ?? null

    const f = perNode.get(from)
    if (f) { f.transfers += 1; f[landed ? 'landedOut' : 'inflightOut'] += amount }
    const d = perNode.get(to)
    if (d) { d.transfers += 1; d[landed ? 'landedIn' : 'inflightIn'] += amount }
  }

  const edgeList = [...edges.values()].map(e => ({
    ...e,
    purposes: [...e.purposes],
    total: round2(e.landed + e.inflight),
  })).sort((a, b) => b.total - a.total)

  // Net landed flow per node — for an account that started empty this IS what
  // the balance should be, which is what makes reconciliation possible.
  for (const [, v] of perNode) v.netFlow = round2(v.landedIn - v.landedOut)

  const inAccounts = accounts.reduce((s, n) => s + (n.balance ?? 0), 0)
  const trackedSources = sources.filter(n => n.balance != null)
  const inSources = trackedSources.reduce((s, n) => s + n.balance, 0)
  const hub = sources.find(n => n.isHub) ?? null
  // "Away from home" is money you can't spend today: sitting in a churned
  // account or still moving. Cash parked at a brokerage isn't away — you put
  // it there on purpose.
  const awayFromHub = round2(inAccounts + inFlight)

  return {
    nodes: all,
    sources,
    accounts,
    byKey,
    edges: edgeList,
    perNode,
    transfers,
    hub,
    totals: {
      inAccounts: round2(inAccounts),
      inFlight: round2(inFlight),
      inSources: round2(inSources),
      // Sources without a balance set are excluded rather than counted as $0;
      // untrackedSources is what lets the UI say so instead of lying.
      untrackedSources: sources.length - trackedSources.length,
      atHub: hub?.balance ?? null,
      awayFromHub,
      total: round2(inAccounts + inFlight + inSources),
      accountsHoldingCash: accounts.filter(n => (n.balance ?? 0) > 0).length,
      inFlightCount: transfers.filter(t => !isLanded(t)).length,
      places: accounts.filter(n => (n.balance ?? 0) > 0).length + trackedSources.filter(n => n.balance > 0).length,
    },
  }
}

// ── Reconciliation ─────────────────────────────────────────────────────────
// A churned account starts empty, so once you've logged its pushes the ledger
// knows what it should hold. When the stored balance disagrees — a figure typed
// by hand on the Accounts page, history back-filled after the fact, or interest
// the bank paid — say so and offer the ledger's number, rather than quietly
// letting the map and the account page tell different stories.

export const RECONCILE_TOLERANCE = 1

export function getLedgerMismatches(map) {
  const rows = []
  for (const node of map.accounts) {
    if (node.ghost) continue
    const flow = map.perNode.get(node.key)
    if (!flow || flow.transfers === 0) continue
    const ledger = flow.netFlow ?? 0
    const balance = node.balance ?? 0
    const delta = round2(balance - ledger)
    if (Math.abs(delta) < RECONCILE_TOLERANCE) continue
    rows.push({ node, balance, ledger, delta })
  }
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

// ── Money that should be coming home ───────────────────────────────────────
// The "don't leave $6k in a bank you'll close in a year" list: an account that
// still holds cash but has no live reason to. Ordered by how overdue it is,
// then by how much money is sitting there.

export function getStrandedCash(state) {
  const rows = []
  const today = startOfToday()
  for (const a of (state.bankAccounts ?? [])) {
    const balance = round2(a.currentBalance)
    if (balance <= 0) continue
    // Money still doing a job: below the required minimum, or the bonus hasn't
    // posted yet, is money that has to stay put.
    const minimum = round2(a.minimumBalance)
    const free = round2(balance - minimum)
    if (free <= 0) continue

    let reason
    let since
    if (a.status === 'Closed') {
      reason = 'Account is closed but still shows a balance'
      since = a.closedDate ?? null
    } else if (a.bonusReceivedDate) {
      const shield = getClawbackStatus(a)
      if (shield.safe) {
        reason = minimum > 0
          ? 'Bonus posted and past the 181-day clawback window — only the minimum balance needs to stay'
          : 'Bonus posted and past the 181-day clawback window'
        since = shield.safeDate ?? a.bonusReceivedDate
      } else {
        continue
      }
    } else {
      continue
    }

    const sinceDay = parseDay(since)
    rows.push({
      accountId: a.id,
      account: a,
      memberId: a.memberId,
      balance,
      minimum,
      amount: free,
      reason,
      since,
      daysIdle: sinceDay ? Math.max(0, daysBetweenDays(sinceDay, today)) : null,
    })
  }
  return rows.sort((a, b) => (b.daysIdle ?? 0) - (a.daysIdle ?? 0) || b.amount - a.amount)
}

// ── Picking the other end, and what to send ────────────────────────────────
// Tap-driven entry doesn't get to read a typed sentence, so it has to be smart
// about what it offers: the accounts you actually move money between, the
// amounts this particular pair implies, and the intent that pairing usually has.

// Counterparties this node has moved money with before, most recent first.
// `transfers` is expected newest-first (buildMoneyMap sorts it), so insertion
// order into the Set is recency order.
export function recentCounterparties(transfers, key, direction) {
  const seen = new Set()
  for (const t of transfers ?? []) {
    const other = direction === 'out'
      ? (t.fromKey === key ? t.toKey : null)
      : (t.toKey === key ? t.fromKey : null)
    if (other) seen.add(other)
  }
  return [...seen]
}

// Amounts worth offering as one-tap chips for this specific pair. A churned
// account tells you most of them itself — the deposit its bonus requires, the
// minimum it has to hold, or everything it's sitting on when money is leaving.
export function suggestTransferAmounts(from, to) {
  const out = []
  const add = (amount, label) => {
    const value = round2(amount)
    if (value > 0 && !out.some(o => o.amount === value)) out.push({ amount: value, label })
  }

  const dest = to?.account
  if (dest) {
    if ((dest.requiredDD ?? 0) > 0) add(dest.requiredDD, 'the required deposit')
    const shortfall = round2((dest.minimumBalance ?? 0) - (to.balance ?? 0))
    if (shortfall > 0) add(shortfall, 'up to the minimum')
    if ((dest.minimumBalance ?? 0) > 0) add(dest.minimumBalance, 'the minimum balance')
  }

  const src = from?.account
  if (src && (from.balance ?? 0) > 0) {
    const spare = round2((from.balance ?? 0) - (src.minimumBalance ?? 0))
    if ((src.minimumBalance ?? 0) > 0 && spare > 0) add(spare, 'all but the minimum')
    add(from.balance, 'everything in it')
  }

  for (const n of [500, 1000, 5000]) add(n, null)
  return out.slice(0, 4)
}

// The intent a pairing usually has, used as the pre-selected chip. Always one
// tap from being overridden, so a good guess costs nothing when it's wrong.
export function defaultPurposeFor(from, to) {
  if (to?.isHub) return 'return'
  if (to?.kind === 'account') {
    const a = to.account
    const owes = a && (a.ddsMade ?? 0) < (a.requiredDDCount ?? 1)
    return owes && ((a.requiredDD ?? 0) > 0 || (a.requiredDDCount ?? 1) > 1) ? 'dd' : 'fund'
  }
  if (from?.kind === 'account') return 'return'
  return 'other'
}

// A whole field that should be one number: '5,000', '$5000', '5k' → 5000.
export function parseMoneyInput(text) {
  const m = String(text ?? '').trim().match(/^\$?\s*([\d,]*\.?\d+)\s*(k|m)?$/i)
  if (!m) return 0
  let value = parseFloat(m[1].replace(/,/g, ''))
  if (m[2]?.toLowerCase() === 'k') value *= 1000
  if (m[2]?.toLowerCase() === 'm') value *= 1000000
  return round2(value)
}

// ── Quick entry ────────────────────────────────────────────────────────────
// One text field beats four dropdowns when you're logging the eighth push of
// the day. Understands, in any order:
//
//   5000 fidelity > chase          amount, source, destination
//   2.5k schwab to amex hysa dd    'k' shorthand + a purpose keyword
//   chase back 4000                'back' targets the hub automatically
//   3000 fidelity > citi +3w       a check-back reminder three weeks out
//
// Returns a parse result the UI can render as a live preview, including what
// it could NOT resolve, so a half-understood line never saves silently.

const SEPARATORS = /\s+(?:->|=>|>|→|to|into)\s+/i

const PURPOSE_WORDS = [
  { re: /\b(dd|direct\s*deposit|payroll)\b/i, purpose: 'dd' },
  { re: /\b(back|return|sweep|home|withdraw)\b/i, purpose: 'return' },
  { re: /\b(fund|funding|min|minimum|balance)\b/i, purpose: 'fund' },
]

const AMOUNT_RE = /(?:^|\s)\$?(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/i
const CHECK_RE = /(?:^|\s)(?:\+|check\s+|remind\s+(?:me\s+)?(?:in\s+)?)(\d+)\s*(d|w|m|day|days|week|weeks|month|months)\b/i

function parseAmount(text) {
  const m = text.match(AMOUNT_RE)
  if (!m) return { amount: null, rest: text }
  let value = parseFloat(m[1].replace(/,/g, ''))
  if (m[2]?.toLowerCase() === 'k') value *= 1000
  if (m[2]?.toLowerCase() === 'm') value *= 1000000
  return { amount: round2(value), rest: (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).trim() }
}

function parseCheckOffset(text) {
  const m = text.match(CHECK_RE)
  if (!m) return { checkDays: null, rest: text }
  const n = parseInt(m[1], 10)
  const unit = m[2].toLowerCase()[0]
  const days = unit === 'w' ? n * 7 : unit === 'm' ? n * 30 : n
  return { checkDays: days, rest: (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).trim() }
}

// Score a node against a typed fragment. Higher is better; 0 means no match.
function matchScore(node, query) {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const name = (node.name ?? '').toLowerCase()
  const full = nodeLabel(node).toLowerCase()
  const last4 = node.account?.last4 ? String(node.account.last4) : ''
  if (name === q || full === q) return 100
  if (last4 && q.includes(last4)) return 95
  if (name.startsWith(q)) return 80
  if (full.startsWith(q)) return 70
  if (name.includes(q)) return 60
  if (full.includes(q)) return 50
  // Initials: "wf" → "Wells Fargo"
  const initials = name.split(/\s+/).map(w => w[0]).join('')
  if (initials && initials === q) return 45
  // Every typed word appears somewhere
  const words = q.split(/\s+/).filter(Boolean)
  if (words.length > 1 && words.every(w => full.includes(w))) return 40
  return 0
}

export function matchNodes(nodes, query, { limit = 5 } = {}) {
  const q = (query ?? '').trim()
  if (!q) return []
  return nodes
    .map(n => ({ node: n, score: matchScore(n, q) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name))
    .slice(0, limit)
}

export function parseQuickTransfer(text, nodes, { hub } = {}) {
  const raw = String(text ?? '')
  const result = {
    raw,
    amount: null,
    from: null,
    to: null,
    fromQuery: '',
    toQuery: '',
    fromMatches: [],
    toMatches: [],
    purpose: 'other',
    // false = nothing in the text named an intent, so a caller is free to
    // substitute defaultPurposeFor() rather than settling for 'other'.
    purposeExplicit: false,
    checkDays: null,
    complete: false,
    problems: [],
  }
  if (!raw.trim()) return result

  const afterCheck = parseCheckOffset(raw)
  result.checkDays = afterCheck.checkDays
  const afterAmount = parseAmount(afterCheck.rest)
  result.amount = afterAmount.amount
  let rest = afterAmount.rest

  for (const { re, purpose } of PURPOSE_WORDS) {
    const m = rest.match(re)
    if (m) {
      result.purpose = purpose
      result.purposeExplicit = true
      rest = (rest.slice(0, m.index) + ' ' + rest.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim()
      break
    }
  }

  const parts = rest.split(SEPARATORS)
  if (parts.length >= 2) {
    result.fromQuery = parts[0].trim()
    result.toQuery = parts.slice(1).join(' ').trim()
  } else if (result.purpose === 'return') {
    // "chase back 4000" — a sweep names the account the money is leaving, and
    // the hub is where it goes.
    result.fromQuery = rest.trim()
    result.to = hub ?? null
  } else {
    result.toQuery = rest.trim()
  }

  if (result.fromQuery) {
    result.fromMatches = matchNodes(nodes, result.fromQuery)
    result.from = result.fromMatches[0]?.node ?? null
  }
  if (result.toQuery) {
    // Don't let both ends resolve to the same node.
    const pool = result.from ? nodes.filter(n => n.key !== result.from.key) : nodes
    result.toMatches = matchNodes(pool, result.toQuery)
    result.to = result.toMatches[0]?.node ?? null
  }

  if (!result.amount) result.problems.push('amount')
  if (!result.from) result.problems.push(result.fromQuery ? `no match for “${result.fromQuery}”` : 'source')
  if (!result.to) result.problems.push(result.toQuery ? `no match for “${result.toQuery}”` : 'destination')
  result.complete = result.problems.length === 0
  return result
}
