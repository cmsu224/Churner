import { useState, useCallback, useRef } from 'react'
import {
  getCachedPat, getCachedGistId, persistCredentials, clearCredentials,
} from '../native/credentials'

const LS_CACHE = 'churner_cache'
const FILENAME = 'churner-data.json'

export function useGist() {
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)
  const saveTimer = useRef(null)

  // Credentials live in the secure store on native and localStorage on web,
  // fronted by a synchronous in-memory cache (see native/credentials.js).
  const pat = () => getCachedPat()
  const gistId = () => getCachedGistId()
  const isConfigured = !!(pat() && gistId())

  const headers = () => ({
    Authorization: `token ${pat()}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  })

  const loadFromGist = useCallback(async () => {
    const id = gistId()
    if (!id || !pat()) return null
    try {
      setSyncing(true)
      setError(null)
      const res = await fetch(`https://api.github.com/gists/${id}`, { headers: headers() })
      if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
      const data = await res.json()
      const file = data.files?.[FILENAME]
      if (!file) return null
      const parsed = JSON.parse(file.content)
      localStorage.setItem(LS_CACHE, file.content)
      setLastSynced(new Date().toISOString())
      return parsed
    } catch (e) {
      setError(e.message)
      const cached = localStorage.getItem(LS_CACHE)
      return cached ? JSON.parse(cached) : null
    } finally {
      setSyncing(false)
    }
  }, [])

  const saveToGist = useCallback(async (state) => {
    const id = gistId()
    if (!id || !pat()) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        setSyncing(true)
        setError(null)
        const content = JSON.stringify(state, null, 2)
        const res = await fetch(`https://api.github.com/gists/${id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ files: { [FILENAME]: { content } } }),
        })
        if (!res.ok) throw new Error(`Save failed: ${res.status}`)
        localStorage.setItem(LS_CACHE, content)
        setLastSynced(new Date().toISOString())
      } catch (e) {
        setError(e.message)
      } finally {
        setSyncing(false)
      }
    }, 1500)
  }, [])

  const createNewGist = useCallback(async (tokenArg) => {
    const token = tokenArg || pat()
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Churner Data',
        public: false,
        files: { [FILENAME]: { content: '{}' } },
      }),
    })
    if (!res.ok) throw new Error(`Create gist failed: ${res.status}`)
    const data = await res.json()
    return data.id
  }, [])

  const configure = useCallback((token, id) => {
    // Returns a promise so callers that reload afterwards can await the write
    // (secure-store writes are async on native).
    return persistCredentials(token, id)
  }, [])

  const disconnect = useCallback(() => {
    localStorage.removeItem(LS_CACHE)
    return clearCredentials()
  }, [])

  return {
    syncing,
    lastSynced,
    error,
    isConfigured,
    loadFromGist,
    saveToGist,
    createNewGist,
    configure,
    disconnect,
    getGistId: gistId,
    getPat: pat,
  }
}
