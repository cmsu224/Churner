# Mobile (Capacitor) branch — how it works & how to keep it in sync

This branch — **`claude/capacitor-mobile-migration-2yszl9`** — is the **permanent
native Android + iOS app**. It wraps the exact same React/Vite web app in a
Capacitor WebView. It is intentionally kept **separate from `main`**, which stays
the web dashboard that deploys to GitHub Pages.

> **This is both a human guide and the spec AI agents must follow when working on
> this branch.** If you are an AI assistant, read this file in full before making
> changes here. `CLAUDE.md` points you here on purpose.

---

## The two-branch model

| Branch | Purpose | Deploys |
|---|---|---|
| `main` | Web dashboard | GitHub Pages (`.github/workflows/deploy.yml`, on push to `main`) |
| `claude/capacitor-mobile-migration-2yszl9` | Native Android + iOS app | Built locally from this branch (Android Studio / Xcode) |

**Golden rule — changes flow ONE WAY only:**

```
main  ───►  mobile branch        ✅  pull web fixes/features in
main  ◄───  mobile branch        ❌  NEVER — this would dump android/, ios/,
                                     and Capacitor deps into your web deploy
```

Never open a PR from this branch into `main`, and never merge it into `main`.
The web deploy only runs on push to `main`, so nothing you do here touches the
live dashboard.

---

## "Can I just pull `main`'s changes in and it works?"

**Mostly yes** — for the large majority of web changes (new pages, engines,
components, styling, README edits). But "just works" has **two required steps and
one judgment call**. Follow the workflow below every time.

### The merge workflow

```bash
# 1. Get onto the mobile branch with a clean tree
git checkout claude/capacitor-mobile-migration-2yszl9
git status                      # make sure nothing uncommitted

# 2. Pull in the latest main
git fetch origin main
git merge origin/main           # resolve any conflicts (see "seam files" below)

# 3. MANDATORY: refresh deps + push the new web build into the native shells
npm install                     # in case main added/changed dependencies
npm run sync:mobile             # rebuild (relative base) + `cap sync` both platforms

# 4. Rebuild on device to verify
npm run open:android            # Android Studio → Run
#   (macOS) cd ios/App && pod install && cd - ; npm run open:ios

# 5. Commit the merge (+ any lockfile/native changes) and push
git push origin claude/capacitor-mobile-migration-2yszl9
```

**Step 3 is the one people forget.** The native apps ship a *copy* of the built
web bundle inside `android/` and `ios/`. Editing (or merging) JS changes nothing
on device until `npm run sync:mobile` rebuilds and `cap sync` copies it in.

---

## Which files conflict on a merge (the "seam" files)

New files the mobile branch added are **mobile-only** and never conflict:
`src/native/credentials.js`, `src/native/notifications.js`,
`src/utils/exportFile.js`, `capacitor.config.json`, `android/`, `ios/`.

These existing files were **modified** on the mobile branch, so a merge conflicts
here *only if `main` also changed the same lines*. All resolutions are
"keep both intents":

| File | Why the mobile branch changed it |
|---|---|
| `package.json` / `package-lock.json` | Capacitor deps + `build:mobile` / `sync:mobile` scripts. On lockfile conflict, take either side then re-run `npm install`. |
| `vite.config.js` | Conditional base: `'/Churner/'` for web, `'./'` when `CAPACITOR=1`. Keep the conditional. |
| `eslint.config.js` | Ignores `android`/`ios`; Node globals for config files. |
| `.gitignore` | Ignores native build output / CocoaPods. |
| `README.md` | Mobile App section + native notes. Keep both sides' additions. |
| `CLAUDE.md` | The mobile-branch pointer section. Keep it. |
| `src/main.jsx` | Awaits `hydrateCredentials()` before first render. |
| `src/hooks/useGist.js` | Credential backend swapped to the secure store (same public API). |
| `src/hooks/useActionItems.js` | Native local-notification scheduling. |
| `src/components/Settings/SettingsView.jsx` | Native permission flow + reads PAT via `gist.getPat()`. |
| `src/components/layout/AppShell.jsx` | `await gist.disconnect()` before reload. |
| `src/components/Setup/GistSetup.jsx` | `await gist.configure(...)`. |
| `src/components/Timeline/TimelineView.jsx` | `await downloadIcs(...)`. |
| `src/components/Tax/TaxView.jsx` | Export via `saveOrShare()`. |
| `src/components/ImportExport/ImportExportView.jsx` | Export via `saveOrShare()`, copy via `copyText()`. |
| `src/utils/ics.js` | `downloadIcs` delegates to `saveOrShare()`. |

---

## The judgment call: did the new feature add a NATIVE SEAM?

A change from `main` can **merge cleanly yet still be broken in the app**, because
browser-only APIs don't behave the same inside a native WebView. After every
merge, scan the incoming diff for these patterns and route them through the
existing native helpers (all already guarded by `Capacitor.isNativePlatform()`,
so the web path is unaffected):

| If the new web code does… | …wrap it with |
|---|---|
| Stores a **secret / token / credential** | `src/native/credentials.js` (Keychain/Keystore). **Never** put a secret in `localStorage` on native. (Non-secret prefs like theme/order in `localStorage` are fine.) |
| **Downloads/exports a file** (`Blob` + `<a download>`, `URL.createObjectURL`) | `saveOrShare(filename, text, mimeType)` from `src/utils/exportFile.js` |
| Writes to the **clipboard** (`navigator.clipboard`) | `copyText(text)` from `src/utils/exportFile.js` |
| Fires a **notification** (`new Notification(...)`) | helpers in `src/native/notifications.js` |
| Uses a **new device capability** (camera, files, geolocation, biometrics, haptics…) | add the matching `@capacitor/*` plugin, then `npm run sync:mobile` |

Quick grep to catch new seams in a merge:

```bash
git diff origin/main...HEAD -- src | \
  grep -nE "localStorage|URL\.createObjectURL|navigator\.clipboard|new Notification|document\.createElement\('a'\)"
```

If none of these appear, the merge almost certainly "just works" after
`sync:mobile`. If they do, wrap them before shipping.

---

## Hard invariants (do not break)

1. **One-way merges** — `main` → this branch only.
2. **`src/engines/*.js` and `src/store/ChurnContext.jsx` stay untouched** by mobile
   work. `ChurnContext` reads credentials synchronously; that's why they're
   hydrated into an in-memory cache at boot (`src/native/credentials.js`) instead
   of changing the store.
3. **The web build stays byte-for-byte identical.** The only base-path switch is
   the `CAPACITOR` env flag in `vite.config.js`. Verify with `npm run build`
   (bundle must still resolve under `/Churner/`).
4. **The Gist schema never changes for mobile.** Web and mobile use the same
   `churner-data.json`, so one account can use both interchangeably.
5. **Always `npm run sync:mobile`** after any web-code change or merge.
6. **PAT is never written to `localStorage` on native** — Keychain/Keystore only.

---

## Build & run reference

```bash
npm install
npm run sync:mobile                 # build:mobile (CAPACITOR=1 vite build) + cap sync

# Android  (needs Android Studio + SDK)
npm run open:android
#   headless APK: cd android && ./gradlew assembleDebug   → app/build/outputs/

# iOS  (needs macOS + Xcode + CocoaPods)
cd ios/App && pod install && cd -
npm run open:ios                    # pick a signing team in Xcode, then Run
```

App identity: appId **`com.churner.app`**, name **Churner** (`capacitor.config.json`).

---

## On-device smoke test after a merge

After pulling `main` in and running `sync:mobile`, verify on a device:

- App still boots straight to the dashboard (PAT rehydrated from the keystore).
- Any page/feature the merge touched renders and its data round-trips to the Gist.
- If the merge added a native seam (table above), exercise that path: export
  opens the share sheet, clipboard pastes, notifications fire, etc.
- Notifications: enable in Settings → a due-dated item still schedules a reminder.

Full parity checklist lives in the migration plan; this is the fast pass.
