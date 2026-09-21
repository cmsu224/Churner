import { getSmartCardStatus } from '../engines/lifecycle'
import { addDays, parseDay } from './format'

// Existing add-form semantics, shared by guided and classic creation.
export function createRecordDraft(kind, memberId) {
  const common = { memberId, last4: '', currentBalance: '', notes: '' }
  return kind === 'card' ? { ...common, cardName: '', issuer: '', openDate: '', lastUsedDate: '', status: 'Active Churn', _statusSet: false,
    spendRequirement: '', spendDeadlineDays: '', currentSpend: '', creditLimit: '', bonusValue: '', bonusType: 'cashback', bonusReceived: false,
    bonusReceivedDate: '', annualFee: '', feeWaivedFirstYear: false, feePostDate: '', isBusiness: false, isAuthorizedUser: false,
  } : { ...common, bankName: '', accountType: 'Checking', openedDate: '', status: 'Opened', requiredDD: '', requiredDDCount: '', ddsMade: '',
    ddDeadlineDays: '', ddSourceDescription: '', ddLinkedDate: '', requiredDebitCount: '', debitsMade: '', requiredDebitAmount: '', requiredDebitSpend: '',
    debitSpend: '', debitDeadlineDays: '', minimumBalance: '', bonusDeadlineDays: '', etfDays: '', bonusAmount: '', bonusReceivedDate: '', isTaxable: true,
    monthlyFee: '', feeCycleDay: '', feeWaiverBalance: '', feeWaiverDD: '', feeWaiverDebitCount: '', feeWaiverDebitAmount: '', feeWaiverMode: 'any', closedDate: '', offerUrl: '',
  }
}
const num = v => v === '' || v == null || !Number.isFinite(parseFloat(v)) ? undefined : parseFloat(v)
const integer = v => v === '' || v == null || !Number.isFinite(parseInt(v)) ? undefined : parseInt(v)
export function serializeNewRecord(kind, draft) {
  const payload = { ...draft, currentBalance: parseFloat(draft.currentBalance) || 0 }
  if (kind === 'card') {
    for (const key of ['spendRequirement','bonusValue']) payload[key] = num(draft[key])
    payload.spendDeadlineDays = integer(draft.spendDeadlineDays)
    for (const key of ['currentSpend','creditLimit','annualFee']) payload[key] = parseFloat(draft[key]) || 0
    for (const key of ['openDate','lastUsedDate','bonusReceivedDate','feePostDate']) payload[key] = draft[key] || null
    delete payload._statusSet
    if (!draft._statusSet) {
      const smart = getSmartCardStatus(payload)
      payload.status = smart.status
      if (smart.bonusReceived) payload.bonusReceived = true
    }
  } else {
    for (const key of ['requiredDD','bonusAmount','minimumBalance','monthlyFee','feeWaiverBalance','feeWaiverDD','feeWaiverDebitAmount','requiredDebitAmount','requiredDebitSpend','debitSpend']) payload[key] = num(draft[key])
    for (const key of ['feeWaiverDebitCount','feeCycleDay','ddDeadlineDays','requiredDDCount','ddsMade','requiredDebitCount','debitsMade','debitDeadlineDays','bonusDeadlineDays','etfDays']) payload[key] = integer(draft[key])
    payload.openingBalance = payload.currentBalance
    payload.feeWaiverMode = draft.feeWaiverMode === 'all' ? 'all' : 'any'
    payload.last4 = draft.last4 ? String(draft.last4).slice(-4) : undefined
    for (const key of ['openedDate','ddLinkedDate','bonusReceivedDate','offerUrl']) payload[key] = draft[key] || null
    payload.closedDate = draft.status === 'Closed' ? draft.closedDate || null : null
    const opened = parseDay(payload.openedDate)
    payload.safeToCloseDate = opened ? addDays(opened, 181).toISOString() : null
  }
  return payload
}
