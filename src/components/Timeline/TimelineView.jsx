import { useMemo, useState } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { collectEvents, EVENT_CATEGORIES } from '../../engines/events'
import { buildIcs, downloadIcs } from '../../utils/ics'
import PageHeader from '../shared/PageHeader'
import Button from '../shared/Button'
import EmptyState from '../shared/EmptyState'
import PlayerBadge from '../shared/PlayerBadge'
import { Pill, Chip } from '../shared/FilterBar'
import { daysUntil } from '../../utils/format'
import { Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function categoryFor(key) {
  return EVENT_CATEGORIES.find(c => c.key === key)
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function groupEventsByDay(events) {
  const map = {}
  for (const ev of events) {
    const key = dateKey(new Date(ev.date))
    if (!map[key]) map[key] = []
    map[key].push(ev)
  }
  return map
}

function buildMonthCells(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay() // 0 = Sunday
  const cells = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(year, month, 1 - startOffset + i))
  }
  return cells
}

function daysAwayLabel(iso) {
  const d = daysUntil(iso)
  if (d === 0) return 'today'
  if (d > 0) return `in ${d}d`
  return `${Math.abs(d)}d overdue`
}

// One event row — shared by the month view's selected-day agenda and the Agenda view.
function EventRow({ event }) {
  const cat = categoryFor(event.category)
  const d = new Date(event.date)
  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekdayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
  const daysLeft = daysUntil(event.date)
  const overdue = daysLeft < 0

  return (
    <div className="flex items-center gap-3 bg-surface border border-edge rounded-lg px-3 py-2">
      <span className={`w-1 self-stretch rounded-full flex-shrink-0 ${cat?.dot ?? 'bg-ink-faint'}`} aria-hidden="true" />
      <div className="w-11 flex-shrink-0 text-center">
        <div className="text-sm font-bold text-ink tabular-nums leading-tight">{dateLabel}</div>
        <div className="text-[10px] text-ink-faint">{weekdayLabel}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink truncate">{event.title}</div>
        {event.detail && <div className="text-xs text-ink-muted truncate">{event.detail}</div>}
      </div>
      <div className="flex-shrink-0 hidden sm:block">
        <PlayerBadge memberId={event.memberId} />
      </div>
      <span className={`text-xs font-medium flex-shrink-0 whitespace-nowrap ${overdue ? 'text-danger-ink' : 'text-ink-tertiary'}`}>
        {daysAwayLabel(event.date)}
      </span>
    </div>
  )
}

function MonthGrid({ events }) {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState(null)

  const byDay = useMemo(() => groupEventsByDay(events), [events])
  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month), [cursor])
  const todayKey = dateKey(today)
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function go(delta) {
    const d = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
    setSelectedDay(null)
  }

  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDay(null)
  }

  const selectedEvents = selectedDay ? (byDay[selectedDay] ?? []) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => go(-1)} aria-label="Previous month" className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{monthLabel}</span>
          <button onClick={goToday} className="text-xs font-medium px-2 py-1 rounded-lg bg-raised text-ink-muted hover:text-ink transition-colors">
            Today
          </button>
        </div>
        <button onClick={() => go(1)} aria-label="Next month" className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-raised transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ink-tertiary mb-1">
        {WEEKDAY_HEADERS.map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(d => {
          const key = dateKey(d)
          const inMonth = d.getMonth() === cursor.month
          const dayEvents = byDay[key] ?? []
          const isToday = key === todayKey
          const isSelected = key === selectedDay

          return (
            <button
              key={key}
              onClick={() => dayEvents.length > 0 && setSelectedDay(isSelected ? null : key)}
              aria-label={`${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}` : ''}`}
              className={`h-20 rounded-lg border p-1 flex flex-col items-stretch overflow-hidden text-left transition-colors ${
                inMonth ? 'bg-surface border-edge' : 'bg-base border-edge/60'
              } ${isSelected ? 'ring-2 ring-accent' : ''} ${dayEvents.length ? 'hover:border-edge-strong cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`text-[11px] font-medium flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-accent text-white' : inMonth ? 'text-ink-secondary' : 'text-ink-faint'
                }`}
              >
                {d.getDate()}
              </span>
              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => {
                  const cat = categoryFor(ev.category)
                  return (
                    <div key={ev.id} className="flex items-center gap-1 text-[10px] leading-tight">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat?.dot ?? 'bg-ink-faint'}`} aria-hidden="true" />
                      <span className="truncate hidden sm:inline text-ink-secondary">{ev.title}</span>
                    </div>
                  )
                })}
                {dayEvents.length > 3 && <div className="text-[10px] text-ink-faint">+{dayEvents.length - 3}</div>}
              </div>
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div className="mt-4 bg-surface border border-edge rounded-xl p-3 animate-slide-up">
          <div className="text-xs font-semibold text-ink mb-2">
            {parseDateKey(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {selectedEvents.length === 0 ? (
            <div className="text-xs text-ink-tertiary">No events.</div>
          ) : (
            <div className="space-y-1.5">
              {selectedEvents.map(ev => <EventRow key={ev.id} event={ev} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function groupByMonth(list) {
  const groups = []
  let lastKey = null
  for (const ev of list) {
    const d = new Date(ev.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key !== lastKey) {
      groups.push({ key, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), events: [] })
      lastKey = key
    }
    groups[groups.length - 1].events.push(ev)
  }
  return groups
}

function Agenda({ events }) {
  const overdue = events.filter(ev => daysUntil(ev.date) < 0)
  const upcoming = events.filter(ev => daysUntil(ev.date) >= 0)
  const upcomingGroups = groupByMonth(upcoming)

  return (
    <div className="space-y-6">
      {overdue.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-danger-ink uppercase tracking-wide mb-2">Overdue</h2>
          <div className="space-y-1.5">
            {overdue.map(ev => <EventRow key={ev.id} event={ev} />)}
          </div>
        </section>
      )}
      {upcomingGroups.map(group => (
        <section key={group.key}>
          <h2 className="text-sm font-semibold text-ink mb-2">{group.label}</h2>
          <div className="space-y-1.5">
            {group.events.map(ev => <EventRow key={ev.id} event={ev} />)}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function TimelineView() {
  const { state } = useChurn()
  const members = state.members ?? []
  const allEvents = useMemo(() => collectEvents(state), [state])

  const [filterMember, setFilterMember] = useState('all')
  const [activeCategories, setActiveCategories] = useState(() => EVENT_CATEGORIES.map(c => c.key))
  const [viewMode, setViewMode] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 640px)').matches
    return isMobile ? 'agenda' : 'month'
  })

  function toggleCategory(key) {
    setActiveCategories(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]))
  }

  function clearFilters() {
    setFilterMember('all')
    setActiveCategories(EVENT_CATEGORIES.map(c => c.key))
  }

  const filteredEvents = allEvents.filter(
    ev => (filterMember === 'all' || ev.memberId === filterMember) && activeCategories.includes(ev.category)
  )
  const upcomingFilteredEvents = filteredEvents.filter(ev => daysUntil(ev.date) >= 0)

  const hasAnyEvents = allEvents.length > 0
  const hasFilteredEvents = filteredEvents.length > 0
  const filtersActive = filterMember !== 'all' || activeCategories.length !== EVENT_CATEGORIES.length

  async function handleExport() {
    if (upcomingFilteredEvents.length === 0) return
    const memberNameById = Object.fromEntries(members.map(m => [m.id, m.name]))
    const ics = buildIcs(upcomingFilteredEvents, memberNameById)
    await downloadIcs(`churner-timeline-${new Date().toISOString().slice(0, 10)}.ics`, ics)
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader
        title="Timeline"
        actions={
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={upcomingFilteredEvents.length === 0}
            title={upcomingFilteredEvents.length === 0 ? 'No upcoming events match the current filters' : 'Export the filtered upcoming events as an .ics file'}
          >
            <Download size={14} />
            Export .ics
          </Button>
        }
      />
      <p className="text-xs text-ink-muted -mt-2 mb-4">
        Export the calendar and subscribe in Google/Apple Calendar to get reminders when the app is closed.
      </p>

      {hasAnyEvents && (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            <Pill active={filterMember === 'all'} onClick={() => setFilterMember('all')}>All</Pill>
            {members.map(p => (
              <button
                key={p.id}
                onClick={() => setFilterMember(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterMember === p.id ? 'bg-overlay text-ink' : 'bg-raised text-ink-muted hover:text-ink-secondary'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.hex }} />
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex gap-1.5 flex-wrap">
              {EVENT_CATEGORIES.map(cat => (
                <Chip key={cat.key} active={activeCategories.includes(cat.key)} onClick={() => toggleCategory(cat.key)}>
                  <span className={`w-2 h-2 rounded-full ${cat.dot}`} aria-hidden="true" />
                  {cat.label}
                </Chip>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-raised rounded-lg p-1 flex-shrink-0">
              <Button size="xs" variant={viewMode === 'month' ? 'primary' : 'ghost'} onClick={() => setViewMode('month')}>
                Month
              </Button>
              <Button size="xs" variant={viewMode === 'agenda' ? 'primary' : 'ghost'} onClick={() => setViewMode('agenda')}>
                Agenda
              </Button>
            </div>
          </div>
        </>
      )}

      {!hasAnyEvents ? (
        <EmptyState
          icon={Calendar}
          title="Nothing scheduled"
          hint="Add spend deadlines, fees, and bank bonuses and they'll show up here."
        />
      ) : !hasFilteredEvents ? (
        <EmptyState
          icon={Calendar}
          title="No events match filters"
          hint="Try widening your member or category filters."
          action={filtersActive ? <Button size="sm" onClick={clearFilters}>Clear filters</Button> : null}
        />
      ) : viewMode === 'month' ? (
        <MonthGrid events={filteredEvents} />
      ) : (
        <Agenda events={filteredEvents} />
      )}
    </div>
  )
}
