/**
 * Where each notification goes. The bell, /notifications and the template
 * NotificationCenter all use notificationHref, so this is the one place the
 * targets are pinned.
 */
import { guestbookHref, notificationHref } from '@/lib/domain/notifications/links'

const actor = { handle: 'pal@local' }

describe('guestbook notifications', () => {
  test('open your own guestbook tab at the entry', () => {
    expect(
      notificationHref({
        type: 'guestbook',
        actor,
        data: { guestbookEntryId: 'e1', excerpt: 'Hi there', guestbookOwnerHandle: 'pigeon@local' },
      })
    ).toBe('/resident/pigeon?tab=guestbook#guestbook-entry-e1')
  })

  test('a deleted or hidden entry (no excerpt) opens the tab without the jump', () => {
    expect(
      notificationHref({
        type: 'guestbook',
        actor,
        data: { guestbookEntryId: 'gone', excerpt: null, guestbookOwnerHandle: 'pigeon@local' },
      })
    ).toBe('/resident/pigeon?tab=guestbook')
  })

  test('without an owner handle it falls back to the signer, as before', () => {
    expect(notificationHref({ type: 'guestbook', actor, data: { guestbookEntryId: 'e1' } })).toBe('/resident/pal')
  })

  test('guestbookHref encodes the username', () => {
    expect(guestbookHref('a b')).toBe('/resident/a%20b?tab=guestbook')
  })
})

describe('the other types keep their targets', () => {
  test('comments and replies open the post with the comment highlighted', () => {
    expect(
      notificationHref({
        type: 'reply',
        actor,
        data: { postId: 'p1', commentId: 'c1', postAuthorHandle: 'pigeon@local' },
      })
    ).toBe('/resident/pigeon/post/p1?comments=open&highlight=c1')
    expect(notificationHref({ type: 'comment', actor, data: {} })).toBe('/resident/pal')
  })

  test('photo comments open the photo in its owner’s gallery', () => {
    expect(
      notificationHref({
        type: 'photo_comment',
        actor,
        data: { mediaId: 'm1', commentId: 'c1', mediaOwnerHandle: 'pigeon@local' },
      })
    ).toBe('/resident/pigeon/media?photo=m1&comment=c1')
  })

  test('follows and friends go to the actor', () => {
    expect(notificationHref({ type: 'follow', actor })).toBe('/resident/pal')
    expect(notificationHref({ type: 'friend', actor })).toBe('/resident/pal')
  })

  test('unknown types and handle-less actors go nowhere', () => {
    expect(notificationHref({ type: 'mystery', actor })).toBeNull()
    expect(notificationHref({ type: 'follow', actor: { handle: null } })).toBeNull()
  })
})
