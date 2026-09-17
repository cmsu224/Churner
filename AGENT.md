# AGENT Context

## Current Session State

| Last working on | Last file edited | Next step | Pending |
|---|---|---|---|
| 2026-09-17 (later): bank accounts 'Recommended' sort (default, `getAccountAttentionScore` in engines/lifecycle.js); add-account form shows monthly fee + waiver fields; Money Map 'It landed' also clears `check_dd` check-backs. Mirrored from ChurnPilot. Earlier: card DD deadline hidden once bonus paid or all DDs logged (was showing OVERDUE on Capital One); synced ChurnPilot's tabbed compact editor (`shared/CompactEditor.jsx` + css, bank/issuer dropdowns) into AccountItem + CardItem; two-app rule added. Earlier: fee waiver by debit swipes | `src/components/BankAccounts/BankAccountsView.jsx`, `src/engines/lifecycle.js`, `src/engines/reminders.js` | none | Fee cycle day unknown for WF/Republic (month end assumed) |

---

## Goal & Project Overview

**Churner** is a multi-person (up to 4 players: P1–P4) churning management dashboard designed to track credit card sign-up bonuses, bank account bonuses, churning eligibility rules (Chase 5/24, Amex lifetime/family language, Citi 24/48mo, CapOne velocity, BofA rules, ChexSystems, etc.), keep-alive / fee schedules, money movement pipeline / simulator, and earnings & tax tracking.

Built with **React 19 + Vite + Tailwind CSS**, backed by a `useReducer` Context state (`src/store/ChurnContext.jsx`), and synced privately across devices through GitHub (`src/hooks/useGist.js`). `useGist.js` supports **two** sync backends: a GitHub **repository** backend (the current default) and the original **Gist** backend. The default repository-backed data source is `cmsu224/Churning-database/main/churner-data.json`; GitHub Gist remains fully supported as an alternate backend.

---

## Project Structure

- `src/`
  - `main.jsx` / `App.jsx` — Entry point, root providers, theme and modal management.
  - `index.css` — Base Tailwind styling, custom scrollbars, animations.
  - `registerSW.js` — Service worker registration for PWA capabilities.
  - `components/`
    - `layout/` — `AppShell.jsx`, `NavBar.jsx`, `Header.jsx`, `MobileNav.jsx`.
    - `shared/` — Reusable UI primitives (`Modal.jsx`, `Badge.jsx`, `Card.jsx`, `Button.jsx`, `Field.jsx`, etc.).
    - `Dashboard/` — Main dashboard showing summary metrics, urgent action items, player status.
    - `CreditCards/` — Card tracker, card drawer/modals, bonus status, keep-alive tracking.
    - `BankAccounts/` — Bank account tracker, deposit requirements, bonus progress, hold periods.
    - `AnnualFees/` — Annual fee calendar, retention call tracker, downgrade/cancellation advisor.
    - `Earnings/` — Net bonus earnings, fee offset calculations, breakdown by player/year.
    - `Timeline/` — Visual interactive churning timeline & milestones.
    - `Rules/` — Rule matrix & eligibility checkers (5/24, ChexSystems, velocity per issuer).
    - `MoneyMap/` — Interactive node/flow visualizer and transfer simulator across accounts:
      - `FlowDiagram.jsx` — SVG flow ribbon renderer with drag-and-drop card positioning, member badges (`[● Me]`), and custom accent colors.
      - `NodeEditModal.jsx` — In-map editor for bank accounts and cash sources (name, balance/amount, color swatches/hex, type, member, hub, requirements).
      - `TransferSheet.jsx` — Mobile bottom sheet for tap-driven money transfers and node editing.
      - `QuickTransferBar.jsx` — Keyboard-first push logger with natural language parsing.
      - `TransferList.jsx` — In-flight & landed transfer ledger.
      - `ReminderBoard.jsx` — Check-back reminders board.
      - `CashSourceEditor.jsx` — Cash sources management panel.
      - `ReconcileStrip.jsx` — Balance vs ledger mismatch detector and one-tap reconciliation.
    - `Applications/` — Application queue & pending app tracker.
    - `Points/` — Points and miles balances, valuation estimates, transfer partner directory.
    - `Tax/` — 1099-INT prediction and tax reporting estimator for bank bonuses.
    - `Players/` — Player profile management (P1-P4: names, colors, SSN/TIN hints, credit scores).
    - `Simulator/` — "What If" application simulator checking eligibility before applying.
    - `ImportExport/` — Data backup, JSON export/import, and GitHub repository/Gist sync configuration.
    - `Settings/` — User preferences, theme toggle, and GitHub sync/PAT setup.
  - `engines/` — Pure logic engines calculating churning rules and action items:
    - `actionItems.js` — Aggregates all urgent / upcoming action items across all modules.
    - `moneyFlow.js` — Builds Money Map graph, ribbons, reconciliation, `reorderNode` for drag-and-drop, member-aware node building and quick transfer matching.
    - `chase524.js` — Chase 5/24 status and slot roll-off calculator.
    - `chexSystems.js` — ChexSystems inquiry count / window tracker.
    - `amex.js`, `bofa.js`, `capitalone.js`, `citi.js` — Issuer-specific application rules.
    - `bankEligibility.js`, `bankReeligibility.js` — Bank bonus eligibility rules & re-application windows.
    - `monthlyFee.js` — Monthly maintenance fee while an account is held: waiver by balance and/or monthly DD, statement-cycle math, send-by date (cycle end − 5d), per-cycle reminders.
    - `debitCard.js` — Debit-card requirement on a bank bonus: purchase count, per-purchase qualifying minimum, cumulative debit spend, and the deadline (its own window, else the direct-deposit window, else the bonus window).
    - `cardReeligibility.js` — Card bonus reset windows (e.g., Sapphire 48mo).
    - `annualFees.js`, `cancelGuidance.js`, `clawbackShield.js` — Fee alerts & safe cancellation timing.
    - `earnings.js`, `taxPredictor.js` — Financial calculations and tax estimations.
    - `burnRate.js`, `seniorIncome.js` — Fund movement, minimum balance buffers.
    - `events.js`, `reminders.js`, `creditAge.js`, `lifecycle.js`, `whatIf.js` — Simulation and event generation.
  - `store/`
    - `ChurnContext.jsx` — Core state store with reducers for players, cards, bank accounts, settings.
  - `hooks/`
    - `useGist.js` — GitHub synchronization engine (bidirectional sync). Supports both backends: `repo` (default, `cmsu224/Churning-database/main/churner-data.json`) and `gist`.
    - `useActionItems.js` — Hook for reactive action items list.
    - `useHighlight.js`, `useLogTransfer.js`, `useTheme.js` — UI utility hooks.
  - `data/`
    - `initialState.js` — Default initial state structure.
  - `utils/`
    - `format.js` — Currency, date, and string formatting helpers.
    - `issuers.js`, `programs.js` — Issuer metadata, loyalty programs, logos, rules.
    - `ics.js` — Calendar (.ics) export generator.
    - `statusMeta.js` — Status badge helpers and color mappings.

---

## Key Decisions & Conventions

- **Two-app rule (always)**: any functional change here (engines, components, data fields, import prompt) must be made in ChurnPilot too (`C:\git\Personal Projects\Churning app\mobile\src`) in the same task, and the reverse. Engines are copied verbatim (tests live in ChurnPilot `src/rules/engine.test.ts`); UI files differ in layout (mobile has tabbed editors) so port the logic by hand there. GitHub sync stays web-only; Capacitor/trial/billing stay mobile-only.
- **Privacy Constraint**: GitHub PAT is stored in `localStorage` only; no personal churner data in the public application repo. Live personal state is stored separately — in the private `cmsu224/Churning-database` repository on the repository backend, or in a private Gist on the Gist backend.
- **Single Source of Truth**: Keep `README.md` in sync whenever adding/modifying engines, pages, rules, or data models.
- **Git workflow**: Work directly on `main`.
