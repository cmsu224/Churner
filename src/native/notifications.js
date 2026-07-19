// Notification abstraction shared by the notification center and Settings.
//
// Web: the browser Notification API, firing only while the app is open (same as
// before). Native: @capacitor/local-notifications, which additionally schedules
// OS-level reminders that fire when the app is closed — the reason to go native.
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const isNative = Capacitor.isNativePlatform()

// Stable positive 32-bit int id derived from an action-item id string, so the
// same item always maps to the same OS notification (idempotent scheduling).
function hashId(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (Math.imul(h, 31) + String(str).charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

export function notifSupported() {
  if (isNative) return true
  return typeof window !== 'undefined' && 'Notification' in window
}

// Normalized permission: 'granted' | 'denied' | 'default' | 'unsupported'.
export async function getNotifPermission() {
  if (isNative) {
    try {
      const { display } = await LocalNotifications.checkPermissions()
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default'
    } catch { return 'default' }
  }
  if (!notifSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotifPermission() {
  if (isNative) {
    try {
      const { display } = await LocalNotifications.requestPermissions()
      return display === 'granted' ? 'granted' : 'denied'
    } catch { return 'denied' }
  }
  if (!notifSupported()) return 'unsupported'
  return Notification.requestPermission()
}

// Fire an alert right now (newly-critical items, or the Settings confirmation).
export async function fireImmediate(title, body, tag) {
  if (isNative) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: hashId(`now-${tag}`),
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
        }],
      })
    } catch { /* not granted / unsupported — ignore */ }
    return
  }
  try { new Notification(title, { body, tag }) } catch { /* ignore */ }
}

function notifTitle(item) {
  return item.type === 'critical' ? 'Churner — action needed' : 'Churner — upcoming'
}

// 9am local on the due date. Returns null if that moment has already passed.
function notifyTime(dueDateIso) {
  const d = new Date(dueDateIso)
  if (Number.isNaN(d.getTime())) return null
  const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0)
  return at.getTime() > Date.now() ? at : null
}

// Native only: reconcile OS-scheduled reminders so each active, dated action
// item has exactly one notification at 9am local on its due date. Items that
// are resolved, dismissed, or snoozed (i.e. no longer in `activeItems`) have
// their pending notification cancelled. Idempotent — safe to call on every
// action-item change.
export async function reconcileScheduled(activeItems) {
  if (!isNative) return
  try {
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return
  } catch { return }

  const desired = new Map()
  for (const item of activeItems) {
    if (!item.dueDate) continue
    const at = notifyTime(item.dueDate)
    if (!at) continue
    const id = hashId(item.id)
    desired.set(id, { id, title: notifTitle(item), body: item.action || item.title, at })
  }

  let pendingIds = []
  try { pendingIds = (await LocalNotifications.getPending()).notifications.map(n => n.id) } catch { /* ignore */ }
  const pendingSet = new Set(pendingIds)

  const toCancel = pendingIds.filter(id => !desired.has(id)).map(id => ({ id }))
  if (toCancel.length) {
    try { await LocalNotifications.cancel({ notifications: toCancel }) } catch { /* ignore */ }
  }

  const toSchedule = [...desired.values()]
    .filter(d => !pendingSet.has(d.id))
    .map(d => ({ id: d.id, title: d.title, body: d.body, schedule: { at: d.at, allowWhileIdle: true } }))
  if (toSchedule.length) {
    try { await LocalNotifications.schedule({ notifications: toSchedule }) } catch { /* ignore */ }
  }
}
