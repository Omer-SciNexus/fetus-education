import { describe, expect, it } from 'vitest'
import { inviteLink, parseInviteToken, safeRedirect } from '../../src/lib/navigation'
import { buildReminderIcs, escapeIcsText } from '../../src/lib/calendar'
import { baseMime, isAllowedRecordingMime, pickMimeType, classifyMicError } from '../../src/lib/audio'
import { errorCode, errorMessage } from '../../src/lib/errors'
import { formatBytes, safeFilename } from '../../src/lib/format'

describe('safeRedirect', () => {
  it.each([
    ['/memories', '/memories'],
    ['/settings/privacy?x=1', '/settings/privacy?x=1'],
    ['https://evil.example', '/today'],
    ['//evil.example', '/today'],
    ['/\\evil.example', '/today'],
    ['javascript:alert(1)', '/today'],
    ['/javascript:alert(1)', '/today'],
    ['', '/today'],
    [null, '/today'],
  ])('%s -> %s', (input, out) => {
    expect(safeRedirect(input as string | null)).toBe(out)
  })
})

describe('invitation tokens', () => {
  const token = 'a'.repeat(64)
  it('parses only well-formed fragment tokens', () => {
    expect(parseInviteToken(`#token=${token}`)).toBe(token)
    expect(parseInviteToken(`#token=${token.toUpperCase()}`)).toBe(token)
    expect(parseInviteToken('#token=abc')).toBeNull()
    expect(parseInviteToken('')).toBeNull()
  })
  it('builds fragment links so tokens never reach servers', () => {
    expect(inviteLink('https://x.pages.dev', token)).toBe(`https://x.pages.dev/join#token=${token}`)
  })
})

describe('calendar reminders', () => {
  const ics = buildReminderIcs({ time: '19:30', days: ['FR', 'MO'], startDate: '2026-10-31', uid: 'u1', now: new Date(Date.UTC(2026, 9, 31)) })
  it('creates a weekly recurring event with neutral wording', () => {
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,FR')
    expect(ics).toContain('SUMMARY:Quiet moment')
    expect(ics.toLowerCase()).not.toContain('pregnan')
    expect(ics).toContain('\r\n')
  })
  it('starts on the first selected weekday on or after the start date', () => {
    // 31 Oct 2026 is a Saturday -> first Monday is 2 Nov.
    expect(ics).toContain('DTSTART:20261102T193000')
  })
  it('validates input and escapes text', () => {
    expect(() => buildReminderIcs({ time: '25:00', days: ['MO'], startDate: '2026-10-31', uid: 'u' })).toThrow()
    expect(() => buildReminderIcs({ time: '10:00', days: [], startDate: '2026-10-31', uid: 'u' })).toThrow()
    expect(escapeIcsText('a,b;c\nd')).toBe('a\\,b\\;c\\nd')
  })
})

describe('audio helpers', () => {
  it('normalises and allows only the bucket audio types', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(isAllowedRecordingMime('audio/mp4;codecs=mp4a.40.2')).toBe(true)
    expect(isAllowedRecordingMime('video/webm')).toBe(false)
  })
  it('picks the first supported recording type', () => {
    expect(pickMimeType((t) => t.startsWith('audio/mp4'))).toBe('audio/mp4;codecs=mp4a.40.2')
    expect(pickMimeType(() => false)).toBeNull()
    expect(pickMimeType(() => { throw new Error('x') })).toBeNull()
  })
  it('classifies microphone errors', () => {
    expect(classifyMicError({ name: 'NotAllowedError' })).toBe('denied')
    expect(classifyMicError({ name: 'NotFoundError' })).toBe('no_device')
    expect(classifyMicError({ name: 'NotReadableError' })).toBe('busy')
    expect(classifyMicError(null)).toBe('unsupported')
  })
})

describe('errors', () => {
  it('maps backend codes to friendly messages', () => {
    expect(errorCode({ message: 'recording_limit' })).toBe('recording_limit')
    expect(errorMessage({ message: 'recording_limit' })).toMatch(/10 recordings/)
    expect(errorCode({ message: 'some internal detail' })).toBeNull()
    expect(errorMessage({ message: 'some internal detail' })).toMatch(/Something went wrong/)
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/connection/)
  })
})

describe('format', () => {
  it('formats sizes and filenames', () => {
    expect(formatBytes(1_500_000)).toBe('1.5 MB')
    expect(safeFilename('  Our Song! / Today ')).toBe('our-song-today')
    expect(safeFilename('***')).toBe('little-bloom')
  })
})
