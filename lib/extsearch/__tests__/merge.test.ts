/**
 * Tests for merge utilities
 */

import { normalizeUrl, dedupe, fuseRank, analyzeIndieWeb, estimatePrivacyScore } from '../merge';
import type { ExtSearchResultItem } from '../types';

describe('normalizeUrl', () => {
  test('should normalize basic URLs', () => {
    expect(normalizeUrl('https://example.com/path')).toEqual({
      original: 'https://example.com/path',
      normalized: 'example.com/path',
      domain: 'example.com',
      path: '/path'
    });
  });

  test('should remove www prefix', () => {
    expect(normalizeUrl('https://www.example.com/path')).toEqual({
      original: 'https://www.example.com/path',
      normalized: 'example.com/path',
      domain: 'example.com',
      path: '/path'
    });
  });

  test('should remove trailing slashes', () => {
    expect(normalizeUrl('https://example.com/path/')).toEqual({
      original: 'https://example.com/path/',
      normalized: 'example.com/path',
      domain: 'example.com',
      path: '/path'
    });
  });

  test('should preserve important query parameters', () => {
    const result = normalizeUrl('https://youtube.com/watch?v=abc123&utm_source=test');
    expect(result.normalized).toBe('youtube.com/watch?v=abc123');
  });

  test('should handle malformed URLs', () => {
    const result = normalizeUrl('not-a-url');
    expect(result.original).toBe('not-a-url');
    expect(result.normalized).toBe('not-a-url');
  });
});

describe('dedupe', () => {
  const createResult = (url: string, score?: number, snippet?: string): ExtSearchResultItem => ({
    engine: 'searchmysite',
    url,
    title: `Title for ${url}`,
    snippet,
    score
  });

  test('should remove duplicate URLs', () => {
    const results = [
      createResult('https://example.com/page'),
      createResult('https://www.example.com/page'),
      createResult('https://other.com/page')
    ];

    const deduped = dedupe(results);
    expect(deduped).toHaveLength(2);
    expect(deduped.map(r => r.url)).toEqual([
      'https://example.com/page',
      'https://other.com/page'
    ]);
  });

  test('should prefer higher scored results', () => {
    const results = [
      createResult('https://example.com/page', 0.5),
      createResult('https://www.example.com/page', 0.8)
    ];

    const deduped = dedupe(results);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].score).toBe(0.8);
  });

  test('should prefer results with more metadata', () => {
    const results = [
      createResult('https://example.com/page', 0.5),
      createResult('https://www.example.com/page', 0.5, 'With snippet')
    ];

    const deduped = dedupe(results);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].snippet).toBe('With snippet');
  });
});

describe('fuseRank', () => {
  const createResult = (url: string, score?: number, isIndieWeb?: boolean): ExtSearchResultItem => ({
    engine: 'searchmysite',
    url,
    title: `Title for ${url}`,
    score,
    isIndieWeb
  });

  test('should rank results by fused score', () => {
    const results = [
      createResult('https://low.com', 0.2),
      createResult('https://high.com', 0.8),
      createResult('https://medium.com', 0.5)
    ];

    const ranked = fuseRank(results);
    expect(ranked[0].url).toBe('https://high.com');
    expect(ranked[2].url).toBe('https://low.com');
  });

  test('should boost indie web sites', () => {
    const results = [
      createResult('https://corporate.com', 0.6, false),
      createResult('https://indie.com', 0.5, true)
    ];

    const ranked = fuseRank(results);
    // Indie site should be boosted above corporate site
    expect(ranked[0].url).toBe('https://indie.com');
  });
});

describe('analyzeIndieWeb', () => {
  test('should identify GitHub Pages', () => {
    expect(analyzeIndieWeb('username.github.io')).toBe(true);
    expect(analyzeIndieWeb('org.github.io')).toBe(true);
  });

  test('should identify Netlify sites', () => {
    expect(analyzeIndieWeb('site-name.netlify.app')).toBe(true);
  });

  test('should identify Neocities', () => {
    expect(analyzeIndieWeb('username.neocities.org')).toBe(true);
  });

  test('should not identify corporate sites', () => {
    expect(analyzeIndieWeb('facebook.com')).toBe(false);
    expect(analyzeIndieWeb('amazon.com')).toBe(false);
    expect(analyzeIndieWeb('bigcorp.com')).toBe(false);
  });

  test('should handle personal domains heuristically', () => {
    expect(analyzeIndieWeb('johndoe.com')).toBe(true);
    expect(analyzeIndieWeb('mycompany.biz')).toBe(false);
  });
});

describe('estimatePrivacyScore', () => {
  test('should give high scores to privacy-focused sites', () => {
    expect(estimatePrivacyScore('duckduckgo.com')).toBe(0.9);
    expect(estimatePrivacyScore('searx.be')).toBe(0.9);
    expect(estimatePrivacyScore('wikipedia.org')).toBe(0.9);
  });

  test('should give low scores to tracking-heavy sites', () => {
    expect(estimatePrivacyScore('facebook.com')).toBe(0.2);
    expect(estimatePrivacyScore('google.com')).toBe(0.2);
    expect(estimatePrivacyScore('amazon.com')).toBe(0.2);
  });

  test('should give neutral scores to unknown sites', () => {
    expect(estimatePrivacyScore('unknown-site.com')).toBe(0.5);
    expect(estimatePrivacyScore('random-blog.org')).toBe(0.5);
  });
});