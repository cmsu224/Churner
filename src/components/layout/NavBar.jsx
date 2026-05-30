import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CreditCard, Landmark, BookOpen, Calculator, Users, Link2, ArrowDownUp, Sun, Moon } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cards', icon: CreditCard, label: 'Cards' },
  { to: '/accounts', icon: Landmark, label: 'Accounts' },
  { to: '/rules', icon: BookOpen, label: 'Eligibility' },
  { to: '/tax', icon: Calculator, label: 'Tax' },
  { to: '/resources', icon: Link2, label: 'Resources' },
  { to: '/import', icon: ArrowDownUp, label: 'Import' },
  { to: '/players', icon: Users, label: 'Members' },
]

export function SidebarNav({ collapsed, theme, onThemeToggle }) {
  return (
    <nav className="flex flex-col h-full p-2">
      <div className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>

      {/* Theme toggle at bottom of sidebar */}
      <div className="mt-2 pt-2 border-t border-zinc-800">
        <button
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          {theme === 'dark' ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
      </div>
    </nav>
  )
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-700 flex z-40">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
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
