import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, CreditCard, Landmark, BookOpen, Calculator, Users, Link2,
  ArrowDownUp, Settings, CalendarDays, ClipboardList, TrendingUp, FlaskConical,
  Plus, DollarSign, CornerDownLeft,
} from 'lucide-react'
import { useChurn } from '../../store/ChurnContext'
import { getIssuerMeta } from '../../utils/issuers'

const PAGES = [
  { label: 'Dashboard', route: '/', icon: LayoutDashboard, keywords: 'home overview' },
  { label: 'Credit Cards', route: '/cards', icon: CreditCard, keywords: 'cards' },
  { label: 'Bank Accounts', route: '/accounts', icon: Landmark, keywords: 'banks checking savings' },
  { label: 'Applications', route: '/applications', icon: ClipboardList, keywords: 'apply funnel denials' },
  { label: 'Timeline', route: '/timeline', icon: CalendarDays, keywords: 'calendar deadlines events ics' },
  { label: 'Earnings', route: '/earnings', icon: TrendingUp, keywords: 'roi analytics profit bonuses' },
  { label: 'Eligibility', route: '/rules', icon: BookOpen, keywords: 'rules 5/24 issuer windows' },
  { label: 'Simulator', route: '/simulator', icon: FlaskConical, keywords: 'what if projection 5/24' },
  { label: 'Tax', route: '/tax', icon: Calculator, keywords: 'taxes 1099' },
  { label: 'Members', route: '/members', icon: Users, keywords: 'household people' },
  { label: 'Resources', route: '/resources', icon: Link2, keywords: 'links guides offers' },
  { label: 'Import / Export', route: '/import', icon: ArrowDownUp, keywords: 'backup restore json ai' },
  { label: 'Settings', route: '/settings', icon: Settings, keywords: 'theme sync notifications' },
]

function memberName(members, id) {
  return (members ?? []).find(m => m.id === id)?.name ?? ''
}

function score(entry, q) {
  const hay = `${entry.label} ${entry.sub ?? ''} ${entry.keywords ?? ''}`.toLowerCase()
  if (!hay.includes(q)) return -1
  if (entry.label.toLowerCase().startsWith(q)) return 0
  if (entry.label.toLowerCase().includes(q)) return 1
  return 2
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const { state } = useChurn()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Reset search state when the palette opens (render-time adjustment)
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setSelected(0)
    }
  }

  useEffect(() => {
    if (!open) return
    // Focus after the overlay paints
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase()
    const members = state.members ?? []

    const actions = [
      { label: 'Add card', icon: Plus, route: '/cards?add=1', keywords: 'new credit card create' },
      { label: 'Add application', icon: Plus, route: '/applications?add=1', keywords: 'new apply plan create' },
      { label: 'Add bank account', icon: Plus, route: '/accounts?add=1', keywords: 'new bank create' },
      { label: 'Export calendar (.ics)', icon: CalendarDays, route: '/timeline', keywords: 'ics download subscribe reminders' },
      ...(state.creditCards ?? [])
        .filter(c => (c.spendRequirement ?? 0) > 0 && (c.currentSpend ?? 0) < (c.spendRequirement ?? 0) && c.status !== 'Closed' && c.status !== 'Downgraded')
        .map(c => ({
          label: `Log spend on ${c.cardName}`,
          sub: memberName(members, c.memberId),
          icon: DollarSign,
          route: `/cards?logspend=${c.id}&highlight=${c.id}`,
          keywords: 'spend log add purchase',
        })),
    ]

    const cards = (state.creditCards ?? []).map(c => ({
      label: c.cardName + (c.last4 ? ` ···${c.last4}` : ''),
      sub: [getIssuerMeta(c.issuer || c.cardName).name, memberName(members, c.memberId)].filter(Boolean).join(' · '),
      icon: CreditCard,
      route: `/cards?highlight=${c.id}`,
      keywords: `${c.issuer ?? ''} ${c.status}`,
    }))

    const accounts = (state.bankAccounts ?? []).map(a => ({
      label: a.bankName + (a.last4 ? ` ···${a.last4}` : ''),
      sub: [a.accountType, memberName(members, a.memberId)].filter(Boolean).join(' · '),
      icon: Landmark,
      route: `/accounts?highlight=${a.id}`,
      keywords: `${a.status}`,
    }))

    const applications = (state.applications ?? []).map(a => ({
      label: a.product || a.issuer || 'Application',
      sub: [a.issuer, memberName(members, a.memberId), a.status].filter(Boolean).join(' · '),
      icon: ClipboardList,
      route: `/applications?highlight=${a.id}`,
      keywords: 'application',
    }))

    const memberEntries = members.map(m => ({
      label: m.name,
      sub: m.role === 'senior' ? 'senior' : 'churner',
      icon: Users,
      route: '/members',
      keywords: 'member person',
    }))

    const build = (title, entries, emptyLimit) => {
      let list
      if (q) {
        list = entries
          .map(e => [score(e, q), e])
          .filter(([s]) => s >= 0)
          .sort((a, b) => a[0] - b[0])
          .map(([, e]) => e)
          .slice(0, 6)
      } else {
        list = entries.slice(0, emptyLimit)
      }
      return { title, entries: list }
    }

    return [
      build('Actions', actions, 4),
      build('Pages', PAGES, 13),
      build('Cards', cards, q ? 6 : 0),
      build('Accounts', accounts, q ? 6 : 0),
      build('Applications', applications, q ? 6 : 0),
      build('Members', memberEntries, 0),
    ].filter(s => s.entries.length > 0)
  }, [query, state])

  const flat = useMemo(() => sections.flatMap(s => s.entries), [sections])
  const clamped = Math.min(selected, Math.max(0, flat.length - 1))

  useEffect(() => {
    // Keep the selected row in view while arrowing through results
    const el = listRef.current?.querySelector(`[data-idx="${clamped}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [clamped])

  if (!open) return null

  function choose(entry) {
    onClose()
    navigate(entry.route)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => (s + 1) % Math.max(1, flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => (s - 1 + Math.max(1, flat.length)) % Math.max(1, flat.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[clamped]) choose(flat[clamped])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let idx = -1

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-lg bg-surface border border-edge-strong rounded-xl shadow-pop overflow-hidden animate-scale-in"
      >
        <div className="flex items-center gap-2 px-3.5 py-3 border-b border-edge">
          <Search size={15} className="text-ink-tertiary flex-shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search cards, accounts, pages… or run an action"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            className="flex-1 bg-transparent text-sm text-ink placeholder-ink-tertiary focus:outline-none"
          />
          <kbd className="hidden sm:block text-[10px] text-ink-faint border border-edge rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <div id="palette-results" ref={listRef} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto py-1">
          {flat.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-ink-tertiary">No matches for “{query}”</div>
          )}
          {sections.map(section => (
            <div key={section.title}>
              <div className="px-3.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint select-none">
                {section.title}
              </div>
              {section.entries.map(entry => {
                idx += 1
                const i = idx
                const isSel = i === clamped
                const Icon = entry.icon
                return (
                  <button
                    key={`${section.title}-${entry.route}-${entry.label}`}
                    data-idx={i}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => choose(entry)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${
                      isSel ? 'bg-accent/15 text-ink' : 'text-ink-secondary hover:bg-raised'
                    }`}
                  >
                    <Icon size={14} className={isSel ? 'text-accent-ink' : 'text-ink-tertiary'} aria-hidden="true" />
                    <span className="text-sm truncate">{entry.label}</span>
                    {entry.sub && <span className="text-[11px] text-ink-tertiary truncate">{entry.sub}</span>}
                    {isSel && <CornerDownLeft size={12} className="ml-auto text-ink-faint flex-shrink-0" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
