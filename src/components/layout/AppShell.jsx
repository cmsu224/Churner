import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SidebarNav, BottomNav } from './NavBar'
import { useChurn } from '../../store/ChurnContext'
import { useTheme } from '../../hooks/useTheme'
import { ChevronLeft, ChevronRight, RefreshCw, CheckCircle, AlertCircle, Sun, Moon } from 'lucide-react'
import DashboardView from '../Dashboard/DashboardView'
import CreditCardsView from '../CreditCards/CreditCardsView'
import BankAccountsView from '../BankAccounts/BankAccountsView'
import RulesView from '../Rules/RulesView'
import TaxView from '../Tax/TaxView'
import PlayersView from '../Players/PlayersView'
import ResourcesView from '../Resources/ResourcesView'
import ImportExportView from '../ImportExport/ImportExportView'

export default function AppShell() {
  const { gist } = useChurn()
  const { theme, toggle: toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const syncIcon = gist.syncing
    ? <RefreshCw size={13} className="animate-spin text-blue-400" />
    : gist.error
    ? <AlertCircle size={13} className="text-red-400" />
    : <CheckCircle size={13} className="text-emerald-400" />

  const syncLabel = gist.syncing
    ? 'Syncing...'
    : gist.error
    ? 'Sync error'
    : gist.lastSynced
    ? `Synced ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(gist.lastSynced))}`
    : 'Not synced yet'

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {isDesktop && (
        <aside
          className={`flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-4 border-b border-zinc-800">
            {!collapsed && <span className="font-bold text-white text-base">Churner</span>}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="ml-auto text-zinc-400 hover:text-white transition-colors p-1 rounded"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          <SidebarNav collapsed={collapsed} theme={theme} onThemeToggle={toggleTheme} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
          {!isDesktop && <span className="font-bold text-white text-base">Churner</span>}
          {isDesktop && <div />}
          <div className="flex items-center gap-3 ml-auto">
            {/* Theme toggle — visible on mobile; desktop uses sidebar button */}
            {!isDesktop && (
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="text-zinc-400 hover:text-white transition-colors p-1 rounded"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              {syncIcon}
              <span>{syncLabel}</span>
              {gist.error && (
                <span className="text-red-400 ml-1 truncate max-w-[200px]" title={gist.error}>
                  — {gist.error}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto ${!isDesktop ? 'pb-20' : ''}`}>
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/cards" element={<CreditCardsView />} />
            <Route path="/accounts" element={<BankAccountsView />} />
            <Route path="/rules" element={<RulesView />} />
            <Route path="/tax" element={<TaxView />} />
            <Route path="/resources" element={<ResourcesView />} />
            <Route path="/import" element={<ImportExportView />} />
            <Route path="/players" element={<PlayersView />} />
          </Routes>
        </main>
      </div>

      {!isDesktop && <BottomNav />}
    </div>
  )
}
