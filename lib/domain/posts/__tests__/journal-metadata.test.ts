/**
 * A post keeps only the editor's five journal fields as metadata
 * (lib/domain/posts/request.ts): anything else used to reach the ring hub
 * over the post's own title, type and author.
 */
import { journalMetadata } from '../request'

test('the five journal fields, trimmed, and nothing else', () => {
  expect(journalMetadata({ mood: ' sunny ', listeningTo: 'Low', title: 'Hijack', type: 'fork_notification', reading: 7 })).toEqual({ mood: 'sunny', listeningTo: 'Low' })
})

test('each capped at 200 characters', () => {
  expect(journalMetadata({ location: 'x'.repeat(500) })?.location).toHaveLength(200)
})

test('none of them, or not an object: nothing', () => {
  for (const raw of [undefined, null, 'mood', ['mood'], {}, { mood: '   ' }, { title: 'x' }]) expect(journalMetadata(raw)).toBeNull()
})
