import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { INITIAL_STATE } from '../data/initialState'
import { useGist } from '../hooks/useGist'

const ChurnContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...INITIAL_STATE, ...action.payload, players: INITIAL_STATE.players }

    case 'ADD_CARD':
      return { ...state, creditCards: [...state.creditCards, { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_CARD':
      return { ...state, creditCards: state.creditCards.map(c => c.id === action.payload.id ? action.payload : c) }
    case 'DELETE_CARD':
      return { ...state, creditCards: state.creditCards.filter(c => c.id !== action.id) }

    case 'ADD_ACCOUNT':
      return { ...state, bankAccounts: [...state.bankAccounts, { ...action.payload, id: crypto.randomUUID() }] }
    case 'UPDATE_ACCOUNT':
      return { ...state, bankAccounts: state.bankAccounts.map(a => a.id === action.payload.id ? action.payload : a) }
    case 'DELETE_ACCOUNT':
      return { ...state, bankAccounts: state.bankAccounts.filter(a => a.id !== action.id) }

    case 'UPDATE_SENIOR_INCOME':
      return { ...state, seniorIncome: { ...state.seniorIncome, [action.playerId]: action.payload } }

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

    default:
      return state
  }
}

export function ChurnProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const gist = useGist()

  useEffect(() => {
    if (gist.isConfigured) {
      gist.loadFromGist().then(data => {
        if (data) dispatch({ type: 'LOAD_STATE', payload: data })
      })
    }
  }, [gist.isConfigured])

  const save = useCallback((nextState) => {
    gist.saveToGist(nextState)
  }, [gist.saveToGist])

  useEffect(() => {
    if (gist.isConfigured) save(state)
  }, [state])

  return (
    <ChurnContext.Provider value={{ state, dispatch, gist }}>
      {children}
    </ChurnContext.Provider>
  )
}

export function useChurn() {
  const ctx = useContext(ChurnContext)
  if (!ctx) throw new Error('useChurn must be inside ChurnProvider')
  return ctx
}
