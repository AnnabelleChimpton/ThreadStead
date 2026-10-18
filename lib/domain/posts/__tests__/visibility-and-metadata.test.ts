/**
 * @jest-environment node
 */
jest.mock('@/lib/config/database/connection', () => ({ db: {} }));

import { allowedVisibilities, canViewPost, followingPostsWhere } from '../visibility';
import { buildPostUri, generateExcerpt, generateTextPreview } from '../ringhub-metadata';

const STRANGER = { isAuthor: false, isFollower: false, isFriend: false };
const FOLLOWER = { isAuthor: false, isFollower: true, isFriend: false };
const FRIEND = { isAuthor: false, isFollower: true, isFriend: true };
const AUTHOR = { isAuthor: true, isFollower: false, isFriend: false };

describe('post visibility', () => {
  it('widens with the relationship and only the author sees private', () => {
    expect(allowedVisibilities(STRANGER)).toEqual(['public']);
    expect(allowedVisibilities(FOLLOWER)).toEqual(['public', 'followers']);
    expect(allowedVisibilities(FRIEND)).toEqual(['public', 'followers', 'friends']);
    expect(allowedVisibilities(AUTHOR)).toEqual(['public', 'followers', 'friends', 'private']);
  });

  it.each([
    ['private', FRIEND, false],
    ['friends', FOLLOWER, false],
    ['followers', STRANGER, false],
    ['public', STRANGER, true],
    ['private', AUTHOR, true],
  ] as const)('canViewPost(%s) for %o → %s', (vis, rel, expected) => {
    expect(canViewPost(vis, rel)).toBe(expected);
  });

  it('following feed: friends posts only from mutuals, never private', () => {
    expect(followingPostsWhere(['a', 'b'], ['b', 'z'])).toEqual({
      authorId: { in: ['a', 'b'] },
      OR: [
        { visibility: { in: ['public', 'followers'] } },
        { visibility: 'friends', authorId: { in: ['b'] } },
      ],
    });
    // No mutuals → no friends clause at all
    expect(followingPostsWhere(['a'], []).OR).toHaveLength(1);
  });
});

describe('ring hub metadata', () => {
  it('builds the post URI from the local part of the handle', () => {
    expect(buildPostUri('alice@threadstead.test', 'p1')).toMatch(/\/resident\/alice\/post\/p1$/);
    expect(buildPostUri('alice', 'p1')).toMatch(/\/resident\/alice\/post\/p1$/);
  });

  it('prefers text, then HTML, then markdown', () => {
    expect(generateTextPreview('text', '<p>html</p>', 'md')).toBe('text');
    expect(generateTextPreview(null, '<p>html <b>bold</b></p>', 'md')).toBe('html bold');
    expect(generateTextPreview(null, null, '# Title\n**bold** [link text](https://x.test)')).toBe('Title bold link text');
    expect(generateTextPreview(null, null, null)).toBe('');
  });

  it('strips entities and replaces URLs', () => {
    expect(generateTextPreview(null, '<p>a&amp;b</p>')).toBe('a b');
    expect(generateTextPreview('see https://example.com/x?y=1 now')).toBe('see [link] now');
  });

  it.each([
    [generateTextPreview, 300],
    [generateExcerpt, 500],
  ] as const)('%p never exceeds %i chars (the hub rejects longer)', (fn, max) => {
    const words = ('lorem ipsum dolor sit amet ').repeat(60);
    const out = fn(words);
    expect(out.length).toBeLessThanOrEqual(max);
    expect(out.endsWith('...')).toBe(true);
    expect(out).not.toMatch(/ \.\.\.$/); // cut at a word, not mid-space

    const noSpaces = 'x'.repeat(max * 2);
    expect(fn(noSpaces).length).toBe(max);
    expect(fn('x'.repeat(max))).toBe('x'.repeat(max));
  });
});
