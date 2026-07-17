/* eslint-disable react-refresh/only-export-components -- context + hook live beside the provider by design */
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { INITIAL_STATE } from '../data/initialState'
import { useGist } from '../hooks/useGist'

export const ChurnContext = createContext(null)

// One-time migration: rename players→members, playerId→memberId in Gist data
function migrateState(raw) {
  if (!raw || raw.members !== undefined) return raw
  const { players, ...rest } = raw
  return {
    ...rest,
    members: players ?? [],
    creditCards: (raw.creditCards ?? []).map(c => {
      if ('playerId' in c) { const { playerId, ...r } = c; return { ...r, memberId: playerId } }
      return c
    }),
    bankAccounts: (raw.bankAccounts ?? []).map(a => {
      if ('playerId' in a) { const { playerId, ...r } = a; return { ...r, memberId: playerId } }
      return a
    }),
    externalPayments: (raw.externalPayments ?? []).map(p => {
      if ('payerPlayerId' in p) { const { payerPlayerId, ...r } = p; return { ...r, payerMemberId: payerPlayerId } }
      return p
    }),
  }
}

// Fill in every field added since the Gist was written, so older data loads
// without loss. Top-level keys default via the INITIAL_STATE spread; nested
// objects (settings, notifications) need explicit deep-defaulting so an older
// partial object doesn't clobber new defaults.
function withDefaults(raw) {
  const base = raw ?? {}
  return {
    ...INITIAL_STATE,
    ...base,
    version: 3,
    applications: base.applications ?? [],
    pointsBalances: base.pointsBalances ?? [],
    settings: { ...INITIAL_STATE.settings, ...(base.settings ?? {}) },
    notifications: {
      seen: base.notifications?.seen ?? [],
      dismissed: base.notifications?.dismissed ?? {},
      snoozed: base.notifications?.snoozed ?? {},
    },
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return withDefaults(migrateState(action.payload))

    case 'ADD_CARD':
      return { ...state, creditCards: [...state.creditCards, { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_CARD':
      return { ...state, creditCards: state.creditCards.map(c => c.id === action.payload.id ? action.payload : c) }
    case 'DELETE_CARD':
      return { ...state, creditCards: state.creditCards.filter(c => c.id !== action.id) }

    // Append a spend-log entry and roll the amount into the card's total.
    case 'LOG_SPEND':
      return {
        ...state,
        creditCards: state.creditCards.map(c => {
          if (c.id !== action.cardId) return c
          const entry = { id: crypto.randomUUID(), ...action.entry }
          return {
            ...c,
            spendLog: [...(c.spendLog ?? []), entry],
            currentSpend: Math.max(0, (Number(c.currentSpend) || 0) + (Number(entry.amount) || 0)),
          }
        }),
      }
    case 'DELETE_SPEND_ENTRY':
      return {
        ...state,
        creditCards: state.creditCards.map(c => {
          if (c.id !== action.cardId) return c
          const entry = (c.spendLog ?? []).find(e => e.id === action.entryId)
          if (!entry) return c
          return {
            ...c,
            spendLog: (c.spendLog ?? []).filter(e => e.id !== action.entryId),
            currentSpend: Math.max(0, (Number(c.currentSpend) || 0) - (Number(entry.amount) || 0)),
          }
        }),
      }

    case 'ADD_ACCOUNT':
      return { ...state, bankAccounts: [...state.bankAccounts, { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_ACCOUNT':
      return { ...state, bankAccounts: state.bankAccounts.map(a => a.id === action.payload.id ? action.payload : a) }
    case 'DELETE_ACCOUNT':
      return { ...state, bankAccounts: state.bankAccounts.filter(a => a.id !== action.id) }

    case 'ADD_APPLICATION':
      return { ...state, applications: [...(state.applications ?? []), { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_APPLICATION':
      return { ...state, applications: (state.applications ?? []).map(a => a.id === action.payload.id ? action.payload : a) }
    case 'DELETE_APPLICATION':
      return { ...state, applications: (state.applications ?? []).filter(a => a.id !== action.id) }
    // Approval → tracked card, linked back to the application, in one dispatch.
    case 'CONVERT_APPLICATION': {
      const cardId = crypto.randomUUID()
      return {
        ...state,
        creditCards: [...state.creditCards, { ...action.card, id: cardId }],
        applications: (state.applications ?? []).map(a =>
          a.id === action.applicationId
            ? { ...a, status: 'approved', decisionDate: a.decisionDate || action.card.openDate, convertedCardId: cardId }
            : a
        ),
      }
    }

    case 'ADD_POINTS_BALANCE':
      return { ...state, pointsBalances: [...(state.pointsBalances ?? []), { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_POINTS_BALANCE':
      return { ...state, pointsBalances: (state.pointsBalances ?? []).map(b => b.id === action.payload.id ? action.payload : b) }
    case 'DELETE_POINTS_BALANCE':
      return { ...state, pointsBalances: (state.pointsBalances ?? []).filter(b => b.id !== action.id) }

    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_MEMBER':
      return { ...state, members: state.members.map(p => p.id === action.payload.id ? action.payload : p) }
    case 'DELETE_MEMBER': {
      if (state.members.length <= 1) return state
      return { ...state, members: state.members.filter(p => p.id !== action.id) }
    }

    case 'UPDATE_SENIOR_INCOME':
      return { ...state, seniorIncome: { ...state.seniorIncome, [action.memberId]: action.payload } }

    case 'ADD_EXTERNAL_PAYMENT':
      return { ...state, externalPayments: [...state.externalPayments, { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_EXTERNAL_PAYMENT':
      return { ...state, externalPayments: state.externalPayments.map(p => p.id === action.payload.id ? action.payload : p) }
    case 'DELETE_EXTERNAL_PAYMENT':
      return { ...state, externalPayments: state.externalPayments.filter(p => p.id !== action.id) }

    case 'SET_TAX_YEAR':
      return { ...state, taxYear: action.year }
    case 'SET_TAX_BRACKET':
      return { ...state, settings: { ...state.settings, taxBracket: action.bracket } }
    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }

    // ── Action-item notification state (synced across devices) ──────────────
    case 'DISMISS_ACTION':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          dismissed: { ...state.notifications.dismissed, [action.id]: new Date().toISOString() },
        },
      }
    case 'RESTORE_ACTION': {
      const dismissed = { ...state.notifications.dismissed }
      const snoozed = { ...state.notifications.snoozed }
      delete dismissed[action.id]
      delete snoozed[action.id]
      return { ...state, notifications: { ...state.notifications, dismissed, snoozed } }
    }
    case 'SNOOZE_ACTION':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          snoozed: { ...state.notifications.snoozed, [action.id]: action.until },
        },
      }
    // Mark the current live items as seen and prune state for items that no
    // longer exist, so the maps can't grow without bound.
    case 'MARK_NOTIFICATIONS_SEEN': {
      const live = new Set(action.liveIds ?? [])
      const prune = (obj) => Object.fromEntries(Object.entries(obj ?? {}).filter(([id]) => live.has(id)))
      return {
        ...state,
        notifications: {
          seen: [...live],
          dismissed: prune(state.notifications.dismissed),
          snoozed: prune(state.notifications.snoozed),
        },
      }
    }
    // One-time import of per-device dismissals from the old localStorage model.
    case 'MIGRATE_DISMISSED': {
      const now = new Date().toISOString()
      const merged = { ...state.notifications.dismissed }
      for (const id of action.ids ?? []) merged[id] = merged[id] ?? now
      return { ...state, notifications: { ...state.notifications, dismissed: merged } }
    }

    default:
      return state
  }
}

const LS_LEGACY_DISMISSED = 'churner_dismissed_actions'

export function ChurnProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const gist = useGist()
  const loadDone = useRef(false)
  const [ready, setReady] = useReducer(() => true, false)

  useEffect(() => {
    if (gist.isConfigured) {
      gist.loadFromGist().then(data => {
        if (data) dispatch({ type: 'LOAD_STATE', payload: data })
        // Merge dismissals stored by the old per-device model, then drop them.
        try {
          const legacy = JSON.parse(localStorage.getItem(LS_LEGACY_DISMISSED))
          if (Array.isArray(legacy) && legacy.length) {
            dispatch({ type: 'MIGRATE_DISMISSED', ids: legacy })
          }
          localStorage.removeItem(LS_LEGACY_DISMISSED)
        } catch { /* ignore */ }
        loadDone.current = true
        setReady()
      })
    } else {
      loadDone.current = true
      setReady()
    }
  }, [gist.isConfigured])

  const save = useCallback((nextState) => {
    gist.saveToGist(nextState)
  }, [gist.saveToGist])

  useEffect(() => {
    if (!gist.isConfigured || !loadDone.current) return
    save(state)
  }, [state])

  return (
    <ChurnContext.Provider value={{ state, dispatch, gist, ready }}>
      {children}
    </ChurnContext.Provider>
  )
}

export function useChurn() {
  const ctx = useContext(ChurnContext)
  if (!ctx) throw new Error('useChurn must be inside ChurnProvider')
  return ctx
}
