import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SidebarNav, BottomNav } from './NavBar'
import NotificationCenter from './NotificationCenter'
import CommandPalette from './CommandPalette'
import { useChurn } from '../../store/ChurnContext'
import { PageSkeleton } from '../shared/Skeleton'
import { ChevronLeft, ChevronRight, RefreshCw, CheckCircle, AlertCircle, Search } from 'lucide-react'
import DashboardView from '../Dashboard/DashboardView'
import CreditCardsView from '../CreditCards/CreditCardsView'
import BankAccountsView from '../BankAccounts/BankAccountsView'
import MoneyMapView from '../MoneyMap/MoneyMapView'
import PointsView from '../Points/PointsView'
import AnnualFeesView from '../AnnualFees/AnnualFeesView'
import ApplicationsView from '../Applications/ApplicationsView'
import TimelineView from '../Timeline/TimelineView'
import EarningsView from '../Earnings/EarningsView'
import SimulatorView from '../Simulator/SimulatorView'
import RulesView from '../Rules/RulesView'
import PlayersView from '../Players/PlayersView'
import ResourcesView from '../Resources/ResourcesView'
import ImportExportView from '../ImportExport/ImportExportView'
import SettingsView from '../Settings/SettingsView'
import MoreView from '../More/MoreView'

export default function AppShell() {
  const { gist, dispatch, ready } = useChurn()
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef(null)

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

  // <main> is the scroll container, so moving between routes otherwise keeps
  // the old scroll offset — open Dashboard from halfway down a long card list
  // and you land halfway down the Dashboard. A deep link that scrolls to an
  // item of its own (?highlight=) is left alone.
  useEffect(() => {
    if (location.search.includes('highlight=')) return
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname, location.search])

  // Global Ctrl/Cmd-K for the command palette
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    <div className="app-shell bg-base text-ink flex">
      {isDesktop && (
        <aside
          className={`flex-shrink-0 min-h-0 bg-surface border-r border-edge flex flex-col transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-4 border-b border-edge">
            {!collapsed && <span className="font-bold text-ink text-base">Churner</span>}
            <button
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="ml-auto text-ink-muted hover:text-ink transition-colors p-1 rounded"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
          <SidebarNav collapsed={collapsed} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* inset-top keeps the title clear of a phone's clock and battery,
            and lets the header's own background fill the status bar. */}
        <header className="inset-top bg-surface border-b border-edge px-4 py-2.5 flex items-center justify-between flex-shrink-0 gap-2">
          {!isDesktop && <span className="font-bold text-ink text-base flex-shrink-0">Churner</span>}
          {isDesktop && (
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 text-xs text-ink-tertiary hover:text-ink-secondary bg-raised hover:bg-overlay rounded-lg px-3 py-1.5 transition-colors w-56"
            >
              <Search size={12} aria-hidden="true" />
              <span>Search…</span>
              <kbd className="ml-auto text-[10px] border border-edge-strong rounded px-1 py-px">⌘K</kbd>
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
              {syncIcon}
              <span className="hidden sm:inline whitespace-nowrap">{syncLabel}</span>
              {gist.error && (
                <>
                  <span className="text-danger-ink ml-1 truncate max-w-[120px]" title={gist.error}>
                    — {gist.error}
                  </span>
                  <button onClick={retrySync} className="text-xs text-accent-ink hover:underline ml-1">
                    Retry
                  </button>
                  <button onClick={reconnect} className="text-xs text-ink-muted hover:text-ink underline ml-1">
                    Reconnect
                  </button>
                </>
              )}
            </div>
            {!isDesktop && (
              <button
                onClick={() => setPaletteOpen(true)}
                aria-label="Search"
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors"
              >
                <Search size={16} />
              </button>
            )}
            <NotificationCenter />
          </div>
        </header>

        {/* The one scroller in the app. min-h-0 lets it shrink inside the
            pinned shell — without it a flex child refuses to go below its
            content height and nothing scrolls at all. pad-below-nav leaves
            room for the fixed bottom nav and the home indicator under it. */}
        <main
          ref={mainRef}
          className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain ${!isDesktop ? 'pad-below-nav' : ''}`}
        >
          {!ready ? (
            <PageSkeleton />
          ) : (
            <div key={location.pathname} className="animate-fade-in">
              <Routes>
                <Route path="/" element={<DashboardView />} />
                <Route path="/cards" element={<CreditCardsView />} />
                <Route path="/accounts" element={<BankAccountsView />} />
                <Route path="/money" element={<MoneyMapView />} />
                <Route path="/points" element={<PointsView />} />
                <Route path="/fees" element={<AnnualFeesView />} />
                <Route path="/applications" element={<ApplicationsView />} />
                <Route path="/timeline" element={<TimelineView />} />
                <Route path="/earnings" element={<EarningsView />} />
                <Route path="/simulator" element={<SimulatorView />} />
                <Route path="/rules" element={<RulesView />} />
                <Route path="/tax" element={<Navigate to="/earnings" replace />} />
                <Route path="/resources" element={<ResourcesView />} />
                <Route path="/import" element={<ImportExportView />} />
                <Route path="/members" element={<PlayersView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/more" element={<MoreView />} />
                {/* A path that matches nothing rendered an empty page with no
                    way back. Old deep links and stale bookmarks land on the
                    Dashboard instead. */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          )}
        </main>
      </div>

      {!isDesktop && <BottomNav />}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
