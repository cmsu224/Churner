// Credential storage that keeps the GitHub PAT out of localStorage on native.
//
// The web app read the PAT/Gist ID straight from localStorage on every render.
// On device we instead keep them in the OS keystore (Keychain / Android
// Keystore) via @aparajita/capacitor-secure-storage — but that API is async,
// while ChurnContext and useGist need the values *synchronously*. So we hydrate
// once at boot into an in-memory cache and expose synchronous getters. The
// public useGist surface is unchanged; only the persistence backend moves.
import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

const LS_PAT = 'churner_pat'
const LS_GIST = 'churner_gist_id'

const isNative = Capacitor.isNativePlatform()

// Synchronously-readable copy of the credentials, filled by hydrateCredentials().
const cache = { pat: '', gistId: '' }

async function secureGet(key) {
  try { return (await SecureStorage.getItem(key)) ?? '' } catch { return '' }
}
async function secureSet(key, val) {
  try { await SecureStorage.setItem(key, val) } catch { /* ignore */ }
}
async function secureRemove(key) {
  try { await SecureStorage.removeItem(key) } catch { /* ignore */ }
}

// Load credentials into the in-memory cache. Must be awaited once before the
// first React render so gist.isConfigured is correct on mount.
export async function hydrateCredentials() {
  if (!isNative) {
    cache.pat = localStorage.getItem(LS_PAT) ?? ''
    cache.gistId = localStorage.getItem(LS_GIST) ?? ''
    return
  }

  cache.pat = await secureGet(LS_PAT)
  cache.gistId = await secureGet(LS_GIST)

  // One-time migration: an earlier native build may have left the PAT in the
  // WebView's localStorage. Move it into the keystore, then wipe the plaintext.
  if (!cache.pat) {
    const legacyPat = localStorage.getItem(LS_PAT)
    if (legacyPat) {
      cache.pat = legacyPat
      cache.gistId = cache.gistId || (localStorage.getItem(LS_GIST) ?? '')
      await secureSet(LS_PAT, cache.pat)
      if (cache.gistId) await secureSet(LS_GIST, cache.gistId)
    }
  }
  // The keystore is now the source of truth on native — never leave the PAT in
  // localStorage.
  localStorage.removeItem(LS_PAT)
  localStorage.removeItem(LS_GIST)
}

export function getCachedPat() { return cache.pat }
export function getCachedGistId() { return cache.gistId }

// Update credentials everywhere: the in-memory cache immediately (so a
// re-render sees them), then the persistent store. Returns a promise so callers
// that reload the page can await the write first.
export async function persistCredentials(pat, gistId) {
  cache.pat = pat ?? ''
  cache.gistId = gistId ?? ''
  if (isNative) {
    await secureSet(LS_PAT, cache.pat)
    await secureSet(LS_GIST, cache.gistId)
  } else {
    localStorage.setItem(LS_PAT, cache.pat)
    localStorage.setItem(LS_GIST, cache.gistId)
  }
}

// Wipe credentials from memory and every store. Always clears localStorage too
// (harmless on native, required on web).
export async function clearCredentials() {
  cache.pat = ''
  cache.gistId = ''
  if (isNative) {
    await secureRemove(LS_PAT)
    await secureRemove(LS_GIST)
  }
  localStorage.removeItem(LS_PAT)
  localStorage.removeItem(LS_GIST)
}
