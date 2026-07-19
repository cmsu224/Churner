# Project guidance for AI assistants

This is **Churner**, a four-person churning management dashboard (React 19 + Vite + Tailwind, synced via a private GitHub Gist).

## ⚠️ You are on the mobile (Capacitor) branch — read `docs/MOBILE.md` first

This branch (`claude/capacitor-mobile-migration-2yszl9`) is the **permanent native
Android + iOS app**, kept separate from `main` (the web dashboard that deploys to
GitHub Pages). **Before doing any work here, read [`docs/MOBILE.md`](docs/MOBILE.md)** —
it defines the branch model, the merge-from-`main` workflow, and the native-seam
rules. Hard rules on this branch:

- **Merges flow one way only: `main` → this branch. NEVER merge this branch into
  `main`** (it would pull `android/`, `ios/`, and Capacitor deps into the web deploy).
- **After any web-code change or merge, run `npm install && npm run sync:mobile`** —
  the native apps don't pick up JS changes without `cap sync`.
- **Route platform features through the native helpers, never raw browser APIs:**
  secrets → `src/native/credentials.js` (Keychain/Keystore, never `localStorage`);
  file export → `saveOrShare()` and clipboard → `copyText()` in
  `src/utils/exportFile.js`; notifications → `src/native/notifications.js`. All are
  guarded by `Capacitor.isNativePlatform()`, so the web path is unchanged.
- **Keep `src/engines/*.js` and `src/store/ChurnContext.jsx` untouched**, and keep
  the web build byte-for-byte identical (the `CAPACITOR` flag in `vite.config.js`
  is the only base-path switch).

## Non-negotiable rule: keep the README in sync

`README.md` is the canonical, detailed feature list for this project and **must be updated in the same change as any feature work.** Treat README updates as part of the definition of done.

Update the README whenever you:
- add, change, or remove a **page/route** (`src/components/.../*View.jsx`, `AppShell.jsx`, `NavBar.jsx`)
- add, change, or remove an **engine** (`src/engines/*.js`) or any of its rules/thresholds (e.g. issuer windows, clawback days, keep-alive day cutoffs, annual-fee refund window)
- add, change, or remove an **action-item type** in `src/engines/actionItems.js`
- add or remove a **tracked field** on cards or bank accounts (also update the Data Model section)
- change **data sync**, **privacy**, or **deployment** behavior

After editing features, re-read the affected section of the README and reconcile it with the code so descriptions, field lists, and rule numbers stay accurate.

## Privacy constraints (never weaken these)

- The GitHub PAT is stored client-side only — never commit it, never write it into the Gist data. On **web** that's `localStorage`; on the **native mobile app** it's the OS secure store (Keychain/Keystore), never `localStorage` (see `src/native/credentials.js`).
- User churning data is personal and private; never commit real user data (cards, accounts, credit-report contents) to the repo.
- The PAT needs only the `gist` scope.

## Conventions

- Match the surrounding code style; no TypeScript.
- State lives in `src/store/ChurnContext.jsx` (`useReducer` + Context); data sync in `src/hooks/useGist.js`.
- Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml` (Pages source = "GitHub Actions").
