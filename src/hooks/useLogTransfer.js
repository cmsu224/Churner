import { useCallback } from 'react'
import { useChurn } from '../store/ChurnContext'
import { nodeLabel } from '../engines/moneyFlow'
import { fmt$, todayISODate, addDaysISO } from '../utils/format'

// One place that turns "I moved this money" into the two dispatches it takes:
// the transfer itself, and the check-back reminder if one was asked for. Both
// the typed quick bar and the tap-driven sheet go through here, so the two
// entry points can't drift on what a logged push actually records.
export function useLogTransfer() {
  const { dispatch } = useChurn()

  return useCallback(({ amount, from, to, purpose, sentDate, landed = false, checkDays = null }) => {
    if (!(amount > 0) || !from || !to || from.key === to.key) return null
    // The reminder needs to name the transfer, so the id is minted here rather
    // than in the reducer (ADD_TRANSFER honors a supplied id for exactly this).
    const id = crypto.randomUUID()
    const date = sentDate || todayISODate()

    dispatch({
      type: 'ADD_TRANSFER',
      payload: {
        id,
        amount,
        fromKey: from.key,
        toKey: to.key,
        purpose,
        sentDate: date,
        landedDate: landed ? date : null,
        note: '',
      },
    })

    if (checkDays) {
      const acct = to.kind === 'account' ? to : from.kind === 'account' ? from : null
      dispatch({
        type: 'ADD_REMINDER',
        payload: {
          kind: purpose === 'dd' ? 'check_dd' : 'check_bonus',
          title: purpose === 'dd'
            ? `Check the ${fmt$(amount)} deposit coded as a direct deposit at ${to.name}`
            : `Check on ${fmt$(amount)} at ${to.name}`,
          notes: `Pushed ${fmt$(amount)} from ${nodeLabel(from)} on ${date}.`,
          dueDate: addDaysISO(date, checkDays),
          accountId: acct?.id ?? null,
          transferId: id,
          amount,
          // What the check-back is actually waiting on. A push logged as
          // already landed is asking about something the arrival doesn't
          // answer — did the bonus post, did it code right — so it survives the
          // landing that closes an in-flight push's "did it get there?".
          awaitLanding: !landed,
          doneDate: null,
        },
      })
    }

    return { id, date }
  }, [dispatch])
}
