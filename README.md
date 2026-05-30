# Churner — Four-Person Churning Management System

A fast, lightweight web dashboard for running credit-card sign-up bonuses and bank-account bonuses across a **four-person household** — built for two high-velocity churners plus two retired seniors on Social Security. It tells you, in advance, exactly what to do next: when to spend, when to cancel, when a fee posts, when a bonus clears clawback, and when you're eligible to apply again.

No backend, no subscription, no database server. The whole app is a static single-page application that syncs your data through a **private GitHub Gist** you control. Host it free on GitHub Pages.

**Live app:** https://cmsu224.github.io/Churner/

---

## Table of Contents

- [Concept](#concept)
- [Feature Catalog](#feature-catalog)
  - [1. Command Center Dashboard](#1-command-center-dashboard)
  - [2. Action Engine (the brain)](#2-action-engine-the-brain)
  - [3. Credit Card Tracking](#3-credit-card-tracking)
  - [4. Bank Account Tracking](#4-bank-account-tracking)
  - [5. Issuer Rule Engines](#5-issuer-rule-engines)
  - [6. Card Lifecycle: Annual Fees, Retention & Re-Eligibility](#6-card-lifecycle-annual-fees-retention--re-eligibility)
  - [7. Credit Age & Keep-Alive Tracker](#7-credit-age--keep-alive-tracker)
  - [8. Senior Income Tracking](#8-senior-income-tracking)
  - [9. External Payer Monitor](#9-external-payer-monitor)
  - [10. Tax Liability Predictor](#10-tax-liability-predictor)
  - [11. Player Management](#11-player-management)
  - [12. Resources Hub](#12-resources-hub)
  - [13. Import / Export & AI Import Helper](#13-import--export--ai-import-helper)
  - [14. Data Sync (GitHub Gist)](#14-data-sync-github-gist)
  - [15. UI / UX](#15-ui--ux)
- [Privacy & Security](#privacy--security)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Data Model](#data-model)
- [Maintaining This README](#maintaining-this-readme)

---

## Concept

The household has **four "players"** by default, each with a role:

| Player | Role | Purpose |
|--------|------|---------|
| Me | `churner` | High-velocity churning |
| Wife | `churner` | High-velocity churning |
| Mom | `senior` | Retired, on Social Security |
| Dad | `senior` | Retired, on Social Security |

Players are **fully editable** — none of the names, colors, or roles are hardcoded. Add, rename, recolor, or delete players freely (see [Player Management](#11-player-management)). Every card, account, and rule check is attributed to a player.

---

## Feature Catalog

### 1. Command Center Dashboard

The home screen (`/`) is a prioritized command center, not a passive summary. **Every section is reorderable** — tap **Customize** to move sections up/down; the layout is saved per device (localStorage). Default order: Individual Summary → Application Eligibility → Credit Age & Usage → Spend Challenges → Action Items → Stats.

- **Individual Summary** — per-person rollup of activity.
- **Application Eligibility** — compact per-person issuer bars (Chase 5/24, Amex, Citi, BofA, Capital One), only shown when a window has active cards counted. Shows "next slot" dates when blocked.
- **Credit Age & Card Usage** — per-person panels showing average account age and keep-alive status of every open card (see [Credit Age Tracker](#7-credit-age--keep-alive-tracker)).
- **Active Spend Challenges** — live progress bars for every card with an open minimum-spend requirement, showing dollars spent vs. required and days remaining.
- **Action Queue** — a single ranked list of *everything you need to do*, pulled from every card and account (see [Action Engine](#2-action-engine-the-brain)). If nothing is pending, you get an "all caught up" state instead.
- **Stats bar** — cash pipeline (total tracked bonus value in flight), count of active cards, and count of bank accounts at a glance.

### 2. Action Engine (the brain)

`src/engines/actionItems.js` scans your entire portfolio and generates a single, deduplicated, **priority-sorted** to-do list. Items are ranked **critical → warning → info**, and within each tier by soonest due date. Each item carries a category icon, a plain-English explanation of *why it matters and what to do*, and a suggested action label.

The engine generates these item types:

**Credit-card items**
- **Spend deadline** — four tiers: *overdue* (critical, with "call the issuer for an extension" guidance), *≤7 days* (critical, with tactics: prepay bills, buy gift cards, pay rent through a service), *≤30 days* (warning), and on-track tracking. Shows exact dollars remaining and the deadline date.
- **Annual fee — refund window** — when a fee has already posted, counts down the **30-day cancel-for-full-refund** window (critical at ≤5 days), with the option to product-change to a no-fee card to keep the history.
- **Annual fee — upcoming** — fires within 45 days of a fee posting, coaching you to call the retention line first, then either cancel before it posts or let it post and refund within 30 days.
- **Retention call due** — for fee cards aged 10–12 months, prompts you to call the retention/loyalty line and ask for an offer.
- **Stale status** — flags cards marked "bonus received" but still showing an earning status so your tracker stays accurate.
- **Re-eligibility** — tells you when you can earn a card's sign-up bonus again (per-issuer windows).

**Bank-account items**
- **Direct-deposit deadline** — five tiers (overdue / ≤7d / ≤30d / ≤60d, plus a generic fallback when no DD-deadline is set), each with the required DD amount, source, and exact date.
- **Multi-DD progress** — when an offer needs multiple qualifying deposits, tracks "X of Y completed" and how many remain.
- **Minimum-balance reminder** — reminds you to keep the required balance to avoid fees and qualify.
- **Bonus deadline** — overall offer-window countdown; if it expires, prompts you to call the bank to claim a manually-earned bonus.
- **Clawback / cooling period** — counts down the **181-day** hold before a bonus is safe from clawback, then flips to "safe to close."

**Keep-alive items (every open card)**
- **At risk** (critical, 180+ days unused), **use soon** (120+ days), and **track usage** (no last-used date set on one of your 3 oldest cards). The three oldest cards get the highest priority because they anchor your credit history.

### 3. Credit Card Tracking

Page: `/cards`. Cards render as **expand-in-place** rows — tap to edit inline, no modals. Only the **card name is required**; everything else is optional so data entry stays fluid. Cards are **grouped by issuer** (Chase, American Express, Citi, …, with an "Other" bucket), each group headed by the issuer's **logo**.

**Tracked fields:** person, status, card name, issuer (with autocomplete for Chase, Amex, Capital One, Citi, Bank of America, Barclays, Wells Fargo, US Bank, Discover), last 4, open date, last-used date, **current balance**, **credit limit**, minimum-spend requirement / deadline days / current spend, bonus value & type (points / cash / miles), annual fee, "bonus received" + received date, and the **"Business card"** / **"Authorized user"** flags (which exclude a card from Chase 5/24 — see below).

**Statuses** (friendly labels; stored values stable): Applied → Earning Bonus → Bonus Earned → Keep Alive → Annual Fee Decision → Cancel or Downgrade → Closed. The lifecycle engine suggests the next status automatically.

**Highlights**
- **Card age badge** — the collapsed header always shows how old the card is (e.g. "2y 3mo" or "8mo"), calculated from the open date so you can instantly judge credit-history impact.
- **Annual fee badge** — if a card has an annual fee, it shows as `$X/yr` right in the collapsed header alongside the age badge, so you never forget what a card costs you.
- **Dynamic status action buttons** — context-sensitive one-tap buttons appear on every card based on its current status, so you can advance the lifecycle without opening the edit form:
  - *Applied* → **Card Arrived** (→ Earning Bonus)
  - *Earning Bonus* → **✓ Bonus Received** (sets bonusReceived + bonusReceivedDate + status in one tap). Cards with no sign-up bonus (points/perks-only cards) show **→ Keep Alive** instead.
  - *Bonus Earned* → **Annual Fee Decision** (→ Annual Fee Decision status) or **→ Keep Alive**
  - *Annual Fee Decision* → **✓ Keep It** (→ Keep Alive) or **Close / Downgrade** (→ Cancel or Downgrade)
  - *Keep Alive* → **Fee Decision** (→ Annual Fee Decision)
  - *Cancel or Downgrade* → **✓ Mark Closed** or **Keep It** (→ Keep Alive)
- **Undo button** — after any quick-action tap, an **↩ Undo** button appears for 6 seconds to instantly revert the change. No confirmation dialog.
- **Smart status on import** — when importing cards from a credit report (where bonus status is unknown), the app infers the right status from the card's age: under 6 months → Earning Bonus; 6–10 months → Bonus Earned (bonus assumed received); 11–13 months → Annual Fee Decision; 14+ months → Keep Alive. Cards with no bonus details are set to Keep Alive regardless of age.
- **Smart status on manual add** — same age-based logic applies when you add a card manually and leave the status at the default. If you explicitly pick a status in the dropdown, that choice is respected as-is.
- **Balance bar** on every card — green/empty when paid off, amber (with utilization % if a credit limit is set) when a balance is owed, so you instantly see which cards carry a balance.
- **"Used Today" ⚡ button** — one tap on the collapsed card sets the last-used date to today. Only visible on **Keep Alive** cards (the only status where usage tracking matters). No date picker — built specifically because typing dates is the most painful part of upkeep.
- **Live spend progress bar** right on the collapsed card, color-coded by urgency.
- **Clearable date fields** — press Backspace/Delete or click the × to clear a date (desktop-friendly), plus the native picker for mobile.
- **Required fields are accent-highlighted**; optional fields are muted gray so you know what to ignore.
- **Per-person filter** buttons plus a full **filter + sort bar** on both the Credit Cards and Bank Accounts pages:
  - **Credit cards** — filter by status (multi-select), issuer/brand (auto-populated, multi-select), age range (< 1yr / 1–2yr / 2–4yr / 4+yr), and toggle chips for "Has balance", "Has annual fee", "Bonus pending", "Hide closed". Sort by Newest, Oldest, Highest balance, Highest annual fee, or Name A–Z.
  - **Bank accounts** — filter by status, bank (auto-populated), account type (Checking/Savings/Money Market/CD), and toggle chips for "Has balance", "Has bonus offer", "Bonus pending". Sort by Newest, Oldest, Highest balance, Highest bonus, or Bank A–Z.
  - Active filter count badge on the "Clear filters" button; any sort other than "Newest" renders a flat list so sort order is obvious; default sort keeps issuer/bank grouping with logos.
- **Contextual edit form** — the inline edit form adapts to the card's status so you only see relevant fields. The **Earning Bonus** section (spend req, days, spent) only appears for Earning Bonus cards or when spend data exists. The **Bonus & Rewards** section (bonus value, type, annual fee, received date) is hidden for Closed cards unless data is present. The **Last Used** field only appears on Keep Alive cards or when a date is already set.
- Inline add form with every field and inline delete with confirmation.

### 4. Bank Account Tracking

Page: `/accounts`. Same expand-in-place pattern; only **bank name is required**. Accounts are **grouped by bank** with the bank's **logo** in each group header.

**Tracked fields:** person, status, bank name, account type, last 4, opened date, **current balance**, bonus amount, bonus received date, **direct-deposit requirements** (direct deposit amount, # of direct deposits required, # completed, direct deposit deadline in days, direct deposit linked date, direct deposit source — e.g. payroll, Social Security, ACH), minimum balance, bonus deadline (days), offer link, and notes.

Every account shows a **balance bar** so you can instantly spot which accounts still hold money versus which are emptied out and can be ignored. The direct deposit fields drive the multi-tier direct-deposit reminders, the multi-DD progress tracker, and the minimum-balance and bonus-deadline countdowns in the [Action Engine](#2-action-engine-the-brain). The **181-day clawback shield** tells you when each account is safe to close.

**Contextual edit form** — the inline edit form adapts to the account's status. The **Sign-Up Bonus** section (bonus amount, deadline, minimum balance, taxable checkbox, bonus received date) only appears when the account is in a bonus-earning status or bonus data exists. The **Direct Deposit Requirements** section only appears when the status is Opened/DD Linked or when direct deposit data is present. "Direct Deposit" is always spelled out in full — never abbreviated.

### 5. Issuer Rule Engines

Page: `/rules`. Each issuer has a dedicated engine and a dashboard widget, evaluated **per player**:

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

Also on the Eligibility page: the [Senior Income](#8-senior-income-tracking) widget and the [External Payer Monitor](#9-external-payer-monitor).

### 6. Card Lifecycle: Annual Fees, Retention & Re-Eligibility

`src/engines/lifecycle.js` powers the time-based intelligence:

- **Annual fee timing** — the fee posts on each anniversary of the open date. The engine finds the next fee date, detects whether you're inside the **30-day cancel-for-refund** window, and reports days until fee / refund days left / refund deadline.
- **Re-eligibility** — per-issuer bonus-again windows: **Amex** = once-per-lifetime (not repeatable on the same product), **Chase Sapphire family** = 48 months, **Chase standard** = 24 months, **Citi** = 24 months, **Capital One** = 24 months. Computes your re-eligible date from the bonus-received date.
- **Spend-deadline math** — deadline, days left, percent complete, and met/not-met from open date + deadline days + current spend.
- **Status transitions** — suggests Bonus Met / Retention Call Due / Downgrade-Close Due based on bonus status and card age; the account version uses the 181-day rule.

### 7. Credit Age & Keep-Alive Tracker

`src/engines/creditAge.js` protects the ~15% of a FICO score driven by length of credit history:

- **Average Age of Accounts (AAoA)** per player, across open, dated cards.
- **Keep-alive tracking on every open card** (not just the oldest) — each card gets a usage status: **Active** (used recently), **Use soon** (120+ days), **At risk** (180+ days), or **No usage date**.
- **Three oldest cards starred** ⭐ as highest priority, since closing them shortens your history most.
- **"Used Today" ⚡ button** on Keep Alive cards — one tap marks it used, no date entry. Only shown when the card is in Keep Alive status.
- Inactivity-closure warnings flow into the [Action Queue](#2-action-engine-the-brain).

### 8. Senior Income Tracking

`src/engines/seniorIncome.js` — tracks monthly Social Security and other accessible support for senior players, rolling up to annual SS, annual support, total accessible income per senior, and a combined household figure. Useful for sizing how much direct-deposit / spend capacity the seniors can realistically support.

### 9. External Payer Monitor

A Rules-page widget (`ExternalPayerMonitor.jsx`, backed by `externalPayments` state) for tracking external/manufactured payments and incoming money movement relevant to meeting bonus requirements.

### 10. Tax Liability Predictor

Page: `/tax`. `src/engines/taxPredictor.js` summarizes the year's taxable income from churning:

- **Bank account bonuses are taxable** (reported on a 1099-INT) — summed per player for the selected tax year.
- **Credit-card sign-up bonuses are treated as rebates (tax-free)** — shown as $0.
- Adjustable **federal tax bracket** (stored in settings) produces an **estimated federal tax** on bank bonuses, per player and household-wide.
- Selectable tax year and a CSV-style export of the table.

### 11. Player Management

Page: `/players`. Full CRUD over the household: add a player, rename, change role (churner / senior), and recolor (the color drives the player badges everywhere). The app refuses to delete the last remaining player. No names are hardcoded anywhere.

### 12. Resources Hub

Page: `/resources`. A curated launchpad so you never have to look anything up elsewhere. Sections:

- **Best Current Offers** — best credit-card sign-up bonuses, best bank-account bonuses, best business-card offers.
- **Issuer-Specific Rules** — Chase (5/24, 2/30, 1/30…), Amex (5/day, 90-day, lifetime), Citi (1/8, 2/65), Bank of America 2/3/4, Capital One, Barclays.
- **Strategies & Guides** — churning flowchart, r/churning wiki, transfer-partner & point valuations, annual-fee cancel-for-refund guide.
- **Credit Monitoring** — free weekly reports from all 3 bureaus, Credit Karma.
- **Tools** — AwardWallet, MaxRewards, Doctor of Credit offer checker.
- **Community** — r/churning, r/CreditCards, Frequent Miler.

All links open in a new tab.

### 13. Import / Export & AI Import Helper

Page: `/import`.

- **Export** — downloads your full state as a JSON backup file.
- **AI Import Helper** — the fastest way to bulk-load. Copy the built-in prompt, open Claude (or any AI chat), paste the prompt **plus a screenshot of your cards/accounts or a downloaded credit-report PDF**, and paste the returned JSON back into the app. The prompt extracts every open revolving account from a credit report, mapping **"Date Opened" → openDate**, account name → cardName, and last 4 digits → last4. The import deliberately does not set a last-used date — set it yourself via the ⚡ Used Today button when you actually use a card. A credit report is ideal because it carries every card's open date, which powers the age tracker.
- **Import** — paste or file-load JSON, preview what will be added, then choose **Append** (merge into existing data) or **Replace** (wipe and load fresh). Accepts both the AI simplified format (`{ creditCards, bankAccounts }`) and a full state backup.

### 14. Data Sync (GitHub Gist)

`src/hooks/useGist.js` + `src/store/ChurnContext.jsx`:

- On first launch, a setup screen connects your **GitHub Personal Access Token** and either **creates a new private Gist** (`churner-data.json`) or links an existing Gist ID.
- State changes auto-save to the Gist, **debounced 1.5 seconds** to avoid hammering the API.
- Loads from the Gist on startup; this is how you sync across devices.
- **Offline fallback** — a local cache in `localStorage` keeps the app working without a connection and on API errors.
- A live **sync indicator** in the header shows syncing / synced-at / error states.

### 15. UI / UX

- **Light / dark mode** — a Sun/Moon toggle in the sidebar (desktop) and header (mobile) switches between dark and light themes instantly. The preference persists in localStorage, and the correct theme is applied before first render to prevent flash. Tailwind's `darkMode: 'class'` strategy; light mode overrides live in `src/index.css`.
- **Dark, responsive SPA** — desktop sidebar (collapsible) and mobile bottom-nav, switching at the 1024px breakpoint.
- **HashRouter** routing so deep links work on GitHub Pages without server config.
- **Expand-in-place editing** everywhere — no modal dialogs.
- **Configurable dashboard** — reorder sections per device.
- **Issuer logos** — real brand logos via Google's public favicon service (no auth, no user data sent — just the public brand domain), with a brand-colored monogram fallback if a logo can't load.
- **Error boundary** — a class-based React error boundary catches render errors and shows a recoverable screen instead of a blank page.
- **Person color badges** and **status badges** for instant scanning.

---

## Privacy & Security

- Your **Personal Access Token is stored in `localStorage` only** — never committed to the repo and never written into the Gist data.
- Your data lives in a **private GitHub Gist that only you can see.**
- **Your PAT is never sent anywhere except GitHub's API.**
- The token needs only the **`gist`** scope — nothing more.

---

## Tech Stack

- **React 19** + **Vite** + **Tailwind CSS v3**
- **react-router-dom v7** (HashRouter)
- **lucide-react** icons
- State via **`useReducer` + Context API**
- Data sync via the **GitHub Gist REST API**

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

State (synced as `churner-data.json`):

```
version
players[]          { id, name, role: 'churner'|'senior', hex }
creditCards[]      { id, playerId, status, cardName, issuer, last4,
                     openDate, lastUsedDate, currentBalance, creditLimit,
                     spendRequirement, spendDeadlineDays, currentSpend,
                     bonusValue, bonusType, annualFee, bonusReceived,
                     bonusReceivedDate, isBusiness, isAuthorizedUser, notes }
bankAccounts[]     { id, playerId, status, bankName, accountType, last4,
                     openedDate, currentBalance, bonusAmount, bonusReceivedDate,
                     requiredDD, requiredDDCount, ddsMade, ddDeadlineDays,
                     ddLinkedDate, ddSourceDescription, minimumBalance,
                     bonusDeadlineDays, offerUrl, notes }
seniorIncome       { [playerId]: { ssMonthly, accessibleSupport } }
externalPayments[]
taxYear
settings           { taxBracket }
```

---

## Maintaining This README

**This README is the canonical feature list and must stay in sync with the app.** Whenever a feature is added, changed, or removed — a new engine, a new field, a new page, a new action-item type, a changed issuer rule — update the relevant section here in the same change. If you're an AI assistant working in this repo, treat updating this README as part of the definition of done for any feature work.
