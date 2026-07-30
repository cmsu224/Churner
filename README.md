# Churner — Four-Person Churning Management System

A fast, lightweight web dashboard for running credit-card sign-up bonuses and bank-account bonuses across a **four-person household** — built for two high-velocity churners plus two retired seniors on Social Security. It tells you, in advance, exactly what to do next: when to spend, when to cancel, when a fee posts, when a bonus clears clawback, and when you're eligible to apply again — and now also what you're actually earning, what to apply for next, and how today's application ripples through 5/24 for the next two years.

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
  - [9. Points & Loyalty Balances](#9-points--loyalty-balances)
  - [10. Issuer Rule Engines](#10-issuer-rule-engines)
  - [11. What-If Eligibility Simulator](#11-what-if-eligibility-simulator)
  - [12. Card Lifecycle: Annual Fees, Retention & Re-Eligibility](#12-card-lifecycle-annual-fees-retention--re-eligibility)
  - [13. Annual Fee Tracker](#13-annual-fee-tracker)
  - [14. Credit Age & Keep-Alive Tracker](#14-credit-age--keep-alive-tracker)
  - [15. Earnings & ROI Analytics](#15-earnings--roi-analytics)
  - [16. Tax Liability Predictor](#16-tax-liability-predictor)
  - [17. Command Palette & Global Search](#17-command-palette--global-search)
  - [18. Member Management](#18-member-management)
  - [19. Resources Hub](#19-resources-hub)
  - [20. Import / Export & AI Import Helper](#20-import--export--ai-import-helper)
  - [21. Data Sync (GitHub Gist)](#21-data-sync-github-gist)
  - [22. UI / UX & Design System](#22-ui--ux--design-system)
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

Members are **fully editable** — none of the names, colors, or roles are hardcoded. Add, rename, recolor, or delete members freely (see [Member Management](#18-member-management)). Every card, account, application, and rule check is attributed to a member. The default member colors are a colorblind-validated categorical set (they double as chart series colors on the Earnings page), but any color can be chosen.

---

## Feature Catalog

### 1. Command Center Dashboard

The home screen (`/`) is a prioritized command center, not a passive summary. **Every section is reorderable** — tap **Customize** to move sections up/down; the layout is saved per device (localStorage). Default order: Individual Summary → Bonus Pipeline → Application Eligibility → Credit Age & Usage → Spend Challenges → Action Items → Stats. The dashboard is also **fluid**: summary cards, pipeline rows, spend tiles, and stat tiles are all clickable drill-downs into their detail screens.

- **Individual Summary** — per-person rollup of activity, including a **Bonus Pipeline** (dollar value of bonuses still being worked toward; points/miles are valued at their global program rate, never counted as raw dollars, and flagged `est.` when estimated). **Clicking a member's card opens the Cards page pre-filtered to that person** (`/cards?member=…`); the Accounts mini-tile opens their bank accounts instead.
- **Bonus Pipeline** — the household's money in flight, itemized: every bonus still being worked toward as its own line (brand, member, dollar value), sorted by value, with the running total in the header. **Only in-flight bonuses count** (one shared engine rule): a card must be in Applied or Earning Bonus — a card marked **Bonus Earned drops out even if its "bonus received" checkbox hasn't been ticked yet** — and an account already at Bonus Received / Holding / Safe to Close is out even without a received date. Card points/miles are valued the same way as everywhere else — the card's global program rate, flagged `est.` — so you can see exactly which bonuses make up the pipeline, not just the sum. **Each row is a drill-down**: clicking jumps to that card or account on its own page and flashes it.
- **Application Eligibility** — compact per-member issuer bars (Chase 5/24, Amex, Citi, BofA, Capital One), only shown when a window has active cards counted. Shows "next slot" dates when blocked.
- **Credit Age & Card Usage** — per-person panels showing average account age and keep-alive status of every open card (see [Credit Age Tracker](#14-credit-age--keep-alive-tracker)).
- **Active Spend Challenges** — live progress bars for every card with an open minimum-spend requirement, showing dollars spent vs. required, days remaining, and the **burn-rate projection** (on pace / off pace — need $X/week). Cards whose deadline can't be computed yet (no open date or spend-window days) still show their progress bar with a "no deadline set" note instead of disappearing. Clicking a tile jumps to that card on the Cards page.
- **Action Queue** — a single ranked list of *everything you need to do*, pulled from every card and account (see [Action Engine](#2-action-engine-the-brain)). Items can be **dismissed or snoozed (1/3/7 days)** — both synced across devices. If nothing is pending, you get an "all caught up" state instead.
- **Stats bar** — cash pipeline (total tracked bonus value in flight), count of active cards, and count of bank accounts at a glance. Each tile drills in: the pipeline tile scrolls to the itemized Bonus Pipeline section, the counts open the Cards / Accounts pages.

### 2. Action Engine (the brain)

`src/engines/actionItems.js` scans your entire portfolio and generates a single, deduplicated, **priority-sorted** to-do list. Items are ranked **critical → warning → info**, and within each tier by soonest due date. Each item carries a category icon, a plain-English explanation of *why it matters and what to do*, and a suggested action label.

The engine generates these item types:

**Credit-card items**
- **Spend deadline** — four tiers: *overdue* (critical, with "call the issuer for an extension" guidance), *≤7 days* (critical, with tactics: prepay bills, buy gift cards, pay rent through a service), *≤30 days* (warning), and on-track tracking. Shows exact dollars remaining and the deadline date.
- **Spend pace (off pace)** — warning that fires when the current spending pace will miss the deadline: shows the projected completion date at the current $/week and the $/week needed from here. Only fires outside the ≤7-day window (the critical items above own the endgame) and once a card is 2+ weeks old, so brand-new cards don't alarm before spending starts. Pace comes from the spend log's last 30 days when entries exist, otherwise from the flat average since opening (see [Spend Logging](#6-spend-logging--burn-rate-projection)).
- **Annual fee — refund window** — when a fee has already posted, counts down the **issuer's cancel-for-full-refund window** (critical at ≤5 days), with the option to product-change to a no-fee card to keep the history.
- **Annual fee — upcoming** — fires within 45 days of a fee posting, coaching you to call the retention line first, then either cancel before it posts or let it post and refund within the issuer's window.
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

**Keep-alive items (every open card)**
- **At risk** (critical, 180+ days unused), **use soon** (120+ days), and **track usage** (no last-used date set on one of your 3 oldest cards). The three oldest cards get the highest priority because they anchor your credit history.

**Dismiss & snooze, synced.** Every item can be dismissed (X) or snoozed for 1, 3, or 7 days (clock). This state lives in the synced Gist data — dismissing an item on your phone dismisses it on your laptop. Dismissals recorded under the old per-device model are migrated into the synced store automatically on first load.

### 3. Notification Center & Reminders

A **bell icon in the header** (every screen) opens the notification center:

- **Unread badge** — count of active action items you haven't seen yet; opening the panel marks the current items seen (synced, and pruned so state can't grow unbounded).
- Each notification links straight to its card or account (jump + highlight flash), and has inline **dismiss** and **snooze (1/3/7d)** controls — the same synced state as the Dashboard queue.
- A collapsed **"Snoozed & dismissed"** drawer lets you restore anything.

**Browser notifications (opt-in, Settings):** while the app is open, a system notification fires the moment an action item *newly becomes critical*. Enabling walks through the browser permission prompt; blocked/unsupported browsers degrade gracefully with a clear status message. Notified-item tracking is per device.

**When the app is closed**, the honest answer for a static SPA is the calendar: the Settings copy points to the Timeline page's **Export .ics** so deadlines live in Google/Apple Calendar with native reminders.

### 4. Timeline / Calendar & .ics Export

Page: `/timeline`. Every dated event across the household, in one place, sourced from the existing engines (`src/engines/events.js` reuses their math — no duplicated rule logic):

- **Event types:** spend deadlines, annual-fee post dates, fee-refund window closes, retention-call window opens (card turns 10 months old), card safe-to-close dates (the 12-month close shield clears), card bonus re-eligibility dates, direct-deposit deadlines, bank-bonus offer deadlines, clawback-clear ("safe to close") dates, early-termination-fee window ends, and bank bonus re-eligibility dates.
- **Two views:** a **month calendar** (prev/today/next, event chips per day, tap a day for its agenda) and an **agenda list** grouped by month with an **Overdue** section on top. Mobile defaults to agenda.
- **Filters** by member and by category (Spend / Fees / Banks / Eligibility).
- **Export .ics** — generates an iCalendar file client-side (RFC 5545: proper escaping, line folding, all-day VEVENTs, stable UIDs) from the *currently filtered upcoming events*, one VEVENT per item, summaries like `[Churner] Wife: Spend deadline: Sapphire Preferred`. Import or subscribe in Google/Apple Calendar for reminders while the app is closed.
- Window: events from 30 days back (overdue) to 18 months out.

### 5. Credit Card Tracking

Page: `/cards`. Cards render as **expand-in-place** rows — tap to edit inline, no modals. Only the **card name is required**; everything else is optional so data entry stays fluid. Cards are **grouped by issuer** (Chase, American Express, Citi, …, with an "Other" bucket), each group headed by the issuer's **logo**.

**Tracked fields:** person, status, card name, issuer (with autocomplete for Chase, Amex, Capital One, Citi, Bank of America, Barclays, Wells Fargo, US Bank, Discover), last 4, open date, last-used date, **current balance**, **credit limit**, minimum-spend requirement / deadline days / current spend, **itemized spend log**, bonus value & type (points / cash / miles), annual fee, **first-year-fee-waived** flag, **annual-fee post date** (the date the fee actually posts — anchors the fee cycle when statement dates lag the open date), "bonus received" + received date, **closed/downgraded date**, and the **"Business card"** / **"Authorized user"** flags (which exclude a card from Chase 5/24 — see below).

**Statuses** (friendly labels; stored values stable): Applied → Earning Bonus → Bonus Earned → Keep Alive → Cancel or Downgrade → Downgraded / Closed. **The collapsed card adapts to the status** — each lifecycle stage surfaces only the facts that matter for it (see the status-aware display bullet below).

**Highlights**
- **Status-aware card display** — what the collapsed card shows depends on where it is in its lifecycle:
  - *Applied / Earning Bonus* — the bonus in the pipeline, the live spend progress bar with deadline + pace projection, and the "+ Log" spend button.
  - *Bonus Earned / Cancel or Downgrade* — the decision facts: **Bonus earned** (cash, or points + est. value), **Next annual fee** (amount · date · day countdown — or, when a fee just posted, the **refund deadline**), and the one-line **cancel-or-downgrade verdict** (next bullet), which carries the 12-month clawback / safe-to-cancel timing.
  - *Keep Alive* — deliberately lean: the age & fee badges in the header, **last used** with the one-tap Used-today pill, and the next annual fee (or refund countdown) when the card carries one. **Status buttons disappear from the collapsed card** — expanding it reveals the verdict line plus a **Mark as** action strip above the edit form (applying an action also closes the form, so a stale draft can't overwrite the new status on Save).
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
  - **Credit cards** — filter by status (multi-select), issuer/brand (auto-populated, multi-select), age range (< 1yr / 1–2yr / 2–4yr / 4+yr), and toggle chips for "Has annual fee", "Bonus pending", "Hide closed/downgraded", "Hide keep-alive". Sort by Recommended, Newest, Oldest, Highest annual fee, or Name A–Z.
  - **"Recommended" is the default sort** — cards are ordered by how much attention they need right now, most urgent first, using the [attention score](#12-card-lifecycle-annual-fees-retention--re-eligibility) (`getCardAttentionScore`). Broadly: cards earning a bonus at the top, then applications, cancel-or-downgrade decisions and earned bonuses, with keep-alive cards at the bottom and retired cards last — except that a genuinely time-sensitive card (blown spend deadline, open fee-refund window, a keep-alive card drifting toward inactivity closure) floats above its tier. Ties break to newest first.
  - **"Hide keep-alive" is on by default** — long-term keep cards need no action, so the list opens focused on cards that do. Whenever it's suppressing cards, a "*N* keep-alive cards hidden — show them" link appears under the list (and in the empty state) to bring them back in one click. Selecting the **Keep Alive** status pill overrides the hide, so filtering *for* keep-alive cards always works. Turning the chip off counts toward the active-filter badge, since the default state is on.
  - **Bank accounts** — filter by status, bank (auto-populated), account type (Checking/Savings/Money Market/CD), and toggle chips for "Has bonus offer", "Bonus pending". Sort by Newest, Oldest, Highest bonus, or Bank A–Z.
  - Active filter count badge on the "Clear filters" button. The list is a **flat, global** order that always honors the chosen sort — so "Newest first" is genuinely newest-first for the whole page, regardless of issuer. Grouping by issuer/bank (with brand logos) is an explicit, always-visible **Group by brand / Group by bank** toggle that's **off by default**.
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

**Tracked fields:** person, status, bank name, account type, last 4, opened date, **current balance**, bonus amount, bonus received date, **direct-deposit requirements** (direct deposit amount, # of direct deposits required, # completed, direct deposit deadline in days, direct deposit linked date, direct deposit source — e.g. payroll, Social Security, ACH), minimum balance, bonus deadline (days), **early-termination-fee window (days)**, offer link, and notes.

The direct deposit fields drive the multi-tier direct-deposit reminders, the multi-DD progress tracker, and the minimum-balance and bonus-deadline countdowns in the [Action Engine](#2-action-engine-the-brain). The **181-day clawback shield** tells you when each account is safe to close, and the optional ETF window feeds an "early-termination fee window ends" event on the [Timeline](#4-timeline--calendar--ics-export).

**Contextual edit form** — both the add and edit forms adapt to the account's status. The **Sign-Up Bonus** section (bonus amount, deadline, minimum balance, ETF window, taxable checkbox, bonus received date) only appears when the account is in a bonus-earning status or bonus data exists. The **Direct Deposit Requirements** section only appears when the status is Opened/DD Linked or when direct deposit data is present. On the add form, current balance, minimum balance, bonus received date, offer link, and notes stay tucked under **More details (optional)**. "Direct Deposit" is always spelled out in full — never abbreviated.

### 9. Points & Loyalty Balances

Page: `/points`. One place to keep every program's balance — the points currently sitting on your cards and loyalty accounts — per person: Chase UR, Amex MR, airline miles, hotel points, or any custom program.

- **One entry per member per program.** The **progressive add form** asks only for program, person, and balance; expiration date and notes stay under **More details (optional)**. The program field is a **custom typeahead** (not a native datalist, which is unreliable across browsers): it filters ~20 known programs as you type (transferable bank currencies, airlines, hotels — `src/utils/programs.js`), with full keyboard navigation, a dropdown toggle, and free text always allowed. Known programs get their brand logo and a **Bank / Airline / Hotel** type tag, everything else is typed **Other**.
- **Estimated cash value** per entry and in the header stats. Rates are **global per program** — there is deliberately no per-balance or per-card override, so one number drives the Points page, the Cards page, the Dashboard pipeline, and Earnings alike. Resolution order: the user's custom per-program rate (**Settings → Point Valuations**) → the program's **built-in default from Frequent Miler's Reasonable Redemption Values** (July 2026 — realistic mid-point redemption values, not aspirational maximums; e.g. Chase UR 1.5¢, Amex MR 1.5¢, Capital One 1.45¢, Bilt 1.55¢, Hyatt 1.5¢, Hilton 0.35¢, Delta 1.1¢) → the household's fallback ¢/point rate for unknown programs. Header shows **total points, total est. value, and program count** for whatever is currently in view (they follow the person filter).
- **Settings → Point Valuations** — every known program listed with its default ¢/pt as the placeholder; type a value to override it app-wide, clear the field to return to the default.
- **Update balance** — the everyday action is one tap: a single-field quick update on each card (Enter saves) that re-stamps the **last-updated date** automatically. Full edit (person, program, balance, program rate, expiration, notes) expands in place; delete asks for confirmation. The **program rate field edits the global valuation** — changing it there is the same as changing it in Settings, and every page updates.
- **Expiration tracking** — an optional expiration date per entry shows an amber **"Expires in Nd"** warning inside 90 days and red once expired (useful for programs that expire with inactivity).
- **Sort & filter** — sort by highest value (default), highest balance, program A–Z, or recently updated; filter by person or program type; opt-in **Group by program** toggle with per-program subtotals (points + est. value).

### 10. Issuer Rule Engines

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

**Bank bonus eligibility** (`bankEligibility.js`) — the bank equivalent of card re-eligibility. For each bank a person has used, it shows when they can earn that bank's new-account bonus again, based on a per-bank cooldown measured from the last bonus received (or last account opened if none yet). Known windows include Chase ~24mo, Wells Fargo ~12mo, Capital One/TD ~12mo, and once-per-lifetime banks like Discover and SoFi; unknown banks default to a conservative 24 months. Windows are estimates flagged to verify on Doctor of Credit. Shown per person on the Eligibility page as **Bank Bonus Eligibility** (eligible now / cooldown countdown + date / lifetime).

### 11. What-If Eligibility Simulator

Page: `/simulator`. A scratchpad (nothing persists) for answering *"if I apply for X on this date, what happens?"* — `src/engines/whatIf.js`:

- Pick a member, then add **planned applications** (issuer, optional product, date, business-card flag).
- **Verdict cards** per planned application, evaluated *at its date*, counting both real cards and earlier planned applications: Chase 5/24 (denial verdict for Chase apps; slot-usage info for everything else), Amex 1/5 + 2/90, Citi 1/8 + 2/65, BofA 2/2/3/12/4/24, Capital One 1/6mo. Thresholds mirror the live issuer engines exactly.
- **24-month 5/24 projection** — a month-strip showing the member's 5/24 count at the 1st of each month (green under 4, amber at 4, red at 5+), with and without the planned applications, plus a **drop-off schedule** listing exactly when each existing card leaves the 24-month window and what the count becomes.
- Business cards don't add a 5/24 slot but do count for issuer velocity — the simulator models both.

### 12. Card Lifecycle: Annual Fees, Retention & Re-Eligibility

`src/engines/lifecycle.js` powers the time-based intelligence:

- **Annual fee timing** — the fee posts on each anniversary of the **fee anchor**: the card's recorded **Annual Fee Post Date** when set (statement fee dates often lag the open date), otherwise the open date. The engine finds the next fee date, detects whether you're inside the **cancel-for-refund window**, and reports days until fee / refund days left / refund deadline. The anchored dates flow through to the fee reminders, the Timeline/calendar fee events, and the [Annual Fee Tracker](#13-annual-fee-tracker) automatically.
- **Per-issuer fee refund windows** (`getFeeRefundDays`) — how long after a fee posts you can still cancel or downgrade for a **full refund**: **30 days** for most issuers (Chase, Amex, US Bank — and the conservative default for issuers with no consistent policy, like Bank of America), **Citi 37 days**, **Capital One 39 days** (cancellations — downgrades there are inconsistent), **Barclays 60 days**. Verified against One Mile at a Time's refund-rules guide (Aug 2025) and Doctor of Credit's issuer refund rules; policies change, so re-verify before acting. This one map drives the refund countdowns everywhere: the card verdicts, the Annual Fee Tracker, the fee action items, the Timeline events, and the Earnings fees-paid estimate.
- **12-month close shield** (`getCardCloseShield`) — the card version of the bank 181-day clawback rule: a card whose bonus has been earned becomes safe to close **365 days after opening** (closing earlier risks a bonus clawback). A card in *Bonus Earned* status counts as earned even without the received checkbox ticked — the same rule the pipeline uses. Powers the Wait-to-cancel verdict on each card, the primary quick-action flip on Bonus Earned cards, the approaching/cleared reminders, and the Timeline's card safe-to-close events.
- **Cancel-or-downgrade guidance** (`src/engines/cancelGuidance.js`) — folds the close shield, the next fee posting (`getCardFeeSchedule`), and the issuer's refund window into one per-card verdict (`wait` / `act` / `decide` / `keep`) with a plain-English reason and the date it hinges on. For cards still inside the clawback year it computes the **best-exit window**: it opens the day the clawback clears and closes when the refund window of the first escapable fee cycle shuts — cancel or downgrade inside it and the bonus is safe **and** the annual fee never sticks (avoided if it hasn't posted, refunded in full if it has). If a fee cycle's refund deadline passes before the clawback clears, that fee is flagged as sunk and the window rolls to the next cycle. Only cards past the earning stage get a verdict — while a bonus is being earned, the spend tracker owns the advice.
- **Re-eligibility** — per-issuer bonus-again windows: **Amex** = once-per-lifetime (not repeatable on the same product), **Chase Sapphire family** = 48 months, **Chase standard** = 24 months, **Citi** = 24 months, **Capital One** = 24 months. Computes your re-eligible date from the bonus-received date.
- **Spend-deadline math** — deadline, days left, percent complete, and met/not-met from open date + deadline days + current spend. Spend **progress** (spent, percent, met) is computed separately from the deadline, so progress bars render even before the open date / spend window is entered — the deadline is attached only when it's computable.
- **Status transitions** — smart status inference on import/add (age + bonus configuration → Earning Bonus / Bonus Earned / Keep Alive); the account version suggests Cooling Period / Safe to Close from the 181-day rule.
- **Attention score** (`getCardAttentionScore`) — the single number behind the Credit Cards page's **Recommended** sort. A base tier comes from the status (Earning Bonus 600 → Applied 550 → Cancel or Downgrade 500 → Bonus Earned 400 → Keep Alive 200 → Downgraded 100 → Closed 0), then urgency bumps stack on top: unmet spend requirement (**+400** past deadline, **+350** ≤ 7d, **+250** ≤ 30d, **+100** otherwise), annual fee (**+380** in the refund window with ≤ 5d left, **+300** in the window, **+260** / **+200** / **+120** for a fee posting within 7 / 14 / 45 days), dormancy from the [credit-age engine](#7-credit-age--keep-alive-tracker) (**+300** past 180 days unused, **+150** past 120), and **+80** once the 12-month close shield has cleared. The bumps are deliberately big enough to cross tiers — a keep-alive card that's gone 6 months without a swipe (real inactivity-closure risk) outranks a quiet Bonus Earned card.

### 13. Annual Fee Tracker

Page: `/fees`. Every annual fee across the household on one screen, sorted by soonest due — so no card's fee ever slips past you. `src/engines/annualFees.js` gathers the per-card date math from the [Card Lifecycle engine](#12-card-lifecycle-annual-fees-retention--re-eligibility) (the same math behind the Timeline fee events and fee action items — no duplicated rules) and adds household totals.

- **At-a-glance totals** that *follow the person filter*, so picking a member shows only their burden: total **fees per year** across all fee cards, the **next fee due** date + card, how many fees fall **within 45 days**, and how many are currently **in the refund window**.
- **Per-card rows, soonest first**, each showing the card, member, `$X/yr` fee, and a color-coded due line: a **"Fee posts in Nd"** countdown with the date (amber inside two weeks), or a red/amber **"Fee posted — Nd to cancel for refund"** while the issuer's cancel-for-full-refund clock (30–60 days, see [per-issuer refund windows](#12-card-lifecycle-annual-fees-retention--re-eligibility)) is running. Each row notes whether the countdown is anchored on the **open-date anniversary** or the card's explicit **Annual Fee Post Date**, and tapping a row jumps to that card.
- **First-year-waiver aware** — cards flagged *first-year fee waived* skip the waived sign-up fee and show the first fee actually charged, tagged **"1st-year waived."**
- **Missing a date?** Fee cards with no open date or fee post date can't be scheduled, so they're listed separately with a nudge to add one.
- Retired (Closed / Downgraded) cards are excluded — this is a forward-looking bill, not history.

### 14. Credit Age & Keep-Alive Tracker

`src/engines/creditAge.js` protects the ~15% of a FICO score driven by length of credit history:

- **Average Age of Accounts (AAoA)** per member, across open, dated cards.
- **Keep-alive tracking on every open card** (not just the oldest) — each card gets a usage status: **Active** (used recently), **Use soon** (120+ days), **At risk** (180+ days), or **No usage date**.
- **Three oldest cards starred** ⭐ as highest priority, since closing them shortens your history most.
- **"Used Today" ⚡ button** on Keep Alive cards — one tap marks it used, no date entry. Only shown when the card is in Keep Alive status.
- Inactivity-closure warnings flow into the [Action Queue](#2-action-engine-the-brain).

### 15. Earnings & ROI Analytics

Page: `/earnings`. `src/engines/earnings.js` finally answers *"how much are we actually making?"*:

- **Realized value per card**: bonus counted once received — cash bonuses at face value, points/miles at the card's **global program rate** (inferred from the card name/issuer, then valued at the per-program Settings rate or the published default, falling back to the household fallback ¢/point rate for unknown programs; estimated values are flagged `est.`; there is no per-card rate override). **Fees paid** counts only fee postings that have **actually occurred**, on the card's **fee-anchor cycle** — the recorded Annual Fee Post Date when set (statement fee dates often lag the open date), otherwise the open date, where the opening-day posting is the year-1 fee. First-year-waived skips the first posting; the closed date stops the clock; and a posting the card was **closed within the issuer's refund window after is treated as refunded** (the same per-issuer cancel-for-refund rule the Annual Fee tracker uses — 30 days for most issuers, longer for Citi/Capital One/Barclays), so it isn't counted. **Net = realized − fees.**
- **Realized value per bank account**: the bonus amount once received.
- **Headline stats**: household lifetime net, trailing 12 months, current year, total fees paid, plus per-calendar-year chips.
- **Efficiency stats**: $ of bonus per $1 of required spend (over completed card bonuses), average days from open to bonus, bonuses completed.
- **Earnings over time** — a hand-rolled SVG chart of the last 24 months, stacked by member (member identity colors, gridlines, month labels, per-segment tooltips, accessible label).
- **By member** — the headline number is **lifetime net (bonuses − fees)** per member, shown negative in red when fees have outrun bonuses. Bars are sized by |net| and colored **semantically** — green for positive, red for negative — so red always means "losing money", never a member's identity color (that stays on the dot by their name). Sub-line breaks down earned / cards / banks / fees / T12M.
- **The Receipts** — collapsible per-item tables (cards and bank accounts) showing realized bonus, fees, net, and the realization date, newest first.

### 16. Tax Liability Predictor

Page: `/tax`. `src/engines/taxPredictor.js` summarizes the year's taxable income from churning:

- **Bank account bonuses are taxable** (reported on a 1099-INT) — summed per member for the selected tax year.
- **Credit-card sign-up bonuses are excluded from the table entirely** — a note under it (and the IRS reference below) explains they're treated as purchase rebates, not income, so they never count for tax.
- Adjustable **federal tax bracket** (stored in settings) produces an **estimated federal tax** on bank bonuses, per member and household-wide.
- Selectable tax year and a CSV-style export of the table.

### 17. Command Palette & Global Search

Press **Ctrl/Cmd-K** anywhere (or the search box in the header) to open the command palette:

- **Searches everything**: cards, bank accounts, points balances, applications, members, and every page — grouped results with member/issuer context lines.
- **Selecting an item jumps to it** and pulses a highlight ring around it (`?highlight=` deep links).
- **Quick actions**: *Add card*, *Add application*, *Add bank account*, *Add points balance*, *Export calendar (.ics)*, and *Log spend on \<card\>* for every card with an open spend requirement.
- Fully keyboard driven: type to filter, ↑/↓ to move, Enter to run, Esc to close.

### 18. Member Management

Page: `/members`. Full CRUD over the household: add a member, rename, change role (churner / senior), and recolor (the color drives the member badges and the Earnings chart series everywhere). The app refuses to delete the last remaining member. No names are hardcoded anywhere.

### 19. Resources Hub

Page: `/resources`. A curated launchpad so you never have to look anything up elsewhere. Sections:

- **Best Current Offers** — best credit-card sign-up bonuses, best bank-account bonuses, best business-card offers.
- **Issuer-Specific Rules** — Chase (5/24, 2/30, 1/30…), Amex (5/day, 90-day, lifetime), Citi (1/8, 2/65), Bank of America 2/3/4, Capital One, Barclays.
- **Strategies & Guides** — churning flowchart, r/churning wiki, transfer-partner & point valuations, annual-fee cancel-for-refund guide.
- **Credit Monitoring** — free weekly reports from all 3 bureaus, Credit Karma.
- **Tools** — AwardWallet, MaxRewards, Doctor of Credit offer checker.
- **Community** — r/churning, r/CreditCards, Frequent Miler.

All links open in a new tab.

### 20. Import / Export & AI Import Helper

Page: `/import`.

- **Export** — downloads your full state as a JSON backup file.
- **AI Import Helper** — the fastest way to bulk-load. The prompt is **generated dynamically** with your actual household member names (e.g. Me | Wife | Mom | Dad) so the AI knows exactly who to assign each card to. Copy the prompt, open Claude (or any AI chat), paste the prompt + your credit-report PDF or screenshot, tell the AI whose cards you're importing ("These are Wife's cards" or "assign each to the right person"), and paste the returned JSON back into the app. The AI outputs a `member` field on each item; the import automatically resolves it to the correct member. Works for single-person and multi-person imports in one batch.
  - Credit report import: extracts every open revolving account, maps "Date Opened" → openDate, skips closed accounts/loans/mortgages, auto-flags business cards and authorized-user accounts.
  - Manual/screenshot import: supports all fields including bonus details, spend requirements, DD requirements, annual fees, and status.
  - A **fallback member** selector in the import UI handles any items the AI couldn't assign.
  - The import deliberately does not set a last-used date — set it yourself via the ⚡ Used Today button when you actually use a card.
- **Import** — paste or file-load JSON, preview what will be added (with per-member assignment breakdown and an unassigned-items warning), then choose **Append** (merge into existing data) or **Replace** (wipe and load fresh). Accepts both the AI simplified format (`{ creditCards, bankAccounts }`) and a full state backup.

### 21. Data Sync (GitHub Gist)

`src/hooks/useGist.js` + `src/store/ChurnContext.jsx`:

- On first launch, a setup screen connects your **GitHub Personal Access Token** and either **creates a new private Gist** (`churner-data.json`) or links an existing Gist ID.
- State changes auto-save to the Gist, **debounced 1.5 seconds** to avoid hammering the API.
- Loads from the Gist on startup; this is how you sync across devices. A **skeleton loading screen** shows while the first load is in flight.
- **Backward-compatible loading** — every field added since your Gist was written is defaulted on load (deep-defaulting for nested settings/notification state), and the old `players`/`playerId` schema is migrated automatically. Older data never breaks or loses anything.
- **Offline fallback** — a local cache in `localStorage` keeps the app working without a connection and on API errors.
- A live **sync indicator** in the header shows syncing / synced-at / error states, with retry/reconnect actions on failure.

### 22. UI / UX & Design System

- **Semantic design tokens** — all colors flow through CSS custom properties (light values on `:root`, dark on `html.dark`) exposed as Tailwind classes: surfaces (`base → surface → raised → overlay`), borders (`edge`, `edge-strong`), text emphasis (`ink` → `ink-faint`), brand accent, and status colors (`success/warning/danger/info`, each with a text-legible `-ink` variant). **Both themes are first-class** — no override hacks; components use tokens and the theme flips underneath.
- **Light / dark mode** — a toggle in Settings switches instantly; the preference persists in localStorage, and the correct theme is applied before first render to prevent flash. Tailwind's `darkMode: 'class'` strategy.
- **Shared component atoms** (`src/components/shared/`): Button, Panel, EmptyState, Skeleton, StatCard, PageHeader, Field/inputs, Modal (focus-trapped, ARIA dialog), StatusBadge (theme-aware status colors, including application statuses), FilterBar (with a persistent trailing slot for view toggles like Group by brand), IssuerLogo, DateField, PlayerBadge, ProgressBar.
- **Accessibility** — global keyboard focus ring, `prefers-reduced-motion` support (all animations collapse), aria-labels on icon-only buttons, semantic headings, keyboard-navigable palette/modals/menus, colorblind-validated default member palette.
- **Micro-interactions** — route fade transitions, panel scale-in, slide-up forms, highlight pulse on palette/notification jumps; all subtle and motion-safe.
- **Responsive SPA** — desktop sidebar (collapsible, grouped: main / Insights / Manage) and a mobile bottom nav (Dashboard, Cards, Accounts, Timeline, **More** — a hub page for everything else), switching at the 1024px breakpoint, with safe-area padding.
- **HashRouter** routing so deep links work on GitHub Pages without server config.
- **Expand-in-place editing** everywhere — no modal dialogs for data entry.
- **Configurable dashboard** — reorder sections per device.
- **Issuer logos** — real brand logos via Google's public favicon service (no auth, no user data sent — just the public brand domain), with a brand-colored monogram fallback if a logo can't load.
- **Error boundary** — a class-based React error boundary catches render errors and shows a recoverable screen instead of a blank page.
- **Real empty states** on every view, and **member color badges** and **status badges** for instant scanning.

---

## Privacy & Security

- Your **Personal Access Token is stored in `localStorage` only** — never committed to the repo and never written into the Gist data.
- Your data lives in a **private GitHub Gist that only you can see.**
- **Your PAT is never sent anywhere except GitHub's API.**
- The token needs only the **`gist`** scope — nothing more.

---

## Tech Stack

- **React 19** + **Vite** + **Tailwind CSS v3** (semantic token theme)
- **react-router-dom v7** (HashRouter)
- **lucide-react** icons
- State via **`useReducer` + Context API**
- Data sync via the **GitHub Gist REST API**
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

`vite.config.js` sets `base: '/Churner/'` so asset paths resolve correctly under the project's Pages URL.

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
                     annualFee, feeWaivedFirstYear, feePostDate,
                     bonusReceived, bonusReceivedDate,
                     isBusiness, isAuthorizedUser, downgradedToCard, notes }
bankAccounts[]     { id, memberId, status, bankName, accountType, last4,
                     openedDate, currentBalance, bonusAmount, bonusReceived,
                     bonusReceivedDate, requiredDD, requiredDDCount, ddsMade,
                     ddDeadlineDays, ddLinkedDate, ddSourceDescription,
                     minimumBalance, bonusDeadlineDays, etfDays, isTaxable,
                     offerUrl, notes }
pointsBalances[]   { id, memberId, program, balance,
                     expirationDate, updatedAt, notes }
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

Engines with no synced state of their own: `events.js` (timeline), `annualFees.js` (fee tracker), `earnings.js`, `burnRate.js`, `whatIf.js` (simulator inputs are deliberately not persisted).

---

## Maintaining This README

**This README is the canonical feature list and must stay in sync with the app.** Whenever a feature is added, changed, or removed — a new engine, a new field, a new page, a new action-item type, a changed issuer rule — update the relevant section here in the same change. If you're an AI assistant working in this repo, treat updating this README as part of the definition of done for any feature work.
