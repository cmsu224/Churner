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

// `shortLabel` is the same fact in the width a phone-sized card actually has.
// The full sentence gets clipped mid-word down there, which is how "1 more
// direct deposit" turns into "1 more dir…" — worse than saying less.
function accountNodeState(account) {
  if (account.status === 'Closed') return { tone: 'closed', label: 'Closed', shortLabel: 'Closed' }
  // The hub is where money lives, not something being churned — "working the
  // bonus" is nonsense on your everyday account.
  if (account.isHub) {
    return { tone: 'success', label: 'Home base · money comes back here', shortLabel: 'Home base' }
  }
  if (account.bonusReceivedDate) {
    const shield = getClawbackStatus(account)
    return shield.safe
      ? { tone: 'success', label: 'Bonus in · safe to close', shortLabel: 'Safe to close' }
      : { tone: 'warning', label: `Bonus in · hold ${shield.daysRemaining}d`, shortLabel: `Hold ${shield.daysRemaining}d` }
  }
  const ddComplete = (account.ddsMade ?? 0) >= (account.requiredDDCount ?? 1)
  if (ddComplete) return { tone: 'accent', label: 'Requirements met · bonus pending', shortLabel: 'Bonus pending' }
  const needed = (account.requiredDDCount ?? 1) - (account.ddsMade ?? 0)
  if ((account.requiredDD ?? 0) > 0 || (account.requiredDDCount ?? 1) > 1) {
    return {
      tone: 'danger',
      label: `${needed} more direct deposit${needed === 1 ? '' : 's'}`,
      shortLabel: `${needed} more DD${needed === 1 ? '' : 's'}`,
    }
  }
  return { tone: 'accent', label: 'Working the bonus', shortLabel: 'Working it' }
}

export function buildNodes(state) {
  const memberMap = new Map((state.members ?? []).map(m => [m.id, m]))

  const sources = (state.cashSources ?? []).map(s => ({
    key: nodeKey('source', s.id),
    kind: 'source',
    id: s.id,
    name: s.name || 'Untitled source',
    sublabel: CASH_SOURCE_TYPES.find(t => t.value === s.type)?.label ?? 'Source',
    // null means "not tracked" — never render it as $0.
    balance: s.balance == null || s.balance === '' ? null : round2(s.balance),
    isHub: !!s.isHub,
    color: s.color || null,
    source: s,
  }))

  const accounts = (state.bankAccounts ?? []).map(a => {
    const member = memberMap.get(a.memberId)
    return {
      key: nodeKey('account', a.id),
      kind: 'account',
      id: a.id,
      name: a.bankName || 'Untitled account',
      memberName: member?.name ?? null,
      memberHex: member?.hex ?? null,
      sublabel: [member?.name, a.accountType, a.last4 ? `···${a.last4}` : null].filter(Boolean).join(' · '),
      balance: round2(a.currentBalance),
      isHub: !!a.isHub,
      memberId: a.memberId,
      status: a.status,
      color: a.color || null,
      ...accountNodeState(a),
      account: a,
    }
  })

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
  // The hub is whichever node you nominated — usually a cash source, but a
  // checking account you actually live out of works just as well.
  const hub = all.find(n => n.isHub) ?? null
  // "Away from home" is money you can't spend today: sitting in a churned
  // account or still moving. Cash parked at a brokerage isn't away — you put
  // it there on purpose, and neither is the hub itself when the hub is one of
  // your tracked accounts.
  const hubInAccounts = hub?.kind === 'account' ? (hub.balance ?? 0) : 0
  const awayFromHub = round2(inAccounts - hubInAccounts + inFlight)

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
//
// "Starts empty" is an assumption, not a fact, and getting it wrong is how this
// check used to accuse a perfectly correct balance of being wrong: an account
// that already held money before you logged your first push is over by exactly
// that much, forever, and taking the ledger's figure would have deleted it. So
// the baseline is explicit — `openingBalance`, what the account held the day it
// joined the ledger, $0 for a freshly opened churn — and two nodes are exempt
// outright: the hub, where pay, rent and groceries move money for reasons no
// transfer log will ever know about, and any account still settling a push.

export const RECONCILE_TOLERANCE = 1

// What the transfers say an account should be holding: what it started with,
// plus everything that has landed in it, minus everything that has left.
export function ledgerBalance(node, flow) {
  return round2(openingBalance(node) + (flow?.netFlow ?? 0))
}

export function openingBalance(node) {
  const raw = node?.account?.openingBalance
  return raw == null || raw === '' ? 0 : round2(raw)
}

export function getLedgerMismatches(map) {
  const rows = []
  for (const node of map.accounts) {
    if (node.ghost) continue
    // Money at the hub comes and goes for reasons the ledger never sees.
    if (node.isHub) continue
    const flow = map.perNode.get(node.key)
    if (!flow || flow.transfers === 0) continue
    // While money is still moving to or from this account the balance is
    // expected to be uncertain — flagging it is noise, not signal.
    if (flow.inflightIn > 0 || flow.inflightOut > 0) continue
    const ledger = ledgerBalance(node, flow)
    const balance = node.balance ?? 0
    const delta = round2(balance - ledger)
    if (Math.abs(delta) < RECONCILE_TOLERANCE) continue
    rows.push({ node, balance, ledger, delta, opening: openingBalance(node) })
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
    // Cash in the hub is already home — that's the whole point of the hub.
    if (a.isHub) continue
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

// ── Where each card sits on the map ────────────────────────────────────────
// The two columns have sensible defaults — money comes from the left and lands
// on the right — but only you know how your accounts actually relate. So the
// layout is an override map, `moneyMapLayout`, keyed by node:
//
//   { 'account:a1': { side: 'left', order: 2 }, … }
//
// A node with no entry keeps the smart default: hub first, then the accounts
// that need attention, then the ones holding the most. Moving anything writes
// explicit sides and orders for every card, so the arrangement stops shifting
// under you the moment a balance or a status changes.

const TONE_RANK = { danger: 0, warning: 1, accent: 2, success: 3, closed: 4 }

// Which column a node belongs in: your override, else the hub and the cash
// sources on the left and the churned accounts on the right.
export function nodeSide(node, layout) {
  const override = layout?.[node?.key]?.side
  if (override === 'left' || override === 'right') return override
  return node?.isHub || node?.kind === 'source' ? 'left' : 'right'
}

// Urgency first, then size — the order the map uses until you arrange it.
function smartOrder(a, b) {
  if (!!a.isHub !== !!b.isHub) return a.isHub ? -1 : 1
  const tone = (TONE_RANK[a.tone] ?? 9) - (TONE_RANK[b.tone] ?? 9)
  if (tone !== 0) return tone
  return (b.balance ?? 0) - (a.balance ?? 0) || a.name.localeCompare(b.name)
}

export function layoutColumns(nodes, layout = {}) {
  const left = []
  const right = []
  for (const n of nodes ?? []) (nodeSide(n, layout) === 'left' ? left : right).push(n)
  // Arranged cards hold their positions; anything you haven't touched keeps the
  // smart order and sits after them.
  const sort = (list) => list.sort((a, b) => {
    const ao = layout?.[a.key]?.order
    const bo = layout?.[b.key]?.order
    if (ao != null && bo != null) return ao - bo
    if (ao != null) return -1
    if (bo != null) return 1
    return smartOrder(a, b)
  })
  return { left: sort(left), right: sort(right) }
}

// Cards you've taken off the map. Hiding is a display choice only — a hidden
// account still holds its balance, still counts in the totals, and still raises
// reminders; it just isn't drawn. Anything with money in it or still moving
// refuses to hide, because "out of sight" is the failure mode this whole page
// exists to prevent.
export function isNodeHidden(node, layout) {
  return !!layout?.[node?.key]?.hidden
}

// Why a card can't be hidden right now, or null when it can. Only the hub is
// off limits — everything aims money back at it, so a map without it doesn't
// make sense. Hiding anything else is safe because hiding is *display only*:
// the balance still counts in every total, and a hidden account still raises
// its sweep-back reminder, so money can't go quiet just by leaving the picture.
export function hideBlockedReason(node) {
  return node?.isHub ? 'The hub is where money comes home to' : null
}

// Hidden cards that still hold money or have some in flight. Not an error —
// just worth saying out loud next to the reveal toggle, so "hidden" never
// starts to feel like "gone".
export function hiddenHoldings(hiddenNodes, perNode) {
  let amount = 0
  let count = 0
  for (const n of hiddenNodes ?? []) {
    const flow = perNode?.get(n.key)
    const held = round2((n.balance ?? 0) + (flow?.inflightIn ?? 0))
    if (held > 0) { amount = round2(amount + held); count += 1 }
  }
  return { amount, count }
}

export function setNodeHidden(layout, key, hidden) {
  const next = { ...layout }
  const entry = { ...next[key] }
  if (hidden) entry.hidden = true
  else delete entry.hidden
  if (Object.keys(entry).length === 0) delete next[key]
  else next[key] = entry
  return next
}

export const MOVE_DIRECTIONS = ['up', 'down', 'left', 'right']

// Can this card move that way? Drives the disabled state on the arrows, so a
// card at the top of its column doesn't offer a move that does nothing.
export function canMove(nodes, layout, key, direction) {
  const cols = layoutColumns(nodes, layout)
  const side = nodeSide((nodes ?? []).find(n => n.key === key), layout)
  if (direction === 'left') return side === 'right'
  if (direction === 'right') return side === 'left'
  const i = cols[side].findIndex(n => n.key === key)
  if (i < 0) return false
  return direction === 'up' ? i > 0 : i < cols[side].length - 1
}

// Returns the next layout. Both columns are written out in full so the result
// is stable — a half-specified layout would let untouched cards drift past the
// arranged ones as their urgency changed.
export function moveNode(nodes, layout, key, direction) {
  if (!canMove(nodes, layout, key, direction)) return layout
  const cols = layoutColumns(nodes, layout)

  if (direction === 'left' || direction === 'right') {
    const from = direction === 'left' ? 'right' : 'left'
    const to = direction === 'left' ? 'left' : 'right'
    const i = cols[from].findIndex(n => n.key === key)
    const [moved] = cols[from].splice(i, 1)
    // Land at roughly the same height in the new column rather than the bottom.
    cols[to].splice(Math.min(i, cols[to].length), 0, moved)
  } else {
    const side = nodeSide(nodes.find(n => n.key === key), layout)
    const list = cols[side]
    const i = list.findIndex(n => n.key === key)
    const j = direction === 'up' ? i - 1 : i + 1
    ;[list[i], list[j]] = [list[j], list[i]]
  }

  // Start from the existing layout rather than an empty object: a hidden card
  // isn't in `nodes` at all, so rebuilding from scratch would silently drop its
  // entry — and un-hide it. Placed cards then overwrite their own side/order
  // while keeping whatever else was stored against them.
  const next = { ...layout }
  cols.left.forEach((n, i) => { next[n.key] = { ...layout?.[n.key], side: 'left', order: i } })
  cols.right.forEach((n, i) => { next[n.key] = { ...layout?.[n.key], side: 'right', order: i } })
  return next
}

// Moves a node to a specific column ('left' or 'right') and target slot index,
// supporting direct drag-and-drop reordering within or across columns.
export function reorderNode(nodes, layout, key, targetSide, targetIndex) {
  if (!key || (targetSide !== 'left' && targetSide !== 'right')) return layout
  const cols = layoutColumns(nodes, layout)

  let sourceSide = null
  let sourceIndex = -1
  for (const side of ['left', 'right']) {
    const idx = cols[side].findIndex(n => n.key === key)
    if (idx >= 0) {
      sourceSide = side
      sourceIndex = idx
      break
    }
  }
  if (!sourceSide) return layout

  const [moved] = cols[sourceSide].splice(sourceIndex, 1)
  let insertIdx = targetIndex
  if (sourceSide === targetSide && sourceIndex < targetIndex) {
    insertIdx = targetIndex - 1
  }
  const clampedIndex = Math.max(0, Math.min(insertIdx, cols[targetSide].length))
  cols[targetSide].splice(clampedIndex, 0, moved)

  // Start from the existing layout rather than an empty object: a hidden card
  // isn't in `nodes` at all, so rebuilding from scratch would silently drop its
  // entry — and un-hide it. Placed cards then overwrite their own side/order
  // while keeping whatever else was stored against them.
  const next = { ...layout }
  cols.left.forEach((n, i) => { next[n.key] = { ...layout?.[n.key], side: 'left', order: i } })
  cols.right.forEach((n, i) => { next[n.key] = { ...layout?.[n.key], side: 'right', order: i } })
  return next
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
  const member = (node.memberName ?? '').toLowerCase()
  const full = nodeLabel(node).toLowerCase()
  const last4 = node.account?.last4 ? String(node.account.last4) : ''
  if (name === q || full === q) return 100
  if (last4 && q.includes(last4)) return 95
  if (member && q === member) return 90
  if (name.startsWith(q)) return 80
  if (full.startsWith(q)) return 70
  if (name.includes(q)) return 60
  if (member && member.includes(q)) return 55
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
