import { useState, useRef } from 'react'
import { useChurn } from '../../store/ChurnContext'
import { getSmartCardStatus } from '../../engines/lifecycle'
import { Download, Upload, Copy, Check, AlertTriangle, ExternalLink } from 'lucide-react'

const AI_PROMPT = `Convert the following into JSON for my Churner tracking app. I'm giving you EITHER a credit report, OR screenshots / a list of my credit cards and bank accounts.

If this is a credit report: extract every open revolving credit card account. Use "Date Opened" for openDate, the account name for cardName, and the last 4 digits of the account number for last4. Leave bonus fields blank — credit reports don't include sign-up bonus details.

Output ONLY valid JSON in this exact structure — no explanation, no markdown fences:
{
  "creditCards": [
    {
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
      "isBusiness": false,
      "isAuthorizedUser": false,
      "status": "Active Churn"
    }
  ],
  "bankAccounts": [
    {
      "bankName": "Chase",
      "accountType": "Checking",
      "last4": "5678",
      "openedDate": "2024-02-01",
      "bonusAmount": 300,
      "requiredDD": 500,
      "isTaxable": true,
      "status": "Opened"
    }
  ]
}

Field reference:
- openDate / openedDate: format YYYY-MM-DD
- bonusType: "points", "miles", or "cashback"
- status (cards): "Applied", "Active Churn", "Bonus Met", "Retention Call Due", "Downgrade/Close Due", "Closed"
- status (accounts): "Opened", "DD Linked", "Bonus Pending", "Bonus Received", "Cooling Period", "Safe to Close"
- accountType: "Checking", "Savings", "Money Market", "CD"
- isBusiness: true only for business cards (e.g. Ink, Amex Business). isAuthorizedUser: true if the account lists you as an authorized user, not the primary holder. Both default false. These are excluded from Chase 5/24.
- Leave any unknown field blank, null, or 0

DO NOT include "id" or "playerId" fields.
Output ONLY the JSON — nothing else.

My cards and accounts:
[PASTE YOUR DATA OR DESCRIBE YOUR ACCOUNTS HERE]`

function parseImport(text) {
  const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/, '')
  const data = JSON.parse(cleaned)
  // Detect format: AI simplified vs full state
  if (data.creditCards !== undefined || data.bankAccounts !== undefined) {
    return { mode: 'ai', data }
  }
  if (data.version !== undefined && data.players !== undefined) {
    return { mode: 'full', data }
  }
  throw new Error('Unrecognized format. Expected { creditCards, bankAccounts } or a full Churner state export.')
}

function mergeAiImport(state, aiData, defaultPlayerId) {
  const newCards = (aiData.creditCards ?? []).map(c => {
    const base = {
      id: crypto.randomUUID(),
      playerId: defaultPlayerId,
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
    // Apply age-based smart status unless explicit bonus data says otherwise.
    // Credit reports don't include bonus info, so the AI's status guess is unreliable.
    const hasExplicitBonus = c.bonusReceived || c.bonusReceivedDate
    if (!hasExplicitBonus) {
      const smart = getSmartCardStatus(base)
      base.status = smart.status
      base.bonusReceived = smart.bonusReceived
    } else {
      base.status = c.status ?? 'Active Churn'
    }
    return base
  })

  const newAccounts = (aiData.bankAccounts ?? []).map(a => {
    const openedDate = a.openedDate ?? null
    const safeToCloseDate = openedDate
      ? (() => { const d = new Date(openedDate); d.setDate(d.getDate() + 181); return d.toISOString() })()
      : null
    return {
      id: crypto.randomUUID(),
      playerId: defaultPlayerId,
      bankName: a.bankName ?? '',
      accountType: a.accountType ?? 'Checking',
      last4: a.last4 ?? '',
      openedDate,
      status: a.status ?? 'Opened',
      requiredDD: a.requiredDD ?? undefined,
      ddLinkedDate: a.ddLinkedDate ?? null,
      bonusAmount: a.bonusAmount ?? undefined,
      bonusReceivedDate: a.bonusReceivedDate ?? null,
      isTaxable: a.isTaxable ?? true,
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

export default function ImportExportView() {
  const { state, dispatch } = useChurn()
  const [importText, setImportText] = useState('')
  const [preview, setPreview] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [importMode, setImportMode] = useState('append') // 'append' | 'replace'
  const [importDone, setImportDone] = useState(false)
  const fileRef = useRef(null)

  const defaultPlayerId = (state.players ?? [])[0]?.id ?? 'p1'

  // ── EXPORT ───────────────────────────────────────────────────────────────
  function handleExport() {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `churner-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── COPY PROMPT ──────────────────────────────────────────────────────────
  function handleCopyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── PARSE PREVIEW ────────────────────────────────────────────────────────
  function handleParsePreview(text) {
    setImportText(text)
    setPreview(null)
    setParseError(null)
    setImportDone(false)
    if (!text.trim()) return
    try {
      const result = parseImport(text)
      setPreview(result)
    } catch (e) {
      setParseError(e.message)
    }
  }

  // ── FILE LOAD ─────────────────────────────────────────────────────────────
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => handleParsePreview(ev.target?.result ?? '')
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── IMPORT ───────────────────────────────────────────────────────────────
  function handleImport() {
    if (!preview) return
    if (preview.mode === 'ai') {
      const nextState = importMode === 'replace'
        ? mergeAiImport({ ...state, creditCards: [], bankAccounts: [] }, preview.data, defaultPlayerId)
        : mergeAiImport(state, preview.data, defaultPlayerId)
      dispatch({ type: 'LOAD_STATE', payload: nextState })
    } else {
      // Full state restore
      dispatch({ type: 'LOAD_STATE', payload: preview.data })
    }
    setImportText('')
    setPreview(null)
    setImportDone(true)
  }

  const previewCards = preview?.data?.creditCards ?? []
  const previewAccounts = preview?.data?.bankAccounts ?? []

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Import / Export</h1>
        <p className="text-sm text-zinc-400">Back up your data, restore it, or import a list of cards from Claude AI.</p>
      </div>

      {/* ── EXPORT ─────────────────────────────────────────────────────── */}
      <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-1">Export Your Data</h2>
        <p className="text-xs text-zinc-400 mb-4">
          Downloads your current Churner data as a JSON file — {(state.creditCards ?? []).length} cards and {(state.bankAccounts ?? []).length} accounts.
          Keep this as a backup or use it to move to a new Gist.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Download size={15} />
          Download churner-backup.json
        </button>
      </section>

      {/* ── AI IMPORT HELPER ────────────────────────────────────────────── */}
      <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">AI Import Helper</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The fastest way to get all your cards in. Take a screenshot of your cards/accounts <strong className="text-zinc-300">or download your credit report (PDF)</strong>, open{' '}
            <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
              claude.ai <ExternalLink size={10} />
            </a>
            {' '}or any AI chat, paste the prompt below + your file, then paste the JSON output back here. A credit report is ideal — it has every card's open date, which powers the age tracker.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-300">Step 1 — Copy this prompt, then paste it into Claude with your screenshot:</span>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy prompt'}
            </button>
          </div>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-400 leading-relaxed overflow-auto max-h-48 whitespace-pre-wrap font-mono">
            {AI_PROMPT}
          </pre>
        </div>

        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-3 text-xs text-zinc-400 space-y-1">
          <div className="font-medium text-zinc-300">How it works:</div>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>Copy the prompt above</li>
            <li>Open Claude.ai (or any AI), paste the prompt</li>
            <li>Attach your screenshot or type out your card names/details</li>
            <li>Claude outputs JSON — copy it</li>
            <li>Paste the JSON in the Import box below and click Import</li>
            <li>Assign players to each card — they default to your first player</li>
          </ol>
        </div>
      </section>

      {/* ── IMPORT ──────────────────────────────────────────────────────── */}
      <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white mb-1">Import JSON</h2>

        {importDone && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3">
            Import successful! Your data has been loaded and saved to Gist.
          </div>
        )}

        <div>
          <label className="text-xs text-zinc-400 block mb-2">Paste JSON here, or load a file:</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Upload size={12} />
              Load file
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
          </div>
          <textarea
            rows={8}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 font-mono focus:outline-none focus:border-blue-500 transition-colors"
            placeholder={'Paste JSON here...\n\nAccepts:\n• AI import output: { "creditCards": [...], "bankAccounts": [...] }\n• Full backup: the entire Churner state JSON'}
            value={importText}
            onChange={e => handleParsePreview(e.target.value)}
          />
        </div>

        {parseError && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm">
              <div className="font-medium text-white mb-2">
                {preview.mode === 'full' ? 'Full backup detected' : 'AI import format detected'}
              </div>
              {preview.mode === 'ai' ? (
                <div className="space-y-1 text-zinc-400 text-xs">
                  <div>• {previewCards.length} credit card{previewCards.length !== 1 ? 's' : ''}: {previewCards.map(c => c.cardName).filter(Boolean).join(', ') || '—'}</div>
                  <div>• {previewAccounts.length} bank account{previewAccounts.length !== 1 ? 's' : ''}: {previewAccounts.map(a => a.bankName).filter(Boolean).join(', ') || '—'}</div>
                  <div className="text-zinc-500 mt-1">All cards will default to player: <span className="text-zinc-300">{(state.players ?? [])[0]?.name ?? 'first player'}</span>. Change them after import by tapping each card.</div>
                </div>
              ) : (
                <div className="text-xs text-zinc-400">
                  Full state with {preview.data.creditCards?.length ?? 0} cards and {preview.data.bankAccounts?.length ?? 0} accounts. This will REPLACE all existing data.
                </div>
              )}
            </div>

            {preview.mode === 'ai' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setImportMode('append')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${importMode === 'append' ? 'border-blue-500 bg-blue-600/20 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                >
                  Append to existing
                </button>
                <button
                  onClick={() => setImportMode('replace')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${importMode === 'replace' ? 'border-red-500 bg-red-600/20 text-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                >
                  Replace cards/accounts
                </button>
              </div>
            )}

            <button
              onClick={handleImport}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {preview.mode === 'full' ? 'Restore Full Backup' : `Import ${previewCards.length + previewAccounts.length} Records`}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
