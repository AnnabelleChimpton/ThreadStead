import { NOTE_MAX, canHaveNote, cleanNote, decorationNote } from '../decoration-note'

describe('cleanNote', () => {
  it('keeps plain text and single line breaks', () => {
    expect(cleanNote('Planted these\nfor my gran')).toBe('Planted these\nfor my gran')
  })

  it('drops control, zero-width and bidi characters', () => {
    expect(cleanNote('a\u0000b\u0007c​d‮e﻿')).toBe('abcde')
  })

  it('turns CRLF into newlines and squeezes runs of blank lines', () => {
    expect(cleanNote('one\r\n\r\n\r\n\r\ntwo\rthree')).toBe('one\n\ntwo\nthree')
  })

  it('trims, and an empty or blank note is nothing', () => {
    expect(cleanNote('  hi  ')).toBe('hi')
    expect(cleanNote('   \n\t ')).toBeNull()
    expect(cleanNote('')).toBeNull()
    expect(cleanNote(undefined)).toBeNull()
    expect(cleanNote(42)).toBeNull()
  })

  it('keeps at most NOTE_MAX characters, counting emoji as one', () => {
    expect(Array.from(cleanNote('🌷'.repeat(NOTE_MAX + 5))!).length).toBe(NOTE_MAX)
    expect(cleanNote('a'.repeat(NOTE_MAX))).toHaveLength(NOTE_MAX)
  })

  it('leaves markup as text (the guestbook renderer sanitises it when shown)', () => {
    expect(cleanNote('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('decorationNote', () => {
  it('reads the editor copy first, then stored data', () => {
    expect(decorationNote({ note: 'new', data: { note: 'old' } })).toBe('new')
    expect(decorationNote({ data: { note: 'old' } })).toBe('old')
  })

  it('is undefined for blank or missing notes', () => {
    expect(decorationNote({ note: '', data: { note: 'old' } })).toBeUndefined()
    expect(decorationNote({ data: { text: 'sign' } })).toBeUndefined()
    expect(decorationNote(null)).toBeUndefined()
  })
})

it('the mailbox takes no note; other decorations can', () => {
  expect(canHaveNote('mailbox')).toBe(false)
  expect(canHaveNote('roses_red')).toBe(true)
})
