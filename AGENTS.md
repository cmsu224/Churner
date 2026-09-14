# Project guidance for AI assistants

This is **Churner**, a four-person churning management dashboard (React 19 + Vite + Tailwind, synced via a private GitHub Gist).

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

- The GitHub PAT is stored in `localStorage` only — never commit it, never write it into the Gist data.
- User churning data is personal and private; never commit real user data (cards, accounts, credit-report contents) to the repo.
- The PAT needs only the `gist` scope.

## Conventions

- Match the surrounding code style; no TypeScript.
- State lives in `src/store/ChurnContext.jsx` (`useReducer` + Context); data sync in `src/hooks/useGist.js`.
- Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml` (Pages source = "GitHub Actions").
