import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CreditCard, Landmark, BookOpen, Calculator, Users, Link2, ArrowDownUp, Settings } from 'lucide-react'

const MAIN_NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cards',   icon: CreditCard,      label: 'Cards' },
  { to: '/accounts',icon: Landmark,        label: 'Accounts' },
  { to: '/rules',   icon: BookOpen,        label: 'Eligibility' },
  { to: '/tax',     icon: Calculator,      label: 'Tax' },
]

const SETTINGS_NAV = [
  { to: '/members',  icon: Users,       label: 'Members' },
  { to: '/resources',icon: Link2,       label: 'Resources' },
  { to: '/import',   icon: ArrowDownUp, label: 'Import' },
  { to: '/tax',      icon: Calculator,  label: 'Tax' },
  { to: '/settings', icon: Settings,    label: 'Settings' },
]

const BOTTOM_NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cards',    icon: CreditCard,      label: 'Cards' },
  { to: '/accounts', icon: Landmark,        label: 'Accounts' },
  { to: '/rules',    icon: BookOpen,        label: 'Eligibility' },
  { to: '/settings', icon: Settings,        label: 'Settings' },
]

function navClass(isActive) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
    isActive
      ? 'bg-accent/20 text-accent-ink border border-accent/20'
      : 'text-ink-muted hover:text-ink hover:bg-raised'
  }`
}

export function SidebarNav({ collapsed }) {
  return (
    <nav className="flex flex-col h-full p-2 overflow-y-auto">
      <div className="flex flex-col gap-1">
        {MAIN_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => navClass(isActive)}>
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* Settings section divider */}
        {collapsed
          ? <div className="my-2 border-t border-edge" />
          : <div className="text-[10px] font-semibold text-ink-faint uppercase tracking-wider px-3 pt-4 pb-1 select-none">
              Settings
            </div>
        }

        {SETTINGS_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => navClass(isActive)}>
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-edge-strong flex z-40">
      {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-accent-ink' : 'text-ink-tertiary hover:text-ink-secondary'
            }`
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
