# SaaS Evolution — work log (temporary; removed before final PR merge)

Task: evolve Churner into a SaaS-grade platform. Workstream A (features A1–A7) + Workstream B
(design system). Branch: `claude/churner-saas-evolution-3kgxxn`. This file is the continuation
log — if a session is interrupted, resume from "NEXT STEPS" below.

## Status checklist

- [x] Audit of full codebase + README
- [x] Foundation 1 (B): design token layer — tailwind.config tokens + CSS custom props,
      retrofit all views off zinc classes, shared atoms (Button/EmptyState/Skeleton/Field/StatCard),
      delete index.css override hack + dead files (App.css, assets/hero.png, react.svg, vite.svg)
- [x] Foundation 2 (A): state shape — applications[], per-card spendLog[], notifications
      {seen,dismissed,snoozed}, settings.pointValueCents + notifyEnabled, card fields
      (bonusCashValue, feeWaivedFirstYear, closedDate), account field (etfDays), reducer actions
      (APPLICATION CRUD, LOG_SPEND, CONVERT_APPLICATION, notification actions), migrateState v3
- [ ] A1 Timeline/Calendar (/timeline) + engines/events.js + utils/ics.js + .ics export
- [ ] A2 Application tracker (/applications) + before-you-apply verdicts + convert-to-card
- [ ] A3 Earnings (/earnings) + engines/earnings.js + SVG charts (load dataviz skill first)
- [ ] A4 Notification center (bell in AppShell) + Browser Notification API + Settings section
- [ ] A5 Command palette (Ctrl/Cmd-K) + highlight-on-jump (?highlight= param in views)
- [x] A6 Spend logging (card spend log UI) + engines/burnRate.js + new action-item type `spend_pace`
- [ ] A7 What-if simulator (/simulator) + engines/whatIf.js (5/24 + velocity forward projection)
- [ ] B retrofit polish: empty/loading/error states, micro-interactions, reduced-motion, a11y,
      responsive; route transitions; Modal focus trap
- [ ] Integration: NavBar (desktop groups; mobile bottom nav Dashboard/Cards/Accounts/Timeline/More
      + new /more hub page), AppShell routes, palette index
- [ ] Verification: lint + build clean; manual feature walk; backward-compat load test (old v2
      state object without new fields)
- [ ] README sync (Feature Catalog sections, Data Model, TOC) — then delete this file, push, PR

## Key design decisions (made autonomously)

- **A7 choice: what-if eligibility simulator** — highest leverage for a 4-person household
  deciding who applies next; builds directly on existing rule engines.
- **Tokens**: CSS custom props on `:root` (light) / `html.dark` (dark), exposed via tailwind
  theme colors: `base surface raised overlay` (bg), `edge edge-strong` (borders),
  `ink ink-secondary ink-muted ink-tertiary ink-faint` (text), `accent accent-hover accent-ink`,
  status `success/warning/danger + -ink` variants. Mechanical mapping from old classes:
  bg-zinc-950→bg-base, 900→surface, 800→raised, 700→overlay; border-zinc-800→edge,
  700/600→edge-strong; text-white→ink, zinc-300→ink-secondary, 400→ink-muted, 500→ink-tertiary,
  600→ink-faint; blue-600 buttons→accent; text-blue-400→accent-ink; emerald/amber/red text →
  success/warning/danger -ink. Light-mode override block in index.css deleted.
- **Dismissals move to synced state** (`notifications.dismissed` map id→ISO) with one-time
  migration from localStorage `churner_dismissed_actions`; snooze = `snoozed` map id→wake ISO.
  Unread badge = critical/warning items not in `seen` list; panel open marks seen (synced,
  pruned to live ids).
- **Earnings valuation**: cashback bonusValue = $ face value; points/miles valued at
  `settings.pointValueCents` (default 1.0¢) unless per-card `bonusCashValue` set. Fees-paid is
  an estimate: anniversaries elapsed while open (respects `feeWaivedFirstYear`, `closedDate`).
- **ETF dates (A1)**: optional `etfDays` account field; clawback 181d remains the main
  safe-to-close signal.
- **Existing engine rule numbers untouched**; whatIf.js/additive exports only.
- Bottom nav (mobile) capped at 5: Dashboard, Cards, Accounts, Timeline, More → /more hub page
  listing everything else.

## Architecture notes for anyone picking this up

- State: `src/store/ChurnContext.jsx` reducer; LOAD_STATE spreads INITIAL_STATE first so new
  top-level keys default automatically; nested `settings`/`notifications` need deep-defaulting in
  migrateState. Whole state syncs via useGist (no per-field sync work needed).
- Card statuses (stored values): Applied, Active Churn, Bonus Met, Keep Alive,
  Downgrade/Close Due, Downgraded, Closed. Labels in utils/statusMeta.js.
- Action items: engines/actionItems.js → {id,type,category,title,detail,dueDate,action,memberId,
  cardId/accountId}; ids stable per card+tier.
- Existing engines: lifecycle (fees/spend/reelig), chase524, amex, citi, bofa, capitalone,
  cardReeligibility (per-product families), bankEligibility, creditAge, clawbackShield (181d),
  taxPredictor, seniorIncome.
- index.html applies `.dark` class pre-render; keep inline fallback colors in sync.

## NEXT STEPS (updated after subagents hit usage limits mid-flight)

Subagents for A1/A2/A3/A7 were killed by session limits; their PARTIAL output is committed:
- A1: engines/events.js + utils/ics.js + Timeline/TimelineView.jsx exist (agent had smoke-tested
  events.js; ics.js untested) — REVIEW all three, fix, wire.
- A2: Applications/RuleCheckPanel.jsx + ApplicationItem.jsx exist; **ApplicationsView.jsx is
  MISSING — write it** (spec: PageHeader+Add form+member/status filters+pipeline StatCards+
  in-flight/decided groups, ?add=1 + useHighlight, docs/AGENT_BRIEF.md has full field list).
- A3: engines/earnings.js + Earnings/charts.jsx exist; **EarningsView.jsx MISSING — write it**
  (stats row, monthly stacked SVG chart, per-member bars, per-item receipts table).
- A7: nothing written — build engines/whatIf.js + Simulator/SimulatorView.jsx from scratch
  (5/24 24-month projection + velocity verdicts; spec in git history / task list).
- A4 in progress by orchestrator: hooks/useActionItems.js DONE (committed); still need:
  layout/NotificationCenter.jsx, AppShell bell wiring, Settings notifications+point-value
  sections, ActionQueue rework onto synced dismiss/snooze.
- A5 not started: CommandPalette component + AppShell mount + Ctrl/Cmd-K; card/account/app/
  route/action index; /cards ?add&logspend&highlight deep links ALREADY supported.
- Then: B polish pass, NavBar/AppShell route integration (routes /applications /timeline
  /earnings /simulator /more), verification (incl. v2-state backward-compat load via
  playwright + api.github.com interception), README sync, delete PROGRESS.md + AGENT_BRIEF.md,
  PR.
