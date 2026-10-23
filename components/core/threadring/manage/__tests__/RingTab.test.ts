/**
 * The Ring tab sends only what changed, and an emptied text field as null so
 * Ring Hub clears it (an omitted field stays as it is there).
 */
import { changesFrom } from '../RingTab'

const saved = {
  name: 'Cozy Knits',
  description: 'Socks',
  curatorNote: 'Hi',
  bannerUrl: 'https://cdn.test/b.png',
  themeColor: '#8c4a5b',
  joinType: 'open' as const,
  visibility: 'public' as const,
  postPolicy: 'members' as const,
}

test('nothing changed, nothing sent', () => {
  expect(changesFrom(saved, { ...saved })).toEqual({})
})

test('only the changed fields, an emptied one as null', () => {
  expect(changesFrom(saved, { ...saved, description: '  ', bannerUrl: '', joinType: 'closed', themeColor: '#2e4b3f' })).toEqual({
    description: null,
    bannerUrl: null,
    joinType: 'closed',
    themeColor: '#2e4b3f',
  })
})
