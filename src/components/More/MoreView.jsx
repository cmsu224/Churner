import { useNavigate } from 'react-router-dom'
import PageHeader from '../shared/PageHeader'
import {
  ClipboardList, TrendingUp, BookOpen, FlaskConical, Calculator,
  Users, Link2, ArrowDownUp, Settings, ChevronRight,
} from 'lucide-react'

// Mobile hub for everything that doesn't fit in the 5-slot bottom nav.
const GROUPS = [
  {
    title: 'Tools',
    items: [
      { to: '/applications', icon: ClipboardList, label: 'Applications', desc: 'Plan applications and track approvals & denials' },
      { to: '/earnings', icon: TrendingUp, label: 'Earnings', desc: 'What the household is actually making' },
      { to: '/rules', icon: BookOpen, label: 'Eligibility', desc: 'Issuer rules and bonus re-eligibility' },
      { to: '/simulator', icon: FlaskConical, label: 'Simulator', desc: 'What-if projections for future applications' },
      { to: '/tax', icon: Calculator, label: 'Tax', desc: 'Taxable bank bonuses by year' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/members', icon: Users, label: 'Members', desc: 'Household members and colors' },
      { to: '/resources', icon: Link2, label: 'Resources', desc: 'Guides, rules references, and tools' },
      { to: '/import', icon: ArrowDownUp, label: 'Import / Export', desc: 'Backups and the AI import helper' },
      { to: '/settings', icon: Settings, label: 'Settings', desc: 'Theme, sync, notifications, valuations' },
    ],
  },
]

export default function MoreView() {
  const navigate = useNavigate()
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PageHeader title="More" />
      <div className="space-y-6">
        {GROUPS.map(group => (
          <section key={group.title}>
            <h2 className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2">{group.title}</h2>
            <div className="bg-surface border border-edge rounded-xl divide-y divide-edge overflow-hidden">
              {group.items.map(({ to, icon: Icon, label, desc }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-raised/60 transition-colors"
                >
                  <Icon size={18} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{label}</span>
                    <span className="block text-xs text-ink-tertiary truncate">{desc}</span>
                  </span>
                  <ChevronRight size={15} className="text-ink-faint flex-shrink-0" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
