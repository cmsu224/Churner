// Minimal RFC 5545 (iCalendar) writer for Timeline events. All events are
// exported as all-day VEVENTs so a bare YYYYMMDD DTSTART is enough.
import { saveOrShare } from './exportFile'

const CRLF = '\r\n'
const PROD_ID = '-//Churner//EN'

function pad(n) {
  return String(n).padStart(2, '0')
}

// All-day date, from the event's ISO date, in the local calendar day it represents.
function toIcsDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

// UTC timestamp in RFC 5545 basic format: YYYYMMDDTHHMMSSZ
function toIcsDateTimeUtc(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

// Escape backslashes, commas, semicolons and newlines per RFC 5545 §3.3.11.
function escapeText(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

// Fold a content line to 75 octets per physical line, continuation lines
// prefixed with a single space, per RFC 5545 §3.1.
function foldLine(line) {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line

  const chars = Array.from(line)
  const out = []
  let current = ''
  let currentBytes = 0
  let limit = 75 // first physical line gets the full 75 octets

  for (const ch of chars) {
    const chBytes = enc.encode(ch).length
    if (currentBytes + chBytes > limit) {
      out.push(current)
      current = ch
      currentBytes = chBytes
      limit = 74 // continuation lines lose 1 octet to the leading space
    } else {
      current += ch
      currentBytes += chBytes
    }
  }
  out.push(current)
  return out.join(CRLF + ' ')
}

function resolveMemberName(memberNameById, memberId) {
  if (typeof memberNameById === 'function') return memberNameById(memberId) ?? ''
  return memberNameById?.[memberId] ?? ''
}

// Build a full iCalendar (.ics) string from a flat list of Timeline events.
// memberNameById may be a { [memberId]: name } map or a (memberId) => name function.
export function buildIcs(events, memberNameById) {
  const dtstamp = toIcsDateTimeUtc(new Date())

  const lines = [
    'BEGIN:VCALENDAR',
    `PRODID:${PROD_ID}`,
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
  ]

  for (const event of (events ?? [])) {
    const name = resolveMemberName(memberNameById, event.memberId)
    const summary = `[Churner] ${name}: ${event.title}`

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${event.id}@churner`)
    lines.push(`DTSTAMP:${dtstamp}`)
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.date)}`)
    lines.push(`SUMMARY:${escapeText(summary)}`)
    if (event.detail) lines.push(`DESCRIPTION:${escapeText(event.detail)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.map(foldLine).join(CRLF) + CRLF
}

// Save the given text as a .ics file — browser download on web, native share
// sheet on device.
export function downloadIcs(filename, text) {
  return saveOrShare(filename, text, 'text/calendar')
}
