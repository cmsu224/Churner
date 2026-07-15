import { useEffect, useMemo } from 'react'
import { useChurn } from '../store/ChurnContext'
import { generateActionItems } from '../engines/actionItems'

// Central access point for action items + their synced dismiss/snooze state.
// Used by the Dashboard action queue and the header notification center so
// a dismissal in one place (or on one device) holds everywhere.
export function useActionItems() {
  const { state, dispatch } = useChurn()
  const items = useMemo(() => generateActionItems(state), [state])
  const { dismissed = {}, snoozed = {}, seen = [] } = state.notifications ?? {}

  const now = Date.now()
  const isSnoozed = (id) => !!snoozed[id] && new Date(snoozed[id]).getTime() > now

  const active = items.filter(i => !dismissed[i.id] && !isSnoozed(i.id))
  const snoozedItems = items.filter(i => !dismissed[i.id] && isSnoozed(i.id))
  const dismissedItems = items.filter(i => !!dismissed[i.id])
  const seenSet = new Set(seen)
  const unread = active.filter(i => !seenSet.has(i.id))

  return {
    items,
    active,
    snoozedItems,
    dismissedItems,
    unread,
    snoozeUntil: (id) => snoozed[id] ?? null,
    dismiss: (id) => dispatch({ type: 'DISMISS_ACTION', id }),
    restore: (id) => dispatch({ type: 'RESTORE_ACTION', id }),
    snooze: (id, days) => {
      const until = new Date()
      until.setDate(until.getDate() + days)
      dispatch({ type: 'SNOOZE_ACTION', id, until: until.toISOString() })
    },
    markAllSeen: () => dispatch({ type: 'MARK_NOTIFICATIONS_SEEN', liveIds: items.map(i => i.id) }),
  }
}

const LS_NOTIFIED = 'churner_notified_ids'

// Fire a browser notification when an item newly becomes critical while the
// app is open. Per-device: notified ids live in localStorage; permission is
// per browser. Degrades silently when unsupported or denied.
export function useBrowserNotifications(activeItems) {
  const { state } = useChurn()
  const enabled = !!state.settings?.notifyEnabled

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const criticals = activeItems.filter(i => i.type === 'critical')
    let already = []
    try { already = JSON.parse(localStorage.getItem(LS_NOTIFIED)) ?? [] } catch { /* ignore */ }
    const alreadySet = new Set(already)
    const fresh = criticals.filter(i => !alreadySet.has(i.id))

    for (const item of fresh.slice(0, 3)) {
      try {
        new Notification('Churner — action needed', { body: item.title, tag: item.id })
      } catch { /* some browsers require a service worker; ignore */ }
    }
    // Store the current critical set (prunes resolved items, so a future
    // re-escalation notifies again).
    try { localStorage.setItem(LS_NOTIFIED, JSON.stringify(criticals.map(i => i.id))) } catch { /* ignore */ }
  }, [enabled, activeItems])
}
