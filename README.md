# Churner — Four-Person Churning Management System

A fast, lightweight web dashboard for running credit-card sign-up bonuses and bank-account bonuses across a **four-person household** — built for two high-velocity churners plus two retired seniors on Social Security. It tells you, in advance, exactly what to do next: when to spend, when to cancel, when a fee posts, when a bonus clears clawback, and when you're eligible to apply again — and now also what you're actually earning, what to apply for next, how today's application ripples through 5/24 for the next two years, and **where every dollar of your churning cash currently sits.**

No backend, no subscription, no database server. The whole app is a static single-page application that syncs your data through a **private GitHub Gist** you control. Host it free on GitHub Pages.

**Live app:** https://cmsu224.github.io/Churner/

---

## Table of Contents

- [Concept](#concept)
- [Feature Catalog](#feature-catalog)
  - [1. Command Center Dashboard](#1-command-center-dashboard)
  - [2. Action Engine (the brain)](#2-action-engine-the-brain)
  - [3. Notification Center & Reminders](#3-notification-center--reminders)
  - [4. Timeline / Calendar & .ics Export](#4-timeline--calendar--ics-export)
  - [5. Credit Card Tracking](#5-credit-card-tracking)
  - [6. Spend Logging & Burn-Rate Projection](#6-spend-logging--burn-rate-projection)
  - [7. Application Tracker](#7-application-tracker)
  - [8. Bank Account Tracking](#8-bank-account-tracking)
  - [9. Money Map: Transfers, Cash Position & Check-Backs](#9-money-map-transfers-cash-position--check-backs)
  - [10. Points & Loyalty Balances](#10-points--loyalty-balances)
  - [11. Issuer Rule Engines](#11-issuer-rule-engines)
  - [12. What-If Eligibility Simulator](#12-what-if-eligibility-simulator)
  - [13. Card Lifecycle: Annual Fees, Retention & Re-Eligibility](#13-card-lifecycle-annual-fees-retention--re-eligibility)
  - [14. Annual Fee Tracker](#14-annual-fee-tracker)
  - [15. Credit Age & Keep-Alive Tracker](#15-credit-age--keep-alive-tracker)
  - [16. Earnings & ROI Analytics](#16-earnings--roi-analytics)
  - [17. Tax Liability Predictor](#17-tax-liability-predictor)
  - [18. Command Palette & Global Search](#18-command-palette--global-search)
  - [19. Member Management](#19-member-management)
  - [20. Resources Hub](#20-resources-hub)
  - [21. Import / Export & AI Import Helper](#21-import--export--ai-import-helper)
  - [22. Data Sync (GitHub Gist)](#22-data-sync-github-gist)
  - [23. UI / UX & Design System](#23-ui--ux--design-system)
  - [24. Installable App (PWA) & Offline Support](#24-installable-app-pwa--offline-support)
  - [25. Milestone Tracker Table](#25-milestone-tracker-table)
- [Privacy & Security](#privacy--security)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Data Model](#data-model)
- [Maintaining This README](#maintaining-this-readme)

---

## Concept

The household has **four members** by default, each with a role:

| Member | Role | Purpose |
|--------|------|---------|
| Me | `churner` | High-velocity churning |
| Wife | `churner` | High-velocity churning |
| Mom | `senior` | Retired, on Social Security |
| Dad | `senior` | Retired, on Social Security |

Members are **fully editable** — none of the names, colors, or roles are hardcoded. Add, rename, recolor, or delete members freely (see [Member Management](#19-member-management)). Every card, account, application, and rule check is attributed to a member. The default member colors are a colorblind-validated categorical set (they double as chart series colors on the Earnings page), but any color can be chosen.

---

## Feature Catalog

### 1. Command Center Dashboard

The home screen (`/`) is a prioritized command center, not a passive summary. **Every section is reorderable** — tap **Customize** to move sections up/down; the layout is saved per device (localStorage). Default order: Individual Summary → Bonus Pipeline → Money Map → Application Eligibility → Credit Age & Usage → Spend Challenges → Action Items → Stats. The dashboard is also **fluid**: summary cards, pipeline rows, spend tiles, and stat tiles are all clickable drill-downs into their detail screens.

- **Individual Summary** — per-person rollup of activity, including a **Bonus Pipeline** (dollar value of bonuses still being worked toward; points/miles are valued at their global program rate, never counted as raw dollars, and flagged `est.` when estimated). **Clicking a member's card opens the Cards page pre-filtered to that person** (`/cards?member=…`); the Accounts mini-tile opens their bank accounts instead.
- **Bonus Pipeline** — the household's money in flight, itemized: every bonus still being worked toward as its own line (brand, member, dollar value), sorted by value, with the running total in the header. **Only in-flight bonuses count** (one shared engine rule): a card must be in Applied or Earning Bonus — a card marked **Bonus Earned drops out even if its "bonus received" checkbox hasn't been ticked yet** — and an account already at Bonus Received / Holding / Safe to Close is out even without a received date. Card points/miles are valued the same way as everywhere else — the card's global program rate, flagged `est.` — so you can see exactly which bonuses make up the pipeline, not just the sum. **Each row is a drill-down**: clicking jumps to that card or account on its own page and flashes it.
  - **Cards with no bonus value recorded are still listed**, sorted to the bottom and marked **"Add bonus value"** instead of a dollar figure, with a **"N without a value"** count next to the header total. They contribute nothing to the total, but they aren't hidden either — a credit-report import leaves `bonusValue` empty by design, and those cards would otherwise vanish from the pipeline while still showing as actively earning on the Cards page. Clicking the row jumps to the card so the value can be filled in. (Two engine predicates back this: `isCardChasingBonus` decides what gets **listed**, `isCardBonusPending` decides what gets **summed into dollar totals**.)
- **Application Eligibility** — compact per-member issuer bars (Chase 5/24, Amex, Citi, BofA, Capital One), only shown when a window has active cards counted. Shows "next slot" dates when blocked.
- **Credit Age & Card Usage** — per-person panels showing average account age and keep-alive status of every open card (see [Credit Age Tracker](#15-credit-age--keep-alive-tracker)).
- **Active Spend Challenges** — live progress bars for every card with an open minimum-spend requirement, showing dollars spent vs. required, days remaining, and the **burn-rate projection** (on pace / off pace — need $X/week). Cards whose deadline can't be computed yet (no open date or spend-window days) still show their progress bar with a "no deadline set" note instead of disappearing. Clicking a tile jumps to that card on the Cards page.
- **Action Queue** — a single ranked list of *everything you need to do*, pulled from every card and account (see [Action Engine](#2-action-engine-the-brain)). Items can be **dismissed or snoozed (1/3/7 days)** — both synced across devices. If nothing is pending, you get an "all caught up" state instead.
- **Stats bar** — four tiles (2×2 on mobile, one row from `sm` up): **Cash Pipeline**, **Rewards Pipeline**, count of active cards, and count of bank accounts. The two pipeline tiles split the money in flight by how certain it is — **cash** is hard dollars (cashback card bonuses + bank account bonuses), **rewards** is points/miles converted at their program rate and flagged `est.`, so it moves when the Settings rates change. **Cash + rewards equals the itemized Bonus Pipeline total exactly** (same `isCardBonusPending` predicate, same `valueCardBonus` valuation). Each tile drills in: both pipeline tiles scroll to the Bonus Pipeline section, the counts open the Cards / Accounts pages.

### 2. Action Engine (the brain)

`src/engines/actionItems.js` scans your entire portfolio and generates a single, deduplicated, **priority-sorted** to-do list. Items are ranked **critical → warning → info**, and within each tier by soonest due date. Each item carries a category icon, a plain-English explanation of *why it matters and what to do*, and a suggested action label.

The engine generates these item types:

**Credit-card items**
- **Spend deadline** — four tiers: *overdue* (critical, with "call the issuer for an extension" guidance), *≤7 days* (critical, with tactics: prepay bills, buy gift cards, pay rent through a service), *≤30 days* (warning), and on-track tracking. Shows exact dollars remaining and the deadline date.
- **Spend pace (off pace)** — warning that fires when the current spending pace will miss the deadline: shows the projected completion date at the current $/week and the $/week needed from here. Only fires outside the ≤7-day window (the critical items above own the endgame) and once a card is 2+ weeks old, so brand-new cards don't alarm before spending starts. Pace comes from the spend log's last 30 days when entries exist, otherwise from the flat average since opening (see [Spend Logging](#6-spend-logging--burn-rate-projection)).
- **Annual fee — refund window** — once a fee posting has been **confirmed**, counts down the **issuer's cancel-for-full-refund window** from the real post date (critical at ≤5 days), with the option to product-change to a no-fee card to keep the history.
- **Annual fee — watch for the fee** — fires when a fee cycle date has passed but no posting has been confirmed. Issuers bill the fee on the next statement, so this is the window where cancelling still costs $0; the item explains that, gives the date it should land by, and tells you to tap **Fee posted** on the card when it shows up (that's what starts the refund clock). Reworded once the expected window has passed: check the statement, or fix the card's dates.
- **Annual fee — upcoming** — fires within 45 days of a fee cycle date, coaching you to call the retention line first, then either cancel before it posts or let it post and refund within the issuer's window.
- **Retention call due** — for fee cards aged 10–12 months, prompts you to call the retention/loyalty line and ask for an offer.
- **Safe to close — approaching / cleared** — for bonus-earned cards in *Bonus Earned* or *Cancel or Downgrade* status: a heads-up when the **12-month close shield** clears within 30 days (with the exact date), then an all-clear once closing/downgrading carries no clawback risk. Keep Alive cards are deliberate keeps, so they don't nag.
- **Stale status** — flags cards marked "bonus received" but still showing an earning status so your tracker stays accurate.
- **Re-eligibility** — tells you when you can earn a card's sign-up bonus again (per-issuer windows).

**Bank-account items**
- **Direct-deposit deadline** — five tiers (overdue / ≤7d / ≤30d / ≤60d, plus a generic fallback when no DD-deadline is set), each with the required DD amount, source, and exact date. These reminders **clear automatically once the completed direct-deposit count meets the requirement** (or the DD is marked linked / the bonus received) — you don't have to dismiss them by hand.
- **Multi-DD progress** — when an offer needs multiple qualifying deposits, tracks "X of Y completed" and how many remain.
- **Minimum-balance reminder** — reminds you to keep the required balance to avoid fees and qualify.
- **Bonus deadline** — overall offer-window countdown; if it expires, prompts you to call the bank to claim a manually-earned bonus.
- **Clawback / cooling period** — counts down the **181-day** hold before a bonus is safe from clawback, then flips to "safe to close."
- **Reapply for a bonus** — fires once a **closed** account's bank cooldown has cleared, so the bank should pay a new-account bonus again (see the [reapply clock](#8-bank-account-tracking)). Paired with a **reapply window opens in Nd** heads-up inside 30 days, so the direct-deposit source can be lined up before the window opens. One reminder per member + bank (the latest, binding cooldown — three closed Chase accounts produce one item, not three), and never while that person still holds an open account at the same bank.

**Keep-alive items (every open card)**
- **At risk** (critical, 180+ days unused), **use soon** (120+ days), and **track usage** (no last-used date set on one of your 3 oldest cards). The three oldest cards get the highest priority because they anchor your credit history.

**Money items (from the [Money Map](#9-money-map-transfers-cash-position--check-backs))**
- **A transfer that should have landed** (critical) — an ACH push still unconfirmed more than 5 days after it was sent. **A check-back you set** (warning) once it's due or overdue. **Cash with no reason to stay where it is** (info) — an account past its clawback window, or closed, still holding money 14+ days on. All three carry the **Money** category and link to `/money`, where marking it landed or pushing it home actually happens. Upcoming check-backs stay out of the queue until they're due — a reminder set three weeks out isn't an action item today — and a check-back that was only waiting on the money to arrive [leaves the queue the moment you mark the transfer landed](#9-money-map-transfers-cash-position--check-backs), rather than going overdue for a check you've already done.

**Dismiss & snooze, synced.** Every item can be dismissed (X) or snoozed for 1, 3, or 7 days (clock). This state lives in the synced Gist data — dismissing an item on your phone dismisses it on your laptop. Dismissals recorded under the old per-device model are migrated into the synced store automatically on first load.

### 3. Notification Center & Reminders

A **bell icon in the header** (every screen) opens the notification center:

- **Unread badge** — count of active action items you haven't seen yet; opening the panel marks the current items seen (synced, and pruned so state can't grow unbounded).
- Each notification links straight to its card or account (jump + highlight flash) — or to the [Money Map](#9-money-map-transfers-cash-position--check-backs) for a money item, since that's where marking a transfer landed or sweeping cash home actually happens — and has inline **dismiss** and **snooze (1/3/7d)** controls, the same synced state as the Dashboard queue.
- A collapsed **"Snoozed & dismissed"** drawer lets you restore anything.

**Browser notifications (opt-in, Settings):** while the app is open, a system notification fires the moment an action item *newly becomes critical*. Enabling walks through the browser permission prompt; blocked/unsupported browsers degrade gracefully with a clear status message. Notified-item tracking is per device.

**When the app is closed**, the honest answer for a static SPA is the calendar: the Settings copy points to the Timeline page's **Export .ics** so deadlines live in Google/Apple Calendar with native reminders.

### 4. Timeline / Calendar & .ics Export

Page: `/timeline`. Every dated event across the household, in one place, sourced from the existing engines (`src/engines/events.js` reuses their math — no duplicated rule logic):

- **Event types:** spend deadlines, annual-fee cycle dates (plus an *"Annual fee expected by"* checkpoint when a due fee hasn't been confirmed as posted), fee-refund window closes, retention-call window opens (card turns 10 months old), card safe-to-close dates (the 12-month close shield clears), card bonus re-eligibility dates, direct-deposit deadlines, bank-bonus offer deadlines, clawback-clear ("safe to close") dates, early-termination-fee window ends, bank bonus re-eligibility dates, and — from the [Money Map](#9-money-map-transfers-cash-position--check-backs) — **transfer check-back dates** and **expected landing dates** for pushes still in flight.
- **Two views:** a **month calendar** (prev/today/next, event chips per day, tap a day for its agenda) and an **agenda list** grouped by month with an **Overdue** section on top. Mobile defaults to agenda.
- **Filters** by member and by category (Spend / Fees / Banks / Eligibility / Money).
- **Export .ics** — generates an iCalendar file client-side (RFC 5545: proper escaping, line folding, all-day VEVENTs, stable UIDs) from the *currently filtered upcoming events*, one VEVENT per item, summaries like `[Churner] Wife: Spend deadline: Sapphire Preferred`. Import or subscribe in Google/Apple Calendar for reminders while the app is closed.
- Window: events from 30 days back (overdue) to 18 months out.

### 5. Credit Card Tracking

Page: `/cards`. Cards render as **expand-in-place** rows — tap to edit inline, no modals. Only the **card name is required**; everything else is optional so data entry stays fluid. Cards are **grouped by issuer** (Chase, American Express, Citi, …, with an "Other" bucket), each group headed by the issuer's **logo**.

**Tracked fields:** person, status, card name, issuer (with autocomplete for Chase, Amex, Capital One, Citi, Bank of America, Barclays, Wells Fargo, US Bank, Discover), last 4, open date, last-used date, **current balance**, **credit limit**, minimum-spend requirement / deadline days / current spend, **itemized spend log**, bonus value & type (points / cash / miles), annual fee, **first-year-fee-waived** flag, **annual-fee post date (confirmed)** — the date the fee *actually* hit the statement, the one thing that starts the refund clock and pins the card's later fee cycles (see [Annual fee timing](#13-card-lifecycle-annual-fees-retention--re-eligibility)); the edit form has a **Posted today** shortcut beside it — "bonus received" + received date, **closed/downgraded date**, and the **"Business card"** / **"Authorized user"** flags (which exclude a card from Chase 5/24 — see below).

**Statuses** (friendly labels; stored values stable): Applied → Earning Bonus → Bonus Earned → Keep Alive → Cancel or Downgrade → Downgraded / Closed. **The collapsed card adapts to the status** — each lifecycle stage surfaces only the facts that matter for it (see the status-aware display bullet below).

**Highlights**
- **Status-aware card display** — what the collapsed card shows depends on where it is in its lifecycle:
  - *Applied / Earning Bonus* — the bonus in the pipeline, the live spend progress bar with deadline + pace projection, and the "+ Log" spend button. Plus the fee row **only when a fee is live right now** (due-but-unposted, or inside the refund window) — the sign-up fee bills on the first statement, so a brand-new fee card needs that decision long before it reaches the later stages.
  - *Bonus Earned / Cancel or Downgrade* — the decision facts: **Bonus earned** (cash, or points + est. value), the **annual fee row** (next fee as amount · date · countdown; *"$X · not posted · by \<date\>"* with a **Fee posted** button while a due fee waits on the statement; or the **refund deadline** once confirmed), and the one-line **cancel-or-downgrade verdict** (next bullet), which carries the 12-month clawback / safe-to-cancel timing.
  - *Keep Alive* — deliberately lean: the age & fee badges in the header, **last used** with the one-tap Used-today pill, and the same annual-fee row when the card carries one. **Status buttons disappear from the collapsed card** — expanding it reveals the verdict line plus a **Mark as** action strip above the edit form (applying an action also closes the form, so a stale draft can't overwrite the new status on Save).
  - *Closed / Downgraded* — the bonus re-eligibility countdown.
- **Cancel-or-downgrade guidance** (`src/engines/cancelGuidance.js`) — every card past the earning stage (Bonus Earned / Keep Alive / Cancel or Downgrade) gets a verdict that combines the close shield, the next fee posting, and the issuer's refund window: **Wait, then exit** (still inside the clawback year, fee card — the line shows the **best-exit window**, e.g. "exit Feb 1, 2027 → Mar 3, 2027": it opens when the clawback clears and closes when the fee-refund window shuts, so exiting inside it protects the bonus **and** gets the annual fee back), **Wait to cancel** (clawback year, no fee — exit any time after the clear date), **Decide now** (a fee just posted — cancel or downgrade within the refund window for a full refund), **Cancel or downgrade soon** (fee posts within 45 days), **No rush yet** (fee further out), or **Keep it open** (no annual fee — a free open card helps credit age). On the collapsed card it's a **single truncated line** with the **full reasoning in the hover tooltip**; the expanded view spells it out. A fee card with no open/fee-post date is told to add one instead.
- **Card age badge** — the collapsed header always shows how old the card is (e.g. "2y 3mo" or "8mo"), calculated from the open date so you can instantly judge credit-history impact.
- **Annual fee badge** — if a card has an annual fee, it shows as `$X/yr` right in the collapsed header alongside the age badge, so you never forget what a card costs you.
- **Dynamic status action buttons** — context-sensitive one-tap buttons appear on every card based on its current status, so you can advance the lifecycle without opening the edit form. The **primary next step is a solid, filled button** (any secondary options stay outlined) so the obvious action is unmistakable:
  - *Applied* → **Card Arrived** (→ Earning Bonus)
  - *Earning Bonus* → **✓ Bonus Received** (sets bonusReceived + bonusReceivedDate + status in one tap). Cards with no sign-up bonus (points/perks-only cards) show **→ Keep Alive** instead.
  - *Bonus Earned* → **→ Keep Alive** or **Close / Downgrade** (→ Cancel or Downgrade). Which one is the solid primary button depends on the **12-month close shield**: Keep Alive leads until the card is safe to close, then Close / Downgrade takes over.
  - *Keep Alive* → no buttons on the collapsed card (deliberate keeps stay lean) — **Close / Downgrade** lives in the expanded card's **Mark as** strip
  - *Cancel or Downgrade* → **✓ Mark Closed**, **Keep It** (→ Keep Alive), or **Downgrade →** (type the no-fee replacement card's name — marks this card Downgraded and creates the new card, without inheriting the original's 5/24-counted open date)
- **"Fee posted" ⧉ pill** — when a fee is due but hasn't shown up on the statement yet, the fee row carries a one-tap **Fee posted** button. It records today as the confirmed post date, which is the *only* thing that starts the cancel-for-full-refund countdown — and it's undoable like any other quick action. Same button on the [Annual Fee Tracker](#14-annual-fee-tracker) rows.
- **Undo button** — after any quick-action tap, an **↩ Undo** button appears for 6 seconds to instantly revert the change. No confirmation dialog.
- **Smart status on import** — when importing cards from a credit report (where bonus status is unknown), the app infers the right status from the card's age: under 6 months → Earning Bonus; 6–10 months → Bonus Earned (bonus assumed received); 11–13 months → Annual Fee Decision; 14+ months → Keep Alive. Cards with no bonus details are set to Keep Alive regardless of age.
- **Smart status on manual add** — same age-based logic applies when you add a card manually and leave the status at the default. If you explicitly pick a status in the dropdown, that choice is respected as-is.
- **Safe-to-cancel shield** — the 12-month close shield surfaces through the verdict line: an amber **"Wait to cancel — clawback risk ends in Nd"** until 1 year from open (the clear date is in the tooltip and quick-action ordering), after which the fee-driven verdicts take over. A card in *Bonus Earned* status counts as earned **even when the "bonus received" checkbox wasn't ticked** (the same rule the pipeline uses). Closing earlier risks the issuer clawing back the sign-up bonus — this is the card version of the bank accounts' 181-day clawback shield.
- **Last used + "Used today" ⚡ pill** — Keep Alive cards show their **last-known used date** right on the collapsed card, with a quiet rounded **Used today** pill beside it: one tap sets the last-used date to today. No date picker — built specifically because typing dates is the most painful part of upkeep.
- **"+ Log" spend button** on cards with an open spend requirement — see [Spend Logging](#6-spend-logging--burn-rate-projection).
- **Bonus in pipeline** — cards actively earning a bonus show what's at stake right on the collapsed card: cash bonuses as dollars; points/miles as the points figure **plus an estimated cash value** at the card's **global program rate** — the program is inferred from the card name/issuer, so Hilton points value at Hilton's rate, not a flat 1¢ — flagged `est.`. Valued by the same engine rule as the Earnings page and Dashboard pipeline — points are never counted as raw dollars, and there is no per-card rate override.
- **Live spend progress bar** right on the collapsed card, color-coded by urgency, with the pace projection line under it. The bar renders even when the deadline can't be computed yet (no open date or spend-window days) — it shows spent vs. required with an "add open date + days for the deadline" hint instead of vanishing. Shown while the card is still earning (Applied / Earning Bonus); after that the decision facts take its place.
- **Clearable date fields** — press Backspace/Delete or click the × to clear a date (desktop-friendly), plus the native picker for mobile.
- **Required fields are accent-highlighted**; optional fields are muted so you know what to ignore.
- **Per-person filter** buttons plus a full **filter + sort bar** on both the Credit Cards and Bank Accounts pages:
  - **Credit cards** — filter by status (multi-select), issuer/brand (auto-populated, multi-select), age range (< 1yr / 1–2yr / 2–4yr / 4+yr), and toggle chips for "Has annual fee", "Bonus pending", "Hide closed/downgraded", "Hide keep-alive". **"Bonus pending" uses the same engine predicate the Dashboard's Bonus Pipeline lists on** (`isCardChasingBonus`), so the two views can't disagree: it includes Applied cards, and excludes cards whose bonus is already marked received. Sort by Recommended, Newest, Oldest, Highest annual fee, or Name A–Z.
  - **"Recommended" is the default sort** — cards are ordered by how much attention they need right now, most urgent first, using the [attention score](#13-card-lifecycle-annual-fees-retention--re-eligibility) (`getCardAttentionScore`). Broadly: cards earning a bonus at the top, then applications, cancel-or-downgrade decisions and earned bonuses, with keep-alive cards at the bottom and retired cards last — except that a genuinely time-sensitive card (blown spend deadline, open fee-refund window, a keep-alive card drifting toward inactivity closure) floats above its tier. Ties break to newest first.
  - **"Hide keep-alive" is on by default** — long-term keep cards need no action, so the list opens focused on cards that do. Whenever it's suppressing cards, a "*N* keep-alive cards hidden — show them" link appears under the list (and in the empty state) to bring them back in one click. Selecting the **Keep Alive** status pill overrides the hide, so filtering *for* keep-alive cards always works. Turning the chip off counts toward the active-filter badge, since the default state is on.
  - **Bank accounts** — filter by status, bank (auto-populated), account type (Checking/Savings/Money Market/CD), and toggle chips for "Has bonus offer", "Bonus pending". Sort by Newest, Oldest, Highest bonus, or Bank A–Z.
  - Active filter count badge on the "Clear filters" button. The list is a **flat, global** order that always honors the chosen sort — so "Newest first" is genuinely newest-first for the whole page, regardless of issuer. Grouping by issuer/bank (with brand logos) is an explicit, always-visible **Group by brand / Group by bank** toggle that's **off by default**.
- **Table view** — a **Table** toggle beside *Group by brand* swaps the card list for the dense milestone grid described in [Milestone Tracker Table](#25-milestone-tracker-table). It reads the same filtered, sorted set the cards do, and includes the closed/downgraded cards inline (it has its own Status and Closed columns, so they need no separate section).
- **Contextual edit form** — the inline edit form adapts to the card's status so you only see relevant fields. The **Earning Bonus** section (spend req, days, spent, spend log) only appears for Earning Bonus cards or when spend data exists. The **Bonus & Rewards** section (bonus value, type, annual fee, received date, fee-waived flag) is hidden for Closed cards unless data is present. The **Last Used** field only appears on Keep Alive cards or when a date is already set. The **Closed Date** field appears for Closed/Downgraded cards. Current balance, credit limit, and notes live under a collapsed **More details (optional)** section since they're rarely updated.
- **Progressive add form** — a new card starts short: person, status, card name, issuer, and open date. The **Earning Bonus** section shows only for *Earning Bonus* / *Applied* status; **Bonus & Rewards** (including a **First-year annual fee waived at sign-up** checkbox when a fee is entered) hides once a card is Closed/Downgraded; and balance, credit limit, and notes stay tucked under **More details (optional)**. Inline delete with confirmation.

### 6. Spend Logging & Burn-Rate Projection

`src/engines/burnRate.js` + per-card spend log. `currentSpend` used to be a bare number you overwrote; now:

- **"+ Log" quick-add** on the collapsed card (amount + optional note + date, default today) appends an entry to the card's **spend log** and rolls it into the total in one dispatch. The command palette also offers "Log spend on …" for every card with an open requirement.
- The **spend log** is visible in the card's edit form; deleting an entry subtracts it from the total. **Plain-total editing still works** — the "Spent ($)" field is untouched for people who don't want itemization.
- **Burn-rate projection** on every card with an open spend requirement:
  - Pace = spend-log dollars over the last 30 days when entries exist (recent behavior), otherwise total ÷ days-since-open.
  - Shows **on pace** (projected completion date before the deadline), **off pace** (projected date after the deadline, plus "need $X/week from here"), **stalled** (no meaningful recent spend), or **past deadline** (once the deadline has passed unmet — no weekly target is shown; the critical "spend deadline missed" action item takes over).
  - Surfaces in the collapsed card, the Dashboard's Active Spend Challenges, and as the **`spend_pace` action item** ([see Action Engine](#2-action-engine-the-brain)).

### 7. Application Tracker

Page: `/applications`. The application funnel the app used to ignore until approval:

- **Statuses:** Planned → Applied → Pending Review → Approved / Denied. Applications are grouped **In Flight** vs **Decided**, filterable by member and status, with **pipeline stats** (in-flight count, approvals, denials, approval rate).
- **Before-you-apply check** — while you fill in the add form (and inside every open application), a live **"Before you apply"** panel evaluates the selected member + issuer + product against the real rule engines: Chase 5/24 count (always — every issuer's personal card uses a slot), Amex 1/5 + 2/90, Citi 1/8 + 2/65, BofA 2/2/3/12/4/24, Capital One 1/6mo, and **product-level bonus re-eligibility** (Sapphire 48-month rule, Amex lifetime language, etc.) when the product name matches a known family. Verdicts render as ✓ / caution / blocked with dates.
- **Quick actions** per application: *Applied today*, *Pending*, *✓ Approved*, *✗ Denied* (with an inline denial-reason input), *Reconsidered → Approved*.
- **One-click convert on approval** — approving asks for the open date (default today) and creates a fully-populated tracked card (member, name, issuer, bonus, spend requirement, fee) linked back to the application (`convertedCardId`), which then shows a "tracking as card" chip.
- **History that includes denials** — denied applications stay in the Decided list with their reason and reconsideration notes, because denial patterns matter for issuer-specific intuition even where no hard rule exists.

### 8. Bank Account Tracking

Page: `/accounts`. Same expand-in-place pattern; only **bank name is required**. Accounts are **grouped by bank** with the bank's **logo** in each group header.

**Tracked fields:** person, status, bank name, account type, last 4, opened date, **closed date**, **current balance**, bonus amount, bonus received date, **custom color / accent**, **direct-deposit requirements** (direct deposit amount, # of direct deposits required, # completed, direct deposit deadline in days, direct deposit linked date, direct deposit source — e.g. payroll, Social Security, ACH), minimum balance, bonus deadline (days), **early-termination-fee window (days)**, taxable (1099-INT) flag, offer link, and notes.

**Statuses:** Opened → Direct Deposit Linked → Bonus Pending → Bonus Received → Holding (Clawback) → Safe to Close → Closed.

**Dynamic status action buttons** — the same one-tap lifecycle strip the credit cards have, so an account can be advanced without opening the edit form. The primary next step is a **solid, filled button**; secondary options stay outlined; and every tap gets a 6-second **↩ Undo**:
- *Opened* → **✓ Direct Deposit Linked** (sets the linked date and the DD count) — or **→ Bonus Pending** when the offer needs no direct deposit. **✓ Bonus Posted** is always available as a secondary.
- *Direct Deposit Linked* → **+ Direct Deposit N/M** while qualifying deposits are still outstanding (each tap increments the completed count, exactly like logging spend on a card), then **✓ Bonus Posted** / **→ Bonus Pending**.
- *Bonus Pending* → **✓ Bonus Posted** — sets the status, the received flag, **and the received date**, which is what puts the bonus in the right year on the [Tax page](#17-tax-liability-predictor) and starts the clawback countdown.
- *Bonus Received / Holding* → **→ Holding (Clawback)** until the 181-day window clears, then **✓ Safe to Close** (the step is chosen by `getAccountNextStatus`, so the button always matches the clawback rule).
- *Safe to Close* → **✓ Mark Closed** (stamps the **closed date**, which is what switches the account from the first clock to the second).

The direct deposit fields drive the multi-tier direct-deposit reminders, the multi-DD progress tracker, and the minimum-balance and bonus-deadline countdowns in the [Action Engine](#2-action-engine-the-brain). The **181-day clawback shield** tells you when each account is safe to close, and the optional ETF window feeds an "early-termination fee window ends" event on the [Timeline](#4-timeline--calendar--ics-export).

**The two clocks.** A churned bank account runs on two independent clocks, and only one is ever live at a time:

1. **Clawback shield** (`src/engines/clawbackShield.js`) — **181 days** from opening, after which the bank can no longer reverse the bonus and the account is safe to close. This is the clock on every **open** account, shown on its collapsed card.
2. **Reapply clock** (`src/engines/bankReeligibility.js`) — once the account **is closed**, when that bank will pay a **new-account bonus again**. Closed accounts show this instead of the (already spent) clawback line.

**Reapply clock — closed accounts only.** While an account is still open the first clock is what matters, and virtually every bank's offer terms disqualify current customers outright, so there is nothing to count down until the account is gone.

- **Per-account readout** on every closed account's card: the account's own history (**opened → closed**), a progress bar toward the reapply date, and the verdict — **Eligible now**, **Nd · \<date\>**, **Once per lifetime**, or a nudge to add an opened date when the clock can't be anchored. Under it, the rule being applied and where it counts from (e.g. *"~24mo rule · from bonus Jun 6, 2024"*).
- **Anchor follows the bank's own rule basis** — a bank whose terms read *"no bonus in the past N months"* counts from the **bonus received date**; one that reads *"no open **or closed** account in the past N months"* counts from the **closed date**; one that says *"new customers only"* counts from the **opened date**. Each basis has a fallback chain (`getBonusAnchor`) so a part-filled account still gets a clock, and the readout names the date it actually used — *"~24mo from account closing · closed Nov 1, 2024"* — so a fallback never reads as the real thing. Same anchor the bank-level [Bank Bonus Eligibility](#11-issuer-rule-engines) widget uses, so the two never disagree.
- **Cooldown windows and their basis are not redefined here** — the engine imports the rule from `bankEligibility.js` via `getBankRule`, so there is exactly one source of truth per bank (Chase ~24mo from the bonus, Citi/U.S. Bank/PNC ~24mo from closing, Wells Fargo ~12mo, Capital One/TD/Huntington/Fifth Third ~12mo from closing, once-per-lifetime for Discover and SoFi, conservative 24-month default for unknown banks).
- **"Another \<bank\> account is still open"** — if the member still holds a non-closed account at the same bank, the row says so and the reminder is suppressed, because a new-customer offer won't pay a current customer no matter what the date math says.
- **Reapply Eligibility panel** at the top of `/accounts` — every closed account's clock in one collapsible list, action-ordered (**eligible now** first, then cooldowns by how soon they open, with lifetime bans and undated accounts last). The header summarizes at a glance (*"4 closed accounts · 1 eligible to reapply now"*, or the next window to open); each row jumps to that account in the list below. It honors the person filter and hides itself entirely when nothing is closed.
- Feeds the **reapply action items** in the [Action Engine](#2-action-engine-the-brain). Calendar reminders come from the existing bank-level **bank bonus re-eligibility** event on the [Timeline](#4-timeline--calendar--ics-export) — the per-account clock deliberately adds no second event, since for a bank you've fully exited the two dates are the same.
- Cooldowns are **estimates** — the panel footnote says so and points at Doctor of Credit to verify current offer terms.

**Closed date** is captured by the one-tap **✓ Mark Closed** action, and appears as an editable field on the add and edit forms whenever the status is *Closed* (so a historical account can be logged with its real dates). It is the flag that starts the reapply clock; the cooldown length itself still counts from the anchor above.

**Where the money for the direct deposits comes from** is tracked separately, on the [Money Map](#9-money-map-transfers-cash-position--check-backs): every ACH push into an account, what's still in flight, what the account is holding, and when to sweep it home. An account's `currentBalance` is the field both pages share — landing a transfer credits it here, and it stays hand-editable on this page. A second field, **Started with** (`openingBalance`), records what the account held *before* its first logged push — $0 for a churn you opened empty, and whatever was already in there for an everyday account you added to the map later. It defaults to whatever balance a new account is created with, and it is kept as the record of where the balance started.

**Table view** — a **Table** toggle beside *Group by bank* swaps the account list for the dense milestone grid described in [Milestone Tracker Table](#25-milestone-tracker-table), carrying the opened → requirement → direct deposit → posted → close-after → closed → reapply chain across one row per account.

**Contextual edit form** — both the add and edit forms adapt to the account's status. The **Sign-Up Bonus** section (bonus amount, deadline, minimum balance, ETF window, taxable checkbox, bonus received date) only appears when the account is in a bonus-earning status or bonus data exists. The **Direct Deposit Requirements** section only appears when the status is Opened/DD Linked or when direct deposit data is present. The **Closed Date** field appears when the status is Closed or a date is already set. On the add form, current balance, minimum balance, bonus received date, offer link, and notes stay tucked under **More details (optional)**. "Direct Deposit" is always spelled out in full — never abbreviated.

### 9. Money Map: Transfers, Cash Position & Check-Backs

Page: `/money`. Bank-bonus churning without a payroll direct deposit means pushing ACH after ACH out of a brokerage or everyday bank into each new account — and then getting every dollar back once the bonus posts. With a dozen accounts live that is a lot of money in a lot of places. The Money Map is the one page that answers **where is all my cash, what's still moving, and what do I have to come back to?**

**The model — money leaves, then money arrives.**

- A **transfer** moves money between two **nodes**. It is debited from the source on the day it's **sent** and credited to the destination on the day it **lands**. Between those two dates it is **in flight** and belongs to neither — that gap *is* the pipeline figure, and it's why "what I pushed" and "what actually hit the account" are never the same number here.
- A **node** is either a **cash source** (a brokerage, your everyday bank — anything that isn't itself being churned) or a tracked **bank account**. Account balances live on the account's own `currentBalance`; source balances live on the source's `balance`.
- Balance effects are applied in the store, in the same dispatch that records the transfer (`src/store/ChurnContext.jsx`, the same pattern `LOG_SPEND` uses for a card's spend) — so the ledger and the balances can't drift apart. Sending, landing, un-landing, editing, and deleting all apply or back out the same effects.
- Exactly one node is the **hub**: the main account money is expected to come home to. It's what "send home" targets and what the sweep-back reminders point at. Usually a cash source, but a **bank account works too** — plenty of people live out of a checking account — so the flag is exclusive across both kinds, and cash sitting in the hub is never flagged as stranded or counted as "away from home".
- A source's balance is **optional**. Left blank it means *"I don't track this here"* — it renders as "not tracked", never as $0, it's excluded from the household total, and pushes out of it don't invent a running balance for it.

**The graphic (`src/components/MoneyMap/FlowDiagram.jsx`).** Cash sources on the left, churned accounts on the right, one ribbon per source→destination pair:

- **Solid ribbon = landed, marching dashed ribbon = in flight.** Ribbon thickness scales with the amount (√-scaled against the largest edge), and the color is the push's intent: **blue = direct deposit, amber = funding / minimum balance, green = sweep home**, grey for anything else. A sweep home runs right-to-left, so money coming back is visible as a direction, not just a color.
- **A finished sweep home leaves the map after a day** (`SWEEP_TRAIL_DAYS`). A sweep is the end of a cycle — the money is home — so its green ribbon is kept for the day it lands and is gone the next, rather than accumulating into a cobweb between the hub and every account you've ever churned. Display only: the transfer stays in the ledger, in the totals, and on the **Hit the account** tab, and an edge whose every transfer has faded leaves the map entirely. A sweep still **in flight** is always drawn, however long it takes.
- **In-flight amounts are always labelled** (that's the number you're waiting on); landed amounts appear when you select a node. Two pills that would land on top of each other are **nudged apart down the gutter** (19px minimum, the stack pulled back up if it runs off the bottom), so a hub pushing to five accounts reads as a list of numbers rather than one illegible pile.
- **Ribbons fan out where they meet a card** instead of all leaving from the dead centre of its edge. Anchors are spread 11px apart down the card's edge (never wider than the card itself, however many ribbons land on it) and ordered by where the far end sits, so several pushes out of one hub come out already separated and don't cross on the way across — the difference between "six transfers" and one thick smear on a phone. A highlighted card's ribbons paint last, on top of the faded ones.
- **Node cards** are laid out **name-first**: the bank's **brand logo** (the same Google-favicon logo the rest of the app uses, falling back to a bank/wallet/house icon for a source the issuer table doesn't know) and the bank name get a full-width line of their own and wrap to two — three on a phone — so a long name reads in full instead of being clipped to `Bank o…`. Underneath sit the balance and, on their own line, the badges: the member/player attribution (`[● Me]`, `[● Partner]`) and `HUB`. The last line is the at-a-glance state, **derived from the account's own status** ([section 8](#8-bank-account-tracking)) so the map can never contradict the Accounts page — `Opened · no requirements set`, `Direct deposit linked`, `2 more direct deposits`, `Requirements met · bonus pending`, `Bonus in · hold 43d`, `Bonus in · safe to close`, `Safe to close`, plus `Home base · money comes back here` for the hub and `Closed` — with a **`+$X` badge** for money in flight toward it, and on a phone a short form (`Opened`, `DD linked`, `3 more DDs`, `Hold 43d`, `Home base`) that fits the narrow card rather than truncating mid-word. The lifecycle stage decides *which* line shows; the direct-deposit counters and the 181-day clawback clock only fill in its numbers. An account that is merely open, with no direct-deposit requirement recorded and none logged, says so plainly rather than claiming the bonus is being worked. A custom bank accent color, when set, paints the card's left edge. Accounts sort by urgency first, then by how much they're holding; the hub sits at the top of the left column.
- **Edit bank / source details directly from the map (`NodeEditModal.jsx`).** **Double-click** on any node card (or click its pencil edit icon, or tap **Edit details** in the mobile transfer sheet) to modify its name, balance, **Started with** ([`openingBalance`](#8-bank-account-tracking)), custom brand/accent color (from a palette of curated bank presets or custom hex code), account type, member attribution, status, and hub flag. The dialog is headed by the bank's brand logo, and the `···last4` digits sit inline beside the bank name.
- **Interactive Transfer Flow on the Map.** Hovering a card reveals its shortcut row (**Send home** / **Transfer** / **Edit**) below it — revealed on hover rather than pinned on, so the buttons can't sit over the top edge of the card underneath and swallow its clicks. Click **Transfer** on any account or source to enter interactive connect mode (with a glowing pulse and dynamic animated connection ribbon when hovering targets). Clicking any second bank or source opens the **Log Transfer modal** with pre-filled counterparties, quick amount chips, purpose pills (`Direct Deposit`, `Funding`, `Sweep Home`, `Other Push`), date selector, and reminder checkbox. **Send home** is a 1-click shortcut directly targeting the hub, and is hidden on the hub itself — money there is already home.
- **Drag-and-drop & arrange the cards yourself.** Freely drag and drop cards to reorder them within a column or drag across columns from left to right (or right to left) with live visual insertion indicator lines. Click blank space on the canvas (or press Escape) to instantly deselect or cancel transfer mode. **Arrange Mode** also provides accessible keyboard and tap arrows (**← ↑ ↓ →**) to move cards step-by-step and a **Set as hub** button.
  - **On a phone, press and hold a card to pick it up.** A touchscreen doesn't implement HTML5 drag-and-drop at all — no `dragstart` ever fires — so touch gets its own gesture: hold a card still for ~420ms (180ms in Arrange Mode, or drag straight from its **grip** there, which is the one part of the card that never pans the page) and it lifts, with a name chip following your finger and the same insertion line the pointer path draws. Moving before the hold completes is a scroll and cancels the drag, which is what keeps the map scrollable; once it does complete, page scrolling is blocked for the length of the gesture and dragging near the top or bottom edge **auto-scrolls** the page so a card off-screen is still a reachable target. The drop commits through the same `reorderNode` as a mouse drop, and the click that a finger-lift would otherwise fire is swallowed so dropping a card doesn't also open its transfer sheet.
  - The arrangement is stored per node in `moneyMapLayout` and **synced like everything else**, so the map looks the same on your laptop and your phone. Moving or dragging anything writes explicit sides and orders for *every card currently on the map*, which is what stops an untouched card drifting past an arranged one the next time a balance or status changes. Cards that aren't on screen — hidden ones, and the closed-and-empty ones — are deliberately left out of that write: counting them would land a drop three slots down at a different index than the one you aimed at. Their stored entries survive it untouched, so a hidden card doesn't quietly reappear the next time you rearrange. **Reset to automatic** clears the arrangement (hidden cards stay hidden; un-hide them from the header toggle).
  - A node with no entry keeps the automatic placement, and the hub defaults to the left column whichever kind it is. Arranging widens the cards and tightens the gutter so every arrow is a real tap target on a phone (34×36px, the whole map still inside 390px); the ribbon amount labels step aside while you're arranging.
- **Hide any card you don't want on the map.** Arrange mode gives every card an eye-off button; the hub is the one exception, since everything aims money back at it. Hidden cards join the closed-and-empty ones behind a single `N cards hidden` toggle in the header — one drawer, so there's only ever one place to look for a card that isn't where you expect. Revealing puts them back in place so Arrange mode can un-hide them.
  - **Hiding is display only.** A hidden account still holds its balance, still counts in every total, and still raises its sweep-back reminder — so money can't go quiet just by leaving the picture. When something off the map is still holding cash, the header says so next to the toggle (*"still holding $2,500 — counted in the totals"*), because "hidden" must never start to feel like "gone".
- **Closed accounts with no balance and no transfer history are hidden automatically**, so a year of finished churns doesn't bury the live ones.
- **Responsive:** the columns switch to a compact width below 640px. The gutter between them is sized to fit an amount pill (152 + 72 + 152 = 376px), so **the per-ribbon amounts are readable on a phone too** — the number alone there, since the dashed ribbon already says *in flight* and the full label wouldn't fit. That runs a little past a 390px screen, so the canvas scrolls a touch sideways; being able to read what's moving between the columns is worth the nudge. On touch, a card carrying ribbons also gets a **flows** button beside its pencil: it isolates that bank — every other ribbon and card fades and its own amounts appear — which is how you read overlapping lines one bank at a time on a screen with no hover and no click-to-select. The footer hint matches the input you actually have — *tap a bank / press and hold to drag / flows to isolate* on touch, *double-click / drag and drop* with a pointer. Reduced-motion users get the dashed ribbons without the marching.

**Quick entry — one line, one Enter.** On a keyboard, typing beats four dropdowns when you're logging the eighth push of the afternoon, so the bar parses a whole entry out of free text (`parseQuickTransfer` in `src/engines/moneyFlow.js`). (On a phone, tap a node and use the sheet instead — see below.)

| Type this | It logs |
|---|---|
| `5000 fidelity > chase` | $5,000 from Fidelity into your Chase account |
| `8k schwab to citi dd` | $8,000, tagged as a direct-deposit push |
| `chase back 4200` | $4,200 swept from Chase back to the **hub** |
| `3000 fidelity > sofi +3w` | the push, plus a check-back reminder 3 weeks out |

- Amount, source and destination in **any order**; `>`, `->`, `=>`, `→`, `to` and `into` all separate the two ends; `k`/`m` shorthand and `$`/commas are understood. Names match on full name, `···last4`, prefix, substring, or initials (`wf` → Wells Fargo).
- **Purpose keywords** — `dd` / `direct deposit` / `payroll`, `fund` / `min` / `balance`, `back` / `return` / `sweep` / `home`. A `back` with no destination targets the hub automatically.
- **`+3w` / `+21d` / `+2m`** (or `check 3w`) attaches a check-back reminder.
- A **live preview** shows exactly what was understood, with one-tap chips to correct the purpose, pick between ambiguous name matches, set the send date, or mark it **Already landed** (for back-filling). The bar **never saves a half-read line** — the Log button stays disabled until amount, source and destination all resolve.
- A name it can't place gets an inline **"Add source *Fidelity*"** button, so a new brokerage is created without leaving the field. After saving, focus stays in the bar for the next push.

**Tap entry — the phone's version (`TransferSheet.jsx`).** Typing an amount, a source and a destination into one line is quick on a keyboard and miserable on glass, so under 640px tapping an account on the map opens a guided bottom sheet: **which way is the money going → which account → how much.** One decision per screen, every target thumb-sized, and a **Back** step at each stage.

1. **Direction** — *Send money out* (this account is the source), *Pull money in* (this account is the destination), or *See its transfers* (filters the ledger and closes). The sheet says outright that both directions record the same thing; which end you tapped only decides which side the account sits on.
2. **The other account** — pulled into **Recent** (counterparties you've actually moved money with, newest first), then **Cash sources** (hub first) and **Bank accounts**, each row showing its live balance. A search box appears once there are more than seven nodes.
3. **Amount** — a large numeric field (`inputMode="decimal"`, so it raises the keypad and not the spinner), with the amounts *this pair* implies offered as one-tap chips: the destination's **required deposit**, the shortfall **up to its minimum**, **all but the minimum** or **everything in it** when money is leaving an account, then round fallbacks. The purpose chip is pre-selected by `defaultPurposeFor` — a destination that still owes direct deposits gets **DD**, the hub gets **Return** — and the same *Already landed*, *Sent date*, and *Remind me in 1w/2w/3w/30d* controls sit underneath.
4. **Confirmation** — with **Log another**, which keeps the account you started from, because several pushes into one new account in a sitting is the realistic pattern.

Both entry points go through one `useLogTransfer` hook, so the typed line and the tapped sheet can't drift on what a logged push records. The smart purpose default applies to the bar too, whenever nothing in the typed text named an intent.

**The ledger.** Two tabs — **In the pipeline** and **Hit the account** — newest first, filtered by whichever node you selected:

- Both ends of every row are named with their **brand logo** beside them, the same as the map's cards, the account picker in the tap sheet and the cash-source list.
- In-flight rows carry the only action that matters day to day: **✓ It landed** (one tap, stamps today, credits the destination, and closes every check-back that was only waiting on the money to arrive — see below). Landed rows carry **Send back** (pre-fills the reverse push) and an **undo** that puts it back in flight, check-back included.
- Each row shows its purpose tag, send date, and either `In flight · day N`, `Nd in transit` once landed, or a red **should have landed by now**.

**Reminders and check-backs (`src/engines/reminders.js`).** The *Check back on* board merges what you asked to be reminded of with what the app works out on its own:

- **Yours (stored, synced):** created by the `+3w` shorthand when you log a push, or added freehand with 3d/1w/2w/3w presets. **Editable in place** — the pencil opens the row for a new title and a new date (the same 3d/1w/2w/3w presets plus a date picker), since a check-back you set three weeks ago is exactly the thing you want to push out another week rather than delete and retype. Ticking one keeps it, stamped, in a collapsed **Done** drawer with a restore button (the same pattern as the notification center's *Snoozed & dismissed*), so a mis-tap isn't lost; the 30 most recent are kept, so the list can't grow without bound.
  - Derived rows have no pencil: they're recomputed from the transfer or balance behind them, so there's no stored text to edit — change the fact and the row changes with it.
  - **Landing a transfer answers its check-back** (`ANSWERED_BY_LANDING`). *Check on $X at \<bank\>* and *confirm the transfer landed* are both asking one question — did that money get there? — and marking it landed answers it, so the reminder ticks itself off into the **Done** drawer instead of going overdue for a check you've already done. Un-landing the transfer brings it straight back; ticking it off by hand keeps it done. Two check-backs deliberately survive a landing, because the arrival doesn't answer them: a **direct-deposit coding check** (*did the bank code it as a DD?*) and any check-back you set on a push you logged as **already landed** (`awaitLanding: false`) — that one is asking about the bonus, not the arrival. A reminder you wrote yourself is never touched. This is enforced in the reminder engine as well as the store, so a push marked landed before the rule existed stops nagging too, with no migration.
- **Derived (never stored, and self-resolving):**
  - **A transfer that should have landed** — an ACH push is treated as late after **5 calendar days** (`EXPECTED_LANDING_DAYS`), because pushes do silently fail and a lost $10k is worth a phone call. Marking it landed clears it.
  - **Cash with no reason to stay where it is** — an account whose bonus has posted *and* cleared the [181-day clawback window](#8-bank-account-tracking), or that is closed but still shows a balance, and has been sitting for **14+ days** (`STRANDED_CASH_DAYS`). Any required minimum balance is subtracted first, so money still doing a job never gets flagged, and the hub is skipped entirely — money there is already home. This is the one that stops $6,000 being forgotten in a bank you close a year later.
- Rows are ordered overdue → due today → soonest → idle cash (biggest balance first), and each links to its account.

**Where it shows up elsewhere:**

- **Action items** — every reminder that is overdue, due today, or idle-cash becomes an action item in the [Action Engine](#2-action-engine-the-brain) under a **Money** category, so it reaches the Dashboard queue and the header [notification center](#3-notification-center--reminders) (a late transfer is `critical`; those link to `/money`, where the fix actually lives).
- **Timeline** — check-back dates and expected landing dates are [calendar events](#4-timeline--calendar--ics-export) under a **Money** filter, so they ride the **.ics export** too.
- **Dashboard** — a Money Map card (reorderable like every other section) showing in-accounts / in-flight / at-the-hub, the accounts holding the most, and the next thing to check on.
- **Nav** — `/money` sits in the sidebar under Accounts and takes a slot in the mobile bottom bar; Timeline moved into the **More** hub. The command palette has a **Money Map** page entry and a **Log a transfer** action.

**Automatic balances are deliberately not here yet.** Every balance stays hand-editable on the Accounts page and in the Money Map, and the transfers write to those same fields as they're sent and landed — so a future bank-balance feed can be dropped in as another writer of them without any of this having to change.

### 10. Points & Loyalty Balances

Page: `/points`. One place to keep every program's balance — the points currently sitting on your cards and loyalty accounts — per person: Chase UR, Amex MR, airline miles, hotel points, or any custom program.

- **One entry per member per program.** The **progressive add form** asks only for program, person, and balance; expiration date and notes stay under **More details (optional)**. The program field is a **custom typeahead** (not a native datalist, which is unreliable across browsers): it filters ~20 known programs as you type (transferable bank currencies, airlines, hotels — `src/utils/programs.js`), with full keyboard navigation, a dropdown toggle, and free text always allowed. Known programs get their brand logo and a **Bank / Airline / Hotel** type tag, everything else is typed **Other**.
- **Estimated cash value** per entry and in the header stats. Rates are **global per program** — there is deliberately no per-balance or per-card override, so one number drives the Points page, the Cards page, the Dashboard pipeline, and Earnings alike. Resolution order: the user's custom per-program rate (**Settings → Point Valuations**) → the program's **built-in default from Frequent Miler's Reasonable Redemption Values** (July 2026 — realistic mid-point redemption values, not aspirational maximums; e.g. Chase UR 1.5¢, Amex MR 1.5¢, Capital One 1.45¢, Bilt 1.55¢, Hyatt 1.5¢, Hilton 0.35¢, Delta 1.1¢) → the household's fallback ¢/point rate for unknown programs. Header shows **total points, total est. value, and program count** for whatever is currently in view (they follow the person filter).
- **Settings → Point Valuations** — every known program listed with its default ¢/pt as the placeholder; type a value to override it app-wide, clear the field to return to the default.
- **Update balance** — the everyday action is one tap: a single-field quick update on each card (Enter saves) that re-stamps the **last-updated date** automatically. Full edit (person, program, balance, program rate, expiration, notes) expands in place; delete asks for confirmation. The **program rate field edits the global valuation** — changing it there is the same as changing it in Settings, and every page updates.
- **Expiration tracking** — an optional expiration date per entry shows an amber **"Expires in Nd"** warning inside 90 days and red once expired (useful for programs that expire with inactivity).
- **Sort & filter** — sort by highest value (default), highest balance, program A–Z, or recently updated; filter by person or program type; opt-in **Group by program** toggle with per-program subtotals (points + est. value).

### 11. Issuer Rule Engines

Page: `/rules`. Each issuer has a dedicated engine and a dashboard widget, evaluated **per member**:

- **Chase 5/24** (`chase524.js`) — counts personal cards opened in the rolling 24-month window. **Every card in the window counts by default**; only cards flagged **Business** or **Authorized user** are excluded (these are the real exceptions to 5/24). Status: *safe* (<4), *warning* (exactly 4), *blocked* (≥5). Shows slots remaining and the date the next slot opens (oldest card in window + 24 months).
- **Amex** (`amex.js`) — enforces **1 new Amex per 5 days** and **2 new Amex per 90 days**, computes next-eligible dates, and notes Amex's "once per lifetime" bonus language.
- **Citi** (`citi.js`) — **1 new Citi per 8 days** and **2 new Citi per 65 days**, with next-eligible dates.
- **Bank of America 2/3/4** (`bofa.js`) — max **2 cards / 2 months**, **3 / 12 months**, **4 / 24 months**, each rule tracked independently with counts.
- **Capital One** (`capitalone.js`) — **1 personal card per 6 months**, with next-eligible date.

A compact **Application Eligibility** section also appears on the Dashboard showing per-person mini-bars for every issuer window that has at least one card actively counted. Only shows issuers with current activity — if all windows are empty, the section stays hidden.

**Card sign-up bonus re-eligibility** (`cardReeligibility.js`) — tracks when each person can earn a specific card's sign-up bonus again, based on per-product cooldown windows measured from the date the bonus was received. Key rules encoded:
- **Chase Sapphire**: Preferred and Reserve share a **48-month** window — a bonus on either card blocks the other.
- **Chase Freedom / Ink / co-brands**: each product has its own independent **24-month** window.
- **Amex personal & business cards**: each product has its own **once-per-lifetime** rule.
- **Citi ThankYou products**: **48-month** per-product window.
- **Capital One**: Venture X **12 months**, Venture/Savor **24 months**.
- **Plus**: Bank of America, US Bank, Wells Fargo, Barclays, and Bilt products.
The widget only shows cards where the bonus has been received (`bonusReceived: true`). Rows are sorted with in-cooldown cards first (soonest-to-unlock), then eligible cards. Uses the bonus received date as the anchor, with openDate as fallback. Shown per person on the Eligibility page as **Card Sign-up Bonus Re-eligibility**.

**Bank bonus eligibility** (`bankEligibility.js`) — the bank equivalent of card re-eligibility, and the single source of truth for all three things that gate a bank bonus:

- **`months`** — the cooldown before that bank pays a new-account bonus again. `0` means once per lifetime.
- **`basis`** — *what the cooldown counts from*, which is the part offer terms actually disagree on and the part that moves the date by months: `bonus` (*"no bonus from us in the past N months"*), `close` (*"no open **or closed** account in the past N months"* — the ones enforced through ChexSystems, since closed accounts stay on that file for five years), or `open` (*"new customers only"*). `getBonusAnchor` resolves the right date per account with a fallback chain, and reports which date it actually used so the UI never mislabels a fallback.
- **`chex`** — how the bank treats your ChexSystems file: `sensitive` (denies over too many recent inquiries), `standard` (pulls it, but relaxed), or `none` (normally no inquiry at all — brokerage-style accounts like Fidelity and Schwab).

Rules on file cover 25 banks: Chase ~24mo from the bonus; Citi, U.S. Bank, PNC, Citizens, Truist and M&T ~24mo from closing; Wells Fargo, Ally and Bilt ~12mo; Capital One, TD, Huntington, Fifth Third, KeyBank, Santander, BMO and Regions ~12mo from closing; once-per-lifetime for Discover and SoFi. A bank with **no** entry deliberately gets no invented window — it falls through to a conservative 24 months from the last bonus, assuming a ChexSystems pull, and is flagged as a fallback. Every window is a community estimate flagged to verify on Doctor of Credit. Shown per person on the Eligibility page as **Bank Bonus Eligibility** (eligible now / *Close first* when the cooldown is served but an account is still open there / cooldown countdown + date / lifetime), with a **Chex** tag on the sensitive banks.

**ChexSystems inquiry tracker** (`chexSystems.js`) — the bank-account counterpart to Chase 5/24, and the reason a clean-looking application still gets denied. Every bank-account application leaves a ChexSystems inquiry that stays on file for **5 years**, and Chex-sensitive banks auto-deny when too many land too fast.

- Counts openings at banks that actually pull ChexSystems in rolling **6 / 12 / 24-month** windows (limits **6 / 12 / 20**), with the **6-month** window as the headline — that's the one banks weight. Openings at `chex: 'none'` banks don't spend a slot.
- A tighter **4-in-6-months** line is tracked separately for the Chex-sensitive banks, because that's the threshold that decides whether one of them says yes today.
- Per-inquiry drop-off dates (when each one leaves the 6-month window), the total still inside the 5-year retention period, and — once the primary window is full — **the date the next slot opens** as the oldest inquiry ages out.
- It counts accounts you **opened**, so the number is a **floor**: a denial you never logged is an inquiry the real report has and this can't see. The widget says so, and points at chexsystems.com for the free annual report. Thresholds are the community's working numbers, not published bank policy.

**Bank Bonus Rules reference table** — a collapsible panel on the Eligibility page listing every bank on file with its cooldown, what that cooldown counts from, and its ChexSystems behavior, so the rule is readable without opening an account first. The footnote names the fallback applied to banks that aren't listed.

**Bank reapply clock** (`bankReeligibility.js`) — the same rules applied at the **account** level instead of the bank level, for **closed accounts only**: the per-account second clock on the [Bank Accounts page](#8-bank-account-tracking). It calls `getBankRule` and `getBonusAnchor` from `bankEligibility.js` rather than restating any window or anchor rule, so a change to a bank's cooldown — or to what that cooldown counts from — moves both views at once.

### 12. What-If Eligibility Simulator

Page: `/simulator`. A scratchpad (nothing persists) for answering *"if I apply for X on this date, what happens?"* — `src/engines/whatIf.js`:

- Pick a member, then add **planned applications** (issuer, optional product, date, business-card flag).
- **Verdict cards** per planned application, evaluated *at its date*, counting both real cards and earlier planned applications: Chase 5/24 (denial verdict for Chase apps; slot-usage info for everything else), Amex 1/5 + 2/90, Citi 1/8 + 2/65, BofA 2/2/3/12/4/24, Capital One 1/6mo. Thresholds mirror the live issuer engines exactly.
- **24-month 5/24 projection** — a month-strip showing the member's 5/24 count at the 1st of each month (green under 4, amber at 4, red at 5+), with and without the planned applications, plus a **drop-off schedule** listing exactly when each existing card leaves the 24-month window and what the count becomes.
- Business cards don't add a 5/24 slot but do count for issuer velocity — the simulator models both.

### 13. Card Lifecycle: Annual Fees, Retention & Re-Eligibility

`src/engines/lifecycle.js` powers the time-based intelligence:

- **Annual fee timing — predicted vs. confirmed** (`getAnnualFeeInfo`) — an annual fee does **not** post on the date the app can predict. Issuers bill it on the **first statement that closes on or after the cycle date** (the open date in year one, the anniversary after that), so it routinely lands weeks late — the sign-up fee on a card opened last week almost certainly hasn't posted yet. The engine therefore never *assumes* a posting; it predicts a window and waits for you to confirm the real date. Each fee cycle is in exactly one of three phases:
  - **Scheduled** — the cycle date is still ahead. Cancel before it and you owe nothing.
  - **Awaiting** — the cycle date has passed with nothing confirmed: the fee is due to hit any day, through **expected-by** = cycle date + the statement lag (**35 days** from an open-date anchor; **7 days** once a real post date has pinned the card's statement day). Past expected-by it's flagged **overdue** — either it slipped by unnoticed or the card's dates are wrong. **No refund clock runs in this phase.**
  - **Posted** — you confirmed the date it actually hit (the **Fee posted** button, stored as `feePostDate`). Only this starts the cancel-for-full-refund countdown, and it counts from the real date.
  - Confirming one posting also pins every later cycle to the card's true statement date, which is what makes year two onward exact. The engine also owns the **first-year-fee-waiver** skip, so the fee reminders, Timeline events, card verdicts, and [Annual Fee Tracker](#14-annual-fee-tracker) all honor it identically. Calendar dates are parsed at local midnight, so no countdown or displayed date shifts by a day in a negative-UTC timezone.
- **Per-issuer fee refund windows** (`getFeeRefundDays`) — how long after a fee posts you can still cancel or downgrade for a **full refund**: **30 days** for most issuers (Chase, Amex, US Bank — and the conservative default for issuers with no consistent policy, like Bank of America), **Citi 37 days**, **Capital One 39 days** (cancellations — downgrades there are inconsistent), **Barclays 60 days**. Verified against One Mile at a Time's refund-rules guide (Aug 2025) and Doctor of Credit's issuer refund rules; policies change, so re-verify before acting. This one map drives the refund countdowns everywhere: the card verdicts, the Annual Fee Tracker, the fee action items, the Timeline events, and the Earnings fees-paid estimate.
- **12-month close shield** (`getCardCloseShield`) — the card version of the bank 181-day clawback rule: a card whose bonus has been earned becomes safe to close **365 days after opening** (closing earlier risks a bonus clawback). A card in *Bonus Earned* status counts as earned even without the received checkbox ticked — the same rule the pipeline uses. Powers the Wait-to-cancel verdict on each card, the primary quick-action flip on Bonus Earned cards, the approaching/cleared reminders, and the Timeline's card safe-to-close events.
- **Cancel-or-downgrade guidance** (`src/engines/cancelGuidance.js`) — folds the close shield, the current fee cycle (`getCardFeeSchedule`), and the issuer's refund window into one per-card verdict (`wait` / `act` / `decide` / `keep`) with a plain-English reason and the date it hinges on. A fee that's due but not yet on the statement gets its own verdict — **Fee lands any day** — because that's the window where cancelling still costs nothing. For cards still inside the clawback year it computes the **best-exit window**: it opens the day the clawback clears and closes when the refund window of the first escapable fee cycle shuts — cancel or downgrade inside it and the bonus is safe **and** the annual fee never sticks (avoided if it hasn't posted, refunded in full if it has). If a fee cycle's refund deadline passes before the clawback clears, that fee is flagged as sunk and the window rolls to the next cycle. Only cards past the earning stage get a verdict — while a bonus is being earned, the spend tracker owns the advice.
- **Re-eligibility** — per-issuer bonus-again windows: **Amex** = once-per-lifetime (not repeatable on the same product), **Chase Sapphire family** = 48 months, **Chase standard** = 24 months, **Citi** = 24 months, **Capital One** = 24 months. Computes your re-eligible date from the bonus-received date.
- **Spend-deadline math** — deadline, days left, percent complete, and met/not-met from open date + deadline days + current spend. Spend **progress** (spent, percent, met) is computed separately from the deadline, so progress bars render even before the open date / spend window is entered — the deadline is attached only when it's computable.
- **Status transitions** — smart status inference on import/add (age + bonus configuration → Earning Bonus / Bonus Earned / Keep Alive); the account version suggests Cooling Period / Safe to Close from the 181-day rule.
- **Attention score** (`getCardAttentionScore`) — the single number behind the Credit Cards page's **Recommended** sort. A base tier comes from the status (Earning Bonus 600 → Applied 550 → Cancel or Downgrade 500 → Bonus Earned 400 → Keep Alive 200 → Downgraded 100 → Closed 0), then urgency bumps stack on top: unmet spend requirement (**+400** past deadline, **+350** ≤ 7d, **+250** ≤ 30d, **+100** otherwise), annual fee (**+380** in the refund window with ≤ 5d left, **+300** in the window, **+260** / **+200** / **+120** for a fee posting within 7 / 14 / 45 days), dormancy from the [credit-age engine](#15-credit-age--keep-alive-tracker) (**+300** past 180 days unused, **+150** past 120), and **+80** once the 12-month close shield has cleared. The bumps are deliberately big enough to cross tiers — a keep-alive card that's gone 6 months without a swipe (real inactivity-closure risk) outranks a quiet Bonus Earned card.

### 14. Annual Fee Tracker

Page: `/fees`. Every annual fee across the household on one screen, sorted by soonest due — so no card's fee ever slips past you. `src/engines/annualFees.js` gathers the per-card date math from the [Card Lifecycle engine](#13-card-lifecycle-annual-fees-retention--re-eligibility) (the same math behind the Timeline fee events and fee action items — no duplicated rules) and adds household totals.

- **At-a-glance totals** that *follow the person filter*, so picking a member shows only their burden: total **fees per year** across all fee cards, the **next fee due** date + card (reading **"Any day now"** when a fee is already due and just waiting on a statement), how many fees fall **within 45 days**, and how many are currently **in the refund window** — that last tile flips to **"Waiting to post"** when no refund clock is running but fees are due.
- **Per-card rows, soonest first**, each showing the card, member, `$X/yr` fee, and a color-coded due line for whichever phase the fee is in ([see the three phases](#13-card-lifecycle-annual-fees-retention--re-eligibility)): a **"Fee due in Nd"** countdown with the date (amber inside two weeks); an amber **"Fee due Nd ago — bills on the next statement"** with the expected-by date while the posting is unconfirmed; or a red/amber **"Fee posted — Nd to cancel for refund"** once confirmed, while the issuer's cancel-for-full-refund clock (30–60 days, see [per-issuer refund windows](#13-card-lifecycle-annual-fees-retention--re-eligibility)) is running. Each row notes whether the cycle is anchored on the **open-date anniversary** or the card's confirmed **Annual Fee Post Date**, and tapping a row jumps to that card.
- **"Fee posted today" button** on every row waiting on a posting — one tap records the real date and starts the refund countdown, without opening the card.
- **First-year-waiver aware** — cards flagged *first-year fee waived* skip the waived sign-up fee and show the first fee actually charged, tagged **"1st-year waived."**
- **Missing a date?** Fee cards with no open date or fee post date can't be scheduled, so they're listed separately with a nudge to add one.
- Retired (Closed / Downgraded) cards are excluded — this is a forward-looking bill, not history.
- **Nothing is called "posted" until you say so.** The page footnote spells out the rule: fees cycle on the anniversary but bill on the first statement after it, so until the real date is confirmed the app won't claim the fee posted (and cancelling first costs nothing).

### 15. Credit Age & Keep-Alive Tracker

`src/engines/creditAge.js` protects the ~15% of a FICO score driven by length of credit history:

- **Average Age of Accounts (AAoA)** per member, across open, dated cards.
- **Keep-alive tracking on every open card** (not just the oldest) — each card gets a usage status: **Active** (used recently), **Use soon** (120+ days), **At risk** (180+ days), or **No usage date**.
- **Three oldest cards starred** ⭐ as highest priority, since closing them shortens your history most.
- **"Used Today" ⚡ button** on Keep Alive cards — one tap marks it used, no date entry. Only shown when the card is in Keep Alive status.
- Inactivity-closure warnings flow into the [Action Queue](#2-action-engine-the-brain).

### 16. Earnings & ROI Analytics

Page: `/earnings`. `src/engines/earnings.js` finally answers *"how much are we actually making?"*:

- **Realized value per card**: bonus counted once received — cash bonuses at face value, points/miles at the card's **global program rate** (inferred from the card name/issuer, then valued at the per-program Settings rate or the published default, falling back to the household fallback ¢/point rate for unknown programs; estimated values are flagged `est.`; there is no per-card rate override). **Fees paid** counts only fee postings that could **actually have been billed**, on the card's **fee-anchor cycle** — the confirmed Annual Fee Post Date when set, otherwise the open date, where the opening-day cycle is the year-1 fee. An unconfirmed cycle allows the same **35-day statement lag** the fee tracker waits on, so a brand-new card doesn't book its first fee as paid on day one while the card itself still says the fee hasn't posted. First-year-waived skips the first posting; the closed date stops the clock; and a posting the card was **closed within the issuer's refund window after is treated as refunded** (the same per-issuer cancel-for-refund rule the Annual Fee tracker uses — 30 days for most issuers, longer for Citi/Capital One/Barclays), so it isn't counted. **Net = realized − fees.**
- **Realized value per bank account**: the bonus amount once received.
- **Headline stats**: household lifetime net, trailing 12 months, current year, total fees paid, plus per-calendar-year chips.
- **Efficiency stats**: $ of bonus per $1 of required spend (over completed card bonuses), average days from open to bonus, bonuses completed.
- **Earnings over time** — a hand-rolled SVG chart of the last 24 months, stacked by member (member identity colors, gridlines, month labels, per-segment tooltips, accessible label).
- **By member** — the headline number is **lifetime net (bonuses − fees)** per member, shown negative in red when fees have outrun bonuses. Bars are sized by |net| and colored **semantically** — green for positive, red for negative — so red always means "losing money", never a member's identity color (that stays on the dot by their name). Sub-line breaks down earned / cards / banks / fees / T12M.
- **The Receipts** — collapsible per-item tables (cards and bank accounts) showing realized bonus, fees, net, and the realization date, newest first.

### 17. Tax Liability Predictor

Page: `/tax`. `src/engines/taxPredictor.js` summarizes the year's taxable income from churning:

- **Bank account bonuses are taxable** (reported on a 1099-INT) — summed per member for the selected tax year. A bonus counts as **received** the same way the rest of the app decides it: an explicit received date, the `bonusReceived` flag, **or** a status past the bonus stage (Bonus Received / Holding / Safe to Close / Closed). It counts as **taxable** unless the account's 1099-INT checkbox is explicitly unticked. Bonuses on accounts whose member was deleted land in an **Unassigned** row rather than vanishing from the household total.
- **Credit-card sign-up bonuses are excluded from the table entirely** — a note under it (and the IRS reference below) explains they're treated as purchase rebates, not income, so they never count for tax.
- **Nothing drops silently.** A received bonus with **no received date** can't be attributed to a year, so it's called out in an amber banner (with links to fix each account) instead of quietly missing; bonuses counted in another year or marked non-taxable are noted under the table.
- **Bonuses counted in \<year\>** — an itemized list of every account behind the total (bank, member, date, amount), each tapping through to the account, so the number can be checked against the 1099-INTs as they arrive.
- Adjustable **federal tax bracket** (stored in settings) produces an **estimated federal tax** on bank bonuses, per member and household-wide.
- **Selectable tax year** — the picker offers every year with recorded bank-bonus income plus the current year, so a stored year can't hide a year's bonuses. CSV export covers the per-member table and the itemized rows.

### 18. Command Palette & Global Search

Press **Ctrl/Cmd-K** anywhere (or the search box in the header) to open the command palette:

- **Searches everything**: cards, bank accounts, points balances, applications, members, and every page — grouped results with member/issuer context lines.
- **Selecting an item jumps to it** and pulses a highlight ring around it (`?highlight=` deep links).
- **Quick actions**: *Add card*, *Add application*, *Add bank account*, *Add points balance*, *Log a transfer* (opens the [Money Map](#9-money-map-transfers-cash-position--check-backs) quick bar), *Export calendar (.ics)*, and *Log spend on \<card\>* for every card with an open spend requirement.
- Fully keyboard driven: type to filter, ↑/↓ to move, Enter to run, Esc to close.

### 19. Member Management

Page: `/members`. Full CRUD over the household: add a member, rename, change role (churner / senior), and recolor (the color drives the member badges and the Earnings chart series everywhere). The app refuses to delete the last remaining member. No names are hardcoded anywhere.

### 20. Resources Hub

Page: `/resources`. A curated launchpad so you never have to look anything up elsewhere. Sections:

- **Best Current Offers** — best credit-card sign-up bonuses, best bank-account bonuses, best business-card offers.
- **Issuer-Specific Rules** — Chase (5/24, 2/30, 1/30…), Amex (5/day, 90-day, lifetime), Citi (1/8, 2/65), Bank of America 2/3/4, Capital One, Barclays.
- **Strategies & Guides** — churning flowchart, r/churning wiki, transfer-partner & point valuations, annual-fee cancel-for-refund guide.
- **Credit Monitoring** — free weekly reports from all 3 bureaus, Credit Karma.
- **Tools** — AwardWallet, MaxRewards, Doctor of Credit offer checker.
- **Community** — r/churning, r/CreditCards, Frequent Miler.

All links open in a new tab.

### 21. Import / Export & AI Import Helper

Page: `/import`.

- **Export** — downloads your full state as a JSON backup file.
- **AI Import Helper** — the fastest way to bulk-load. The prompt is **generated dynamically** with your actual household member names (e.g. Me | Wife | Mom | Dad) so the AI knows exactly who to assign each card to. Copy the prompt, open Claude (or any AI chat), paste the prompt + your credit-report PDF or screenshot, tell the AI whose cards you're importing ("These are Wife's cards" or "assign each to the right person"), and paste the returned JSON back into the app. The AI outputs a `member` field on each item; the import automatically resolves it to the correct member. Works for single-person and multi-person imports in one batch.
  - Credit report import: extracts every open revolving account, maps "Date Opened" → openDate, skips closed accounts/loans/mortgages, auto-flags business cards and authorized-user accounts.
  - Manual/screenshot import: supports all fields including bonus details, spend requirements, DD requirements, annual fees, and status. A bank account imported as *Closed* carries its **closed date** through, so historical accounts land in the [reapply tracker](#8-bank-account-tracking) immediately.
  - A **fallback member** selector in the import UI handles any items the AI couldn't assign.
  - The import deliberately does not set a last-used date — set it yourself via the ⚡ Used Today button when you actually use a card.
- **Import** — paste or file-load JSON, preview what will be added (with per-member assignment breakdown and an unassigned-items warning), then choose **Append** (merge into existing data) or **Replace** (wipe and load fresh). Accepts both the AI simplified format (`{ creditCards, bankAccounts }`) and a full state backup.

### 22. Data Sync (GitHub Gist)

`src/hooks/useGist.js` + `src/store/ChurnContext.jsx`:

- On first launch, a setup screen connects your **GitHub Personal Access Token** and either **creates a new private Gist** (`churner-data.json`) or links an existing Gist ID.
- State changes auto-save to the Gist, **debounced 1.5 seconds** to avoid hammering the API.
- Loads from the Gist on startup; this is how you sync across devices. A **skeleton loading screen** shows while the first load is in flight.
- **Backward-compatible loading** — every field added since your Gist was written is defaulted on load (deep-defaulting for nested settings/notification state), and the old `players`/`playerId` schema is migrated automatically. Older data never breaks or loses anything.
- **Offline fallback** — a local cache in `localStorage` keeps the app working without a connection and on API errors.
- A live **sync indicator** in the header shows syncing / synced-at / error states, with retry/reconnect actions on failure.

### 23. UI / UX & Design System

- **Semantic design tokens** — all colors flow through CSS custom properties (light values on `:root`, dark on `html.dark`) exposed as Tailwind classes: surfaces (`base → surface → raised → overlay`), borders (`edge`, `edge-strong`), text emphasis (`ink` → `ink-faint`), brand accent, and status colors (`success/warning/danger/info`, each with a text-legible `-ink` variant). **Both themes are first-class** — no override hacks; components use tokens and the theme flips underneath.
- **Light / dark mode** — a toggle in Settings switches instantly; the preference persists in localStorage, and the correct theme is applied before first render to prevent flash. Tailwind's `darkMode: 'class'` strategy.
- **Shared component atoms** (`src/components/shared/`): Button, Panel, EmptyState, Skeleton, StatCard, PageHeader, Field/inputs, Modal (focus-trapped, ARIA dialog), StatusBadge (theme-aware status colors, including application statuses), FilterBar (with a persistent trailing slot for view toggles like Group by brand and Table), TrackerTable (the horizontally-scrolling milestone grid behind the [tracker tables](#25-milestone-tracker-table), with a pinned identity column), IssuerLogo, DateField, PlayerBadge, ProgressBar.
- **Accessibility** — global keyboard focus ring, `prefers-reduced-motion` support (all animations collapse), aria-labels on icon-only buttons, semantic headings, keyboard-navigable palette/modals/menus, colorblind-validated default member palette.
- **Micro-interactions** — route fade transitions, panel scale-in, slide-up forms, highlight pulse on palette/notification jumps; all subtle and motion-safe.
- **Responsive SPA** — desktop sidebar (collapsible, grouped: main / Insights / Manage) and a mobile bottom nav (Dashboard, Cards, Accounts, Money, **More** — a hub page for everything else, Timeline included), switching at the 1024px breakpoint, with safe-area padding.
- **HashRouter** routing so deep links work on GitHub Pages without server config.
- **Expand-in-place editing** everywhere — no modal dialogs for data entry.
- **Configurable dashboard** — reorder sections per device.
- **Issuer logos** — real brand logos via Google's public favicon service (no auth, no user data sent — just the public brand domain), with a brand-colored monogram fallback if a logo can't load.
- **Error boundary** — a class-based React error boundary catches render errors and shows a recoverable screen instead of a blank page.
- **Real empty states** on every view, and **member color badges** and **status badges** for instant scanning.

---

### 24. Installable App (PWA) & Offline Support

Churner is an installable Progressive Web App — Chrome/Edge offer **Install app**, and iOS Safari's *Add to Home Screen* produces a real app icon rather than a bookmark.

- **Web app manifest** (`public/manifest.webmanifest`) — name "Churner — Bonus Tracker", short name "Churner", `display: standalone` (no browser chrome), `start_url`/`scope` both relative (`./`) so they stay correct under the `/Churner/` Pages base path, and `background_color`/`theme_color` `#09090b` to match the default dark theme.
- **Icons** (`public/`) — `icon-192.png` and `icon-512.png` (purpose `any`, rounded), `icon-maskable-512.png` (purpose `maskable`, full-bleed with the artwork inside the safe zone so Android's adaptive shapes don't clip it), `apple-touch-icon.png` (180×180) for iOS, and `icon.svg` as the scalable source and browser favicon.
- **Service worker** (`public/sw.js`), registered from `src/registerSW.js`:
  - **Navigations are network-first**, falling back to the cached app shell when offline — a new Pages deploy is picked up on the next load, and the app still opens with no connection.
  - **Static build assets are cache-first with background refresh.** Vite fingerprints its output, so a cached filename is always the right bytes.
  - **Everything cross-origin is skipped entirely** — no interception, no caching (see [Privacy & Security](#privacy--security)).
  - Caches are versioned (`churner-<VERSION>`); older caches are deleted on activate. **Bump `VERSION` in `public/sw.js` whenever that file changes.**
  - Registration is **production-only**, so `npm run dev` is never served from cache.
- **Theme-aware app chrome** — the `theme-color` meta tag is set before first render and updated by the Settings light/dark toggle, so the installed app's title/status bar tracks the theme.

---

### 25. Milestone Tracker Table

The spreadsheet view of a churn plan: one row per card or account, one column per step in its lifecycle, so a whole household reads at a glance instead of card by card. A **Table** toggle sits beside *Group by brand* / *Group by bank* on both the [Credit Cards](#5-credit-card-tracking) and [Bank Accounts](#8-bank-account-tracking) pages.

- **Same data as the list.** The table renders whatever the page's person filter, filter chips, and sort already produced — the two views can't disagree about what's in scope or what order it's in. Grouping is hidden while the table is up, since a grouped grid defeats the point.
- **Bank account columns:** Bank (with logo, member dot, last 4) · Person · Type · Status · Opened · Bonus · Requirement · DD · Posted · Close after · Closed · Reapply.
  - **Requirement** is rebuilt from the account's structured fields — `$500 DD ×2 · $1,500 bal · 90d` — so the plan's shorthand is derived, never a second free-text field to keep in sync.
  - **DD** shows the completed/required fraction while several deposits are needed (the same count the account's `+ Direct Deposit N/M` button increments), or the linked date when one is enough.
  - **Close after** is the [181-day clawback shield](#8-bank-account-tracking); **Reapply** is the [bank reapply clock](#11-issuer-rule-engines), reading *Now*, a date, *Lifetime*, or *Close others* when another account at that bank is still open.
- **Credit card columns:** Card (with logo, member dot, last 4) · Person · Status · Opened · Bonus · Min spend · Spent · Spend by · Bonus posted · Fee · Fee due · Close after · Closed.
  - **Spent** carries the percent complete; **Spend by** colors amber inside 30 days and red once the deadline has passed unmet.
  - **Fee due** carries the fee phase from the [lifecycle engine](#13-card-lifecycle-annual-fees-retention--re-eligibility) — a countdown, *any day* while a due fee waits on the statement, or the refund clock once you confirm it posted.
  - **Close after** is the 12-month close shield, checked off in green once the bonus is safe.
- **Read-only by design.** Every edit and one-tap lifecycle action already lives on the card, with its undo — so tapping a table row flips back to the list and flashes that item rather than duplicating the lifecycle logic in a second place.
- **Scrolls horizontally with the identity column pinned**, so the card/bank name stays put while you read across on a phone. Dates render compactly (`Mar 3`), a completed step shows a green check, and a step that hasn't happened shows an em-dash.

---

## Privacy & Security

- Your **Personal Access Token is stored in `localStorage` only** — never committed to the repo and never written into the Gist data.
- Your data lives in a **private GitHub Gist that only you can see.**
- **Your PAT is never sent anywhere except GitHub's API.**
- The token needs only the **`gist`** scope — nothing more.
- **The service worker never touches your data.** It only handles same-origin requests inside the app's own scope (the shell, build assets, icons). Gist sync calls to `api.github.com` — and every other third-party request — are cross-origin, so they pass straight through untouched: nothing private is ever written to the Cache API, and a stale cached response can never shadow a live sync.

---

## Tech Stack

- **React 19** + **Vite** + **Tailwind CSS v3** (semantic token theme)
- **react-router-dom v7** (HashRouter)
- **lucide-react** icons
- State via **`useReducer` + Context API**
- Data sync via the **GitHub Gist REST API**
- **PWA**: hand-written web app manifest + service worker (no build plugin), served from `public/`
- Charts are hand-rolled SVG — no chart library

---

## Getting Started

```bash
npm install
npm run dev      # local dev server with HMR
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint     # eslint
```

On first run, the app prompts you to connect a GitHub PAT (with `gist` scope) and create or link a private Gist.

---

## Deployment

Deployed to **GitHub Pages via GitHub Actions** (`.github/workflows/deploy.yml`). Every push to `main` builds the app and publishes it through the official Pages deployment flow (`upload-pages-artifact` + `deploy-pages`).

> **Repo setting required:** Settings → Pages → Build and deployment → **Source: GitHub Actions**.

`vite.config.js` sets `base: '/Churner/'` so asset paths resolve correctly under the project's Pages URL. `index.html` references the manifest and icons through Vite's `%BASE_URL%` placeholder, and the service worker registers under that same base — so the app installs correctly from the project Pages URL without hard-coded paths.

Pages serves over HTTPS, which is what makes the service worker (and therefore installability) work in the first place.

---

## Data Model

State (synced as `churner-data.json`). Every field below is optional at load time — older Gists are deep-defaulted, so no field is required to exist:

```
version            3
members[]          { id, name, role: 'churner'|'senior', hex }
creditCards[]      { id, memberId, status, cardName, issuer, last4,
                     openDate, lastUsedDate, closedDate,
                     currentBalance, creditLimit,
                     spendRequirement, spendDeadlineDays, currentSpend,
                     spendLog[] { id, date, amount, note },
                     bonusValue, bonusType,
                     annualFee, feeWaivedFirstYear,
                     feePostDate,          ← CONFIRMED date the fee last posted
                     bonusReceived, bonusReceivedDate,
                     isBusiness, isAuthorizedUser, downgradedToCard, notes }
bankAccounts[]     { id, memberId, status, bankName, accountType, last4,
                     openedDate,
                     closedDate,           ← starts the reapply clock
                     currentBalance, bonusAmount, color,
                     openingBalance,       ← what it held before the first logged
                                             transfer (0 for a churn opened empty)
                     bonusReceived,        ← derived from the date/status on save
                     bonusReceivedDate, requiredDD, requiredDDCount, ddsMade,
                     ddDeadlineDays, ddLinkedDate, ddSourceDescription,
                     minimumBalance, bonusDeadlineDays, etfDays, isTaxable,
                     isHub,                ← this account is the money-map hub
                     offerUrl, notes }
pointsBalances[]   { id, memberId, program, balance,
                     expirationDate, updatedAt, notes }
cashSources[]      { id, name, type: 'brokerage'|'bank'|'other',
                     isHub,               ← the one node money comes home to
                     balance,             ← null = deliberately not tracked
                     color, notes }
moneyMapLayout     { [nodeKey]: { side: 'left'|'right', order, hidden } }
                                          ← how you arranged the map's cards;
                                            sparse, absent = automatic placement
transfers[]        { id, amount,
                     fromKey, toKey,      ← 'source:<id>' or 'account:<id>'
                     purpose: 'dd'|'fund'|'return'|'other',
                     sentDate,            ← debits the source
                     landedDate,          ← credits the destination; null = in flight
                     expectedDays,        ← optional; defaults to 5
                     note, createdAt }
reminders[]        { id, kind: 'check_bonus'|'check_transfer'|'sweep_back'
                                |'check_dd'|'custom',
                     title, notes, dueDate,
                     accountId, transferId, amount,
                     awaitLanding,        ← false = set on an already-landed push,
                                            so landing it never closes this one
                     doneDate,            ← ticked; 30 most recent kept for undo
                     autoDone,            ← closed by the transfer landing, not by
                                            you; un-landing reopens it
                     createdAt }
applications[]     { id, memberId, product, issuer,
                     status: 'planned'|'applied'|'pending'|'approved'|'denied',
                     appliedDate, decisionDate, deniedReason, notes,
                     bonusValue, bonusType, spendRequirement, spendDeadlineDays,
                     annualFee, isBusiness, convertedCardId, createdAt }
notifications      { seen[], dismissed { itemId: dismissedAtISO },
                     snoozed { itemId: wakeAtISO } }      ← synced dismiss/snooze
seniorIncome       { [memberId]: { ssMonthly, accessibleSupport } }
externalPayments[]
taxYear
settings           { taxBracket, pointValueCents, notifyEnabled,
                     programValueCents { programName: centsPerPoint } }
```

Engines with no synced state of their own: `events.js` (timeline), `annualFees.js` (fee tracker), `earnings.js`, `burnRate.js`, `moneyFlow.js` (the money map's nodes, ribbons, totals and quick-entry parser — all derived from `cashSources`, `transfers` and the accounts' own balances), `reminders.js` (merges the stored `reminders[]` with derived late-transfer and stranded-cash rows, which are deliberately never persisted), `bankReeligibility.js` (bank reapply clock — derived entirely from account dates + `bankEligibility.js`'s windows and basis), `chexSystems.js` (inquiry counts — derived entirely from `bankAccounts[].openedDate` plus each bank's `chex` classification), `whatIf.js` (simulator inputs are deliberately not persisted).

---

## Maintaining This README

**This README is the canonical feature list and must stay in sync with the app.** Whenever a feature is added, changed, or removed — a new engine, a new field, a new page, a new action-item type, a changed issuer rule — update the relevant section here in the same change. If you're an AI assistant working in this repo, treat updating this README as part of the definition of done for any feature work.
