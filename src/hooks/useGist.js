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

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// GitHub marks contents responses `max-age=60`, so a plain fetch can be served
// from the browser cache — a read right after a save would see the file as it
// was before that save. Always bypass the HTTP cache for sync reads.
async function readRepoFile() {
  const res = await fetch(`${repoUrl()}?ref=${encodeURIComponent(branch())}`, { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error(`GitHub repository API ${res.status}: ${res.statusText}`)
  const data = await res.json()
  return { sha: data.sha, content: decodeBase64(data.content) }
}

export function useGist() {
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(null)
  const [error, setError] = useState(null)
  const saveTimer = useRef(null)
  // A debounce prevents bursts before a save starts; this queue prevents a
  // second burst from starting while the first network write is still in
  // flight. Without both, two PUTs can read the same blob SHA and the loser
  // reports a conflict after the winner has already saved successfully.
  const saveQueue = useRef(Promise.resolve())
  const queuedSaves = useRef(0)
  // Blob SHA of the repository file this tab last loaded or wrote. Saves send
  // it straight to GitHub, which rejects the PUT if anyone else has committed
  // since — an authoritative check that, unlike comparing against a fresh
  // read, can't be fooled by a cached or not-yet-replicated response. Kept
  // per tab (not in localStorage) so one tab's save can't vouch for another.
  const repoSha = useRef(null)

  const isConfigured = !!(pat() && (backend() === 'repo' ? repo() : gistId()))

  const loadFromGist = useCallback(async () => {
    if (!isConfigured) return null
    try {
      setSyncing(true)
      setError(null)
      let content
      if (backend() === 'repo') {
        const file = await readRepoFile()
        repoSha.current = file.sha
        content = file.content
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
    const content = JSON.stringify(state, null, 2)
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      queuedSaves.current += 1
      setSyncing(true)

      const persist = async () => {
        setError(null)
        if (backend() === 'repo') {
          let sha = repoSha.current
          if (sha && localStorage.getItem(LS_CACHE) === content) return
          if (!sha) {
            // No trusted SHA (the startup load failed and fell back to the
            // cache). Read one, and don't overwrite a remote that no longer
            // matches the cache this client's state was built from.
            const current = await readRepoFile()
            if (current.content === content) { repoSha.current = current.sha; return }
            const cached = localStorage.getItem(LS_CACHE)
            if (cached && current.content !== cached) {
              throw new Error('Repository changed elsewhere. Reload before saving again.')
            }
            sha = current.sha
          }

          const res = await fetch(repoUrl(), {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({
              message: 'Update Churner data',
              content: encodeBase64(content),
              sha,
              branch: branch(),
            }),
          })
          if (res.ok) {
            repoSha.current = (await res.json()).content.sha
            return
          }
          if (res.status !== 409 && res.status !== 422) {
            throw new Error(`Repository save failed: ${res.status}`)
          }
          // Our SHA is out of date, so someone else committed. If they wrote
          // this exact snapshot it's already safely remote; otherwise preserve
          // their data and ask this client to reload. GitHub can briefly serve
          // the pre-write version, so a read still showing our own SHA is
          // retried rather than trusted.
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const latest = await readRepoFile()
            if (latest.content === content) { repoSha.current = latest.sha; return }
            if (latest.sha !== sha) break
            await wait(750 * (attempt + 1))
          }
          throw new Error('Repository changed elsewhere. Reload before saving again.')
        } else {
          const res = await fetch(`https://api.github.com/gists/${gistId()}`, {
            method: 'PATCH',
            headers: headers(),
            body: JSON.stringify({ files: { [FILENAME]: { content } } }),
          })
          if (!res.ok) throw new Error(`Gist save failed: ${res.status}`)
        }
      }

      const run = async () => {
        try {
          await persist()
          localStorage.setItem(LS_CACHE, content)
          setLastSynced(new Date().toISOString())
        } catch (e) {
          setError(e.message)
        } finally {
          queuedSaves.current -= 1
          if (queuedSaves.current === 0) setSyncing(false)
        }
      }

      // Keep the queue usable even if an unexpected error escaped a previous
      // save. `run` normally handles its own errors, but the rejection handler
      // also protects future writes from a poisoned promise chain.
      saveQueue.current = saveQueue.current.then(run, run)
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
