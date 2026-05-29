import { useState } from 'react'

const ISSUERS = ['Chase', 'Amex', 'Capital One', 'Citi', 'Bank of America', 'Barclays', 'Wells Fargo', 'US Bank', 'Discover']
const STATUSES = ['Applied', 'Active Churn', 'Bonus Met', 'Retention Call Due', 'Downgrade/Close Due', 'Closed']

const EMPTY = {
  playerId: 'p1', issuer: '', cardName: '', last4: '',
  openDate: '', status: 'Active Churn',
  spendRequirement: '', spendDeadlineDays: '90', currentSpend: '0',
  bonusValue: '', bonusType: 'cashback', bonusReceived: false, bonusReceivedDate: '',
  annualFee: '0', autoPayEnabled: false, isPrimary: true, notes: '',
}

const inp = 'w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors'

function Field({ label, err, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-300 mb-1">{label}</label>
      {children}
      {err && <p className="text-red-400 text-xs mt-0.5">{err}</p>}
    </div>
  )
}

export default function CardForm({ initial, onSubmit, onCancel, players }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : { ...EMPTY })
  const [errors, setErrors] = useState({})

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function validate() {
    const e = {}
    if (!form.cardName.trim()) e.cardName = 'Required'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit({
      ...form,
      spendRequirement: form.spendRequirement !== '' ? parseFloat(form.spendRequirement) : undefined,
      spendDeadlineDays: form.spendDeadlineDays !== '' ? parseInt(form.spendDeadlineDays) : undefined,
      currentSpend: parseFloat(form.currentSpend) || 0,
      bonusValue: form.bonusValue !== '' ? parseFloat(form.bonusValue) : undefined,
      annualFee: parseFloat(form.annualFee) || 0,
      last4: form.last4 ? String(form.last4).slice(-4) : undefined,
      openDate: form.openDate || null,
      bonusReceivedDate: form.bonusReceivedDate || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Player">
          <select className={inp} value={form.playerId} onChange={e => set('playerId', e.target.value)}>
            {(players ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inp} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Issuer">
        <input list="issuer-list" className={inp} value={form.issuer} onChange={e => set('issuer', e.target.value)} placeholder="e.g. Chase" />
        <datalist id="issuer-list">{ISSUERS.map(i => <option key={i} value={i} />)}</datalist>
      </Field>

      <Field label="Card Name *" err={errors.cardName}>
        <input className={inp} value={form.cardName} onChange={e => set('cardName', e.target.value)} placeholder="e.g. Sapphire Preferred" />
      </Field>

      <Field label="Last 4 Digits">
        <input className={inp} value={form.last4} onChange={e => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234 (optional)" maxLength={4} />
      </Field>

      <Field label="Open Date">
        <input type="date" className={inp} value={form.openDate} onChange={e => set('openDate', e.target.value)} />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Spend Req ($)">
          <input type="number" min="0" className={inp} value={form.spendRequirement} onChange={e => set('spendRequirement', e.target.value)} placeholder="4000" />
        </Field>
        <Field label="Deadline (days)">
          <input type="number" min="1" className={inp} value={form.spendDeadlineDays} onChange={e => set('spendDeadlineDays', e.target.value)} />
        </Field>
        <Field label="Current Spend ($)">
          <input type="number" min="0" className={inp} value={form.currentSpend} onChange={e => set('currentSpend', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Bonus Value">
          <input type="number" min="0" className={inp} value={form.bonusValue} onChange={e => set('bonusValue', e.target.value)} placeholder="60000" />
        </Field>
        <Field label="Bonus Type">
          <select className={inp} value={form.bonusType} onChange={e => set('bonusType', e.target.value)}>
            <option value="points">Points</option>
            <option value="cashback">Cash Back</option>
            <option value="miles">Miles</option>
          </select>
        </Field>
        <Field label="Annual Fee ($)">
          <input type="number" min="0" className={inp} value={form.annualFee} onChange={e => set('annualFee', e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={form.bonusReceived} onChange={e => set('bonusReceived', e.target.checked)} className="rounded" />
          Bonus Received
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={form.autoPayEnabled} onChange={e => set('autoPayEnabled', e.target.checked)} className="rounded" />
          AutoPay Enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={form.isPrimary} onChange={e => set('isPrimary', e.target.checked)} className="rounded" />
          Personal card (counts toward 5/24)
        </label>
      </div>

      {form.bonusReceived && (
        <Field label="Bonus Received Date">
          <input type="date" className={inp} value={form.bonusReceivedDate ?? ''} onChange={e => set('bonusReceivedDate', e.target.value)} />
        </Field>
      )}

      <Field label="Notes">
        <textarea rows={2} className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
      </Field>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg text-sm transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
          {initial ? 'Update Card' : 'Add Card'}
        </button>
      </div>
    </form>
  )
}
