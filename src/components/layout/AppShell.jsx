import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { SidebarNav, BottomNav } from './NavBar'
import { useChurn } from '../../store/ChurnContext'
import { ChevronLeft, ChevronRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import DashboardView from '../Dashboard/DashboardView'
import CreditCardsView from '../CreditCards/CreditCardsView'
import BankAccountsView from '../BankAccounts/BankAccountsView'
import RulesView from '../Rules/RulesView'
import TaxView from '../Tax/TaxView'
import PlayersView from '../Players/PlayersView'
import ResourcesView from '../Resources/ResourcesView'
import ImportExportView from '../ImportExport/ImportExportView'
import SettingsView from '../Settings/SettingsView'

export default function AppShell() {
  const { gist, dispatch } = useChurn()
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)

  async function retrySync() {
    const data = await gist.loadFromGist()
    if (data) dispatch({ type: 'LOAD_STATE', payload: data })
  }

  function reconnect() {
    gist.disconnect()
    window.location.reload()
  }

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const syncIcon = gist.syncing
    ? <RefreshCw size={13} className="animate-spin text-accent-ink" />
    : gist.error
    ? <AlertCircle size={13} className="text-danger-ink" />
    : <CheckCircle size={13} className="text-success-ink" />

  const syncLabel = gist.syncing
    ? 'Syncing...'
    : gist.error
    ? 'Sync error'
    : gist.lastSynced
    ? `Synced ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(gist.lastSynced))}`
    : 'Not synced yet'

  return (
    <div className="min-h-screen bg-base text-ink flex">
      {isDesktop && (
        <aside
          className={`flex-shrink-0 bg-surface border-r border-edge flex flex-col transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-4 border-b border-edge">
            {!collapsed && <span className="font-bold text-ink text-base">Churner</span>}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="ml-auto text-ink-muted hover:text-ink transition-colors p-1 rounded"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          <SidebarNav collapsed={collapsed} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-surface border-b border-edge px-4 py-3 flex items-center justify-between flex-shrink-0">
          {!isDesktop && <span className="font-bold text-ink text-base">Churner</span>}
          {isDesktop && <div />}
          <div className="flex items-center gap-1.5 text-xs text-ink-muted ml-auto">
            {syncIcon}
            <span>{syncLabel}</span>
            {gist.error && (
              <>
                <span className="text-danger-ink ml-1 truncate max-w-[160px]" title={gist.error}>
                  — {gist.error}
                </span>
                <button
                  onClick={retrySync}
                  className="text-xs text-accent-ink hover:text-accent-ink underline ml-1"
                >
                  Retry
                </button>
                <button
                  onClick={reconnect}
                  className="text-xs text-ink-muted hover:text-ink underline ml-1"
                >
                  Reconnect
                </button>
              </>
            )}
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
            <Route path="/members" element={<PlayersView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>

      {!isDesktop && <BottomNav />}
    </div>
  )
}
