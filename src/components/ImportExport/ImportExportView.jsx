import { useState, useRef } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { getSmartCardStatus } from '../../engines/lifecycle'
import { saveOrShare, copyText } from '../../utils/exportFile'
import { Download, Upload, Copy, Check, AlertTriangle, ExternalLink } from 'lucide-react'

function buildPrompt(players) {
  const names = (players ?? []).map(p => p.name).join(' | ')
  const first = players?.[0]?.name ?? 'Me'

  return `You are helping import credit cards and bank accounts into Churner, a household churning-tracker app.

This household has ${(players ?? []).length} member${(players ?? []).length !== 1 ? 's' : ''}: ${names}

I will give you one of the following:
• A credit report (PDF or screenshot)
• A screenshot or typed list of cards / accounts
• Data for one person OR multiple people mixed together

For every item, set "member" to the exact name of the owner (must be one of: ${names}).
If all the data clearly belongs to one person, set every item's "member" to that person's name.
If the data covers multiple people, assign each item individually.
If you genuinely cannot tell who owns an item, omit "member" and it will be handled during import.

━━━ CREDIT REPORT RULES ━━━
• Include ONLY open revolving credit cards — skip closed accounts, loans, mortgages, auto loans, student loans
• openDate = "Date Opened" from the report (YYYY-MM-DD)
• isAuthorizedUser: true if the person is listed as authorized user, not primary account holder
• isBusiness: true for business cards (names containing "Business", "Ink", "Plum", "Gold Business", "Blue Business", "Spark", etc.)
• Leave ALL bonus/spend fields blank — credit reports don't have sign-up bonus data

━━━ OUTPUT (only valid JSON, no explanation, no markdown fences) ━━━
{
  "creditCards": [
    {
      "member": "${first}",
      "cardName": "Sapphire Preferred",
      "issuer": "Chase",
      "last4": "1234",
      "openDate": "2024-01-15",
      "annualFee": 95,
      "spendRequirement": 4000,
      "spendDeadlineDays": 90,
      "currentSpend": 0,
      "bonusValue": 60000,
      "bonusType": "points",
      "bonusReceived": false,
      "bonusReceivedDate": null,
      "isBusiness": false,
      "isAuthorizedUser": false,
      "status": "Active Churn",
      "notes": ""
    }
  ],
  "bankAccounts": [
    {
      "member": "${first}",
      "bankName": "Chase",
      "accountType": "Checking",
      "last4": "5678",
      "openedDate": "2024-02-01",
      "bonusAmount": 300,
      "requiredDD": 500,
      "requiredDDCount": 1,
      "ddDeadlineDays": 90,
      "minimumBalance": 0,
      "isTaxable": true,
      "status": "Opened",
      "notes": ""
    }
  ]
}

━━━ FIELD RULES ━━━
member            — one of: ${names}. Omit if unknown.
openDate / openedDate — YYYY-MM-DD. Omit entirely if unknown (never guess a date).
bonusType         — "points" | "miles" | "cashback"
annualFee         — infer from well-known cards (Sapphire Preferred=95, Reserve=550, Platinum=695, Gold=250, Freedom=0, etc.). 0 if truly unknown.
bonusValue / spendRequirement / spendDeadlineDays — fill in from well-known current offers only if the user provides card details; omit if importing from a credit report.
status (cards) — use the most accurate:
  "Applied"             — approved, card not yet arrived
  "Active Churn"        — actively working toward sign-up bonus spend requirement
  "Bonus Met"           — spend met, bonus not yet posted
  "Retention Call Due"  — annual fee coming up, retention call needed
  "Keep Alive"          — keeping for credit history / ongoing rewards, no active bonus
  "Downgrade/Close Due" — decided to close or downgrade
  "Closed"              — closed (omit unless user specifically asks for closed cards)
status (accounts) — use the most accurate:
  "Opened"          — account open, direct deposit not yet made
  "DD Linked"       — first qualifying direct deposit made
  "Bonus Pending"   — DD requirement complete, waiting for bonus to post
  "Bonus Received"  — bonus posted
  "Cooling Period"  — within 181-day clawback window
  "Safe to Close"   — past 181 days, safe to close
accountType       — "Checking" | "Savings" | "Money Market" | "CD"
isBusiness        — true for any business card (Ink, Plum, Blue Business, Spark, etc.)
isAuthorizedUser  — true only if this person is an authorized user, not the primary cardholder
isTaxable         — ALWAYS true for bank account bonuses (taxable as 1099-INT). Omit or false for credit card bonuses.
requiredDD        — minimum single direct deposit amount required (e.g. 500)
requiredDDCount   — number of qualifying DDs required (default 1)
ddDeadlineDays    — days from account opening to meet the DD requirement (e.g. 60, 90, 120)
minimumBalance    — required minimum balance to qualify for bonus (0 if none)

DO NOT include "id" or "memberId" fields.
Omit or null any field you don't know. Do NOT guess dates.
Output ONLY the JSON — nothing else.

━━━ DATA TO IMPORT ━━━
[Whose data is this? e.g.: "These are Wife's cards" or "Me and Wife mixed — assign each item to the right person"]
[Paste your credit report, screenshot description, or card list here]`
}

function resolveMemberId(memberName, members, fallbackId) {
  if (!memberName) return fallbackId
  const lower = memberName.toLowerCase().trim()
  const match = (members ?? []).find(p => {
    const n = p.name.toLowerCase()
    return n === lower || n.startsWith(lower) || lower.startsWith(n)
  })
  return match?.id ?? fallbackId
}

function parseImport(text) {
  const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
  const data = JSON.parse(cleaned)
  if (data.creditCards !== undefined || data.bankAccounts !== undefined) {
    return { mode: 'ai', data }
  }
  if (data.version !== undefined && (data.players !== undefined || data.members !== undefined)) {
    return { mode: 'full', data }
  }
  throw new Error('Unrecognized format. Expected { creditCards, bankAccounts } or a full Churner state export.')
}

function mergeAiImport(state, aiData, members, fallbackMemberId) {
  const newCards = (aiData.creditCards ?? []).map(c => {
    const memberId = resolveMemberId(c.member, members, fallbackMemberId)
    const base = {
      id: crypto.randomUUID(),
      memberId,
      cardName: c.cardName ?? '',
      issuer: c.issuer ?? '',
      last4: c.last4 ?? '',
      openDate: c.openDate ?? null,
      lastUsedDate: c.lastUsedDate ?? null,
      spendRequirement: c.spendRequirement ?? undefined,
      spendDeadlineDays: c.spendDeadlineDays ?? undefined,
      currentSpend: c.currentSpend ?? 0,
      bonusValue: c.bonusValue ?? undefined,
      bonusType: c.bonusType ?? 'cashback',
      bonusReceived: c.bonusReceived ?? false,
      bonusReceivedDate: c.bonusReceivedDate ?? null,
      annualFee: c.annualFee ?? 0,
      isBusiness: c.isBusiness ?? false,
      isAuthorizedUser: c.isAuthorizedUser ?? false,
      notes: c.notes ?? '',
    }
    const hasExplicitBonus = c.bonusReceived || c.bonusReceivedDate
    if (!hasExplicitBonus) {
      const smart = getSmartCardStatus(base)
      base.status = smart.status
      base.bonusReceived = smart.bonusReceived
    } else {
      const VALID_STATUSES = ['Applied', 'Active Churn', 'Bonus Met', 'Keep Alive', 'Downgrade/Close Due', 'Closed']
      base.status = VALID_STATUSES.includes(c.status) ? c.status : 'Active Churn'
    }
    return base
  })

  const newAccounts = (aiData.bankAccounts ?? []).map(a => {
    const memberId = resolveMemberId(a.member, members, fallbackMemberId)
    const openedDate = a.openedDate ?? null
    const safeToCloseDate = openedDate
      ? (() => { const d = new Date(openedDate); d.setDate(d.getDate() + 181); return d.toISOString() })()
      : null
    return {
      id: crypto.randomUUID(),
      memberId,
      bankName: a.bankName ?? '',
      accountType: a.accountType ?? 'Checking',
      last4: a.last4 ?? '',
      openedDate,
      status: a.status ?? 'Opened',
      requiredDD: a.requiredDD ?? undefined,
      requiredDDCount: a.requiredDDCount ?? undefined,
      ddDeadlineDays: a.ddDeadlineDays ?? undefined,
      ddLinkedDate: a.ddLinkedDate ?? null,
      ddSourceDescription: a.ddSourceDescription ?? '',
      bonusAmount: a.bonusAmount ?? undefined,
      bonusDeadlineDays: a.bonusDeadlineDays ?? undefined,
      bonusReceivedDate: a.bonusReceivedDate ?? null,
      minimumBalance: a.minimumBalance ?? undefined,
      isTaxable: a.isTaxable ?? true,
      offerUrl: a.offerUrl ?? null,
      safeToCloseDate,
      notes: a.notes ?? '',
    }
  })

  return {
    ...state,
    creditCards: [...(state.creditCards ?? []), ...newCards],
    bankAccounts: [...(state.bankAccounts ?? []), ...newAccounts],
  }
}

function memberDistribution(items, members, fallbackId) {
  const counts = {}
  let unresolved = 0
  ;(items ?? []).forEach(item => {
    const id = resolveMemberId(item.member, members, null)
    if (id) {
      counts[id] = (counts[id] ?? 0) + 1
    } else {
      counts[fallbackId] = (counts[fallbackId] ?? 0) + 1
      unresolved++
    }
  })
  return { counts, unresolved }
}

export default function ImportExportView() {
  const { state, dispatch } = useChurn()
  const [importText, setImportText] = useState('')
  const [preview, setPreview] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [importMode, setImportMode] = useState('append')
  const [importDone, setImportDone] = useState(false)
  const [fallbackMemberId, setFallbackMemberId] = useState(() => (state.members ?? [])[0]?.id ?? 'p1')
  const [includeAU, setIncludeAU] = useState(false)
  const fileRef = useRef(null)

  const members = state.members ?? []

  function handleExport() {
    const json = JSON.stringify(state, null, 2)
    saveOrShare(`churner-backup-${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json')
  }

  function handleCopyPrompt() {
    copyText(buildPrompt(members)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleParsePreview(text) {
    setImportText(text)
    setPreview(null)
    setParseError(null)
    setImportDone(false)
    if (!text.trim()) return
    try {
      setPreview(parseImport(text))
    } catch (e) {
      setParseError(e.message)
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => handleParsePreview(ev.target?.result ?? '')
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleImport() {
    if (!preview) return
    if (preview.mode === 'ai') {
      const base = importMode === 'replace'
        ? { ...state, creditCards: [], bankAccounts: [] }
        : state
      const filteredData = {
        ...preview.data,
        creditCards: includeAU
          ? (preview.data.creditCards ?? [])
          : (preview.data.creditCards ?? []).filter(c => !c.isAuthorizedUser),
      }
      dispatch({ type: 'LOAD_STATE', payload: mergeAiImport(base, filteredData, members, fallbackMemberId) })
    } else {
      dispatch({ type: 'LOAD_STATE', payload: preview.data })
    }
    setImportText('')
    setPreview(null)
    setImportDone(true)
  }

  const previewCards = preview?.data?.creditCards ?? []
  const previewAccounts = preview?.data?.bankAccounts ?? []
  const auCardCount = previewCards.filter(c => c.isAuthorizedUser).length
  const visibleCards = includeAU ? previewCards : previewCards.filter(c => !c.isAuthorizedUser)

  const cardDist = memberDistribution(visibleCards, members, fallbackMemberId)
  const acctDist = memberDistribution(previewAccounts, members, fallbackMemberId)
  const hasUnresolved = cardDist.unresolved > 0 || acctDist.unresolved > 0

  const inp = 'bg-raised border border-edge-strong text-sm text-ink rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent transition-colors'

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink mb-1">Import / Export</h1>
        <p className="text-sm text-ink-muted">Back up your data, restore it, or import a list of cards from Claude AI.</p>
      </div>

      {/* EXPORT */}
      <section className="bg-surface border border-edge-strong rounded-xl p-5">
        <h2 className="text-base font-semibold text-ink mb-1">Export Your Data</h2>
        <p className="text-xs text-ink-muted mb-4">
          Downloads your current Churner data as a JSON file — {(state.creditCards ?? []).length} cards and {(state.bankAccounts ?? []).length} accounts.
          Keep this as a backup or use it to move to a new Gist.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-overlay hover:bg-overlay text-ink text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Download size={15} />
          Download churner-backup.json
        </button>
      </section>

      {/* AI IMPORT HELPER */}
      <section className="bg-surface border border-edge-strong rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink mb-1">AI Import Helper</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            The fastest way to get all your cards in. Take a screenshot or{' '}
            <strong className="text-ink-secondary">download your credit report (PDF)</strong>, open{' '}
            <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline inline-flex items-center gap-0.5">
              claude.ai <ExternalLink size={10} />
            </a>
            {' '}or any AI chat, paste the prompt below + your file, then paste the JSON back here.
            The prompt includes your household members' names so the AI can assign each card to the right member.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-secondary">Step 1 — Copy this prompt into Claude with your data:</span>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 text-xs bg-raised hover:bg-overlay text-ink-secondary px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? <Check size={12} className="text-success-ink" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
          <pre className="bg-base border border-edge rounded-lg p-4 text-xs text-ink-muted leading-relaxed overflow-auto max-h-56 whitespace-pre-wrap font-mono">
            {buildPrompt(members)}
          </pre>
        </div>

        <div className="bg-raised/60 border border-edge-strong rounded-lg px-4 py-3 text-xs text-ink-muted space-y-1">
          <div className="font-medium text-ink-secondary">How it works:</div>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Copy the prompt above (it already has your household members: <span className="text-ink-secondary">{members.map(p => p.name).join(', ')}</span>)</li>
            <li>Open Claude.ai, paste the prompt + attach your credit report PDF or screenshot</li>
            <li>Tell Claude whose cards you're importing — e.g. <em>"These are Wife's cards"</em> or <em>"Mixed — assign each to the right person"</em></li>
            <li>Claude outputs JSON with a <code className="text-ink-secondary">member</code> field on each item</li>
            <li>Paste the JSON in the Import box below — member assignment is automatic</li>
            <li>Review the preview, set a fallback member for any unassigned items, then click Import</li>
          </ol>
        </div>
      </section>

      {/* IMPORT */}
      <section className="bg-surface border border-edge-strong rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-ink">Import JSON</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Fallback member for unassigned items:</span>
            <select
              className={inp}
              value={fallbackMemberId}
              onChange={e => setFallbackMemberId(e.target.value)}
            >
              {members.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {importDone && (
          <div className="bg-success/10 border border-success/30 text-success-ink text-sm rounded-lg px-4 py-3">
            Import successful! Your data has been loaded and saved to Gist.
          </div>
        )}

        <div>
          <label className="text-xs text-ink-muted block mb-2">Paste JSON here, or load a file:</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-raised hover:bg-overlay text-ink-secondary px-3 py-1.5 rounded-lg transition-colors"
            >
              <Upload size={12} />
              Load file
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
          </div>
          <textarea
            rows={8}
            className="w-full bg-base border border-edge-strong rounded-lg px-3 py-2 text-xs text-ink-secondary placeholder-ink-faint font-mono focus:outline-none focus:border-accent transition-colors"
            placeholder={'Paste JSON here...\n\nAccepts:\n• AI import output: { "creditCards": [...], "bankAccounts": [...] }\n• Full backup: the entire Churner state JSON'}
            value={importText}
            onChange={e => handleParsePreview(e.target.value)}
          />
        </div>

        {parseError && (
          <div className="flex items-start gap-2 bg-danger/10 border border-danger/30 text-danger-ink text-xs rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="bg-raised border border-edge-strong rounded-lg px-4 py-3 text-sm space-y-2">
              <div className="font-medium text-ink">
                {preview.mode === 'full' ? 'Full backup detected' : 'AI import format detected'}
              </div>

              {preview.mode === 'ai' ? (
                <div className="space-y-2 text-xs">
                  {/* Cards */}
                  {previewCards.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-ink-muted">
                        <span className="text-ink-secondary font-medium">{visibleCards.length} credit card{visibleCards.length !== 1 ? 's' : ''}</span>
                        {' — '}{visibleCards.map(c => c.cardName).filter(Boolean).join(', ')}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-2">
                        {members.map(p => {
                          const count = visibleCards.filter(c => resolveMemberId(c.member, members, null) === p.id).length
                          if (!count) return null
                          return <span key={p.id} className="text-success-ink">{p.name}: {count}</span>
                        })}
                        {cardDist.unresolved > 0 && (
                          <span className="text-warning-ink">{cardDist.unresolved} unassigned → {members.find(p => p.id === fallbackMemberId)?.name ?? 'fallback'}</span>
                        )}
                      </div>
                      {auCardCount > 0 && (
                        <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer mt-1 pl-2">
                          <input
                            type="checkbox"
                            checked={includeAU}
                            onChange={e => setIncludeAU(e.target.checked)}
                          />
                          Include {auCardCount} authorized user {auCardCount === 1 ? 'card' : 'cards'}
                          <span className="text-ink-faint">(excluded by default)</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Accounts */}
                  {previewAccounts.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-ink-muted">
                        <span className="text-ink-secondary font-medium">{previewAccounts.length} bank account{previewAccounts.length !== 1 ? 's' : ''}</span>
                        {' — '}{previewAccounts.map(a => a.bankName).filter(Boolean).join(', ')}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-2">
                        {members.map(p => {
                          const count = previewAccounts.filter(a => resolveMemberId(a.member, members, null) === p.id).length
                          if (!count) return null
                          return <span key={p.id} className="text-success-ink">{p.name}: {count}</span>
                        })}
                        {acctDist.unresolved > 0 && (
                          <span className="text-warning-ink">{acctDist.unresolved} unassigned → {members.find(p => p.id === fallbackMemberId)?.name ?? 'fallback'}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {hasUnresolved && (
                    <div className="flex items-start gap-1.5 bg-warning/10 border border-warning/20 text-warning-ink rounded-md px-2.5 py-1.5 mt-1">
                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                      <span>Some items have no member name — they'll be assigned to the fallback member above. You can change it before importing.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-ink-muted">
                  Full state with {preview.data.creditCards?.length ?? 0} cards and {preview.data.bankAccounts?.length ?? 0} accounts. This will REPLACE all existing data.
                </div>
              )}
            </div>

            {preview.mode === 'ai' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setImportMode('append')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${importMode === 'append' ? 'border-accent bg-accent/20 text-ink' : 'border-edge-strong text-ink-muted hover:border-edge-strong'}`}
                >
                  Append to existing
                </button>
                <button
                  onClick={() => setImportMode('replace')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${importMode === 'replace' ? 'border-danger bg-danger/20 text-ink' : 'border-edge-strong text-ink-muted hover:border-edge-strong'}`}
                >
                  Replace cards/accounts
                </button>
              </div>
            )}

            <button
              onClick={handleImport}
              className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {preview.mode === 'full' ? 'Restore Full Backup' : `Import ${visibleCards.length + previewAccounts.length} Records`}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
