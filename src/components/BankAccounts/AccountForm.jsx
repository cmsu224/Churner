import { useState } from 'react'

const STATUSES = ['Opened', 'DD Linked', 'Bonus Pending', 'Bonus Received', 'Cooling Period', 'Safe to Close']
const TYPES = ['Checking', 'Savings', 'Money Market', 'CD']

const EMPTY = {
  playerId: 'p1', bankName: '', accountType: 'Checking', last4: '',
  openedDate: '', status: 'Opened',
  requiredDD: '', ddSourceDescription: '', ddLinkedDate: '',
  bonusAmount: '', bonusReceivedDate: '', isTaxable: true, notes: '',
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

export default function AccountForm({ initial, onSubmit, onCancel, players }) {
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial } : { ...EMPTY })
  const [errors, setErrors] = useState({})

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function validate() {
    const e = {}
    if (!form.bankName.trim()) e.bankName = 'Required'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    const opened = form.openedDate
    const safeDate = opened
      ? (() => { const d = new Date(opened); d.setDate(d.getDate() + 181); return d.toISOString() })()
      : null
    onSubmit({
      ...form,
      requiredDD: form.requiredDD !== '' ? parseFloat(form.requiredDD) : undefined,
      bonusAmount: form.bonusAmount !== '' ? parseFloat(form.bonusAmount) : undefined,
      last4: form.last4 ? String(form.last4).slice(-4) : undefined,
      openedDate: form.openedDate || null,
      ddLinkedDate: form.ddLinkedDate || null,
      bonusReceivedDate: form.bonusReceivedDate || null,
      safeToCloseDate: safeDate,
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

      <Field label="Bank Name *" err={errors.bankName}>
        <input className={inp} value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. Chase, Wells Fargo" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Account Type">
          <select className={inp} value={form.accountType} onChange={e => set('accountType', e.target.value)}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Last 4 Digits">
          <input className={inp} value={form.last4} onChange={e => set('last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="optional" maxLength={4} />
        </Field>
      </div>

      <Field label="Opened Date">
        <input type="date" className={inp} value={form.openedDate} onChange={e => set('openedDate', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Bonus Amount ($)">
          <input type="number" min="0" className={inp} value={form.bonusAmount} onChange={e => set('bonusAmount', e.target.value)} placeholder="300" />
        </Field>
        <Field label="Bonus Received Date">
          <input type="date" className={inp} value={form.bonusReceivedDate ?? ''} onChange={e => set('bonusReceivedDate', e.target.value)} />
        </Field>
      </div>

      <Field label="Required DD Amount ($/month)">
        <input type="number" min="0" className={inp} value={form.requiredDD} onChange={e => set('requiredDD', e.target.value)} placeholder="500 (optional)" />
      </Field>

      <Field label="DD Source">
        <input className={inp} value={form.ddSourceDescription} onChange={e => set('ddSourceDescription', e.target.value)} placeholder="e.g. Payroll, Social Security, ACH transfer" />
      </Field>

      <Field label="DD Linked Date">
        <input type="date" className={inp} value={form.ddLinkedDate ?? ''} onChange={e => set('ddLinkedDate', e.target.value)} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
        <input type="checkbox" checked={form.isTaxable} onChange={e => set('isTaxable', e.target.checked)} className="rounded" />
        Bank bonus is taxable (1099-INT)
      </label>

      <Field label="Notes">
        <textarea rows={2} className={inp} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
      </Field>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg text-sm transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
          {initial ? 'Update Account' : 'Add Account'}
        </button>
      </div>
    </form>
  )
}
