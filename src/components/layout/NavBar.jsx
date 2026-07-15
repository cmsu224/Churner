import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard, Landmark, BookOpen, Calculator, Users, Link2,
  ArrowDownUp, Settings, CalendarDays, ClipboardList, TrendingUp, FlaskConical,
  MoreHorizontal,
} from 'lucide-react'

const MAIN_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cards', icon: CreditCard, label: 'Cards' },
  { to: '/accounts', icon: Landmark, label: 'Accounts' },
  { to: '/applications', icon: ClipboardList, label: 'Applications' },
  { to: '/timeline', icon: CalendarDays, label: 'Timeline' },
]

const INSIGHT_NAV = [
  { to: '/earnings', icon: TrendingUp, label: 'Earnings' },
  { to: '/rules', icon: BookOpen, label: 'Eligibility' },
  { to: '/simulator', icon: FlaskConical, label: 'Simulator' },
  { to: '/tax', icon: Calculator, label: 'Tax' },
]

const SETTINGS_NAV = [
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/resources', icon: Link2, label: 'Resources' },
  { to: '/import', icon: ArrowDownUp, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const BOTTOM_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cards', icon: CreditCard, label: 'Cards' },
  { to: '/accounts', icon: Landmark, label: 'Accounts' },
  { to: '/timeline', icon: CalendarDays, label: 'Timeline' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
]

// Routes reachable from the More hub — keeps the More tab lit while inside them.
const MORE_ROUTES = ['/more', '/applications', '/earnings', '/rules', '/simulator', '/tax', '/members', '/resources', '/import', '/settings']

function navClass(isActive) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
    isActive
      ? 'bg-accent/15 text-accent-ink border border-accent/20'
      : 'text-ink-muted hover:text-ink hover:bg-raised border border-transparent'
  }`
}

function SectionLabel({ collapsed, children }) {
  return collapsed
    ? <div className="my-2 border-t border-edge" />
    : <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-3 pt-4 pb-1 select-none">{children}</div>
}

export function SidebarNav({ collapsed }) {
  const renderLinks = (items) => items.map(({ to, icon: Icon, label }) => (
    <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => navClass(isActive)} title={collapsed ? label : undefined}>
      <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  ))

  return (
    <nav className="flex flex-col h-full p-2 overflow-y-auto" aria-label="Main navigation">
      <div className="flex flex-col gap-1">
        {renderLinks(MAIN_NAV)}
        <SectionLabel collapsed={collapsed}>Insights</SectionLabel>
        {renderLinks(INSIGHT_NAV)}
        <SectionLabel collapsed={collapsed}>Manage</SectionLabel>
        {renderLinks(SETTINGS_NAV)}
      </div>
    </nav>
  )
}

export function BottomNav() {
  const location = useLocation()
  const inMoreSection = MORE_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(`${r}/`))

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-edge-strong flex z-40 pb-[env(safe-area-inset-bottom)]" aria-label="Main navigation">
      {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              isActive || (to === '/more' && inMoreSection) ? 'text-accent-ink' : 'text-ink-tertiary hover:text-ink-secondary'
            }`
          }
        >
          <Icon size={20} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
