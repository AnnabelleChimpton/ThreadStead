/**
 * @jest-environment node
 *
 * A post's preview title and description: an untitled post (stored as
 * "Untitled Post") is "A post by …" rather than repeating its words, and
 * markdown never shows through ("!beds" from an image).
 */
jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => 'https://example.com' }));

import { contentMetadataGenerator } from '@/lib/utils/metadata/content-metadata';
import { UNTITLED_POST } from '@/lib/domain/posts/title';

const post = (fields: { title?: string; bodyMarkdown: string }) =>
  contentMetadataGenerator.generateBlogPostMetadata(
    { id: 'p1', createdAt: '2026-10-01T00:00:00Z', author: { handle: 'robin', displayName: 'Robin' }, ...fields },
    'robin'
  );

it('names an untitled post by its author', () => {
  expect(post({ title: UNTITLED_POST, bodyMarkdown: 'Moved the beds' }).title).toBe('A post by Robin');
  expect(post({ title: 'Garden beds', bodyMarkdown: 'Moved the beds' }).title).toBe('Garden beds');
});

it('describes a post in its plain words', () => {
  const { description } = post({ bodyMarkdown: '# Beds\n\nMoved **them**!\n\n![beds](https://cdn.example/b.jpg) See [this](https://x.example).' });
  expect(description).toBe('Beds Moved them! See this.');
});
