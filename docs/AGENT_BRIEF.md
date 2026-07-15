# Feature-agent brief (temporary file; removed before PR merge)

You are implementing one feature of the Churner app (React 19 + Vite + Tailwind 3.4, **no
TypeScript**, lucide-react icons only). Read `CLAUDE.md` first. Match existing code style
(single quotes, no semicolons where absent, 2-space indent, functional components).

## Hard rules

- Do NOT touch: `src/components/layout/*`, `src/store/ChurnContext.jsx`, `src/index.css`,
  `tailwind.config.js`, `README.md`, `PROGRESS.md`, any existing engine's existing functions
  (adding new exported functions to a NEW engine file is your lane), other features' folders.
- Do NOT run `git` commands, `npm run build`, or `npm run dev`. Verify with
  `npx eslint <your-files>` only.
- No new npm dependencies. No real personal data in code or sample data.
- Your view is NOT wired into routes/nav yet — the orchestrator does that. Just export a
  default component.

## Design tokens (use these, never raw zinc/blue/etc classes)

- Backgrounds: `bg-base` (page) → `bg-surface` (cards) → `bg-raised` (inputs/nested) →
  `bg-overlay` (hover). Borders: `border-edge`, `border-edge-strong`.
- Text: `text-ink` (headings) → `text-ink-secondary` → `text-ink-muted` → `text-ink-tertiary`
  (labels) → `text-ink-faint` (fine print).
- Accent: `bg-accent hover:bg-accent-hover text-white` (primary buttons), `text-accent-ink`
  (links/active). Status: `success` / `warning` / `danger` / `info` each with `-ink` text
  variant (e.g. `text-success-ink`, `bg-danger/15`, `border-warning/30`). Alpha works:
  `bg-accent/15`.
- Animations available: `animate-fade-in`, `animate-slide-up`, `animate-scale-in` (all respect
  reduced motion). Shadows: `shadow-card`, `shadow-pop`.

## Shared atoms (`src/components/shared/`) — use them

- `Button` — props: `variant` (primary|subtle|outline|ghost|danger), `size` (xs|sm|md), rest
  spread onto `<button>`.
- `Panel` — surface container (`bg-surface border border-edge rounded-xl shadow-card`).
- `EmptyState` — `{ icon (lucide comp), title, hint, action (node) }`.
- `PageHeader` — `{ title, actions }` h1 row.
- `StatCard` — `{ label, value, sub, tone (default|success|warning|danger|accent) }`.
- `Field` — `{ label, required, hint, children }`; also exports `inp` / `inpRequired` input
  class strings. `DateField` — clearable date input `{ value, onChange }`.
- `StatusBadge` — `{ status }` (knows card, account, AND application statuses).
- `PlayerBadge` — `{ memberId, showName }` member color dot + name.
- `IssuerLogo` — `{ name, size }` brand logo w/ fallback. `Modal` — `{ title, onClose, wide }`
  (focus-trapped). `FilterBar`/`Pill`/`Chip`/`MultiPill`/`FilterRow` — see
  CreditCardsView.jsx for usage. `Skeleton`/`PageSkeleton`.

## Data access

`const { state, dispatch } = useChurn()` from `src/store/ChurnContext.jsx`.
State: `members[] {id,name,role,hex}`, `creditCards[]`, `bankAccounts[]`, `applications[]`,
`settings {taxBracket, pointValueCents, notifyEnabled}`, `notifications {seen,dismissed,snoozed}`,
`taxYear`, `seniorIncome`, `externalPayments`.

Card fields: id, memberId, status ('Applied'|'Active Churn'|'Bonus Met'|'Keep Alive'|
'Downgrade/Close Due'|'Downgraded'|'Closed'), cardName, issuer, last4, openDate,
lastUsedDate, currentBalance, creditLimit, spendRequirement, spendDeadlineDays, currentSpend,
spendLog[] {id,date,amount,note}, bonusValue, bonusType ('points'|'cashback'|'miles'),
bonusCashValue (optional $ value for points bonuses), annualFee, feeWaivedFirstYear,
closedDate, bonusReceived, bonusReceivedDate, isBusiness, isAuthorizedUser, downgradedToCard, notes.

Account fields: id, memberId, status ('Opened'|'DD Linked'|'Bonus Pending'|'Bonus Received'|
'Cooling Period'|'Safe to Close'|'Closed'), bankName, accountType, last4, openedDate,
currentBalance, bonusAmount, bonusReceived, bonusReceivedDate, requiredDD, requiredDDCount,
ddsMade, ddDeadlineDays, ddLinkedDate, ddSourceDescription, minimumBalance, bonusDeadlineDays,
etfDays (optional: days until early-termination fee no longer applies), offerUrl, notes.

Application fields: id, memberId, product, issuer, status ('planned'|'applied'|'pending'|
'approved'|'denied'), appliedDate, decisionDate, deniedReason, notes (recon notes),
bonusValue, bonusType, spendRequirement, spendDeadlineDays, annualFee, isBusiness,
convertedCardId.

Reducer actions available: ADD/UPDATE/DELETE_APPLICATION {payload}/{payload}/{id},
CONVERT_APPLICATION {applicationId, card}, LOG_SPEND {cardId, entry}, SET_SETTING {key,value},
DISMISS_ACTION/RESTORE_ACTION {id}, SNOOZE_ACTION {id, until} — plus the pre-existing card/
account/member ones.

Utils: `fmt$`, `fmtDate`, `fmtDateShort`, `daysUntil`, `daysAgo` (`src/utils/format.js`);
`getIssuerMeta`, `monogram` (`src/utils/issuers.js`); `statusLabel`, `CARD_STATUSES`,
`APPLICATION_STATUSES`, `isRetired` (`src/utils/statusMeta.js`).

Engines (READ them before use): lifecycle.js (getSpendDeadlineInfo, getAnnualFeeInfo,
getReeligibilityInfo, getSmartCardStatus), chase524.js (getChase524Status), amex.js, citi.js,
bofa.js, capitalone.js, cardReeligibility.js (getCardReeligibility, matchCardToRule),
bankEligibility.js (getBankEligibility), clawbackShield.js (getClawbackStatus), creditAge.js,
actionItems.js (generateActionItems).

## UX standards

- Page container: `<div className="p-4 max-w-5xl mx-auto">` (or max-w-4xl for list pages).
- Page title via `PageHeader`. Section headings `h2.text-base.font-semibold.text-ink.mb-3`.
- Every view needs a real empty state (EmptyState atom) and must look right on a 375px phone
  (stack grids to 1 col) AND desktop, in BOTH themes (tokens handle it if you stick to them).
- Keyboard accessible: real `<button>`s, labels on inputs, `aria-label` on icon-only buttons.
- Amounts `tabular-nums`; dates via fmtDate.
