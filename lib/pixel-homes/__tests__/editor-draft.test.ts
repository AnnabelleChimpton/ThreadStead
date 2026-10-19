import { clearDraft, draftTime, draftToOffer, readDraft, writeDraft } from '../editor-draft'
import type { EditorDoc } from '../editor-doc'

const doc = (sky: 'sunny' | 'night'): EditorDoc => ({
  decorations: [],
  terrain: {},
  house: {},
  atmosphere: { sky, weather: 'clear', timeOfDay: 'midday' },
  template: 'cottage_v1',
  palette: 'thread_sage',
})

beforeEach(() => localStorage.clear())

test('write, read and clear, per resident', () => {
  writeDraft('Alice', doc('night'), 123)
  expect(readDraft('alice')).toEqual({ at: 123, doc: doc('night') })
  expect(readDraft('bob')).toBeNull()
  clearDraft('ALICE')
  expect(readDraft('alice')).toBeNull()
})

test('only a draft that differs from the home as it opened is offered; a same one is dropped', () => {
  writeDraft('alice', doc('night'))
  expect(draftToOffer('alice', doc('sunny'))?.doc.atmosphere.sky).toBe('night')
  expect(draftToOffer('alice', doc('night'))).toBeNull()
  expect(readDraft('alice')).toBeNull()
})

test('junk or missing storage never throws', () => {
  localStorage.setItem('pixelHomeDraft:alice', '{not json')
  expect(readDraft('alice')).toBeNull()
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('full') }, removeItem: () => { throw new Error('x') } } as unknown as Storage
  expect(readDraft('alice', broken)).toBeNull()
  expect(() => writeDraft('alice', doc('night'), 1, broken)).not.toThrow()
  expect(() => clearDraft('alice', broken)).not.toThrow()
})

test('a draft from today shows its time; an older one its date too', () => {
  const now = new Date(2026, 9, 19, 15, 0).getTime()
  expect(draftTime(new Date(2026, 9, 19, 10, 42).getTime(), now)).toMatch(/10:42/)
  expect(draftTime(new Date(2026, 9, 17, 10, 42).getTime(), now)).toMatch(/Oct 17/)
})
