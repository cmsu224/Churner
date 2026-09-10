import { useState, useCallback, useRef } from 'react'

const LS_PAT = 'churner_pat'
const LS_GIST = 'churner_gist_id'
const LS_CACHE = 'churner_cache'
const LS_BACKEND = 'churner_sync_backend'
const LS_REPO = 'churner_repo'
const LS_BRANCH = 'churner_repo_branch'
const LS_PATH = 'churner_repo_path'
const FILENAME = 'churner-data.json'
const DEFAULT_REPO = 'cmsu224/Churning-database'

const pat = () => localStorage.getItem(LS_PAT) ?? ''
const gistId = () => localStorage.getItem(LS_GIST) ?? ''
const backend = () => localStorage.getItem(LS_BACKEND) || (gistId() ? 'gist' : 'repo')
const repo = () => localStorage.getItem(LS_REPO) || DEFAULT_REPO
const branch = () => localStorage.getItem(LS_BRANCH) || 'main'
const filePath = () => localStorage.getItem(LS_PATH) || FILENAME

const headers = () => ({
  Authorization: `Bearer ${pat()}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
})

const repoUrl = () => {
  const encodedPath = filePath().split('/').map(encodeURIComponent).join('/')
  return `https://api.github.com/repos/${repo()}/contents/${encodedPath}`
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function useGist() {
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)
  const saveTimer = useRef(null)

  const isConfigured = !!(pat() && (backend() === 'repo' ? repo() : gistId()))

  const loadFromGist = useCallback(async () => {
    if (!isConfigured) return null
    try {
      setSyncing(true)
      setError(null)
      let content
      if (backend() === 'repo') {
        const res = await fetch(`${repoUrl()}?ref=${encodeURIComponent(branch())}`, { headers: headers() })
        if (!res.ok) throw new Error(`GitHub repository API ${res.status}: ${res.statusText}`)
        const data = await res.json()
        content = decodeBase64(data.content)
      } else {
        const res = await fetch(`https://api.github.com/gists/${gistId()}`, { headers: headers() })
        if (!res.ok) throw new Error(`GitHub Gist API ${res.status}: ${res.statusText}`)
        const data = await res.json()
        const file = data.files?.[FILENAME]
        if (!file) return null
        content = file.content
      }
      const parsed = JSON.parse(content)
      localStorage.setItem(LS_CACHE, content)
      setLastSynced(new Date().toISOString())
      return parsed
    } catch (e) {
      setError(e.message)
      const cached = localStorage.getItem(LS_CACHE)
      return cached ? JSON.parse(cached) : null
    } finally {
      setSyncing(false)
    }
  }, [isConfigured])

  const saveToGist = useCallback(async (state) => {
    if (!isConfigured) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        setSyncing(true)
        setError(null)
        const content = JSON.stringify(state, null, 2)
        if (backend() === 'repo') {
          const read = await fetch(`${repoUrl()}?ref=${encodeURIComponent(branch())}`, { headers: headers() })
          if (!read.ok) throw new Error(`Repository read failed: ${read.status}`)
          const current = await read.json()
          const res = await fetch(repoUrl(), {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({
              message: 'Update Churner data',
              content: encodeBase64(content),
              sha: current.sha,
              branch: branch(),
            }),
          })
          if (!res.ok) throw new Error(`Repository save failed: ${res.status}`)
        } else {
          const res = await fetch(`https://api.github.com/gists/${gistId()}`, {
            method: 'PATCH',
            headers: headers(),
            body: JSON.stringify({ files: { [FILENAME]: { content } } }),
          })
          if (!res.ok) throw new Error(`Gist save failed: ${res.status}`)
        }
        localStorage.setItem(LS_CACHE, content)
        setLastSynced(new Date().toISOString())
      } catch (e) {
        setError(e.message)
      } finally {
        setSyncing(false)
      }
    }, 1500)
  }, [isConfigured])

  const createNewGist = useCallback(async (tokenArg) => {
    const token = tokenArg || pat()
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
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
    localStorage.setItem(LS_PAT, token)
    localStorage.setItem(LS_GIST, id)
    localStorage.setItem(LS_BACKEND, 'gist')
  }, [])

  const configureRepository = useCallback((token, repository, repoBranch = 'main', path = FILENAME) => {
    localStorage.setItem(LS_PAT, token)
    localStorage.setItem(LS_BACKEND, 'repo')
    localStorage.setItem(LS_REPO, repository)
    localStorage.setItem(LS_BRANCH, repoBranch)
    localStorage.setItem(LS_PATH, path)
  }, [])

  const disconnect = useCallback(() => {
    ;[LS_PAT, LS_GIST, LS_CACHE, LS_BACKEND, LS_REPO, LS_BRANCH, LS_PATH]
      .forEach(key => localStorage.removeItem(key))
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
    configureRepository,
    disconnect,
    getGistId: gistId,
    getPat: pat,
    getSyncConfig: () => ({ backend: backend(), repo: repo(), branch: branch(), path: filePath() }),
  }
}
