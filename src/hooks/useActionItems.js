import { useEffect, useMemo } from 'react'
import { Capacitor } from '@capacitor/core'
import { useChurn } from '../store/ChurnContext'
import { generateActionItems } from '../engines/actionItems'
import { fireImmediate, reconcileScheduled } from '../native/notifications'

// Central access point for action items + their synced dismiss/snooze state.
// Used by the Dashboard action queue and the header notification center so
// a dismissal in one place (or on one device) holds everywhere.
export function useActionItems() {
  const { state, dispatch } = useChurn()
  const items = useMemo(() => generateActionItems(state), [state])
  const { dismissed = {}, snoozed = {}, seen = [] } = state.notifications ?? {}

  const { active, snoozedItems, dismissedItems, unread } = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- deliberate clock read: snooze expiry compares against the current time
    const now = Date.now()
    const isSnoozed = (id) => !!snoozed[id] && new Date(snoozed[id]).getTime() > now
    const active = items.filter(i => !dismissed[i.id] && !isSnoozed(i.id))
    const snoozedItems = items.filter(i => !dismissed[i.id] && isSnoozed(i.id))
    const dismissedItems = items.filter(i => !!dismissed[i.id])
    const seenSet = new Set(seen)
    const unread = active.filter(i => !seenSet.has(i.id))
    return { active, snoozedItems, dismissedItems, unread }
  }, [items, dismissed, snoozed, seen])

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

// Keep notifications in sync with the live action items. On native this also
// schedules OS-level reminders for dated items (so they fire when the app is
// closed); on both platforms it fires an immediate alert when an item newly
// turns critical while the app is open. Per-device: notified ids and permission
// are local. Degrades silently when unsupported or denied.
export function useBrowserNotifications(activeItems) {
  const { state } = useChurn()
  const enabled = !!state.settings?.notifyEnabled

  useEffect(() => {
    if (!enabled) return
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      // Reconcile closed-app reminders for every active, dated item.
      reconcileScheduled(activeItems)
    } else {
      if (typeof window === 'undefined' || !('Notification' in window)) return
      if (Notification.permission !== 'granted') return
    }

    // Immediate alert for newly-critical items (both platforms).
    const criticals = activeItems.filter(i => i.type === 'critical')
    let already = []
    try { already = JSON.parse(localStorage.getItem(LS_NOTIFIED)) ?? [] } catch { /* ignore */ }
    const alreadySet = new Set(already)
    const fresh = criticals.filter(i => !alreadySet.has(i.id))

    for (const item of fresh.slice(0, 3)) {
      fireImmediate('Churner — action needed', item.title, item.id)
    }
    // Store the current critical set (prunes resolved items, so a future
    // re-escalation notifies again).
    try { localStorage.setItem(LS_NOTIFIED, JSON.stringify(criticals.map(i => i.id))) } catch { /* ignore */ }
  }, [enabled, activeItems])
}
